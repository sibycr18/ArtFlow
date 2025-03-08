import { DrawingData, DrawingHistory, DrawingHistoryEntry } from '../types/canvas';

const HISTORY_PREFIX = 'artflow_history_';

export class DrawingHistoryManager {
  private fileId: string;
  private storageKey: string;

  constructor(fileId: string) {
    this.fileId = fileId;
    this.storageKey = `${HISTORY_PREFIX}${fileId}`;
  }

  private getHistory(): DrawingHistory {
    const storedHistory = localStorage.getItem(this.storageKey);
    if (storedHistory) {
      return JSON.parse(storedHistory);
    }
    return {
      fileId: this.fileId,
      entries: []
    };
  }

  private saveHistory(history: DrawingHistory) {
    localStorage.setItem(this.storageKey, JSON.stringify(history));
  }

  addDrawing(userId: string, drawingData: DrawingData) {
    const history = this.getHistory();
    const entry: DrawingHistoryEntry = {
      userId,
      timestamp: drawingData.timestamp,
      data: drawingData
    };
    history.entries.push(entry);
    this.saveHistory(history);
  }

  clearHistory() {
    const emptyHistory: DrawingHistory = {
      fileId: this.fileId,
      entries: []
    };
    this.saveHistory(emptyHistory);
  }

  getAllHistory(): DrawingHistory {
    return this.getHistory();
  }

  syncWithServerHistory(serverHistory: DrawingHistory) {
    if (serverHistory.fileId !== this.fileId) {
      console.error('File ID mismatch in history sync');
      return;
    }
    this.saveHistory(serverHistory);
  }

  // Static method to debug all ArtFlow history entries
  static debugAllHistories(): { [key: string]: DrawingHistory } {
    const histories: { [key: string]: DrawingHistory } = {};
    
    // Iterate through all localStorage items
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(HISTORY_PREFIX)) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            histories[key] = JSON.parse(value);
          }
        } catch (e) {
          console.error(`Error parsing history for key ${key}:`, e);
        }
      }
    }
    
    return histories;
  }

  // Method to print current file's history
  debugCurrentHistory(): void {
    const history = this.getHistory();
    console.log(`History for file ${this.fileId}:`, history);
  }
} 