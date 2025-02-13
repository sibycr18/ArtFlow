import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Brush, Eraser, Square, Circle, Triangle, 
  ChevronDown, Download, Trash2, 
  Bold, Italic, Underline, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  ArrowLeft, Undo, Redo
} from 'lucide-react';
import ColorPicker from './ColorPicker';
import { useCanvas } from '../contexts/CanvasContext';
import OtherUsersCursors from './OtherUsersCursors';

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
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool>('brush');
  const [brushSize, setBrushSize] = useState(5);
  const [eraserSize, setEraserSize] = useState(20);
  const [color, setColor] = useState('#000000');
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(1280);
  const [canvasHeight, setCanvasHeight] = useState(720);
  const [history, setHistory] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(-1);

  const { sendDrawData, sendCursorMove, sendClearCanvas, isConnected } = useCanvas();

  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const container = containerRef.current;
        const maxWidth = container.clientWidth - 64;
        const maxHeight = container.clientHeight - 64;
        
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

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Initialize base canvas
    const baseCanvas = document.createElement('canvas');
    baseCanvas.width = canvas.width;
    baseCanvas.height = canvas.height;
    baseCanvasRef.current = baseCanvas;

    // Save initial state
    const initialState = canvas.toDataURL();
    setHistory([initialState]);
    setCurrentStep(0);
  }, [canvasWidth, canvasHeight]);

  const saveState = () => {
    if (!isDrawing) {  // Only save when drawing is finished
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const state = canvas.toDataURL();
      const newHistory = history.slice(0, currentStep + 1);
      newHistory.push(state);
      
      setHistory(newHistory);
      setCurrentStep(newHistory.length - 1);
    }
  };

  const undo = () => {
    if (currentStep <= 0 || !canvasRef.current) return;
    
    const newStep = currentStep - 1;
    const img = new Image();
    img.src = history[newStep];
    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setCurrentStep(newStep);
    };
  };

  const redo = () => {
    if (currentStep >= history.length - 1 || !canvasRef.current) return;
    
    const newStep = currentStep + 1;
    const img = new Image();
    img.src = history[newStep];
    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setCurrentStep(newStep);
    };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    sendClearCanvas();
    saveState();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setStartPos(null);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.globalCompositeOperation = 'source-over';
    }
    
    // Save state after drawing is complete
    saveState();
  };

  const getMousePos = (e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    return { x, y };
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (['rectangle', 'circle', 'triangle'].includes(selectedTool) && startPos) {
      // For shapes, clear and redraw
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Restore the original canvas state
      const baseCanvas = baseCanvasRef.current;
      if (baseCanvas) {
        ctx.drawImage(baseCanvas, 0, 0);
      }
      
      // Set shape styles
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.fillStyle = color;

      if (selectedTool === 'rectangle') {
        const width = x - startPos.x;
        const height = y - startPos.y;
        ctx.strokeRect(startPos.x, startPos.y, width, height);
        
        // Send shape data
        sendDrawData({
          type: 'rectangle',
          x: startPos.x,
          y: startPos.y,
          width,
          height,
          color,
          lineWidth: brushSize
        });
      } else if (selectedTool === 'circle') {
        const dx = x - startPos.x;
        const dy = y - startPos.y;
        const radius = Math.sqrt(dx * dx + dy * dy) / 2;
        const centerX = startPos.x + dx/2;
        const centerY = startPos.y + dy/2;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Send shape data
        sendDrawData({
          type: 'circle',
          centerX,
          centerY,
          radius,
          color,
          lineWidth: brushSize
        });
      } else if (selectedTool === 'triangle') {
        const dx = x - startPos.x;
        const dy = y - startPos.y;
        const size = Math.sqrt(dx * dx + dy * dy);
        
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        
        const angle = Math.PI / 3;
        const leftX = startPos.x - size * Math.cos(angle);
        const leftY = startPos.y + size * Math.sin(angle);
        const rightX = startPos.x + size * Math.cos(angle);
        const rightY = startPos.y + size * Math.sin(angle);
        
        ctx.lineTo(leftX, leftY);
        ctx.lineTo(rightX, rightY);
        ctx.closePath();
        ctx.stroke();
        
        // Send shape data
        sendDrawData({
          type: 'triangle',
          startX: startPos.x,
          startY: startPos.y,
          size,
          color,
          lineWidth: brushSize
        });
      }
    } else {
      // For brush and eraser
      ctx.lineTo(x, y);
      ctx.stroke();
      
      // Send stroke data
      sendDrawData({
        type: selectedTool,
        x,
        y,
        color: selectedTool === 'eraser' ? '#ffffff' : color,
        width: selectedTool === 'eraser' ? eraserSize : brushSize
      });
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    console.log('Start drawing', e.clientX, e.clientY);
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setStartPos({ x, y });

    // For shapes, save the current canvas state
    if (['rectangle', 'circle', 'triangle'].includes(selectedTool)) {
      const baseCanvas = baseCanvasRef.current;
      const baseCtx = baseCanvas?.getContext('2d');
      if (baseCanvas && baseCtx) {
        baseCtx.clearRect(0, 0, canvas.width, canvas.height);
        baseCtx.drawImage(canvas, 0, 0);
      }
      return;
    }

    // For brush and eraser
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = selectedTool === 'eraser' ? eraserSize : brushSize;
    
    if (selectedTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.lineTo(x, y);
    ctx.stroke();
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

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    startDrawing(mouseEvent as any);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    draw(mouseEvent as any);
  };

  // Add cursor movement tracking
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    sendCursorMove(x, y);

    if (isDrawing) {
      draw(e);
    }
  }, [isDrawing, sendCursorMove]);

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
              <p className="text-sm text-gray-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </p>
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
              <div className="bg-white rounded-lg border border-purple-100 p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-700">
                    {selectedTool === 'eraser' ? 'Eraser Size' : 'Tool Size'}
                  </h3>
                  <span className="text-xs font-medium text-gray-600">
                    {selectedTool === 'eraser' ? eraserSize : brushSize}px
                  </span>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={selectedTool === 'eraser' ? eraserSize : brushSize}
                    onChange={(e) => handleSizeChange(parseInt(e.target.value), selectedTool === 'eraser' ? 'eraser' : 'brush')}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                </div>
              </div>

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
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button
                      onClick={undo}
                      disabled={currentStep <= 0}
                      className="px-4 py-2 bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-600 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Undo className="w-4 h-4" />
                      Undo
                    </button>
                    <button
                      onClick={redo}
                      disabled={currentStep >= history.length - 1}
                      className="px-4 py-2 bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-600 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Redo className="w-4 h-4" />
                      Redo
                    </button>
                  </div>
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
              <div className="bg-white shadow-lg rounded-lg relative">
                <canvas
                  ref={canvasRef}
                  width={canvasWidth}
                  height={canvasHeight}
                  className="touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={handleMouseMove}
                  onMouseUp={stopDrawing}
                  onMouseOut={stopDrawing}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={stopDrawing}
                />
                <OtherUsersCursors
                  canvasWidth={canvasWidth}
                  canvasHeight={canvasHeight}
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
