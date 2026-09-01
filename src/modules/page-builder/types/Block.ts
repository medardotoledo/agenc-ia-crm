export type BlockType = 'hero' | 'gallery' | 'features' | 'cta' | 'form' | 'footer' | 'text' | 'image' | 'divider';

export interface BlockPosition {
  x: number;
  y: number;
}

export interface BlockSize {
  width: number;
  height: number;
}

export interface BlockStyle {
  backgroundColor?: string;
  textColor?: string;
  padding?: number;
  margin?: number;
  borderRadius?: number;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
}

export interface HeroBlockProps {
  title: string;
  subtitle?: string;
  backgroundImage?: string;
  ctaText?: string;
  ctaLink?: string;
}

export interface GalleryBlockProps {
  images: Array<{
    src: string;
    alt: string;
    title?: string;
  }>;
  columns?: 1 | 2 | 3 | 4;
}

export interface FeaturesBlockProps {
  features: Array<{
    icon?: string;
    title: string;
    description: string;
  }>;
  columns?: 1 | 2 | 3;
}

export interface CTABlockProps {
  text: string;
  link: string;
  buttonText: string;
  buttonColor?: string;
}

export interface FormBlockProps {
  fields: Array<{
    name: string;
    type: 'text' | 'email' | 'phone' | 'textarea';
    required?: boolean;
    placeholder?: string;
  }>;
  submitButtonText?: string;
  successMessage?: string;
}

export interface FooterBlockProps {
  content: string;
  companyName?: string;
  contactEmail?: string;
  phone?: string;
}

export type BlockProps =
  | HeroBlockProps
  | GalleryBlockProps
  | FeaturesBlockProps
  | CTABlockProps
  | FormBlockProps
  | FooterBlockProps;

export interface Block {
  id: string;
  type: BlockType;
  props: BlockProps;
  style: BlockStyle;
  position: BlockPosition;
  size: BlockSize;
  order: number;
}

export interface BlockLibraryItem {
  type: BlockType;
  label: string;
  description: string;
  defaultProps: BlockProps;
  defaultStyle: BlockStyle;
  defaultSize: BlockSize;
}
