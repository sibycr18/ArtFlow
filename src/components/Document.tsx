import React, { useState } from 'react';
import { Type, ArrowLeft } from 'lucide-react';

interface DocumentProps {
  fileName: string;
  onClose?: () => void;
}

const Document: React.FC<DocumentProps> = ({ fileName, onClose }) => {
  const [content, setContent] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-purple-100">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-purple-100">
                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-purple-50 rounded-lg text-purple-600 hover:text-purple-700 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Type className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                      {fileName}
                    </h1>
                    <p className="text-sm text-gray-600">Document</p>
                  </div>
                </div>
              </div>

              {/* Editor */}
              <div className="p-6">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-[calc(100vh-280px)] p-4 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none bg-white/80 backdrop-blur-sm"
                  placeholder="Start typing..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Document;
