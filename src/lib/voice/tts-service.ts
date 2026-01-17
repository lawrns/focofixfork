/**
 * Text-to-Speech Service
 * Provides voice feedback for the voice companion
 * Uses ElevenLabs if configured, falls back to browser Speech Synthesis
 */

export interface TTSOptions {
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface TTSService {
  speak(text: string, options?: TTSOptions): Promise<void>;
  stop(): void;
  isSpeaking(): boolean;
  getVoices(): Promise<string[]>;
}

/**
 * Browser-based TTS using Web Speech API
 * Free, works offline, good enough for basic feedback
 */
export class BrowserTTS implements TTSService {
  private synthesis: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    }
  }

  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    if (!this.synthesis) {
      console.warn('[BrowserTTS] Speech synthesis not available');
      return;
    }

    // Cancel any ongoing speech
    this.stop();

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);

      // Configure voice options
      utterance.rate = options.rate ?? 1.0;
      utterance.pitch = options.pitch ?? 1.0;
      utterance.volume = options.volume ?? 1.0;

      // Try to use a natural-sounding voice
      const voices = this.synthesis!.getVoices();
      const preferredVoice = voices.find(v =>
        v.name.includes('Samantha') || // macOS
        v.name.includes('Google') ||   // Chrome
        v.name.includes('Microsoft Zira') || // Windows
        v.lang.startsWith('en')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (event) => {
        this.currentUtterance = null;
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      this.currentUtterance = utterance;
      this.synthesis!.speak(utterance);
    });
  }

  stop(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.currentUtterance = null;
    }
  }

  isSpeaking(): boolean {
    return this.synthesis?.speaking ?? false;
  }

  async getVoices(): Promise<string[]> {
    if (!this.synthesis) return [];

    // Voices may not be immediately available
    return new Promise((resolve) => {
      const voices = this.synthesis!.getVoices();
      if (voices.length > 0) {
        resolve(voices.map(v => v.name));
      } else {
        // Wait for voices to load
        this.synthesis!.onvoiceschanged = () => {
          resolve(this.synthesis!.getVoices().map(v => v.name));
        };
      }
    });
  }
}

/**
 * ElevenLabs TTS for high-quality, natural voice
 * Requires ELEVENLABS_API_KEY environment variable
 */
export class ElevenLabsTTS implements TTSService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  private defaultVoiceId = 'EXAVITQu4vr4xnSDxMaL'; // "Sarah" - natural conversational voice
  private currentAudio: HTMLAudioElement | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '';
  }

  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    if (!this.apiKey) {
      console.warn('[ElevenLabsTTS] API key not configured, falling back to browser TTS');
      const browserTTS = new BrowserTTS();
      return browserTTS.speak(text, options);
    }

    // Cancel any ongoing speech
    this.stop();

    try {
      const response = await fetch(
        `${this.baseUrl}/text-to-speech/${options.voice || this.defaultVoiceId}/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_flash_v2_5', // Fastest model, 75ms latency
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.0,
              use_speaker_boost: true,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(`ElevenLabs API error: ${error.detail || response.statusText}`);
      }

      // Convert response to audio blob and play
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      return new Promise((resolve, reject) => {
        const audio = new Audio(audioUrl);
        this.currentAudio = audio;

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          resolve();
        };

        audio.onerror = (event) => {
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          reject(new Error(`Audio playback error: ${event}`));
        };

        audio.play().catch(reject);
      });
    } catch (error) {
      console.error('[ElevenLabsTTS] Error:', error);
      // Fallback to browser TTS on error
      const browserTTS = new BrowserTTS();
      return browserTTS.speak(text, options);
    }
  }

  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }

  isSpeaking(): boolean {
    return this.currentAudio !== null && !this.currentAudio.paused;
  }

  async getVoices(): Promise<string[]> {
    if (!this.apiKey) return [];

    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) return [];

      const data = await response.json();
      return data.voices?.map((v: { name: string }) => v.name) || [];
    } catch {
      return [];
    }
  }
}

/**
 * Create TTS service based on available configuration
 */
export function createTTSService(): TTSService {
  // Check for ElevenLabs API key
  const elevenLabsKey =
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY
      : undefined;

  if (elevenLabsKey) {
    console.log('[TTS] Using ElevenLabs for voice synthesis');
    return new ElevenLabsTTS(elevenLabsKey);
  }

  console.log('[TTS] Using browser speech synthesis (ElevenLabs not configured)');
  return new BrowserTTS();
}

/**
 * Singleton TTS service for the application
 */
let ttsInstance: TTSService | null = null;

export function getTTSService(): TTSService {
  if (!ttsInstance) {
    ttsInstance = createTTSService();
  }
  return ttsInstance;
}

/**
 * Utility function to speak text with fallback
 */
export async function speakText(text: string, options?: TTSOptions): Promise<void> {
  const tts = getTTSService();
  return tts.speak(text, options);
}

/**
 * Stop any ongoing speech
 */
export function stopSpeaking(): void {
  if (ttsInstance) {
    ttsInstance.stop();
  }
}
