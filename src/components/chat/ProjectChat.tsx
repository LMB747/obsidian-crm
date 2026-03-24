import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import clsx from 'clsx';
import { getSupabase, isSupabaseConfigured } from '../../lib/supabaseAuth';
import { useStore } from '../../store/useStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ChatMessage {
  id: string;
  project_id: string;
  user_id: string;
  user_nom: string;
  content: string;
  type: 'text' | 'file' | 'system';
  reply_to_id?: string;
  created_at: string;
}

interface ProjectChatProps {
  projectId: string;
  projectNom: string;
}

const INPUT_CLASS = 'w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all';

export const ProjectChat: React.FC<ProjectChatProps> = ({ projectId, projectNom }) => {
  const currentUser = useStore(s => s.currentUser);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch existing messages
  const fetchMessages = useCallback(async () => {
    if (!isSupabaseConfigured()) { setLoading(false); return; }
    const supabase = getSupabase();
    if (!supabase) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('project_messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .limit(200);
    if (!error && data) setMessages(data as ChatMessage[]);
    setLoading(false);
  }, [projectId]);

  // Subscribe to realtime
  useEffect(() => {
    fetchMessages();
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const channel = supabase
      .channel(`project-chat-${projectId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'project_messages',
        filter: `project_id=eq.${projectId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as ChatMessage]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId, fetchMessages]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;
    const msg = {
      project_id: projectId,
      user_id: currentUser.id,
      user_nom: `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim(),
      content: newMessage.trim(),
      type: 'text',
    };

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.from('project_messages').insert(msg);
      }
    } else {
      // Fallback local
      setMessages(prev => [...prev, { ...msg, id: crypto.randomUUID(), created_at: new Date().toISOString() } as ChatMessage]);
    }
    setNewMessage('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isSupabaseConfigured()) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <MessageCircle className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">Chat indisponible — Supabase non configuré</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[400px]">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <MessageCircle className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">Aucun message — démarrez la conversation !</p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.user_id === currentUser?.id;
            return (
              <div key={msg.id} className={clsx('flex gap-2', isMe ? 'flex-row-reverse' : 'flex-row')}>
                <div className="w-7 h-7 rounded-full bg-obsidian-700 border border-card-border flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-primary-300">
                    {msg.user_nom.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className={clsx(
                  'max-w-[75%] rounded-xl px-3 py-2',
                  isMe
                    ? 'bg-primary-500/20 border border-primary-500/30'
                    : 'bg-obsidian-700 border border-card-border'
                )}>
                  {!isMe && <p className="text-[10px] font-semibold text-primary-300 mb-0.5">{msg.user_nom}</p>}
                  <p className="text-sm text-white whitespace-pre-wrap break-words">{msg.content}</p>
                  <p className={clsx('text-[10px] mt-1', isMe ? 'text-primary-400/60 text-right' : 'text-slate-500')}>
                    {format(new Date(msg.created_at), 'HH:mm', { locale: fr })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-card-border bg-obsidian-800/50">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écrire un message..."
            className={INPUT_CLASS}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className="px-3 py-2 bg-gradient-to-r from-accent-cyan to-primary-500 text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
