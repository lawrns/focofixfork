'use client';

/**
 * AudioService for Foco.mx
 * Handles unique audio cues for app events to provide a world-class sensory experience.
 * Uses Web Audio API for low-latency playback.
 */

export type AudioEvent = 'complete' | 'error' | 'sync' | 'ai_spark' | 'click';

class AudioService {
  private static instance: AudioService;
  private audioContext: AudioContext | null = null;
  private buffers: Map<AudioEvent, AudioBuffer> = new Map();
  private enabled: boolean = true;
  private useSyntheticOnly: boolean = true; // Use only synthetic sounds to avoid 404s

  private constructor() {
    if (typeof window !== 'undefined') {
      // Check user preferences
      try {
        const stored = localStorage.getItem('foco_accessibility');
        if (stored) {
          const settings = JSON.parse(stored);
          this.enabled = settings.enableSoundNotifications ?? true;
        }
      } catch (e) {
        // Silently fail - don't log during SSR
      }
    }
  }

  static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  private initContext() {
    if (!this.audioContext && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }
    return this.audioContext;
  }

  /**
   * Play a unique audio cue for an event
   */
  async play(event: AudioEvent) {
    if (!this.enabled) return;

    const ctx = this.initContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // Use synthetic sounds only - no file loading to avoid 404s
    this.playSynthetic(event);
  }

  /**
   * Fallback synthetic sounds until physical assets are provided
   */
  private playSynthetic(event: AudioEvent) {
    const ctx = this.initContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (event) {
      case 'complete':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      case 'error':
        osc.type = 'square';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.setValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      case 'sync':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
      default:
        // Basic click
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.02);
        osc.start(now);
        osc.stop(now + 0.02);
    }
  }

  private async loadSound(event: AudioEvent) {
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const response = await fetch(`/audio/${event}.mp3`);
      if (!response.ok) return;
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      this.buffers.set(event, audioBuffer);
    } catch (e) {
      // Log only in dev
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Audio asset for ${event} not found, using synthetic fallback.`);
      }
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
}

// Lazy initialization to avoid SSR/hydration issues
// Export as function to get instance only on client side
export const getAudioService = () => AudioService.getInstance();

// Backwards compatible export (lazy)
let _cachedInstance: AudioService | null = null;
export const audioService = new Proxy({} as AudioService, {
  get(target, prop) {
    if (typeof window === 'undefined') {
      // During SSR, return no-op functions
      return () => {};
    }
    if (!_cachedInstance) {
      _cachedInstance = AudioService.getInstance();
    }
    return _cachedInstance[prop as keyof AudioService];
  }
});
