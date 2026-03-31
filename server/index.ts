import express from 'express'
import cors from 'cors'

const app = express()
app.use(express.json())
app.use(cors())

const PORT = 3847

// Settlement is handled client-side via Challenge.settle() (Path B integration).
// No server-side settlement endpoint needed — see Challenge docs: integration guide.

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', game: 'matcha' })
})

// Challenge sends webhook events after match settlement:
// - match.completed: { event, match_id, winner_id, player1_id, player2_id, payout, developer_earnings }
// - match.draw: { event, match_id, player1_id, player2_id, refunded }
// - match.expired: { event, match_id, player1_id, player2_id }
// Webhooks are informational — settlement is already complete when these fire.
// Use them for analytics, logging, or notifications.
app.post('/api/challenge/webhook', (req, res) => {
  const event = req.body
  console.log(`[webhook] ${event.event || 'unknown'}`, JSON.stringify(event, null, 2))
  res.json({ received: true })
})

app.listen(PORT, () => {
  console.log(`Matcha server running on http://localhost:${PORT}`)
})
