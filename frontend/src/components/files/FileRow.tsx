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
  DocumentDuplicateIcon,
  EyeIcon,
  InformationCircleIcon,
  PencilIcon,
  ScissorsIcon,
  TrashIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { EllipsisVerticalIcon } from '@heroicons/react/24/solid';
import type { FileItem } from '@/types';
import { formatFileSize, formatRelativeDate, getFileIcon, getFileColorClass, getFilePreviewKind } from '@/lib/utils';
import { DropdownMenu } from '@/components/ui/DropdownMenu';

interface FileRowProps {
  file: FileItem;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onDownload: () => void;
  onDelete: () => void;
  onRename: () => void;
  onCopy?: () => void;
  onCut?: () => void;
  onMove?: () => void;
  onCompress?: () => void;
  onExtract?: () => void;
  onPreview?: () => void;
  onProperties?: () => void;
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

export function FileRow({
  file,
  selected,
  onSelect,
  onDownload,
  onDelete,
  onRename,
  onCopy,
  onCut,
  onMove,
  onCompress,
  onExtract,
  onPreview,
  onProperties,
  onContextMenu,
  onDoubleClick,
}: FileRowProps) {
  const iconType = getFileIcon(file.file_type);
  const colorClass = getFileColorClass(file.file_type);
  const Icon = iconMap[iconType] || DocumentIcon;
  const canPreview = getFilePreviewKind(file.file_type, file.original_filename) !== 'none';

  const dropdownItems = [
    { label: 'Preview', icon: <EyeIcon className="h-4 w-4" />, onClick: () => onPreview?.(), disabled: !canPreview || !onPreview },
    { label: 'Properties', icon: <InformationCircleIcon className="h-4 w-4" />, onClick: () => onProperties?.(), disabled: !onProperties },
    { label: 'Download', icon: <ArrowDownTrayIcon className="h-4 w-4" />, onClick: onDownload },
    ...(onCopy ? [{ label: 'Copy', icon: <DocumentDuplicateIcon className="h-4 w-4" />, onClick: onCopy }] : []),
    ...(onCut ? [{ label: 'Cut', icon: <ScissorsIcon className="h-4 w-4" />, onClick: onCut }] : []),
    { label: 'Rename', icon: <PencilIcon className="h-4 w-4" />, onClick: onRename },
    ...(onMove ? [{ label: 'Move to...', icon: <ArrowRightIcon className="h-4 w-4" />, onClick: onMove }] : []),
    ...(onCompress ? [{ label: 'Compress', icon: <ArchiveBoxIcon className="h-4 w-4" />, onClick: onCompress }] : []),
    ...(onExtract ? [{ label: 'Extract', icon: <ArchiveBoxArrowDownIcon className="h-4 w-4" />, onClick: onExtract }] : []),
    { label: 'Delete', icon: <TrashIcon className="h-4 w-4" />, onClick: onDelete, danger: true },
  ];

  return (
    <tr
      className={`group hover:bg-gray-50 transition-colors dark:hover:bg-white/[0.04] ${selected ? 'bg-blue-50 dark:bg-cyan-400/10' : ''}`}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
    >
      {onSelect && (
        <td className="px-4 py-3 w-10">
          <input
            type="checkbox"
            checked={!!selected}
            onChange={() => onSelect(file.id)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </td>
      )}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {file.thumbnail_url ? (
            <img
              src={file.thumbnail_url}
              alt={file.original_filename}
              className="h-8 w-8 rounded object-cover border border-gray-200 flex-shrink-0"
            />
          ) : (
            <Icon className={`h-5 w-5 flex-shrink-0 ${colorClass}`} />
          )}
          <span className="text-sm font-medium text-gray-900 truncate max-w-xs dark:text-white" title={file.original_filename}>
            {file.original_filename}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-slate-400">
        {formatFileSize(file.file_size)}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-slate-400">
        {formatRelativeDate(file.updated_at)}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-slate-400">
        {file.owner.username}
      </td>
      <td className="px-4 py-3 text-right">
        <DropdownMenu
          trigger={
            <button className="rounded-lg p-1 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-200 hover:text-gray-600 transition-all dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-slate-300">
              <EllipsisVerticalIcon className="h-4 w-4" />
            </button>
          }
          items={dropdownItems}
        />
      </td>
    </tr>
  );
}
