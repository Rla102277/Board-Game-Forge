import React, { useEffect, useState } from 'react';
import { CanvasEditor } from './canvas/canvas-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BOARD_TEMPLATES } from '@/lib/canvas/board-state';
import { useListBoards, useCreateBoard, useDeleteBoard, useDuplicateBoard, useUpdateBoard } from '@workspace/api-client-react';
import { Plus, Save, Grid3X3, Trash2, Copy } from 'lucide-react';

interface CanvasTabProps {
  projectId: number;
}

export default function CanvasTab({ projectId }: CanvasTabProps) {
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);
  const [currentBoardState, setCurrentBoardState] = useState<any>(null);
  const [showNewBoardDialog, setShowNewBoardDialog] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const { data: boards = [], isLoading } = useListBoards(projectId);
  const createBoardMutation = useCreateBoard(projectId);
  const updateBoardMutation = useUpdateBoard(projectId, currentBoardId ? Number(currentBoardId) : 0);
  const deleteBoardMutation = useDeleteBoard(projectId);
  const duplicateBoardMutation = useDuplicateBoard(projectId);

  const handleCreateBoard = async () => {
    if (newBoardName.trim()) {
      try {
        const template = BOARD_TEMPLATES.find(t => t.id === selectedTemplate);
        const newBoard = await createBoardMutation.mutateAsync({
          name: newBoardName,
          width: 800,
          height: 600,
          gridSize: 20,
          showGrid: true,
          snapToGrid: true,
          canvasState: template?.canvasState || {
            version: 1,
            objects: [],
            background: '#f8f9fa',
            width: 800,
            height: 600,
          },
        });
        setCurrentBoardId(newBoard.id.toString());
        setCurrentBoardState(newBoard.canvasState);
        setNewBoardName('');
        setSelectedTemplate('');
        setShowNewBoardDialog(false);
      } catch (error) {
        console.error('Failed to create board:', error);
      }
    }
  };

  const handleSelectBoard = (boardId: string) => {
    setCurrentBoardId(boardId);
    const board = boards.find(b => b.id.toString() === boardId);
    setCurrentBoardState(board?.canvasState ?? null);
  };

  const handleDeleteBoard = async (boardId: number) => {
    if (confirm('Are you sure you want to delete this board?')) {
      try {
        await deleteBoardMutation.mutateAsync(boardId);
        if (currentBoardId === boardId.toString()) {
          setCurrentBoardId(null);
        }
      } catch (error) {
        console.error('Failed to delete board:', error);
      }
    }
  };

  const handleDuplicateBoard = async (boardId: number, name: string) => {
    try {
      await duplicateBoardMutation.mutateAsync({ boardId, name });
    } catch (error) {
      console.error('Failed to duplicate board:', error);
    }
  };

  const handleSaveBoard = async () => {
    if (!currentBoard || !currentBoardState) {
      return;
    }

    try {
      await updateBoardMutation.mutateAsync({
        canvasState: currentBoardState,
      });
    } catch (error) {
      console.error('Failed to save board:', error);
    }
  };

  const currentBoard = boards.find(b => b.id.toString() === currentBoardId);

  useEffect(() => {
    if (!currentBoardId && boards.length > 0) {
      setCurrentBoardId(boards[0].id.toString());
    }
  }, [boards, currentBoardId]);

  useEffect(() => {
    if (currentBoard) {
      setCurrentBoardState(currentBoard.canvasState ?? null);
    }
  }, [currentBoard]);

  if (!currentBoardId) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold">Visual Design Canvas</h2>
            <p className="text-sm text-muted-foreground">
              Create and edit visual game components
            </p>
          </div>
          <Button onClick={() => setShowNewBoardDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Board
          </Button>
        </div>

        {/* Board Grid */}
        <div className="flex-1 p-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="h-48" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Create New Board Card */}
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow border-dashed"
                onClick={() => setShowNewBoardDialog(true)}
              >
                <CardContent className="flex flex-col items-center justify-center h-48">
                  <Plus className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium text-center">Create New Board</h3>
                  <p className="text-sm text-muted-foreground text-center mt-2">
                    Start designing your game components
                  </p>
                </CardContent>
              </Card>

              {/* Existing Boards */}
              {boards.map((board) => (
                <Card
                  key={board.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleSelectBoard(board.id.toString())}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        Board
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateBoard(board.id, `${board.name} Copy`);
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBoard(board.id);
                          }}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-sm">{board.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-4">
                      {board.width} × {board.height} pixels
                    </p>
                    <div className="aspect-video bg-muted rounded border flex items-center justify-center">
                      <Grid3X3 className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Template Cards */}
              {BOARD_TEMPLATES.map((template) => (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    setSelectedTemplate(template.id);
                    setNewBoardName(`${template.name} Copy`);
                    setShowNewBoardDialog(true);
                  }}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        {template.category}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm">{template.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-4">
                      {template.description}
                    </p>
                    <div className="aspect-video bg-muted rounded border flex items-center justify-center">
                      <Grid3X3 className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* New Board Dialog */}
        {showNewBoardDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Create New Board</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="board-name">Board Name</Label>
                  <Input
                    id="board-name"
                    value={newBoardName}
                    onChange={(e) => setNewBoardName(e.target.value)}
                    placeholder="My Game Board"
                  />
                </div>

                <div>
                  <Label htmlFor="template">Template (Optional)</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Blank Board</SelectItem>
                      {BOARD_TEMPLATES.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowNewBoardDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateBoard}>
                    Create Board
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with board selector */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold">{currentBoard?.name}</h2>
            <p className="text-sm text-muted-foreground">
              Visual Design Canvas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={currentBoardId || ''} onValueChange={handleSelectBoard}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select a board" />
            </SelectTrigger>
            <SelectContent>
              {boards.map((board) => (
                <SelectItem key={board.id} value={board.id.toString()}>
                  {board.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => setShowNewBoardDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New
          </Button>

          <Button
            variant="outline"
            onClick={handleSaveBoard}
            disabled={updateBoardMutation.isLoading || !currentBoardState}
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {/* Canvas Editor */}
      <div className="flex-1">
        <CanvasEditor
          projectId={projectId}
          board={currentBoard}
          initialWidth={currentBoard?.width || 800}
          initialHeight={currentBoard?.height || 600}
          onCanvasChange={setCurrentBoardState}
        />
      </div>
    </div>
  );
}