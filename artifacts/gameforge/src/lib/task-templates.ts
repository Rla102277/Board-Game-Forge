export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  category: "development" | "design" | "testing" | "documentation";
  tasks: Array<{
    title: string;
    description?: string;
    status: "backlog" | "in-progress";
    priority: "low" | "medium" | "high";
  }>;
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: "initial-design",
    name: "Initial Design Phase",
    description: "Core tasks for starting a new game design",
    category: "design",
    tasks: [
      { title: "Define game concept and core loop", status: "backlog", priority: "high" },
      { title: "Create initial entity list", status: "backlog", priority: "high" },
      { title: "Draft basic rules", status: "backlog", priority: "high" },
      { title: "Define player roles", status: "backlog", priority: "medium" },
      { title: "Create component list", status: "backlog", priority: "medium" },
    ],
  },
  {
    id: "balance-pass",
    name: "Balance Testing Pass",
    description: "Tasks for testing and balancing the game",
    category: "testing",
    tasks: [
      { title: "Run Monte Carlo simulations", status: "backlog", priority: "high" },
      { title: "Check rule conflicts", status: "backlog", priority: "high" },
      { title: "Review power curves", status: "backlog", priority: "high" },
      { title: "Test edge cases", status: "backlog", priority: "medium" },
      { title: "Update balance based on findings", status: "backlog", priority: "medium" },
    ],
  },
  {
    id: "playtesting",
    name: "Playtesting Session",
    description: "Tasks for conducting a playtest",
    category: "testing",
    tasks: [
      { title: "Schedule playtest session", status: "backlog", priority: "high" },
      { title: "Prepare playtest materials", status: "backlog", priority: "high" },
      { title: "Conduct playtest", status: "backlog", priority: "high" },
      { title: "Collect feedback", status: "backlog", priority: "medium" },
      { title: "Analyze results", status: "backlog", priority: "medium" },
      { title: "Document findings", status: "backlog", priority: "medium" },
    ],
  },
  {
    id: "rulebook-creation",
    name: "Rulebook Creation",
    description: "Tasks for creating the final rulebook",
    category: "documentation",
    tasks: [
      { title: "Write introduction", status: "backlog", priority: "medium" },
      { title: "Document setup rules", status: "backlog", priority: "high" },
      { title: "Document gameplay rules", status: "backlog", priority: "high" },
      { title: "Add examples and diagrams", status: "backlog", priority: "medium" },
      { title: "Create FAQ section", status: "backlog", priority: "low" },
      { title: "Proofread and edit", status: "backlog", priority: "high" },
    ],
  },
  {
    id: "component-design",
    name: "Component Design",
    description: "Tasks for designing game components",
    category: "design",
    tasks: [
      { title: "Design card templates", status: "backlog", priority: "high" },
      { title: "Create board layout", status: "backlog", priority: "high" },
      { title: "Design tokens/meeples", status: "backlog", priority: "medium" },
      { title: "Create player aids", status: "backlog", priority: "medium" },
      { title: "Design box layout", status: "backlog", priority: "low" },
    ],
  },
  {
    id: "kickstarter-prep",
    name: "Kickstarter Preparation",
    description: "Tasks for preparing a Kickstarter campaign",
    category: "development",
    tasks: [
      { title: "Create pitch video", status: "backlog", priority: "high" },
      { title: "Design campaign page", status: "backlog", priority: "high" },
      { title: "Set funding goals", status: "backlog", priority: "high" },
      { title: "Plan pledge tiers", status: "backlog", priority: "high" },
      { title: "Create stretch goals", status: "backlog", priority: "medium" },
      { title: "Prepare marketing materials", status: "backlog", priority: "medium" },
    ],
  },
];

export function getTemplateById(id: string): TaskTemplate | undefined {
  return TASK_TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByCategory(category: TaskTemplate["category"]): TaskTemplate[] {
  return TASK_TEMPLATES.filter(t => t.category === category);
}

export function createCustomTemplate(
  name: string,
  description: string,
  category: TaskTemplate["category"],
  tasks: TaskTemplate["tasks"]
): TaskTemplate {
  return {
    id: `custom-${Date.now()}`,
    name,
    description,
    category,
    tasks,
  };
}
