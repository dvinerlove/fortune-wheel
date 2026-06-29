const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#82E0AA', '#F1948A', '#85C1E9'
];

export const INITIAL_GAMES: string[] = [
];

// Mapping common games to their Steam AppIDs for price fetching
export const STEAM_APP_IDS: Record<string, string> = {
};

export const getGameColor = (index: number) => COLORS[index % COLORS.length];
