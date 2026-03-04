'use client';

import { TwoFactorSettings } from '@/components/settings/two-factor-settings';

export function SecuritySettings({ twoFactorEnabled }: { twoFactorEnabled: boolean }) {
  return (
    <div className="space-y-6">
      <TwoFactorSettings twoFactorEnabled={twoFactorEnabled} />
    </div>
  );
}
