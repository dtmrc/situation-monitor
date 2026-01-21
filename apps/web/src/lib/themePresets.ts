import type { ThemeConfig } from '@/context/ThemeContext';

type ThemePreset = Pick<ThemeConfig, 'colors'>;

export const themePresets: Record<string, ThemePreset> = {
  // Default tactical dark theme
  'ops-center-dark': {
    colors: {
      bg: {
        base: '#0a0a0a',
        elevated1: '#0f0f0f',
        elevated2: '#111111',
        elevated3: '#161616',
        surface: '#1a1a1a',
        input: '#222222',
        hover: '#2a2a2a',
        active: '#3a3a3a',
      },
      text: {
        primary: '#e5e5e5',
        secondary: '#a3a3a3',
        muted: '#737373',
        disabled: '#525252',
      },
      accent: {
        success: '#00ff88',
        info: '#00d4ff',
        warning: '#ffaa00',
        danger: '#ff3333',
        ai: '#a855f7',
      },
      border: {
        default: '#2a2a2a',
        subtle: '#1a1a1a',
        strong: '#3a3a3a',
        focus: '#00ff88',
      },
    },
  },

  // Military/DOD inspired theme
  'military-green': {
    colors: {
      bg: {
        base: '#0a0d0a',
        elevated1: '#0f120f',
        elevated2: '#121512',
        elevated3: '#161a16',
        surface: '#1a1f1a',
        input: '#202520',
        hover: '#252b25',
        active: '#303830',
      },
      text: {
        primary: '#c8d4c8',
        secondary: '#8fa38f',
        muted: '#607060',
        disabled: '#404840',
      },
      accent: {
        success: '#4ade80',
        info: '#38bdf8',
        warning: '#fbbf24',
        danger: '#ef4444',
        ai: '#a78bfa',
      },
      border: {
        default: '#2a3a2a',
        subtle: '#1a2a1a',
        strong: '#3a4a3a',
        focus: '#4ade80',
      },
    },
  },

  // High contrast for accessibility
  'high-contrast': {
    colors: {
      bg: {
        base: '#000000',
        elevated1: '#0a0a0a',
        elevated2: '#0f0f0f',
        elevated3: '#141414',
        surface: '#1a1a1a',
        input: '#1f1f1f',
        hover: '#2a2a2a',
        active: '#3a3a3a',
      },
      text: {
        primary: '#ffffff',
        secondary: '#d0d0d0',
        muted: '#909090',
        disabled: '#606060',
      },
      accent: {
        success: '#00ff00',
        info: '#00ffff',
        warning: '#ffff00',
        danger: '#ff0000',
        ai: '#ff00ff',
      },
      border: {
        default: '#404040',
        subtle: '#303030',
        strong: '#505050',
        focus: '#00ff00',
      },
    },
  },

  // Navy/Maritime theme
  'maritime-blue': {
    colors: {
      bg: {
        base: '#0a0c10',
        elevated1: '#0f1218',
        elevated2: '#121620',
        elevated3: '#161a28',
        surface: '#1a1f30',
        input: '#202538',
        hover: '#252b40',
        active: '#303850',
      },
      text: {
        primary: '#e0e4ec',
        secondary: '#98a2b8',
        muted: '#606880',
        disabled: '#404860',
      },
      accent: {
        success: '#22d3ee',
        info: '#3b82f6',
        warning: '#f59e0b',
        danger: '#ef4444',
        ai: '#8b5cf6',
      },
      border: {
        default: '#2a3050',
        subtle: '#1a2040',
        strong: '#3a4060',
        focus: '#3b82f6',
      },
    },
  },
};

export function getThemePreset(name: keyof typeof themePresets): ThemePreset | undefined {
  return themePresets[name];
}
