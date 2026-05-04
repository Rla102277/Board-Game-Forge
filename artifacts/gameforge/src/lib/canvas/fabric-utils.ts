import { Canvas, FabricObject, Rect, Circle, Triangle, Line, Textbox, Image as FabricImage } from 'fabric';
import { v4 as uuidv4 } from 'uuid';

export interface CanvasState {
  version: number;
  objects: any[];
  background?: string;
  width: number;
  height: number;
}

export interface BoardElement {
  id: string;
  type: 'rect' | 'circle' | 'triangle' | 'line' | 'text' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  text?: string;
  src?: string;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
}

export class CanvasManager {
  private canvas: Canvas;
  private history: CanvasState[] = [];
  private historyIndex = -1;

  constructor(canvasElement: HTMLCanvasElement, width: number = 800, height: number = 600) {
    this.canvas = new Canvas(canvasElement, {
      width,
      height,
      backgroundColor: '#f8f9fa',
    });

    this.setupEventListeners();
    this.saveState();
  }

  private setupEventListeners() {
    this.canvas.on('object:modified', () => {
      this.saveState();
    });

    this.canvas.on('object:added', () => {
      this.saveState();
    });

    this.canvas.on('object:removed', () => {
      this.saveState();
    });
  }

  private saveState() {
    const state: CanvasState = {
      version: Date.now(),
      objects: this.canvas.toJSON().objects,
      background: this.canvas.backgroundColor as string,
      width: this.canvas.width!,
      height: this.canvas.height!,
    };

    // Remove future history if we're not at the end
    this.history = this.history.slice(0, this.historyIndex + 1);

    this.history.push(state);
    this.historyIndex = this.history.length - 1;

    // Limit history to 50 states
    if (this.history.length > 50) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.loadState(this.history[this.historyIndex]);
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.loadState(this.history[this.historyIndex]);
    }
  }

  private loadState(state: CanvasState) {
    this.canvas.loadFromJSON(state, () => {
      this.canvas.setWidth(state.width);
      this.canvas.setHeight(state.height);
      this.canvas.setBackgroundColor(state.background || '#f8f9fa', () => {
        this.canvas.renderAll();
      });
    });
  }

  addRectangle(x: number = 100, y: number = 100, width: number = 100, height: number = 100, fill: string = '#3b82f6') {
    const rect = new Rect({
      id: uuidv4(),
      left: x,
      top: y,
      width,
      height,
      fill,
      stroke: '#1e40af',
      strokeWidth: 2,
      cornerSize: 6,
      transparentCorners: false,
    });

    this.canvas.add(rect);
    this.canvas.setActiveObject(rect);
    this.canvas.renderAll();
  }

  addCircle(x: number = 150, y: number = 150, radius: number = 50, fill: string = '#ef4444') {
    const circle = new Circle({
      id: uuidv4(),
      left: x,
      top: y,
      radius,
      fill,
      stroke: '#dc2626',
      strokeWidth: 2,
      cornerSize: 6,
      transparentCorners: false,
    });

    this.canvas.add(circle);
    this.canvas.setActiveObject(circle);
    this.canvas.renderAll();
  }

  addTriangle(x: number = 200, y: number = 100, width: number = 100, height: number = 100, fill: string = '#10b981') {
    const triangle = new Triangle({
      id: uuidv4(),
      left: x,
      top: y,
      width,
      height,
      fill,
      stroke: '#059669',
      strokeWidth: 2,
      cornerSize: 6,
      transparentCorners: false,
    });

    this.canvas.add(triangle);
    this.canvas.setActiveObject(triangle);
    this.canvas.renderAll();
  }

  addText(x: number = 100, y: number = 100, text: string = 'Text', fill: string = '#1f2937') {
    const textbox = new Textbox(text, {
      id: uuidv4(),
      left: x,
      top: y,
      width: 200,
      fontSize: 20,
      fill,
      fontFamily: 'Inter, sans-serif',
      cornerSize: 6,
      transparentCorners: false,
    });

    this.canvas.add(textbox);
    this.canvas.setActiveObject(textbox);
    this.canvas.renderAll();
  }

  async addImage(src: string, x: number = 100, y: number = 100) {
    try {
      const img = await FabricImage.fromURL(src);
      img.set({
        id: uuidv4(),
        left: x,
        top: y,
        cornerSize: 6,
        transparentCorners: false,
      });

      // Scale image to reasonable size
      if (img.width! > 200) {
        img.scaleToWidth(200);
      }
      if (img.height! > 200) {
        img.scaleToHeight(200);
      }

      this.canvas.add(img);
      this.canvas.setActiveObject(img);
      this.canvas.renderAll();
    } catch (error) {
      console.error('Failed to load image:', error);
    }
  }

  deleteSelected() {
    const activeObjects = this.canvas.getActiveObjects();
    activeObjects.forEach(obj => {
      this.canvas.remove(obj);
    });
    this.canvas.discardActiveObject();
    this.canvas.renderAll();
  }

  clearCanvas() {
    this.canvas.clear();
    this.canvas.setBackgroundColor('#f8f9fa', () => {
      this.canvas.renderAll();
    });
  }

  setBackgroundColor(color: string) {
    this.canvas.setBackgroundColor(color, () => {
      this.canvas.renderAll();
      this.saveState();
    });
  }

  exportToJSON(): CanvasState {
    return {
      version: Date.now(),
      objects: this.canvas.toJSON().objects,
      background: this.canvas.backgroundColor as string,
      width: this.canvas.width!,
      height: this.canvas.height!,
    };
  }

  importFromJSON(state: CanvasState) {
    this.loadState(state);
  }

  getCanvas(): Canvas {
    return this.canvas;
  }

  dispose() {
    this.canvas.dispose();
  }
}
