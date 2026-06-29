const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#82E0AA', '#F1948A', '#85C1E9'
];

export const INITIAL_GAMES: string[] = [
  "7 Days to DIE", "Abiotic Factor", "Among Us", "Barony", "Barotrauma",
  "Castle Crashers", "Content Warning", "Deep Rock Galactic", "Don't Starve Together",
  "Driftwood", "Echo Point Nova", "ELDEN RING NIGHTREIGN", "Euro Truck Simulator 2",
  "Farming simulator", "Fellowship", "For The King", "Garry's Mod", "GTA 5 ONLINE",
  "Guilty as Sock!", "Human fall flat", "Killing Floor 2", "left 4 dead 2",
  "Lethal Company", "Liar's Bar", "Mage Arena", "Magicka", "Minecraft",
  "Monster Hunter: World", "overcooked", "Party Animals", "PEAK", "Phasmophobia",
  "PowerWash Simulator", "Pummel Party", "R.E.P.O.", "Ready or Not",
  "Remnant: From the Ashes", "Road Redemption", "ROBLOX", "RV There Yet?",
  "Schedule I", "Sea of Thieves", "Slackers - Carts of Glory", "SpeedRunners",
  "Stardew Valley", "STRAFTAT", "Sven Co-op", "SWORN", "Tabletop Simulator",
  "Terraria", "The Binding of Isaac: Rebirth", "THE FINALS", "The Outlast Trials",
  "Tricky Towers", "Ultimate Chicken Horse", "WEBFISHING", "Балунс", "Борда",
  "Клеть", "Черепашки-ниндзя: В поисках Сплинтера", "Helldivers 2", "гномы",
  "far far west", "diablo 4", "warcraft 3", "forza 6"
];

// Mapping common games to their Steam AppIDs for price fetching
export const STEAM_APP_IDS: Record<string, string> = {
  "7 Days to DIE": "251570",
  "Abiotic Factor": "1328350",
  "Among Us": "945360",
  "Barony": "371970",
  "Barotrauma": "602960",
  "Castle Crashers": "204360",
  "Content Warning": "2881650",
  "Deep Rock Galactic": "548430",
  "Don't Starve Together": "322330",
  "Echo Point Nova": "1836730",
  "Euro Truck Simulator 2": "227300",
  "Farming simulator": "1248130", // FS 22
  "For The King": "527230",
  "Garry's Mod": "4000",
  "GTA 5 ONLINE": "271590",
  "Human fall flat": "477160",
  "Killing Floor 2": "232090",
  "left 4 dead 2": "550",
  "Lethal Company": "1966720",
  "Liar's Bar": "3099040",
  "Magicka": "42910",
  "Monster Hunter: World": "582010",
  "overcooked": "448510",
  "Party Animals": "1260320",
  "Phasmophobia": "739630",
  "PowerWash Simulator": "1290000",
  "Pummel Party": "880940",
  "Ready or Not": "1144200",
  "Remnant: From the Ashes": "617290",
  "Road Redemption": "300380",
  "Sea of Thieves": "1172620",
  "SpeedRunners": "207140",
  "Stardew Valley": "413150",
  "Tabletop Simulator": "286160",
  "Terraria": "105600",
  "The Binding of Isaac: Rebirth": "250900",
  "THE FINALS": "1966720",
  "The Outlast Trials": "1159690",
  "Tricky Towers": "437050",
  "Ultimate Chicken Horse": "386940",
  "WEBFISHING": "3146520",
  "Helldivers 2": "553850",
  "diablo 4": "2344520",
  "Балунс": "960090", // Bloons TD 6
  "Борда": "397540", // Borderlands 3
  "Клеть": "2232150", // Kletka
  "Черепашки-ниндзя: В поисках Сплинтера": "2916000",
};

export const getGameColor = (index: number) => COLORS[index % COLORS.length];
