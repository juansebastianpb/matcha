import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const CHALLENGE_API_BASE = process.env.CHALLENGE_API_BASE || 'https://api.withchallenge.com';
const CHALLENGE_API_KEY = process.env.CHALLENGE_API_KEY;
// Server-only Supabase access. SUPABASE_SERVICE_ROLE_KEY must NOT be VITE_-prefixed
// (that would bundle it into the client). VITE_SUPABASE_URL is reused for the URL —
// the prefix only affects client bundling, the value is still readable server-side.
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface MatchInfo {
  status?: string;
  player1_id?: string;
  player2_id?: string;
}

async function fetchSettlementState(matchId: string, auth: string): Promise<unknown> {
  try {
    const r = await fetch(`${CHALLENGE_API_BASE}/api/matches/${matchId}/settlement-state`, {
      headers: { Authorization: auth },
    });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

// Consensus-based settlement.
//
// Both participant clients call this endpoint with the winner they observed. The
// honest winner reports winnerId=self; the honest loser reports winnerId=opponent
// (= the same winner) — so in the honest case both reports already agree. They
// only disagree when a client lies. We record each report keyed by the caller's
// VERIFIED identity and only forward a settlement to Challenge once both
// participants have reported the same winner. A lone client can no longer settle,
// so a losing player can no longer steal the pot — at worst they force a conflict,
// which leaves the match unsettled to be refunded by Challenge on expiry.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!CHALLENGE_API_KEY) {
    console.error('[settle] CHALLENGE_API_KEY env var is not set');
    return res.status(500).json({ error: 'Server misconfigured' });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[settle] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars are not set');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  // 1. Verify the caller's JWT and resolve their authenticated identity. The
  //    reporter's user id comes from the verified token — NEVER the request body —
  //    so a client can only ever file a settlement report as itself.
  const verifyRes = await fetch(`${CHALLENGE_API_BASE}/api/auth/check`, {
    headers: { Authorization: auth },
  });
  const verifyData = (await verifyRes.json().catch(() => null)) as
    | { authenticated?: boolean; user?: { id?: string } }
    | null;
  if (!verifyRes.ok || !verifyData?.authenticated || !verifyData.user?.id) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  const callerId = verifyData.user.id;

  const { matchId, winnerId, gameData } = (req.body || {}) as {
    matchId?: string;
    winnerId?: string | null;
    gameData?: Record<string, unknown>;
  };

  if (!matchId) {
    return res.status(400).json({ error: 'matchId is required' });
  }

  // 2. Fetch the match to learn the two participants and the current status.
  const matchRes = await fetch(`${CHALLENGE_API_BASE}/api/matches/${matchId}`, {
    headers: { Authorization: auth },
  });
  const match = matchRes.ok
    ? ((await matchRes.json().catch(() => null)) as MatchInfo | null)
    : null;
  const player1 = match?.player1_id;
  const player2 = match?.player2_id;
  if (!match || !player1 || !player2) {
    return res.status(404).json({ error: 'Match not found' });
  }

  // Participant check: the caller must be one of the two players.
  if (callerId !== player1 && callerId !== player2) {
    return res.status(403).json({ error: 'Not a participant in this match' });
  }

  // The reported winner must be a participant (or null for a draw).
  const reportedWinner = winnerId ?? null;
  if (reportedWinner !== null && reportedWinner !== player1 && reportedWinner !== player2) {
    return res.status(400).json({ error: 'winnerId is not a participant in this match' });
  }

  // Already resolved — return the authoritative settlement state idempotently.
  if (match.status && match.status !== 'active') {
    const settlementState = await fetchSettlementState(matchId, auth);
    return res.status(200).json({ alreadySettled: true, settlementState });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 3. Record this caller's winner report (idempotent upsert keyed by match + reporter).
  const { error: upsertErr } = await supabase.from('challenge_settle_reports').upsert(
    {
      match_id: matchId,
      reporter_user_id: callerId,
      claimed_winner_id: reportedWinner,
      game_data: gameData ?? null,
    },
    { onConflict: 'match_id,reporter_user_id' },
  );
  if (upsertErr) {
    console.error('[settle] Failed to record settle report:', upsertErr.message);
    return res.status(500).json({ error: 'Failed to record settlement report' });
  }

  // 4. Read both participants' reports.
  const { data: reports, error: readErr } = await supabase
    .from('challenge_settle_reports')
    .select('reporter_user_id, claimed_winner_id, game_data')
    .eq('match_id', matchId);
  if (readErr) {
    console.error('[settle] Failed to read settle reports:', readErr.message);
    return res.status(500).json({ error: 'Failed to read settlement reports' });
  }

  const report1 = reports?.find((r) => r.reporter_user_id === player1);
  const report2 = reports?.find((r) => r.reporter_user_id === player2);

  // Only one side has reported so far — wait for the opponent. The opponent's call
  // will reach consensus and settle; Challenge then broadcasts match.settled, which
  // the widget renders on this client.
  if (!report1 || !report2) {
    return res.status(200).json({ pending: true, awaitingOpponent: true });
  }

  // 5. Consensus check — both participants must agree on the winner.
  const winner1 = report1.claimed_winner_id ?? null;
  const winner2 = report2.claimed_winner_id ?? null;
  if (winner1 !== winner2) {
    // Conflicting results — do NOT settle. The match is left active and Challenge
    // refunds both players when it expires. No pot can be stolen on a conflict.
    console.warn(
      `[settle] Conflicting winner reports for match ${matchId}: ${winner1} vs ${winner2}`,
    );
    return res.status(200).json({ conflicted: true });
  }

  // Both clients agree — this is the authoritative winner.
  const agreedWinner = winner1;
  const winnerGameData =
    agreedWinner === player1
      ? report1.game_data
      : agreedWinner === player2
        ? report2.game_data
        : (report1.game_data ?? report2.game_data);

  const body: Record<string, unknown> = { matchId };
  if (winnerGameData) body.gameData = winnerGameData;
  if (agreedWinner) body.winnerId = agreedWinner;
  else body.isDraw = true;

  // 6. Forward the agreed result to the Challenge backend with the server-only API key.
  let settleRes!: Response;
  let settleData: { error?: string } | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    settleRes = await fetch(`${CHALLENGE_API_BASE}/api/matches/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': CHALLENGE_API_KEY },
      body: JSON.stringify(body),
    });
    if (settleRes.status >= 500 && attempt === 0) {
      await new Promise((r) => setTimeout(r, 500));
      continue;
    }
    settleData = (await settleRes.json().catch(() => null)) as { error?: string } | null;
    break;
  }

  if (settleRes.ok) {
    return res.status(200).json(settleData ?? { success: true });
  }

  const errMsg = settleData?.error || '';

  // Idempotent: the other client raced us and already settled. Return the same
  // authoritative payload the winning caller received.
  if (settleRes.status === 400 && (/already settled/i.test(errMsg) || /not active/i.test(errMsg))) {
    const settlementState = await fetchSettlementState(matchId, auth);
    return res.status(200).json({ alreadySettled: true, settlementState });
  }

  console.error(`[settle] Challenge backend ${settleRes.status}: ${errMsg}`);
  return res.status(settleRes.status).json({ error: errMsg || 'Settle failed' });
}
