import {
  ArchiveBoxArrowDownIcon,
  DocumentIcon,
  PhotoIcon,
  FilmIcon,
  MusicalNoteIcon,
  DocumentTextIcon,
  TableCellsIcon,
  PresentationChartBarIcon,
  ArchiveBoxIcon,
  ArrowDownTrayIcon,
  ArrowRightIcon,
  DocumentDuplicateIcon,
  PencilIcon,
  ScissorsIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { EllipsisVerticalIcon } from '@heroicons/react/24/solid';
import type { FileItem } from '@/types';
import { formatFileSize, formatRelativeDate, getFileIcon, getFileColorClass } from '@/lib/utils';
import { DropdownMenu } from '@/components/ui/DropdownMenu';

interface FileCardProps {
  file: FileItem;
  selected?: boolean;
  showSelection?: boolean;
  onSelect?: (id: string) => void;
  onDownload: () => void;
  onDelete: () => void;
  onRename: () => void;
  onCopy?: () => void;
  onCut?: () => void;
  onMove?: () => void;
  onCompress?: () => void;
  onExtract?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onDoubleClick?: () => void;
}

const iconMap: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  photo: PhotoIcon,
  video: FilmIcon,
  audio: MusicalNoteIcon,
  pdf: DocumentTextIcon,
  spreadsheet: TableCellsIcon,
  document: DocumentTextIcon,
  presentation: PresentationChartBarIcon,
  archive: ArchiveBoxIcon,
  text: DocumentTextIcon,
  file: DocumentIcon,
};

export function FileCard({
  file,
  selected,
  showSelection,
  onSelect,
  onDownload,
  onDelete,
  onRename,
  onCopy,
  onCut,
  onMove,
  onCompress,
  onExtract,
  onContextMenu,
  onDoubleClick,
}: FileCardProps) {
  const iconType = getFileIcon(file.file_type);
  const colorClass = getFileColorClass(file.file_type);
  const Icon = iconMap[iconType] || DocumentIcon;

  const dropdownItems = [
    { label: 'Download', icon: <ArrowDownTrayIcon />, onClick: onDownload },
    ...(onCopy ? [{ label: 'Copy', icon: <DocumentDuplicateIcon />, onClick: onCopy }] : []),
    ...(onCut ? [{ label: 'Cut', icon: <ScissorsIcon />, onClick: onCut }] : []),
    { label: 'Rename', icon: <PencilIcon />, onClick: onRename },
    ...(onMove ? [{ label: 'Move to...', icon: <ArrowRightIcon />, onClick: onMove }] : []),
    ...(onCompress ? [{ label: 'Compress', icon: <ArchiveBoxIcon />, onClick: onCompress }] : []),
    ...(onExtract ? [{ label: 'Extract', icon: <ArchiveBoxArrowDownIcon />, onClick: onExtract }] : []),
    { label: 'Delete', icon: <TrashIcon />, onClick: onDelete, danger: true },
  ];

  return (
    <div
      className={`group relative rounded-xl border bg-white p-4 hover:bg-gray-50 hover:shadow-sm transition-all ${selected ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-400' : 'border-gray-200'}`}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
    >
      {onSelect && (
        <div className={`absolute left-2 top-2 ${showSelection || selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
          <input
            type="checkbox"
            checked={!!selected}
            onChange={() => onSelect(file.id)}
            onClick={(e) => e.stopPropagation()}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>
      )}

      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu
          trigger={
            <button className="rounded-lg p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors">
              <EllipsisVerticalIcon className="h-4 w-4" />
            </button>
          }
          items={dropdownItems}
        />
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="mb-3">
          {file.thumbnail_url ? (
            <img
              src={file.thumbnail_url}
              alt={file.original_filename}
              className="h-12 w-12 rounded object-cover border border-gray-200"
            />
          ) : (
            <Icon className={`h-12 w-12 ${colorClass}`} />
          )}
        </div>
        <p className="text-sm font-medium text-gray-900 truncate w-full" title={file.original_filename}>
          {file.original_filename}
        </p>
        <p className="mt-0.5 text-xs text-gray-500">
          {formatFileSize(file.file_size)}
        </p>
        <p className="mt-0.5 text-xs text-gray-400">
          {formatRelativeDate(file.updated_at)}
        </p>
      </div>
    </div>
  );
}
