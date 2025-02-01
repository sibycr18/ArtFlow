import React from 'react';
import { Palette } from 'lucide-react';
import UserMenu from './UserMenu';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-2">
          <Palette className="w-7 h-7 text-indigo-600 transform -rotate-12" />
          <div className="flex items-baseline">
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Art<span className="font-extrabold">Flow</span>
            </h1>
            <span className="ml-2 text-xs font-medium text-gray-400 tracking-wider">BETA</span>
          </div>
        </div>
        <UserMenu />
      </div>
    </header>
  );
}