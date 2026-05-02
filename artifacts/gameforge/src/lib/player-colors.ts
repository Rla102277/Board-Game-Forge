export const PLAYER_TYPE_COLORS: Record<string, string> = {
  Character: "#60a5fa",
  NPC: "#4ade80",
  Enemy: "#f87171",
  Boss: "#fb923c",
  Creature: "#c084fc",
  Ally: "#22d3ee",
};

export function playerTypeColor(playerType: string | null | undefined): string {
  return PLAYER_TYPE_COLORS[playerType ?? "Character"] ?? "#7c3aed";
}
