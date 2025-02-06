import React from 'react';
import { Palette } from 'lucide-react';
import UserMenu from './UserMenu';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center space-x-2.5">
          <Palette className="w-9 h-9 text-indigo-600 transform -rotate-12 hover:scale-110 transition-transform" />
          <div className="flex items-baseline">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent hover:from-indigo-500 hover:via-purple-500 hover:to-pink-400 transition-colors">
              Art<span className="font-extrabold">Flow</span>
            </h1>
            <span className="ml-2 text-sm font-medium text-gray-400 tracking-wider">BETA</span>
          </div>
        </div>
        <UserMenu />
      </div>
    </header>
  );
}