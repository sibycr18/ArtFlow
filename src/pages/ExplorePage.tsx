import React, { useState } from 'react';
import { Search, Compass } from 'lucide-react';
import ExploreCard from '../components/explore/ExploreCard';
import ExplorePreview from '../components/explore/ExplorePreview';
import { exploreItems } from '../data/exploreData';
import type { ExploreItem } from '../types';

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<ExploreItem | null>(null);
  
  const filteredItems = exploreItems.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.author.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-purple-100">
          <div className="p-8 border-b border-purple-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Compass className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent pb-[2px]">
                    Explore
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">Discover amazing artworks from the community</p>
                </div>
              </div>
              <div className="relative max-w-md">
                <input
                  type="text"
                  placeholder="Search artworks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-purple-100 rounded-lg bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                />
                <Search className="w-5 h-5 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.map((item) => (
                <ExploreCard 
                  key={item.id} 
                  item={item} 
                  onClick={() => setSelectedItem(item)}
                />
              ))}
              {filteredItems.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-12">
                  <div className="p-4 bg-purple-50 rounded-full mb-4">
                    <Compass className="w-8 h-8 text-purple-400" />
                  </div>
                  <p className="text-gray-500 text-center">
                    No artworks found. Try a different search term!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedItem && (
        <ExplorePreview 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)} 
        />
      )}
    </div>
  );
}