import express from 'express'
import cors from 'cors'

const app = express()
app.use(express.json())
app.use(cors())

const PORT = 3847

const CHALLENGE_API_KEY = process.env.CHALLENGE_API_KEY || ''
const CHALLENGE_API_BASE = process.env.CHALLENGE_API_BASE || 'https://challenge-backend-production-4835.up.railway.app'

if (!CHALLENGE_API_KEY) {
  console.warn('[server] CHALLENGE_API_KEY not set — settle endpoint will fail')
}

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', game: 'matcha' })
})

// Settle a Challenge match (versus mode)
// Called by the game client after determining the winner
app.post('/api/challenge/settle', async (req, res) => {
  const { matchId, winnerId, isDraw, gameData } = req.body

  if (!matchId) {
    res.status(400).json({ error: 'matchId required' })
    return
  }
  if (!winnerId && !isDraw) {
    res.status(400).json({ error: 'winnerId or isDraw required' })
    return
  }

  try {
    const response = await fetch(`${CHALLENGE_API_BASE}/api/matches/settle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': CHALLENGE_API_KEY,
      },
      body: JSON.stringify({
        matchId,
        winnerId: isDraw ? undefined : winnerId,
        isDraw: !!isDraw,
        gameData,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[server] Challenge settle failed:', data)
      res.status(response.status).json(data)
      return
    }

    console.log('[server] Match settled:', { matchId, winnerId, isDraw })
    res.json(data)
  } catch (err) {
    console.error('[server] Settle request failed:', err)
    res.status(500).json({ error: 'Failed to reach Challenge API' })
  }
})

// Receive Challenge webhook events
app.post('/api/challenge/webhook', (req, res) => {
  const event = req.body
  console.log(`[webhook] ${event.event || 'unknown'}`, JSON.stringify(event, null, 2))
  res.json({ received: true })
})

app.listen(PORT, () => {
  console.log(`Matcha server running on http://localhost:${PORT}`)
})
