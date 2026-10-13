import { Clock3, Sparkles } from 'lucide-react';
import Image from 'next/image';

import { Icon } from '../ui/Icon';
import type { CosmeticItem } from '@poker/contracts';

export function CompanionPortrait({ avatar = null, pending = false }: { avatar?: CosmeticItem | null; pending?: boolean }) {
  return (
    <aside className="companion" aria-label="Equipped character preview">
      <div className="companion__frame">
        <span className="companion__star"><Icon icon={Sparkles} /></span>
        <span className="companion__clock"><Icon icon={Clock3} /></span>
        <Image
          className="companion__image"
          src={avatar?.assetUrl ?? '/art/hostess.png'}
          alt={avatar ? `${avatar.name}, your selected avatar` : 'Alice, the free default avatar'}
          fill
          priority
          sizes="(max-width: 767px) 92px, 260px"
        />
        <div className="companion__caption">
          <small>{pending ? 'Checking your equipment' : 'Your table companion'}</small>
          <strong>{pending ? 'Avatar preview' : avatar?.name ?? 'Alice'}</strong>
          <span>{pending ? 'Default illustration' : avatar ? 'Selected avatar · next hand' : 'Free default avatar'}</span>
        </div>
      </div>
    </aside>
  );
}
