'use client';

import { useState, useEffect } from 'react';
import {
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
  Settings as SettingsIcon,
  AlertTriangle,
  ArrowRight
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

export interface KnowledgeFile {
  id: string;
  agent_id: string;
  folder: 'material_estudio' | 'material_compartible';
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  ghl_media_url?: string;
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
  const [studyFiles, setStudyFiles] = useState<KnowledgeFile[]>([]);
  const [shareableFiles, setShareableFiles] = useState<KnowledgeFile[]>([]);
  const [brainDocs, setBrainDocs] = useState<BrainDoc[]>([]);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Catálogo de modelos disponibles dinámicos
  const [modelCatalog, setModelCatalog] = useState<Record<'google' | 'anthropic' | 'openai', ModelOption[]>>({
    google: [],
    anthropic: [],
    openai: [],
  });

  // Tabs del Taller
  const [activeTab, setActiveTab] = useState<'materiales' | 'cerebro' | 'gimnasio' | 'ajustes'>('materiales');
  const [selectedBrainSlug, setSelectedBrainSlug] = useState<string | null>(null);

  // Modal de Crear Agente
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createStep, setCreateStep] = useState<number>(1);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentMission, setNewAgentMission] = useState<'ventas_setter' | 'ventas_closer' | 'servicio_soporte'>('ventas_setter');
  const [newAgentRole, setNewAgentRole] = useState('Setter Comercial WhatsApp');
  const [newAgentProvider, setNewAgentProvider] = useState<'google' | 'anthropic' | 'openai'>('google');
  const [newAgentModel, setNewAgentModel] = useState('gemini-2.0-flash');
  const [newAgentApiKey, setNewAgentApiKey] = useState('');

  // Ajustes del agente seleccionado
  const [editProvider, setEditProvider] = useState<'google' | 'anthropic' | 'openai'>('google');
  const [editModel, setEditModel] = useState('');
  const [editApiKey, setEditApiKey] = useState('');
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');

  // Proceso de síntesis
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthesisStep, setSynthesisStep] = useState(0);

  // Gimnasio
  const [simulating, setSimulating] = useState(false);
  const [customScenario, setCustomScenario] = useState('');
  const [feedbackSimId, setFeedbackSimId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  // Cargar catálogo de modelos disponibles
  const fetchModels = async () => {
    try {
      const res = await fetch('/api/agents/models');
      const data = await res.json();
      if (data.catalog) {
        setModelCatalog(data.catalog);
      }
    } catch (err: any) {
      console.warn('No se pudo cargar el catálogo dinámico:', err.message);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  // Cargar lista de agentes
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

  // Cargar detalles del agente seleccionado
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
        setStudyFiles(data.studyFiles || []);
        setShareableFiles(data.shareableFiles || []);
        setBrainDocs(data.brainDocs || []);
        setSimulations(data.simulations || []);
        if (data.brainDocs && data.brainDocs.length > 0 && !selectedBrainSlug) {
          setSelectedBrainSlug(data.brainDocs[0].file_slug);
        }
      }
    } catch (err: any) {
      setError('Error al cargar detalles: ' + err.message);
    }
  };

  useEffect(() => {
    if (selectedAgentId) {
      fetchAgentDetails(selectedAgentId);
    }
  }, [selectedAgentId]);

  // Actualizar modelo predeterminado al cambiar de proveedor en creación
  useEffect(() => {
    if (newAgentProvider === 'google') {
      setNewAgentModel('gemini-2.0-flash');
    } else if (newAgentProvider === 'anthropic') {
      setNewAgentModel('claude-3-5-sonnet-20241022');
    } else {
      setNewAgentModel('gpt-4o');
    }
  }, [newAgentProvider]);

  // Subir archivo a conocimiento (Material de Estudio o Maletín)
  const handleUpload = async (folder: 'material_estudio' | 'material_compartible', files: FileList | null) => {
    if (!files || files.length === 0 || !selectedAgentId) return;
    setActionLoading(true);
    setError(null);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);

        const res = await fetch('/api/agents/' + selectedAgentId + '/knowledge', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Fallo al subir archivo');
        }
      }
      setSuccessMsg('Archivos agregados al agente correctamente.');
      await fetchAgentDetails(selectedAgentId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // Eliminar archivo
  const handleDeleteFile = async (fileId: string) => {
    if (!selectedAgentId || !confirm('¿Deseas eliminar este archivo?')) return;
    try {
      const res = await fetch('/api/agents/' + selectedAgentId + '/knowledge?fileId=' + fileId, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchAgentDetails(selectedAgentId);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Crear nuevo agente
  const handleCreateAgent = async () => {
    if (!newAgentName.trim()) {
      setError('Por favor indica un nombre para el agente.');
      return;
    }
    setActionLoading(true);
    setError(null);
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
          apiKey: newAgentApiKey.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear agente');

      setCreateModalOpen(false);
      setNewAgentName('');
      setNewAgentApiKey('');
      setCreateStep(1);
      await fetchAgents();
      if (data.agent?.id) {
        setSelectedAgentId(data.agent.id);
        setActiveTab('materiales');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Actualización rápida de modelo deprecado (1 clic)
  const handleQuickUpgradeModel = async (recommendedModel: string) => {
    if (!selectedAgentId) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/agents/' + selectedAgentId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          llmModel: recommendedModel,
        }),
      });
      if (res.ok) {
        setSuccessMsg('Modelo actualizado exitosamente a: ' + recommendedModel);
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

  // Guardar cambios en ajustes del agente
  const handleSaveSettings = async () => {
    if (!selectedAgentId) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/agents/' + selectedAgentId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          role: editRole.trim(),
          llmProvider: editProvider,
          llmModel: editModel,
          apiKey: editApiKey.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar ajustes');

      setEditApiKey('');
      setSuccessMsg('Ajustes del agente actualizados con éxito.');
      await fetchAgentDetails(selectedAgentId);
      await fetchAgents();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // Eliminar agente
  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('¿Seguro que deseas eliminar este agente y todo su Segundo Cerebro? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch('/api/agents/' + agentId, { method: 'DELETE' });
      if (res.ok) {
        setSelectedAgentId(null);
        setSelectedAgent(null);
        await fetchAgents();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Encender la Fábrica: Digestión y Síntesis del Segundo Cerebro
  const handleSynthesizeBrain = async () => {
    if (!selectedAgentId) return;
    setSynthesizing(true);
    setSynthesisStep(1);
    setError(null);

    const interval = setInterval(() => {
      setSynthesisStep((prev) => (prev < 6 ? prev + 1 : prev));
    }, 1400);

    try {
      const res = await fetch('/api/agents/' + selectedAgentId + '/factory/digest', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error durante la digestión');

      setSynthesisStep(7);
      setSuccessMsg('Segundo Cerebro sintetizado con éxito. 7 documentos estratégicos listos.');
      await fetchAgentDetails(selectedAgentId);
      setActiveTab('cerebro');
    } catch (err: any) {
      setError(err.message);
    } finally {
      clearInterval(interval);
      setSynthesizing(false);
      setTimeout(() => setSuccessMsg(null), 5000);
    }
  };

  // Gimnasio: Ejecutar Simulación con Comprador Escéptico
  const handleRunSimulation = async () => {
    if (!selectedAgentId) return;
    setSimulating(true);
    setError(null);
    try {
      const res = await fetch('/api/agents/' + selectedAgentId + '/factory/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: customScenario.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al ejecutar simulación');

      setCustomScenario('');
      setSuccessMsg('Nuevo combate de entrenamiento completado. Revisa la respuesta.');
      await fetchAgentDetails(selectedAgentId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSimulating(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // Gimnasio: Aprobar o Ajustar Simulación (1 Click)
  const handleReviewSimulation = async (simId: string, status: 'approved' | 'needs_adjustment', feedbackNotes?: string) => {
    if (!selectedAgentId) return;
    try {
      const res = await fetch('/api/agents/' + selectedAgentId + '/simulations/' + simId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, feedbackNotes }),
      });
      if (res.ok) {
        setFeedbackSimId(null);
        setFeedbackText('');
        await fetchAgentDetails(selectedAgentId);
        await fetchAgents();
      }
    } catch (err: any) {
      setError(err.message);
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
                  Segundo Cerebro v2.1
                </span>
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Setters y Closers con Google Gemini, Claude 3.5, GPT-4o, Psicología Avanzada y Maletín de WhatsApp.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all shadow-md shadow-indigo-600/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Nuevo Agente</span>
          </button>
        </div>
      </div>

      {/* Alertas globales */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs font-semibold hover:underline">
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

      {/* Contenido Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Lista de Agentes & Leaderboard */}
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
                  onClick={() => setCreateModalOpen(true)}
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
                            {ag.status === 'active'
                              ? '🟢 Activo'
                              : ag.status === 'training'
                              ? '⚙️ Entrenando'
                              : '🟡 Borrador'}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5 text-amber-500" />
                            {ag.llm_provider === 'google'
                              ? 'Gemini'
                              : ag.llm_provider === 'anthropic'
                              ? 'Claude'
                              : 'GPT-4o'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                        <span className="truncate max-w-[140px]" title={ag.llm_model}>
                          🤖 {ag.llm_model.replace('claude-3-5-', '').replace('20241022', '')}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAgent(ag.id);
                          }}
                          className="hover:text-rose-600 transition-colors p-1"
                          title="Eliminar agente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Banner Resumen del Cóctel Psicológico */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-4 text-white shadow-md">
            <div className="flex items-center gap-2 mb-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <Award className="w-4 h-4" />
              <span>Cóctel Psicológico Maestro</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Cada agente es sintetizado con:
              <br />
              • <strong>Donald Miller</strong> (StoryBrand: cliente héroe).
              <br />
              • <strong>Chris Voss</strong> (Espejeo y preguntas calibradas).
              <br />
              • <strong>Robert Cialdini</strong> (Autoridad y micro-compromisos).
              <br />
              • <strong>Alex Hormozi</strong> (Mecanismo único de valor).
              <br />
              • <strong>Fórmula Híbrida</strong> (Emoción + Mecanismo Técnico + WhatsApp).
            </p>
          </div>
        </div>

        {/* Columna Derecha: Taller del Agente Seleccionado */}
        <div className="lg:col-span-8">
          {selectedAgent ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
              {/* ALERTA PREVENTIVA DE MODELO DEPRECADO */}
              {selectedAgent.modelWarning?.isDeprecated && (
                <div className="bg-amber-500/15 border-b border-amber-300 px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-900">
                        Modelo en uso deprecado o superado ({selectedAgent.llm_model})
                      </h4>
                      <p className="text-xs text-amber-800/90 mt-0.5">
                        {selectedAgent.modelWarning.reason}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleQuickUpgradeModel(selectedAgent.modelWarning!.recommendedModel)}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 shrink-0"
                  >
                    <span>Actualizar a {selectedAgent.modelWarning.recommendedModel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Barra Superior del Agente */}
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-indigo-600/20">
                    {selectedAgent.mission_type === 'ventas_closer'
                      ? '💰'
                      : selectedAgent.mission_type === 'ventas_setter'
                      ? '🎯'
                      : '🛡️'}
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
                        {selectedAgent.llm_provider === 'google'
                          ? 'Google Gemini (' + selectedAgent.llm_model + ')'
                          : selectedAgent.llm_provider === 'anthropic'
                          ? 'Anthropic Claude (' + selectedAgent.llm_model + ')'
                          : 'OpenAI (' + selectedAgent.llm_model + ')'}
                      </span>
                      <span>•</span>
                      <span>{selectedAgent.hasApiKey ? '🔑 Llave Propia (BYOK)' : '☁️ Llave Plataforma'}</span>
                    </p>
                  </div>
                </div>

                {/* Botón Encender la Fábrica */}
                <button
                  onClick={handleSynthesizeBrain}
                  disabled={synthesizing || (studyFiles.length === 0 && shareableFiles.length === 0)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                    synthesizing
                      ? 'bg-amber-100 text-amber-900 cursor-wait'
                      : studyFiles.length === 0 && shareableFiles.length === 0
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 active:scale-95'
                  }`}
                  title={
                    studyFiles.length === 0 && shareableFiles.length === 0
                      ? 'Sube al menos 1 archivo para encender la fábrica'
                      : 'Sintetizar el Segundo Cerebro del Agente'
                  }
                >
                  <Zap className={`w-4 h-4 ${synthesizing ? 'animate-bounce text-amber-600' : ''}`} />
                  <span>{synthesizing ? 'Sintetizando Cerebro...' : '⚡ Encender Fábrica'}</span>
                </button>
              </div>

              {/* Animación de síntesis en progreso */}
              {synthesizing && (
                <div className="p-4 bg-indigo-50 border-b border-indigo-100">
                  <div className="flex items-center justify-between text-xs font-semibold text-indigo-900 mb-2">
                    <span className="flex items-center gap-2">
                      <RotateCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      Digestión Cognitiva en Proceso: Paso {synthesisStep} de 7
                    </span>
                    <span>{Math.round((synthesisStep / 7) * 100)}%</span>
                  </div>
                  <div className="w-full h-2 bg-indigo-200/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-500 rounded-full"
                      style={{ width: `${(synthesisStep / 7) * 100}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-indigo-700 mt-2 italic">
                    {synthesisStep === 1 && '1/7: Definiendo Identidad, Tono y Misión con StoryBrand...'}
                    {synthesisStep === 2 && '2/7: Extrayendo Oferta Irresistible ($100M Hormozi)...'}
                    {synthesisStep === 3 && '3/7: Codificando Negociación FBI (Chris Voss) y Cialdini...'}
                    {synthesisStep === 4 && '4/7: Catalogando Mecanismos Técnicos y Hard Proof...'}
                    {synthesisStep === 5 && '5/7: Estructurando Matriz de Objeciones Calibradas...'}
                    {synthesisStep === 6 && '6/7: Indexando Maletín de Archivos Compartibles para WhatsApp...'}
                    {synthesisStep >= 7 && '7/7: Sellando Reglas de Oro, Ética y Límites de la IA...'}
                  </p>
                </div>
              )}

              {/* Pestañas de Navegación del Taller */}
              <div className="flex border-b border-slate-200 px-6 gap-6 text-sm font-medium">
                <button
                  onClick={() => setActiveTab('materiales')}
                  className={`py-3.5 border-b-2 transition-all flex items-center gap-2 ${
                    activeTab === 'materiales'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <FolderHeart className="w-4 h-4" />
                  <span>Las Dos Carpetas</span>
                  <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
                    {studyFiles.length + shareableFiles.length}
                  </span>
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
                  <span>Segundo Cerebro (.md)</span>
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
                  <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-700 font-semibold">
                    {simulations.length}
                  </span>
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
                  <span>Ajustes & Modelo LLM</span>
                </button>
              </div>

              {/* Contenido de la Pestaña Activa */}
              <div className="p-6">
                {/* PESTAÑA 1: LAS DOS CARPETAS */}
                {activeTab === 'materiales' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Carpeta A: 01-material-de-estudio */}
                      <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-5 flex flex-col justify-between hover:border-slate-400 transition-colors">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                                <FolderLock className="w-4 h-4" />
                              </div>
                              <h3 className="text-sm font-bold text-slate-900">01 - Material de Estudio</h3>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-amber-700" />
                              100% Confidencial
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 leading-relaxed">
                            Manuales técnicos, PDFs de ingeniería, precios confidenciales y transcripciones.
                            <strong className="text-slate-700 font-semibold"> La IA solo estudia esto; NUNCA se envía a clientes.</strong>
                          </p>

                          {/* Lista de archivos */}
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {studyFiles.length === 0 ? (
                              <div className="py-6 text-center text-slate-400 text-xs italic">
                                Sin archivos de estudio aún.
                              </div>
                            ) : (
                              studyFiles.map((f) => (
                                <div
                                  key={f.id}
                                  className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0 pr-2">
                                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="truncate font-medium text-slate-700">{f.file_name}</span>
                                    <span className="text-[10px] text-slate-400">
                                      ({(f.file_size / 1024).toFixed(0)} KB)
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteFile(f.id)}
                                    className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                                    title="Eliminar archivo"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-200">
                          <label className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-white border border-slate-300 hover:bg-slate-100/80 text-slate-700 text-xs font-semibold cursor-pointer transition-all shadow-sm">
                            <UploadCloud className="w-4 h-4 text-slate-500" />
                            <span>Subir Archivos Confidenciales</span>
                            <input
                              type="file"
                              multiple
                              className="hidden"
                              onChange={(e) => handleUpload('material_estudio', e.target.files)}
                              disabled={actionLoading}
                            />
                          </label>
                        </div>
                      </div>

                      {/* Carpeta B: 02-material-compartible (El Maletín) */}
                      <div className="rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/20 p-5 flex flex-col justify-between hover:border-indigo-300 transition-colors">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                                <FolderHeart className="w-4 h-4" />
                              </div>
                              <h3 className="text-sm font-bold text-slate-900">02 - Material Compartible</h3>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center gap-1">
                              📱 El Maletín de WhatsApp
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 leading-relaxed">
                            Videos de 45s, fotos de proyectos, brochures ejecutivos y fichas comerciales.
                            <strong className="text-slate-700 font-semibold"> La IA los enviará por WhatsApp cuando el prospecto lo amerite.</strong>
                          </p>

                          {/* Lista de archivos compartibles */}
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {shareableFiles.length === 0 ? (
                              <div className="py-6 text-center text-slate-400 text-xs italic">
                                Maletín vacío. Sube videos o folletos.
                              </div>
                            ) : (
                              shareableFiles.map((f) => (
                                <div
                                  key={f.id}
                                  className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0 pr-2">
                                    <span className="text-sm">
                                      {f.file_type.includes('image')
                                        ? '🖼️'
                                        : f.file_type.includes('video')
                                        ? '🎥'
                                        : '📄'}
                                    </span>
                                    <span className="truncate font-medium text-slate-700">{f.file_name}</span>
                                    {f.ghl_media_url && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                                        CDN Listo
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {f.file_url && (
                                      <a
                                        href={f.file_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-slate-400 hover:text-indigo-600 p-1"
                                        title="Ver archivo"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    )}
                                    <button
                                      onClick={() => handleDeleteFile(f.id)}
                                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                                      title="Eliminar archivo"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-indigo-100">
                          <label className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer transition-all shadow-sm">
                            <UploadCloud className="w-4 h-4 text-white" />
                            <span>Subir al Maletín (Videos / Fotos / PDF)</span>
                            <input
                              type="file"
                              multiple
                              className="hidden"
                              onChange={(e) => handleUpload('material_compartible', e.target.files)}
                              disabled={actionLoading}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* PESTAÑA 2: SEGUNDO CEREBRO (.MD) */}
                {activeTab === 'cerebro' && (
                  <div className="space-y-4">
                    {brainDocs.length === 0 ? (
                      <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
                        <FileCode className="w-10 h-10 mx-auto text-slate-300" />
                        <h3 className="text-sm font-bold text-slate-700">El Segundo Cerebro aún no ha sido sintetizado</h3>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                          Sube tu material de estudio y el maletín de WhatsApp, luego presiona el botón{' '}
                          <strong>&quot;Encender Fábrica&quot;</strong> para generar los 7 archivos Markdown.
                        </p>
                        <button
                          onClick={handleSynthesizeBrain}
                          disabled={synthesizing}
                          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-sm"
                        >
                          ⚡ Encender Fábrica Ahora
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
                                <ChevronRight
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    isCurrent ? 'text-indigo-600' : 'text-slate-400'
                                  }`}
                                />
                              </button>
                            );
                          })}
                        </div>

                        <div className="md:col-span-8 bg-slate-900 text-slate-100 rounded-2xl p-5 font-mono text-xs overflow-hidden flex flex-col h-[480px]">
                          <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
                            <span className="text-indigo-400 font-bold font-sans text-sm">
                              {currentBrainDoc?.title || 'Documento'}
                            </span>
                            <div className="flex items-center gap-2 font-sans">
                              <span className="text-[10px] text-slate-500">
                                v{currentBrainDoc?.version || 1} • Markdown
                              </span>
                              <button
                                onClick={() => {
                                  if (currentBrainDoc?.markdown_content) {
                                    navigator.clipboard.writeText(currentBrainDoc.markdown_content);
                                    alert('Markdown copiado al portapapeles');
                                  }
                                }}
                                className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                                title="Copiar Markdown"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="overflow-y-auto mt-3 pr-2 text-slate-300 leading-relaxed whitespace-pre-wrap select-text">
                            {currentBrainDoc?.markdown_content}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* PESTAÑA 3: GIMNASIO DE ROLE-PLAYING */}
                {activeTab === 'gimnasio' && (
                  <div className="space-y-6">
                    <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-amber-700" />
                          Gimnasio de Auto-Entrenamiento (Self-Play)
                        </h3>
                        <p className="text-xs text-amber-800/80 mt-0.5">
                          Un Comprador Escéptico pone a prueba a tu agente con {selectedAgent.llm_model}. Aprueba o ajusta en 1 clic.
                        </p>
                      </div>

                      <button
                        onClick={handleRunSimulation}
                        disabled={simulating}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-all shadow-sm flex items-center gap-2 active:scale-95 shrink-0"
                      >
                        <Play className={`w-3.5 h-3.5 ${simulating ? 'animate-spin' : ''}`} />
                        <span>{simulating ? 'Simulando Combate...' : 'Generar Nuevo Combate'}</span>
                      </button>
                    </div>

                    {simulations.length === 0 ? (
                      <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
                        <Sliders className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="text-xs text-slate-500 font-medium">No hay combates de simulación aún.</p>
                        <button
                          onClick={handleRunSimulation}
                          className="text-xs text-amber-700 font-semibold hover:underline"
                        >
                          Haz clic para iniciar tu primera prueba de fuego
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {simulations.map((sim) => {
                          const isApproved = sim.status === 'approved';
                          const isNeedsAdjustment = sim.status === 'needs_adjustment';

                          return (
                            <div
                              key={sim.id}
                              className={`rounded-2xl border p-5 transition-all space-y-4 ${
                                isApproved
                                  ? 'bg-emerald-50/20 border-emerald-200'
                                  : isNeedsAdjustment
                                  ? 'bg-rose-50/20 border-rose-200'
                                  : 'bg-white border-slate-200 shadow-sm'
                              }`}
                            >
                              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-900">{sim.scenario_title}</span>
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                      {sim.buyer_persona}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 mt-0.5">
                                    {new Date(sim.created_at).toLocaleString()}
                                  </p>
                                </div>

                                <div>
                                  <span
                                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                                      isApproved
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                        : isNeedsAdjustment
                                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                                    }`}
                                  >
                                    {isApproved
                                      ? '✅ Aprobado'
                                      : isNeedsAdjustment
                                      ? '⚠️ Ajustado'
                                      : '⏳ Pendiente de Aprobación'}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-3 bg-slate-50/80 rounded-xl p-4 max-h-80 overflow-y-auto">
                                {sim.dialogue?.map((msg, idx) => {
                                  const isAgent = msg.sender === 'agent';
                                  return (
                                    <div
                                      key={idx}
                                      className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}
                                    >
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <span className="text-[10px] font-bold text-slate-400">
                                          {isAgent ? `🤖 ${selectedAgent.name} (Agente)` : '👤 Comprador Escéptico'}
                                        </span>
                                      </div>
                                      <div
                                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                                          isAgent
                                            ? 'bg-indigo-600 text-white rounded-tr-sm shadow-sm'
                                            : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-sm shadow-sm'
                                        }`}
                                      >
                                        <p>{msg.text}</p>
                                        {msg.attachment && (
                                          <div className="mt-2 pt-2 border-t border-indigo-400/40 text-[11px] flex items-center gap-1.5 font-semibold">
                                            <span>📎 Adjunto del Maletín:</span>
                                            <span className="underline">{msg.attachment}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                                <div className="text-xs text-slate-600">
                                  {sim.evaluation?.summary && (
                                    <p className="italic text-slate-500">
                                      💡 Calificación IA: {sim.evaluation.summary}
                                    </p>
                                  )}
                                  {sim.feedback_notes && (
                                    <p className="text-amber-800 font-medium mt-1">
                                      ✏️ Notas de Ajuste: {sim.feedback_notes}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {!isApproved && (
                                    <>
                                      <button
                                        onClick={() => handleReviewSimulation(sim.id, 'approved')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
                                      >
                                        <ThumbsUp className="w-3.5 h-3.5" />
                                        <span>Aprobar</span>
                                      </button>

                                      <button
                                        onClick={() => {
                                          setFeedbackSimId(sim.id);
                                          setFeedbackText(sim.feedback_notes || '');
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all active:scale-95"
                                      >
                                        <Sliders className="w-3.5 h-3.5" />
                                        <span>Ajustar</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {feedbackSimId === sim.id && (
                                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2 mt-2">
                                  <label className="text-xs font-bold text-amber-900 block">
                                    Instrucción o ajuste para el agente:
                                  </label>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={feedbackText}
                                      onChange={(e) => setFeedbackText(e.target.value)}
                                      placeholder="Escribe el ajuste..."
                                      className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-amber-500"
                                    />
                                    <button
                                      onClick={() => handleReviewSimulation(sim.id, 'needs_adjustment', feedbackText)}
                                      className="px-3 py-1.5 rounded-lg bg-amber-700 text-white text-xs font-semibold hover:bg-amber-800 transition-colors"
                                    >
                                      Guardar Ajuste
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* PESTAÑA 4: AJUSTES & MODELO LLM */}
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
                            Modelo Específico ({editProvider.toUpperCase()})
                          </label>
                          <span className="text-[11px] text-indigo-600 font-semibold">
                            Lista Oficial Vigente
                          </span>
                        </div>
                        <select
                          value={editModel}
                          onChange={(e) => setEditModel(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-white"
                        >
                          {modelCatalog[editProvider]?.map((m) => (
                            <option
                              key={m.id}
                              value={m.id}
                              disabled={m.status === 'deprecated'}
                            >
                              {m.name} {m.status === 'deprecated' ? '⛔ (DESCONTINUADO)' : ''}
                            </option>
                          ))}
                        </select>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {modelCatalog[editProvider]?.find((m) => m.id === editModel)?.description}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Key className="w-3.5 h-3.5 text-indigo-600" />
                            Actualizar API Key (BYOK)
                          </label>
                          <span className="text-[10px] text-slate-400">
                            {selectedAgent.hasApiKey ? '🔒 Llave configurada' : 'Sin llave (usa plataforma)'}
                          </span>
                        </div>
                        <input
                          type="password"
                          value={editApiKey}
                          onChange={(e) => setEditApiKey(e.target.value)}
                          placeholder="Ingresa nueva llave o déjala en blanco para mantener la actual"
                          className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={handleSaveSettings}
                          disabled={actionLoading}
                          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all active:scale-95"
                        >
                          {actionLoading ? 'Guardando...' : 'Guardar Ajustes del Agente'}
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
              <p className="text-sm font-medium">Selecciona un agente a la izquierda para entrar a su taller.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL CREAR NUEVO AGENTE */}
      {createModalOpen && (
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
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {/* Paso 1 */}
            {createStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    1. Selecciona la Misión del Agente
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setNewAgentMission('ventas_setter');
                        setNewAgentRole('Setter Comercial WhatsApp');
                      }}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        newAgentMission === 'ventas_setter'
                          ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20'
                          : 'border-slate-200 hover:bg-slate-50'
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
                        newAgentMission === 'ventas_closer'
                          ? 'border-amber-600 bg-amber-50/50 ring-2 ring-amber-600/20'
                          : 'border-slate-200 hover:bg-slate-50'
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
                        newAgentMission === 'servicio_soporte'
                          ? 'border-teal-600 bg-teal-50/50 ring-2 ring-teal-600/20'
                          : 'border-slate-200 hover:bg-slate-50'
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
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    3. Rol visible
                  </label>
                  <input
                    type="text"
                    value={newAgentRole}
                    onChange={(e) => setNewAgentRole(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!newAgentName.trim()) {
                        alert('Ingresa un nombre para el agente');
                        return;
                      }
                      setCreateStep(2);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all active:scale-95"
                  >
                    <span>Siguiente: Proveedor & Modelo</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Paso 2 */}
            {createStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    1. Proveedor de Inteligencia Artificial
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setNewAgentProvider('google')}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        newAgentProvider === 'google'
                          ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xl mb-1">✨</div>
                      <div className="text-xs font-bold text-slate-900">Gemini</div>
                      <div className="text-[10px] text-slate-500">Google AI</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewAgentProvider('anthropic')}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        newAgentProvider === 'anthropic'
                          ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xl mb-1">⚡</div>
                      <div className="text-xs font-bold text-slate-900">Claude 3.5</div>
                      <div className="text-[10px] text-slate-500">Anthropic</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewAgentProvider('openai')}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        newAgentProvider === 'openai'
                          ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xl mb-1">🤖</div>
                      <div className="text-xs font-bold text-slate-900">OpenAI</div>
                      <div className="text-[10px] text-slate-500">GPT-4o</div>
                    </button>
                  </div>
                </div>

                {/* Selector Desplegable Dinámico de Modelos */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      2. Modelo Disponible ({newAgentProvider.toUpperCase()})
                    </label>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold">
                      Vigente
                    </span>
                  </div>
                  <select
                    value={newAgentModel}
                    onChange={(e) => setNewAgentModel(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-white"
                  >
                    {modelCatalog[newAgentProvider]?.map((m) => (
                      <option
                        key={m.id}
                        value={m.id}
                        disabled={m.status === 'deprecated'}
                      >
                        {m.name} {m.status === 'deprecated' ? '⛔ (DESCONTINUADO)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {modelCatalog[newAgentProvider]?.find((m) => m.id === newAgentModel)?.description}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-indigo-600" />
                      3. Tu API Key Personal (Opcional - BYOK)
                    </label>
                    <span className="text-[10px] text-slate-400">Bring Your Own Key</span>
                  </div>
                  <input
                    type="password"
                    value={newAgentApiKey}
                    onChange={(e) => setNewAgentApiKey(e.target.value)}
                    placeholder={
                      newAgentProvider === 'google'
                        ? 'AIzaSy... (Opcional, si la dejas vacía usa la plataforma)'
                        : newAgentProvider === 'anthropic'
                        ? 'sk-ant-api03-... (Opcional)'
                        : 'sk-proj-... (Opcional)'
                    }
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    🔒 Tu llave se almacena cifrada en base de datos.
                  </p>
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
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all active:scale-95"
                  >
                    {actionLoading ? 'Creando...' : 'Crear y Entrar al Taller'}
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
