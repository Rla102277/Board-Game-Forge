import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CanvasManager } from '@/lib/canvas/fabric-utils';
import { CanvasToolbar } from './canvas-toolbar';
import { CanvasProperties } from './canvas-properties';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FabricObject } from 'fabric';

interface CanvasEditorProps {
  projectId: number;
  board?: any;
  initialWidth?: number;
  initialHeight?: number;
  onCanvasChange?: (state: any) => void;
}


export function CanvasEditor({
  projectId,
  board,
  initialWidth = 800,
  initialHeight = 600
}: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasManagerRef = useRef<CanvasManager | null>(null);
  const [selectedTool, setSelectedTool] = useState<string>('select');
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(board?.width || initialWidth);
  const [canvasHeight, setCanvasHeight] = useState(board?.height || initialHeight);
  const [backgroundColor, setBackgroundColor] = useState(board?.canvasState?.background || '#f8f9fa');
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  const emitCanvasChange = useCallback(() => {
    const state = canvasManagerRef.current?.exportToJSON();
    if (state) {
      onCanvasChange?.(state);
    }
  }, [onCanvasChange]);

  useEffect(() => {
    if (!canvasRef.current) return;

    canvasManagerRef.current?.dispose();
    canvasManagerRef.current = new CanvasManager(
      canvasRef.current,
      canvasWidth,
      canvasHeight
    );

    const canvas = canvasManagerRef.current.getCanvas();

    // Set up object selection handler
    canvas.on('selection:created', (e) => {
      setSelectedObject(e.selected?.[0] || null);
    });

    canvas.on('selection:updated', (e) => {
      setSelectedObject(e.selected?.[0] || null);
    });

    canvas.on('selection:cleared', () => {
      setSelectedObject(null);
    });

    // Update undo/redo state
    const updateHistoryState = () => {
      setCanUndo(true);
      setCanRedo(true);
    };

    canvas.on('object:modified', () => {
      updateHistoryState();
      emitCanvasChange();
    });
    canvas.on('object:added', () => {
      updateHistoryState();
      emitCanvasChange();
    });
    canvas.on('object:removed', () => {
      updateHistoryState();
      emitCanvasChange();
    });

    if (board?.canvasState) {
      canvasManagerRef.current.importFromJSON(board.canvasState);
      setBackgroundColor(board.canvasState.background || '#f8f9fa');
      emitCanvasChange();
    }

    return () => {
      canvasManagerRef.current?.dispose();
    };
  }, [canvasWidth, canvasHeight, board]);

  const handleAddRectangle = useCallback(() => {
    canvasManagerRef.current?.addRectangle();
    setSelectedTool('select');
  }, []);

  const handleAddCircle = useCallback(() => {
    canvasManagerRef.current?.addCircle();
    setSelectedTool('select');
  }, []);

  const handleAddTriangle = useCallback(() => {
    canvasManagerRef.current?.addTriangle();
    setSelectedTool('select');
  }, []);

  const handleAddText = useCallback(() => {
    canvasManagerRef.current?.addText();
    setSelectedTool('select');
  }, []);

  const handleAddImage = useCallback(() => {
    setIsImageDialogOpen(true);
  }, []);

  const handleImageSubmit = useCallback(async () => {
    if (imageUrl.trim()) {
      await canvasManagerRef.current?.addImage(imageUrl);
      setImageUrl('');
      setIsImageDialogOpen(false);
      setSelectedTool('select');
      emitCanvasChange();
    }
  }, [imageUrl, emitCanvasChange]);

  const handleUndo = useCallback(() => {
    canvasManagerRef.current?.undo();
  }, []);

  const handleRedo = useCallback(() => {
    canvasManagerRef.current?.redo();
  }, []);

  const handleDelete = useCallback(() => {
    canvasManagerRef.current?.deleteSelected();
    emitCanvasChange();
  }, [emitCanvasChange]);

  const handleClear = useCallback(() => {
    canvasManagerRef.current?.clearCanvas();
    emitCanvasChange();
  }, [emitCanvasChange]);

  const handleExport = useCallback(() => {
    const state = canvasManagerRef.current?.exportToJSON();
    if (state) {
      const dataStr = JSON.stringify(state, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

      const exportFileDefaultName = `board-${Date.now()}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  }, []);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const state = JSON.parse(e.target?.result as string);
            canvasManagerRef.current?.importFromJSON(state);
            emitCanvasChange();
          } catch (error) {
            console.error('Failed to import canvas state:', error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [emitCanvasChange]);

  const handleToggleGrid = useCallback(() => {
    setShowGrid(prev => !prev);
    // TODO: Implement grid rendering
  }, []);

  const handleToggleSnap = useCallback(() => {
    setSnapToGrid(prev => !prev);
    // TODO: Implement snap to grid functionality
  }, []);

  const handlePropertyChange = useCallback((property: string, value: any) => {
    if (selectedObject) {
      selectedObject.set(property as any, value);
      canvasManagerRef.current?.getCanvas().renderAll();
    }
  }, [selectedObject]);

  const handleCanvasResize = useCallback((width: number, height: number) => {
    setCanvasWidth(width);
    setCanvasHeight(height);
  }, []);

  const handleBackgroundChange = useCallback((color: string) => {
    setBackgroundColor(color);
    canvasManagerRef.current?.setBackgroundColor(color);
    emitCanvasChange();
  }, [emitCanvasChange]);

  return (
    <div className="flex flex-col h-full">
      <CanvasToolbar
        onAddRectangle={handleAddRectangle}
        onAddCircle={handleAddCircle}
        onAddTriangle={handleAddTriangle}
        onAddText={handleAddText}
        onAddImage={handleAddImage}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onDelete={handleDelete}
        onClear={handleClear}
        onExport={handleExport}
        onImport={handleImport}
        onToggleGrid={handleToggleGrid}
        onToggleSnap={handleToggleSnap}
        onChangeBackground={handleChangeBackground}
        canUndo={canUndo}
        canRedo={canRedo}
        showGrid={showGrid}
        snapToGrid={snapToGrid}
        selectedTool={selectedTool}
        onSelectTool={setSelectedTool}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex items-center justify-center bg-muted/20 p-4">
          <div className="relative border border-border rounded-lg overflow-hidden shadow-lg">
            <canvas
              ref={canvasRef}
              className="block"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
              }}
            />
          </div>
        </div>

        <CanvasProperties
          selectedObject={selectedObject}
          onPropertyChange={handlePropertyChange}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          onCanvasResize={handleCanvasResize}
          backgroundColor={backgroundColor}
          onBackgroundChange={handleBackgroundChange}
        />
      </div>

      {/* Image URL Dialog */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="image-url">Image URL</Label>
              <Input
                id="image-url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.png"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsImageDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleImageSubmit}>
                Add Image
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}