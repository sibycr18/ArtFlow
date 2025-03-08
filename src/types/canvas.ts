export type DrawingTool = 'brush' | 'eraser' | 'rectangle' | 'circle' | 'triangle';

export interface StrokeStyle {
  lineCap: 'round' | 'butt' | 'square';
  lineJoin: 'round' | 'bevel' | 'miter';
  globalCompositeOperation?: 'source-over' | 'destination-out';
}

// Optimized base drawing data with minimal required fields
export interface BaseDrawingData {
  t: DrawingTool;  // shortened from 'type'
  c: string;       // shortened from 'color'
  ts: number;      // shortened from 'timestamp'
  u: string;       // shortened from 'userId'
  w: number;       // shortened from 'strokeWidth'
  s?: StrokeStyle; // shortened from 'strokeStyle', made optional
}

// Optimized brush data
export interface BrushData extends BaseDrawingData {
  t: 'brush' | 'eraser';
  x: number;
  y: number;
  i: boolean;      // shortened from 'isStartPoint'
}

// Optimized shape data
export interface ShapeData extends BaseDrawingData {
  x: number;       // start/center X
  y: number;       // start/center Y
  f?: boolean;     // shortened from 'fill'
  fc?: string;     // shortened from 'fillColor'
}

// Specific shape interfaces
export interface RectangleData extends ShapeData {
  t: 'rectangle';
  w: number;       // width
  h: number;       // height
}

export interface CircleData extends ShapeData {
  t: 'circle';
  r: number;       // radius
}

export interface TriangleData extends ShapeData {
  t: 'triangle';
  s: number;       // size
}

export type DrawingData = BrushData | RectangleData | CircleData | TriangleData;

export interface DrawingHistoryEntry {
  userId: string;
  timestamp: number;
  data: DrawingData;
}

export interface DrawingHistory {
  fileId: string;
  entries: DrawingHistoryEntry[];
}

export type WebSocketMessage = 
  | { type: 'draw'; data: DrawingData }
  | { type: 'clear' }
  | { type: 'history_sync'; data: DrawingHistory }; 