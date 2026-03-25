import { useEffect, useRef } from 'react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabaseAuth';
import { useStore } from '../store/useStore';
import { toast } from '../components/ui/Toast';

/**
 * Hook qui écoute les changements Supabase Realtime pour :
 * 1. Recharger les données CRM quand un autre utilisateur modifie quelque chose
 * 2. Afficher des notifications toast en temps réel
 * 3. Fallback polling toutes les 30s si Realtime ne fonctionne pas
 */
export function useRealtimeSync() {
  const currentUser = useStore(s => s.currentUser);
  const loadFromSupabase = useStore(s => s.loadFromSupabase);
  const addNotification = useStore(s => s.addNotification);
  const channelsRef = useRef<any[]>([]);
  const pollingRef = useRef<any>(null);

  useEffect(() => {
    if (!currentUser || !isSupabaseConfigured()) return;

    const supabase = getSupabase();
    if (!supabase) return;

    let realtimeWorking = false;

    // ── Realtime: écouter les changements sur les projets ──
    const projectChannel = supabase
      .channel('crm-projects-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'crm_projects',
      }, (payload: any) => {
        realtimeWorking = true;
        const data = payload.new?.data;
        if (!data) return;

        // Ne pas notifier ses propres changements
        const lastLog = data?.activityLog?.[0];
        if (lastLog?.auteurId === currentUser.id) return;

        // Recharger les données
        loadFromSupabase();

        // Notification
        if (payload.eventType === 'UPDATE') {
          toast.info(`Projet "${data.nom}" mis à jour`);
          addNotification({
            titre: 'Projet mis à jour',
            message: `"${data.nom}" a été modifié`,
            type: 'info',
            lu: false,
            date: new Date().toISOString(),
            section: 'projects',
          });
        }
      })
      .subscribe();

    // ── Realtime: écouter les nouveaux messages chat ──
    const chatChannel = supabase
      .channel('crm-chat-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'project_messages',
      }, (payload: any) => {
        realtimeWorking = true;
        const msg = payload.new;
        if (!msg || msg.user_id === currentUser.id) return;

        toast.info(`💬 ${msg.user_nom}: ${msg.content.slice(0, 50)}${msg.content.length > 50 ? '...' : ''}`);
        addNotification({
          titre: 'Nouveau message',
          message: `${msg.user_nom}: ${msg.content.slice(0, 80)}`,
          type: 'info',
          lu: false,
          date: new Date().toISOString(),
          section: 'projects',
        });
      })
      .subscribe();

    // ── Realtime: écouter les changements clients/factures ──
    const dataChannel = supabase
      .channel('crm-data-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'crm_clients',
      }, () => {
        realtimeWorking = true;
        loadFromSupabase();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'crm_invoices',
      }, () => {
        realtimeWorking = true;
        loadFromSupabase();
      })
      .subscribe();

    channelsRef.current = [projectChannel, chatChannel, dataChannel];

    // ── Fallback polling si Realtime ne fonctionne pas ──
    pollingRef.current = setInterval(() => {
      if (!realtimeWorking) {
        loadFromSupabase();
      }
    }, 30000); // 30s

    return () => {
      channelsRef.current.forEach(ch => supabase.removeChannel(ch));
      channelsRef.current = [];
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [currentUser?.id]);
}
