export type DrawingTool = 'brush' | 'eraser' | 'rectangle' | 'circle' | 'triangle';

export interface StrokeStyle {
  lineCap: 'round' | 'butt' | 'square';
  lineJoin: 'round' | 'bevel' | 'miter';
  globalCompositeOperation?: 'source-over' | 'destination-out';
}

export interface BaseDrawingData {
  type: DrawingTool;
  color: string;
  timestamp: number;
  canvasWidth: number;
  canvasHeight: number;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  pressure?: number;
}

export interface BrushData extends BaseDrawingData {
  type: 'brush' | 'eraser';
  isStartPoint: boolean;
  x: number;
  y: number;
}

export interface RectangleData extends BaseDrawingData {
  type: 'rectangle';
  startX: number;
  startY: number;
  width: number;
  height: number;
  fill?: boolean;
  fillColor?: string;
}

export interface CircleData extends BaseDrawingData {
  type: 'circle';
  centerX: number;
  centerY: number;
  radius: number;
  fill?: boolean;
  fillColor?: string;
}

export interface TriangleData extends BaseDrawingData {
  type: 'triangle';
  startX: number;
  startY: number;
  size: number;
  fill?: boolean;
  fillColor?: string;
}

export type DrawingData = BrushData | RectangleData | CircleData | TriangleData;

export type WebSocketMessage = 
  | { type: 'draw'; data: DrawingData }
  | { type: 'clear' }; 