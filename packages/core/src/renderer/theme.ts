export type Theme = 'dark' | 'light';

export interface ThemeConfig {
  backgroundColor: string;
  defaultEntityColor: string;
  selectionColor: string;
  measureColor: string;
  gridColor: string;
  crosshairColor: string;
}

export const THEMES: Record<Theme, ThemeConfig> = {
  dark: {
    backgroundColor: '#1a1a2e',
    defaultEntityColor: '#ffffff',
    selectionColor: '#00ff88',
    measureColor: '#ffaa00',
    gridColor: '#333333',
    crosshairColor: '#555555',
  },
  light: {
    backgroundColor: '#ffffff',
    defaultEntityColor: '#000000',
    selectionColor: '#0066ff',
    measureColor: '#ff6600',
    gridColor: '#dddddd',
    crosshairColor: '#cccccc',
  },
};
