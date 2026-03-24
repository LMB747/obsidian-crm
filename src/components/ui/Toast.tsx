/**
 * Toast system — powered by Sonner
 * Keeps the same API: toast.success(title, message), toast.error(...), etc.
 * ToastContainer renders the Sonner <Toaster> component.
 */
import React from 'react';
import { Toaster, toast as sonnerToast } from 'sonner';

// ─── Static helpers (same API as before) ────────────────────────────────────

export const toast = {
  success: (title: string, message?: string) => {
    sonnerToast.success(title, { description: message });
  },
  error: (title: string, message?: string) => {
    sonnerToast.error(title, { description: message });
  },
  warning: (title: string, message?: string) => {
    sonnerToast.warning(title, { description: message });
  },
  info: (title: string, message?: string) => {
    sonnerToast.info(title, { description: message });
  },
};

// ─── ToastContainer — renders Sonner's Toaster ──────────────────────────────

export const ToastContainer: React.FC = () => (
  <Toaster
    theme="dark"
    position="bottom-right"
    toastOptions={{
      style: {
        background: '#161616',
        border: '1px solid #2a2418',
        color: '#e8e4d8',
        fontFamily: 'Inter, sans-serif',
      },
      classNames: {
        success: 'border-l-4 !border-l-emerald-500',
        error: 'border-l-4 !border-l-red-500',
        warning: 'border-l-4 !border-l-amber-500',
        info: 'border-l-4 !border-l-violet-500',
      },
    }}
    richColors
    closeButton
  />
);
