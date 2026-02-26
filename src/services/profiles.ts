import { supabase } from './supabase'

export interface Profile {
  id: string
  username: string
  display_name?: string
  avatar_url?: string
}

export async function getProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) return null
  return data
}

export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
  if (error) throw error
}
