import React, { useState, useEffect, useCallback } from 'react';
import { Upload, File, Image, Film, FileText, Trash2, Download, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { getSupabase, isSupabaseConfigured } from '../../lib/supabaseAuth';
import { useStore } from '../../store/useStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ProjectFile {
  id: string;
  project_id: string;
  task_id?: string;
  livrable_id?: string;
  user_id: string;
  user_nom: string;
  filename: string;
  storage_path: string;
  size_bytes: number;
  mime_type: string;
  version: number;
  created_at: string;
}

interface FileManagerProps {
  projectId: string;
}

const BUCKET = 'project-files';

const getFileIcon = (mime: string) => {
  if (mime?.startsWith('image/')) return Image;
  if (mime?.startsWith('video/')) return Film;
  if (mime?.includes('pdf') || mime?.includes('document')) return FileText;
  return File;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

export const FileManager: React.FC<FileManagerProps> = ({ projectId }) => {
  const currentUser = useStore(s => s.currentUser);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fetchFiles = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) { setLoading(false); return; }
    const { data } = await supabase
      .from('project_files')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (data) setFiles(data as ProjectFile[]);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const uploadFiles = async (fileList: FileList | File[]) => {
    const supabase = getSupabase();
    if (!supabase || !currentUser) return;
    setUploading(true);

    for (const file of Array.from(fileList)) {
      const path = `${projectId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file);

      if (!uploadError) {
        await supabase.from('project_files').insert({
          project_id: projectId,
          user_id: currentUser.id,
          user_nom: `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim() || currentUser.email,
          filename: file.name,
          storage_path: path,
          size_bytes: file.size,
          mime_type: file.type,
        });
      }
    }

    await fetchFiles();
    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) uploadFiles(e.target.files);
    e.target.value = '';
  };

  const downloadFile = async (file: ProjectFile) => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(file.storage_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const deleteFile = async (file: ProjectFile) => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.storage.from(BUCKET).remove([file.storage_path]);
    await supabase.from('project_files').delete().eq('id', file.id);
    setFiles(prev => prev.filter(f => f.id !== file.id));
  };

  if (!isSupabaseConfigured()) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <Upload className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">Upload indisponible — Supabase non configuré</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={clsx(
          'border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer',
          dragOver
            ? 'border-primary-500 bg-primary-500/10'
            : 'border-card-border hover:border-primary-500/50'
        )}
        onClick={() => document.getElementById(`file-input-${projectId}`)?.click()}
      >
        <input
          id={`file-input-${projectId}`}
          type="file"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-primary-300">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Upload en cours...</span>
          </div>
        ) : (
          <>
            <Upload className="w-6 h-6 text-slate-500 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Glissez vos fichiers ici ou <span className="text-primary-400">cliquez pour sélectionner</span></p>
          </>
        )}
      </div>

      {/* File list */}
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
        </div>
      ) : files.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">Aucun fichier</p>
      ) : (
        <div className="space-y-2">
          {files.map(file => {
            const Icon = getFileIcon(file.mime_type);
            return (
              <div key={file.id} className="flex items-center gap-3 p-3 bg-obsidian-700 border border-card-border rounded-xl hover:border-primary-500/30 transition-all">
                <div className="w-9 h-9 rounded-lg bg-obsidian-800 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{file.filename}</p>
                  <p className="text-[10px] text-slate-500">
                    {formatSize(file.size_bytes)} • {file.user_nom} • {format(new Date(file.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                  </p>
                </div>
                <button onClick={() => downloadFile(file)} className="text-primary-400 hover:text-primary-300 transition-colors p-1">
                  <Download className="w-4 h-4" />
                </button>
                {file.user_id === currentUser?.id && (
                  <button onClick={() => deleteFile(file)} className="text-slate-500 hover:text-red-400 transition-colors p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
