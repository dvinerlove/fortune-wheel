export interface Game {
  id: string;
  name: string;
  appId?: string;
  price?: string;
  discount?: string;
  originalPrice?: string;
  color: string;
  image?: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  game: Game;
}

export interface Settings {
  customization: {
    backgroundImage?: string;
    wheelImage?: string;
    wheelImageOpacity: number;
    wheelBgColor: string;
    wheelBgOpacity: number;
    wheelBorderColor: string;
    pointerColor: string;
  };
  steam: {
    region: string;
    currency: string;
    enableIntegration: boolean;
    useProxy: boolean;
  };
  wheel: {
    spinDuration: number;
    showGameNames: boolean;
    showImages: boolean;
    showColors: boolean;
    textPosition: 'inner' | 'middle' | 'outer' | 'far-outer';
    showSectorLines: boolean;
    idleSpin: boolean;
    textColor: string;
    textStrokeColor: string;
    textStrokeWidth: number;
    textTruncationMultiplier: number;
  };
  prices: {
    showPrices: boolean;
    showDiscounts: boolean;
    preloaded: boolean;
  };
  spinButton: {
    text: string;
    backgroundColor: string;
    textColor: string;
  };
  sound: {
    enabled: boolean;
    volume: number;
  };
  titles: {
    main: string;
    subtitle: string;
  };
}

export const DEFAULT_SETTINGS: Settings = {
  customization: {
    wheelBorderColor: '#1f2937',
    pointerColor: '#ffffff',
    wheelImageOpacity: 0.8,
    wheelBgColor: '#000000',
    wheelBgOpacity: 0.1
  },
  steam: {
    region: 'kz',
    currency: 'KZT',
    enableIntegration: true,
    useProxy: true
  },
  wheel: {
    spinDuration: 5,
    showGameNames: true,
    showImages: false,
    showColors: true,
    textPosition: 'outer',
    showSectorLines: true,
    idleSpin: true,
    textColor: '#ffffff',
    textStrokeColor: '#000000',
    textStrokeWidth: 0.1,
    textTruncationMultiplier: 2.5
  },
  prices: {
    showPrices: true,
    showDiscounts: true,
    preloaded: false
  },
  spinButton: {
    text: 'SPIN',
    backgroundColor: '#ffffff',
    textColor: '#1f2937'
  },
  sound: {
    enabled: true,
    volume: 0.5
  },
  titles: {
    main: 'КОЛЕСО ФОРТУНЫ',
    subtitle: 'Крути лудик'
  }
};
