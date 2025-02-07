import React, { useRef, useState, useEffect } from 'react';
import { 
  ArrowLeft, Download, RotateCcw, RotateCw, ZoomIn, ZoomOut, 
  Maximize2, Minimize2, Crop, Trash2, Undo, Redo 
} from 'lucide-react';

interface ImageEditorProps {
  fileName: string;
  onClose: () => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ fileName, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    console.log('ImageEditor mounted');
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('No canvas ref');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('No canvas context');
      return;
    }

    console.log('Setting up canvas');
    // For testing purposes, let's create a sample image
    canvas.width = 800;
    canvas.height = 600;
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = '24px Arial';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    ctx.fillText('Image Editor', canvas.width / 2, canvas.height / 2);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    saveToHistory(imageData);
    console.log('Canvas setup complete');
  }, []);

  const saveToHistory = (imageData: ImageData) => {
    setHistory(prev => [...prev.slice(0, historyIndex + 1), imageData]);
    setHistoryIndex(prev => prev + 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      setHistoryIndex(prev => prev - 1);
      ctx.putImageData(history[historyIndex - 1], 0, 0);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      setHistoryIndex(prev => prev + 1);
      ctx.putImageData(history[historyIndex + 1], 0, 0);
    }
  };

  const rotate = (direction: 'left' | 'right') => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !originalImage) return;

    const angle = direction === 'left' ? -90 : 90;
    setRotation(prev => (prev + angle) % 360);

    // Create a temporary canvas to handle rotation
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Swap width and height if rotating by 90 or 270 degrees
    const rad = (rotation * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    canvas.width = originalImage.height * sin + originalImage.width * cos;
    canvas.height = originalImage.height * cos + originalImage.width * sin;

    // Move to center and rotate
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(originalImage, -originalImage.width / 2, -originalImage.height / 2);

    saveToHistory(ctx.getImageData(0, 0, canvas.width, canvas.height));
  };

  const zoom = (factor: number) => {
    setScale(prev => Math.max(0.1, Math.min(3, prev + factor)));
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = fileName;
    link.href = canvas.toDataURL();
    link.click();
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
              <p className="text-sm text-gray-600">Image Editor</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 min-h-0">
          {/* Left Toolbar */}
          <div className="w-[280px] bg-white/80 backdrop-blur-sm border-r border-purple-100 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Transform Tools */}
              <div className="bg-white rounded-lg border border-purple-100 p-3 shadow-sm">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Transform</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: RotateCcw, action: () => rotate('left'), label: 'Rotate Left' },
                    { icon: RotateCw, action: () => rotate('right'), label: 'Rotate Right' },
                    { icon: ZoomIn, action: () => zoom(0.1), label: 'Zoom In' },
                    { icon: ZoomOut, action: () => zoom(-0.1), label: 'Zoom Out' }
                  ].map(({ icon: Icon, action, label }) => (
                    <button
                      key={label}
                      onClick={action}
                      className="p-2 rounded-lg flex flex-col items-center gap-1 transition-colors hover:bg-purple-50 text-gray-700"
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white rounded-lg border border-purple-100 p-3 shadow-sm">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Actions</h3>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button
                      onClick={undo}
                      disabled={historyIndex <= 0}
                      className="px-4 py-2 bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-600 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Undo className="w-4 h-4" />
                      Undo
                    </button>
                    <button
                      onClick={redo}
                      disabled={historyIndex >= history.length - 1}
                      className="px-4 py-2 bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-600 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Redo className="w-4 h-4" />
                      Redo
                    </button>
                  </div>
                  <button
                    onClick={downloadImage}
                    className="w-full px-4 py-2 bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-600 font-medium flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    onClick={() => {
                      const canvas = canvasRef.current;
                      const ctx = canvas?.getContext('2d');
                      if (!canvas || !ctx) return;
                      ctx.clearRect(0, 0, canvas.width, canvas.height);
                      saveToHistory(ctx.getImageData(0, 0, canvas.width, canvas.height));
                    }}
                    className="w-full px-4 py-2 bg-red-50 hover:bg-red-100 rounded-lg text-red-600 font-medium flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear Image
                  </button>
                </div>
              </div>

              {/* Scale Control */}
              <div className="bg-white rounded-lg border border-purple-100 p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-700">Scale</h3>
                  <span className="text-xs font-medium text-gray-600">{Math.round(scale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="300"
                  value={scale * 100}
                  onChange={(e) => setScale(parseInt(e.target.value) / 100)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-h-0 relative flex items-center justify-center bg-gray-50">
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-full object-contain"
              style={{
                transform: `scale(${scale})`,
                transition: 'transform 0.2s ease-in-out'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
