import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, GripVertical, Trash2, Edit2, ChevronRight, ChevronDown } from "lucide-react";

interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  turn?: number;
  phase?: string;
  order: number;
  children?: TimelineEvent[];
}

interface StoryboardTimelineProps {
  events: TimelineEvent[];
  onChange: (events: TimelineEvent[]) => void;
}

export function StoryboardTimeline({ events, onChange }: StoryboardTimelineProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addEvent = (parentId?: string) => {
    const newEvent: TimelineEvent = {
      id: `event-${Date.now()}`,
      title: "New Event",
      description: "",
      order: parentId ? 0 : events.length,
    };

    if (parentId) {
      const updatedEvents = events.map(event => {
        if (event.id === parentId) {
          return {
            ...event,
            children: [...(event.children || []), newEvent],
          };
        }
        return event;
      });
      onChange(updatedEvents);
    } else {
      onChange([...events, newEvent]);
    }
  };

  const updateEvent = (id: string, updates: Partial<TimelineEvent>) => {
    const updateRecursive = (events: TimelineEvent[]): TimelineEvent[] => {
      return events.map(event => {
        if (event.id === id) {
          return { ...event, ...updates };
        }
        if (event.children) {
          return { ...event, children: updateRecursive(event.children) };
        }
        return event;
      });
    };
    onChange(updateRecursive(events));
  };

  const deleteEvent = (id: string) => {
    const deleteRecursive = (events: TimelineEvent[]): TimelineEvent[] => {
      return events
        .filter(event => event.id !== id)
        .map(event => ({
          ...event,
          children: event.children ? deleteRecursive(event.children) : undefined,
        }));
    };
    onChange(deleteRecursive(events));
  };

  const renderEvent = (event: TimelineEvent, depth = 0): React.ReactNode => {
    const isExpanded = expandedIds.has(event.id);
    const isEditing = editingId === event.id;

    return (
      <div key={event.id} style={{ marginLeft: depth * 20 }}>
        <div className="flex items-start gap-2 p-3 border border-border rounded-lg bg-card hover:border-primary/50 transition-colors">
          <GripVertical className="h-4 w-4 text-muted-foreground mt-1 cursor-grab" />
          
          <div className="flex-1">
            {isEditing ? (
              <Input
                value={event.title}
                onChange={(e) => updateEvent(event.id, { title: e.target.value })}
                onBlur={() => setEditingId(null)}
                autoFocus
                className="mb-2"
              />
            ) : (
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{event.title}</h4>
                {event.turn && <Badge variant="outline">Turn {event.turn}</Badge>}
                {event.phase && <Badge variant="secondary">{event.phase}</Badge>}
              </div>
            )}
            
            <p className="text-sm text-muted-foreground">{event.description}</p>
          </div>

          <div className="flex items-center gap-1">
            {event.children && event.children.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => toggleExpanded(event.id)}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setEditingId(event.id)}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => addEvent(event.id)}
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive"
              onClick={() => deleteEvent(event.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {isExpanded && event.children && (
          <div className="mt-2 space-y-2">
            {event.children.map(child => renderEvent(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Narrative Timeline
          <Button size="sm" onClick={() => addEvent()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No events yet. Add events to build your narrative timeline.
          </p>
        ) : (
          <div className="space-y-2">
            {events.map(event => renderEvent(event))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
