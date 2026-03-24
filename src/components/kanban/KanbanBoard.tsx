/**
 * KanbanBoard — Composant drag & drop réutilisable basé sur dnd-kit
 * Supporte le drag entre colonnes, overlay visuel, et animations fluides.
 */
import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface KanbanColumn<T> {
  id: string;
  title: string;
  color: string;        // Tailwind color class (e.g., 'text-amber-400')
  bgColor: string;      // Background accent (e.g., 'bg-amber-500/10')
  borderColor: string;  // Border accent (e.g., 'border-amber-500/30')
  items: T[];
}

interface KanbanBoardProps<T extends { id: string }> {
  columns: KanbanColumn<T>[];
  onMove: (itemId: string, fromColumn: string, toColumn: string, newIndex: number) => void;
  onReorder: (columnId: string, oldIndex: number, newIndex: number) => void;
  renderCard: (item: T, isDragging: boolean) => React.ReactNode;
  renderOverlay?: (item: T) => React.ReactNode;
}

// ─── SortableCard ───────────────────────────────────────────────────────────

function SortableCard<T extends { id: string }>({
  item,
  renderCard,
}: {
  item: T;
  renderCard: (item: T, isDragging: boolean) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {renderCard(item, isDragging)}
    </div>
  );
}

// ─── KanbanBoard ────────────────────────────────────────────────────────────

export function KanbanBoard<T extends { id: string }>({
  columns,
  onMove,
  onReorder,
  renderCard,
  renderOverlay,
}: KanbanBoardProps<T>) {
  const [activeItem, setActiveItem] = useState<T | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Find which column an item belongs to
  const findColumn = (itemId: string): string | null => {
    for (const col of columns) {
      if (col.items.some(item => item.id === itemId)) return col.id;
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    for (const col of columns) {
      const item = col.items.find(i => i.id === active.id);
      if (item) { setActiveItem(item); break; }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);
    if (!over) return;

    const activeCol = findColumn(String(active.id));
    let overCol = findColumn(String(over.id));

    // If dropped on a column header (not an item), the over.id is the column id
    if (!overCol) {
      overCol = columns.find(c => c.id === over.id)?.id || null;
    }

    if (!activeCol || !overCol) return;

    if (activeCol === overCol) {
      // Reorder within same column
      const col = columns.find(c => c.id === activeCol);
      if (!col) return;
      const oldIndex = col.items.findIndex(i => i.id === active.id);
      const newIndex = col.items.findIndex(i => i.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        onReorder(activeCol, oldIndex, newIndex);
      }
    } else {
      // Move between columns
      const overColData = columns.find(c => c.id === overCol);
      const overIndex = overColData?.items.findIndex(i => i.id === over.id) ?? 0;
      onMove(String(active.id), activeCol, overCol, Math.max(0, overIndex));
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-2" style={{ minHeight: 200 }}>
        {columns.map(col => (
          <div
            key={col.id}
            className={clsx(
              'flex-1 min-w-[200px] max-w-[280px] rounded-xl border flex flex-col',
              'bg-obsidian-700/30',
              col.borderColor
            )}
          >
            {/* Column header */}
            <div className={clsx('px-3 py-2 border-b flex items-center justify-between', col.borderColor)}>
              <span className={clsx('text-xs font-bold uppercase tracking-wider', col.color)}>
                {col.title}
              </span>
              <span className={clsx(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-md',
                col.bgColor, col.color
              )}>
                {col.items.length}
              </span>
            </div>

            {/* Column body */}
            <SortableContext
              items={col.items.map(i => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex-1 p-2 space-y-2 min-h-[60px]">
                {col.items.map(item => (
                  <SortableCard
                    key={item.id}
                    item={item}
                    renderCard={renderCard}
                  />
                ))}
                {col.items.length === 0 && (
                  <div className="text-center text-[10px] text-slate-600 py-4">
                    Déposez ici
                  </div>
                )}
              </div>
            </SortableContext>
          </div>
        ))}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeItem && (
          <div className="opacity-90 shadow-lg shadow-amber-500/20 rounded-lg">
            {(renderOverlay || renderCard)(activeItem, true)}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
