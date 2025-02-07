import React, { useState, useRef } from 'react';
import { Type, ArrowLeft, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, Download } from 'lucide-react';

interface DocumentProps {
  fileName: string;
  onClose?: () => void;
}

const Document: React.FC<DocumentProps> = ({ fileName, onClose }) => {
  const [content, setContent] = useState('');
  const [fontSize, setFontSize] = useState(14);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [textAlign, setTextAlign] = useState('left');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-50 to-blue-50 overflow-hidden">
      <div className="h-screen w-full max-w-[1920px] mx-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 bg-white/80 backdrop-blur-sm border-b border-purple-100">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-purple-50 rounded-lg text-purple-600 hover:text-purple-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                {fileName}
              </h1>
              <p className="text-sm text-gray-600">Document Editor</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 min-h-0">
          {/* Left Toolbar */}
          <div className="w-[280px] bg-white/80 backdrop-blur-sm border-r border-purple-100 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Text Formatting */}
              <div className="bg-white rounded-lg border border-purple-100 p-3 shadow-sm">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Text Formatting</h3>
                <div className="space-y-3">
                  {/* Font Size */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-gray-600">Font Size</span>
                      <span className="text-xs font-medium text-gray-700">{fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="12"
                      max="48"
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {/* Font Style */}
                  <div>
                    <div className="text-xs text-gray-600 mb-2">Font Style</div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setIsBold(!isBold)}
                        className={`p-2 rounded-lg flex items-center gap-1 transition-colors ${
                          isBold ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-purple-50 text-gray-700'
                        }`}
                      >
                        <Bold className="w-4 h-4" />
                        <span className="text-xs">Bold</span>
                      </button>
                      <button
                        onClick={() => setIsItalic(!isItalic)}
                        className={`p-2 rounded-lg flex items-center gap-1 transition-colors ${
                          isItalic ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-purple-50 text-gray-700'
                        }`}
                      >
                        <Italic className="w-4 h-4" />
                        <span className="text-xs">Italic</span>
                      </button>
                      <button
                        onClick={() => setIsUnderline(!isUnderline)}
                        className={`p-2 rounded-lg flex items-center gap-1 transition-colors ${
                          isUnderline ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-purple-50 text-gray-700'
                        }`}
                      >
                        <Underline className="w-4 h-4" />
                        <span className="text-xs">Underline</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Text Alignment */}
              <div className="bg-white rounded-lg border border-purple-100 p-3 shadow-sm">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Text Alignment</h3>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => setTextAlign('left')}
                    className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-colors ${
                      textAlign === 'left' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-purple-50 text-gray-700'
                    }`}
                  >
                    <AlignLeft className="w-4 h-4" />
                    <span className="text-xs">Left</span>
                  </button>
                  <button
                    onClick={() => setTextAlign('center')}
                    className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-colors ${
                      textAlign === 'center' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-purple-50 text-gray-700'
                    }`}
                  >
                    <AlignCenter className="w-4 h-4" />
                    <span className="text-xs">Center</span>
                  </button>
                  <button
                    onClick={() => setTextAlign('right')}
                    className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-colors ${
                      textAlign === 'right' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-purple-50 text-gray-700'
                    }`}
                  >
                    <AlignRight className="w-4 h-4" />
                    <span className="text-xs">Right</span>
                  </button>
                  <button
                    onClick={() => setTextAlign('justify')}
                    className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-colors ${
                      textAlign === 'justify' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-purple-50 text-gray-700'
                    }`}
                  >
                    <AlignJustify className="w-4 h-4" />
                    <span className="text-xs">Justify</span>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white rounded-lg border border-purple-100 p-3 shadow-sm">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={handleDownload}
                    className="w-full px-4 py-2 bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-600 font-medium flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Document Area */}
          <div className="flex-1 bg-gray-50 overflow-auto flex items-center justify-center p-8">
            <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg p-8">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                style={{
                  fontSize: `${fontSize}px`,
                  fontWeight: isBold ? 'bold' : 'normal',
                  fontStyle: isItalic ? 'italic' : 'normal',
                  textDecoration: isUnderline ? 'underline' : 'none',
                  textAlign: textAlign,
                }}
                className="w-full h-full min-h-[500px] resize-none focus:outline-none"
                placeholder="Start typing..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Document;
