import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { FabricObject } from 'fabric';

interface CanvasPropertiesProps {
  selectedObject: FabricObject | null;
  onPropertyChange: (property: string, value: any) => void;
  canvasWidth: number;
  canvasHeight: number;
  onCanvasResize: (width: number, height: number) => void;
  backgroundColor: string;
  onBackgroundChange: (color: string) => void;
}

export function CanvasProperties({
  selectedObject,
  onPropertyChange,
  canvasWidth,
  canvasHeight,
  onCanvasResize,
  backgroundColor,
  onBackgroundChange,
}: CanvasPropertiesProps) {
  const [localWidth, setLocalWidth] = useState(canvasWidth);
  const [localHeight, setLocalHeight] = useState(canvasHeight);
  const [localBgColor, setLocalBgColor] = useState(backgroundColor);

  useEffect(() => {
    setLocalWidth(canvasWidth);
    setLocalHeight(canvasHeight);
  }, [canvasWidth, canvasHeight]);

  useEffect(() => {
    setLocalBgColor(backgroundColor);
  }, [backgroundColor]);

  const handleCanvasResize = () => {
    onCanvasResize(localWidth, localHeight);
  };

  const handleBackgroundChange = () => {
    onBackgroundChange(localBgColor);
  };

  const renderObjectProperties = () => {
    if (!selectedObject) {
      return (
        <div className="text-center text-muted-foreground py-8">
          Select an object to edit its properties
        </div>
      );
    }

    const props = selectedObject.toJSON();
    const type = selectedObject.type;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="secondary">{type}</Badge>
          <span className="text-xs text-muted-foreground">
            ID: {(selectedObject as any).id || 'N/A'}
          </span>
        </div>

        {/* Position */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Position</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">X</Label>
              <Input
                type="number"
                value={Math.round((selectedObject.left || 0))}
                onChange={(e) => onPropertyChange('left', parseFloat(e.target.value))}
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Y</Label>
              <Input
                type="number"
                value={Math.round((selectedObject.top || 0))}
                onChange={(e) => onPropertyChange('top', parseFloat(e.target.value))}
                className="h-8"
              />
            </div>
          </div>
        </div>

        {/* Size */}
        {(type === 'rect' || type === 'circle' || type === 'triangle') && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Size</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Width</Label>
                <Input
                  type="number"
                  value={Math.round((selectedObject.width || 0) * (selectedObject.scaleX || 1))}
                  onChange={(e) => onPropertyChange('width', parseFloat(e.target.value))}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Height</Label>
                <Input
                  type="number"
                  value={Math.round((selectedObject.height || 0) * (selectedObject.scaleY || 1))}
                  onChange={(e) => onPropertyChange('height', parseFloat(e.target.value))}
                  className="h-8"
                />
              </div>
            </div>
          </div>
        )}

        {/* Circle specific */}
        {type === 'circle' && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Radius</Label>
            <Input
              type="number"
              value={Math.round((selectedObject as any).radius || 0)}
              onChange={(e) => onPropertyChange('radius', parseFloat(e.target.value))}
              className="h-8"
            />
          </div>
        )}

        {/* Colors */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Colors</Label>
          <div className="space-y-2">
            <div>
              <Label className="text-xs">Fill</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={selectedObject.fill as string || '#000000'}
                  onChange={(e) => onPropertyChange('fill', e.target.value)}
                  className="w-12 h-8 p-1"
                />
                <Input
                  value={selectedObject.fill as string || '#000000'}
                  onChange={(e) => onPropertyChange('fill', e.target.value)}
                  className="flex-1 h-8"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Stroke</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={selectedObject.stroke as string || '#000000'}
                  onChange={(e) => onPropertyChange('stroke', e.target.value)}
                  className="w-12 h-8 p-1"
                />
                <Input
                  value={selectedObject.stroke as string || '#000000'}
                  onChange={(e) => onPropertyChange('stroke', e.target.value)}
                  className="flex-1 h-8"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stroke Width */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Stroke Width</Label>
          <Slider
            value={[selectedObject.strokeWidth as number || 0]}
            onValueChange={([value]) => onPropertyChange('strokeWidth', value)}
            max={20}
            step={1}
            className="w-full"
          />
          <div className="text-xs text-muted-foreground">
            {selectedObject.strokeWidth || 0}px
          </div>
        </div>

        {/* Rotation */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Rotation</Label>
          <Slider
            value={[selectedObject.angle || 0]}
            onValueChange={([value]) => onPropertyChange('angle', value)}
            min={-180}
            max={180}
            step={1}
            className="w-full"
          />
          <div className="text-xs text-muted-foreground">
            {selectedObject.angle || 0}°
          </div>
        </div>

        {/* Opacity */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Opacity</Label>
          <Slider
            value={[selectedObject.opacity || 1]}
            onValueChange={([value]) => onPropertyChange('opacity', value)}
            max={1}
            step={0.01}
            className="w-full"
          />
          <div className="text-xs text-muted-foreground">
            {Math.round((selectedObject.opacity || 1) * 100)}%
          </div>
        </div>

        {/* Text specific */}
        {type === 'textbox' && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Text</Label>
            <Input
              value={(selectedObject as any).text || ''}
              onChange={(e) => onPropertyChange('text', e.target.value)}
              className="h-8"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Font Size</Label>
                <Input
                  type="number"
                  value={(selectedObject as any).fontSize || 20}
                  onChange={(e) => onPropertyChange('fontSize', parseInt(e.target.value))}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Font Family</Label>
                <Select
                  value={(selectedObject as any).fontFamily || 'Inter'}
                  onValueChange={(value) => onPropertyChange('fontFamily', value)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inter">Inter</SelectItem>
                    <SelectItem value="Arial">Arial</SelectItem>
                    <SelectItem value="Helvetica">Helvetica</SelectItem>
                    <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                    <SelectItem value="Courier New">Courier New</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-80 border-l border-border bg-background">
      <div className="p-4 space-y-4">
        {/* Canvas Properties */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Canvas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Size</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Width</Label>
                  <Input
                    type="number"
                    value={localWidth}
                    onChange={(e) => setLocalWidth(parseInt(e.target.value))}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Height</Label>
                  <Input
                    type="number"
                    value={localHeight}
                    onChange={(e) => setLocalHeight(parseInt(e.target.value))}
                    className="h-8"
                  />
                </div>
              </div>
              <Button onClick={handleCanvasResize} size="sm" className="w-full">
                Apply Size
              </Button>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-sm font-medium">Background</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={localBgColor}
                  onChange={(e) => setLocalBgColor(e.target.value)}
                  className="w-12 h-8 p-1"
                />
                <Input
                  value={localBgColor}
                  onChange={(e) => setLocalBgColor(e.target.value)}
                  className="flex-1 h-8"
                />
              </div>
              <Button onClick={handleBackgroundChange} size="sm" className="w-full">
                Apply Background
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Object Properties */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Object Properties</CardTitle>
          </CardHeader>
          <CardContent>
            {renderObjectProperties()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}