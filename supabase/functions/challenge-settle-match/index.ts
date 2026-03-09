import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CHALLENGE_API_KEY = Deno.env.get('CHALLENGE_API_KEY') ?? ''
const CHALLENGE_GAME_ID = Deno.env.get('CHALLENGE_GAME_ID') ?? ''
const CHALLENGE_API_BASE = 'https://challenge-backend-production-4835.up.railway.app'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { matchId, winnerId } = await req.json()

    if (!matchId || !winnerId) {
      return new Response(JSON.stringify({ error: 'matchId and winnerId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const res = await fetch(`${CHALLENGE_API_BASE}/api/matches/settle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CHALLENGE_API_KEY,
        'x-game-id': CHALLENGE_GAME_ID,
      },
      body: JSON.stringify({ matchId, winnerId }),
    })

    const data = await res.json()

    if (!res.ok) {
      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
