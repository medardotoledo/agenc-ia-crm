// ════════════════════════════════════════════════════════════════
// TIPOS TYPESCRIPT: Database Schema
// ════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────
// Account (Multi-tenant)
// ─────────────────────────────────────────────────────────────────

// NOTA: Una "Instancia" (etiqueta visible: Inmobiliaria) se almacena en
// la tabla `accounts`. Campos brand_* en NULL => hereda el tema de la Matriz.
export interface Account {
  id: string;
  user_id: string | null;
  name: string;
  subdomain: string;
  plan: string;
  logo_url?: string | null;
  timezone: string;
  ghl_location_id?: string | null;
  created_at: string;

  // White-label por instancia (NULL = hereda de la Matriz)
  brand_primary?: string | null;
  brand_primary_light?: string | null;
  brand_accent?: string | null;
  brand_sidebar?: string | null;
  brand_font?: string | null; // tipografía de marca (ej. 'Poppins')
  custom_domain?: string | null;
  display_label?: string | null;
  tagline?: string | null; // frase corta para el hero del sitio
}

export interface CreateAccountInput {
  agency_name: string;
  agency_tagline?: string;
}

export interface UpdateAccountInput {
  agency_name?: string;
  agency_tagline?: string;
  logo_id?: string;
  ai_provider?: 'openai' | 'claude';
  openai_api_key?: string;
  claude_api_key?: string;
  easybroker_api_key?: string;
  easybroker_sync_enabled?: boolean;
  ghl_form_id?: string;
  ghl_form_height?: number;
}

// ─────────────────────────────────────────────────────────────────
// Property
// ─────────────────────────────────────────────────────────────────

export type Operation = 'Venta' | 'Renta' | 'Desarrollo' | 'Remate';
export type PropertyType =
  | 'Casa'
  | 'Departamento'
  | 'Terreno'
  | 'Local Comercial'
  | 'Oficina'
  | 'Bodega'
  | 'Rancho'
  | 'Villa'
  | 'Penthouse'
  | 'Otro';

export type Condition =
  | 'Nuevo'
  | 'Excelente'
  | 'Bueno'
  | 'Regular'
  | 'A remodelar'
  | 'En construcción';

export type MexicanState =
  | 'Aguascalientes'
  | 'Baja California'
  | 'Baja California Sur'
  | 'Campeche'
  | 'Chiapas'
  | 'Chihuahua'
  | 'Ciudad de México'
  | 'Coahuila'
  | 'Colima'
  | 'Durango'
  | 'Estado de México'
  | 'Guanajuato'
  | 'Guerrero'
  | 'Hidalgo'
  | 'Jalisco'
  | 'Michoacán'
  | 'Morelos'
  | 'Nayarit'
  | 'Nuevo León'
  | 'Oaxaca'
  | 'Puebla'
  | 'Querétaro'
  | 'Quintana Roo'
  | 'San Luis Potosí'
  | 'Sinaloa'
  | 'Sonora'
  | 'Tabasco'
  | 'Tamaulipas'
  | 'Tlaxcala'
  | 'Veracruz'
  | 'Yucatán'
  | 'Zacatecas';

export type PoiType =
  | 'Aeropuerto'
  | 'Escuela'
  | 'Universidad'
  | 'Hospital'
  | 'Supermercado'
  | 'Mall'
  | 'Gimnasio'
  | 'Golf'
  | 'Parque'
  | 'Transporte'
  | 'Banco'
  | 'Restaurante'
  | 'Gasolinera'
  | 'Playa'
  | 'Estadio'
  | 'Iglesia'
  | 'Otro';

export interface NearbyPlace {
  type: PoiType;
  distance?: string; // ej: "500m"
  name?: string;
  emoji?: string;
}

export interface Property {
  id: string;
  account_id: string;
  title: string;
  slug: string;

  // Ficha técnica
  price: number;
  currency: 'MXN' | 'USD';
  operation: Operation;
  property_type: PropertyType;
  bedrooms?: number;
  bathrooms?: number;
  half_baths?: number;
  parking_spaces?: number;
  age_years?: number;
  construction_sqm?: number;
  lot_sqm?: number;
  levels?: number;
  condition?: Condition;

  // Ubicación
  street?: string;
  neighborhood?: string;
  city: string;
  state: MexicanState;
  postal_code?: string;
  location_notes?: string;

  // Contenido
  amenities?: string;
  description_short?: string;
  description_long?: string;
  description_zone?: string;

  // SEO
  meta_title?: string;
  meta_description?: string;

  // Media
  gallery_images: string[];
  video_url?: string;
  virtual_tour_url?: string;
  floor_plans: string[];

  // Puntos de interés
  nearby_places: NearbyPlace[];

  // Flags
  is_featured: boolean;
  is_published: boolean;

  // Agentes
  assigned_agents: string[];

  // EasyBroker
  easybroker_id?: string;
  easybroker_sync_status: 'pending' | 'synced' | 'error';
  easybroker_sync_log: Array<{ action: string; status: string; time: string }>;

  // Metadata
  created_at: string;
  updated_at: string;
  published_at?: string;
  created_by?: string;
}

export interface CreatePropertyInput {
  title: string;
  price: number;
  currency?: 'MXN' | 'USD';
  operation: Operation;
  property_type: PropertyType;
  city: string;
  state: MexicanState;
}

export interface UpdatePropertyInput {
  title?: string;
  price?: number;
  currency?: 'MXN' | 'USD';
  operation?: Operation;
  property_type?: PropertyType;
  bedrooms?: number;
  bathrooms?: number;
  half_baths?: number;
  parking_spaces?: number;
  age_years?: number;
  construction_sqm?: number;
  lot_sqm?: number;
  levels?: number;
  condition?: Condition;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: MexicanState;
  postal_code?: string;
  location_notes?: string;
  amenities?: string;
  description_short?: string;
  description_long?: string;
  description_zone?: string;
  meta_title?: string;
  meta_description?: string;
  gallery_images?: string[];
  video_url?: string;
  virtual_tour_url?: string;
  floor_plans?: string[];
  nearby_places?: NearbyPlace[];
  is_featured?: boolean;
  is_published?: boolean;
  assigned_agents?: string[];
}

// ─────────────────────────────────────────────────────────────────
// Agent
// ─────────────────────────────────────────────────────────────────

export interface Agent {
  id: string;
  account_id: string;
  name: string;
  slug: string;
  title?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  photo_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAgentInput {
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  photo_id?: string;
}

export interface UpdateAgentInput {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  photo_id?: string;
}

// ─────────────────────────────────────────────────────────────────
// Lead
// ─────────────────────────────────────────────────────────────────

export interface Lead {
  id: string;
  account_id: string;
  property_id: string;
  name: string;
  email?: string;
  phone?: string;
  message?: string;
  source: 'contact_form' | 'ghl_webhook' | 'api';
  ghl_id?: string;
  status: 'new' | 'contacted' | 'qualified' | 'lost';
  created_at: string;
  updated_at: string;
}

export interface CreateLeadInput {
  property_id: string;
  name: string;
  email?: string;
  phone?: string;
  message?: string;
  source?: 'contact_form' | 'ghl_webhook' | 'api';
  ghl_id?: string;
}

export interface UpdateLeadInput {
  status?: 'new' | 'contacted' | 'qualified' | 'lost';
}

// ─────────────────────────────────────────────────────────────────
// AI Generation Log
// ─────────────────────────────────────────────────────────────────

export type GenerationType =
  | 'desc_corta'
  | 'desc_larga'
  | 'desc_zona'
  | 'meta_title'
  | 'meta_desc';

export interface AIGenerationLog {
  id: string;
  account_id: string;
  property_id?: string;
  generation_type: GenerationType;
  ai_model: 'openai' | 'claude';
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost_cents?: number;
  generated_text?: string;
  status: 'success' | 'error';
  error_message?: string;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────
// EasyBroker Sync Log
// ─────────────────────────────────────────────────────────────────

export interface EasyBrokerSyncLog {
  id: string;
  account_id: string;
  property_id?: string;
  action: 'create' | 'update' | 'import';
  status: 'success' | 'error';
  easybroker_id?: string;
  request_body?: Record<string, any>;
  response_body?: Record<string, any>;
  error_message?: string;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────
// Image
// ─────────────────────────────────────────────────────────────────

export interface Image {
  id: string;
  account_id: string;
  property_id?: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  storage_path: string;
  width?: number;
  height?: number;
  thumbnail_path?: string;
  webp_path?: string;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────
// User & Auth
// ─────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
  };
}

export interface AuthSession {
  user: User;
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}
