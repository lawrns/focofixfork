'use client'

import { useEffect, useState, useCallback, useRef, useSyncExternalStore } from 'react'

export type ConnectionStatus = 'online' | 'offline' | 'reconnecting'

interface ConnectionHealthState {
  /** Composite status — worst-case across all tracked channels */
  status: ConnectionStatus
  /** Browser navigator.onLine */
  browserOnline: boolean
  /** Per-channel status map (channel name → status) */
  channels: Record<string, ConnectionStatus>
  /** Timestamp of last successful data received from any channel */
  lastDataAt: number | null
}

// ---------- global singleton so multiple hook consumers share state ----------

type Listener = () => void

let state: ConnectionHealthState = {
  status: 'online',
  browserOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  channels: {},
  lastDataAt: null,
}

const listeners = new Set<Listener>()

function getSnapshot() {
  return state
}

function getServerSnapshot(): ConnectionHealthState {
  return {
    status: 'online',
    browserOnline: true,
    channels: {},
    lastDataAt: null,
  }
}

function emit() {
  for (const l of listeners) l()
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function deriveComposite(channels: Record<string, ConnectionStatus>, browserOnline: boolean): ConnectionStatus {
  if (!browserOnline) return 'offline'
  const statuses = Object.values(channels)
  if (statuses.includes('offline')) return 'offline'
  if (statuses.includes('reconnecting')) return 'reconnecting'
  return 'online'
}

// ---------- public API for registering channel status from anywhere ----------

export function reportChannelStatus(channelName: string, status: ConnectionStatus) {
  const channels = { ...state.channels, [channelName]: status }
  state = {
    ...state,
    channels,
    status: deriveComposite(channels, state.browserOnline),
    ...(status === 'online' ? { lastDataAt: Date.now() } : {}),
  }
  emit()
}

export function removeChannel(channelName: string) {
  const { [channelName]: _, ...rest } = state.channels
  state = {
    ...state,
    channels: rest,
    status: deriveComposite(rest, state.browserOnline),
  }
  emit()
}

// ---------- hook ----------

/**
 * Returns unified connection health across Supabase realtime, SSE streams,
 * and browser online/offline status.
 *
 * Components that own a channel (Supabase subscription, SSE, polling)
 * should call `reportChannelStatus('myChannel', 'online')` when healthy
 * and `'reconnecting'` / `'offline'` on error.
 */
export function useConnectionHealth(): ConnectionHealthState {
  // Wire up browser online/offline events once
  useEffect(() => {
    const onOnline = () => {
      state = {
        ...state,
        browserOnline: true,
        status: deriveComposite(state.channels, true),
      }
      emit()
    }
    const onOffline = () => {
      state = {
        ...state,
        browserOnline: false,
        status: 'offline',
      }
      emit()
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
