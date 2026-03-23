import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useStore } from '../../store/useStore';
import { ToastContainer } from '../ui/Toast';
import { CommandPalette } from '../ui/CommandPalette';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useAutoNotifications } from '../../hooks/useAutoNotifications';

interface LayoutProps {
  children: React.ReactNode;
}

// Sections qui prennent tout l'espace (pas de padding)
const FULL_BLEED_SECTIONS = ['documents'];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { activeSection } = useStore();
  const isFullBleed = FULL_BLEED_SECTIONS.includes(activeSection);
  const [showPalette, setShowPalette] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useKeyboardShortcuts({
    onSearch: () => setShowPalette(true),
    onEscape: () => setShowPalette(false),
  });

  useAutoNotifications();

  return (
    <div className="flex h-screen bg-obsidian-900 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative z-50 w-64 h-full">
            <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMenuToggle={() => setMobileMenuOpen(p => !p)} />
        <main className={isFullBleed ? 'flex-1 overflow-hidden bg-obsidian-900' : 'flex-1 overflow-y-auto p-4 md:p-6 bg-obsidian-900'}>
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
