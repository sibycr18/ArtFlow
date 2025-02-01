import React from 'react';
import { Layout, Compass, Menu } from 'lucide-react';
import { useSidebar } from '../contexts/SidebarContext';
import NavLink from './navigation/NavLink';

export default function Sidebar() {
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <div 
      className={`
        bg-white border-r border-gray-200 h-screen flex flex-col
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-48'}
      `}
    >
      <div className="p-4">
        <div className="flex items-center space-x-2 mb-8">
          <button
            onClick={toggleSidebar}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Menu className="w-5 h-5 text-indigo-600" />
          </button>
        </div>
        <nav className="space-y-2">
          <NavLink
            to="/"
            icon={Layout}
            label="Dashboard"
            isCollapsed={isCollapsed}
          />
          <NavLink
            to="/explore"
            icon={Compass}
            label="Explore"
            isCollapsed={isCollapsed}
          />
        </nav>
      </div>
    </div>
  );
}