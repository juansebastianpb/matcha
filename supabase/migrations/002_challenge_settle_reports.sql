-- Consensus-based Challenge settlement.
--
-- In Challenge's versus mode the developer (Matcha) declares the winner. To make
-- that declaration trustworthy, each participant client POSTs the winner it
-- observed to api/challenge/settle.ts. The serverless function records both
-- reports here and only forwards a settlement to the Challenge backend once BOTH
-- participants agree. A single client can no longer settle a match on its own,
-- so a losing player can no longer claim the pot.
--
-- match_id / reporter_user_id are Challenge-side identifiers (not local FKs).
-- This table is written/read exclusively by the serverless settle function using
-- the Supabase service role key — RLS is enabled with no policies so that anon
-- and authenticated clients have no access at all.
create table if not exists challenge_settle_reports (
  match_id          text not null,
  reporter_user_id  text not null,
  claimed_winner_id text,            -- a participant's user id, or null for a draw
  game_data         jsonb,
  created_at        timestamptz not null default now(),
  primary key (match_id, reporter_user_id)
);

alter table challenge_settle_reports enable row level security;
