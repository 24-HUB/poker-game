import type { LucideIcon } from 'lucide-react';

export function Icon({ icon: Glyph }: { icon: LucideIcon }) {
  return <Glyph aria-hidden="true" focusable="false" strokeWidth={1.7} />;
}
