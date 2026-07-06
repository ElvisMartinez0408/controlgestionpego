import { useCallback, useEffect, useRef, useState } from 'react';

// Web Speech API — no external deps, no server keys.
// Falls back gracefully in browsers without support.
type SR = any;
const SRClass: SR | undefined =
  typeof window !== 'undefined'
    ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    : undefined;

export const isVoiceInputSupported = () => Boolean(SRClass);

export interface VoiceInputOptions {
  lang?: string;                       // default es-VE
  interim?: boolean;                   // stream partials
  onFinal?: (text: string) => void;    // fired when result is final
  onInterim?: (text: string) => void;  // fired for live partials
  onError?: (err: string) => void;
}

export function useVoiceInput(opts: VoiceInputOptions = {}) {
  const { lang = 'es-VE', interim = true, onFinal, onInterim, onError } = opts;
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recRef = useRef<SR | null>(null);

  const stop = useCallback(() => {
    try { recRef.current?.stop(); } catch {}
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (!SRClass) { onError?.('El navegador no soporta reconocimiento de voz'); return; }
    if (listening) { stop(); return; }
    try {
      const rec = new SRClass();
      rec.lang = lang;
      rec.interimResults = interim;
      rec.continuous = false;
      rec.maxAlternatives = 1;
      rec.onstart = () => setListening(true);
      rec.onresult = (e: any) => {
        let finalText = '';
        let interimText = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const chunk = e.results[i][0].transcript;
          if (e.results[i].isFinal) finalText += chunk;
          else interimText += chunk;
        }
        if (finalText) {
          const t = finalText.trim();
          setTranscript(t);
          onFinal?.(t);
        } else if (interimText) {
          setTranscript(interimText);
          onInterim?.(interimText);
        }
      };
      rec.onerror = (e: any) => { onError?.(e?.error || 'error'); setListening(false); };
      rec.onend = () => setListening(false);
      recRef.current = rec;
      rec.start();
    } catch (err: any) {
      onError?.(err?.message || 'No se pudo iniciar el micrófono');
      setListening(false);
    }
  }, [lang, interim, listening, onError, onFinal, onInterim, stop]);

  useEffect(() => () => { try { recRef.current?.abort(); } catch {} }, []);

  return { start, stop, listening, transcript, supported: isVoiceInputSupported() };
}

/** Extract the first integer from a Spanish phrase ("veinte sacos", "25", "150"). */
const NUM_WORDS: Record<string, number> = {
  cero: 0, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
  dieciseis: 16, dieciséis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiuno: 21, veintidos: 22, veintidós: 22,
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
  cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500,
  seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900, mil: 1000,
};
export function extractNumber(text: string): number | null {
  if (!text) return null;
  const m = text.replace(/[.,]/g, '').match(/-?\d+/);
  if (m) return Number(m[0]);
  const words = text.toLowerCase().split(/\s+/);
  let total = 0; let found = false;
  for (const w of words) if (NUM_WORDS[w] !== undefined) { total += NUM_WORDS[w]; found = true; }
  return found ? total : null;
}

/** Detect one of the known products in a phrase. */
export function extractProduct(text: string, options: string[]): string | null {
  const norm = text.toLowerCase();
  for (const opt of options) if (norm.includes(opt.toLowerCase())) return opt;
  return null;
}