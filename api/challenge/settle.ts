import type { VercelRequest, VercelResponse } from '@vercel/node';

const CHALLENGE_API_BASE = process.env.CHALLENGE_API_BASE || 'https://api.withchallenge.com';
const CHALLENGE_API_KEY = process.env.CHALLENGE_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!CHALLENGE_API_KEY) {
    console.error('[settle] CHALLENGE_API_KEY env var is not set');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const verifyRes = await fetch(`${CHALLENGE_API_BASE}/api/auth/check`, {
    headers: { Authorization: auth },
  });
  const verifyData = (await verifyRes.json().catch(() => null)) as { authenticated?: boolean } | null;
  if (!verifyRes.ok || !verifyData?.authenticated) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { matchId, winnerId, gameData } = (req.body || {}) as {
    matchId?: string;
    winnerId?: string | null;
    gameData?: Record<string, unknown>;
  };

  if (!matchId) {
    return res.status(400).json({ error: 'matchId is required' });
  }

  const body: Record<string, unknown> = { matchId };
  if (gameData) body.gameData = gameData;
  if (winnerId) body.winnerId = winnerId;
  else body.isDraw = true;

  let settleRes!: Response;
  let settleData: { error?: string } | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    settleRes = await fetch(`${CHALLENGE_API_BASE}/api/matches/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': CHALLENGE_API_KEY },
      body: JSON.stringify(body),
    });
    if (settleRes.status >= 500 && attempt === 0) {
      await new Promise(r => setTimeout(r, 500));
      continue;
    }
    settleData = (await settleRes.json().catch(() => null)) as { error?: string } | null;
    break;
  }

  if (settleRes.ok) {
    return res.status(200).json(settleData ?? { success: true });
  }

  const errMsg = settleData?.error || '';

  // Idempotent: a prior call already settled (or the match expired and was refunded).
  // Backend throws "Match already settled" when atomic update loses the race,
  // or "Match not active" when the pre-check sees status already changed to completed/expired.
  if (settleRes.status === 400 && (/already settled/i.test(errMsg) || /not active/i.test(errMsg))) {
    return res.status(200).json({ alreadySettled: true });
  }

  console.error(`[settle] Challenge backend ${settleRes.status}: ${errMsg}`);
  return res.status(settleRes.status).json({ error: errMsg || 'Settle failed' });
}
