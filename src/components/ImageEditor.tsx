import React, { useRef, useState, useEffect } from 'react';
import { 
  ArrowLeft, Download, RotateCcw, RotateCw, ZoomIn, ZoomOut, 
  Maximize2, Minimize2, Crop, Trash2, Undo, Redo, Upload, ChevronDown,
  RefreshCw
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useImageEditor } from '../contexts/ImageEditorContext';

interface ImageEditorProps {
  fileName?: string;
  onClose?: () => void;
  projectId?: string;
  fileId?: string;
  userId?: string;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ 
  fileName, 
  onClose,
  projectId: propProjectId, 
  fileId: propFileId, 
  userId: propUserId
}) => {
  const { id: paramProjectId } = useParams<{ id: string }>();
  const projectId = propProjectId || paramProjectId || 'default';
  const fileId = propFileId || fileName || 'default';
  const userId = propUserId || 'default';

  const { 
    isConnected, 
    connectionError, 
    sendFilterOperation,
    sendImageUpload,
    sendCropOperation,
    setOnRemoteImageOperation
  } = useImageEditor();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [baseCanvas, setBaseCanvas] = useState<HTMLCanvasElement | null>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isCropping, setIsCropping] = useState(false);
  const [isDrawingCrop, setIsDrawingCrop] = useState(false);
  const [cropStartPoint, setCropStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, number>>({
    grayscale: 0,
    sepia: 0,
    invert: 0,
    vintage: 0,
    cool: 0,
    warm: 0,
    blur: 0,
    sharpen: 0,
    contrast: 0,
  });
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

    // Set up handler for remote image operations
    setOnRemoteImageOperation((operation) => {
      if (operation.type === 'filter') {
        const remoteFilterType = operation.data.filterType;
        const remoteFilterValue = operation.data.filterValue;
        const remoteAllFilterValues = operation.data.allFilterValues;
        
        console.log('Received remote filter change:', remoteFilterType, 'value:', remoteFilterValue);
        
        // Use all filter values if provided, otherwise update just the single filter
        const newFilterValues = remoteAllFilterValues || {...filterValues, [remoteFilterType]: remoteFilterValue};
        
        // Update the filter values in our state
        setFilterValues(newFilterValues);
        
        // Start from scratch: clear canvas and draw original image 
        if (canvas && ctx && originalImage) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
        }
        
        // Apply all filters from scratch with the updated values
        applyFilters(newFilterValues);
      }
      else if (operation.type === 'upload') {
        console.log('Received remote image upload');
        
        // Load the received image
        const remoteImageData = operation.data.imageData;
        
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
        img.src = remoteImageData;
      }
      else if (operation.type === 'crop') {
        console.log('Received remote crop operation');
        
        // Load the received cropped image
        const remoteCroppedImageData = operation.data.imageData;
        const remoteCropWidth = operation.data.width;
        const remoteCropHeight = operation.data.height;
        
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext('2d');
          if (!canvas || !ctx) return;

          // Resize the canvas to match the cropped image dimensions
          canvas.width = remoteCropWidth;
          canvas.height = remoteCropHeight;

          // Clear canvas
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Draw the cropped image
          ctx.drawImage(img, 0, 0);
          
          // Save as the new original image for filters and other operations
          const newOriginalImg = new Image();
          newOriginalImg.src = remoteCroppedImageData;
          setOriginalImage(newOriginalImg);

          // Save to history
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          saveToHistory(imageData);
        };
        img.src = remoteCroppedImageData;
      }
    });
  }, [setOnRemoteImageOperation]);

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
      const imageDataUrl = event.target?.result as string;
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
        
        // Send image to other users
        sendImageUpload(imageDataUrl);
      };
      
      img.src = imageDataUrl;
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
    if (canvas) {
      // Create or reuse the baseCanvas
      const newBaseCanvas = baseCanvas || document.createElement('canvas');
      newBaseCanvas.width = canvas.width;
      newBaseCanvas.height = canvas.height;
      const baseCtx = newBaseCanvas.getContext('2d');
      if (baseCtx) {
        baseCtx.drawImage(canvas, 0, 0);
        // Update state instead of directly modifying ref
        if (!baseCanvas) {
          setBaseCanvas(newBaseCanvas);
        }
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
    if (!baseCanvas) {
      const newBaseCanvas = document.createElement('canvas');
      setBaseCanvas(newBaseCanvas);
    }
  };

  const applyCrop = () => {
    if (!cropStartPoint || !currentPoint || !baseCanvas) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

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

    // Update the original image reference to the cropped version
    // This is crucial for filters to work correctly after cropping
    const croppedImage = new Image();
    const croppedImageDataUrl = canvas.toDataURL('image/png');
    croppedImage.src = croppedImageDataUrl;
    setOriginalImage(croppedImage);

    // Reset cropping state
    setIsCropping(false);
    setIsDrawingCrop(false);
    setCropStartPoint(null);
    setCurrentPoint(null);
    
    // Broadcast the cropped image to other users
    if (sendCropOperation) {
      sendCropOperation(croppedImageDataUrl, cropWidth, cropHeight);
    }
  };

  const cancelCrop = () => {
    setIsCropping(false);
    setIsDrawingCrop(false);
    setCropStartPoint(null);
    setCurrentPoint(null);
    
    // Restore original canvas from baseCanvas if it exists
    if (baseCanvas) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx && originalImage) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
      }
    }
  };

  const applyFilters = (newFilterValues: Record<string, number>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    // Always start with the original image
    if (originalImage) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
    }

    // Check if any filter has a non-zero value
    const hasActiveFilter = Object.values(newFilterValues).some(value => value > 0);
    
    // If no active filters, just save the current state
    if (!hasActiveFilter) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      saveToHistory(imageData);
      return;
    }

    // Get image data after restoring original
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Apply all filters with non-zero intensity in sequence
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      let newR = r;
      let newG = g;
      let newB = b;

      // Apply grayscale with intensity
      if (newFilterValues.grayscale > 0) {
        const gray = 0.299 * newR + 0.587 * newG + 0.114 * newB;
        const intensity = newFilterValues.grayscale / 100;
        newR = newR * (1 - intensity) + gray * intensity;
        newG = newG * (1 - intensity) + gray * intensity;
        newB = newB * (1 - intensity) + gray * intensity;
      }

      // Apply sepia with intensity
      if (newFilterValues.sepia > 0) {
        const intensity = newFilterValues.sepia / 100;
        const sepiaR = Math.min(255, (newR * 0.393) + (newG * 0.769) + (newB * 0.189));
        const sepiaG = Math.min(255, (newR * 0.349) + (newG * 0.686) + (newB * 0.168));
        const sepiaB = Math.min(255, (newR * 0.272) + (newG * 0.534) + (newB * 0.131));
        
        newR = newR * (1 - intensity) + sepiaR * intensity;
        newG = newG * (1 - intensity) + sepiaG * intensity;
        newB = newB * (1 - intensity) + sepiaB * intensity;
      }

      // Apply invert with intensity
      if (newFilterValues.invert > 0) {
        const intensity = newFilterValues.invert / 100;
        newR = newR * (1 - intensity) + (255 - newR) * intensity;
        newG = newG * (1 - intensity) + (255 - newG) * intensity;
        newB = newB * (1 - intensity) + (255 - newB) * intensity;
      }

      // Apply vintage with intensity
      if (newFilterValues.vintage > 0) {
        const avg = (newR + newG + newB) / 3;
        const intensity = newFilterValues.vintage / 100;
        
        const vintageR = Math.min(255, avg + 40);
        const vintageG = Math.min(255, avg + 20);
        const vintageB = avg;
        
        newR = newR * (1 - intensity) + vintageR * intensity;
        newG = newG * (1 - intensity) + vintageG * intensity;
        newB = newB * (1 - intensity) + vintageB * intensity;
      }

      // Apply cool with intensity
      if (newFilterValues.cool > 0) {
        const intensity = newFilterValues.cool / 100;
        const coolR = newR * 0.9;
        const coolG = newG;
        const coolB = Math.min(255, newB * 1.2);
        
        newR = newR * (1 - intensity) + coolR * intensity;
        newG = newG * (1 - intensity) + coolG * intensity;
        newB = newB * (1 - intensity) + coolB * intensity;
      }

      // Apply warm with intensity
      if (newFilterValues.warm > 0) {
        const intensity = newFilterValues.warm / 100;
        const warmR = Math.min(255, newR * 1.2);
        const warmG = newG;
        const warmB = newB * 0.8;
        
        newR = newR * (1 - intensity) + warmR * intensity;
        newG = newG * (1 - intensity) + warmG * intensity;
        newB = newB * (1 - intensity) + warmB * intensity;
      }

      // Apply contrast with intensity (replaces high-contrast)
      if (newFilterValues.contrast > 0) {
        const intensity = newFilterValues.contrast / 100;
        const factor = 1 + intensity;
        const contrastR = Math.min(255, Math.max(0, (newR - 128) * factor + 128));
        const contrastG = Math.min(255, Math.max(0, (newG - 128) * factor + 128));
        const contrastB = Math.min(255, Math.max(0, (newB - 128) * factor + 128));
        
        newR = newR * (1 - intensity) + contrastR * intensity;
        newG = newG * (1 - intensity) + contrastG * intensity;
        newB = newB * (1 - intensity) + contrastB * intensity;
      }

      // Apply blur and sharpen only at specific intervals to improve performance
      if ((i % 4) === 0 && i % (canvas.width * 4) < canvas.width * 4 - 4 && i > canvas.width * 4) {
        // Apply blur with intensity
        if (newFilterValues.blur > 0) {
          const intensity = newFilterValues.blur / 100;
            const avgR = (data[i - 4] + data[i] + data[i + 4] + data[i - canvas.width * 4] + data[i + canvas.width * 4]) / 5;
            const avgG = (data[i - 3] + data[i + 1] + data[i + 5] + data[i - canvas.width * 4 + 1] + data[i + canvas.width * 4 + 1]) / 5;
            const avgB = (data[i - 2] + data[i + 2] + data[i + 6] + data[i - canvas.width * 4 + 2] + data[i + canvas.width * 4 + 2]) / 5;
          
          newR = newR * (1 - intensity) + avgR * intensity;
          newG = newG * (1 - intensity) + avgG * intensity;
          newB = newB * (1 - intensity) + avgB * intensity;
        }

        // Apply sharpen with intensity
        if (newFilterValues.sharpen > 0) {
          const intensity = newFilterValues.sharpen / 100;
          const sharpR = Math.min(255, Math.max(0, newR * 2 - (data[i - 4] + data[i + 4] + data[i - canvas.width * 4] + data[i + canvas.width * 4]) / 4));
          const sharpG = Math.min(255, Math.max(0, newG * 2 - (data[i - 3] + data[i + 5] + data[i - canvas.width * 4 + 1] + data[i + canvas.width * 4 + 1]) / 4));
          const sharpB = Math.min(255, Math.max(0, newB * 2 - (data[i - 2] + data[i + 6] + data[i - canvas.width * 4 + 2] + data[i + canvas.width * 4 + 2]) / 4));
          
          newR = newR * (1 - intensity) + sharpR * intensity;
          newG = newG * (1 - intensity) + sharpG * intensity;
          newB = newB * (1 - intensity) + sharpB * intensity;
        }
      }

      // Set the final pixel values
      data[i] = newR;
      data[i + 1] = newG;
      data[i + 2] = newB;
    }

    // Put the modified image data back
    ctx.putImageData(imageData, 0, 0);

    // Save to history
    saveToHistory(imageData);
  };

  // Update a filter value and broadcast the change
  const handleFilterChange = (filterType: string, value: number) => {
    setFilterValues(prev => ({...prev, [filterType]: value}));
  };

  // Send filter update when slider is released
  const handleFilterChangeComplete = (filterType: string, value: number) => {
    console.log(`Filter ${filterType} set to ${value}`);
    
    // Create a copy of current filter values with the new value
    const newFilterValues = {...filterValues, [filterType]: value};
    
    // Update state
    setFilterValues(newFilterValues);
    
    // Start from scratch: clear canvas and draw original image
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx && originalImage) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
    }
    
    // Apply all filters with the new values
    applyFilters(newFilterValues);
    
    // Send filter change to server
    sendFilterOperation(filterType, value, newFilterValues);
    
    // After applying filters, also send the resulting image data to ensure consistency
    if (canvas) {
      const filteredImageData = canvas.toDataURL('image/png');
      sendCropOperation(filteredImageData, canvas.width, canvas.height);
    }
    
    console.log(`Sending filter update: ${filterType}=${value} with all filters via WebSocket`);
  };

  // Reset all filters
  const resetAllFilters = () => {
    // Create reset values (all zeros)
    const resetValues = Object.keys(filterValues).reduce((acc, key) => {
      acc[key] = 0;
      return acc;
    }, {} as Record<string, number>);
    
    // Update state
    setFilterValues(resetValues);
    
    // Start from scratch: clear canvas and draw original image
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx && originalImage) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
    }
    
    // Apply filters (which will effectively be none)
    applyFilters(resetValues);
    
    // Broadcast reset for each filter that was non-zero
    Object.keys(filterValues).forEach(filterType => {
      if (filterValues[filterType] > 0) {
        sendFilterOperation(filterType, 0, resetValues);
      }
    });
    
    // After applying filters, also send the resulting image data to ensure consistency
    if (canvas) {
      const filteredImageData = canvas.toDataURL('image/png');
      sendCropOperation(filteredImageData, canvas.width, canvas.height);
    }
    
    console.log('Reset all filters complete');
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
              <p className="text-sm text-gray-600">
                Image Editor 
                {isConnected ? 
                  <span className="text-green-500 ml-2">● Connected</span> : 
                  <span className="text-red-500 ml-2">● Disconnected</span>}
              </p>
              {connectionError && (
                <p className="text-xs text-red-500">{connectionError}</p>
              )}
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
                <div className="flex items-center justify-between mb-2">
                <button 
                  onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                    className="flex items-center text-sm font-medium text-gray-700"
                >
                  <span>Filters</span>
                  <ChevronDown 
                      className={`w-4 h-4 ml-1 transition-transform ${isFiltersExpanded ? 'transform rotate-180' : ''}`} 
                  />
                </button>
                  
                  <button
                    onClick={resetAllFilters}
                    className="p-1 rounded-md hover:bg-purple-50 text-purple-600"
                    title="Reset all filters"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                
                {isFiltersExpanded && (
                  <div className="space-y-4 mt-3">
                    {[
                      { type: 'grayscale', label: 'Grayscale' },
                      { type: 'sepia', label: 'Sepia' },
                      { type: 'invert', label: 'Invert' },
                      { type: 'vintage', label: 'Vintage' },
                      { type: 'cool', label: 'Cool' },
                      { type: 'warm', label: 'Warm' },
                      { type: 'blur', label: 'Blur' },
                      { type: 'sharpen', label: 'Sharpen' },
                      { type: 'contrast', label: 'Contrast' }
                    ].map(({ type, label }) => (
                      <div key={type} className="filter-slider">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-700">{label}</span>
                          <span className="text-xs font-medium text-gray-500">{filterValues[type]}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={filterValues[type]}
                          onChange={(e) => handleFilterChange(type, parseInt(e.target.value))}
                          onMouseUp={(e) => handleFilterChangeComplete(type, parseInt((e.target as HTMLInputElement).value))}
                          onTouchEnd={(e) => handleFilterChangeComplete(type, parseInt((e.target as HTMLInputElement).value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                        />
                      </div>
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
                        // { icon: RotateCcw, action: () => rotate('left'), label: 'Rotate Left' },
                        // { icon: RotateCw, action: () => rotate('right'), label: 'Rotate Right' },
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
                    {/* Remove undo/redo buttons by commenting them out 
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
                    */}
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
                        
                        // Clear the canvas with white background
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        
                        // Create a new blank image to replace the original image
                        const blankImage = new Image();
                        blankImage.width = canvas.width;
                        blankImage.height = canvas.height;
                        setOriginalImage(blankImage);
                        
                        // Reset all filter values
                        const resetValues = Object.keys(filterValues).reduce((acc, key) => {
                          acc[key] = 0;
                          return acc;
                        }, {} as Record<string, number>);
                        setFilterValues(resetValues);
                        
                        // Save to history
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        saveToHistory(imageData);
                        
                        // Broadcast the cleared canvas to other users
                        if (sendCropOperation) {
                          const clearedImageData = canvas.toDataURL('image/png');
                          sendCropOperation(clearedImageData, canvas.width, canvas.height);
                        }
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
