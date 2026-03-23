import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

/**
 * Generates automatic notifications for:
 * - Overdue invoices (past echeance, not paid)
 * - Project deadlines approaching (within 3 days)
 * - Overdue tasks (deadline passed, not done)
 *
 * Runs once on mount + every 5 minutes.
 * Uses a Set to avoid duplicate notifications per session.
 */
export function useAutoNotifications() {
  const {
    invoices,
    projects,
    notifications,
    addNotification,
  } = useStore();

  const sentRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const check = () => {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const in3Days = new Date(now.getTime() + 3 * 86400000).toISOString().slice(0, 10);

      // ── Overdue invoices ──
      invoices.forEach((inv) => {
        if (inv.statut === 'payée' || inv.statut === 'annulée') return;
        if (!inv.dateEcheance) return;
        const key = `inv-overdue-${inv.id}`;
        if (sentRef.current.has(key)) return;
        if (inv.dateEcheance < today) {
          sentRef.current.add(key);
          addNotification({
            titre: 'Facture en retard',
            message: `${inv.numero} (${inv.clientNom}) — echeance depassee le ${new Date(inv.dateEcheance).toLocaleDateString('fr-FR')}`,
            type: 'warning',
            lu: false,
            date: now.toISOString(),
            section: 'invoices',
          });
        }
      });

      // ── Projects approaching deadline ──
      projects.forEach((proj) => {
        if (proj.statut === 'terminé' || proj.statut === 'en pause') return;
        if (!proj.dateFin) return;
        const key = `proj-deadline-${proj.id}`;
        if (sentRef.current.has(key)) return;
        if (proj.dateFin >= today && proj.dateFin <= in3Days) {
          sentRef.current.add(key);
          addNotification({
            titre: 'Deadline projet proche',
            message: `"${proj.nom}" arrive a echeance le ${new Date(proj.dateFin).toLocaleDateString('fr-FR')}`,
            type: 'warning',
            lu: false,
            date: now.toISOString(),
            section: 'projects',
          });
        }
      });

      // ── Overdue tasks ──
      projects.forEach((proj) => {
        if (!proj.taches) return;
        proj.taches.forEach((task) => {
          if (task.statut === 'fait') return;
          if (!task.dateEcheance) return;
          const key = `task-overdue-${task.id}`;
          if (sentRef.current.has(key)) return;
          if (task.dateEcheance < today) {
            sentRef.current.add(key);
            addNotification({
              titre: 'Tache en retard',
              message: `"${task.titre}" dans "${proj.nom}" — deadline depassee`,
              type: 'error',
              lu: false,
              date: now.toISOString(),
              section: 'projects',
            });
          }
        });
      });
    };

    // Run immediately
    check();

    // Re-check every 5 minutes
    const interval = setInterval(check, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [invoices, projects, addNotification]);
}
