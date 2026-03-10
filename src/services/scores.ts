import { supabase } from './supabase'

export interface ScoreEntry {
  id?: string
  user_id?: string
  score: number
  mode: 'free' | 'competitive'
  blocks_cleared: number
  max_chain: number
  max_combo: number
  created_at?: string
}

export async function saveScore(entry: Omit<ScoreEntry, 'id' | 'created_at'>): Promise<void> {
  if (!supabase) {
    console.log('Supabase not configured, score not saved:', entry)
    return
  }
  const { error } = await supabase.from('scores').insert(entry)
  if (error) throw error
}

export async function getLeaderboard(
  period: 'all' | 'weekly' | 'daily' = 'all',
  limit = 50
): Promise<ScoreEntry[]> {
  if (!supabase) return []

  let query = supabase
    .from('scores')
    .select('*')
    .order('score', { ascending: false })
    .limit(limit)

  if (period === 'weekly') {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    query = query.gte('created_at', weekAgo)
  } else if (period === 'daily') {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    query = query.gte('created_at', dayAgo)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}
