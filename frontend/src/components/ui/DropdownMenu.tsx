import { Fragment, type ReactNode } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { cn } from '@/lib/utils';

interface DropdownItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface DropdownMenuProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
}

export function DropdownMenu({ trigger, items, align = 'right' }: DropdownMenuProps) {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button as={Fragment}>{trigger}</Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items
          className={cn(
            'absolute z-50 mt-1 w-48 rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {items.map((item) => (
            <Menu.Item key={item.label} disabled={item.disabled}>
              {({ active }) => (
                <button
                  onClick={item.onClick}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-sm',
                    active && !item.danger && 'bg-gray-50',
                    active && item.danger && 'bg-red-50',
                    item.danger ? 'text-red-600' : 'text-gray-700',
                    item.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {item.icon && <span className="h-4 w-4">{item.icon}</span>}
                  {item.label}
                </button>
              )}
            </Menu.Item>
          ))}
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
