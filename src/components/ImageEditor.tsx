import React, { useRef, useState, useEffect } from 'react';
import { 
  ArrowLeft, Download, RotateCcw, RotateCw, ZoomIn, ZoomOut, 
  Maximize2, Minimize2, Crop, Trash2, Undo, Redo, Upload, ChevronDown 
} from 'lucide-react';

interface ImageEditorProps {
  fileName?: string;
  onClose?: () => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ fileName, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isCropping, setIsCropping] = useState(false);
  const [isDrawingCrop, setIsDrawingCrop] = useState(false);
  const [cropStartPoint, setCropStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('none');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [isTransformExpanded, setIsTransformExpanded] = useState(true);
  const [isActionsExpanded, setIsActionsExpanded] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set initial canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Clear canvas with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    saveToHistory(imageData);
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
    link.download = fileName || 'image';
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        // Set canvas size to match image dimensions
        canvas.width = img.width;
        canvas.height = img.height;

        // Clear canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw image
        ctx.drawImage(img, 0, 0);
        setOriginalImage(img);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        saveToHistory(imageData);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Account for canvas scaling and position
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    return { x, y };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCropping) return;

    const point = getCanvasPoint(e);
    if (!point) return;

    // Save current canvas state to baseCanvas
    const canvas = canvasRef.current;
    const baseCanvas = baseCanvasRef.current;
    if (canvas && baseCanvas) {
      baseCanvas.width = canvas.width;
      baseCanvas.height = canvas.height;
      const baseCtx = baseCanvas.getContext('2d');
      if (baseCtx) {
        baseCtx.drawImage(canvas, 0, 0);
      }
    }

    setIsDrawingCrop(true);
    setCropStartPoint(point);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCropping || !isDrawingCrop || !cropStartPoint) return;

    const point = getCanvasPoint(e);
    if (!point) return;

    setCurrentPoint(point);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const baseCanvas = baseCanvasRef.current;
    if (!ctx || !canvas || !baseCanvas) return;

    // Clear and restore from base canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baseCanvas, 0, 0);

    // Calculate dimensions (handle negative values)
    const width = point.x - cropStartPoint.x;
    const height = point.y - cropStartPoint.y;
    
    // Calculate actual coordinates for drawing
    const startX = width < 0 ? point.x : cropStartPoint.x;
    const startY = height < 0 ? point.y : cropStartPoint.y;
    const rectWidth = Math.abs(width);
    const rectHeight = Math.abs(height);

    // Create semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.rect(startX, startY, rectWidth, rectHeight);
    ctx.fill('evenodd');
    
    // Draw crop rectangle
    ctx.beginPath();
    ctx.strokeStyle = '#6200ee';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(startX, startY, rectWidth, rectHeight);
    
    // Draw corner points
    ctx.setLineDash([]);
    const points = [
      { x: startX, y: startY },
      { x: startX + rectWidth, y: startY },
      { x: startX + rectWidth, y: startY + rectHeight },
      { x: startX, y: startY + rectHeight }
    ];
    
    points.forEach(p => {
      ctx.beginPath();
      ctx.fillStyle = 'white';
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#6200ee';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  };

  const handleCanvasMouseUp = () => {
    if (!isCropping || !isDrawingCrop) return;
    setIsDrawingCrop(false);
  };

  const startCropping = () => {
    setIsCropping(true);
    setIsDrawingCrop(false);
    setCropStartPoint(null);

    // Create backup canvas if it doesn't exist
    if (!baseCanvasRef.current) {
      const baseCanvas = document.createElement('canvas');
      baseCanvasRef.current = baseCanvas;
    }
  };

  const applyCrop = () => {
    if (!cropStartPoint || !currentPoint) return;

    const canvas = canvasRef.current;
    const baseCanvas = baseCanvasRef.current;
    if (!canvas || !baseCanvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate crop dimensions and position
    const width = currentPoint.x - cropStartPoint.x;
    const height = currentPoint.y - cropStartPoint.y;
    
    // Get actual crop coordinates and dimensions
    const cropX = width < 0 ? currentPoint.x : cropStartPoint.x;
    const cropY = height < 0 ? currentPoint.y : cropStartPoint.y;
    const cropWidth = Math.abs(width);
    const cropHeight = Math.abs(height);

    // Create a temporary canvas for the cropped image
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Set temp canvas size to the crop dimensions
    tempCanvas.width = cropWidth;
    tempCanvas.height = cropHeight;

    // Copy the cropped portion from the base canvas (original image)
    tempCtx.drawImage(
      baseCanvas,
      cropX, cropY, cropWidth, cropHeight,  // Source rectangle
      0, 0, cropWidth, cropHeight           // Destination rectangle
    );

    // Resize the main canvas
    canvas.width = cropWidth;
    canvas.height = cropHeight;

    // Draw the cropped image
    ctx.drawImage(tempCanvas, 0, 0);

    // Save to history
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    saveToHistory(imageData);

    // Reset cropping state
    setIsCropping(false);
    setIsDrawingCrop(false);
    setCropStartPoint(null);
    setCurrentPoint(null);
  };

  const cancelCrop = () => {
    setIsCropping(false);
    setIsDrawingCrop(false);
    setCropStartPoint(null);
    setCurrentPoint(null);
  };

  const applyFilter = (filterType: string) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    // Always start with the original image
    if (originalImage) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
    }

    // Get image data after restoring original
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Apply filter
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      switch (filterType) {
        case 'grayscale':
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
          break;

        case 'sepia':
          data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
          data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
          data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
          break;

        case 'invert':
          data[i] = 255 - r;
          data[i + 1] = 255 - g;
          data[i + 2] = 255 - b;
          break;

        case 'vintage':
          const avg = (r + g + b) / 3;
          data[i] = Math.min(255, avg + 40);
          data[i + 1] = Math.min(255, avg + 20);
          data[i + 2] = avg;
          break;

        case 'cool':
          data[i] = r * 0.9;
          data[i + 1] = g;
          data[i + 2] = Math.min(255, b * 1.2);
          break;

        case 'warm':
          data[i] = Math.min(255, r * 1.2);
          data[i + 1] = g;
          data[i + 2] = b * 0.8;
          break;

        case 'blur':
          // Simple box blur
          if (i % (canvas.width * 4) < canvas.width * 4 - 4 && i > canvas.width * 4) {
            const avgR = (data[i - 4] + data[i] + data[i + 4] + data[i - canvas.width * 4] + data[i + canvas.width * 4]) / 5;
            const avgG = (data[i - 3] + data[i + 1] + data[i + 5] + data[i - canvas.width * 4 + 1] + data[i + canvas.width * 4 + 1]) / 5;
            const avgB = (data[i - 2] + data[i + 2] + data[i + 6] + data[i - canvas.width * 4 + 2] + data[i + canvas.width * 4 + 2]) / 5;
            data[i] = avgR;
            data[i + 1] = avgG;
            data[i + 2] = avgB;
          }
          break;

        case 'sharpen':
          if (i % (canvas.width * 4) < canvas.width * 4 - 4 && i > canvas.width * 4) {
            data[i] = Math.min(255, Math.max(0, r * 2 - (data[i - 4] + data[i + 4] + data[i - canvas.width * 4] + data[i + canvas.width * 4]) / 4));
            data[i + 1] = Math.min(255, Math.max(0, g * 2 - (data[i - 3] + data[i + 5] + data[i - canvas.width * 4 + 1] + data[i + canvas.width * 4 + 1]) / 4));
            data[i + 2] = Math.min(255, Math.max(0, b * 2 - (data[i - 2] + data[i + 6] + data[i - canvas.width * 4 + 2] + data[i + canvas.width * 4 + 2]) / 4));
          }
          break;

        case 'high-contrast':
          const factor = 1.5;
          data[i] = Math.min(255, Math.max(0, (r - 128) * factor + 128));
          data[i + 1] = Math.min(255, Math.max(0, (g - 128) * factor + 128));
          data[i + 2] = Math.min(255, Math.max(0, (b - 128) * factor + 128));
          break;
      }
    }

    // Put the modified image data back
    ctx.putImageData(imageData, 0, 0);

    // Save to history
    saveToHistory(imageData);
  };

  const toggleFilter = (filterType: string) => {
    // If clicking the active filter, remove it
    if (activeFilter === filterType) {
      setActiveFilter('none');
      applyFilter('none');
    } else {
      // Apply new filter
      setActiveFilter(filterType);
      applyFilter(filterType);
    }
  };

  const handleScaleChange = (value: number) => {
    const newScale = Math.min(Math.max(value, 10), 200);
    setScale(newScale / 100);
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
              {/* Filters */}
              <div className="bg-white rounded-lg border border-purple-100 p-3 shadow-sm">
                <button 
                  onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                  className="w-full flex items-center justify-between text-sm font-medium text-gray-700"
                >
                  <span>Filters</span>
                  <ChevronDown 
                    className={`w-4 h-4 transition-transform ${isFiltersExpanded ? 'transform rotate-180' : ''}`} 
                  />
                </button>
                {isFiltersExpanded && (
                  <div className="space-y-2 mt-3">
                    {[
                      { type: 'grayscale', label: 'Grayscale' },
                      { type: 'sepia', label: 'Sepia' },
                      { type: 'invert', label: 'Invert' },
                      { type: 'vintage', label: 'Vintage' },
                      { type: 'cool', label: 'Cool' },
                      { type: 'warm', label: 'Warm' },
                      { type: 'blur', label: 'Blur' },
                      { type: 'sharpen', label: 'Sharpen' },
                      { type: 'high-contrast', label: 'High Contrast' }
                    ].map(({ type, label }) => (
                      <button
                        key={type}
                        onClick={() => toggleFilter(type)}
                        className={`w-full px-3 py-1.5 rounded-lg text-sm font-medium ${
                          activeFilter === type
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-purple-50 hover:bg-purple-100 text-purple-600'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Transform Tools */}
              <div className="bg-white rounded-lg border border-purple-100 p-3 shadow-sm">
                <button 
                  onClick={() => setIsTransformExpanded(!isTransformExpanded)}
                  className="w-full flex items-center justify-between text-sm font-medium text-gray-700"
                >
                  <span>Transform</span>
                  <ChevronDown 
                    className={`w-4 h-4 transition-transform ${isTransformExpanded ? 'transform rotate-180' : ''}`} 
                  />
                </button>
                {isTransformExpanded && (
                  <div className="mt-3">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { icon: RotateCcw, action: () => rotate('left'), label: 'Rotate Left' },
                        { icon: RotateCw, action: () => rotate('right'), label: 'Rotate Right' },
                        { icon: ZoomIn, action: () => zoom(0.1), label: 'Zoom In' },
                        { icon: ZoomOut, action: () => zoom(-0.1), label: 'Zoom Out' },
                        { icon: Crop, action: startCropping, label: 'Crop', active: isCropping }
                      ].map(({ icon: Icon, action, label, active }) => (
                        <button
                          key={label}
                          onClick={action}
                          className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-colors ${
                            active ? 'bg-purple-100 text-purple-600' : 'hover:bg-purple-50 text-gray-700'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-xs">{label}</span>
                        </button>
                      ))}
                    </div>
                    {isCropping && (
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={applyCrop}
                          className="flex-1 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-600 text-sm font-medium"
                        >
                          Apply
                        </button>
                        <button
                          onClick={cancelCrop}
                          className="flex-1 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-600 text-sm font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="bg-white rounded-lg border border-purple-100 p-3 shadow-sm">
                <button 
                  onClick={() => setIsActionsExpanded(!isActionsExpanded)}
                  className="w-full flex items-center justify-between text-sm font-medium text-gray-700"
                >
                  <span>Actions</span>
                  <ChevronDown 
                    className={`w-4 h-4 transition-transform ${isActionsExpanded ? 'transform rotate-180' : ''}`} 
                  />
                </button>
                {isActionsExpanded && (
                  <div className="space-y-2 mt-3">
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
                      onClick={triggerFileInput}
                      className="w-full px-4 py-2 bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-600 font-medium flex items-center justify-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      Upload Image
                    </button>
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
                )}
              </div>

              {/* Scale Control */}
              <div className="bg-white rounded-lg border border-purple-100 p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Scale</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="10"
                      max="200"
                      value={Math.round(scale * 100)}
                      onChange={(e) => handleScaleChange(Number(e.target.value))}
                      className="w-16 px-2 py-1 text-sm text-right border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="10"
                  max="200"
                  value={scale * 100}
                  onChange={(e) => handleScaleChange(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
              </div>

            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-h-0 relative flex items-center justify-center bg-gray-50 p-8">
            <div className="bg-white shadow-lg rounded-lg border border-purple-100 overflow-hidden h-full w-full flex items-center justify-center relative">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-full object-contain"
                style={{
                  transform: `scale(${scale})`,
                  transition: 'transform 0.2s ease-in-out',
                  cursor: isCropping ? 'crosshair' : 'default'
                }}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
