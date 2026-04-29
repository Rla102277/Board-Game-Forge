import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, Plus, Clock, Users, MapPin } from "lucide-react";
import { format } from "date-fns";

interface PlaytestSession {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  location?: string;
  attendees: string[];
  notes?: string;
  status: "scheduled" | "completed" | "cancelled";
}

interface PlaytestCalendarProps {
  sessions: PlaytestSession[];
  onAddSession: (session: Omit<PlaytestSession, "id">) => void;
  onUpdateSession: (id: string, updates: Partial<PlaytestSession>) => void;
}

export function PlaytestCalendar({ sessions, onAddSession, onUpdateSession }: PlaytestCalendarProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    date: "",
    time: "",
    duration: 60,
    location: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddSession({
      ...formData,
      attendees: [],
      status: "scheduled",
    });
    setShowForm(false);
    setFormData({ title: "", date: "", time: "", duration: 60, location: "", notes: "" });
  };

  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(`${a.date} ${a.time}`).getTime() - new Date(`${b.date} ${b.time}`).getTime()
  );

  const upcomingSessions = sortedSessions.filter(s => s.status === "scheduled");
  const completedSessions = sortedSessions.filter(s => s.status === "completed");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Playtest Schedule
            </div>
            <Button size="sm" onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Session
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-muted/50 rounded-lg mb-4">
              <Input
                placeholder="Session title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  required
                />
              </div>
              <Input
                type="number"
                placeholder="Duration (minutes)"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
              />
              <Input
                placeholder="Location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
              <textarea
                placeholder="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="min-h-[80px] p-3 rounded-lg border border-input bg-background text-sm resize-none"
              />
              <div className="flex gap-2">
                <Button type="submit">Schedule</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          )}

          {upcomingSessions.length === 0 && completedSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No playtest sessions scheduled yet.
            </p>
          ) : (
            <div className="space-y-4">
              {upcomingSessions.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Upcoming Sessions</h4>
                  <div className="space-y-2">
                    {upcomingSessions.map((session) => (
                      <SessionCard key={session.id} session={session} onUpdate={onUpdateSession} />
                    ))}
                  </div>
                </div>
              )}

              {completedSessions.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Past Sessions</h4>
                  <div className="space-y-2">
                    {completedSessions.map((session) => (
                      <SessionCard key={session.id} session={session} onUpdate={onUpdateSession} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SessionCard({ session, onUpdate }: { session: PlaytestSession; onUpdate: (id: string, updates: Partial<PlaytestSession>) => void }) {
  return (
    <div className={`p-4 rounded-lg border ${session.status === "completed" ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium">{session.title}</h4>
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              {format(new Date(session.date), "MMM d, yyyy")}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {session.time}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {session.duration} min
            </span>
            {session.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {session.location}
              </span>
            )}
          </div>
        </div>
        <Badge variant={session.status === "completed" ? "secondary" : "default"}>
          {session.status}
        </Badge>
      </div>
    </div>
  );
}
