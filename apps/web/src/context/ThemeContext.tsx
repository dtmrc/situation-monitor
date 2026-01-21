import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

// Theme configuration type
export interface ThemeConfig {
  // Core palette
  colors: {
    bg: {
      base: string;
      elevated1: string;
      elevated2: string;
      elevated3: string;
      surface: string;
      input: string;
      hover: string;
      active: string;
    };
    text: {
      primary: string;
      secondary: string;
      muted: string;
      disabled: string;
    };
    accent: {
      success: string;
      info: string;
      warning: string;
      danger: string;
      ai: string;
    };
    border: {
      default: string;
      subtle: string;
      strong: string;
      focus: string;
    };
  };
  // Typography
  fonts: {
    mono: string;
    sans: string;
  };
  // Effects
  effects: {
    scanlines: boolean;
    glowIntensity: 'none' | 'subtle' | 'normal' | 'intense';
    gridPattern: boolean;
  };
}

// Default Ops-Center Dark theme
const defaultTheme: ThemeConfig = {
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
  fonts: {
    mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
    sans: "'Inter', 'SF Pro Display', system-ui, sans-serif",
  },
  effects: {
    scanlines: false,
    glowIntensity: 'normal',
    gridPattern: false,
  },
};

interface ThemeContextValue {
  theme: ThemeConfig;
  updateTheme: (updates: Partial<ThemeConfig>) => void;
  resetTheme: () => void;
  setAccentColor: (key: keyof ThemeConfig['colors']['accent'], color: string) => void;
  toggleEffect: (effect: keyof ThemeConfig['effects']) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: Partial<ThemeConfig>;
}

export function ThemeProvider({ children, initialTheme }: ThemeProviderProps) {
  const [theme, setTheme] = useState<ThemeConfig>(() => ({
    ...defaultTheme,
    ...initialTheme,
  }));

  // Apply CSS variables when theme changes
  useEffect(() => {
    const root = document.documentElement;

    // Background colors
    root.style.setProperty('--color-bg-base', theme.colors.bg.base);
    root.style.setProperty('--color-bg-elevated-1', theme.colors.bg.elevated1);
    root.style.setProperty('--color-bg-elevated-2', theme.colors.bg.elevated2);
    root.style.setProperty('--color-bg-elevated-3', theme.colors.bg.elevated3);
    root.style.setProperty('--color-bg-surface', theme.colors.bg.surface);
    root.style.setProperty('--color-bg-input', theme.colors.bg.input);
    root.style.setProperty('--color-bg-hover', theme.colors.bg.hover);
    root.style.setProperty('--color-bg-active', theme.colors.bg.active);

    // Text colors
    root.style.setProperty('--color-text-primary', theme.colors.text.primary);
    root.style.setProperty('--color-text-secondary', theme.colors.text.secondary);
    root.style.setProperty('--color-text-muted', theme.colors.text.muted);
    root.style.setProperty('--color-text-disabled', theme.colors.text.disabled);

    // Accent colors
    root.style.setProperty('--color-accent-success', theme.colors.accent.success);
    root.style.setProperty('--color-accent-info', theme.colors.accent.info);
    root.style.setProperty('--color-accent-warning', theme.colors.accent.warning);
    root.style.setProperty('--color-accent-danger', theme.colors.accent.danger);
    root.style.setProperty('--color-accent-ai', theme.colors.accent.ai);

    // Border colors
    root.style.setProperty('--color-border-default', theme.colors.border.default);
    root.style.setProperty('--color-border-subtle', theme.colors.border.subtle);
    root.style.setProperty('--color-border-strong', theme.colors.border.strong);
    root.style.setProperty('--color-border-focus', theme.colors.border.focus);

    // Fonts
    root.style.setProperty('--font-family-mono', theme.fonts.mono);
    root.style.setProperty('--font-family-sans', theme.fonts.sans);

    // Effects as data attributes for CSS targeting
    root.dataset.scanlines = String(theme.effects.scanlines);
    root.dataset.glowIntensity = theme.effects.glowIntensity;
    root.dataset.gridPattern = String(theme.effects.gridPattern);
  }, [theme]);

  const updateTheme = (updates: Partial<ThemeConfig>) => {
    setTheme((prev) => ({
      ...prev,
      ...updates,
      colors: { ...prev.colors, ...updates.colors },
      fonts: { ...prev.fonts, ...updates.fonts },
      effects: { ...prev.effects, ...updates.effects },
    }));
  };

  const resetTheme = () => setTheme(defaultTheme);

  const setAccentColor = (key: keyof ThemeConfig['colors']['accent'], color: string) => {
    setTheme((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        accent: { ...prev.colors.accent, [key]: color },
      },
    }));
  };

  const toggleEffect = (effect: keyof ThemeConfig['effects']) => {
    setTheme((prev) => ({
      ...prev,
      effects: {
        ...prev.effects,
        [effect]:
          typeof prev.effects[effect] === 'boolean' ? !prev.effects[effect] : prev.effects[effect],
      },
    }));
  };

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, resetTheme, setAccentColor, toggleEffect }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { defaultTheme };
