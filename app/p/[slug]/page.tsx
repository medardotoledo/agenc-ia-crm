import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicPropertyBySlug } from '@/modules/property-management/services/publicPropertyService';
import PropertyLanding from '@/modules/property-management/components/public/PropertyLanding';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicPropertyBySlug(slug);
  if (!data) return { title: 'Propiedad no encontrada' };

  const { property } = data;
  return {
    title: property.meta_title || property.title,
    description: property.meta_description || property.description_short || undefined,
    openGraph: {
      title: property.meta_title || property.title,
      description: property.meta_description || property.description_short || undefined,
      images: property.gallery_images?.[0] ? [property.gallery_images[0]] : undefined,
    },
  };
}

export default async function PublicPropertyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublicPropertyBySlug(slug);
  if (!data) notFound();

  return <PropertyLanding property={data.property} account={data.account} agents={data.agents} />;
}
