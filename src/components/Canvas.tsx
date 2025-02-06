import React, { useEffect, useRef, useState } from 'react';
import { Brush, Eraser, Palette, Trash2, UndoIcon, RedoIcon, Square, Circle, Type, Image as ImageIcon, Download, ChevronDown, Triangle } from 'lucide-react';

interface CanvasProps {
  width?: number;
  height?: number;
}

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

type Tool = 'brush' | 'eraser' | 'rectangle' | 'circle' | 'triangle' | 'text' | 'image';

const Canvas: React.FC<CanvasProps> = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [brushSize, setBrushSize] = useState(8);
  const [eraserSize, setEraserSize] = useState(16);
  const [color, setColor] = useState('#000000');
  const [selectedTool, setSelectedTool] = useState<Tool>('brush');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'top' | 'bottom'>('bottom');
  const [dropdownAlign, setDropdownAlign] = useState<'left' | 'right'>('right');
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const presetColors = [
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
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    setContext(ctx);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showColorPicker && colorPickerRef.current && containerRef.current) {
      const rect = colorPickerRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      
      // Check vertical space
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropdownPosition(spaceBelow < 320 ? 'top' : 'bottom');
      
      // Check horizontal space
      const spaceRight = containerRect.right - rect.left;
      setDropdownAlign(spaceRight < 280 ? 'left' : 'right');
    }
  }, [showColorPicker]);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      baseCanvasRef.current = canvas;
    }
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setIsDrawing(true);
    setStartPos({ x, y });
    lastPositionRef.current = { x, y };

    // Save the current canvas state for shape preview
    if (baseCanvasRef.current && (selectedTool === 'rectangle' || selectedTool === 'circle' || selectedTool === 'triangle')) {
      const baseCtx = baseCanvasRef.current.getContext('2d');
      if (baseCtx) {
        baseCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        baseCtx.drawImage(canvas, 0, 0);
      }
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = selectedTool === 'eraser' ? eraserSize : brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (selectedTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current || !startPos) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (selectedTool === 'brush' || selectedTool === 'eraser') {
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      // For shapes, restore the base canvas and draw the preview
      if (baseCanvasRef.current) {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.drawImage(baseCanvasRef.current, 0, 0);
        
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSize;

        if (selectedTool === 'rectangle') {
          const width = x - startPos.x;
          const height = y - startPos.y;
          ctx.strokeRect(startPos.x, startPos.y, width, height);
        } else if (selectedTool === 'circle') {
          // Calculate radius based on the maximum distance in either direction
          const dx = (x - startPos.x);
          const dy = (y - startPos.y);
          const radius = Math.max(Math.abs(dx), Math.abs(dy));
          
          // Draw from the start point (center)
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
          
          // Draw the triangle
          ctx.beginPath();
          ctx.moveTo(topX, topY);
          ctx.lineTo(leftX, leftY);
          ctx.lineTo(rightX, rightY);
          ctx.closePath();
          ctx.stroke();
        }
      }
    }

    lastPositionRef.current = { x, y };
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setStartPos(null);

    // Reset composite operation
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  };

  const clearCanvas = () => {
    if (!context || !canvasRef.current) return;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  };

  const handleColorChange = (newColor: string, shouldClose: boolean = false) => {
    setColor(newColor);
    if (shouldClose) {
      setShowColorPicker(false);
    }
    
    // Add to recent colors if it's not already there
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
    // Clamp value between 2 and 180
    const clampedValue = Math.min(Math.max(value, 2), 180);
    if (type === 'brush') {
      setBrushSize(clampedValue);
    } else {
      setEraserSize(clampedValue);
    }
  };

  const ColorPicker = ({ color, onChange }: { color: string; onChange: (color: string) => void }) => {
    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
    };

    return (
      <div className="relative group cursor-pointer" onClick={handleClick}>
        <input 
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="absolute opacity-0 w-8 h-8"
          style={{ colorScheme: 'normal' }}
          onClick={handleClick}
        />
        <div
          className="w-8 h-8 rounded-lg shadow-sm border border-gray-200 transition-transform group-hover:scale-105 group-active:scale-95 pointer-events-none"
          style={{ backgroundColor: color }}
        />
      </div>
    );
  };

  return (
    <div className="flex h-full">
      <div className="w-[280px] bg-white/80 backdrop-blur-sm border-r border-purple-100 flex flex-col h-full" ref={containerRef}>
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Tools Section */}
          <div className="bg-white rounded-lg border border-purple-100 p-3 shadow-sm">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Tools</h3>
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: Brush, tool: 'brush' as Tool, label: 'Brush' },
                { icon: Eraser, tool: 'eraser' as Tool, label: 'Eraser' },
                { icon: Square, tool: 'rectangle' as Tool, label: 'Rectangle' },
                { icon: Circle, tool: 'circle' as Tool, label: 'Circle' },
                { icon: Triangle, tool: 'triangle' as Tool, label: 'Triangle' },
                { icon: Type, tool: 'text' as Tool, label: 'Text' },
                { icon: ImageIcon, tool: 'image' as Tool, label: 'Image' },
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

          {/* Brush Settings */}
          {selectedTool === 'brush' && (
            <div className="bg-white rounded-lg border border-purple-100 p-3 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">Brush Size</h3>
                <div className="flex items-center">
                  <input
                    type="number"
                    min="2"
                    max="180"
                    value={brushSize}
                    onChange={(e) => handleSizeChange(Number(e.target.value), 'brush')}
                    className="w-16 px-2 py-1 text-sm text-center border rounded-l-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <span className="px-2 py-1 text-sm text-gray-500 bg-gray-50 border border-l-0 rounded-r-lg">
                    px
                  </span>
                </div>
              </div>
              <div className="relative pt-1">
                <input
                  type="range"
                  min="2"
                  max="180"
                  value={brushSize}
                  onChange={(e) => handleSizeChange(Number(e.target.value), 'brush')}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                    [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:rounded-full 
                    [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform
                    [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
                    [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 
                    [&::-moz-range-thumb]:bg-indigo-600 [&::-moz-range-thumb]:rounded-full 
                    [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:transition-transform
                    [&::-moz-range-thumb]:hover:scale-110 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white"
                />
              </div>
            </div>
          )}

          {/* Eraser Settings */}
          {selectedTool === 'eraser' && (
            <div className="bg-white rounded-lg border border-purple-100 p-3 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">Eraser Size</h3>
                <div className="flex items-center">
                  <input
                    type="number"
                    min="2"
                    max="180"
                    value={eraserSize}
                    onChange={(e) => handleSizeChange(Number(e.target.value), 'eraser')}
                    className="w-16 px-2 py-1 text-sm text-center border rounded-l-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <span className="px-2 py-1 text-sm text-gray-500 bg-gray-50 border border-l-0 rounded-r-lg">
                    px
                  </span>
                </div>
              </div>
              <div className="relative pt-1">
                <input
                  type="range"
                  min="2"
                  max="180"
                  value={eraserSize}
                  onChange={(e) => handleSizeChange(Number(e.target.value), 'eraser')}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                    [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:rounded-full 
                    [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform
                    [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
                    [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 
                    [&::-moz-range-thumb]:bg-indigo-600 [&::-moz-range-thumb]:rounded-full 
                    [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:transition-transform
                    [&::-moz-range-thumb]:hover:scale-110 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white"
                />
              </div>
            </div>
          )}

          {/* Color Section */}
          <div className="bg-white rounded-lg border border-purple-100 p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ColorPicker color={color} onChange={handleColorChange} />
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Color</h3>
                  <div className="text-xs text-gray-500">{color.toUpperCase()}</div>
                </div>
              </div>
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-2 rounded hover:bg-gray-50"
                title={showColorPicker ? "Hide Color Options" : "Show Color Options"}
              >
                <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${showColorPicker ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Color Options */}
            {showColorPicker && (
              <div className="mt-3 space-y-3 border-t pt-3">
                {/* Recent Colors */}
                {recentColors.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Recent Colors</label>
                    <div className="grid grid-cols-5 gap-1">
                      {recentColors.map((recentColor) => (
                        <button
                          key={recentColor}
                          onClick={() => handleColorChange(recentColor, true)}
                          className={`w-full aspect-square rounded-lg border-2 transition-all ${
                            color === recentColor ? 'border-indigo-500 scale-110' : 'border-gray-200 hover:scale-105'
                          }`}
                          style={{ backgroundColor: recentColor }}
                          title={recentColor}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Preset Colors */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Preset Colors</label>
                  <div className="grid grid-cols-6 gap-1">
                    {presetColors.map((presetColor) => (
                      <button
                        key={presetColor}
                        onClick={() => handleColorChange(presetColor, true)}
                        className={`w-full aspect-square rounded-lg border-2 transition-all ${
                          color === presetColor ? 'border-indigo-500 scale-110' : 'border-gray-200 hover:scale-105'
                        }`}
                        style={{ backgroundColor: presetColor }}
                        title={presetColor}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Bottom Actions */}
        <div className="p-4 border-t border-purple-100 bg-white/80 backdrop-blur-sm space-y-2">
          <button
            onClick={downloadCanvas}
            className="w-full px-4 py-2 text-sm font-medium text-indigo-600 bg-white rounded-lg hover:bg-indigo-50 border border-purple-100 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          <button
            onClick={clearCanvas}
            className="w-full px-4 py-2 text-sm font-medium text-red-600 bg-white rounded-lg hover:bg-red-50 border border-purple-100 transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear Canvas
          </button>
        </div>
      </div>

      <div className="flex-1 bg-gradient-to-br from-purple-50 to-blue-50 overflow-auto">
        <div className="min-h-full flex items-center justify-center p-8">
          <div 
            className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-purple-100 p-4"
            style={{
              width: 'min(90vw, calc(80vh * 16/9))',
              height: 'min(80vh, calc(90vw * 9/16))'
            }}
          >
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseUp={stopDrawing}
              onMouseOut={stopDrawing}
              onMouseMove={draw}
              style={{
                width: '100%',
                height: '100%',
                display: 'block'
              }}
              className="bg-white rounded-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Canvas;
