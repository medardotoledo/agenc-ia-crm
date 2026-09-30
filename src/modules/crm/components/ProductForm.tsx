'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Package,
  Sparkles,
  FolderLock,
  FolderHeart,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Trash2,
  ExternalLink,
  Zap,
  Copy,
  Plus,
  ArrowLeft,
  Check,
  Mic,
  MicOff,
  Lock,
  Unlock,
  FileUp,
  Globe,
  Save,
  Rocket,
  Layers,
  ChevronRight,
  Edit2,
  User,
  HelpCircle,
  FileCode,
  Tag
} from 'lucide-react';
import { useApp } from '@/store/useApp';
import type { Product } from '@/types';

interface Agent {
  id: string;
  name: string;
  role?: string;
  avatar_url?: string;
}

interface KnowledgeFile {
  id: string;
  agent_id: string;
  folder: 'material_estudio' | 'material_compartible';
  file_name: string;
  file_type: string;
  file_size: number;
  storage_url?: string;
  cdn_url?: string;
  product_id?: string;
  created_at?: string;
}

interface ProductFormProps {
  product?: Product | null;
  isEditing?: boolean;
}

// Reconocimiento de voz nativo en navegador
function startSpeechRecognition(
  onAppendText: (chunk: string) => void,
  onRecordingState: (recording: boolean) => void,
  onError: (err: string | null) => void
) {
  if (typeof window === 'undefined') return null;
  const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRec) {
    onError('Tu navegador no soporta reconocimiento de voz nativo. Puedes escribir o pegar tus ideas en el cuadro de texto.');
    return null;
  }
  try {
    const recognition = new SpeechRec();
    recognition.lang = 'es-MX';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => {
      onRecordingState(true);
      onError(null);
    };

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript + ' ';
        }
      }
      if (transcript.trim()) {
        onAppendText(transcript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        onError('Error de micrófono: ' + event.error);
      }
      onRecordingState(false);
    };

    recognition.onend = () => {
      onRecordingState(false);
    };

    recognition.start();
    return recognition;
  } catch (err: any) {
    onError('Error al iniciar micrófono: ' + err.message);
    onRecordingState(false);
    return null;
  }
}

export default function ProductForm({ product, isEditing = false }: ProductFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ctx } = useApp();

  // Pestaña activa en el estudio del producto
  const initialTab = searchParams.get('tab') || 'general';
  const [activeTab, setActiveTab] = useState<'general' | 'estudio' | 'estrategia' | 'maletin' | 'ficha'>(
    initialTab as any || 'general'
  );

  // Estados de datos básicos
  const [formData, setFormData] = useState({
    name: product?.name || '',
    short_description: product?.short_description || '',
    irresistible_offer: product?.irresistible_offer || '',
    target_triggers: product?.target_triggers || '',
    price_range: product?.price_range || '',
    knowledge_sheet: product?.knowledge_sheet || '',
    agent_id: product?.agent_id || '',
  });

  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [savingBasic, setSavingBasic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Archivos de Zona 1 y Zona 2
  const [studyFiles, setStudyFiles] = useState<KnowledgeFile[]>([]);
  const [shareableFiles, setShareableFiles] = useState<KnowledgeFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    active: boolean;
    folder: string;
    current: number;
    total: number;
    fileName: string;
    percent: number;
  } | null>(null);

  // Web Scraper
  const [scrapeUrlInput, setScrapeUrlInput] = useState('');
  const [scrapingUrl, setScrapingUrl] = useState(false);
  const [scrapingStatus, setScrapingStatus] = useState<{ stage: string; percent: number } | null>(null);
  const [scrapeInlineSuccess, setScrapeInlineSuccess] = useState<{ title: string; wordCount: number } | null>(null);
  const [scrapeInlineError, setScrapeInlineError] = useState<string | null>(null);

  // Dictado de voz para Estudio
  const [isRecordingStudyVoice, setIsRecordingStudyVoice] = useState(false);
  const [studyVoiceText, setStudyVoiceText] = useState('');
  const [customVoiceTitle, setCustomVoiceTitle] = useState('');
  const [processingStudyVoice, setProcessingStudyVoice] = useState(false);
  const [studyVoiceSuccess, setStudyVoiceSuccess] = useState<{ title: string; wordCount: number } | null>(null);
  const [studyVoiceError, setStudyVoiceError] = useState<string | null>(null);
  const studyVoiceRecognitionRef = useRef<any>(null);

  // Estrategia Comercial & Entrevista de Oferta Irresistible (Paso 1 y Paso 2)
  const [processingBaseInfo, setProcessingBaseInfo] = useState(false);
  const [marketIntelReady, setMarketIntelReady] = useState(false);
  const [interviewQuestions, setInterviewQuestions] = useState<Array<{ id: number; title: string; contextual_prompt: string }>>([]);
  const [interviewInputMode, setInterviewInputMode] = useState<'text' | 'voice' | 'file'>('text');
  const [interviewTextAnswer, setInterviewTextAnswer] = useState('');
  const [interviewAudioText, setInterviewAudioText] = useState('');
  const [interviewUploadFileName, setInterviewUploadFileName] = useState('');
  const [isRecordingInterview, setIsRecordingInterview] = useState(false);
  const [synthesizingOffer, setSynthesizingOffer] = useState(false);
  const [offerSuccessData, setOfferSuccessData] = useState<any | null>(null);
  const [interviewError, setInterviewError] = useState<string | null>(null);
  const interviewRecognitionRef = useRef<any>(null);

  // Zona 3: Ficha de Conocimiento Sintetizada
  const [synthesizingSheet, setSynthesizingSheet] = useState(false);
  const [synthesisSuccess, setSynthesisSuccess] = useState<string | null>(null);
  const [synthesisError, setSynthesisError] = useState<string | null>(null);
  const [copiedSheet, setCopiedSheet] = useState(false);

  // Limpieza de grabadoras
  useEffect(() => {
    return () => {
      if (studyVoiceRecognitionRef.current) {
        try { studyVoiceRecognitionRef.current.stop(); } catch {}
      }
      if (interviewRecognitionRef.current) {
        try { interviewRecognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  // Cargar lista de agentes
  useEffect(() => {
    const loadAgents = async () => {
      try {
        setAgentsLoading(true);
        const res = await fetch('/api/agents');
        if (!res.ok) throw new Error('Error al cargar agentes');
        const data = await res.json();
        const list = data.agents || [];
        setAgents(list);

        // Si es nuevo y no tiene agente seleccionado, predeterminar el primero
        if (!product?.agent_id && list.length > 0) {
          setFormData((prev) => ({ ...prev, agent_id: prev.agent_id || list[0].id }));
        }
      } catch (err: any) {
        console.error('Error al cargar agentes:', err);
      } finally {
        setAgentsLoading(false);
      }
    };

    loadAgents();
  }, [product?.agent_id]);

  // Sincronizar formData si cambia product
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        short_description: product.short_description || '',
        irresistible_offer: product.irresistible_offer || '',
        target_triggers: product.target_triggers || '',
        price_range: product.price_range || '',
        knowledge_sheet: product.knowledge_sheet || '',
        agent_id: product.agent_id || '',
      });
    }
  }, [product]);

  // Cargar detalles de archivos y estado de oferta cuando existe product
  const loadProductFilesAndStrategy = async (agentId: string, prodId: string) => {
    try {
      setFilesLoading(true);
      const res = await fetch(`/api/agents/${agentId}/products/${prodId}`);
      if (res.ok) {
        const data = await res.json();
        setStudyFiles(data.studyFiles || []);
        setShareableFiles(data.shareableFiles || []);
        if (data.product?.knowledge_sheet) {
          setFormData((prev) => ({ ...prev, knowledge_sheet: data.product.knowledge_sheet }));
        }
      }

      // Cargar estado de entrevista
      const offerRes = await fetch(`/api/agents/${agentId}/products/${prodId}/offer-interview`);
      if (offerRes.ok) {
        const offerData = await offerRes.json();
        if (offerData.success) {
          setMarketIntelReady(Boolean(offerData.marketIntelReady));
          if (offerData.market_intel_data?.questions) {
            setInterviewQuestions(offerData.market_intel_data.questions);
          }
          if (offerData.offer_interview_data) {
            setOfferSuccessData(offerData.offer_interview_data);
          }
          if (offerData.irresistible_offer && !interviewTextAnswer) {
            setInterviewTextAnswer(offerData.irresistible_offer);
          }
        }
      }
    } catch (err: any) {
      console.warn('Error al cargar archivos y estrategia:', err.message);
    } finally {
      setFilesLoading(false);
    }
  };

  useEffect(() => {
    const currentAgentId = formData.agent_id || product?.agent_id;
    const currentProdId = product?.id;
    if (currentAgentId && currentProdId) {
      loadProductFilesAndStrategy(currentAgentId, currentProdId);
    }
  }, [product?.id, formData.agent_id]);

  // Guardar datos básicos
  const handleSaveBasic = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!formData.name.trim()) {
      setError('El nombre del producto es obligatorio');
      return;
    }
    if (!formData.agent_id) {
      setError('Debes seleccionar un agente para atender este producto');
      return;
    }

    try {
      setSavingBasic(true);
      const method = product?.id ? 'PUT' : 'POST';
      const url = product?.id ? `/api/products/${product.id}` : '/api/products';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          account_id: ctx?.accountId || 'default',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar el producto');

      setSuccessMsg('✅ ¡Producto guardado correctamente!');

      // Si estábamos creando uno nuevo, redirigir a editarlo para continuar con estudio/estrategia
      if (!product?.id && data.product?.id) {
        router.push(`/admin/productos/${data.product.id}?tab=estudio`);
      } else {
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
    } finally {
      setSavingBasic(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // Subir archivos a Zona 1 o Zona 2
  const handleUploadFiles = async (folder: 'material_estudio' | 'material_compartible', files: FileList | null) => {
    const currentAgentId = formData.agent_id || product?.agent_id;
    const currentProdId = product?.id;
    if (!files || files.length === 0 || !currentAgentId || !currentProdId) return;

    try {
      setError(null);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        await new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (ev) => {
            try {
              const fileBase64 = ev.target?.result as string;
              const res = await fetch(`/api/agents/${currentAgentId}/knowledge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  folder,
                  fileName: file.name,
                  fileType: file.type.includes('image') ? 'image' : file.type.includes('video') ? 'video' : 'document',
                  fileSize: file.size,
                  fileBase64,
                  productId: currentProdId,
                }),
              });
              if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Fallo al subir archivo');
              }
              setUploadProgress({
                active: true,
                folder,
                current: i + 1,
                total: files.length,
                fileName: file.name,
                percent: Math.round(((i + 1) / files.length) * 100),
              });
              resolve();
            } catch (e) {
              reject(e);
            }
          };
          reader.onerror = () => reject(new Error('Error al leer archivo'));
          reader.readAsDataURL(file);
        });
      }

      setSuccessMsg(`¡${files.length} archivo(s) guardado(s) exitosamente!`);
      await loadProductFilesAndStrategy(currentAgentId, currentProdId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadProgress(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // Eliminar archivo
  const handleDeleteFile = async (fileId: string) => {
    const currentAgentId = formData.agent_id || product?.agent_id;
    const currentProdId = product?.id;
    if (!currentAgentId || !confirm('¿Eliminar este archivo?')) return;

    try {
      const res = await fetch(`/api/agents/${currentAgentId}/knowledge?fileId=${fileId}`, {
        method: 'DELETE',
      });
      if (res.ok && currentProdId) {
        await loadProductFilesAndStrategy(currentAgentId, currentProdId);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Scraper de páginas web / Landing pages
  const handleScrapeUrl = async () => {
    const currentAgentId = formData.agent_id || product?.agent_id;
    const currentProdId = product?.id;
    if (!scrapeUrlInput.trim() || !currentAgentId || !currentProdId) return;

    setScrapingUrl(true);
    setScrapeInlineError(null);
    setScrapeInlineSuccess(null);
    setScrapingStatus({ stage: '🌐 Conectando con el servidor web...', percent: 25 });

    const stepTimer1 = setTimeout(() => {
      setScrapingStatus({ stage: '🧹 Limpiando scripts, menús y extrayendo contenido útil...', percent: 65 });
    }, 1100);

    const stepTimer2 = setTimeout(() => {
      setScrapingStatus({ stage: '🧠 Estructurando texto para el Segundo Cerebro...', percent: 88 });
    }, 2300);

    try {
      const res = await fetch(`/api/agents/${currentAgentId}/knowledge/scrape-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: scrapeUrlInput.trim(),
          productId: currentProdId,
          folder: 'material_estudio',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al extraer contenido de la URL');

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setScrapingStatus({ stage: '✅ ¡Completado!', percent: 100 });

      setScrapeInlineSuccess({
        title: data.title || data.file?.file_name || scrapeUrlInput,
        wordCount: data.wordCount || 0,
      });
      setScrapeUrlInput('');
      await loadProductFilesAndStrategy(currentAgentId, currentProdId);
    } catch (err: any) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setScrapeInlineError(err.message);
    } finally {
      setScrapingUrl(false);
      setTimeout(() => setScrapingStatus(null), 1200);
    }
  };

  // Dictado de voz para Estudio
  const handleToggleStudyVoice = () => {
    if (isRecordingStudyVoice) {
      if (studyVoiceRecognitionRef.current) {
        try { studyVoiceRecognitionRef.current.stop(); } catch {}
        studyVoiceRecognitionRef.current = null;
      }
      setIsRecordingStudyVoice(false);
    } else {
      setStudyVoiceError(null);
      const rec = startSpeechRecognition(
        (chunk) => setStudyVoiceText((prev) => (prev ? prev + ' ' + chunk : chunk)),
        setIsRecordingStudyVoice,
        setStudyVoiceError
      );
      studyVoiceRecognitionRef.current = rec;
    }
  };

  const handleSaveStudyVoiceNote = async () => {
    const currentAgentId = formData.agent_id || product?.agent_id;
    const currentProdId = product?.id;
    if (!currentAgentId || !currentProdId || !studyVoiceText.trim()) return;

    if (isRecordingStudyVoice) {
      if (studyVoiceRecognitionRef.current) {
        try { studyVoiceRecognitionRef.current.stop(); } catch {}
        studyVoiceRecognitionRef.current = null;
      }
      setIsRecordingStudyVoice(false);
    }

    setProcessingStudyVoice(true);
    setStudyVoiceSuccess(null);
    setStudyVoiceError(null);

    try {
      const res = await fetch(`/api/agents/${currentAgentId}/products/${currentProdId}/voice-note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawVoiceText: studyVoiceText.trim(),
          customTitle: customVoiceTitle.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al estructurar dictado');

      setStudyVoiceSuccess({
        title: data.title || 'Instrucción Verbal Estructurada',
        wordCount: data.wordCount || 0,
      });
      setStudyVoiceText('');
      setCustomVoiceTitle('');
      await loadProductFilesAndStrategy(currentAgentId, currentProdId);
    } catch (err: any) {
      setStudyVoiceError(err.message);
    } finally {
      setProcessingStudyVoice(false);
    }
  };

  // ⚡ PASO 1: PROCESAR INFORMACIÓN BASE (Analizador Automático)
  const handleProcessBaseInfo = async () => {
    const currentAgentId = formData.agent_id || product?.agent_id;
    const currentProdId = product?.id;
    if (!currentAgentId || !currentProdId) return;

    setProcessingBaseInfo(true);
    setInterviewError(null);

    try {
      const res = await fetch(`/api/agents/${currentAgentId}/products/${currentProdId}/offer-interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'process_base' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al procesar información base');

      setMarketIntelReady(true);
      if (data.questions && data.questions.length > 0) {
        setInterviewQuestions(data.questions);
      }
      setSuccessMsg('⚡ ¡Información base procesada! La IA ya leyó tus documentos y desbloqueó tu Entrevista de Oferta Irresistible.');
    } catch (err: any) {
      setInterviewError(err.message);
    } finally {
      setProcessingBaseInfo(false);
      setTimeout(() => setSuccessMsg(null), 5000);
    }
  };

  // Grabación para Entrevista de Oferta
  const handleToggleInterviewRecording = () => {
    if (isRecordingInterview) {
      if (interviewRecognitionRef.current) {
        try { interviewRecognitionRef.current.stop(); } catch {}
        interviewRecognitionRef.current = null;
      }
      setIsRecordingInterview(false);
    } else {
      setInterviewError(null);
      const rec = startSpeechRecognition(
        (chunk) => {
          setInterviewAudioText((prev) => (prev ? prev + ' ' + chunk : chunk));
          setInterviewTextAnswer((prev) => (prev ? prev + ' ' + chunk : chunk));
        },
        setIsRecordingInterview,
        setInterviewError
      );
      interviewRecognitionRef.current = rec;
    }
  };

  const handleUploadInterviewFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setInterviewUploadFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) {
        setInterviewTextAnswer((prev) => (prev ? prev + '\n\n[Archivo ' + file.name + ']:\n' + text : text));
      }
    };
    reader.readAsText(file);
  };

  // ✨ PASO 2: EMPAQUETAR OFERTA IRRESISTIBLE (Alex Hormozi + DISC + Brian Tracy)
  const handleSynthesizeOffer = async () => {
    const currentAgentId = formData.agent_id || product?.agent_id;
    const currentProdId = product?.id;
    if (!currentAgentId || !currentProdId) return;

    if (isRecordingInterview) {
      if (interviewRecognitionRef.current) {
        try { interviewRecognitionRef.current.stop(); } catch {}
        interviewRecognitionRef.current = null;
      }
      setIsRecordingInterview(false);
    }

    setSynthesizingOffer(true);
    setInterviewError(null);

    try {
      const fallbackQuestionsText =
        interviewQuestions.length > 0
          ? interviewQuestions.map((q, i) => `[${i + 1}. ${q.title}]\n${q.contextual_prompt || q.title}`).join('\n\n')
          : 'Servicio de alta calidad con garantía y atención personalizada.';
      const content = interviewTextAnswer.trim() || interviewAudioText.trim() || fallbackQuestionsText;

      const res = await fetch(`/api/agents/${currentAgentId}/products/${currentProdId}/offer-interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'synthesize_offer',
          rawOfferText: content,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al empaquetar oferta');

      setOfferSuccessData(data.synthesized_data);
      if (data.synthesized_data?.irresistible_offer_summary) {
        setFormData((prev) => ({
          ...prev,
          irresistible_offer: data.synthesized_data.irresistible_offer_summary,
        }));
      }
      setSuccessMsg('🎉 ¡Oferta Irresistible empaquetada con éxito! Ficha de Conocimiento actualizada y blindada con DISC y Brian Tracy.');
      await loadProductFilesAndStrategy(currentAgentId, currentProdId);
    } catch (err: any) {
      setInterviewError(err.message);
    } finally {
      setSynthesizingOffer(false);
      setTimeout(() => setSuccessMsg(null), 5000);
    }
  };

  // 🧠 ZONA 3: SINTETIZAR FICHA DE CONOCIMIENTO (Markdown)
  const handleSynthesizeSheet = async () => {
    const currentAgentId = formData.agent_id || product?.agent_id;
    const currentProdId = product?.id;
    if (!currentAgentId || !currentProdId) return;

    setSynthesizingSheet(true);
    setSynthesisError(null);
    setSynthesisSuccess(null);

    try {
      const res = await fetch(`/api/agents/${currentAgentId}/products/${currentProdId}/digest`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al sintetizar ficha');

      setSynthesisSuccess('¡Ficha de Conocimiento sintetizada y estructurada para la IA con éxito!');
      await loadProductFilesAndStrategy(currentAgentId, currentProdId);
    } catch (err: any) {
      setSynthesisError(err.message);
    } finally {
      setSynthesizingSheet(false);
      setTimeout(() => setSynthesisSuccess(null), 5000);
    }
  };

  const handleCopyKnowledgeSheet = () => {
    if (!formData.knowledge_sheet) return;
    navigator.clipboard.writeText(formData.knowledge_sheet);
    setCopiedSheet(true);
    setTimeout(() => setCopiedSheet(false), 2500);
  };

  const handleDownloadKnowledgeSheet = () => {
    if (!formData.knowledge_sheet) return;
    const blob = new Blob([formData.knowledge_sheet], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'producto'}-ficha.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const FIELD = 'w-full rounded-xl border border-line bg-app p-3 text-sm outline-none focus:border-primary-light text-ink';
  const LABEL = 'mb-1.5 block text-xs font-semibold text-ink-soft';

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/admin/productos')}
            className="flex items-center gap-1.5 text-xs font-bold text-ink-soft hover:text-ink transition-colors p-2 rounded-lg hover:bg-soft"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver a Mis Productos</span>
          </button>

          {product?.id && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-ink bg-soft px-3 py-1 rounded-xl">
                {formData.name || 'Sin título'}
              </span>
              {formData.knowledge_sheet ? (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Ficha Lista
                </span>
              ) : (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  ⚡ Ficha Pendiente
                </span>
              )}
            </div>
          )}
        </div>

        {/* Botón directo a AdFlow */}
        {product?.id && (
          <button
            type="button"
            onClick={() => router.push(`/admin/adflow?productId=${product.id}`)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-light px-4 py-2 text-xs font-bold text-white shadow-md hover:scale-105 transition-all cursor-pointer"
          >
            <Rocket className="h-3.5 w-3.5" />
            <span>Lanzar Anuncio en AdFlow</span>
          </button>
        )}
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {successMsg && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600 mt-0.5" />
          <p className="text-sm text-emerald-700">{successMsg}</p>
        </div>
      )}

      {/* Studio Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-line pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'general' ? 'bg-primary text-white shadow-sm' : 'bg-soft text-ink-soft hover:text-ink'
          }`}
        >
          <Package className="h-4 w-4" />
          <span>1. Ficha Básica & Agente</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (!product?.id) {
              alert('Guarda los datos básicos primero para desbloquear los documentos de estudio.');
              return;
            }
            setActiveTab('estudio');
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'estudio' ? 'bg-primary text-white shadow-sm' : 'bg-soft text-ink-soft hover:text-ink'
          } ${!product?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <FolderLock className="h-4 w-4" />
          <span>2. Zona 1: Estudio & Web ({studyFiles.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (!product?.id) {
              alert('Guarda los datos básicos primero para desbloquear la estrategia comercial.');
              return;
            }
            setActiveTab('estrategia');
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'estrategia' ? 'bg-primary text-white shadow-sm' : 'bg-soft text-ink-soft hover:text-ink'
          } ${!product?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Sparkles className="h-4 w-4 text-amber-300" />
          <span>3. Estrategia & Oferta Hormozi</span>
          {marketIntelReady && <span className="h-2 w-2 rounded-full bg-emerald-400"></span>}
        </button>

        <button
          type="button"
          onClick={() => {
            if (!product?.id) {
              alert('Guarda los datos básicos primero para desbloquear el maletín de WhatsApp.');
              return;
            }
            setActiveTab('maletin');
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'maletin' ? 'bg-primary text-white shadow-sm' : 'bg-soft text-ink-soft hover:text-ink'
          } ${!product?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <FolderHeart className="h-4 w-4" />
          <span>4. Zona 2: Maletín WhatsApp ({shareableFiles.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (!product?.id) {
              alert('Guarda los datos básicos primero para sintetizar la ficha.');
              return;
            }
            setActiveTab('ficha');
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'ficha' ? 'bg-primary text-white shadow-sm' : 'bg-soft text-ink-soft hover:text-ink'
          } ${!product?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Zap className="h-4 w-4 text-amber-400" />
          <span>5. Zona 3: Ficha Sintetizada & AdFlow</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* PESTAÑA 1: FICHA BÁSICA & AGENTE */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveBasic} className="max-w-3xl space-y-5 bg-card p-6 rounded-2xl border border-line">
          <div>
            <h3 className="text-base font-bold text-ink">Información Principal del Producto o Servicio</h3>
            <p className="text-xs text-ink-soft mt-0.5">
              Configura el nombre comercial, el agente de IA que lo atenderá en WhatsApp y su propuesta base.
            </p>
          </div>

          {/* Nombre */}
          <div>
            <label className={LABEL}>Nombre Comercial del Producto / Servicio *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Ej: Invisalign Full, Cirugía Láser, Consultoría Fiscal, Casa en Coyoacán"
              className={FIELD}
              required
            />
          </div>

          {/* Agente asignado */}
          <div>
            <label className={LABEL}>👤 Agente de IA Asignado para Vender este Producto *</label>
            {agentsLoading ? (
              <div className="flex items-center gap-2 rounded-xl border border-line bg-app p-3 text-xs text-ink-soft">
                <RotateCw className="h-4 w-4 animate-spin text-primary" />
                Cargando agentes de la fábrica...
              </div>
            ) : (
              <select
                name="agent_id"
                value={formData.agent_id}
                onChange={(e) => setFormData((prev) => ({ ...prev, agent_id: e.target.value }))}
                className={FIELD}
                required
              >
                <option value="">-- Selecciona un agente --</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} {agent.role ? `(${agent.role})` : ''}
                  </option>
                ))}
              </select>
            )}
            <p className="text-[11px] text-ink-soft mt-1">
              Este agente responderá en WhatsApp a los leads que lleguen desde tus anuncios de AdFlow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Rango de Precio */}
            <div>
              <label className={LABEL}>Rango de Precio / Inversión</label>
              <input
                type="text"
                name="price_range"
                value={formData.price_range}
                onChange={(e) => setFormData((prev) => ({ ...prev, price_range: e.target.value }))}
                placeholder="Ej: $45,000 - $60,000 MXN o $1,500 USD"
                className={FIELD}
              />
            </div>

            {/* Descripción corta */}
            <div>
              <label className={LABEL}>Descripción Corta</label>
              <input
                type="text"
                name="short_description"
                value={formData.short_description}
                onChange={(e) => setFormData((prev) => ({ ...prev, short_description: e.target.value }))}
                placeholder="Una frase atractiva de presentación"
                className={FIELD}
              />
            </div>
          </div>

          {/* Gatillos de Dolor */}
          <div>
            <label className={LABEL}>🎯 Gatillos de Dolor y Necesidades que Resuelve</label>
            <textarea
              name="target_triggers"
              value={formData.target_triggers}
              onChange={(e) => setFormData((prev) => ({ ...prev, target_triggers: e.target.value }))}
              placeholder="¿Qué frustraciones o miedos tiene tu cliente antes de comprarte? Ej: Miedo al dolor, presupuestos ocultos, falta de tiempo..."
              className={`${FIELD} min-h-20 resize-none`}
            />
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-3 pt-4 border-t border-line">
            <button
              type="submit"
              disabled={savingBasic}
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-white transition-all hover:bg-primary-dark disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {savingBasic ? (
                <>
                  <RotateCw className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {product?.id ? 'Guardar Cambios' : 'Crear Producto & Desbloquear Zonas'}
                </>
              )}
            </button>

            {product?.id && (
              <button
                type="button"
                onClick={() => setActiveTab('estudio')}
                className="flex items-center gap-2 rounded-xl border border-line px-5 py-2.5 text-xs font-bold text-ink hover:bg-soft transition-colors"
              >
                <span>Siguiente: Subir Documentos de Estudio</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* PESTAÑA 2: ZONA 1 - DOCUMENTOS DE ESTUDIO & WEB SCRAPER */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'estudio' && product?.id && (
        <div className="space-y-6">
          <div className="rounded-2xl border-2 border-dashed border-amber-500/40 bg-amber-500/5 p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center">
                  <FolderLock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-ink">
                    Zona 1: Documentos de Estudio del Producto
                  </h4>
                  <p className="text-xs text-ink-soft mt-0.5">
                    Manuales técnicos, PDFs, dictados de voz y páginas web. Es solo para que la IA aprenda; <strong>nunca se envían al cliente</strong>.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-700 border border-amber-500/30">
                🔒 100% Confidencial
              </span>
            </div>

            {/* 1. Subida de Archivos */}
            <div className="space-y-3">
              <label className="flex flex-col items-center justify-center gap-2 w-full p-6 rounded-2xl border-2 border-dashed border-line bg-card hover:bg-soft text-ink cursor-pointer transition-all shadow-sm">
                <UploadCloud className="h-8 w-8 text-primary" />
                <span className="text-xs font-bold text-ink">Subir Manuales, PDFs, Word o TXT de este producto</span>
                <span className="text-[11px] text-ink-soft">Puedes seleccionar múltiples archivos a la vez</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.md"
                  className="hidden"
                  onChange={(e) => handleUploadFiles('material_estudio', e.target.files)}
                />
              </label>

              {/* Barra de progreso */}
              {uploadProgress && uploadProgress.folder === 'material_estudio' && (
                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 space-y-1.5 animate-pulse">
                  <div className="flex justify-between text-xs font-semibold text-amber-800">
                    <span className="truncate">Subiendo ({uploadProgress.current}/{uploadProgress.total}): {uploadProgress.fileName}</span>
                    <span>{uploadProgress.percent}%</span>
                  </div>
                  <div className="w-full bg-amber-500/20 rounded-full h-2 overflow-hidden">
                    <div className="bg-amber-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress.percent}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* 2. Web Scraper Inteligente */}
            <div className="p-4 rounded-xl bg-card border border-line space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-bold text-ink">🌐 Extraer Información desde una Página Web o Landing Page</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://tupagina.com/producto-o-servicio"
                  value={scrapeUrlInput}
                  onChange={(e) => setScrapeUrlInput(e.target.value)}
                  className="flex-1 rounded-xl border border-line bg-app px-3.5 py-2 text-xs text-ink outline-none focus:border-primary-light"
                />
                <button
                  type="button"
                  onClick={handleScrapeUrl}
                  disabled={scrapingUrl || !scrapeUrlInput.trim()}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm shrink-0"
                >
                  {scrapingUrl ? (
                    <>
                      <RotateCw className="h-3.5 w-3.5 animate-spin" />
                      Extrayendo...
                    </>
                  ) : (
                    <>
                      <Globe className="h-3.5 w-3.5" />
                      Extraer con IA
                    </>
                  )}
                </button>
              </div>

              {scrapingStatus && (
                <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-xs text-blue-800 space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span>{scrapingStatus.stage}</span>
                    <span>{scrapingStatus.percent}%</span>
                  </div>
                  <div className="w-full bg-blue-500/20 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${scrapingStatus.percent}%` }} />
                  </div>
                </div>
              )}

              {scrapeInlineSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Página extraída con éxito: <strong>{scrapeInlineSuccess.title}</strong> ({scrapeInlineSuccess.wordCount} palabras procesadas).</span>
                </div>
              )}
              {scrapeInlineError && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>{scrapeInlineError}</span>
                </div>
              )}
            </div>

            {/* 3. Dictado por Voz con Pulido Cognitivo */}
            <div className="p-4 rounded-xl bg-card border border-line space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink flex items-center gap-2">
                  <Mic className="h-4 w-4 text-purple-500" />
                  🎙️ Dictar Instrucciones o Explicación Verbal a la IA
                </span>
                {isRecordingStudyVoice && (
                  <span className="text-[10px] font-bold text-red-500 animate-pulse">
                    🔴 Grabando micrófono... Habla normalmente
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Título opcional (ej: Cómo calificar a los clientes para este servicio)"
                  value={customVoiceTitle}
                  onChange={(e) => setCustomVoiceTitle(e.target.value)}
                  className="flex-1 rounded-xl border border-line bg-app px-3.5 py-2 text-xs text-ink outline-none"
                />
                <button
                  type="button"
                  onClick={handleToggleStudyVoice}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer ${
                    isRecordingStudyVoice
                      ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {isRecordingStudyVoice ? (
                    <>
                      <MicOff className="h-3.5 w-3.5" />
                      Detener Dictado
                    </>
                  ) : (
                    <>
                      <Mic className="h-3.5 w-3.5" />
                      Iniciar Grabación
                    </>
                  )}
                </button>
              </div>

              {studyVoiceText && (
                <div className="space-y-2">
                  <textarea
                    value={studyVoiceText}
                    onChange={(e) => setStudyVoiceText(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-line bg-app p-3 text-xs text-ink focus:outline-none"
                    placeholder="Texto dictado..."
                  />
                  <button
                    type="button"
                    onClick={handleSaveStudyVoiceNote}
                    disabled={processingStudyVoice}
                    className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary-dark transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {processingStudyVoice ? (
                      <>
                        <RotateCw className="h-3.5 w-3.5 animate-spin" />
                        Pulir y Estructurar con IA...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                        Guardar como Documento de Estudio
                      </>
                    )}
                  </button>
                </div>
              )}

              {studyVoiceSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Dictado estructurado con éxito: <strong>{studyVoiceSuccess.title}</strong></span>
                </div>
              )}
            </div>

            {/* 4. Lista de Archivos Cargados en Zona 1 */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-ink block">Documentos de estudio activos ({studyFiles.length}):</span>
              {studyFiles.length === 0 ? (
                <div className="py-6 text-center text-ink-soft text-xs italic bg-card rounded-xl border border-dashed border-line">
                  Aún no has cargado documentos de estudio para este producto. Sube un manual o extrae una página web.
                </div>
              ) : (
                <div className="grid gap-2 max-h-60 overflow-y-auto">
                  {studyFiles.map((f) => (
                    <div key={f.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-line text-xs">
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {f.file_type === 'web_url' ? (
                          <Globe className="h-4 w-4 text-blue-500 shrink-0" />
                        ) : f.file_type === 'voice_note' ? (
                          <Mic className="h-4 w-4 text-purple-500 shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 text-ink-soft shrink-0" />
                        )}
                        <span className="truncate font-semibold text-ink">{f.file_name}</span>
                        <span className="text-[10px] text-ink-soft">
                          {f.file_type === 'web_url' || f.file_type === 'voice_note'
                            ? `(${f.file_size} palabras)`
                            : `(${(f.file_size / 1024).toFixed(0)} KB)`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {f.storage_url && f.storage_url.startsWith('http') && (
                          <a href={f.storage_url} target="_blank" rel="noreferrer" className="text-ink-soft hover:text-primary p-1">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                        <button type="button" onClick={() => handleDeleteFile(f.id)} className="text-ink-soft hover:text-red-500 p-1">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Siguiente paso */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setActiveTab('estrategia')}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-primary-dark transition-all cursor-pointer"
            >
              <span>Siguiente: Procesar con IA & Oferta Irresistible</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* PESTAÑA 3: ESTRATEGIA COMERCIAL & OFERTA IRRESISTIBLE */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'estrategia' && product?.id && (
        <div className="space-y-6">
          <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-primary/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-base shadow-sm">
                  🎯
                </div>
                <div>
                  <h4 className="text-base font-bold text-ink flex items-center gap-2">
                    Estrategia de Conversión: Market Intelligence & Oferta Irresistible
                  </h4>
                  <p className="text-xs text-ink-soft mt-0.5">
                    Metodología en 2 Fases para blindar la psicología del agente con Alex Hormozi, DISC y cierres de Brian Tracy.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 shrink-0">
                Alex Hormozi + DISC
              </span>
            </div>

            {interviewError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{interviewError}</span>
                </div>
                <button type="button" onClick={() => setInterviewError(null)} className="font-bold underline">
                  Descartar
                </button>
              </div>
            )}

            {/* ⚡ PASO 1: PROCESAR INFORMACIÓN BASE (Analizador Automático) */}
            <div className="p-5 rounded-2xl bg-card border border-line space-y-3 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-ink text-inverse text-xs font-bold flex items-center justify-center">1</span>
                    <h5 className="text-xs font-bold text-ink uppercase tracking-wider">
                      Paso 1: Procesar Información Base & Documentos de Estudio
                    </h5>
                  </div>
                  <p className="text-xs text-ink-soft mt-1 max-w-xl">
                    La IA analiza los campos y archivos de la Zona 1 para deducir las búsquedas del mercado, puntos débiles de la competencia y el dolor del avatar.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleProcessBaseInfo}
                  disabled={processingBaseInfo}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all shadow-md shrink-0 cursor-pointer active:scale-95 ${
                    processingBaseInfo
                      ? 'bg-amber-500/20 text-amber-700 cursor-wait'
                      : marketIntelReady
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/20'
                      : 'bg-primary hover:bg-primary-dark text-white'
                  }`}
                >
                  {processingBaseInfo ? (
                    <>
                      <RotateCw className="h-4 w-4 animate-spin text-amber-600" />
                      <span>Analizando Documentos...</span>
                    </>
                  ) : marketIntelReady ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Base Analizada (Volver a Procesar)</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 text-amber-300" />
                      <span>⚡ Procesar Información Base</span>
                    </>
                  )}
                </button>
              </div>

              {marketIntelReady && (
                <div className="text-[11px] text-emerald-700 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Market Intelligence deducido con éxito. Las preguntas estratégicas están desbloqueadas abajo.</span>
                </div>
              )}
            </div>

            {/* 🔓 PASO 2: ENTREVISTA DE LA OFERTA IRRESISTIBLE */}
            {!marketIntelReady ? (
              <div className="p-8 rounded-2xl bg-card border-2 border-dashed border-line text-center space-y-2">
                <div className="h-12 w-12 rounded-full bg-soft text-ink-soft flex items-center justify-center mx-auto">
                  <Lock className="h-6 w-6" />
                </div>
                <h5 className="text-xs font-bold text-ink uppercase tracking-wider">
                  Paso 2: Entrevista de la Oferta Irresistible (Bloqueada)
                </h5>
                <p className="text-xs text-ink-soft max-w-md mx-auto">
                  Primero haz clic en el botón <strong>&quot;⚡ Procesar Información Base&quot;</strong> de arriba para que la IA lea tus documentos y formule las preguntas exactas a la medida de tu servicio.
                </p>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-card border border-primary/30 space-y-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">2</span>
                    <div>
                      <h5 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                        <Unlock className="h-3.5 w-3.5 text-emerald-600" />
                        Entrevista de la Oferta Irresistible (Desbloqueada)
                      </h5>
                      <p className="text-[11px] text-ink-soft">
                        Responde estas preguntas con tus propias palabras para que la IA empaquete tu oferta y programe las tácticas de venta.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600 border border-emerald-500/30">
                    Paso Activo
                  </span>
                </div>

                {/* Preguntas de la IA */}
                <div className="space-y-2 bg-soft p-4 rounded-xl border border-line">
                  <span className="text-[11px] font-bold text-ink block mb-1">
                    Preguntas clave deducidas de tus documentos:
                  </span>
                  {(interviewQuestions.length > 0 ? interviewQuestions : [
                    { id: 1, title: '¿Por qué deberían elegirte a ti y no a tu competencia?', contextual_prompt: '¿Cuál es tu diferenciador principal?' },
                    { id: 2, title: 'El Efecto Starbucks: ¿Qué extras o comodidades se llevan?', contextual_prompt: '¿Qué comodidades o atenciones adicionales ofreces sin costo extra?' },
                    { id: 3, title: 'Garantía y Tranquilidad', contextual_prompt: '¿Qué garantía o certeza das a quien tiene dudas?' },
                    { id: 4, title: 'El Gancho de Entrada', contextual_prompt: '¿Cuál es el primer paso fácil que le propones a un prospecto en WhatsApp?' },
                  ]).map((q, i) => (
                    <div key={q.id || i} className="text-xs text-ink flex items-start gap-2 bg-card p-2.5 rounded-lg border border-line">
                      <span className="font-bold text-primary shrink-0">{i + 1}.</span>
                      <div>
                        <span className="font-semibold text-ink">{q.title}: </span>
                        <span className="text-ink-soft">{q.contextual_prompt || q.title}</span>
                      </div>
                    </div>
                  ))}

                  <div className="pt-2 mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line">
                    <button
                      type="button"
                      onClick={() => {
                        const defaultAnswers = (interviewQuestions.length > 0 ? interviewQuestions : []).map((q, i) => 
                          `${i + 1}. ${q.title}\nRespuesta: ${q.contextual_prompt || q.title}`
                        ).join('\n\n');
                        setInterviewTextAnswer(defaultAnswers);
                        setInterviewInputMode('text');
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                      <span>Copiar Propuestas de la IA al Editor (Para Ajustar o Guardar)</span>
                    </button>
                    <span className="text-[11px] text-ink-soft">
                      💡 Puedes editar las respuestas o pulsar directamente en Empaquetar Oferta abajo.
                    </span>
                  </div>
                </div>

                {/* Selector de Entrada */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-ink">
                      ¿Cómo prefieres responder la entrevista?
                    </label>
                    <div className="flex items-center gap-1 bg-soft p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setInterviewInputMode('text')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                          interviewInputMode === 'text' ? 'bg-card text-primary shadow-sm' : 'text-ink-soft hover:text-ink'
                        }`}
                      >
                        ⌨️ Escribir
                      </button>
                      <button
                        type="button"
                        onClick={() => setInterviewInputMode('voice')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                          interviewInputMode === 'voice' ? 'bg-card text-purple-600 shadow-sm' : 'text-ink-soft hover:text-ink'
                        }`}
                      >
                        🎙️ Por Voz
                      </button>
                      <button
                        type="button"
                        onClick={() => setInterviewInputMode('file')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                          interviewInputMode === 'file' ? 'bg-card text-blue-600 shadow-sm' : 'text-ink-soft hover:text-ink'
                        }`}
                      >
                        📄 Subir Archivo
                      </button>
                    </div>
                  </div>

                  {interviewInputMode === 'voice' && (
                    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2">
                      <button
                        type="button"
                        onClick={handleToggleInterviewRecording}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer ${
                          isRecordingInterview
                            ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                            : 'bg-purple-600 hover:bg-purple-700 text-white'
                        }`}
                      >
                        {isRecordingInterview ? (
                          <>
                            <MicOff className="h-4 w-4" />
                            <span>Detener Grabación y Procesar Texto</span>
                          </>
                        ) : (
                          <>
                            <Mic className="h-4 w-4" />
                            <span>Comenzar a Hablar (Dictar Respuestas)</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {interviewInputMode === 'file' && (
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-2">
                      <label className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-card border border-blue-500/30 hover:bg-soft text-blue-600 text-xs font-semibold cursor-pointer transition-all shadow-sm">
                        <UploadCloud className="h-4 w-4" />
                        <span>{interviewUploadFileName ? `Archivo: ${interviewUploadFileName}` : 'Seleccionar Documento (Word / PDF / TXT)'}</span>
                        <input
                          type="file"
                          accept=".txt,.md,.doc,.docx,.pdf"
                          className="hidden"
                          onChange={handleUploadInterviewFile}
                        />
                      </label>
                    </div>
                  )}

                  <textarea
                    value={interviewTextAnswer}
                    onChange={(e) => setInterviewTextAnswer(e.target.value)}
                    rows={4}
                    placeholder="Aquí aparecerán tus respuestas dictadas, del archivo o escritas manualmente..."
                    className={FIELD}
                  />
                </div>

                {/* Botón de Síntesis Final de Oferta */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-line">
                  <p className="text-[11px] text-ink-soft">
                    Al empaquetar, la IA calibra los botones mentales, palabras prohibidas y disparadores de venta.
                  </p>
                  <button
                    type="button"
                    onClick={handleSynthesizeOffer}
                    disabled={synthesizingOffer}
                    className="px-6 py-3 bg-gradient-to-r from-primary to-primary-light hover:brightness-110 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                  >
                    {synthesizingOffer ? (
                      <>
                        <RotateCw className="h-4 w-4 animate-spin" />
                        <span>Empaquetando Oferta...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 text-amber-300" />
                        <span>✨ Empaquetar Oferta Irresistible</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Resumen de la Oferta Blindada */}
                {(offerSuccessData || formData.irresistible_offer) && (
                  <div className="p-4 rounded-xl bg-soft border border-line space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ink flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Oferta Empaquetada & Blindada:
                      </span>
                      <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded border border-emerald-500/20">
                        Guardado en Memoria
                      </span>
                    </div>
                    <p className="text-ink italic bg-card p-3 rounded-xl border border-line">
                      {offerSuccessData?.irresistible_offer_summary || formData.irresistible_offer}
                    </p>
                    {offerSuccessData?.buttons_dictionary && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/20 text-red-800">
                          <span className="font-bold block mb-1">🚫 Palabras Prohibidas (Fricción):</span>
                          {(offerSuccessData.buttons_dictionary.forbidden_words || []).join(', ')}
                        </div>
                        <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-emerald-800">
                          <span className="font-bold block mb-1">💎 Palabras de Poder (Valor):</span>
                          {(offerSuccessData.buttons_dictionary.power_words || []).join(', ')}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* PESTAÑA 4: ZONA 2 - MALETÍN WHATSAPP */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'maletin' && product?.id && (
        <div className="space-y-6">
          <div className="rounded-2xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                  <FolderHeart className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-ink">
                    Zona 2: Archivos para Enviar por WhatsApp (El Maletín)
                  </h4>
                  <p className="text-xs text-ink-soft mt-0.5">
                    Videos, fotos y folletos en PDF que la IA le enviará automáticamente al cliente cuando pregunte por este producto.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-700 border border-emerald-500/30">
                📱 El Maletín
              </span>
            </div>

            <label className="flex flex-col items-center justify-center gap-2 w-full p-6 rounded-2xl border-2 border-dashed border-line bg-card hover:bg-soft text-ink cursor-pointer transition-all shadow-sm">
              <UploadCloud className="h-8 w-8 text-emerald-600" />
              <span className="text-xs font-bold text-ink">Subir Videos demos, Fotos o Folletos PDF</span>
              <span className="text-[11px] text-ink-soft">Listos para compartirse en WhatsApp</span>
              <input
                type="file"
                multiple
                accept="image/*,video/*,.pdf"
                className="hidden"
                onChange={(e) => handleUploadFiles('material_compartible', e.target.files)}
              />
            </label>

            {/* Lista de archivos en el Maletín */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-ink block">Archivos en el maletín ({shareableFiles.length}):</span>
              {shareableFiles.length === 0 ? (
                <div className="py-6 text-center text-ink-soft text-xs italic bg-card rounded-xl border border-dashed border-line">
                  Maletín vacío para este producto. Sube fotos o un catálogo en PDF.
                </div>
              ) : (
                <div className="grid gap-2 max-h-60 overflow-y-auto">
                  {shareableFiles.map((f) => (
                    <div key={f.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-line text-xs">
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span>{f.file_type === 'video' ? '🎥' : f.file_type === 'image' ? '🖼️' : '📄'}</span>
                        <span className="truncate font-semibold text-ink">{f.file_name}</span>
                        {f.cdn_url && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            WhatsApp Listo
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {f.cdn_url && (
                          <a href={f.cdn_url} target="_blank" rel="noreferrer" className="text-ink-soft hover:text-primary p-1">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                        <button type="button" onClick={() => handleDeleteFile(f.id)} className="text-ink-soft hover:text-red-500 p-1">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* PESTAÑA 5: ZONA 3 - FICHA SINTETIZADA & ADFLOW */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'ficha' && product?.id && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-line bg-card p-6 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
              <div>
                <h4 className="text-base font-bold text-ink flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Zona 3: Ficha de Conocimiento Sintetizada
                </h4>
                <p className="text-xs text-ink-soft mt-0.5">
                  La síntesis técnica y comercial que la IA memoriza para asesorar, responder objeciones y cerrar ventas.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSynthesizeSheet}
                disabled={synthesizingSheet}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition-all shadow-md disabled:opacity-50 cursor-pointer active:scale-95 shrink-0"
              >
                <Zap className={`h-4 w-4 ${synthesizingSheet ? 'animate-bounce text-amber-300' : 'text-amber-300'}`} />
                <span>{synthesizingSheet ? 'Sintetizando con IA...' : '⚡ Sintetizar Ficha de Conocimiento'}</span>
              </button>
            </div>

            {synthesizingSheet && (
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-ink flex items-start gap-3 animate-pulse">
                <RotateCw className="h-5 w-5 text-primary animate-spin shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-ink">🧠 Sintetizando Ficha de Conocimiento con IA...</p>
                  <p className="text-ink-soft">
                    Analizando documentos de estudio internos y destilando directrices técnicas, objeciones y disparadores de venta. Esto suele tomar de 10 a 25 segundos.
                  </p>
                </div>
              </div>
            )}

            {synthesisSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{synthesisSuccess}</span>
              </div>
            )}
            {synthesisError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <span>{synthesisError}</span>
              </div>
            )}

            {formData.knowledge_sheet ? (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-soft p-3 rounded-xl border border-line">
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 flex items-center gap-1.5 w-fit">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Ficha lista y memorizada por la IA
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyKnowledgeSheet}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-card hover:bg-soft text-ink text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      {copiedSheet ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedSheet ? '¡Copiado!' : 'Copiar Ficha'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadKnowledgeSheet}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink hover:bg-black text-white text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      <span>Descargar (.md)</span>
                    </button>
                  </div>
                </div>

                <div className="bg-slate-900 text-slate-100 rounded-xl p-5 font-mono text-xs max-h-96 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text border border-slate-800">
                  {formData.knowledge_sheet}
                </div>
              </div>
            ) : (
              !synthesizingSheet && (
                <div className="py-8 text-center text-ink-soft text-xs italic bg-soft rounded-xl border border-dashed border-line">
                  La Ficha de Conocimiento aún no ha sido destilada. Haz clic en el botón <strong>&quot;⚡ Sintetizar Ficha de Conocimiento&quot;</strong> para que la IA procese todos los documentos de este producto.
                </div>
              )
            )}

            {/* Fábrica de Contenido / AdFlow Banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Rocket className="h-4 w-4" />
                  Fábrica de Contenido & Anuncios AdFlow
                </span>
                <h5 className="text-sm font-bold text-ink">
                  ¿Listo para vender este producto en WhatsApp, Meta o Google?
                </h5>
                <p className="text-xs text-ink-soft max-w-lg">
                  Lanza una campaña en 60 segundos. AdFlow usará la Oferta Irresistible y la Ficha de este producto para redactar copys de alta conversión y generar creativos con IA.
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push(`/admin/adflow?productId=${product.id}`)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-light px-6 py-3 text-xs font-bold text-white shadow-lg hover:scale-105 transition-all cursor-pointer shrink-0"
              >
                <Rocket className="h-4 w-4" />
                <span>Crear Anuncios con esta Ficha</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
