export interface GameTemplate {
  id: string;
  name: string;
  description: string;
  gameType: string;
  genre: string;
  playerCount: string;
  targetDuration: string;
  suggestedEntities: TemplateEntity[];
  suggestedRules: TemplateRule[];
  suggestedPlayers: TemplatePlayer[];
}

export interface TemplateEntity {
  name: string;
  type: string;
  description: string;
  stats?: Record<string, string>;
}

export interface TemplateRule {
  title: string;
  content: string;
  category: string;
  priority: string;
}

export interface TemplatePlayer {
  name: string;
  role: string;
  description: string;
}

export const GAME_TEMPLATES: GameTemplate[] = [
  {
    id: "deck-builder",
    name: "Deck Builder",
    description: "Players start with identical decks and improve them by acquiring better cards from a central market.",
    gameType: "Deck Builder",
    genre: "Strategy",
    playerCount: "2-4",
    targetDuration: "30-60 min",
    suggestedEntities: [
      { name: "Market Card", type: "Item", description: "Cards available for purchase from the central market" },
      { name: "Starting Deck", type: "Item", description: "Basic cards each player begins with" },
      { name: "Currency", type: "Item", description: "Resources used to purchase cards" },
      { name: "Victory Point", type: "Event", description: "End-game scoring condition" },
    ],
    suggestedRules: [
      { title: "Card Acquisition", content: "On your turn, you may purchase one card from the market using your currency.", category: "economy", priority: "high" },
      { title: "Deck Refresh", content: "When your draw pile is empty, shuffle your discard pile to form a new draw pile.", category: "turn_structure", priority: "high" },
      { title: "Hand Limit", content: "You may have up to 5 cards in your hand at the end of your turn.", category: "turn_structure", priority: "medium" },
      { title: "Game End", content: "The game ends when the victory point pile is empty or all market piles are empty.", category: "variant", priority: "high" },
    ],
    suggestedPlayers: [
      { name: "Aggressive Player", role: "Engine Builder", description: "Focuses on building powerful card combos" },
      { name: "Conservative Player", role: "Point Collector", description: "Prioritizes victory points over engine building" },
    ],
  },
  {
    id: "worker-placement",
    name: "Worker Placement",
    description: "Players place workers on action spaces to gain resources, take actions, or block opponents.",
    gameType: "Worker Placement",
    genre: "Strategy",
    playerCount: "2-5",
    targetDuration: "60-120 min",
    suggestedEntities: [
      { name: "Worker", type: "Item", description: "Meeples that players place on the board" },
      { name: "Resource", type: "Item", description: "Wood, stone, food, etc. collected by workers" },
      { name: "Action Space", type: "Location", description: "Locations where workers can be placed" },
      { name: "Building", type: "Location", description: "Structures that provide ongoing benefits" },
    ],
    suggestedRules: [
      { title: "Worker Placement", content: "Place one worker on an available action space each turn.", category: "turn_structure", priority: "high" },
      { title: "Blocking", content: "Once a worker is placed on a space, other players cannot use that space this round.", category: "turn_structure", priority: "high" },
      { title: "Worker Retrieval", content: "Retrieve all workers at the end of the round.", category: "turn_structure", priority: "high" },
      { title: "Resource Conversion", content: "Convert resources into buildings or victory points.", category: "economy", priority: "medium" },
    ],
    suggestedPlayers: [
      { name: "First Player", role: "Initiator", description: "Goes first each round, gains first pick of actions" },
      { name: "Last Player", role: "Reactor", description: "Gains bonus resources to compensate for going last" },
    ],
  },
  {
    id: "cooperative",
    name: "Cooperative",
    description: "Players work together against a common challenge, winning or losing as a team.",
    gameType: "Cooperative",
    genre: "Strategy",
    playerCount: "1-4",
    targetDuration: "45-90 min",
    suggestedEntities: [
      { name: "Threat", type: "Event", description: "Enemy or challenge the players must overcome" },
      { name: "Resource", type: "Item", description: "Shared pool of resources for the team" },
      { name: "Objective", type: "Event", description: "Goal the players must achieve to win" },
      { name: "Hero", type: "Item", description: "Player characters with unique abilities" },
    ],
    suggestedRules: [
      { title: "Shared Resources", content: "All resources are shared among all players.", category: "economy", priority: "high" },
      { title: "Turn Order", content: "Players take turns in clockwise order, discussing strategy before each action.", category: "turn_structure", priority: "medium" },
      { title: "Threat Escalation", content: "Threats increase in difficulty after each round.", category: "variant", priority: "high" },
      { title: "Team Victory", content: "The team wins if all objectives are completed before any threat condition is met.", category: "variant", priority: "high" },
    ],
    suggestedPlayers: [
      { name: "Support Player", role: "Healer", description: "Specializes in helping others and managing resources" },
      { name: "Combat Player", role: "Fighter", description: "Focuses on defeating threats and protecting the team" },
    ],
  },
  {
    id: "party-game",
    name: "Party Game",
    description: "Fast-paced, social game for groups with simple rules and high player interaction.",
    gameType: "Party",
    genre: "Social",
    playerCount: "4-10",
    targetDuration: "15-30 min",
    suggestedEntities: [
      { name: "Card", type: "Item", description: "Game cards with prompts or challenges" },
      { name: "Team", type: "Faction", description: "Groups of players competing together" },
      { name: "Timer", type: "Item", description: "Time limit for rounds" },
      { name: "Score", type: "Event", description: "Points awarded for successful challenges" },
    ],
    suggestedRules: [
      { title: "Round Structure", content: "Each round has a time limit and a specific challenge type.", category: "turn_structure", priority: "high" },
      { title: "Voting", content: "Players vote on the best response or performance.", category: "turn_structure", priority: "high" },
      { title: "Scoring", content: "Points awarded based on vote results or challenge completion.", category: "economy", priority: "medium" },
      { title: "Rotation", content: "Rotate roles or teams after each round.", category: "variant", priority: "low" },
    ],
    suggestedPlayers: [
      { name: "Team Captain", role: "Leader", description: "Organizes team strategy and final answers" },
      { name: "Wildcard", role: "Creative", description: "Brings unexpected ideas and humor to challenges" },
    ],
  },
  {
    id: "area-control",
    name: "Area Control",
    description: "Players compete to control territories on a map, gaining points for controlled areas.",
    gameType: "Area Control",
    genre: "Strategy",
    playerCount: "2-5",
    targetDuration: "60-90 min",
    suggestedEntities: [
      { name: "Territory", type: "Location", description: "Regions on the map that can be controlled" },
      { name: "Unit", type: "Item", description: "Military forces that occupy territories" },
      { name: "Capital", type: "Location", description: "Home base for each player" },
      { name: "Resource", type: "Item", description: "Income generated from controlled territories" },
    ],
    suggestedRules: [
      { title: "Movement", content: "Move units to adjacent territories during your turn.", category: "movement", priority: "high" },
      { title: "Combat", content: "When entering an enemy territory, resolve combat using dice or cards.", category: "combat", priority: "high" },
      { title: "Control", content: "A territory is controlled if you have more units there than any opponent.", category: "variant", priority: "high" },
      { title: "Scoring", content: "Score points at end of each round based on controlled territories.", category: "economy", priority: "high" },
    ],
    suggestedPlayers: [
      { name: "Expander", role: "Aggressor", description: "Focuses on rapid territorial expansion" },
      { name: "Defender", role: "Fortifier", description: "Builds strong defensive positions" },
    ],
  },
  {
    id: "social-deduction",
    name: "Social Deduction",
    description: "Players have hidden roles and must deduce who is on which team through discussion and voting.",
    gameType: "Social Deduction",
    genre: "Social",
    playerCount: "5-10",
    targetDuration: "30-60 min",
    suggestedEntities: [
      { name: "Role Card", type: "Item", description: "Hidden role assigned to each player" },
      { name: "Team", type: "Faction", description: "Good team vs Evil team" },
      { name: "Vote", type: "Event", description: "Democratic action to eliminate suspects" },
      { name: "Mission", type: "Event", description: "Team objectives that must be completed" },
    ],
    suggestedRules: [
      { title: "Role Assignment", content: "Each player is secretly assigned a role.", category: "variant", priority: "high" },
      { title: "Discussion Phase", content: "Players discuss and share information openly.", category: "turn_structure", priority: "high" },
      { title: "Voting Phase", content: "Vote to eliminate a suspected enemy or approve a mission.", category: "turn_structure", priority: "high" },
      { title: "Win Conditions", content: "Good team wins by eliminating all evil players. Evil team wins by reaching a threshold.", category: "variant", priority: "high" },
    ],
    suggestedPlayers: [
      { name: "Leader", role: "Organizer", description: "Drives discussion and guides team decisions" },
      { name: "Deceiver", role: "Spy", description: "Blends in while secretly working against the team" },
    ],
  },
];

export function getTemplateById(id: string): GameTemplate | undefined {
  return GAME_TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByType(gameType: string): GameTemplate[] {
  return GAME_TEMPLATES.filter(t => t.gameType.toLowerCase() === gameType.toLowerCase());
}
