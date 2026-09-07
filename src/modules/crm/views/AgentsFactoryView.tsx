'use client';

import { useState, useEffect } from 'react';
import { SecondBrainGraph } from '../components/SecondBrainGraph';
import {
  Globe,
  Pencil,
  Bot,
  FolderLock,
  FolderHeart,
  UploadCloud,
  FileText,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCw,
  Trash2,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Key,
  ShieldCheck,
  Zap,
  Award,
  ThumbsUp,
  Sliders,
  Copy,
  Plus,
  Settings as SettingsIcon, Heart, Network,
  AlertTriangle,
  ArrowRight,
  Package,
  Layers,
  Sparkles,
  ArrowLeft,
  Check
} from 'lucide-react';

export interface ModelOption {
  id: string;
  name: string;
  provider: 'google' | 'anthropic' | 'openai';
  status: 'active' | 'deprecated' | 'legacy';
  description: string;
  isRecommended?: boolean;
  recommendedReplacement?: string;
}

export interface AgentData {
  id: string;
  name: string;
  role: string;
  mission_type: 'ventas_setter' | 'ventas_closer' | 'servicio_soporte';
  status: 'draft' | 'training' | 'active' | 'archived';
  llm_provider: 'google' | 'anthropic' | 'openai';
  llm_model: string;
  hasApiKey?: boolean;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
  modelWarning?: {
    isDeprecated: boolean;
    currentModel: string;
    provider: string;
    recommendedModel: string;
    reason: string;
  };
}

export interface ProductData {
  id: string;
  agent_id: string;
  name: string;
  slug: string;
  short_description: string;
  target_triggers: string;
  price_range: string;
  knowledge_sheet?: string;
  study_files_count?: number;
  shareable_files_count?: number;
  has_knowledge_sheet?: boolean;
  created_at?: string;
}

export interface KnowledgeFile {
  id: string;
  agent_id: string;
  product_id?: string | null;
  folder: 'material_estudio' | 'material_compartible';
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  cdn_url?: string;
  storage_url?: string;
  created_at: string;
}

export interface BrainDoc {
  id: string;
  agent_id: string;
  file_slug: string;
  title: string;
  markdown_content: string;
  version: number;
  updated_at: string;
}

export interface Simulation {
  id: string;
  agent_id: string;
  scenario_title: string;
  buyer_persona: string;
  dialogue: Array<{ sender: 'buyer' | 'agent'; text: string; attachment?: string }>;
  evaluation?: {
    score?: number;
    strengths?: string[];
    weaknesses?: string[];
    summary?: string;
  };
  status: 'pending_review' | 'approved' | 'rejected' | 'needs_adjustment';
  feedback_notes?: string;
  created_at: string;
}

export default function AgentsFactoryView() {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null);
  
  // Productos del Agente
  const [products, setProducts] = useState<ProductData[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
  const [productStudyFiles, setProductStudyFiles] = useState<KnowledgeFile[]>([]);
  const [productShareableFiles, setProductShareableFiles] = useState<KnowledgeFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{
    active: boolean;
    folder: 'material_estudio' | 'material_compartible';
    current: number;
    total: number;
    fileName: string;
    percent: number;
  } | null>(null);
  const [copiedSheet, setCopiedSheet] = useState(false);
  const [synthesisError, setSynthesisError] = useState<string | null>(null);
  const [synthesisSuccess, setSynthesisSuccess] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [scrapeUrlInput, setScrapeUrlInput] = useState('');
  const [scrapingUrl, setScrapingUrl] = useState(false);
  const [editingSimId, setEditingSimId] = useState<string | null>(null);
  const [editingDialogue, setEditingDialogue] = useState<Array<{ sender: 'buyer' | 'agent'; text: string }> | null>(null);
  const [scrapingStatus, setScrapingStatus] = useState<{ stage: string; percent: number } | null>(null);
  const [scrapeInlineSuccess, setScrapeInlineSuccess] = useState<{ title: string; wordCount: number } | null>(null);
  const [scrapeInlineError, setScrapeInlineError] = useState<string | null>(null);

  // Cerebro global y simulaciones
  const [brainDocs, setBrainDocs] = useState<BrainDoc[]>([]);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Catálogo de modelos
  const [modelCatalog, setModelCatalog] = useState<Record<'google' | 'anthropic' | 'openai', ModelOption[]>>({
    google: [],
    anthropic: [],
    openai: [],
  });

  // Tabs de Navegación
  const [activeTab, setActiveTab] = useState<'productos' | 'grafo' | 'soul' | 'cerebro' | 'gimnasio' | 'ajustes'>('productos');
  const [selectedBrainSlug, setSelectedBrainSlug] = useState<string | null>(null);

  // Modal Crear Agente
  const [createAgentModal, setCreateAgentModal] = useState(false);
  const [createStep, setCreateStep] = useState<number>(1);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentMission, setNewAgentMission] = useState<'ventas_setter' | 'ventas_closer' | 'servicio_soporte'>('ventas_setter');
  const [newAgentRole, setNewAgentRole] = useState('Setter Comercial WhatsApp');
  const [newAgentProvider, setNewAgentProvider] = useState<'google' | 'anthropic' | 'openai'>('google');
  const [newAgentModel, setNewAgentModel] = useState('gemini-2.0-flash');

  // Modal Crear Producto
  const [createProductModal, setCreateProductModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdTriggers, setNewProdTriggers] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');

  // Personalidad y Tono (ia-soul)
  const [soulPreset, setSoulPreset] = useState<'calido_humano' | 'vendedor_consultivo' | 'tecnico_experto' | 'paciencia_soporte'>('calido_humano');
  const [soulWarmth, setSoulWarmth] = useState(9);
  const [soulFormality, setSoulFormality] = useState(4);
  const [soulClosingStyle, setSoulClosingStyle] = useState(6);
  const [soulTechnicalLevel, setSoulTechnicalLevel] = useState(5);
  const [soulCustomRules, setSoulCustomRules] = useState('');

  // Ajustes del agente
  const [editProvider, setEditProvider] = useState<'google' | 'anthropic' | 'openai'>('google');
  const [editModel, setEditModel] = useState('');
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');

  // Estados de síntesis
  const [synthesizingGlobal, setSynthesizingGlobal] = useState(false);
  const [synthesisStep, setSynthesisStep] = useState(0);
  const [synthesizingProduct, setSynthesizingProduct] = useState(false);

  // Gimnasio
  const [simulating, setSimulating] = useState(false);
  const [customScenario, setCustomScenario] = useState('');
  const [feedbackSimId, setFeedbackSimId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  // 1. Cargar catálogo de modelos
  useEffect(() => {
    fetch('/api/agents/models')
      .then((res) => res.json())
      .then((data) => {
        if (data.catalog) setModelCatalog(data.catalog);
      })
      .catch((err) => console.warn('Modelos:', err.message));
  }, []);

  // 2. Cargar agentes
  const fetchAgents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/agents');
      const data = await res.json();
      if (data.agents) {
        setAgents(data.agents);
        if (data.agents.length > 0 && !selectedAgentId) {
          setSelectedAgentId(data.agents[0].id);
        }
      }
    } catch (err: any) {
      setError('Error al cargar agentes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  // 3. Cargar detalles del agente seleccionado
  const fetchAgentDetails = async (agentId: string) => {
    try {
      const res = await fetch('/api/agents/' + agentId);
      const data = await res.json();
      if (data.agent) {
        setSelectedAgent(data.agent);
        setEditProvider(data.agent.llm_provider || 'google');
        setEditModel(data.agent.llm_model || 'gemini-2.0-flash');
        setEditName(data.agent.name || '');
        setEditRole(data.agent.role || '');
        setBrainDocs(data.brainDocs || []);
        setSimulations(data.simulations || []);
        if (data.brainDocs?.length > 0 && !selectedBrainSlug) {
          setSelectedBrainSlug(data.brainDocs[0].file_slug);
        }
      }
      // Cargar productos del agente
      await fetchProducts(agentId);
    } catch (err: any) {
      setError('Error al cargar detalles: ' + err.message);
    }
  };

  useEffect(() => {
    if (selectedAgentId) {
      setSelectedProductId(null);
      setSelectedProduct(null);
      fetchAgentDetails(selectedAgentId);
    }
  }, [selectedAgentId]);

  // 4. Cargar productos
  const fetchProducts = async (agentId: string) => {
    try {
      const res = await fetch('/api/agents/' + agentId + '/products');
      const data = await res.json();
      if (data.products) {
        setProducts(data.products);
      }
    } catch (err: any) {
      console.error('Error al cargar productos:', err.message);
    }
  };

  // 5. Cargar detalle de un producto específico
  const fetchProductDetail = async (agentId: string, prodId: string) => {
    try {
      setActionLoading(true);
      const res = await fetch('/api/agents/' + agentId + '/products/' + prodId);
      const data = await res.json();
      if (data.product) {
        setSelectedProduct(data.product);
        setProductStudyFiles(data.studyFiles || []);
        setProductShareableFiles(data.shareableFiles || []);
      }
    } catch (err: any) {
      setError('Error al abrir producto: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenProduct = (prod: ProductData) => {
    setSelectedProductId(prod.id);
    if (selectedAgentId) {
      fetchProductDetail(selectedAgentId, prod.id);
    }
  };

  // Crear producto
  const handleCreateProduct = async () => {
    if (!newProdName.trim() || !selectedAgentId) {
      alert('Ingresa el nombre del producto o servicio.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/agents/' + selectedAgentId + '/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProdName.trim(),
          short_description: newProdDesc.trim(),
          target_triggers: newProdTriggers.trim(),
          price_range: newProdPrice.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear producto');

      setCreateProductModal(false);
      setNewProdName('');
      setNewProdDesc('');
      setNewProdTriggers('');
      setNewProdPrice('');
      setSuccessMsg('Producto agregado al catálogo correctamente.');
      await fetchProducts(selectedAgentId);
      if (data.product) {
        handleOpenProduct(data.product);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // Subir archivo a un producto con barra de progreso
  const handleUploadToProduct = async (
    folder: 'material_estudio' | 'material_compartible',
    files: FileList | null
  ) => {
    if (!files || files.length === 0 || !selectedAgentId || !selectedProductId) return;
    setActionLoading(true);
    setError(null);
    setUploadProgress({
      active: true,
      folder,
      current: 0,
      total: files.length,
      fileName: files[0].name,
      percent: 0,
    });
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress({
          active: true,
          folder,
          current: i + 1,
          total: files.length,
          fileName: file.name,
          percent: Math.round((i / files.length) * 100),
        });

        const reader = new FileReader();

        await new Promise<void>((resolve, reject) => {
          reader.onload = async () => {
            try {
              const fileBase64 = reader.result as string;
              const res = await fetch('/api/agents/' + selectedAgentId + '/knowledge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  folder,
                  fileName: file.name,
                  fileType: file.type.includes('image') ? 'image' : file.type.includes('video') ? 'video' : 'document',
                  fileSize: file.size,
                  fileBase64,
                  productId: selectedProductId,
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
      await fetchProductDetail(selectedAgentId, selectedProductId);
      await fetchProducts(selectedAgentId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadProgress(null);
      setActionLoading(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // Descargar Ficha de Conocimiento en archivo .md
  const handleDownloadKnowledgeSheet = () => {
    if (!selectedProduct?.knowledge_sheet) return;
    const blob = new Blob([selectedProduct.knowledge_sheet], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${selectedProduct.slug || 'producto'}-ficha-conocimiento.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copiar Ficha de Conocimiento
  const handleCopyKnowledgeSheet = () => {
    if (!selectedProduct?.knowledge_sheet) return;
    navigator.clipboard.writeText(selectedProduct.knowledge_sheet);
    setCopiedSheet(true);
    setTimeout(() => setCopiedSheet(false), 3000);
  };

  // Extraer información desde URL web con barra de progreso y etapas
  const handleScrapeUrl = async () => {
    if (!selectedAgentId || !selectedProductId || !scrapeUrlInput.trim()) return;
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
      const res = await fetch('/api/agents/' + selectedAgentId + '/knowledge/scrape-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: scrapeUrlInput.trim(),
          productId: selectedProductId,
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
      await fetchProductDetail(selectedAgentId, selectedProductId);
      await fetchProducts(selectedAgentId);
    } catch (err: any) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setScrapeInlineError(err.message);
    } finally {
      setScrapingUrl(false);
      setTimeout(() => setScrapingStatus(null), 1200);
    }
  };

  // Sintetizar Ficha de Conocimiento del Producto
  const handleSynthesizeProductSheet = async () => {
    if (!selectedAgentId || !selectedProductId) return;
    setSynthesizingProduct(true);
    setError(null);
    setSynthesisError(null);
    setSynthesisSuccess(null);
    try {
      const res = await fetch('/api/agents/' + selectedAgentId + '/products/' + selectedProductId + '/digest', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al sintetizar ficha');

      setSynthesisSuccess('¡Ficha de Conocimiento sintetizada y estructurada para la IA con éxito!');
      setSuccessMsg('Ficha de Conocimiento sintetizada y estructurada para la IA.');
      await fetchProductDetail(selectedAgentId, selectedProductId);
      await fetchProducts(selectedAgentId);
    } catch (err: any) {
      setSynthesisError(err.message);
      setError(err.message);
    } finally {
      setSynthesizingProduct(false);
      setTimeout(() => {
        setSuccessMsg(null);
        setSynthesisSuccess(null);
      }, 5000);
    }
  };

  // Eliminar producto
  const handleDeleteProduct = async (prodId: string) => {
    if (!selectedAgentId || !confirm('¿Deseas eliminar este producto y todos sus archivos?')) return;
    try {
      const res = await fetch('/api/agents/' + selectedAgentId + '/products/' + prodId, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSelectedProductId(null);
        setSelectedProduct(null);
        await fetchProducts(selectedAgentId);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Eliminar archivo
  const handleDeleteFile = async (fileId: string) => {
    if (!selectedAgentId || !confirm('¿Eliminar este archivo?')) return;
    try {
      const res = await fetch('/api/agents/' + selectedAgentId + '/knowledge?fileId=' + fileId, {
        method: 'DELETE',
      });
      if (res.ok && selectedProductId) {
        await fetchProductDetail(selectedAgentId, selectedProductId);
        await fetchProducts(selectedAgentId);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Crear Agente
  const handleCreateAgent = async () => {
    if (!newAgentName.trim()) {
      alert('Ingresa el nombre del agente.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAgentName.trim(),
          role: newAgentRole.trim(),
          missionType: newAgentMission,
          llmProvider: newAgentProvider,
          llmModel: newAgentModel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear agente');

      setCreateAgentModal(false);
      setNewAgentName('');
      setCreateStep(1);
      await fetchAgents();
      if (data.agent?.id) {
        setSelectedAgentId(data.agent.id);
        setActiveTab('productos');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Guardar ajustes
  const handleSaveSettings = async () => {
    if (!selectedAgentId) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/agents/' + selectedAgentId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          role: editRole.trim(),
          ia_soul: {
            preset: soulPreset,
            warmth: soulWarmth,
            formality: soulFormality,
            closing_style: soulClosingStyle,
            technical_level: soulTechnicalLevel,
            custom_rules: soulCustomRules.trim(),
          },
          llmProvider: editProvider,
          llmModel: editModel,
        }),
      });
      if (res.ok) {
        setSuccessMsg('Ajustes guardados con éxito.');
        await fetchAgentDetails(selectedAgentId);
        await fetchAgents();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // Encender Fábrica Global
  const handleSynthesizeGlobalBrain = async () => {
    if (!selectedAgentId) return;
    setSynthesizingGlobal(true);
    setSynthesisStep(1);
    const interval = setInterval(() => setSynthesisStep((p) => (p < 6 ? p + 1 : p)), 1400);

    try {
      const res = await fetch('/api/agents/' + selectedAgentId + '/factory/digest', { method: 'POST' });
      if (!res.ok) throw new Error('Error al sintetizar cerebro global');
      setSynthesisStep(7);
      setSuccessMsg('Segundo Cerebro Global sintetizado con éxito.');
      await fetchAgentDetails(selectedAgentId);
      setActiveTab('cerebro');
    } catch (err: any) {
      setError(err.message);
    } finally {
      clearInterval(interval);
      setSynthesizingGlobal(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // Simulación
  const handleRunSimulation = async () => {
    if (!selectedAgentId) return;
    setSimulating(true);
    try {
      const res = await fetch('/api/agents/' + selectedAgentId + '/factory/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: customScenario.trim() || undefined }),
      });
      if (!res.ok) throw new Error('Fallo al simular combate');
      setCustomScenario('');
      setSuccessMsg('Combate simulado completado.');
      await fetchAgentDetails(selectedAgentId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSimulating(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const handleReviewSimulation = async (simId: string, status: 'approved' | 'needs_adjustment', notes?: string) => {
    if (!selectedAgentId) return;
    try {
      await fetch('/api/agents/' + selectedAgentId + '/simulations/' + simId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, feedbackNotes: notes }),
      });
      setFeedbackSimId(null);
      await fetchAgentDetails(selectedAgentId);
      await fetchAgents();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Manejadores de Edición de Respuestas en el Gimnasio
  const handleStartEditSim = (sim: any) => {
    setEditingSimId(sim.id);
    const initial = Array.isArray(sim.dialogue) ? sim.dialogue.map((d: any) => ({ ...d })) : [];
    setEditingDialogue(initial);
  };

  const handleCancelEditSim = () => {
    setEditingSimId(null);
    setEditingDialogue(null);
  };

  const handleSaveEditedSim = async (simId: string) => {
    if (!selectedAgentId || !editingDialogue) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/agents/' + selectedAgentId + '/simulations/' + simId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          dialogue: editingDialogue,
          feedbackNotes: 'Respuesta modelo ajustada y calibrada por el supervisor en el Gimnasio.',
        }),
      });
      if (!res.ok) throw new Error('Error al guardar ajustes');

      setEditingSimId(null);
      setEditingDialogue(null);
      setSuccessMsg('⭐ Respuesta modelo guardada con éxito. El agente ha memorizado esta corrección para futuros prospectos.');
      await fetchAgentDetails(selectedAgentId);
      await fetchAgents();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
      setTimeout(() => setSuccessMsg(null), 5000);
    }
  };

  const currentBrainDoc = brainDocs.find((b) => b.file_slug === selectedBrainSlug) || brainDocs[0];

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 space-y-6">
      {/* Header Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Fábrica de Agentes de IA
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Multiproducto v3.0
                </span>
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Setters y Closers con Catálogo Multiproducto, Google Gemini, Claude 3.5 y Maletín de WhatsApp.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setCreateAgentModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all shadow-md shadow-indigo-600/20 active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Nuevo Agente</span>
        </button>
      </div>

      {/* Alertas */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs font-bold hover:underline">
            Cerrar
          </button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Mis Agentes */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Mis Agentes ({agents.length})
              </h2>
              <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                Leaderboard
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-sm">Cargando agentes...</div>
            ) : agents.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm space-y-3">
                <Bot className="w-8 h-8 mx-auto text-slate-300" />
                <p>No tienes agentes creados todavía.</p>
                <button
                  onClick={() => setCreateAgentModal(true)}
                  className="text-xs text-indigo-600 font-semibold hover:underline"
                >
                  Crea tu primer Setter en 1 minuto
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {agents.map((ag) => {
                  const isSelected = ag.id === selectedAgentId;
                  const isVentas = ag.mission_type.startsWith('ventas');
                  const isCloser = ag.mission_type === 'ventas_closer';

                  return (
                    <div
                      key={ag.id}
                      onClick={() => {
                        setSelectedAgentId(ag.id);
                        setError(null);
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600/30'
                          : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                              isCloser
                                ? 'bg-amber-100 text-amber-800'
                                : isVentas
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-teal-100 text-teal-800'
                            }`}
                          >
                            {isCloser ? '💰' : isVentas ? '🎯' : '🛡️'}
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {ag.name}
                            </h3>
                            <p className="text-xs text-slate-500">{ag.role}</p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                              ag.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : ag.status === 'training'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {ag.status === 'active' ? '🟢 Activo' : ag.status === 'training' ? '⚙️ Entrenando' : '🟡 Borrador'}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5 text-amber-500" />
                            {ag.llm_provider === 'google' ? 'Gemini' : ag.llm_provider === 'anthropic' ? 'Claude' : 'GPT-4o'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Taller del Agente */}
        <div className="lg:col-span-8">
          {selectedAgent ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
              {/* Barra Superior del Agente */}
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-indigo-600/20">
                    {selectedAgent.mission_type === 'ventas_closer' ? '💰' : selectedAgent.mission_type === 'ventas_setter' ? '🎯' : '🛡️'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">{selectedAgent.name}</h2>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
                        {selectedAgent.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="text-indigo-600 font-semibold flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {selectedAgent.llm_provider.toUpperCase()}: {selectedAgent.llm_model}
                      </span>
                      <span>•</span>
                      <span>{products.length} productos / servicios</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleSynthesizeGlobalBrain}
                  disabled={synthesizingGlobal || products.length === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                    synthesizingGlobal
                      ? 'bg-amber-100 text-amber-900 cursor-wait'
                      : products.length === 0
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 active:scale-95'
                  }`}
                >
                  <Zap className={`w-4 h-4 ${synthesizingGlobal ? 'animate-bounce text-amber-600' : ''}`} />
                  <span>{synthesizingGlobal ? 'Sintetizando...' : '⚡ Encender Fábrica'}</span>
                </button>
              </div>

              {/* Pestañas de Navegación */}
              <div className="flex border-b border-slate-200 px-6 gap-6 text-sm font-medium">
                <button
                  onClick={() => {
                    setActiveTab('productos');
                    setSelectedProductId(null);
                    setSelectedProduct(null);
                  }}
                  className={`py-3.5 border-b-2 transition-all flex items-center gap-2 ${
                    activeTab === 'productos'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>Productos y Servicios</span>
                  <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
                    {products.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('grafo')}
                  className={`py-3.5 border-b-2 transition-all flex items-center gap-2 ${
                    activeTab === 'grafo'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Network className="w-4 h-4" />
                  <span>Red Neuronal (Grafo)</span>
                </button>

                <button
                  onClick={() => setActiveTab('soul')}
                  className={`py-3.5 border-b-2 transition-all flex items-center gap-2 ${
                    activeTab === 'soul'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Heart className="w-4 h-4 text-rose-500" />
                  <span>Personalidad (ia-soul)</span>
                </button>

                <button
                  onClick={() => setActiveTab('cerebro')}
                  className={`py-3.5 border-b-2 transition-all flex items-center gap-2 ${
                    activeTab === 'cerebro'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <FileCode className="w-4 h-4" />
                  <span>Segundo Cerebro Global</span>
                  <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-600 font-semibold">
                    {brainDocs.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('gimnasio')}
                  className={`py-3.5 border-b-2 transition-all flex items-center gap-2 ${
                    activeTab === 'gimnasio'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                  <span>Gimnasio de Role-Playing</span>
                </button>

                <button
                  onClick={() => setActiveTab('ajustes')}
                  className={`py-3.5 border-b-2 transition-all flex items-center gap-2 ${
                    activeTab === 'ajustes'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <SettingsIcon className="w-4 h-4" />
                  <span>Ajustes</span>
                </button>
              </div>

              {/* Contenido de la Pestaña Activa */}
              <div className="p-6">
                {/* ══════════════ PESTAÑA: PRODUCTOS Y SERVICIOS ══════════════ */}
                {activeTab === 'productos' && (
                  <div>
                    {/* CASO A: LISTA VERTICAL DE PRODUCTOS (Fluyendo hacia abajo) */}
                    {!selectedProductId ? (
                      <div className="space-y-6">
                        {/* Cabecera de la sección */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                              <Package className="w-4 h-4 text-indigo-600" />
                              Catálogo de Productos y Servicios
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Cada producto tiene sus propios documentos y su Ficha de Conocimiento para evitar confusiones.
                            </p>
                          </div>

                          <button
                            onClick={() => setCreateProductModal(true)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm shrink-0 active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Agregar Producto o Servicio</span>
                          </button>
                        </div>

                        {/* Menú General del Catálogo */}
                        <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 flex items-start gap-3">
                          <Layers className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                          <div className="text-xs text-indigo-950">
                            <span className="font-bold block mb-0.5">Menú General del Negocio</span>
                            Cuando el cliente pregunte <em>&quot;¿Qué productos o servicios manejan?&quot;</em> o <em>&quot;¿En qué me pueden ayudar?&quot;</em>, la IA consultará este catálogo y guiará al prospecto hacia la solución ideal.
                          </div>
                        </div>

                        {/* LISTA VERTICAL DE PRODUCTOS HACIA ABAJO */}
                        {products.length === 0 ? (
                          <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-200 space-y-3">
                            <Package className="w-10 h-10 mx-auto text-slate-300" />
                            <h4 className="text-sm font-bold text-slate-800">No hay productos registrados aún</h4>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto">
                              Agrega tu primer producto o servicio (ej. Invisalign, Implantes, Dron X o PHIX) para cargar sus archivos.
                            </p>
                            <button
                              onClick={() => setCreateProductModal(true)}
                              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm"
                            >
                              + Agregar Primer Producto
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {products.map((prod, idx) => (
                              <div
                                key={prod.id}
                                className="bg-white rounded-2xl border border-slate-200/90 p-4 hover:border-indigo-400 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                              >
                                <div className="flex items-start gap-3 min-w-0">
                                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-700 shrink-0">
                                    {idx + 1}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <h4 className="text-sm font-bold text-slate-900 truncate">
                                        {prod.name}
                                      </h4>
                                      {prod.price_range && (
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                          {prod.price_range}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                                      {prod.short_description || 'Sin descripción breve'}
                                    </p>

                                    {/* Indicadores Oficiales */}
                                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-600">
                                      <span className="flex items-center gap-1 font-medium">
                                        <FolderLock className="w-3.5 h-3.5 text-amber-600" />
                                        {prod.study_files_count || 0} Documentos de Estudio
                                      </span>
                                      <span>•</span>
                                      <span className="flex items-center gap-1 font-medium">
                                        <FolderHeart className="w-3.5 h-3.5 text-emerald-600" />
                                        {prod.shareable_files_count || 0} Archivos WhatsApp
                                      </span>
                                      <span>•</span>
                                      <span className="flex items-center gap-1">
                                        {prod.has_knowledge_sheet ? (
                                          <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                                            <Check className="w-3.5 h-3.5" /> Ficha Lista
                                          </span>
                                        ) : (
                                          <span className="text-amber-700 font-medium">
                                            ⏳ Ficha Pendiente
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                  <button
                                    onClick={() => handleOpenProduct(prod)}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                                  >
                                    <span>Ver Producto</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProduct(prod.id)}
                                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                    title="Eliminar producto"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* CASO B: DETALLE DEL PRODUCTO SELECCIONADO (LAS 3 ZONAS OFICIALES) */
                      <div className="space-y-6">
                        {/* Barra superior de retorno */}
                        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                          <button
                            onClick={() => {
                              setSelectedProductId(null);
                              setSelectedProduct(null);
                            }}
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors"
                          >
                            <ArrowLeft className="w-4 h-4" />
                            <span>← Volver al Catálogo de Productos</span>
                          </button>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-xl">
                              {selectedProduct?.name}
                            </span>
                          </div>
                        </div>

                        {/* LAS 3 ZONAS OFICIALES */}
                        <div className="space-y-6">
                          {/* 🔒 ZONA 1: DOCUMENTOS DE ESTUDIO */}
                          <div className="rounded-2xl border-2 border-dashed border-amber-300/80 bg-amber-50/20 p-5 space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                                  <FolderLock className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-slate-900">
                                    Zona 1: Documentos de Estudio
                                  </h4>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    Manuales, fichas técnicas y notas. Es solo para que la IA aprenda; <strong>nunca se envían al cliente</strong>.
                                  </p>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                                🔒 100% Confidencial
                              </span>
                            </div>

                            {/* Lista de archivos de estudio */}
                            <div className="space-y-1.5 max-h-40 overflow-y-auto">
                              {productStudyFiles.length === 0 ? (
                                <div className="py-4 text-center text-slate-400 text-xs italic">
                                  Sin documentos de estudio para este producto. Sube manuales o fichas técnicas.
                                </div>
                              ) : (
                                productStudyFiles.map((f) => (
                                  <div
                                    key={f.id}
                                    className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs"
                                  >
                                    <div className="flex items-center gap-2 min-w-0 pr-2">
                                      {f.file_type === 'web_url' ? (
                                        <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                      ) : (
                                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      )}
                                      <span className="truncate font-medium text-slate-700">{f.file_name}</span>
                                      <span className="text-[10px] text-slate-400">
                                        {f.file_type === 'web_url'
                                          ? `(${f.file_size} palabras)`
                                          : `(${(f.file_size / 1024).toFixed(0)} KB)`}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {f.storage_url && f.storage_url.startsWith('http') && (
                                        <a
                                          href={f.storage_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-slate-400 hover:text-indigo-600 p-1"
                                          title="Abrir página web original"
                                        >
                                          <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                      )}
                                      <button
                                        onClick={() => handleDeleteFile(f.id)}
                                        className="text-slate-400 hover:text-rose-600 p-1"
                                        title="Eliminar"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>

                            {uploadProgress && uploadProgress.folder === 'material_estudio' && (
                              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1.5 animate-pulse">
                                <div className="flex justify-between text-xs font-semibold text-amber-900">
                                  <span className="truncate">Subiendo ({uploadProgress.current}/{uploadProgress.total}): {uploadProgress.fileName}</span>
                                  <span>{uploadProgress.percent}%</span>
                                </div>
                                <div className="w-full bg-amber-200 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress.percent}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              <label className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-white border border-amber-300 hover:bg-amber-50 text-slate-700 text-xs font-semibold cursor-pointer transition-all shadow-sm">
                                <UploadCloud className="w-4 h-4 text-amber-700" />
                                <span>Subir Archivos (PDF/Word/MD)</span>
                                <input
                                  type="file"
                                  multiple
                                  className="hidden"
                                  onChange={(e) => handleUploadToProduct('material_estudio', e.target.files)}
                                  disabled={actionLoading}
                                />
                              </label>

                              <button
                                type="button"
                                onClick={() => setShowUrlInput(!showUrlInput)}
                                className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-white border border-blue-300 hover:bg-blue-50 text-blue-700 text-xs font-semibold transition-all shadow-sm"
                              >
                                <Globe className="w-4 h-4 text-blue-600" />
                                <span>{showUrlInput ? 'Cerrar Enlace Web' : '🌐 + Extraer desde URL Web'}</span>
                              </button>
                            </div>

                            {showUrlInput && (
                              <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-200 space-y-3 animate-fade-in">
                                <div className="flex items-center justify-between">
                                  <label className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Scraping de Página Web o Landing Page</span>
                                  </label>
                                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full border border-blue-200">
                                    Texto Automático
                                  </span>
                                </div>

                                <div className="flex gap-2">
                                  <input
                                    type="url"
                                    value={scrapeUrlInput}
                                    onChange={(e) => setScrapeUrlInput(e.target.value)}
                                    placeholder="https://tuempresa.com/producto-o-servicio"
                                    className="flex-1 px-3 py-2 text-xs bg-white border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 shadow-sm"
                                    disabled={scrapingUrl}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleScrapeUrl();
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={handleScrapeUrl}
                                    disabled={scrapingUrl || !scrapeUrlInput.trim()}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-bold rounded-lg transition-all shadow-sm flex items-center gap-1.5 shrink-0 active:scale-95"
                                  >
                                    {scrapingUrl ? (
                                      <>
                                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                                        <span>Extrayendo...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span>Extraer y Estudiar</span>
                                      </>
                                    )}
                                  </button>
                                </div>

                                {/* Barra de progreso de scraping */}
                                {scrapingStatus && (
                                  <div className="p-3 bg-white rounded-xl border border-blue-200 space-y-1.5 shadow-sm animate-pulse">
                                    <div className="flex justify-between text-xs font-semibold text-blue-900">
                                      <span className="flex items-center gap-1.5 truncate">
                                        <RotateCw className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
                                        <span>{scrapingStatus.stage}</span>
                                      </span>
                                      <span className="text-blue-700 font-mono shrink-0">{scrapingStatus.percent}%</span>
                                    </div>
                                    <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
                                      <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${scrapingStatus.percent}%` }}
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Feedback de éxito inline */}
                                {scrapeInlineSuccess && (
                                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start justify-between gap-2 shadow-sm animate-fade-in">
                                    <div className="flex items-start gap-2">
                                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                      <div>
                                        <p className="font-bold">¡Página web extraída y memorizada con éxito!</p>
                                        <p className="text-emerald-700 text-[11px] mt-0.5">
                                          Se incorporaron <strong>{scrapeInlineSuccess.wordCount.toLocaleString()} palabras</strong> de estudio técnico y comercial desde <em>{scrapeInlineSuccess.title}</em>.
                                        </p>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => setScrapeInlineSuccess(null)}
                                      className="text-emerald-700 hover:text-emerald-950 font-bold text-sm px-1.5"
                                      title="Cerrar notificación"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                )}

                                {/* Feedback de error inline */}
                                {scrapeInlineError && (
                                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start justify-between gap-2 shadow-sm animate-fade-in">
                                    <div className="flex items-start gap-2">
                                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                      <div>
                                        <p className="font-bold">No se pudo extraer la página</p>
                                        <p className="text-rose-700 text-[11px] mt-0.5">{scrapeInlineError}</p>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => setScrapeInlineError(null)}
                                      className="text-rose-700 hover:text-rose-950 font-bold text-sm px-1.5"
                                      title="Cerrar error"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                )}

                                <p className="text-[11px] text-blue-700">
                                  La IA leerá el texto público de la página y lo guardará como material de estudio para este producto.
                                </p>
                              </div>
                            )}
                          </div>

                          {/* 📱 ZONA 2: ARCHIVOS PARA ENVIAR POR WHATSAPP */}
                          <div className="rounded-2xl border-2 border-dashed border-emerald-300/80 bg-emerald-50/20 p-5 space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                                  <FolderHeart className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-slate-900">
                                    Zona 2: Archivos para Enviar por WhatsApp
                                  </h4>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    Videos, fotos y folletos en PDF que la IA le mandará al cliente cuando pregunte por este producto.
                                  </p>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                                📱 El Maletín
                              </span>
                            </div>

                            <div className="space-y-1.5 max-h-40 overflow-y-auto">
                              {productShareableFiles.length === 0 ? (
                                <div className="py-4 text-center text-slate-400 text-xs italic">
                                  Maletín vacío para este producto. Sube un video demo o fotos.
                                </div>
                              ) : (
                                productShareableFiles.map((f) => (
                                  <div
                                    key={f.id}
                                    className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs"
                                  >
                                    <div className="flex items-center gap-2 min-w-0 pr-2">
                                      <span>
                                        {f.file_type === 'video' ? '🎥' : f.file_type === 'image' ? '🖼️' : '📄'}
                                      </span>
                                      <span className="truncate font-medium text-slate-700">{f.file_name}</span>
                                      {f.cdn_url && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                                          WhatsApp Listo
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {f.cdn_url && (
                                        <a
                                          href={f.cdn_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-slate-400 hover:text-indigo-600 p-1"
                                        >
                                          <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                      )}
                                      <button
                                        onClick={() => handleDeleteFile(f.id)}
                                        className="text-slate-400 hover:text-rose-600 p-1"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>

                            {uploadProgress && uploadProgress.folder === 'material_compartible' && (
                              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1.5 animate-pulse">
                                <div className="flex justify-between text-xs font-semibold text-emerald-900">
                                  <span className="truncate">Subiendo ({uploadProgress.current}/{uploadProgress.total}): {uploadProgress.fileName}</span>
                                  <span>{uploadProgress.percent}%</span>
                                </div>
                                <div className="w-full bg-emerald-200 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress.percent}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            <label className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer transition-all shadow-sm">
                              <UploadCloud className="w-4 h-4 text-white" />
                              <span>Subir Archivos para WhatsApp (Videos / Fotos / PDF)</span>
                              <input
                                type="file"
                                multiple
                                className="hidden"
                                onChange={(e) => handleUploadToProduct('material_compartible', e.target.files)}
                                disabled={actionLoading}
                              />
                            </label>
                          </div>

                          {/* 🧠 ZONA 3: FICHA DE CONOCIMIENTO (INFORMACIÓN ESTRUCTURADA PARA LA IA) */}
                          <div className="rounded-2xl border border-indigo-200 bg-white p-5 space-y-4 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                              <div>
                                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                  <Sparkles className="w-4 h-4 text-indigo-600" />
                                  Zona 3: Ficha de Conocimiento (Información estructurada para la IA)
                                </h4>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  La síntesis técnica y comercial que la IA aprendió de tus documentos para asesorar y vender.
                                </p>
                              </div>

                              <button
                                onClick={handleSynthesizeProductSheet}
                                disabled={synthesizingProduct}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 shrink-0"
                              >
                                <Zap className={`w-3.5 h-3.5 ${synthesizingProduct ? 'animate-bounce text-amber-400' : ''}`} />
                                <span>{synthesizingProduct ? 'Sintetizando Ficha...' : '⚡ Sintetizar Ficha de Conocimiento'}</span>
                              </button>
                            </div>

                            {/* Status mientras sintetiza */}
                            {synthesizingProduct && (
                              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950 flex items-start gap-3 animate-pulse">
                                <RotateCw className="w-5 h-5 text-indigo-600 animate-spin shrink-0 mt-0.5" />
                                <div className="space-y-1 text-xs">
                                  <p className="font-bold text-indigo-900">🧠 Sintetizando Ficha de Conocimiento con IA...</p>
                                  <p className="text-indigo-700">
                                    Analizando documentos de estudio internos y destilando directrices técnicas, objeciones y disparadores de venta. Esto suele tomar de 10 a 25 segundos.
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Alertas locales de Zona 3 */}
                            {synthesisError && (
                              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                  <span>{synthesisError}</span>
                                </div>
                                <button onClick={() => setSynthesisError(null)} className="font-bold underline hover:text-rose-950">
                                  Descartar
                                </button>
                              </div>
                            )}
                            {synthesisSuccess && (
                              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 shadow-sm">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>{synthesisSuccess}</span>
                              </div>
                            )}

                            {selectedProduct?.knowledge_sheet ? (
                              <div className="space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5 w-fit">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    Ficha lista y memorizada por la IA
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={handleCopyKnowledgeSheet}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all shadow-sm active:scale-95"
                                    >
                                      {copiedSheet ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                      <span>{copiedSheet ? '¡Copiado!' : 'Copiar Ficha'}</span>
                                    </button>
                                    <button
                                      onClick={handleDownloadKnowledgeSheet}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-semibold transition-all shadow-sm active:scale-95"
                                    >
                                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                                      <span>Descargar Ficha (.md)</span>
                                    </button>
                                  </div>
                                </div>
                                <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs max-h-96 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text border border-slate-800">
                                  {selectedProduct.knowledge_sheet}
                                </div>
                              </div>
                            ) : (
                              !synthesizingProduct && (
                                <div className="py-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                  La Ficha de Conocimiento aún no ha sido destilada. Haz clic en el botón <strong>&quot;⚡ Sintetizar Ficha de Conocimiento&quot;</strong> para que la IA procese los datos de este producto.
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ══════════════ PESTAÑA: RED NEURONAL (GRAFO) ══════════════ */}
                {activeTab === 'grafo' && (
                  <div className="space-y-4">
                    <SecondBrainGraph
                      businessName={selectedAgent?.name ? `Catálogo: ${selectedAgent.name}` : 'Segundo Cerebro'}
                      agents={agents.map((a) => ({ id: a.id, name: a.name, role: a.role }))}
                      products={products.map((p) => ({
                        id: p.id,
                        name: p.name,
                        short_description: p.short_description,
                        study_files_count: p.study_files_count,
                        shareable_files_count: p.shareable_files_count,
                        has_knowledge_sheet: p.has_knowledge_sheet,
                      }))}
                      onSelectProduct={(pId) => {
                        const targetProd = products.find((p) => p.id === pId);
                        if (targetProd) {
                          handleOpenProduct(targetProd);
                          setActiveTab('productos');
                        }
                      }}
                    />
                  </div>
                )}

                {/* ══════════════ PESTAÑA: PERSONALIDAD Y TONO (IA-SOUL) ══════════════ */}
                {activeTab === 'soul' && (
                  <div className="space-y-6 max-w-2xl">
                    <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80 flex items-start gap-3">
                      <Heart className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-rose-950">El Alma del Agente (ia-soul)</h4>
                        <p className="text-xs text-rose-900/80 mt-0.5">
                          Define la calidez, modismos y reglas de trato humano. La IA consultará los datos fríos del catálogo pero responderá con esta personalidad.
                        </p>
                      </div>
                    </div>

                    {/* Presets Rápidos */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        1. Estilo de Personalidad Predeterminado (1 Clic)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSoulPreset('calido_humano');
                            setSoulWarmth(9);
                            setSoulFormality(3);
                            setSoulClosingStyle(5);
                            setSoulTechnicalLevel(4);
                          }}
                          className={`p-3 rounded-2xl border text-center transition-all ${
                            soulPreset === 'calido_humano' ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-500/20' : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="text-xl mb-1">🌟</div>
                          <div className="text-xs font-bold text-slate-900">Cálido y Humano</div>
                          <div className="text-[10px] text-slate-500">Clínicas y Confianza</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSoulPreset('vendedor_consultivo');
                            setSoulWarmth(7);
                            setSoulFormality(5);
                            setSoulClosingStyle(8);
                            setSoulTechnicalLevel(6);
                          }}
                          className={`p-3 rounded-2xl border text-center transition-all ${
                            soulPreset === 'vendedor_consultivo' ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20' : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="text-xl mb-1">🎯</div>
                          <div className="text-xs font-bold text-slate-900">Vendedor Consultivo</div>
                          <div className="text-[10px] text-slate-500">Chris Voss / Cierres</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSoulPreset('tecnico_experto');
                            setSoulWarmth(5);
                            setSoulFormality(8);
                            setSoulClosingStyle(6);
                            setSoulTechnicalLevel(9);
                          }}
                          className={`p-3 rounded-2xl border text-center transition-all ${
                            soulPreset === 'tecnico_experto' ? 'border-cyan-600 bg-cyan-50/50 ring-2 ring-cyan-600/20' : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="text-xl mb-1">🔬</div>
                          <div className="text-xs font-bold text-slate-900">Técnico Experto</div>
                          <div className="text-[10px] text-slate-500">Drones y Datos Duros</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSoulPreset('paciencia_soporte');
                            setSoulWarmth(9);
                            setSoulFormality(6);
                            setSoulClosingStyle(3);
                            setSoulTechnicalLevel(6);
                          }}
                          className={`p-3 rounded-2xl border text-center transition-all ${
                            soulPreset === 'paciencia_soporte' ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20' : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="text-xl mb-1">🛡️</div>
                          <div className="text-xs font-bold text-slate-900">Paciencia y Soporte</div>
                          <div className="text-[10px] text-slate-500">Escucha Activa</div>
                        </button>
                      </div>
                    </div>

                    {/* Sliders de Temperamento */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        2. Ajuste Fino de Temperamento
                      </label>

                      {/* Calidez */}
                      <div>
                        <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                          <span>Empatía y Calidez Humana</span>
                          <span className="text-rose-600 font-bold">{soulWarmth} / 10</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={soulWarmth}
                          onChange={(e) => setSoulWarmth(Number(e.target.value))}
                          className="w-full accent-rose-600 cursor-pointer"
                        />
                      </div>

                      {/* Formalidad */}
                      <div>
                        <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                          <span>Formalidad (Casual vs Clínico)</span>
                          <span className="text-indigo-600 font-bold">{soulFormality} / 10</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={soulFormality}
                          onChange={(e) => setSoulFormality(Number(e.target.value))}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>

                      {/* Estilo de Cierre */}
                      <div>
                        <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                          <span>Proactividad al Cierre (Micro-compromisos)</span>
                          <span className="text-amber-600 font-bold">{soulClosingStyle} / 10</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={soulClosingStyle}
                          onChange={(e) => setSoulClosingStyle(Number(e.target.value))}
                          className="w-full accent-amber-600 cursor-pointer"
                        />
                      </div>

                      {/* Nivel Técnico */}
                      <div>
                        <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                          <span>Nivel Técnico (Explicación Sencilla vs Datos de Ingeniería)</span>
                          <span className="text-cyan-600 font-bold">{soulTechnicalLevel} / 10</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={soulTechnicalLevel}
                          onChange={(e) => setSoulTechnicalLevel(Number(e.target.value))}
                          className="w-full accent-cyan-600 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Reglas de Oro Libres del Alma */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        3. Instrucciones Especiales del Alma (ia-soul)
                      </label>
                      <textarea
                        rows={4}
                        value={soulCustomRules}
                        onChange={(e) => setSoulCustomRules(e.target.value)}
                        placeholder="Ej. Habla como una asesora joven, educada y cálida. Si el cliente tiene dolor dental, muestra genuina preocupación antes de intentar agendar. Usa un emoji ocasional. Nunca digas que eres una IA."
                        className="w-full rounded-xl border border-slate-300 p-3.5 text-xs text-slate-800 outline-none focus:border-rose-500 leading-relaxed"
                      />
                    </div>

                    <button
                      onClick={handleSaveSettings}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 active:scale-95 disabled:opacity-50"
                    >
                      {actionLoading ? 'Guardando Alma...' : 'Guardar Personalidad del Agente'}
                    </button>
                  </div>
                )}

                {/* ══════════════ PESTAÑA: SEGUNDO CEREBRO GLOBAL ══════════════ */}
                {activeTab === 'cerebro' && (
                  <div className="space-y-4">
                    {brainDocs.length === 0 ? (
                      <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
                        <FileCode className="w-10 h-10 mx-auto text-slate-300" />
                        <h3 className="text-sm font-bold text-slate-700">El Segundo Cerebro Global no ha sido sintetizado</h3>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                          Genera los 7 pilares cognitivos maestros (identidad, negociación FBI, objeciones y catálogo).
                        </p>
                        <button
                          onClick={handleSynthesizeGlobalBrain}
                          disabled={synthesizingGlobal}
                          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-sm"
                        >
                          ⚡ Encender Fábrica Global
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-4 space-y-1.5">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Los 7 Pilares Cognitivos
                          </h4>
                          {brainDocs.map((doc) => {
                            const isCurrent = doc.file_slug === (selectedBrainSlug || brainDocs[0]?.file_slug);
                            return (
                              <button
                                key={doc.id}
                                onClick={() => setSelectedBrainSlug(doc.file_slug)}
                                className={`w-full text-left p-2.5 rounded-xl border text-xs font-medium transition-all flex items-center justify-between ${
                                  isCurrent
                                    ? 'bg-indigo-50 border-indigo-600 text-indigo-900 font-semibold shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <span className="truncate">{doc.title}</span>
                                <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? 'text-indigo-600' : 'text-slate-400'}`} />
                              </button>
                            );
                          })}
                        </div>

                        <div className="md:col-span-8 bg-slate-900 text-slate-100 rounded-2xl p-5 font-mono text-xs overflow-hidden flex flex-col h-[480px]">
                          <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
                            <span className="text-indigo-400 font-bold font-sans text-sm">
                              {currentBrainDoc?.title || 'Documento'}
                            </span>
                            <button
                              onClick={() => {
                                if (currentBrainDoc?.markdown_content) {
                                  navigator.clipboard.writeText(currentBrainDoc.markdown_content);
                                  alert('Copiado al portapapeles');
                                }
                              }}
                              className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white"
                              title="Copiar"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="overflow-y-auto mt-3 pr-2 text-slate-300 leading-relaxed whitespace-pre-wrap select-text">
                            {currentBrainDoc?.markdown_content}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ══════════════ PESTAÑA: GIMNASIO DE ROLE-PLAYING ══════════════ */}
                {activeTab === 'gimnasio' && (
                  <div className="space-y-6">
                    <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-amber-700" />
                          Gimnasio de Auto-Entrenamiento (Self-Play)
                        </h3>
                        <p className="text-xs text-amber-800/80 mt-0.5">
                          Un Comprador Escéptico pone a prueba a tu agente. Aprueba o ajusta en 1 clic.
                        </p>
                      </div>

                      <button
                        onClick={handleRunSimulation}
                        disabled={simulating}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm flex items-center gap-2 active:scale-95 shrink-0"
                      >
                        <Play className={`w-3.5 h-3.5 ${simulating ? 'animate-spin' : ''}`} />
                        <span>{simulating ? 'Simulando...' : 'Generar Nuevo Combate'}</span>
                      </button>
                    </div>

                    {simulations.length === 0 ? (
                      <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
                        <Sliders className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="text-xs text-slate-500 font-medium">No hay combates simulados aún.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {simulations.map((sim) => (
                          <div key={sim.id} className="rounded-2xl border p-5 bg-white border-slate-200 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                              <div>
                                <span className="text-xs font-bold text-slate-900">{sim.scenario_title}</span>
                                <p className="text-[11px] text-slate-400">{sim.buyer_persona}</p>
                              </div>
                              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                                {sim.status === 'approved' ? '✅ Aprobado' : '⏳ En Revisión'}
                              </span>
                            </div>

                            <div className="space-y-3 bg-slate-50 p-4 rounded-xl max-h-96 overflow-y-auto">
                              {sim.dialogue?.map((msg, i) => {
                                const isEditingThis = editingSimId === sim.id;
                                const isAgent = msg.sender === 'agent';

                                return (
                                  <div key={i} className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}>
                                    <span className="text-[10px] font-bold text-slate-400 mb-1">
                                      {isAgent ? `🤖 ${selectedAgent.name}` : '👤 Comprador Escéptico'}
                                    </span>
                                    
                                    {isEditingThis && isAgent ? (
                                      <div className="w-full bg-indigo-50/80 border border-indigo-200 rounded-2xl p-3 space-y-1.5 my-1 shadow-sm">
                                        <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900">
                                          <span className="flex items-center gap-1">
                                            <Pencil className="w-3 h-3 text-indigo-600" />
                                            Ajustar lo que dice {selectedAgent.name}:
                                          </span>
                                          <span className="text-[10px] text-indigo-600 font-normal">Edita el texto a tu gusto</span>
                                        </div>
                                        <textarea
                                          value={editingDialogue?.[i]?.text ?? msg.text}
                                          onChange={(e) => {
                                            if (!editingDialogue) return;
                                            const updated = [...editingDialogue];
                                            updated[i] = { ...updated[i], text: e.target.value };
                                            setEditingDialogue(updated);
                                          }}
                                          rows={3}
                                          className="w-full text-xs p-2.5 bg-white border border-indigo-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans leading-relaxed resize-y shadow-inner"
                                        />
                                      </div>
                                    ) : (
                                      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${isAgent ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-800'}`}>
                                        {msg.text}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Barra de Acciones del Combate */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                              <div>
                                {sim.status === 'approved' ? (
                                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-flex items-center gap-1">
                                    ⭐ Caso modelo memorizado en el Segundo Cerebro
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-500">
                                    Ajusta la respuesta para entrenar a tu agente o apruébalo directamente.
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-auto">
                                {editingSimId === sim.id ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={handleCancelEditSim}
                                      disabled={actionLoading}
                                      className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all"
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditedSim(sim.id)}
                                      disabled={actionLoading}
                                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-95"
                                    >
                                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                                      <span>Guardar Ajustes y Aprobar</span>
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditSim(sim)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-sm active:scale-95"
                                    >
                                      <Pencil className="w-3.5 h-3.5 text-indigo-600" />
                                      <span>{sim.status === 'approved' ? 'Modificar Respuesta' : 'Ajustar Respuesta'}</span>
                                    </button>
                                    {sim.status !== 'approved' && (
                                      <button
                                        type="button"
                                        onClick={() => handleReviewSimulation(sim.id, 'approved')}
                                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
                                      >
                                        <ThumbsUp className="w-3.5 h-3.5" />
                                        <span>Aprobar</span>
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ══════════════ PESTAÑA: AJUSTES ══════════════ */}
                {activeTab === 'ajustes' && (
                  <div className="space-y-6 max-w-xl">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Nombre del Agente
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Rol Comercial / Descripción
                        </label>
                        <input
                          type="text"
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Proveedor de Inteligencia Artificial
                        </label>
                        <div className="grid grid-cols-3 gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditProvider('google');
                              setEditModel('gemini-2.0-flash');
                            }}
                            className={`p-3 rounded-2xl border text-center transition-all ${
                              editProvider === 'google'
                                ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20'
                                : 'border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <div className="text-xl mb-1">✨</div>
                            <div className="text-xs font-bold text-slate-800">Google Gemini</div>
                            <div className="text-[10px] text-slate-500">2.0 Flash / 1.5 Pro</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditProvider('anthropic');
                              setEditModel('claude-3-5-sonnet-20241022');
                            }}
                            className={`p-3 rounded-2xl border text-center transition-all ${
                              editProvider === 'anthropic'
                                ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20'
                                : 'border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <div className="text-xl mb-1">⚡</div>
                            <div className="text-xs font-bold text-slate-800">Claude 3.5</div>
                            <div className="text-[10px] text-slate-500">Sonnet / Haiku</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditProvider('openai');
                              setEditModel('gpt-4o');
                            }}
                            className={`p-3 rounded-2xl border text-center transition-all ${
                              editProvider === 'openai'
                                ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20'
                                : 'border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <div className="text-xl mb-1">🤖</div>
                            <div className="text-xs font-bold text-slate-800">OpenAI</div>
                            <div className="text-[10px] text-slate-500">GPT-4o / Mini</div>
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Modelo ({editProvider.toUpperCase()})
                          </label>
                          <span className="text-[11px] text-indigo-600 font-semibold">Lista Oficial Vigente</span>
                        </div>
                        <select
                          value={editModel}
                          onChange={(e) => setEditModel(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-white"
                        >
                          {modelCatalog[editProvider]?.map((m) => (
                            <option key={m.id} value={m.id} disabled={m.status === 'deprecated'}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Key className="w-4 h-4 text-indigo-600 shrink-0" />
                          <div className="text-xs text-slate-700">
                            <p className="font-semibold">Credenciales y API Keys centralizadas</p>
                            <p className="text-slate-500 mt-0.5">Tus llaves de Gemini, Claude y OpenAI se administran en Configuración.</p>
                          </div>
                        </div>
                        <a
                          href="/admin/settings"
                          className="px-3 py-1.5 rounded-lg bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 font-bold text-xs shadow-sm transition-all shrink-0 ml-3"
                        >
                          Ir a Configuración →
                        </a>
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={handleSaveSettings}
                          disabled={actionLoading}
                          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all active:scale-95"
                        >
                          {actionLoading ? 'Guardando...' : 'Guardar Ajustes'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 space-y-3">
              <Bot className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-sm font-medium">Selecciona un agente a la izquierda para ver sus productos y taller.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: AGREGAR PRODUCTO O SERVICIO */}
      {createProductModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Agregar Producto o Servicio</h3>
                  <p className="text-xs text-slate-500">Crea una nueva cápsula en el catálogo del agente</p>
                </div>
              </div>
              <button
                onClick={() => setCreateProductModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  1. Nombre del Producto o Servicio
                </label>
                <input
                  type="text"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  placeholder="Ej. Invisalign, Dron Modelo X, PHIX, Implantes..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  2. ¿Para qué sirve? / Dolor que resuelve (1 renglón)
                </label>
                <input
                  type="text"
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  placeholder="Ej. Ortodoncia invisible sin brackets para alinear dientes en adultos"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  3. ¿Cuándo ofrecerlo? (Síntomas o palabras del cliente)
                </label>
                <input
                  type="text"
                  value={newProdTriggers}
                  onChange={(e) => setNewProdTriggers(e.target.value)}
                  placeholder="Ej. Dientes chuecos, estética dental, no quiere brackets metálicos"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  4. Rango de precio u oferta gancho
                </label>
                <input
                  type="text"
                  value={newProdPrice}
                  onChange={(e) => setNewProdPrice(e.target.value)}
                  placeholder="Ej. Desde $15,000 MXN o $1,500/mes con valoración inicial gratis"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-600"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateProductModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateProduct}
                  disabled={actionLoading || !newProdName.trim()}
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
                >
                  {actionLoading ? 'Creando...' : 'Crear Producto'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREAR AGENTE */}
      {createAgentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Crear Agente de IA</h3>
                  <p className="text-xs text-slate-500">Paso {createStep} de 2: Configuración Inicial</p>
                </div>
              </div>
              <button
                onClick={() => setCreateAgentModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {createStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    1. Misión del Agente
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setNewAgentMission('ventas_setter');
                        setNewAgentRole('Setter Comercial WhatsApp');
                      }}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        newAgentMission === 'ventas_setter' ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20' : 'border-slate-200'
                      }`}
                    >
                      <div className="text-2xl mb-1">🎯</div>
                      <div className="text-xs font-bold text-slate-800">Setter</div>
                      <div className="text-[10px] text-slate-500">Cualifica y agenda</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setNewAgentMission('ventas_closer');
                        setNewAgentRole('Closer de Alto Valor');
                      }}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        newAgentMission === 'ventas_closer' ? 'border-amber-600 bg-amber-50/50 ring-2 ring-amber-600/20' : 'border-slate-200'
                      }`}
                    >
                      <div className="text-2xl mb-1">💰</div>
                      <div className="text-xs font-bold text-slate-800">Closer</div>
                      <div className="text-[10px] text-slate-500">Cierra ventas</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setNewAgentMission('servicio_soporte');
                        setNewAgentRole('Soporte y Éxito al Cliente');
                      }}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        newAgentMission === 'servicio_soporte' ? 'border-teal-600 bg-teal-50/50 ring-2 ring-teal-600/20' : 'border-slate-200'
                      }`}
                    >
                      <div className="text-2xl mb-1">🛡️</div>
                      <div className="text-xs font-bold text-slate-800">Soporte</div>
                      <div className="text-[10px] text-slate-500">Resuelve dudas</div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    2. Nombre del Agente
                  </label>
                  <input
                    type="text"
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                    placeholder="Ej. Sofía | Asesora Comercial WhatsApp"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!newAgentName.trim()) return alert('Ingresa un nombre para el agente');
                      setCreateStep(2);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md active:scale-95"
                  >
                    <span>Siguiente: Proveedor & Modelo</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {createStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    1. Proveedor de Inteligencia Artificial
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setNewAgentProvider('google');
                        setNewAgentModel('gemini-2.0-flash');
                      }}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        newAgentProvider === 'google' ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20' : 'border-slate-200'
                      }`}
                    >
                      <div className="text-xl mb-1">✨</div>
                      <div className="text-xs font-bold text-slate-900">Gemini</div>
                      <div className="text-[10px] text-slate-500">Google AI</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setNewAgentProvider('anthropic');
                        setNewAgentModel('claude-3-5-sonnet-20241022');
                      }}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        newAgentProvider === 'anthropic' ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20' : 'border-slate-200'
                      }`}
                    >
                      <div className="text-xl mb-1">⚡</div>
                      <div className="text-xs font-bold text-slate-900">Claude 3.5</div>
                      <div className="text-[10px] text-slate-500">Anthropic</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setNewAgentProvider('openai');
                        setNewAgentModel('gpt-4o');
                      }}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        newAgentProvider === 'openai' ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20' : 'border-slate-200'
                      }`}
                    >
                      <div className="text-xl mb-1">🤖</div>
                      <div className="text-xs font-bold text-slate-900">OpenAI</div>
                      <div className="text-[10px] text-slate-500">GPT-4o</div>
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      2. Modelo ({newAgentProvider.toUpperCase()})
                    </label>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold">
                      Oficial Vigente
                    </span>
                  </div>
                  <select
                    value={newAgentModel}
                    onChange={(e) => setNewAgentModel(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-white"
                  >
                    {modelCatalog[newAgentProvider]?.map((m) => (
                      <option key={m.id} value={m.id} disabled={m.status === 'deprecated'}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Las API Keys se configuran centralizadas en <strong>Configuración</strong>.</span>
                  </div>
                  <a href="/admin/settings" target="_blank" className="text-xs text-indigo-600 font-bold underline shrink-0 ml-2">
                    Ver Configuración
                  </a>
                </div>

                <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCreateStep(1)}
                    className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-semibold p-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Atrás</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCreateAgent}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md active:scale-95"
                  >
                    {actionLoading ? 'Creando...' : 'Crear Agente y Ver Catálogo'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
