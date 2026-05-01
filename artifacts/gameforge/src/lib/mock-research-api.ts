// Mock Research API for testing similar games discovery
// This provides a mock implementation of the backend API endpoint for finding similar games

const SIMILAR_GAMES_DB: Record<string, string[]> = {
  strategy: [
    "Catan",
    "Terraforming Mars",
    "Scythe",
    "Wingspan",
    "Dominion",
    "Agricola",
    "Gloomhaven",
    "7 Wonders",
    "Spirit Island",
    "Brass: Birmingham",
  ],
  party: [
    "Codenames",
    "Telestrations",
    "Wavelength",
    "Jackbox Games",
    "Just One",
    "The Resistance",
    "Werewolf",
    "Deception: Murder in Hong Kong",
  ],
  cooperative: [
    "Pandemic",
    "Forbidden Island",
    "Spirit Island",
    "Gloomhaven",
    "Hanabi",
    "The Crew",
    "The Mind",
    "Overcooked",
  ],
  "deck-builder": [
    "Dominion",
    "Star Realms",
    "Clank!",
    "Aeon's End",
    "Harry Potter: Hogwarts Battle",
    "Legendary",
    "Thunderstone",
  ],
  "roll-and-write": [
    "Yahtzee",
    "Ganz schön Clever",
    "That's Pretty Clever!",
    "Railroad Ink",
    "Dice Conquest",
    "Welcome to...",
  ],
  "worker-placement": [
    "Agricola",
    "Lords of Waterdeep",
    "Stone Age",
    "Caylus",
    "Viticulture",
    "Terraforming Mars",
    "Scythe",
  ],
  "tile-laying": [
    "Carcassonne",
    "Kingdomino",
    "Isle of Skye",
    "Cascadia",
    "Catan",
    "Azul",
    "Kingdom Builder",
  ],
  "social-deduction": [
    "The Resistance",
    "Werewolf",
    "Secret Hitler",
    "Deception: Murder in Hong Kong",
    "Blood on the Clocktower",
    "One Night Ultimate Werewolf",
  ],
  default: [
    "Catan",
    "Ticket to Ride",
    "Pandemic",
    "Carcassonne",
    "Dominion",
    "Wingspan",
    "Azul",
    "Splendor",
    "7 Wonders",
    "Codenames",
  ],
};

function delay(ms: number = 500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock implementation of the similar games discovery API endpoint
 * POST /api/projects/${projectId}/research/similar-games
 * 
 * Request body: { gameName, description, gameType, genre, playerCount }
 * Response: { games: string[] }
 */
export async function findSimilarGames(params: {
  gameName: string;
  description?: string;
  gameType?: string;
  genre?: string;
  playerCount?: string;
}): Promise<{ games: string[] }> {
  await delay(800); // Simulate network delay

  const { gameType, genre, description } = params;

  // Try to match based on game type
  let games: string[] = [];
  if (gameType) {
    const normalizedType = gameType.toLowerCase();
    for (const [key, value] of Object.entries(SIMILAR_GAMES_DB)) {
      if (normalizedType.includes(key) || key.includes(normalizedType)) {
        games = [...games, ...value];
        break;
      }
    }
  }

  // If no match by type, try genre
  if (games.length === 0 && genre) {
    const normalizedGenre = genre.toLowerCase();
    for (const [key, value] of Object.entries(SIMILAR_GAMES_DB)) {
      if (normalizedGenre.includes(key) || key.includes(normalizedGenre)) {
        games = [...games, ...value];
        break;
      }
    }
  }

  // If still no match, try to extract keywords from description
  if (games.length === 0 && description) {
    const desc = description.toLowerCase();
    if (desc.includes("cooperative") || desc.includes("co-op")) {
      games = [...games, ...SIMILAR_GAMES_DB.cooperative];
    }
    if (desc.includes("worker") || desc.includes("placement")) {
      games = [...games, ...SIMILAR_GAMES_DB["worker-placement"]];
    }
    if (desc.includes("deck") || desc.includes("card")) {
      games = [...games, ...SIMILAR_GAMES_DB["deck-builder"]];
    }
    if (desc.includes("tile") || desc.includes("map")) {
      games = [...games, ...SIMILAR_GAMES_DB["tile-laying"]];
    }
    if (desc.includes("party") || desc.includes("social")) {
      games = [...games, ...SIMILAR_GAMES_DB.party];
    }
  }

  // Fallback to default games if still no matches
  if (games.length === 0) {
    games = [...SIMILAR_GAMES_DB.default];
  }

  // Remove duplicates and shuffle for variety
  const uniqueGames = [...new Set(games)];
  const shuffled = uniqueGames.sort(() => Math.random() - 0.5);

  // Return top 8 results
  return { games: shuffled.slice(0, 8) };
}
