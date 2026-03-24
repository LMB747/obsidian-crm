/**
 * FileDropzone — zone de drag & drop pour upload de fichiers
 * Basé sur react-dropzone. Stocke en base64 dans le store.
 */
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { toast } from '../ui/Toast';

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string;        // base64
  uploadedAt: string;
}

interface FileDropzoneProps {
  onFilesAdded: (files: UploadedFile[]) => void;
  accept?: Record<string, string[]>;
  maxFiles?: number;
  maxSizeMB?: number;
  label?: string;
  files?: UploadedFile[];
  onRemove?: (id: string) => void;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFilesAdded,
  accept = { 'image/*': [], 'application/pdf': [] },
  maxFiles = 5,
  maxSizeMB = 2,
  label,
  files = [],
  onRemove,
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const maxBytes = maxSizeMB * 1024 * 1024;
    const results: UploadedFile[] = [];

    acceptedFiles.forEach(file => {
      if (file.size > maxBytes) {
        toast.warning('Fichier trop volumineux', `${file.name} dépasse ${maxSizeMB}MB`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        results.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: file.name,
          type: file.type,
          size: file.size,
          data: reader.result as string,
          uploadedAt: new Date().toISOString(),
        });
        if (results.length === acceptedFiles.filter(f => f.size <= maxBytes).length) {
          onFilesAdded(results);
        }
      };
      reader.readAsDataURL(file);
    });
  }, [onFilesAdded, maxSizeMB]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={clsx(
          'border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all',
          isDragActive
            ? 'border-primary-500 bg-primary-500/10'
            : 'border-card-border hover:border-primary-500/50 hover:bg-primary-500/5'
        )}
      >
        <input {...getInputProps()} />
        <Upload className={clsx('w-5 h-5 mx-auto mb-1', isDragActive ? 'text-primary-400' : 'text-slate-500')} />
        <p className="text-xs text-slate-400">
          {label || 'Glissez vos fichiers ici ou cliquez pour sélectionner'}
        </p>
        <p className="text-[10px] text-slate-600 mt-0.5">Max {maxSizeMB}MB par fichier</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map(f => (
            <div key={f.id} className="flex items-center gap-2 bg-obsidian-700/50 border border-card-border rounded-lg px-2.5 py-1.5">
              <File className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white truncate">{f.name}</p>
                <p className="text-[10px] text-slate-500">{formatSize(f.size)}</p>
              </div>
              {onRemove && (
                <button onClick={() => onRemove(f.id)} className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
