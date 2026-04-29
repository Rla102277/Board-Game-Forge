export interface SimulatorPreset {
  id: string;
  name: string;
  description: string;
  iterations: number;
  turns: number;
  focus?: string;
  parameters?: Record<string, any>;
}

export const SIMULATOR_PRESETS: SimulatorPreset[] = [
  {
    id: "quick-test",
    name: "Quick Test",
    description: "Fast simulation with 100 iterations",
    iterations: 100,
    turns: 10,
  },
  {
    id: "standard",
    name: "Standard",
    description: "Balanced simulation with 1000 iterations",
    iterations: 1000,
    turns: 20,
  },
  {
    id: "deep-dive",
    name: "Deep Dive",
    description: "Comprehensive simulation with 5000 iterations",
    iterations: 5000,
    turns: 30,
  },
  {
    id: "early-game",
    name: "Early Game Focus",
    description: "Focus on first 5 turns",
    iterations: 1000,
    turns: 5,
    focus: "early-game-balance",
  },
  {
    id: "late-game",
    name: "Late Game Focus",
    description: "Focus on turns 15-25",
    iterations: 1000,
    turns: 25,
    focus: "late-game-scaling",
  },
  {
    id: "aggressive-play",
    name: "Aggressive Play",
    description: "Simulate aggressive player strategies",
    iterations: 1000,
    turns: 20,
    parameters: { playstyle: "aggressive" },
  },
  {
    id: "conservative-play",
    name: "Conservative Play",
    description: "Simulate conservative player strategies",
    iterations: 1000,
    turns: 20,
    parameters: { playstyle: "conservative" },
  },
  {
    id: "random-play",
    name: "Random Play",
    description: "Simulate random player choices",
    iterations: 1000,
    turns: 20,
    parameters: { playstyle: "random" },
  },
];

export function getPresetById(id: string): SimulatorPreset | undefined {
  return SIMULATOR_PRESETS.find(p => p.id === id);
}

export function createCustomPreset(
  name: string,
  description: string,
  iterations: number,
  turns: number,
  focus?: string,
  parameters?: Record<string, any>
): SimulatorPreset {
  return {
    id: `custom-${Date.now()}`,
    name,
    description,
    iterations,
    turns,
    focus,
    parameters,
  };
}
