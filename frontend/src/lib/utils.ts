import { formatDistanceToNow } from 'date-fns';

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
  return `${size} ${units[i]}`;
}

export function formatRelativeDate(dateString: string): string {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true });
}

export function getFileIcon(fileType: string): string {
  if (fileType.startsWith('image/')) return 'photo';
  if (fileType.startsWith('video/')) return 'video';
  if (fileType.startsWith('audio/')) return 'audio';
  if (fileType === 'application/pdf') return 'pdf';
  if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType === 'text/csv') return 'spreadsheet';
  if (fileType.includes('document') || fileType.includes('word')) return 'document';
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) return 'presentation';
  if (fileType.includes('zip') || fileType.includes('archive') || fileType.includes('compressed')) return 'archive';
  if (fileType.startsWith('text/') || fileType.includes('json') || fileType.includes('xml')) return 'text';
  return 'file';
}

export function isArchiveFile(fileType: string, filename?: string): boolean {
  const normalizedType = (fileType || '').toLowerCase();
  const normalizedName = (filename || '').toLowerCase();
  return (
    normalizedType.includes('zip') ||
    normalizedType.includes('archive') ||
    normalizedType.includes('compressed') ||
    normalizedName.endsWith('.zip')
  );
}

export function getFileColorClass(fileType: string): string {
  const icon = getFileIcon(fileType);
  const colors: Record<string, string> = {
    photo: 'text-pink-500',
    video: 'text-purple-500',
    audio: 'text-yellow-500',
    pdf: 'text-red-500',
    spreadsheet: 'text-green-500',
    document: 'text-blue-500',
    presentation: 'text-orange-500',
    archive: 'text-gray-500',
    text: 'text-gray-600',
    file: 'text-gray-400',
  };
  return colors[icon] || 'text-gray-400';
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function getStoragePercentage(used: number, quota: number): number {
  if (quota === 0) return 0;
  return Math.min(Math.round((used / quota) * 100), 100);
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : '';
}
