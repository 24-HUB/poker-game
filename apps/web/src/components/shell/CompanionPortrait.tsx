import { Clock3, Sparkles } from 'lucide-react';
import Image from 'next/image';

import { Icon } from '../ui/Icon';

export function CompanionPortrait() {
  return (
    <aside className="companion" aria-label="Equipped character preview">
      <div className="companion__frame">
        <span className="companion__star"><Icon icon={Sparkles} /></span>
        <span className="companion__clock"><Icon icon={Clock3} /></span>
        <Image
          className="companion__image"
          src="/art/hostess.png"
          alt="Blue-haired anime hostess with a teacup and pocket watch"
          fill
          priority
          sizes="(max-width: 767px) 92px, 260px"
        />
        <div className="companion__caption">
          <small>Your table companion</small>
          <strong>Alice</strong>
          <span>Default avatar</span>
        </div>
      </div>
    </aside>
  );
}
