import React from 'react';
import { Heart, Eye } from 'lucide-react';
import type { ExploreItem } from '../../types';

interface ExploreCardProps {
  item: ExploreItem;
  onClick: () => void;
}

export default function ExploreCard({ item, onClick }: ExploreCardProps) {
  return (
    <div 
      className="bg-white rounded-lg shadow-sm overflow-hidden group cursor-pointer"
      onClick={onClick}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={item.thumbnail}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gray-900">{item.title}</h3>
          <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-full">
            {item.type}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img
              src={item.author.avatar}
              alt={item.author.name}
              className="w-6 h-6 rounded-full"
            />
            <span className="text-sm text-gray-600">{item.author.name}</span>
          </div>
          
          <div className="flex items-center space-x-3 text-gray-500">
            <div className="flex items-center space-x-1">
              <Heart className="w-4 h-4" />
              <span className="text-xs">{item.likes}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Eye className="w-4 h-4" />
              <span className="text-xs">{item.views}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}