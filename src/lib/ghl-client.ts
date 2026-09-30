/**
 * ════════════════════════════════════════════════════════════════
 * GOHIGHLEVEL (GHL) API CLIENT
 * ════════════════════════════════════════════════════════════════
 * Cliente para interactuar con la API v2 de GoHighLevel.
 * Soporta control de límites de peticiones (429) y reintentos.
 * ════════════════════════════════════════════════════════════════
 */

import { GHLContact, GHLOpportunity, GHLNote, GHLTask, GHLPipeline } from '../types/ghl';

export class GHLClient {
  private token: string;
  private baseURL = 'https://services.leadconnectorhq.com';

  constructor(token: string) {
    if (!token) {
      throw new Error('GHL Integration Token is required.');
    }
    this.token = token;
  }

  /* ------------------- CONTACTS ------------------- */

  async getContact(contactId: string): Promise<GHLContact> {
    const res = await this.request(`/contacts/${contactId}`);
    return res.contact;
  }

  async createContact(contact: Partial<GHLContact>): Promise<GHLContact> {
    const res = await this.request('/contacts/', {
      method: 'POST',
      body: contact,
    });
    return res.contact;
  }

  async updateContact(contactId: string, contact: Partial<GHLContact>): Promise<GHLContact> {
    const res = await this.request(`/contacts/${contactId}`, {
      method: 'PUT',
      body: contact,
    });
    return res.contact;
  }

  async deleteContact(contactId: string): Promise<void> {
    await this.request(`/contacts/${contactId}`, {
      method: 'DELETE',
    });
  }

  /* ------------------- OPPORTUNITIES ------------------- */

  async createOpportunity(opportunity: Partial<GHLOpportunity>): Promise<GHLOpportunity> {
    const res = await this.request('/opportunities/', {
      method: 'POST',
      body: opportunity,
    });
    return res.opportunity;
  }

  async updateOpportunity(opportunityId: string, opportunity: Partial<GHLOpportunity>): Promise<GHLOpportunity> {
    const res = await this.request(`/opportunities/${opportunityId}`, {
      method: 'PUT',
      body: opportunity,
    });
    return res.opportunity;
  }

  async deleteOpportunity(opportunityId: string): Promise<void> {
    await this.request(`/opportunities/${opportunityId}`, {
      method: 'DELETE',
    });
  }

  /* ------------------- NOTES ------------------- */

  async createNote(contactId: string, body: string, userId?: string): Promise<GHLNote> {
    const res = await this.request(`/contacts/${contactId}/notes`, {
      method: 'POST',
      body: { body, userId },
    });
    return res.note;
  }

  /* ------------------- TASKS ------------------- */

  async createTask(contactId: string, title: string, body?: string, dueDate?: string, completed?: boolean): Promise<GHLTask> {
    const res = await this.request(`/contacts/${contactId}/tasks`, {
      method: 'POST',
      body: { title, body, dueDate, completed },
    });
    return res.task;
  }

  async updateTask(contactId: string, taskId: string, task: Partial<GHLTask>): Promise<GHLTask> {
    const res = await this.request(`/contacts/${contactId}/tasks/${taskId}`, {
      method: 'PUT',
      body: task,
    });
    return res.task;
  }

  /* ------------------- PIPELINES & STAGES ------------------- */

  async getPipelines(locationId: string): Promise<{ pipelines: GHLPipeline[] }> {
    return this.request(`/opportunities/pipelines?locationId=${locationId}`);
  }

  /* ------------------- CALENDARS & APPOINTMENTS ------------------- */

  async getCalendars(locationId: string): Promise<{ calendars: any[] }> {
    return this.request(`/calendars/?locationId=${locationId}`);
  }

  async createAppointment(appointment: {
    calendarId: string;
    selectedTimezone?: string;
    startTime: string;
    endTime?: string;
    title?: string;
    contactId: string;
    appointmentStatus?: 'booked' | 'confirmed' | 'showed' | 'noshow' | 'cancelled';
  }): Promise<any> {
    return this.request('/calendars/events/appointments', {
      method: 'POST',
      body: appointment,
    });
  }

  /* ------------------- CONVERSATIONS & EMAILS ------------------- */

  async sendMessage(messageData: {
    type: 'Email' | 'SMS' | 'WhatsApp' | 'Custom';
    contactId: string;
    emailTo?: string;
    emailFrom?: string;
    emailCc?: string[];
    emailBcc?: string[];
    subject?: string;
    html?: string;
    message?: string;
    attachments?: string[];
  }): Promise<any> {
    return this.request('/conversations/messages', {
      method: 'POST',
      body: messageData,
    });
  }

  async sendEmail(emailData: {
    contactId: string;
    emailTo: string;
    emailFrom?: string;
    emailCc?: string[];
    subject: string;
    html: string;
    message?: string;
  }): Promise<any> {
    return this.sendMessage({
      type: 'Email',
      ...emailData,
    });
  }

  /* ------------------- TAGS ------------------- */

  async addTags(contactId: string, tags: string[]): Promise<any> {
    return this.request(`/contacts/${contactId}/tags`, {
      method: 'POST',
      body: { tags },
    });
  }

  /* ------------------- REQUEST WRAPPER & RETRIES ------------------- */

  private async request(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: any;
    } = {},
    retries = 3,
    delay = 1000
  ): Promise<any> {
    const { method = 'GET', body } = options;
    const url = `${this.baseURL}${endpoint}`;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/json',
      'Version': '2021-04-15', // Required header for GHL API v2
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      // Handle Rate Limiting (Too Many Requests)
      if (response.status === 429 && retries > 0) {
        const retryAfter = response.headers.get('retry-after');
        const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay;
        console.warn(`[GHLClient] Rate limit hit. Retrying in ${waitTime}ms... (${retries} retries left)`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        return this.request(endpoint, options, retries - 1, delay * 2);
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new GHLApiError(
          `GHL API Error [${response.status}]: ${response.statusText}`,
          response.status,
          errorText
        );
      }

      if (method === 'DELETE') {
        return void 0;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof GHLApiError) {
        throw error;
      }
      if (retries > 0) {
        console.warn(`[GHLClient] Network or unknown error: ${error instanceof Error ? error.message : String(error)}. Retrying...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.request(endpoint, options, retries - 1, delay * 2);
      }
      throw new Error(
        `Failed to call GHL API at ${endpoint}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

export class GHLApiError extends Error {
  constructor(message: string, public statusCode: number, public responseBody: string) {
    super(message);
    this.name = 'GHLApiError';
  }
}

/**
 * Factory function to create a GHL client from account settings.
 */
export async function createGhlClientForAccount(
  supabaseClient: any,
  accountId: string
): Promise<GHLClient> {
  const { data, error } = await supabaseClient
    .from('accounts')
    .select('ghl_api_key')
    .eq('id', accountId)
    .single();

  if (error || !data) {
    console.error(`[GHL Settings Error] for account ${accountId}:`, error);
    throw new Error(`Failed to find GHL settings for account ${accountId}: ${error?.message || 'No data'}`);
  }

  const token = data.ghl_api_key;

  if (!token) {
    throw new Error(`GHL Integration Token not configured for account ${accountId}`);
  }

  return new GHLClient(token);
}
