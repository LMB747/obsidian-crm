import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen, Plus, CheckSquare, Clock, AlertTriangle, Trash2,
  StickyNote, Calendar, Tag, ChevronDown, X, Pencil, Search,
  GripVertical, Pin, PinOff, ArrowUpDown, Bell, BellOff, ListChecks,
} from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../store/useStore';
import { PersonalTask, PersonalTaskStatut, PersonalTaskPriorite, PersonalNote, PersonalSubTask } from '../types';
import { RichTextEditor } from '../components/editor/RichTextEditor';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '../components/ui/Toast';

// dnd-kit
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ─── Config ─────────────────────────────────────────────────────────────────

const STATUT_CONFIG: Record<PersonalTaskStatut, { label: string; color: string; bg: string }> = {
  todo:        { label: 'À faire',   color: 'text-slate-400',    bg: 'bg-slate-500/20' },
  in_progress: { label: 'En cours',  color: 'text-amber-400',    bg: 'bg-amber-500/20' },
  done:        { label: 'Terminé',   color: 'text-accent-green', bg: 'bg-accent-green/20' },
};

const PRIO_CONFIG: Record<PersonalTaskPriorite, { label: string; color: string; dot: string }> = {
  basse:   { label: 'Basse',   color: 'text-slate-500', dot: 'bg-slate-500' },
  normale: { label: 'Normale', color: 'text-blue-400',  dot: 'bg-blue-400' },
  haute:   { label: 'Haute',   color: 'text-amber-400', dot: 'bg-amber-400' },
  urgente: { label: 'Urgente', color: 'text-red-400',   dot: 'bg-red-400' },
};

const NOTE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316'];

const TAG_SUGGESTIONS = ['Maths', 'Français', 'Histoire', 'Anglais', 'Physique', 'SVT', 'Projet', 'Perso', 'Urgent', 'Révision'];

type NoteSortMode = 'recent' | 'alpha' | 'couleur';

// ─── Sortable Task Item ─────────────────────────────────────────────────────

const SortableTaskItem: React.FC<{
  task: PersonalTask;
  today: string;
  onToggle: (t: PersonalTask) => void;
  onEdit: (t: PersonalTask) => void;
  onDelete: (id: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onAddSubtask: (taskId: string, titre: string) => void;
  onDeleteSubtask: (taskId: string, subtaskId: string) => void;
  onToggleRappel: (t: PersonalTask) => void;
}> = ({ task: t, today, onToggle, onEdit, onDelete, onToggleSubtask, onAddSubtask, onDeleteSubtask, onToggleRappel }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: t.id });
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const prio = PRIO_CONFIG[t.priorite];
  const statut = STATUT_CONFIG[t.statut];
  const isOverdue = t.dateEcheance && t.dateEcheance < today && t.statut !== 'done';
  const subtasks = t.subtasks || [];
  const subtasksDone = subtasks.filter(s => s.done).length;
  const hasRappel = !!t.rappel;

  return (
    <div ref={setNodeRef} style={style} className={clsx('bg-card border rounded-xl p-3 transition-all group', isOverdue ? 'border-red-500/40' : 'border-card-border hover:border-primary-500/30')}>
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners} className="mt-1 cursor-grab text-slate-600 hover:text-slate-400 flex-shrink-0">
          <GripVertical className="w-4 h-4" />
        </button>
        <button onClick={() => onToggle(t)} className={clsx('mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all', t.statut === 'done' ? 'bg-accent-green border-accent-green' : 'border-slate-500 hover:border-primary-400')}>
          {t.statut === 'done' && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </button>
        <div className="flex-1 min-w-0">
          <p className={clsx('text-sm font-semibold', t.statut === 'done' ? 'text-slate-500 line-through' : 'text-white')}>{t.titre}</p>
          {t.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{t.description.replace(/<[^>]+>/g, '')}</p>}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded', statut.bg, statut.color)}>{statut.label}</span>
            <span className="flex items-center gap-1 text-[10px]"><span className={clsx('w-1.5 h-1.5 rounded-full', prio.dot)} /><span className={prio.color}>{prio.label}</span></span>
            {t.dateEcheance && <span className={clsx('text-[10px]', isOverdue ? 'text-red-400 font-semibold' : 'text-slate-500')}>{new Date(t.dateEcheance).toLocaleDateString('fr-FR')}</span>}
            {subtasks.length > 0 && (
              <button onClick={() => setShowSubtasks(!showSubtasks)} className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-primary-400">
                <ListChecks className="w-3 h-3" /> {subtasksDone}/{subtasks.length}
              </button>
            )}
            {hasRappel && <Bell className="w-3 h-3 text-amber-400" />}
            {(t.tags || []).map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-primary-500/10 text-primary-400">{tag}</span>
            ))}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => onToggleRappel(t)} title={hasRappel ? 'Retirer rappel' : 'Ajouter rappel'} className="p-1 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-500/10">
            {hasRappel ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => { setShowSubtasks(!showSubtasks); }} className="p-1 rounded-lg text-slate-500 hover:text-primary-400 hover:bg-primary-500/10"><ListChecks className="w-3.5 h-3.5" /></button>
          <button onClick={() => onEdit(t)} className="p-1 rounded-lg text-slate-500 hover:text-primary-400 hover:bg-primary-500/10"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={() => onDelete(t.id)} className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* Sub-tasks */}
      {showSubtasks && (
        <div className="ml-10 mt-2 space-y-1">
          {subtasks.map(sub => (
            <div key={sub.id} className="flex items-center gap-2 group/sub">
              <button onClick={() => onToggleSubtask(t.id, sub.id)} className={clsx('w-4 h-4 rounded border flex items-center justify-center flex-shrink-0', sub.done ? 'bg-accent-green border-accent-green' : 'border-slate-500 hover:border-primary-400')}>
                {sub.done && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </button>
              <span className={clsx('text-xs flex-1', sub.done ? 'text-slate-500 line-through' : 'text-slate-300')}>{sub.titre}</span>
              <button onClick={() => onDeleteSubtask(t.id, sub.id)} className="opacity-0 group-hover/sub:opacity-100 p-0.5 text-slate-600 hover:text-red-400"><X className="w-3 h-3" /></button>
            </div>
          ))}
          <form onSubmit={e => { e.preventDefault(); if (newSubtask.trim()) { onAddSubtask(t.id, newSubtask.trim()); setNewSubtask(''); } }} className="flex gap-2 mt-1">
            <input value={newSubtask} onChange={e => setNewSubtask(e.target.value)} placeholder="Nouvelle sous-tâche…" className="flex-1 bg-obsidian-700 border border-card-border text-white text-xs rounded-lg px-2 py-1 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500/60" />
            <button type="submit" className="px-2 py-1 rounded-lg bg-primary-500/20 text-primary-400 text-xs hover:bg-primary-500/30"><Plus className="w-3 h-3" /></button>
          </form>
        </div>
      )}
    </div>
  );
};

// ─── Component ──────────────────────────────────────────────────────────────

export const PersonalSpace: React.FC = () => {
  const currentUser = useStore(s => s.currentUser);
  const personalTasks = useStore(s => s.personalTasks);
  const personalNotes = useStore(s => s.personalNotes);
  const { addPersonalTask, updatePersonalTask, deletePersonalTask, reorderPersonalTasks } = useStore();
  const { addPersonalNote, updatePersonalNote, deletePersonalNote, reorderPersonalNotes } = useStore();

  const userId = currentUser?.id || '';

  // Filter by current user
  const myTasks = useMemo(() => personalTasks.filter(t => t.userId === userId), [personalTasks, userId]);
  const myNotes = useMemo(() => personalNotes.filter(n => n.userId === userId), [personalNotes, userId]);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Task state
  const [taskFilter, setTaskFilter] = useState<PersonalTaskStatut | 'all'>('all');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<PersonalTask | null>(null);
  const [taskTitre, setTaskTitre] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPrio, setTaskPrio] = useState<PersonalTaskPriorite>('normale');
  const [taskDate, setTaskDate] = useState('');
  const [taskTags, setTaskTags] = useState<string[]>([]);
  const [taskTagInput, setTaskTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [taskRappel, setTaskRappel] = useState('');

  // Note state
  const [editingNote, setEditingNote] = useState<PersonalNote | null>(null);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [noteTitre, setNoteTitre] = useState('');
  const [noteContenu, setNoteContenu] = useState('');
  const [noteCouleur, setNoteCouleur] = useState(NOTE_COLORS[0]);
  const [noteSortMode, setNoteSortMode] = useState<NoteSortMode>('recent');

  // DnD sensors
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Stats
  const today = new Date().toISOString().split('T')[0];
  const todayTasks = myTasks.filter(t => t.dateEcheance === today && t.statut !== 'done').length;
  const overdueTasks = myTasks.filter(t => t.dateEcheance && t.dateEcheance < today && t.statut !== 'done').length;
  const doneTasks = myTasks.filter(t => t.statut === 'done').length;

  // Reminders on mount
  useEffect(() => {
    const overdueList = myTasks.filter(t => t.dateEcheance && t.dateEcheance < today && t.statut !== 'done');
    const todayList = myTasks.filter(t => t.dateEcheance === today && t.statut !== 'done');
    const rappelList = myTasks.filter(t => t.rappel && t.rappel <= new Date().toISOString() && t.statut !== 'done');

    if (overdueList.length > 0) toast.warning(`${overdueList.length} tâche(s) en retard !`);
    if (todayList.length > 0) toast.info(`${todayList.length} tâche(s) prévue(s) aujourd'hui`);
    rappelList.forEach(t => toast.warning(`Rappel : ${t.titre}`));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtered & searched tasks
  const filteredTasks = useMemo(() => {
    let list = myTasks;
    if (taskFilter !== 'all') list = list.filter(t => t.statut === taskFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t =>
        t.titre.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.tags || []).some(tag => tag.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
  }, [myTasks, taskFilter, searchQuery]);

  // Sorted notes
  const sortedNotes = useMemo(() => {
    let list = [...myNotes];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(n => n.titre.toLowerCase().includes(q) || (n.contenu || '').toLowerCase().includes(q));
    }
    // Pinned first
    list.sort((a, b) => {
      if ((a.epingle || false) !== (b.epingle || false)) return (b.epingle ? 1 : 0) - (a.epingle ? 1 : 0);
      switch (noteSortMode) {
        case 'alpha': return a.titre.localeCompare(b.titre);
        case 'couleur': return (a.couleur || '').localeCompare(b.couleur || '');
        default: return new Date(b.dateModification).getTime() - new Date(a.dateModification).getTime();
      }
    });
    return list;
  }, [myNotes, searchQuery, noteSortMode]);

  // Task handlers
  const resetTaskForm = () => { setTaskTitre(''); setTaskDesc(''); setTaskPrio('normale'); setTaskDate(''); setEditingTask(null); setShowTaskForm(false); setTaskTags([]); setTaskTagInput(''); setTaskRappel(''); };

  const handleSaveTask = () => {
    if (!taskTitre.trim()) return;
    if (editingTask) {
      updatePersonalTask(editingTask.id, { titre: taskTitre.trim(), description: taskDesc, priorite: taskPrio, dateEcheance: taskDate || undefined, tags: taskTags, rappel: taskRappel || undefined });
    } else {
      addPersonalTask({ userId, titre: taskTitre.trim(), description: taskDesc, statut: 'todo', priorite: taskPrio, dateEcheance: taskDate || undefined, tags: taskTags, rappel: taskRappel || undefined });
    }
    resetTaskForm();
  };

  const openEditTask = (t: PersonalTask) => {
    setEditingTask(t); setTaskTitre(t.titre); setTaskDesc(t.description); setTaskPrio(t.priorite); setTaskDate(t.dateEcheance || ''); setTaskTags(t.tags || []); setTaskRappel(t.rappel || ''); setShowTaskForm(true);
  };

  const toggleTaskStatus = (t: PersonalTask) => {
    const next: Record<PersonalTaskStatut, PersonalTaskStatut> = { todo: 'in_progress', in_progress: 'done', done: 'todo' };
    updatePersonalTask(t.id, { statut: next[t.statut] });
  };

  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !taskTags.includes(trimmed)) setTaskTags([...taskTags, trimmed]);
    setTaskTagInput(''); setShowTagSuggestions(false);
  };

  const handleRemoveTag = (tag: string) => setTaskTags(taskTags.filter(t => t !== tag));

  // Subtask handlers
  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    const task = myTasks.find(t => t.id === taskId);
    if (!task) return;
    const subtasks = (task.subtasks || []).map(s => s.id === subtaskId ? { ...s, done: !s.done } : s);
    updatePersonalTask(taskId, { subtasks });
  };

  const handleAddSubtask = (taskId: string, titre: string) => {
    const task = myTasks.find(t => t.id === taskId);
    if (!task) return;
    const subtasks = [...(task.subtasks || []), { id: uuidv4(), titre, done: false }];
    updatePersonalTask(taskId, { subtasks });
  };

  const handleDeleteSubtask = (taskId: string, subtaskId: string) => {
    const task = myTasks.find(t => t.id === taskId);
    if (!task) return;
    const subtasks = (task.subtasks || []).filter(s => s.id !== subtaskId);
    updatePersonalTask(taskId, { subtasks });
  };

  const handleToggleRappel = (t: PersonalTask) => {
    if (t.rappel) {
      updatePersonalTask(t.id, { rappel: undefined });
      toast.info('Rappel retiré');
    } else {
      const rappelDate = t.dateEcheance || new Date(Date.now() + 86400000).toISOString().split('T')[0];
      updatePersonalTask(t.id, { rappel: rappelDate + 'T08:00:00' });
      toast.success('Rappel ajouté');
    }
  };

  // DnD handlers
  const handleTaskDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = filteredTasks.findIndex(t => t.id === active.id);
    const newIndex = filteredTasks.findIndex(t => t.id === over.id);
    const reordered = arrayMove(filteredTasks, oldIndex, newIndex);
    reorderPersonalTasks(reordered.map(t => t.id));
  };

  const handleNoteDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortedNotes.findIndex(n => n.id === active.id);
    const newIndex = sortedNotes.findIndex(n => n.id === over.id);
    const reordered = arrayMove(sortedNotes, oldIndex, newIndex);
    reorderPersonalNotes(reordered.map(n => n.id));
  };

  // Note handlers
  const resetNoteForm = () => { setNoteTitre(''); setNoteContenu(''); setNoteCouleur(NOTE_COLORS[0]); setEditingNote(null); setShowNoteEditor(false); };

  const handleSaveNote = () => {
    if (!noteTitre.trim()) return;
    if (editingNote) {
      updatePersonalNote(editingNote.id, { titre: noteTitre.trim(), contenu: noteContenu, couleur: noteCouleur });
    } else {
      addPersonalNote({ userId, titre: noteTitre.trim(), contenu: noteContenu, couleur: noteCouleur });
    }
    resetNoteForm();
  };

  const openEditNote = (n: PersonalNote) => {
    setEditingNote(n); setNoteTitre(n.titre); setNoteContenu(n.contenu); setNoteCouleur(n.couleur || NOTE_COLORS[0]); setShowNoteEditor(true);
  };

  const togglePinNote = (n: PersonalNote) => {
    updatePersonalNote(n.id, { epingle: !n.epingle });
  };

  const filteredTagSuggestions = TAG_SUGGESTIONS.filter(t => !taskTags.includes(t) && t.toLowerCase().includes(taskTagInput.toLowerCase()));

  const inputCls = 'w-full bg-obsidian-700 border border-card-border text-white text-sm rounded-xl px-3 py-2 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500/60 transition-all';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            Mon Espace
          </h1>
          <p className="text-slate-500 text-sm mt-1">Organisez vos tâches, devoirs et notes personnelles</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Rechercher dans les tâches et notes…"
          className="w-full bg-card border border-card-border text-white text-sm rounded-xl pl-10 pr-4 py-2.5 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500/60 transition-all"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2"><Calendar className="w-4 h-4 text-primary-400" /></div>
          <p className="text-2xl font-bold text-white">{todayTasks}</p>
          <p className="text-xs text-slate-500">Aujourd'hui</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-red-400" /></div>
          <p className="text-2xl font-bold text-red-400">{overdueTasks}</p>
          <p className="text-xs text-slate-500">En retard</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2"><CheckSquare className="w-4 h-4 text-accent-green" /></div>
          <p className="text-2xl font-bold text-accent-green">{doneTasks}</p>
          <p className="text-xs text-slate-500">Terminées</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2"><StickyNote className="w-4 h-4 text-amber-400" /></div>
          <p className="text-2xl font-bold text-white">{myNotes.length}</p>
          <p className="text-xs text-slate-500">Notes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── LEFT: Tasks ─────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-primary-400" /> Mes Devoirs
            </h2>
            <button onClick={() => { resetTaskForm(); setShowTaskForm(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500/20 text-primary-400 text-xs font-semibold hover:bg-primary-500/30 transition-all">
              <Plus className="w-3.5 h-3.5" /> Ajouter
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1.5">
            {(['all', 'todo', 'in_progress', 'done'] as const).map(f => (
              <button key={f} onClick={() => setTaskFilter(f)} className={clsx('px-3 py-1 text-xs font-semibold rounded-lg transition-all', taskFilter === f ? 'bg-primary-500/20 text-primary-300' : 'text-slate-500 hover:text-white')}>
                {f === 'all' ? 'Tous' : STATUT_CONFIG[f].label}
              </button>
            ))}
          </div>

          {/* Task form */}
          {showTaskForm && (
            <div className="bg-card border border-primary-500/30 rounded-xl p-4 space-y-3">
              <input value={taskTitre} onChange={e => setTaskTitre(e.target.value)} placeholder="Titre de la tâche…" className={inputCls} autoFocus />
              <textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Description (optionnel)…" rows={2} className={clsx(inputCls, 'resize-none')} />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] text-slate-500 mb-1">Priorité</label>
                  <select value={taskPrio} onChange={e => setTaskPrio(e.target.value as PersonalTaskPriorite)} className={inputCls}>
                    {Object.entries(PRIO_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] text-slate-500 mb-1">Échéance</label>
                  <input type="date" value={taskDate} onChange={e => setTaskDate(e.target.value)} className={inputCls} />
                </div>
              </div>

              {/* Rappel */}
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Rappel (optionnel)</label>
                <input type="datetime-local" value={taskRappel} onChange={e => setTaskRappel(e.target.value)} className={inputCls} />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Tags</label>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {taskTags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg bg-primary-500/15 text-primary-400">
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-400"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="relative">
                  <input
                    value={taskTagInput}
                    onChange={e => { setTaskTagInput(e.target.value); setShowTagSuggestions(true); }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(taskTagInput); } }}
                    onFocus={() => setShowTagSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowTagSuggestions(false), 150)}
                    placeholder="Ajouter un tag…"
                    className={clsx(inputCls, 'text-xs')}
                  />
                  {showTagSuggestions && filteredTagSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-obsidian-700 border border-card-border rounded-lg shadow-xl z-10 max-h-32 overflow-y-auto">
                      {filteredTagSuggestions.map(s => (
                        <button key={s} onClick={() => handleAddTag(s)} className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-primary-500/10 hover:text-primary-400">{s}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={resetTaskForm} className="flex-1 py-2 rounded-xl border border-card-border text-slate-400 text-sm hover:bg-card-hover transition-all">Annuler</button>
                <button onClick={handleSaveTask} className="flex-1 py-2 rounded-xl bg-primary-500/20 text-primary-400 text-sm font-semibold hover:bg-primary-500/30 transition-all">{editingTask ? 'Modifier' : 'Créer'}</button>
              </div>
            </div>
          )}

          {/* Task list with DnD */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTaskDragEnd}>
            <SortableContext items={filteredTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {filteredTasks.map(t => (
                  <SortableTaskItem
                    key={t.id}
                    task={t}
                    today={today}
                    onToggle={toggleTaskStatus}
                    onEdit={openEditTask}
                    onDelete={deletePersonalTask}
                    onToggleSubtask={handleToggleSubtask}
                    onAddSubtask={handleAddSubtask}
                    onDeleteSubtask={handleDeleteSubtask}
                    onToggleRappel={handleToggleRappel}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {filteredTasks.length === 0 && (
            <div className="text-center py-8">
              <CheckSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">{taskFilter === 'all' ? 'Aucun devoir — ajoutez-en un !' : 'Aucun devoir dans cette catégorie'}</p>
            </div>
          )}
        </div>

        {/* ── RIGHT: Notes ────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-amber-400" /> Mes Notes
            </h2>
            <div className="flex items-center gap-2">
              {/* Sort dropdown */}
              <div className="relative">
                <select value={noteSortMode} onChange={e => setNoteSortMode(e.target.value as NoteSortMode)} className="appearance-none bg-obsidian-700 border border-card-border text-slate-400 text-xs rounded-lg px-2 py-1.5 pr-6 focus:outline-none cursor-pointer">
                  <option value="recent">Récentes</option>
                  <option value="alpha">A → Z</option>
                  <option value="couleur">Couleur</option>
                </select>
                <ArrowUpDown className="w-3 h-3 text-slate-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <button onClick={() => { resetNoteForm(); setShowNoteEditor(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/30 transition-all">
                <Plus className="w-3.5 h-3.5" /> Nouvelle note
              </button>
            </div>
          </div>

          {/* Note editor */}
          {showNoteEditor && (
            <div className="bg-card border border-amber-500/30 rounded-xl p-4 space-y-3">
              <input value={noteTitre} onChange={e => setNoteTitre(e.target.value)} placeholder="Titre de la note…" className={inputCls} autoFocus />
              <div className="flex gap-1.5 mb-1">
                {NOTE_COLORS.map(c => (
                  <button key={c} onClick={() => setNoteCouleur(c)} className={clsx('w-5 h-5 rounded-full border-2 transition-all', noteCouleur === c ? 'border-white scale-110' : 'border-transparent')} style={{ backgroundColor: c }} />
                ))}
              </div>
              <RichTextEditor content={noteContenu} onChange={setNoteContenu} placeholder="Écrivez votre note…" minHeight={100} />
              <div className="flex gap-2">
                <button onClick={resetNoteForm} className="flex-1 py-2 rounded-xl border border-card-border text-slate-400 text-sm hover:bg-card-hover transition-all">Annuler</button>
                <button onClick={handleSaveNote} className="flex-1 py-2 rounded-xl bg-amber-500/20 text-amber-400 text-sm font-semibold hover:bg-amber-500/30 transition-all">{editingNote ? 'Modifier' : 'Créer'}</button>
              </div>
            </div>
          )}

          {/* Notes grid with DnD */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleNoteDragEnd}>
            <SortableContext items={sortedNotes.map(n => n.id)} strategy={verticalListSortingStrategy}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sortedNotes.map(n => (
                  <SortableNoteCard key={n.id} note={n} onEdit={openEditNote} onDelete={deletePersonalNote} onTogglePin={togglePinNote} />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {sortedNotes.length === 0 && (
            <div className="col-span-2 text-center py-8">
              <StickyNote className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Aucune note — créez-en une !</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Sortable Note Card ─────────────────────────────────────────────────────

const SortableNoteCard: React.FC<{
  note: PersonalNote;
  onEdit: (n: PersonalNote) => void;
  onDelete: (id: string) => void;
  onTogglePin: (n: PersonalNote) => void;
}> = ({ note: n, onEdit, onDelete, onTogglePin }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: n.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="bg-card border border-card-border rounded-xl overflow-hidden hover:border-amber-500/30 transition-all group cursor-pointer" onClick={() => onEdit(n)}>
      <div className="h-1 flex">
        <div className="flex-1" style={{ backgroundColor: n.couleur || NOTE_COLORS[0] }} />
        {n.epingle && <div className="w-8 bg-amber-400" />}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span {...attributes} {...listeners} className="cursor-grab text-slate-600 hover:text-slate-400 flex-shrink-0" onClick={e => e.stopPropagation()}>
              <GripVertical className="w-3.5 h-3.5" />
            </span>
            {n.epingle && <Pin className="w-3 h-3 text-amber-400 flex-shrink-0" />}
            <p className="text-sm font-bold text-white truncate">{n.titre}</p>
          </div>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
            <button onClick={e => { e.stopPropagation(); onTogglePin(n); }} className="p-1 rounded-lg text-slate-600 hover:text-amber-400">
              {n.epingle ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
            </button>
            <button onClick={e => { e.stopPropagation(); onDelete(n.id); }} className="p-1 rounded-lg text-slate-600 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
          </div>
        </div>
        <div className="text-xs text-slate-500 mt-1 line-clamp-3" dangerouslySetInnerHTML={{ __html: n.contenu || '<em>Note vide</em>' }} />
        <p className="text-[10px] text-slate-600 mt-2">{new Date(n.dateModification).toLocaleDateString('fr-FR')}</p>
      </div>
    </div>
  );
};
