import React from 'react';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useStore } from '../store/useStore';

export const NotFound: React.FC = () => {
  const setActiveSection = useStore((s) => s.setActiveSection);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-primary-500/10 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-primary-400" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">404</h1>
        <p className="text-slate-400 text-lg mb-6">Page introuvable</p>
        <p className="text-slate-500 text-sm mb-8">
          La page que vous cherchez n'existe pas ou a été déplacée.
        </p>
        <button
          onClick={() => setActiveSection('dashboard')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au Dashboard
        </button>
      </div>
    </div>
  );
};

export default NotFound;
