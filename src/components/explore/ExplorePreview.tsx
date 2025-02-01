import React from 'react';
import { X, Heart, Eye, Download } from 'lucide-react';
import type { ExploreItem } from '../../types';

interface ExplorePreviewProps {
  item: ExploreItem;
  onClose: () => void;
}

export default function ExplorePreview({ item, onClose }: ExplorePreviewProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src={item.author.avatar}
              alt={item.author.name}
              className="w-8 h-8 rounded-full"
            />
            <div>
              <h3 className="font-medium text-gray-900">{item.title}</h3>
              <p className="text-sm text-gray-500">by {item.author.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto">
          <div className="relative">
            <img
              src={item.thumbnail}
              alt={item.title}
              className="w-full h-auto"
            />
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button className="flex items-center space-x-1 text-gray-600 hover:text-red-500 transition-colors">
              <Heart className="w-5 h-5" />
              <span>{item.likes}</span>
            </button>
            <div className="flex items-center space-x-1 text-gray-600">
              <Eye className="w-5 h-5" />
              <span>{item.views}</span>
            </div>
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>
        </div>
      </div>
    </div>
  );
}