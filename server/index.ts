import express from 'express'

const app = express()
app.use(express.json())

const PORT = 3001

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', game: 'matcha' })
})

app.listen(PORT, () => {
  console.log(`Matcha dev server running on http://localhost:${PORT}`)
})
