import React, { useState, useRef, useEffect } from 'react';
import { 
  Brush, Eraser, Square, Circle, Triangle, 
  ChevronDown, Download, Trash2, 
  Bold, Italic, Underline, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  ArrowLeft
} from 'lucide-react';
import ColorPicker from './ColorPicker';

interface CanvasProps {
  width?: number;
  height?: number;
  onClose?: () => void;
}

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

type Tool = 'brush' | 'eraser' | 'rectangle' | 'circle' | 'triangle';

const Canvas: React.FC<CanvasProps> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool>('brush');
  const [brushSize, setBrushSize] = useState(5);
  const [eraserSize, setEraserSize] = useState(20);
  const [color, setColor] = useState('#000000');
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(1280);
  const [canvasHeight, setCanvasHeight] = useState(720);

  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const container = containerRef.current;
        const maxWidth = container.clientWidth - 64; // 32px padding on each side
        const maxHeight = container.clientHeight - 64;
        
        // Keep 16:9 aspect ratio
        const aspectRatio = 16 / 9;
        let width = maxWidth;
        let height = width / aspectRatio;

        if (height > maxHeight) {
          height = maxHeight;
          width = height * aspectRatio;
        }

        setCanvasWidth(Math.floor(width));
        setCanvasHeight(Math.floor(height));
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    // Initial size
    updateCanvasSize();

    // Update size when window resizes
    const resizeObserver = new ResizeObserver(updateCanvasSize);
    resizeObserver.observe(canvas);

    // Create base canvas for shape preview
    const baseCanvas = document.createElement('canvas');
    baseCanvas.width = canvas.width;
    baseCanvas.height = canvas.height;
    baseCanvasRef.current = baseCanvas;

    return () => resizeObserver.disconnect();
  }, []);

  const getMousePos = (e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    return { x, y };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    setStartPos({ x, y });

    // Save the current canvas state for shape preview
    if (baseCanvasRef.current && (selectedTool === 'rectangle' || selectedTool === 'circle' || selectedTool === 'triangle')) {
      const baseCtx = baseCanvasRef.current.getContext('2d');
      if (baseCtx) {
        baseCtx.clearRect(0, 0, canvas.width, canvas.height);
        baseCtx.drawImage(canvas, 0, 0);
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (selectedTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = eraserSize;
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else if (selectedTool === 'brush') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = brushSize;
      ctx.strokeStyle = color;
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else {
      // For shapes, restore the base canvas and draw the preview
      if (baseCanvasRef.current) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(baseCanvasRef.current, 0, 0);
        
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSize;
        ctx.globalCompositeOperation = 'source-over';

        if (selectedTool === 'rectangle') {
          const width = x - startPos.x;
          const height = y - startPos.y;
          ctx.strokeRect(startPos.x, startPos.y, width, height);
        } else if (selectedTool === 'circle') {
          // Calculate radius based on the maximum distance in either direction
          const dx = x - startPos.x;
          const dy = y - startPos.y;
          const radius = Math.max(Math.abs(dx), Math.abs(dy));
          
          ctx.beginPath();
          ctx.arc(startPos.x, startPos.y, radius, 0, Math.PI * 2);
          ctx.stroke();
        } else if (selectedTool === 'triangle') {
          // Calculate the size based on drag distance
          const dx = x - startPos.x;
          const dy = y - startPos.y;
          const size = Math.max(Math.abs(dx), Math.abs(dy));
          
          // Calculate direction for proper orientation
          const directionX = Math.sign(dx) || 1;
          const directionY = Math.sign(dy) || 1;
          
          // Calculate triangle points for an equilateral triangle
          const height = size * Math.sqrt(3) / 2;
          
          // Calculate the three points of the triangle
          const topX = startPos.x;
          const topY = startPos.y;
          const leftX = startPos.x - size * directionX / 2;
          const leftY = startPos.y + height * directionY;
          const rightX = startPos.x + size * directionX / 2;
          const rightY = startPos.y + height * directionY;
          
          ctx.beginPath();
          ctx.moveTo(topX, topY);
          ctx.lineTo(leftX, leftY);
          ctx.lineTo(rightX, rightY);
          ctx.closePath();
          ctx.stroke();
        }
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setStartPos(null);

    // Reset composite operation
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.globalCompositeOperation = 'source-over';
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleColorChange = (newColor: string, shouldClose: boolean = false) => {
    setColor(newColor);
    if (shouldClose) {
      setShowColorPicker(false);
    }
    
    setRecentColors(prev => {
      if (prev.includes(newColor)) {
        return [newColor, ...prev.filter(c => c !== newColor)].slice(0, 5);
      }
      return [newColor, ...prev].slice(0, 5);
    });
  };

  const isColorLight = (hexColor: string) => {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    return (r * 0.299 + g * 0.587 + b * 0.114) > 186;
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'canvas.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleSizeChange = (value: number, type: 'brush' | 'eraser') => {
    const clampedValue = Math.min(Math.max(value, 2), 180);
    if (type === 'brush') {
      setBrushSize(clampedValue);
    } else {
      setEraserSize(clampedValue);
    }
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
                Canvas
              </h1>
              <p className="text-sm text-gray-600">Drawing Tools</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 min-h-0">
          {/* Left Toolbar */}
          <div className="w-[280px] bg-white/80 backdrop-blur-sm border-r border-purple-100 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Tools Section */}
              <div className="bg-white rounded-lg border border-purple-100 p-3 shadow-sm">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Drawing Tools</h3>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { icon: Brush, tool: 'brush' as Tool, label: 'Brush' },
                    { icon: Eraser, tool: 'eraser' as Tool, label: 'Eraser' },
                    { icon: Square, tool: 'rectangle' as Tool, label: 'Rectangle' },
                    { icon: Circle, tool: 'circle' as Tool, label: 'Circle' },
                    { icon: Triangle, tool: 'triangle' as Tool, label: 'Triangle' },
                  ].map(({ icon: Icon, tool, label }) => (
                    <button
                      key={tool}
                      onClick={() => setSelectedTool(tool)}
                      className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-colors ${
                        selectedTool === tool
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'hover:bg-purple-50 text-gray-700'
                      }`}
                      title={label}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tool Settings */}
              {selectedTool === 'brush' && (
                <div className="bg-white rounded-lg border border-purple-100 p-3 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700">Brush Size</h3>
                    <span className="text-xs font-medium text-gray-600">{brushSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={brushSize}
                    onChange={(e) => handleSizeChange(parseInt(e.target.value), 'brush')}
                    className="w-full"
                  />
                </div>
              )}

              {selectedTool === 'eraser' && (
                <div className="bg-white rounded-lg border border-purple-100 p-3 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700">Eraser Size</h3>
                    <span className="text-xs font-medium text-gray-600">{eraserSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={eraserSize}
                    onChange={(e) => handleSizeChange(parseInt(e.target.value), 'eraser')}
                    className="w-full"
                  />
                </div>
              )}

              {/* Color Section */}
              <div className="bg-white rounded-lg border border-purple-100 p-3 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Color</h3>
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="p-1 rounded hover:bg-purple-50 text-gray-600"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${showColorPicker ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <ColorPicker color={color} onChange={handleColorChange} />
                  <div className="flex-1">
                    <div className="text-xs text-gray-600">Current Color</div>
                    <div className="text-sm font-medium text-gray-700">{color}</div>
                  </div>
                </div>

                {showColorPicker && (
                  <div className="space-y-3 border-t pt-3">
                    {/* Recent Colors */}
                    {recentColors.length > 0 && (
                      <div>
                        <div className="text-xs text-gray-600 mb-2">Recent Colors</div>
                        <div className="grid grid-cols-6 gap-1">
                          {recentColors.map((recentColor) => (
                            <button
                              key={recentColor}
                              onClick={() => handleColorChange(recentColor)}
                              className="w-8 h-8 rounded-lg shadow-sm border border-gray-200 transition-transform hover:scale-105 active:scale-95"
                              style={{ backgroundColor: recentColor }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Preset Colors */}
                    <div>
                      <div className="text-xs text-gray-600 mb-2">Preset Colors</div>
                      <div className="grid grid-cols-6 gap-1">
                        {[
                          // Grayscale
                          '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF',
                          // Primary
                          '#FF0000', '#00FF00', '#0000FF',
                          // Secondary
                          '#FFFF00', '#00FFFF', '#FF00FF',
                          // Common Colors
                          '#FFA500', '#800080', '#008000', '#FFC0CB', '#A52A2A', '#FFD700',
                          // Additional Colors
                          '#4B0082', '#FF7F50', '#7B68EE', '#00FA9A', '#FF69B4', '#20B2AA'
                        ].map((presetColor) => (
                          <button
                            key={presetColor}
                            onClick={() => handleColorChange(presetColor)}
                            className="w-8 h-8 rounded-lg shadow-sm border border-gray-200 transition-transform hover:scale-105 active:scale-95"
                            style={{ backgroundColor: presetColor }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="bg-white rounded-lg border border-purple-100 p-3 shadow-sm">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={downloadCanvas}
                    className="w-full px-4 py-2 bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-600 font-medium flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    onClick={clearCanvas}
                    className="w-full px-4 py-2 bg-red-50 hover:bg-red-100 rounded-lg text-red-600 font-medium flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear Canvas
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 bg-gray-50 overflow-hidden" ref={containerRef}>
            <div className="h-full w-full flex items-center justify-center">
              <div className="bg-white shadow-lg rounded-lg">
                <canvas
                  ref={canvasRef}
                  width={canvasWidth}
                  height={canvasHeight}
                  className="w-full h-full touch-none rounded-lg"
                  style={{
                    cursor: selectedTool === 'eraser' ? 'crosshair' : 'default'
                  }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseOut={stopDrawing}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Canvas;
