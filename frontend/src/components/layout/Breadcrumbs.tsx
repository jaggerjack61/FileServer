import { Link } from 'react-router-dom';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';

interface BreadcrumbItem {
  label: string;
  folderId?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-1 text-sm min-w-0 overflow-x-auto">
      <Link
        to="/files"
        className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
      >
        <HomeIcon className="h-4 w-4" />
        <span>My Files</span>
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div key={item.folderId || index} className="flex items-center gap-1 min-w-0 flex-shrink-0">
            <ChevronRightIcon className="h-3 w-3 text-gray-400 flex-shrink-0" />
            {isLast ? (
              <span className="font-medium text-gray-900 truncate max-w-[200px]">
                {item.label}
              </span>
            ) : (
              <Link
                to={`/files?folder=${item.folderId}`}
                className="text-gray-500 hover:text-gray-700 transition-colors truncate max-w-[160px]"
              >
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
