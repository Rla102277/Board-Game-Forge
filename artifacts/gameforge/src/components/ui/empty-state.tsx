import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Sparkles, FileText, Users, Activity, Dice5, ImageIcon, MapPin, Scale, Download, CheckSquare } from "lucide-react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action, secondaryAction }: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
        {icon && (
          <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
            {icon}
          </div>
        )}
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">{description}</p>
        <div className="flex gap-3">
          {action && (
            <Button onClick={action.onClick} size="sm">
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button onClick={secondaryAction.onClick} variant="outline" size="sm">
              {secondaryAction.label}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const SECTION_ICONS: Record<string, ReactNode> = {
  entities: <Plus className="w-8 h-8 text-primary" />,
  players: <Users className="w-8 h-8 text-primary" />,
  rules: <Activity className="w-8 h-8 text-primary" />,
  simulator: <Dice5 className="w-8 h-8 text-primary" />,
  assets: <ImageIcon className="w-8 h-8 text-primary" />,
  playtesting: <MapPin className="w-8 h-8 text-primary" />,
  notes: <FileText className="w-8 h-8 text-primary" />,
  tasks: <CheckSquare className="w-8 h-8 text-primary" />,
  balance: <Scale className="w-8 h-8 text-primary" />,
  export: <Download className="w-8 h-8 text-primary" />,
};

interface SectionEmptyStateProps {
  section: string;
  onAction?: () => void;
  onSecondaryAction?: () => void;
}

export function SectionEmptyState({ section, onAction, onSecondaryAction }: SectionEmptyStateProps) {
  const config: Record<string, { title: string; description: string; actionLabel: string; secondaryLabel?: string }> = {
    entities: {
      title: "No entities yet",
      description: "Create your first game entity - items, factions, locations, or events that define your game world.",
      actionLabel: "Create Entity",
      secondaryLabel: "Generate with AI",
    },
    players: {
      title: "No players defined",
      description: "Define player roles, archetypes, and abilities to create engaging gameplay experiences.",
      actionLabel: "Add Player",
      secondaryLabel: "Generate with AI",
    },
    rules: {
      title: "No rules yet",
      description: "Define the core mechanics and constraints that govern how your game is played.",
      actionLabel: "Add Rule",
      secondaryLabel: "Generate with AI",
    },
    simulator: {
      title: "No simulations run",
      description: "Run simulations to test game balance, calculate win rates, and identify edge cases.",
      actionLabel: "Run Simulation",
    },
    assets: {
      title: "No assets uploaded",
      description: "Upload images, cards, boards, and other visual assets to bring your game to life.",
      actionLabel: "Upload Asset",
    },
    playtesting: {
      title: "No playtest sessions",
      description: "Log playtest sessions to track feedback, identify issues, and iterate on your design.",
      actionLabel: "Log Session",
    },
    notes: {
      title: "No notes yet",
      description: "Capture ideas, design decisions, and thoughts as you develop your game.",
      actionLabel: "Add Note",
    },
    tasks: {
      title: "No tasks yet",
      description: "Create tasks to track your development progress and stay organized.",
      actionLabel: "Add Task",
    },
    balance: {
      title: "No balance analysis",
      description: "Run balance analysis to identify power imbalances, optimal strategies, and design flaws.",
      actionLabel: "Run Analysis",
    },
    export: {
      title: "No exports yet",
      description: "Export your game design as rulebooks, cards, or printable components.",
      actionLabel: "Create Export",
    },
  };

  const sectionConfig = config[section] || {
    title: "Nothing here yet",
    description: "Get started by adding content to this section.",
    actionLabel: "Add Item",
  };

  return (
    <EmptyState
      icon={SECTION_ICONS[section] || <Sparkles className="w-8 h-8 text-primary" />}
      title={sectionConfig.title}
      description={sectionConfig.description}
      action={onAction ? { label: sectionConfig.actionLabel, onClick: onAction } : undefined}
      secondaryAction={
        onSecondaryAction && sectionConfig.secondaryLabel
          ? { label: sectionConfig.secondaryLabel, onClick: onSecondaryAction }
          : undefined
      }
    />
  );
}
