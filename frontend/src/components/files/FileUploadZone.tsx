import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface FileUploadZoneProps {
  onUpload: (files: File[]) => void;
  isUploading?: boolean;
  className?: string;
}

export function FileUploadZone({ onUpload, isUploading = false, className }: FileUploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onUpload(acceptedFiles);
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isUploading,
    noClick: false,
    noKeyboard: false,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors cursor-pointer',
        isDragActive
          ? 'border-blue-500 bg-blue-50 dark:border-cyan-400 dark:bg-cyan-400/10'
          : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20 dark:hover:bg-white/[0.06]',
        isUploading && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <input {...getInputProps()} />
      <CloudArrowUpIcon
        className={cn(
          'h-10 w-10 mb-3',
          isDragActive ? 'text-blue-500' : 'text-gray-400'
        )}
      />
      {isDragActive ? (
        <p className="text-sm font-medium text-blue-600">Drop files here...</p>
      ) : isUploading ? (
        <p className="text-sm font-medium text-gray-500">Uploading...</p>
      ) : (
        <>
          <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
            Drag & drop files here
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
            or click to browse
          </p>
        </>
      )}
    </div>
  );
}
