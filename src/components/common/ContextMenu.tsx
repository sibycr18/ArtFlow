import React, { useEffect, useRef } from 'react';

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  danger?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
}

export default function ContextMenu({ items, position, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      style={{
        top: position.y,
        left: position.x,
      }}
      className="fixed bg-white rounded-lg shadow-lg py-1 min-w-[160px] z-50 border border-indigo-100"
    >
      {items.map((item, index) => (
        <button
          key={index}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          className={`w-full px-4 py-2 text-left flex items-center space-x-2 transition-colors
            ${item.danger 
              ? 'text-red-600 hover:bg-red-50' 
              : 'text-gray-700 hover:bg-indigo-50'
            }
            ${item.icon ? 'space-x-2' : ''}`}
        >
          {item.icon && <item.icon className={`w-4 h-4 ${item.danger ? 'text-red-500' : 'text-indigo-500'}`} />}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
