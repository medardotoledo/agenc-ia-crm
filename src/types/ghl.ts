/**
 * Types and interfaces for GoHighLevel (GHL) API v2.
 */

export interface GHLContact {
  id?: string;
  locationId: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  source?: string;
  tags?: string[];
  customFields?: Array<{
    id: string;
    fieldValue: any;
  }>;
  dateAdded?: string;
  dateUpdated?: string;
}

export interface GHLContactResponse {
  contact: GHLContact;
}

export interface GHLOpportunity {
  id?: string;
  name: string;
  pipelineId: string;
  stageId: string;
  status: 'open' | 'won' | 'lost' | 'abandoned';
  contactId: string;
  monetaryValue?: number;
  assignedTo?: string;
  title?: string; // GHL uses 'name' for opportunity title
}

export interface GHLNote {
  id?: string;
  body: string;
  contactId: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GHLTask {
  id?: string;
  title: string;
  body?: string;
  contactId: string;
  dueDate?: string;
  completed?: boolean;
  assignedTo?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GHLStage {
  id: string;
  name: string;
  position: number;
}

export interface GHLPipeline {
  id: string;
  name: string;
  stages: GHLStage[];
}

export interface GHLWebhookEvent {
  id: string;
  eventId: string;
  eventDate: string;
  type: string; // 'ContactCreate', 'ContactUpdate', 'OpportunityCreate', 'OpportunityUpdate', etc.
  locationId: string;
  companyId: string;
  // payload will vary depending on the type of event
  [key: string]: any;
}
