import type { Language } from '../types/index.ts';
import { synthesizeSpeech } from './api.ts';

let activeAudio: HTMLAudioElement | null = null;

export async function speakText(text: string, language: Language, onEnd?: () => void): Promise<void> {
  stopSpeaking();
  try {
    const wav = await synthesizeSpeech(text, language);
    const url = URL.createObjectURL(wav);
    const audio = new Audio(url);
    activeAudio = audio;
    const cleanup = () => { URL.revokeObjectURL(url); if (activeAudio === audio) activeAudio = null; onEnd?.(); };
    audio.onended = cleanup; audio.onerror = cleanup;
    await audio.play();
  } catch {
    // Explicit accessibility fallback only when the configured TTS service is unavailable.
    if (!('speechSynthesis' in window)) { onEnd?.(); return; }
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*_#`~]/g, ''));
    utterance.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.onend = () => onEnd?.(); utterance.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utterance);
  }
}

export function stopSpeaking() {
  activeAudio?.pause(); activeAudio = null;
  window.speechSynthesis?.cancel();
}
