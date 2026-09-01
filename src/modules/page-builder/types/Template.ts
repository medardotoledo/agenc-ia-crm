import type { Block } from './Block';

export type TemplateType = 'property-landing' | 'blog-article' | 'pdf-ficha';

export interface Template {
  id: string;
  name: string;
  type: TemplateType;
  description: string;
  preview?: string;
  blocks: Block[];
  defaultMetadata?: Record<string, any>;
}

export const TEMPLATES = {
  PROPERTY_LANDING: 'property-landing',
  BLOG_ARTICLE: 'blog-article',
  PDF_FICHA: 'pdf-ficha',
} as const;

export const TEMPLATE_LABELS: Record<TemplateType, string> = {
  'property-landing': 'Landing de Propiedad',
  'blog-article': 'Artículo de Blog',
  'pdf-ficha': 'Ficha Técnica PDF',
};
