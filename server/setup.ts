// Game registration script for Challenge platform
// Run with: npm run setup

const CHALLENGE_API_URL = process.env.CHALLENGE_API_URL || 'http://localhost:3000'

async function registerGame() {
  console.log('Registering Matcha with Challenge platform...')
  console.log(`Challenge API: ${CHALLENGE_API_URL}`)

  // Phase 8: Will make API calls to register the game
  console.log('Game registration will be implemented in Phase 8')
}

registerGame().catch(console.error)
