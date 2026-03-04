import { supabase } from './supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/0/1 to avoid confusion
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export interface RoomHandle {
  roomCode: string
  channel: RealtimeChannel
  role: 'host' | 'guest'
}

export async function createRoom(roomCodeOverride?: string): Promise<RoomHandle> {
  if (!supabase) throw new Error('Supabase not configured')

  const roomCode = roomCodeOverride ?? generateRoomCode()
  const channel = supabase.channel(`match:${roomCode}`, {
    config: { broadcast: { self: false } },
  })

  await new Promise<void>((resolve, reject) => {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') resolve()
      if (status === 'CLOSED' || status === 'CHANNEL_ERROR') reject(new Error(`Channel error: ${status}`))
    })
  })

  return { roomCode, channel, role: 'host' }
}

export async function searchMatch(
  onMatched: (roomCode: string, role: 'host' | 'guest') => void
): Promise<() => void> {
  if (!supabase) throw new Error('Supabase not configured')

  const playerId = crypto.randomUUID()
  let cancelled = false

  const channel = supabase.channel('matchmaking:queue', {
    config: { broadcast: { self: false } },
  })

  // Track if we've already matched to avoid double-firing
  let matched = false

  channel.on('broadcast', { event: 'seeking' }, ({ payload }) => {
    if (cancelled || matched) return
    const otherId = payload.playerId as string

    // Deterministic tie-break: smaller UUID is host
    if (playerId < otherId) {
      // I'm the host — create a room code and tell the guest
      matched = true
      const roomCode = generateRoomCode()
      channel.send({
        type: 'broadcast',
        event: 'matched',
        payload: { guestId: otherId, roomCode },
      })
      onMatched(roomCode, 'host')
    }
    // If my ID is larger, I wait for a `matched` event from the other player
  })

  channel.on('broadcast', { event: 'matched' }, ({ payload }) => {
    if (cancelled || matched) return
    if (payload.guestId === playerId) {
      matched = true
      onMatched(payload.roomCode as string, 'guest')
    }
  })

  await new Promise<void>((resolve, reject) => {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') resolve()
      if (status === 'CLOSED' || status === 'CHANNEL_ERROR') reject(new Error(`Channel error: ${status}`))
    })
  })

  // Broadcast seeking immediately, then every 1.5s
  const broadcastSeeking = () => {
    if (!cancelled && !matched) {
      channel.send({ type: 'broadcast', event: 'seeking', payload: { playerId } })
    }
  }
  broadcastSeeking()
  const interval = setInterval(broadcastSeeking, 1500)

  return () => {
    cancelled = true
    matched = true
    clearInterval(interval)
    channel.unsubscribe()
  }
}

export async function joinRoom(code: string): Promise<RoomHandle> {
  if (!supabase) throw new Error('Supabase not configured')

  const roomCode = code.toUpperCase().trim()
  const channel = supabase.channel(`match:${roomCode}`, {
    config: { broadcast: { self: false } },
  })

  await new Promise<void>((resolve, reject) => {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') resolve()
      if (status === 'CLOSED' || status === 'CHANNEL_ERROR') reject(new Error(`Channel error: ${status}`))
    })
  })

  return { roomCode, channel, role: 'guest' }
}
