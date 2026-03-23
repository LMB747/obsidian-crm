import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useStore } from '../../store/useStore';
import { ToastContainer } from '../ui/Toast';
import { CommandPalette } from '../ui/CommandPalette';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

interface LayoutProps {
  children: React.ReactNode;
}

// Sections qui prennent tout l'espace (pas de padding)
const FULL_BLEED_SECTIONS = ['documents'];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { activeSection } = useStore();
  const isFullBleed = FULL_BLEED_SECTIONS.includes(activeSection);
  const [showPalette, setShowPalette] = useState(false);

  useKeyboardShortcuts({
    onSearch: () => setShowPalette(true),
    onEscape: () => setShowPalette(false),
  });

  return (
    <div className="flex h-screen bg-obsidian-900 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className={isFullBleed ? 'flex-1 overflow-hidden bg-obsidian-900' : 'flex-1 overflow-y-auto p-6 bg-obsidian-900'}>
          <div className={isFullBleed ? 'h-full' : 'animate-fade-in'}>
            {children}
          </div>
        </main>
      </div>

      {/* Global UI layers */}
      <ToastContainer />
      <CommandPalette open={showPalette} onClose={() => setShowPalette(false)} />
    </div>
  );
};
