import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

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

  const setPosition = useCallback(() => {
    if (!menuRef.current) return;

    const menu = menuRef.current;
    const { innerWidth, innerHeight } = window;
    const { offsetWidth, offsetHeight } = menu;
    const { x, y } = position;

    // Calculate position
    let menuX = x;
    let menuY = y;

    // Check right boundary
    if (x + offsetWidth > innerWidth) {
      menuX = x - offsetWidth;
    }

    // Check bottom boundary
    if (y + offsetHeight > innerHeight) {
      menuY = y - offsetHeight;
    }

    // Check left boundary
    if (menuX < 0) {
      menuX = 0;
    }

    // Check top boundary
    if (menuY < 0) {
      menuY = 0;
    }

    menu.style.transform = `translate3d(${menuX}px, ${menuY}px, 0)`;
  }, [position]);

  useEffect(() => {
    setPosition();
    
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleScroll = () => {
      onClose();
    };

    const handleResize = () => {
      onClose();
    };

    // Add event listeners
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [onClose, setPosition]);

  return createPortal(
    <div
      ref={menuRef}
      className="fixed top-0 left-0 bg-white rounded-lg shadow-lg py-1 min-w-[160px] z-[9999] border border-gray-200"
      style={{ 
        pointerEvents: 'auto',
        willChange: 'transform',
      }}
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
    </div>,
    document.body
  );
}
