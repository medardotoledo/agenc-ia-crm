import type { Block } from './Block';

export type PageTemplate = 'landing' | 'blog' | 'pdf';

export interface PageMetadata {
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
  customDomain?: string;
}

export interface Page {
  id: string;
  accountId: string;
  propertyId?: string;
  title: string;
  template: PageTemplate;
  blocks: Block[];
  metadata: PageMetadata;
  isPublished: boolean;
  publishedAt?: Date;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePageInput {
  propertyId?: string;
  title: string;
  template: PageTemplate;
}

export interface UpdatePageInput {
  title?: string;
  blocks?: Block[];
  metadata?: Partial<PageMetadata>;
  isPublished?: boolean;
}
