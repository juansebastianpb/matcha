import express from 'express'

const app = express()
app.use(express.json())

const PORT = 3001

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', game: 'matcha' })
})

// Skill seeding endpoint (for Challenge integration)
app.post('/api/seed-skill', (_req, res) => {
  // Will be implemented in Phase 8
  res.json({ message: 'Skill seeding placeholder' })
})

app.listen(PORT, () => {
  console.log(`Matcha dev server running on http://localhost:${PORT}`)
})
