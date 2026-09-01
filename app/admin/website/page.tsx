'use client';

import { ZonesManager } from '@/modules/inmobiliaria/components/ZonesManager';
import { useActiveAccount } from '@/core/account/activeAccount';

export default function WebsitePage() {
  const { account } = useActiveAccount();

  if (!account?.id) {
    return (
      <div className="flex h-40 items-center justify-center text-ink-soft">
        Cargando cuenta...
      </div>
    );
  }

  return <ZonesManager accountId={account.id} />;
}
