import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Square,
  Circle,
  Triangle,
  Type,
  Image as ImageIcon,
  Undo,
  Redo,
  Trash2,
  Download,
  Upload,
  Grid3X3,
  Magnet,
  Palette,
  Move,
  RotateCw,
  Copy,
  Scissors,
} from 'lucide-react';

interface CanvasToolbarProps {
  onAddRectangle: () => void;
  onAddCircle: () => void;
  onAddTriangle: () => void;
  onAddText: () => void;
  onAddImage: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onClear: () => void;
  onExport: () => void;
  onImport: () => void;
  onToggleGrid: () => void;
  onToggleSnap: () => void;
  onChangeBackground: () => void;
  canUndo: boolean;
  canRedo: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  selectedTool?: string;
  onSelectTool: (tool: string) => void;
}

export function CanvasToolbar({
  onAddRectangle,
  onAddCircle,
  onAddTriangle,
  onAddText,
  onAddImage,
  onUndo,
  onRedo,
  onDelete,
  onClear,
  onExport,
  onImport,
  onToggleGrid,
  onToggleSnap,
  onChangeBackground,
  canUndo,
  canRedo,
  showGrid,
  snapToGrid,
  selectedTool,
  onSelectTool,
}: CanvasToolbarProps) {
  const tools = [
    { id: 'select', icon: Move, label: 'Select', action: () => onSelectTool('select') },
    { id: 'rectangle', icon: Square, label: 'Rectangle', action: onAddRectangle },
    { id: 'circle', icon: Circle, label: 'Circle', action: onAddCircle },
    { id: 'triangle', icon: Triangle, label: 'Triangle', action: onAddTriangle },
    { id: 'text', icon: Type, label: 'Text', action: onAddText },
    { id: 'image', icon: ImageIcon, label: 'Image', action: onAddImage },
  ];

  const actions = [
    { icon: Undo, label: 'Undo', action: onUndo, disabled: !canUndo },
    { icon: Redo, label: 'Redo', action: onRedo, disabled: !canRedo },
    { icon: Trash2, label: 'Delete', action: onDelete },
    { icon: Copy, label: 'Duplicate', action: () => onSelectTool('duplicate') },
  ];

  const viewOptions = [
    { icon: Grid3X3, label: 'Toggle Grid', action: onToggleGrid, active: showGrid },
    { icon: Magnet, label: 'Snap to Grid', action: onToggleSnap, active: snapToGrid },
    { icon: Palette, label: 'Background', action: onChangeBackground },
  ];

  const fileActions = [
    { icon: Download, label: 'Export', action: onExport },
    { icon: Upload, label: 'Import', action: onImport },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-background border-b border-border">
      {/* Shape Tools */}
      <div className="flex items-center gap-1">
        {tools.map((tool) => (
          <Tooltip key={tool.id}>
            <TooltipTrigger asChild>
              <Button
                variant={selectedTool === tool.id ? 'default' : 'ghost'}
                size="sm"
                onClick={tool.action}
                className="h-8 w-8 p-0"
              >
                <tool.icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{tool.label}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      <Separator orientation="vertical" className="h-6 mx-2" />

      {/* Edit Actions */}
      <div className="flex items-center gap-1">
        {actions.map((action, index) => (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={action.action}
                disabled={action.disabled}
                className="h-8 w-8 p-0"
              >
                <action.icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{action.label}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      <Separator orientation="vertical" className="h-6 mx-2" />

      {/* View Options */}
      <div className="flex items-center gap-1">
        {viewOptions.map((option, index) => (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <Button
                variant={option.active ? 'default' : 'ghost'}
                size="sm"
                onClick={option.action}
                className="h-8 w-8 p-0"
              >
                <option.icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{option.label}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      <Separator orientation="vertical" className="h-6 mx-2" />

      {/* File Actions */}
      <div className="flex items-center gap-1">
        {fileActions.map((action, index) => (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={action.action}
                className="h-8 w-8 p-0"
              >
                <action.icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{action.label}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}