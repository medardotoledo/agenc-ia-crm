import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, AlertCircle } from 'lucide-react';

interface AudioRecorderProps {
  onSendAudio: (audioBase64: string, durationSeconds: number) => Promise<void> | void;
  onCancel?: () => void;
  disabled?: boolean;
}

export function AudioRecorder({ onSendAudio, onCancel, disabled }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      // Intentar usar audio/webm o audio/ogg o por defecto
      let options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        options = { mimeType: 'audio/ogg;codecs=opus' };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/ogg';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Error al acceder al micrófono:', err);
      setErrorMsg('No se pudo acceder al micrófono. Por favor permite el acceso en el navegador.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setAudioBlob(null);
    setRecordingTime(0);
    setErrorMsg(null);
    if (onCancel) onCancel();
  };

  const handleSend = async () => {
    if (!audioBlob && isRecording && mediaRecorderRef.current) {
      // Si el usuario da clic en Enviar mientras sigue grabando
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);

      // Esperar brevemente a que onstop arme el blob
      setTimeout(async () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/ogg';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        await convertAndSend(blob);
      }, 200);
      return;
    }

    if (audioBlob) {
      await convertAndSend(audioBlob);
    }
  };

  const convertAndSend = async (blob: Blob) => {
    setIsSending(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        try {
          await onSendAudio(base64Audio, recordingTime);
          cancelRecording();
        } catch (err: any) {
          setErrorMsg(err.message || 'Error enviando nota de voz');
        } finally {
          setIsSending(false);
        }
      };
    } catch (e: any) {
      setErrorMsg(e.message || 'Error procesando audio');
      setIsSending(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (errorMsg) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-600">
        <AlertCircle size={14} className="shrink-0" />
        <span className="truncate">{errorMsg}</span>
        <button onClick={() => setErrorMsg(null)} className="ml-auto font-bold hover:underline">OK</button>
      </div>
    );
  }

  if (isRecording || audioBlob) {
    return (
      <div className="flex flex-1 items-center gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
        {/* Pulsing indicator */}
        <div className="flex items-center gap-2">
          {isRecording ? (
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
            </span>
          ) : (
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
          )}
          <span className="font-mono text-xs font-bold text-ink">
            {formatTime(recordingTime)}
          </span>
        </div>

        {/* Audio waveform simulation */}
        <div className="flex flex-1 items-center gap-1 overflow-hidden px-2">
          {Array.from({ length: 16 }).map((_, i) => (
            <span
              key={i}
              className={`h-4 w-1 rounded-full ${isRecording ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-300'}`}
              style={{
                height: isRecording ? `${Math.max(6, ((i * 7 + recordingTime * 13) % 24))}px` : '10px',
                animationDelay: `${(i % 5) * 120}ms`,
              }}
            />
          ))}
          <span className="text-[11px] text-ink-soft ml-2">
            {isRecording ? 'Grabando nota de voz...' : 'Nota lista para enviar'}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={cancelRecording}
            className="rounded-full p-1.5 text-ink-soft hover:bg-soft hover:text-red-600 transition"
            title="Cancelar grabación"
          >
            <Trash2 size={16} />
          </button>

          {isRecording ? (
            <button
              type="button"
              onClick={stopRecording}
              className="rounded-full bg-soft p-1.5 text-ink hover:bg-line transition"
              title="Detener"
            >
              <Square size={15} />
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleSend}
            disabled={isSending}
            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-50"
            title="Enviar nota de voz"
          >
            {isSending ? (
              <span className="animate-spin text-xs">⏳</span>
            ) : (
              <>
                <Send size={14} />
                <span>Enviar</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startRecording}
      disabled={disabled}
      className="rounded-lg p-2 text-ink-soft hover:bg-soft hover:text-emerald-600 transition disabled:opacity-50"
      title="Grabar nota de voz"
    >
      <Mic size={18} />
    </button>
  );
}
