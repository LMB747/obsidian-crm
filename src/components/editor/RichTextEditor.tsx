/**
 * RichTextEditor — éditeur WYSIWYG basé sur Tiptap
 * Remplace les textarea basiques pour les notes, descriptions, SOW, emails.
 */
import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Bold, Italic, List, ListOrdered, Link as LinkIcon, CheckSquare, Undo2, Redo2 } from 'lucide-react';
import clsx from 'clsx';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  minHeight?: number;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = 'Commencez à écrire…',
  editable = true,
  minHeight = 120,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) return null;

  const ToolButton: React.FC<{ active?: boolean; onClick: () => void; children: React.ReactNode; title: string }> = ({
    active,
    onClick,
    children,
    title,
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={clsx(
        'w-7 h-7 rounded-md flex items-center justify-center transition-all',
        active
          ? 'bg-primary-500/20 text-primary-400'
          : 'text-slate-500 hover:text-white hover:bg-obsidian-600'
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="border border-card-border rounded-lg overflow-hidden bg-obsidian-700/50">
      {/* Toolbar */}
      {editable && (
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-card-border bg-obsidian-700/80">
          <ToolButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Gras">
            <Bold className="w-3.5 h-3.5" />
          </ToolButton>
          <ToolButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italique">
            <Italic className="w-3.5 h-3.5" />
          </ToolButton>
          <div className="w-px h-4 bg-card-border mx-1" />
          <ToolButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Liste">
            <List className="w-3.5 h-3.5" />
          </ToolButton>
          <ToolButton active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Liste numérotée">
            <ListOrdered className="w-3.5 h-3.5" />
          </ToolButton>
          <ToolButton active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()} title="Checklist">
            <CheckSquare className="w-3.5 h-3.5" />
          </ToolButton>
          <div className="w-px h-4 bg-card-border mx-1" />
          <ToolButton
            active={editor.isActive('link')}
            onClick={() => {
              if (editor.isActive('link')) {
                editor.chain().focus().unsetLink().run();
              } else {
                const url = window.prompt('URL :');
                if (url) editor.chain().focus().setLink({ href: url }).run();
              }
            }}
            title="Lien"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </ToolButton>
          <div className="flex-1" />
          <ToolButton onClick={() => editor.chain().focus().undo().run()} title="Annuler">
            <Undo2 className="w-3.5 h-3.5" />
          </ToolButton>
          <ToolButton onClick={() => editor.chain().focus().redo().run()} title="Rétablir">
            <Redo2 className="w-3.5 h-3.5" />
          </ToolButton>
        </div>
      )}

      {/* Editor content */}
      <EditorContent
        editor={editor}
        className="tiptap-editor"
        style={{ minHeight }}
      />

      {/* Tiptap styles */}
      <style>{`
        .tiptap-editor .ProseMirror {
          padding: 12px;
          color: #e8e4d8;
          font-family: Inter, sans-serif;
          font-size: 13px;
          line-height: 1.6;
          outline: none;
          min-height: ${minHeight}px;
        }
        .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #7a7060;
          float: left;
          height: 0;
          pointer-events: none;
        }
        .tiptap-editor .ProseMirror a { color: #c9a84c; text-decoration: underline; }
        .tiptap-editor .ProseMirror ul, .tiptap-editor .ProseMirror ol { padding-left: 1.2em; }
        .tiptap-editor .ProseMirror li { margin-bottom: 2px; }
        .tiptap-editor .ProseMirror ul[data-type="taskList"] { list-style: none; padding-left: 0; }
        .tiptap-editor .ProseMirror ul[data-type="taskList"] li { display: flex; gap: 8px; align-items: flex-start; }
        .tiptap-editor .ProseMirror ul[data-type="taskList"] li label input[type="checkbox"] { accent-color: #c9a84c; margin-top: 3px; }
        .tiptap-editor .ProseMirror strong { color: #e8c96a; }
      `}</style>
    </div>
  );
};
