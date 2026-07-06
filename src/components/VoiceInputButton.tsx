import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoiceInput, isVoiceInputSupported } from '@/hooks/useVoiceInput';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  onResult: (text: string) => void;
  onInterim?: (text: string) => void;
  title?: string;
  className?: string;
}

/**
 * Reusable mic button with animated waveform while listening.
 * Uses the browser Web Speech API — zero backend calls.
 */
export function VoiceInputButton({ onResult, onInterim, title = 'Dictar', className }: Props) {
  const { start, listening, supported } = useVoiceInput({
    onFinal: (t) => onResult(t),
    onInterim,
    onError: (e) => {
      if (e === 'no-speech') toast.info('No se detectó voz, intente de nuevo');
      else if (e === 'not-allowed') toast.error('Permiso de micrófono denegado');
      else toast.error('Micrófono no disponible');
    },
  });

  if (!supported && !isVoiceInputSupported()) {
    return null; // hide silently on unsupported browsers
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={start}
      title={listening ? 'Escuchando… toca para detener' : title}
      className={cn(
        'h-9 w-9 shrink-0 relative',
        listening ? 'text-destructive' : 'text-muted-foreground hover:text-primary',
        className,
      )}
    >
      {listening ? (
        <>
          <MicOff className="w-4 h-4" />
          <span className="absolute inset-0 flex items-end justify-center gap-0.5 pb-0.5 pointer-events-none">
            <span className="w-0.5 bg-destructive/80 animate-[wave_0.8s_ease-in-out_infinite]" style={{ height: '30%' }} />
            <span className="w-0.5 bg-destructive/80 animate-[wave_0.8s_ease-in-out_infinite_0.15s]" style={{ height: '60%' }} />
            <span className="w-0.5 bg-destructive/80 animate-[wave_0.8s_ease-in-out_infinite_0.3s]" style={{ height: '45%' }} />
          </span>
        </>
      ) : (
        <Mic className="w-4 h-4" />
      )}
    </Button>
  );
}