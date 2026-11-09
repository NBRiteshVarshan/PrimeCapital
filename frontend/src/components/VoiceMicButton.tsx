import React, { useRef, useState } from 'react';
import { AlertCircle, Mic, Send, Square, Volume2, VolumeX } from 'lucide-react';
import { transcribeAudio } from '../services/api.ts';
import type { Language } from '../types/index.ts';

interface VoiceMicButtonProps { language: Language; consentGiven: boolean; onSendTranscript: (text: string) => void; voiceRepliesEnabled: boolean; onToggleVoiceReplies: (enabled: boolean) => void; }
export const VoiceMicButton: React.FC<VoiceMicButtonProps> = ({ language, consentGiven, onSendTranscript, voiceRepliesEnabled, onToggleVoiceReplies }) => {
  const [recording, setRecording] = useState(false); const [processing, setProcessing] = useState(false); const [transcript, setTranscript] = useState(''); const [error, setError] = useState('');
  const recorder = useRef<MediaRecorder | null>(null); const chunks = useRef<Blob[]>([]);
  const start = async () => {
    if (!consentGiven) { setError('Please accept consent before recording voice.'); return; }
    try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); chunks.current = []; const current = new MediaRecorder(stream); recorder.current = current; current.ondataavailable = e => chunks.current.push(e.data); current.onstop = async () => { stream.getTracks().forEach(t => t.stop()); setRecording(false); setProcessing(true); try { const result = await transcribeAudio(new Blob(chunks.current, { type: current.mimeType || 'audio/webm' }), language, consentGiven); setTranscript(result.text); } catch (e) { setError(e instanceof Error ? e.message : 'Could not transcribe this recording.'); } finally { setProcessing(false); } }; current.start(); setError(''); setRecording(true); } catch { setError('Microphone permission is required to record voice.'); }
  };
  const stop = () => recorder.current?.state === 'recording' && recorder.current.stop();
  return <div className="flex flex-col gap-2">
    {error && <div className="text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-lg p-2 flex gap-1"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
    {transcript && <div className="bg-slate-900 text-white p-3 rounded-xl text-xs space-y-2"><p className="text-slate-300">Review transcript before sending</p><p className="bg-slate-800 rounded p-2">{transcript}</p><div className="flex justify-end gap-2"><button onClick={() => setTranscript('')} className="px-2">Discard</button><button onClick={() => { onSendTranscript(transcript); setTranscript(''); }} className="px-3 py-1 bg-emerald-600 rounded flex gap-1"><Send className="w-3 h-3" />Send</button></div></div>}
    <div className="flex items-center gap-2"><button onClick={recording ? stop : start} disabled={processing} className="h-10 px-3.5 bg-slate-900 text-white rounded-xl text-xs font-semibold flex gap-2 items-center disabled:opacity-50">{recording ? <><Square className="w-3.5 h-3.5" />Finish</> : <><Mic className="w-3.5 h-3.5 text-emerald-400" />{processing ? 'Transcribing…' : 'Speak'}</>}</button><button onClick={() => onToggleVoiceReplies(!voiceRepliesEnabled)} className="h-10 px-3 border rounded-xl text-xs flex items-center gap-1.5">{voiceRepliesEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}Voice reply</button></div>
  </div>;
};
