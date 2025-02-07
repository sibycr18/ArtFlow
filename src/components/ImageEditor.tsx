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
                  <button
                    onClick={() => rotate('left')}
                    className="p-2 hover:bg-purple-50 rounded-lg text-gray-600 flex flex-col items-center gap-1"
                  >
                    <RotateCcw className="w-5 h-5" />
                    <span className="text-xs">Rotate Left</span>
                  </button>
                  <button
                    onClick={() => rotate('right')}
                    className="p-2 hover:bg-purple-50 rounded-lg text-gray-600 flex flex-col items-center gap-1"
                  >
                    <RotateCw className="w-5 h-5" />
                    <span className="text-xs">Rotate Right</span>
                  </button>
                  <button
                    onClick={() => zoom(0.1)}
                    className="p-2 hover:bg-purple-50 rounded-lg text-gray-600 flex flex-col items-center gap-1"
                  >
                    <ZoomIn className="w-5 h-5" />
                    <span className="text-xs">Zoom In</span>
                  </button>
                  <button
                    onClick={() => zoom(-0.1)}
                    className="p-2 hover:bg-purple-50 rounded-lg text-gray-600 flex flex-col items-center gap-1"
                  >
                    <ZoomOut className="w-5 h-5" />
                    <span className="text-xs">Zoom Out</span>
                  </button>
                </div>
              </div>

              {/* History */}
              <div className="bg-white rounded-lg border border-purple-100 p-3 shadow-sm">
                <h3 className="text-sm font-medium text-gray-700 mb-3">History</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    className="p-2 hover:bg-purple-50 rounded-lg text-gray-600 flex flex-col items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Undo className="w-5 h-5" />
                    <span className="text-xs">Undo</span>
                  </button>
                  <button
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    className="p-2 hover:bg-purple-50 rounded-lg text-gray-600 flex flex-col items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Redo className="w-5 h-5" />
                    <span className="text-xs">Redo</span>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white rounded-lg border border-purple-100 p-3 shadow-sm">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={downloadImage}
                    className="w-full px-4 py-2 bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-600 font-medium flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 bg-gray-50 overflow-auto flex items-center justify-center p-8">
            <div
              style={{
                transform: `scale(${scale})`,
                transition: 'transform 0.2s ease-out',
              }}
              className="shadow-lg"
            >
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-full bg-white"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
