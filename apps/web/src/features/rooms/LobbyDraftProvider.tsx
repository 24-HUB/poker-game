'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

type LobbyDraft = { mode: 'actions' | 'create' | 'join'; title: string; invitation: string };
const emptyDraft: LobbyDraft = { mode: 'actions', title: '', invitation: '' };
const DraftContext = createContext<{
  draft: LobbyDraft;
  update: (fields: Partial<LobbyDraft>) => void;
  clear: () => void;
} | null>(null);

// This tab's entry draft survives the access boundary's temporary loading view.
export function LobbyDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState(emptyDraft);
  return <DraftContext.Provider value={{ draft,
    update: (fields) => setDraft((current) => ({ ...current, ...fields })),
    clear: () => setDraft(emptyDraft),
  }}>{children}</DraftContext.Provider>;
}

export const useLobbyDraft = () => useContext(DraftContext);
