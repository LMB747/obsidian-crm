import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Plus } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface TagPickerProps {
  selected: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

const TAG_COLORS = [
  '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#f97316', '#6366f1', '#14b8a6',
];

export const TagPicker: React.FC<TagPickerProps> = ({ selected, onChange, placeholder = 'Ajouter un tag…' }) => {
  const { unifiedTags, addUnifiedTag } = useStore();
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const suggestions = useMemo(() => {
    const q = input.toLowerCase().trim();
    return unifiedTags
      .filter((t) => !selected.includes(t.name))
      .filter((t) => !q || t.name.toLowerCase().includes(q));
  }, [unifiedTags, selected, input]);

  const getTagColor = (name: string): string => {
    const tag = unifiedTags.find((t) => t.name === name);
    return tag?.color || '#6366f1';
  };

  const addTag = (name: string) => {
    if (!selected.includes(name)) {
      onChange([...selected, name]);
    }
    setInput('');
    setOpen(false);
  };

  const createAndAdd = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    // Check if tag exists
    const existing = unifiedTags.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
    if (!existing) {
      const color = TAG_COLORS[unifiedTags.length % TAG_COLORS.length];
      addUnifiedTag({ name: trimmed, color });
    }
    addTag(existing?.name || trimmed);
  };

  const removeTag = (name: string) => {
    onChange(selected.filter((t) => t !== name));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (input.trim()) createAndAdd(input);
    } else if (e.key === 'Backspace' && !input && selected.length > 0) {
      removeTag(selected[selected.length - 1]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      {/* Selected tags + input */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-800/50 border border-slate-600/50 rounded-lg px-2.5 py-1.5 min-h-[38px] focus-within:border-primary-500/50 transition-colors">
        {selected.map((name) => {
          const color = getTagColor(name);
          return (
            <span
              key={name}
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-medium"
              style={{ backgroundColor: `${color}25`, color, border: `1px solid ${color}40` }}
            >
              {name}
              <button type="button" onClick={() => removeTag(name)} className="hover:opacity-70 transition-opacity">
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selected.length === 0 ? placeholder : ''}
          className="bg-transparent text-sm text-white placeholder-slate-500 outline-none flex-1 min-w-[80px]"
        />
      </div>

      {/* Dropdown */}
      {open && (suggestions.length > 0 || input.trim()) && (
        <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-600/50 rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {suggestions.slice(0, 10).map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => addTag(tag.name)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-700/50 transition-colors"
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: tag.color }}
              />
              <span className="text-white">{tag.name}</span>
            </button>
          ))}
          {input.trim() && !unifiedTags.some((t) => t.name.toLowerCase() === input.trim().toLowerCase()) && (
            <button
              type="button"
              onClick={() => createAndAdd(input)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-700/50 transition-colors text-primary-400 border-t border-slate-700/50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Créer « {input.trim()} »</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
