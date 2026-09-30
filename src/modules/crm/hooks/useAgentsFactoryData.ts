import { useState, useEffect } from 'react';
import { AgentData, ProductData, KnowledgeFile, BrainDoc, Simulation, ModelOption } from '../views/AgentsFactoryView';

export function useAgentsFactoryData() {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null);
  
  // Productos del Agente
  const [products, setProducts] = useState<ProductData[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
  const [productStudyFiles, setProductStudyFiles] = useState<KnowledgeFile[]>([]);
  const [productShareableFiles, setProductShareableFiles] = useState<KnowledgeFile[]>([]);

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

  const [selectedBrainSlug, setSelectedBrainSlug] = useState<string | null>(null);

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

  // Estados de Offer Interview que se actualizan desde fetchProductDetail
  const [marketIntelReady, setMarketIntelReady] = useState(false);
  const [interviewQuestions, setInterviewQuestions] = useState<Array<{ id: number; title: string; contextual_prompt: string; category: string }>>([]);
  const [offerSuccessData, setOfferSuccessData] = useState<any | null>(null);
  const [interviewTextAnswer, setInterviewTextAnswer] = useState('');

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
        if (data.agent.ia_soul) {
          const soul = data.agent.ia_soul;
          if (soul.preset) setSoulPreset(soul.preset);
          if (typeof soul.warmth === 'number') setSoulWarmth(soul.warmth);
          if (typeof soul.formality === 'number') setSoulFormality(soul.formality);
          if (typeof soul.closing_style === 'number') setSoulClosingStyle(soul.closing_style);
          if (typeof soul.technical_level === 'number') setSoulTechnicalLevel(soul.technical_level);
          if (soul.custom_rules) setSoulCustomRules(soul.custom_rules);
        }
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

        // Cargar estado de Oferta e Inteligencia de Mercado
        fetch('/api/agents/' + agentId + '/products/' + prodId + '/offer-interview')
          .then((r) => r.json())
          .then((offerData) => {
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
          })
          .catch((e) => console.warn('Offer interview fetch error:', e.message));
      }
    } catch (err: any) {
      setError('Error al abrir producto: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return {
    agents, setAgents,
    selectedAgentId, setSelectedAgentId,
    selectedAgent, setSelectedAgent,
    products, setProducts,
    selectedProductId, setSelectedProductId,
    selectedProduct, setSelectedProduct,
    productStudyFiles, setProductStudyFiles,
    productShareableFiles, setProductShareableFiles,
    brainDocs, setBrainDocs,
    simulations, setSimulations,
    loading, setLoading,
    actionLoading, setActionLoading,
    error, setError,
    successMsg, setSuccessMsg,
    modelCatalog, setModelCatalog,
    selectedBrainSlug, setSelectedBrainSlug,
    soulPreset, setSoulPreset,
    soulWarmth, setSoulWarmth,
    soulFormality, setSoulFormality,
    soulClosingStyle, setSoulClosingStyle,
    soulTechnicalLevel, setSoulTechnicalLevel,
    soulCustomRules, setSoulCustomRules,
    editProvider, setEditProvider,
    editModel, setEditModel,
    editName, setEditName,
    editRole, setEditRole,
    marketIntelReady, setMarketIntelReady,
    interviewQuestions, setInterviewQuestions,
    offerSuccessData, setOfferSuccessData,
    interviewTextAnswer, setInterviewTextAnswer,
    fetchAgents,
    fetchAgentDetails,
    fetchProducts,
    fetchProductDetail
  };
}
