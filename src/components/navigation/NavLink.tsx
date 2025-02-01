import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

interface NavLinkProps {
  to: string;
  icon: LucideIcon;
  label: string;
  isCollapsed: boolean;
}

export default function NavLink({ to, icon: Icon, label, isCollapsed }: NavLinkProps) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`
        flex items-center ${isCollapsed ? 'justify-center' : 'space-x-2 px-4'} 
        py-2 text-sm font-medium rounded-lg
        transition-all duration-300 ease-in-out
        ${isActive ? 'text-indigo-600 bg-indigo-50' : 'text-gray-600 hover:bg-gray-50'}
      `}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span 
        className={`
          whitespace-nowrap overflow-hidden transition-all duration-300
          ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}
        `}
      >
        {label}
      </span>
    </Link>
  );
}