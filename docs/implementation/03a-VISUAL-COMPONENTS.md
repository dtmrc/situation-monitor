# Phase 3a: Visual Components & Design System

## Overview

**Parent:** [03-FRONTEND-FOUNDATION.md](./03-FRONTEND-FOUNDATION.md)

This document covers the comprehensive design system for Situation Monitor, including the ops-center dark theme, design tokens architecture, typography system, tactical visual effects, and reusable layout components.

**Tasks Covered:** 3.4, 3.5, 3.6, 3.7, 3.8, 3.9

**Purpose:** Establish a maintainable, token-based design system with tactical ops-center aesthetics that can be consistently applied across all UI components and easily modified in the future.

---

## Implementation Tasks

| ID | Task | Agent | Priority | Dependencies |
|----|------|-------|----------|--------------|
| 3.4 | Set up Tailwind with ops-center theme | `ops-center-ui-expert` | Critical | 3.1 |
| 3.5 | Initialize shadcn/ui components | `ops-center-ui-expert` | Critical | 3.4 |
| 3.6 | Create AppShell layout component | `ops-center-ui-expert` | High | 3.5 |
| 3.7 | Build Sidebar navigation | `ops-center-ui-expert` | High | 3.6 |
| 3.8 | Build Header component | `ops-center-ui-expert` | High | 3.6 |
| 3.9 | Build StatusBar component | `ops-center-ui-expert` | Medium | 3.6 |

---

## Design Philosophy

### Tactical Operations Center Aesthetic

The visual design blends **terminal/CLI aesthetics** with **tactical display systems** found in military operations centers, SCADA interfaces, and intelligence platforms like situation.watch.

**Core Principles:**

1. **Function Over Form** - Every visual element serves a purpose; no decorative noise
2. **High Information Density** - Maximize data visibility without overwhelming
3. **Low-Light Optimized** - Near-black backgrounds reduce eye strain during extended sessions
4. **Monospace Data Displays** - Fixed-width fonts for aligned data, timestamps, and metrics
5. **Status-Driven Color** - Color conveys meaning (green=active, amber=warning, red=critical)
6. **Subtle Motion** - Animations indicate system activity without distraction
7. **Grid-Based Layout** - Precise alignment creates order and scannability

### Design Influences

| Source | Elements Borrowed |
|--------|-------------------|
| Terminal/CLI | Monospace fonts, cursor blink, command-line aesthetic |
| Military C2 Systems | Status indicators, threat levels, grid overlays |
| SCADA/Industrial | Data density, system health displays, alarm states |
| Aviation Displays | Dark backgrounds, high contrast, status bars |
| situation.watch | Near-black palette, glow effects, tactical styling |

---

## Design Tokens Architecture

Design tokens are the atomic building blocks of the design system. All visual properties are defined as tokens, enabling consistent styling and easy theme modifications.

### Token Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    PRIMITIVE TOKENS                          │
│  Raw values: colors, sizes, fonts (not semantic)            │
│  e.g., gray-900: #0a0a0a, green-500: #00ff88               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SEMANTIC TOKENS                           │
│  Purpose-driven aliases referencing primitives              │
│  e.g., --background: gray-900, --accent-success: green-500  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   COMPONENT TOKENS                           │
│  Component-specific tokens referencing semantic tokens      │
│  e.g., --button-primary-bg: accent-success                  │
└─────────────────────────────────────────────────────────────┘
```

### Token Naming Convention

```
--{category}-{property}-{variant}-{state}

Examples:
--color-bg-primary
--color-text-muted
--color-accent-success-hover
--spacing-component-padding
--typography-heading-size-lg
```

---

## Color System

### Primitive Color Palette

These are the raw color values. Never use primitives directly in components—always reference semantic tokens.

```css
/* apps/web/src/styles/tokens/colors.css */

:root {
  /* ═══════════════════════════════════════════════════════════
     PRIMITIVE COLORS - RAW VALUES
     Do not use directly. Reference via semantic tokens.
     ═══════════════════════════════════════════════════════════ */

  /* NEUTRALS - Gray Scale */
  --primitive-gray-950: #050505;  /* Deepest black */
  --primitive-gray-900: #0a0a0a;  /* Primary background */
  --primitive-gray-850: #0f0f0f;  /* Elevated surface 1 */
  --primitive-gray-800: #111111;  /* Elevated surface 2 (cards) */
  --primitive-gray-750: #161616;  /* Elevated surface 3 */
  --primitive-gray-700: #1a1a1a;  /* Tertiary surface */
  --primitive-gray-650: #222222;  /* Input backgrounds */
  --primitive-gray-600: #2a2a2a;  /* Borders, dividers */
  --primitive-gray-500: #3a3a3a;  /* Subtle borders */
  --primitive-gray-400: #525252;  /* Disabled states */
  --primitive-gray-300: #737373;  /* Muted text */
  --primitive-gray-200: #a3a3a3;  /* Secondary text */
  --primitive-gray-100: #d4d4d4;  /* Primary text */
  --primitive-gray-50:  #e5e5e5;  /* Bright text */
  --primitive-white:    #fafafa;  /* Maximum contrast */

  /* GREEN - Terminal / Success / Active */
  --primitive-green-950: #001a0d;
  --primitive-green-900: #003319;
  --primitive-green-800: #004d26;
  --primitive-green-700: #006633;
  --primitive-green-600: #008040;
  --primitive-green-500: #00ff88;  /* PRIMARY ACCENT */
  --primitive-green-400: #33ff9f;
  --primitive-green-300: #66ffb6;
  --primitive-green-200: #99ffcd;
  --primitive-green-100: #ccffe4;

  /* CYAN/BLUE - Tactical / Info / Links */
  --primitive-cyan-950: #001a1f;
  --primitive-cyan-900: #00333d;
  --primitive-cyan-800: #004d5c;
  --primitive-cyan-700: #00667a;
  --primitive-cyan-600: #008099;
  --primitive-cyan-500: #00d4ff;   /* TACTICAL BLUE */
  --primitive-cyan-400: #33dcff;
  --primitive-cyan-300: #66e5ff;
  --primitive-cyan-200: #99edff;
  --primitive-cyan-100: #ccf6ff;

  /* AMBER - Warning / Attention */
  --primitive-amber-950: #1a1100;
  --primitive-amber-900: #332200;
  --primitive-amber-800: #4d3300;
  --primitive-amber-700: #664400;
  --primitive-amber-600: #805500;
  --primitive-amber-500: #ffaa00;  /* WARNING AMBER */
  --primitive-amber-400: #ffbb33;
  --primitive-amber-300: #ffcc66;
  --primitive-amber-200: #ffdd99;
  --primitive-amber-100: #ffeecc;

  /* RED - Critical / Danger / Destructive */
  --primitive-red-950: #1a0808;
  --primitive-red-900: #330f0f;
  --primitive-red-800: #4d1717;
  --primitive-red-700: #661f1f;
  --primitive-red-600: #802626;
  --primitive-red-500: #ff3333;    /* CRITICAL RED */
  --primitive-red-400: #ff5c5c;
  --primitive-red-300: #ff8585;
  --primitive-red-200: #ffadad;
  --primitive-red-100: #ffd6d6;

  /* PURPLE - AI / Analysis / Intelligence */
  --primitive-purple-950: #0f0517;
  --primitive-purple-900: #1e0a2e;
  --primitive-purple-800: #2d0f45;
  --primitive-purple-700: #3c145c;
  --primitive-purple-600: #4b1973;
  --primitive-purple-500: #a855f7;  /* AI PURPLE */
  --primitive-purple-400: #b877f9;
  --primitive-purple-300: #c999fa;
  --primitive-purple-200: #d9bbfc;
  --primitive-purple-100: #eaddfd;

  /* BLUE - Deep Blue for secondary accents */
  --primitive-blue-950: #000a1a;
  --primitive-blue-900: #001433;
  --primitive-blue-800: #001f4d;
  --primitive-blue-700: #002966;
  --primitive-blue-600: #003380;
  --primitive-blue-500: #3b82f6;   /* SECONDARY BLUE */
  --primitive-blue-400: #629bf7;
  --primitive-blue-300: #89b4f9;
  --primitive-blue-200: #b0cdfa;
  --primitive-blue-100: #d7e6fc;
}
```

### Semantic Color Tokens

These are the tokens to use throughout the application. They provide meaning and can be remapped for theme variations.

```css
:root {
  /* ═══════════════════════════════════════════════════════════
     SEMANTIC TOKENS - PURPOSE-DRIVEN
     Use these in components and utilities.
     ═══════════════════════════════════════════════════════════ */

  /* BACKGROUNDS */
  --color-bg-base:        var(--primitive-gray-900);   /* Main app background */
  --color-bg-elevated-1:  var(--primitive-gray-850);   /* Slight elevation */
  --color-bg-elevated-2:  var(--primitive-gray-800);   /* Cards, panels */
  --color-bg-elevated-3:  var(--primitive-gray-750);   /* Modals, popovers */
  --color-bg-surface:     var(--primitive-gray-700);   /* Interactive surfaces */
  --color-bg-input:       var(--primitive-gray-650);   /* Form inputs */
  --color-bg-hover:       var(--primitive-gray-600);   /* Hover states */
  --color-bg-active:      var(--primitive-gray-500);   /* Active/pressed */
  --color-bg-overlay:     rgba(0, 0, 0, 0.8);          /* Modal overlays */

  /* TEXT */
  --color-text-primary:   var(--primitive-gray-50);    /* Primary text */
  --color-text-secondary: var(--primitive-gray-200);   /* Secondary text */
  --color-text-muted:     var(--primitive-gray-300);   /* Muted/disabled text */
  --color-text-disabled:  var(--primitive-gray-400);   /* Disabled states */
  --color-text-inverse:   var(--primitive-gray-900);   /* Text on light bg */

  /* BORDERS */
  --color-border-default: var(--primitive-gray-600);   /* Standard borders */
  --color-border-subtle:  var(--primitive-gray-700);   /* Subtle dividers */
  --color-border-strong:  var(--primitive-gray-500);   /* Emphasized borders */
  --color-border-focus:   var(--primitive-green-500);  /* Focus rings */

  /* ACCENT - SUCCESS / ACTIVE / PRIMARY */
  --color-accent-success:         var(--primitive-green-500);
  --color-accent-success-hover:   var(--primitive-green-400);
  --color-accent-success-muted:   var(--primitive-green-900);
  --color-accent-success-subtle:  rgba(0, 255, 136, 0.1);

  /* ACCENT - INFO / TACTICAL */
  --color-accent-info:            var(--primitive-cyan-500);
  --color-accent-info-hover:      var(--primitive-cyan-400);
  --color-accent-info-muted:      var(--primitive-cyan-900);
  --color-accent-info-subtle:     rgba(0, 212, 255, 0.1);

  /* ACCENT - WARNING */
  --color-accent-warning:         var(--primitive-amber-500);
  --color-accent-warning-hover:   var(--primitive-amber-400);
  --color-accent-warning-muted:   var(--primitive-amber-900);
  --color-accent-warning-subtle:  rgba(255, 170, 0, 0.1);

  /* ACCENT - DANGER / CRITICAL */
  --color-accent-danger:          var(--primitive-red-500);
  --color-accent-danger-hover:    var(--primitive-red-400);
  --color-accent-danger-muted:    var(--primitive-red-900);
  --color-accent-danger-subtle:   rgba(255, 51, 51, 0.1);

  /* ACCENT - AI / ANALYSIS */
  --color-accent-ai:              var(--primitive-purple-500);
  --color-accent-ai-hover:        var(--primitive-purple-400);
  --color-accent-ai-muted:        var(--primitive-purple-900);
  --color-accent-ai-subtle:       rgba(168, 85, 247, 0.1);

  /* STATUS INDICATOR COLORS */
  --color-status-online:    var(--primitive-green-500);
  --color-status-degraded:  var(--primitive-amber-500);
  --color-status-offline:   var(--primitive-red-500);
  --color-status-unknown:   var(--primitive-gray-400);

  /* THREAT LEVEL COLORS */
  --color-threat-critical:  var(--primitive-red-500);
  --color-threat-high:      #ff6b35;  /* Orange-red */
  --color-threat-medium:    var(--primitive-amber-500);
  --color-threat-low:       #7cb342;  /* Yellow-green */
  --color-threat-minimal:   var(--primitive-green-500);

  /* GLOW EFFECTS */
  --color-glow-green:   rgba(0, 255, 136, 0.4);
  --color-glow-cyan:    rgba(0, 212, 255, 0.4);
  --color-glow-amber:   rgba(255, 170, 0, 0.4);
  --color-glow-red:     rgba(255, 51, 51, 0.4);
  --color-glow-purple:  rgba(168, 85, 247, 0.4);
}
```

### Color Swatch Reference

Visual reference for all accent colors:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SITUATION MONITOR COLOR SWATCHES                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  TERMINAL GREEN (#00ff88)              TACTICAL CYAN (#00d4ff)      │
│  ┌────────────────────┐               ┌────────────────────┐        │
│  │████████████████████│ 500 Primary   │████████████████████│ 500    │
│  │████████████████████│ #00ff88       │████████████████████│ #00d4ff│
│  ├────────────────────┤               ├────────────────────┤        │
│  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ 400 Hover     │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ 400    │
│  │░░░░░░░░░░░░░░░░░░░░│ 900 Muted     │░░░░░░░░░░░░░░░░░░░░│ 900    │
│  └────────────────────┘               └────────────────────┘        │
│  Use: Active states, success,         Use: Links, info, tactical   │
│       primary actions, online              highlights, secondary   │
│                                                                      │
│  WARNING AMBER (#ffaa00)               CRITICAL RED (#ff3333)       │
│  ┌────────────────────┐               ┌────────────────────┐        │
│  │████████████████████│ 500 Primary   │████████████████████│ 500    │
│  │████████████████████│ #ffaa00       │████████████████████│ #ff3333│
│  ├────────────────────┤               ├────────────────────┤        │
│  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ 400 Hover     │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ 400    │
│  │░░░░░░░░░░░░░░░░░░░░│ 900 Muted     │░░░░░░░░░░░░░░░░░░░░│ 900    │
│  └────────────────────┘               └────────────────────┘        │
│  Use: Warnings, attention,            Use: Errors, critical alerts,│
│       degraded states                      destructive actions     │
│                                                                      │
│  AI PURPLE (#a855f7)                   NEUTRAL GRAY SCALE           │
│  ┌────────────────────┐               ┌────────────────────┐        │
│  │████████████████████│ 500 Primary   │                    │ 950    │
│  │████████████████████│ #a855f7       │████████████████████│ 900    │
│  ├────────────────────┤               │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ 800    │
│  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ 400 Hover     │░░░░░░░░░░░░░░░░░░░░│ 600    │
│  │░░░░░░░░░░░░░░░░░░░░│ 900 Muted     │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│ 300    │
│  └────────────────────┘               │████████████████████│ 50     │
│  Use: AI features, analysis,          └────────────────────┘        │
│       intelligence functions          Backgrounds → Text            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Typography System

### Font Stack

The typography system uses a dual-font approach:

| Purpose | Font Stack | Usage |
|---------|------------|-------|
| **Data Display** | `'JetBrains Mono', 'Fira Code', 'SF Mono', 'Consolas', monospace` | Timestamps, metrics, codes, IDs, tables |
| **Interface** | `'Inter', 'SF Pro', system-ui, -apple-system, sans-serif` | Headings, labels, body text |

### Monospace-First Philosophy

Situation Monitor is a **data-dense application**. Monospace fonts are prioritized for:

- **Alignment** - Fixed-width ensures columns align perfectly
- **Readability** - Each character occupies the same space, easier to scan
- **Technical Aesthetic** - Reinforces the ops-center/terminal feel
- **Timestamps** - Critical for temporal data (2024-01-15T14:32:08Z)
- **Identifiers** - Project IDs, threat codes, coordinates

```css
:root {
  /* ═══════════════════════════════════════════════════════════
     TYPOGRAPHY TOKENS
     ═══════════════════════════════════════════════════════════ */

  /* FONT FAMILIES */
  --font-family-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', 'Consolas', 'Liberation Mono', monospace;
  --font-family-sans: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;

  /* FONT SIZES - Based on 16px root */
  --font-size-2xs:   0.625rem;   /* 10px - Micro labels */
  --font-size-xs:    0.75rem;    /* 12px - Small labels, status bar */
  --font-size-sm:    0.875rem;   /* 14px - Body text, inputs */
  --font-size-base:  1rem;       /* 16px - Default */
  --font-size-lg:    1.125rem;   /* 18px - Emphasis */
  --font-size-xl:    1.25rem;    /* 20px - Section headers */
  --font-size-2xl:   1.5rem;     /* 24px - Page titles */
  --font-size-3xl:   1.875rem;   /* 30px - Large displays */
  --font-size-4xl:   2.25rem;    /* 36px - Hero metrics */

  /* LINE HEIGHTS */
  --line-height-none:    1;
  --line-height-tight:   1.25;
  --line-height-snug:    1.375;
  --line-height-normal:  1.5;
  --line-height-relaxed: 1.625;
  --line-height-loose:   2;

  /* FONT WEIGHTS */
  --font-weight-normal:   400;
  --font-weight-medium:   500;
  --font-weight-semibold: 600;
  --font-weight-bold:     700;

  /* LETTER SPACING */
  --letter-spacing-tighter: -0.05em;
  --letter-spacing-tight:   -0.025em;
  --letter-spacing-normal:  0;
  --letter-spacing-wide:    0.025em;
  --letter-spacing-wider:   0.05em;
  --letter-spacing-widest:  0.1em;

  /* MONOSPACE SPECIFIC */
  --font-mono-size-adjust:  0.95;  /* Slightly smaller for visual balance */
}
```

### Typography Scale

```
┌─────────────────────────────────────────────────────────────────────┐
│                     TYPOGRAPHY SCALE REFERENCE                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  DATA DISPLAYS (Monospace)                                          │
│  ─────────────────────────                                          │
│                                                                      │
│  .data-hero        36px  │  font-mono font-bold                     │
│  ████████████████████████│  "1,247 ACTIVE THREATS"                  │
│                          │                                          │
│  .data-metric      24px  │  font-mono font-semibold                 │
│  ████████████████████    │  "STATUS: NOMINAL"                       │
│                          │                                          │
│  .data-value       14px  │  font-mono font-medium                   │
│  ██████████████          │  "2024-01-15T14:32:08Z"                  │
│                          │                                          │
│  .data-label       12px  │  font-mono font-normal uppercase         │
│  ████████████            │  "LAST UPDATED"                          │
│                          │                                          │
│  .data-micro       10px  │  font-mono font-normal                   │
│  ██████████              │  "REF: TH-2024-0847"                     │
│                                                                      │
│  INTERFACE TEXT (Sans-serif)                                        │
│  ────────────────────────                                           │
│                                                                      │
│  .heading-page     24px  │  font-sans font-semibold                 │
│  ████████████████████████│  "Threat Assessment"                     │
│                          │                                          │
│  .heading-section  20px  │  font-sans font-semibold                 │
│  ██████████████████████  │  "Active Indicators"                     │
│                          │                                          │
│  .heading-card     16px  │  font-sans font-medium                   │
│  ████████████████████    │  "Risk Matrix"                           │
│                          │                                          │
│  .body-default     14px  │  font-sans font-normal                   │
│  ██████████████          │  Standard body text                      │
│                          │                                          │
│  .label            12px  │  font-sans font-medium uppercase         │
│  ████████████            │  "PROBABILITY"                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Typography CSS Classes

```css
@layer components {
  /* ═══════════════════════════════════════════════════════════
     DATA DISPLAY TYPOGRAPHY (Monospace)
     Use for metrics, timestamps, codes, IDs, tables
     ═══════════════════════════════════════════════════════════ */

  .data-hero {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-4xl);
    font-weight: var(--font-weight-bold);
    line-height: var(--line-height-none);
    letter-spacing: var(--letter-spacing-tight);
    font-variant-numeric: tabular-nums;
  }

  .data-metric {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-tight);
    letter-spacing: var(--letter-spacing-normal);
    font-variant-numeric: tabular-nums;
  }

  .data-value {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-normal);
    letter-spacing: var(--letter-spacing-normal);
    font-variant-numeric: tabular-nums;
  }

  .data-label {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-normal);
    line-height: var(--line-height-normal);
    letter-spacing: var(--letter-spacing-wider);
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .data-micro {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-normal);
    line-height: var(--line-height-normal);
    letter-spacing: var(--letter-spacing-wide);
    color: var(--color-text-muted);
  }

  .data-timestamp {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-normal);
    font-variant-numeric: tabular-nums;
    color: var(--color-text-secondary);
  }

  .data-code {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-sm);
    background: var(--color-bg-surface);
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    color: var(--color-accent-info);
  }

  /* ═══════════════════════════════════════════════════════════
     INTERFACE TYPOGRAPHY (Sans-serif)
     Use for headings, labels, body text, buttons
     ═══════════════════════════════════════════════════════════ */

  .heading-page {
    font-family: var(--font-family-sans);
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-tight);
    letter-spacing: var(--letter-spacing-tight);
    color: var(--color-text-primary);
  }

  .heading-section {
    font-family: var(--font-family-sans);
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-snug);
    color: var(--color-text-primary);
  }

  .heading-card {
    font-family: var(--font-family-sans);
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-snug);
    color: var(--color-text-primary);
  }

  .body-default {
    font-family: var(--font-family-sans);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-normal);
    line-height: var(--line-height-normal);
    color: var(--color-text-secondary);
  }

  .label-default {
    font-family: var(--font-family-sans);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    letter-spacing: var(--letter-spacing-wide);
    text-transform: uppercase;
    color: var(--color-text-muted);
  }
}
```

---

## Tactical Visual Effects

### Glow Effects

Glows are used sparingly to indicate:
- Active/focused states
- Live data
- Critical alerts
- Primary actions

```css
@layer components {
  /* ═══════════════════════════════════════════════════════════
     GLOW EFFECTS
     Apply to indicate active states and draw attention
     ═══════════════════════════════════════════════════════════ */

  .glow-green {
    box-shadow:
      0 0 4px var(--color-glow-green),
      0 0 8px rgba(0, 255, 136, 0.2),
      0 0 16px rgba(0, 255, 136, 0.1);
  }

  .glow-green-intense {
    box-shadow:
      0 0 8px var(--color-glow-green),
      0 0 16px rgba(0, 255, 136, 0.3),
      0 0 32px rgba(0, 255, 136, 0.15);
  }

  .glow-cyan {
    box-shadow:
      0 0 4px var(--color-glow-cyan),
      0 0 8px rgba(0, 212, 255, 0.2),
      0 0 16px rgba(0, 212, 255, 0.1);
  }

  .glow-amber {
    box-shadow:
      0 0 4px var(--color-glow-amber),
      0 0 8px rgba(255, 170, 0, 0.2),
      0 0 16px rgba(255, 170, 0, 0.1);
  }

  .glow-red {
    box-shadow:
      0 0 4px var(--color-glow-red),
      0 0 8px rgba(255, 51, 51, 0.2),
      0 0 16px rgba(255, 51, 51, 0.1);
  }

  .glow-red-intense {
    box-shadow:
      0 0 8px var(--color-glow-red),
      0 0 16px rgba(255, 51, 51, 0.4),
      0 0 32px rgba(255, 51, 51, 0.2);
  }

  .glow-purple {
    box-shadow:
      0 0 4px var(--color-glow-purple),
      0 0 8px rgba(168, 85, 247, 0.2),
      0 0 16px rgba(168, 85, 247, 0.1);
  }

  /* Text glow for high emphasis */
  .text-glow-green {
    text-shadow:
      0 0 4px var(--color-glow-green),
      0 0 8px rgba(0, 255, 136, 0.3);
  }

  .text-glow-cyan {
    text-shadow:
      0 0 4px var(--color-glow-cyan),
      0 0 8px rgba(0, 212, 255, 0.3);
  }
}
```

### Scanline & CRT Effects

Optional retro-tactical aesthetic effects.

```css
@layer components {
  /* ═══════════════════════════════════════════════════════════
     SCANLINE / CRT EFFECTS
     Use sparingly for tactical aesthetic
     ═══════════════════════════════════════════════════════════ */

  /* Horizontal scanlines overlay */
  .scanlines::after {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 0, 0, 0.15) 2px,
      rgba(0, 0, 0, 0.15) 4px
    );
    pointer-events: none;
    z-index: 100;
  }

  /* Subtle screen flicker */
  .crt-flicker {
    animation: crt-flicker 0.15s infinite;
  }

  @keyframes crt-flicker {
    0% { opacity: 0.97; }
    50% { opacity: 1; }
    100% { opacity: 0.98; }
  }

  /* VHS-style noise texture */
  .noise-overlay::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    opacity: 0.02;
    pointer-events: none;
    z-index: 99;
  }

  /* Moving scanline animation */
  .scanline-sweep::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(
      180deg,
      transparent,
      rgba(0, 255, 136, 0.1),
      transparent
    );
    animation: scanline-sweep 8s linear infinite;
    pointer-events: none;
    z-index: 101;
  }

  @keyframes scanline-sweep {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(100vh); }
  }
}
```

### Grid Patterns

Tactical grid backgrounds for dashboards and map overlays.

```css
@layer components {
  /* ═══════════════════════════════════════════════════════════
     GRID PATTERNS
     Tactical grid backgrounds for structure
     ═══════════════════════════════════════════════════════════ */

  /* Standard tactical grid */
  .grid-tactical {
    background-image:
      linear-gradient(to right, var(--color-border-subtle) 1px, transparent 1px),
      linear-gradient(to bottom, var(--color-border-subtle) 1px, transparent 1px);
    background-size: 24px 24px;
  }

  /* Larger grid for maps */
  .grid-tactical-lg {
    background-image:
      linear-gradient(to right, var(--color-border-subtle) 1px, transparent 1px),
      linear-gradient(to bottom, var(--color-border-subtle) 1px, transparent 1px);
    background-size: 48px 48px;
  }

  /* Dot grid pattern */
  .grid-dots {
    background-image: radial-gradient(
      circle,
      var(--color-border-default) 1px,
      transparent 1px
    );
    background-size: 16px 16px;
  }

  /* Crosshair pattern for targeting */
  .grid-crosshair {
    background-image:
      linear-gradient(to right, transparent 49%, var(--color-border-default) 49%, var(--color-border-default) 51%, transparent 51%),
      linear-gradient(to bottom, transparent 49%, var(--color-border-default) 49%, var(--color-border-default) 51%, transparent 51%);
    background-size: 100% 100%;
    background-position: center center;
  }
}
```

### Status Indicators

Animated status dots and indicators.

```css
@layer components {
  /* ═══════════════════════════════════════════════════════════
     STATUS INDICATORS
     Animated dots showing system/connection status
     ═══════════════════════════════════════════════════════════ */

  .status-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .status-dot-sm {
    width: 6px;
    height: 6px;
  }

  .status-dot-lg {
    width: 12px;
    height: 12px;
  }

  /* Online/Active - Pulsing green */
  .status-online {
    background-color: var(--color-status-online);
    animation: status-pulse 2s ease-in-out infinite;
    box-shadow: 0 0 4px var(--color-glow-green);
  }

  /* Degraded/Warning - Pulsing amber */
  .status-degraded {
    background-color: var(--color-status-degraded);
    animation: status-pulse 1.5s ease-in-out infinite;
    box-shadow: 0 0 4px var(--color-glow-amber);
  }

  /* Offline/Critical - Pulsing red */
  .status-offline {
    background-color: var(--color-status-offline);
    animation: status-pulse-fast 1s ease-in-out infinite;
    box-shadow: 0 0 4px var(--color-glow-red);
  }

  /* Unknown/Inactive - Static gray */
  .status-unknown {
    background-color: var(--color-status-unknown);
  }

  /* Connecting - Rotating */
  .status-connecting {
    background-color: var(--color-accent-info);
    animation: status-spin 1s linear infinite;
  }

  @keyframes status-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(0.95); }
  }

  @keyframes status-pulse-fast {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.9); }
  }

  @keyframes status-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Blinking cursor for terminal effect */
  .cursor-blink::after {
    content: '█';
    animation: blink 1s step-start infinite;
    color: var(--color-accent-success);
  }

  @keyframes blink {
    50% { opacity: 0; }
  }
}
```

---

## Animation & Motion System

The motion system provides smooth, purposeful animations that enhance UX without being distracting. All animations follow the principle of **subtle motion** - they indicate system activity and state changes without overwhelming the tactical display.

### Animation Tokens

```css
:root {
  /* ═══════════════════════════════════════════════════════════
     ANIMATION TOKENS
     Consistent timing and easing across all animations
     ═══════════════════════════════════════════════════════════ */

  /* DURATIONS */
  --duration-instant:   75ms;    /* Micro-interactions */
  --duration-fast:      150ms;   /* Quick feedback */
  --duration-normal:    250ms;   /* Standard transitions */
  --duration-slow:      400ms;   /* Deliberate motion */
  --duration-slower:    600ms;   /* Complex animations */

  /* EASING CURVES */
  --ease-linear:        linear;
  --ease-in:            cubic-bezier(0.4, 0, 1, 1);
  --ease-out:           cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out:        cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce:        cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-spring:        cubic-bezier(0.175, 0.885, 0.32, 1.275);

  /* SEMANTIC ANIMATION TIMING */
  --transition-colors:  var(--duration-fast) var(--ease-out);
  --transition-opacity: var(--duration-normal) var(--ease-out);
  --transition-transform: var(--duration-normal) var(--ease-out);
  --transition-all:     var(--duration-normal) var(--ease-in-out);
}
```

### Core Animation Keyframes

```css
@layer components {
  /* ═══════════════════════════════════════════════════════════
     FADE ANIMATIONS
     Smooth opacity transitions for content appearance
     ═══════════════════════════════════════════════════════════ */

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes fade-out {
    from { opacity: 1; }
    to { opacity: 0; }
  }

  @keyframes fade-in-up {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fade-in-down {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fade-in-left {
    from {
      opacity: 0;
      transform: translateX(8px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes fade-in-right {
    from {
      opacity: 0;
      transform: translateX(-8px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  /* ═══════════════════════════════════════════════════════════
     SCALE ANIMATIONS
     Zoom effects for modals, popovers, dropdowns
     ═══════════════════════════════════════════════════════════ */

  @keyframes scale-in {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes scale-out {
    from {
      opacity: 1;
      transform: scale(1);
    }
    to {
      opacity: 0;
      transform: scale(0.95);
    }
  }

  @keyframes scale-in-center {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* ═══════════════════════════════════════════════════════════
     SLIDE ANIMATIONS
     Panel and drawer transitions
     ═══════════════════════════════════════════════════════════ */

  @keyframes slide-in-right {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }

  @keyframes slide-out-right {
    from { transform: translateX(0); }
    to { transform: translateX(100%); }
  }

  @keyframes slide-in-left {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
  }

  @keyframes slide-in-bottom {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }

  @keyframes slide-in-top {
    from { transform: translateY(-100%); }
    to { transform: translateY(0); }
  }

  /* ═══════════════════════════════════════════════════════════
     LOADING / ACTIVITY ANIMATIONS
     Progress indicators and loading states
     ═══════════════════════════════════════════════════════════ */

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  @keyframes ping {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    75%, 100% {
      transform: scale(2);
      opacity: 0;
    }
  }

  @keyframes bounce {
    0%, 100% {
      transform: translateY(-5%);
      animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
    }
    50% {
      transform: translateY(0);
      animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
    }
  }

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  /* ═══════════════════════════════════════════════════════════
     TACTICAL ANIMATIONS
     Ops-center specific effects
     ═══════════════════════════════════════════════════════════ */

  @keyframes radar-sweep {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes data-stream {
    0% {
      transform: translateY(0);
      opacity: 1;
    }
    100% {
      transform: translateY(-20px);
      opacity: 0;
    }
  }

  @keyframes highlight-pulse {
    0%, 100% {
      box-shadow: 0 0 0 0 var(--color-accent-success);
    }
    50% {
      box-shadow: 0 0 0 4px transparent;
    }
  }

  @keyframes alert-flash {
    0%, 50%, 100% { opacity: 1; }
    25%, 75% { opacity: 0.3; }
  }
}
```

### CSS Animation Utility Classes

```css
@layer components {
  /* ═══════════════════════════════════════════════════════════
     ANIMATION UTILITY CLASSES
     Apply directly to elements for common animations
     ═══════════════════════════════════════════════════════════ */

  /* Fade animations */
  .animate-fade-in {
    animation: fade-in var(--duration-normal) var(--ease-out) forwards;
  }

  .animate-fade-in-up {
    animation: fade-in-up var(--duration-normal) var(--ease-out) forwards;
  }

  .animate-fade-in-down {
    animation: fade-in-down var(--duration-normal) var(--ease-out) forwards;
  }

  /* Scale animations */
  .animate-scale-in {
    animation: scale-in var(--duration-fast) var(--ease-out) forwards;
  }

  .animate-scale-in-center {
    animation: scale-in-center var(--duration-normal) var(--ease-bounce) forwards;
  }

  /* Slide animations */
  .animate-slide-in-right {
    animation: slide-in-right var(--duration-normal) var(--ease-out) forwards;
  }

  .animate-slide-in-left {
    animation: slide-in-left var(--duration-normal) var(--ease-out) forwards;
  }

  .animate-slide-in-bottom {
    animation: slide-in-bottom var(--duration-normal) var(--ease-out) forwards;
  }

  /* Loading animations */
  .animate-spin {
    animation: spin 1s linear infinite;
  }

  .animate-pulse {
    animation: pulse 2s ease-in-out infinite;
  }

  .animate-ping {
    animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
  }

  .animate-bounce {
    animation: bounce 1s infinite;
  }

  /* Skeleton loading shimmer */
  .animate-shimmer {
    background: linear-gradient(
      90deg,
      var(--color-bg-surface) 0%,
      var(--color-bg-hover) 50%,
      var(--color-bg-surface) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
  }

  /* Tactical animations */
  .animate-radar {
    animation: radar-sweep 4s linear infinite;
  }

  .animate-highlight {
    animation: highlight-pulse 2s ease-in-out infinite;
  }

  .animate-alert {
    animation: alert-flash 1s ease-in-out infinite;
  }

  /* Stagger delay utilities */
  .delay-75 { animation-delay: 75ms; }
  .delay-150 { animation-delay: 150ms; }
  .delay-300 { animation-delay: 300ms; }
  .delay-500 { animation-delay: 500ms; }
  .delay-700 { animation-delay: 700ms; }
  .delay-1000 { animation-delay: 1000ms; }
}
```

### Transition Utilities

```css
@layer utilities {
  /* ═══════════════════════════════════════════════════════════
     TRANSITION UTILITIES
     Smooth property transitions for interactive elements
     ═══════════════════════════════════════════════════════════ */

  .transition-none { transition: none; }

  .transition-colors {
    transition-property: color, background-color, border-color, fill, stroke;
    transition-timing-function: var(--ease-out);
    transition-duration: var(--duration-fast);
  }

  .transition-opacity {
    transition-property: opacity;
    transition-timing-function: var(--ease-out);
    transition-duration: var(--duration-normal);
  }

  .transition-transform {
    transition-property: transform;
    transition-timing-function: var(--ease-out);
    transition-duration: var(--duration-normal);
  }

  .transition-all {
    transition-property: all;
    transition-timing-function: var(--ease-in-out);
    transition-duration: var(--duration-normal);
  }

  .transition-shadow {
    transition-property: box-shadow;
    transition-timing-function: var(--ease-out);
    transition-duration: var(--duration-fast);
  }

  /* Hover lift effect */
  .hover-lift {
    transition: transform var(--duration-fast) var(--ease-out),
                box-shadow var(--duration-fast) var(--ease-out);
  }

  .hover-lift:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  /* Hover glow effect */
  .hover-glow {
    transition: box-shadow var(--duration-fast) var(--ease-out);
  }

  .hover-glow:hover {
    box-shadow: 0 0 12px var(--color-glow-green);
  }

  /* Press effect */
  .active-press:active {
    transform: scale(0.98);
  }
}
```

### React Animation Components

**File: `apps/web/src/components/ui/animations/FadeIn.tsx`**
```typescript
import { ReactNode, CSSProperties } from 'react';
import { cn } from '@/lib/utils';

type FadeDirection = 'up' | 'down' | 'left' | 'right' | 'none';

interface FadeInProps {
  children: ReactNode;
  direction?: FadeDirection;
  delay?: number;
  duration?: number;
  className?: string;
  once?: boolean; // Only animate once on mount
}

const directionClasses: Record<FadeDirection, string> = {
  none: 'animate-fade-in',
  up: 'animate-fade-in-up',
  down: 'animate-fade-in-down',
  left: 'animate-fade-in-left',
  right: 'animate-fade-in-right',
};

export function FadeIn({
  children,
  direction = 'none',
  delay = 0,
  duration,
  className,
}: FadeInProps) {
  const style: CSSProperties = {
    animationDelay: delay ? `${delay}ms` : undefined,
    animationDuration: duration ? `${duration}ms` : undefined,
  };

  return (
    <div
      className={cn('opacity-0', directionClasses[direction], className)}
      style={style}
    >
      {children}
    </div>
  );
}
```

**File: `apps/web/src/components/ui/animations/Stagger.tsx`**
```typescript
import { Children, ReactNode, cloneElement, isValidElement } from 'react';

interface StaggerProps {
  children: ReactNode;
  staggerDelay?: number; // Delay between each child (ms)
  initialDelay?: number; // Initial delay before first item
  className?: string;
}

export function Stagger({
  children,
  staggerDelay = 75,
  initialDelay = 0,
  className,
}: StaggerProps) {
  return (
    <div className={className}>
      {Children.map(children, (child, index) => {
        if (!isValidElement(child)) return child;

        const delay = initialDelay + index * staggerDelay;

        return cloneElement(child as React.ReactElement<{ style?: React.CSSProperties }>, {
          style: {
            ...((child.props as { style?: React.CSSProperties }).style || {}),
            animationDelay: `${delay}ms`,
          },
        });
      })}
    </div>
  );
}
```

**File: `apps/web/src/components/ui/animations/Collapse.tsx`**
```typescript
import { ReactNode, useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CollapseProps {
  children: ReactNode;
  isOpen: boolean;
  duration?: number;
  className?: string;
}

export function Collapse({
  children,
  isOpen,
  duration = 250,
  className,
}: CollapseProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | 'auto'>(isOpen ? 'auto' : 0);

  useEffect(() => {
    if (!contentRef.current) return;

    if (isOpen) {
      const contentHeight = contentRef.current.scrollHeight;
      setHeight(contentHeight);
      // After animation, set to auto for dynamic content
      const timer = setTimeout(() => setHeight('auto'), duration);
      return () => clearTimeout(timer);
    } else {
      // First set explicit height, then collapse
      setHeight(contentRef.current.scrollHeight);
      requestAnimationFrame(() => setHeight(0));
    }
  }, [isOpen, duration]);

  return (
    <div
      className={cn('overflow-hidden transition-[height]', className)}
      style={{
        height,
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: 'var(--ease-out)',
      }}
    >
      <div ref={contentRef}>{children}</div>
    </div>
  );
}
```

**File: `apps/web/src/components/ui/animations/Presence.tsx`**
```typescript
import { ReactNode, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface PresenceProps {
  children: ReactNode;
  isVisible: boolean;
  enterAnimation?: string;
  exitAnimation?: string;
  duration?: number;
  className?: string;
}

export function Presence({
  children,
  isVisible,
  enterAnimation = 'animate-fade-in',
  exitAnimation = 'animate-fade-out',
  duration = 250,
  className,
}: PresenceProps) {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [animationClass, setAnimationClass] = useState(
    isVisible ? enterAnimation : ''
  );

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      setAnimationClass(enterAnimation);
    } else if (shouldRender) {
      setAnimationClass(exitAnimation);
      const timer = setTimeout(() => setShouldRender(false), duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, enterAnimation, exitAnimation, duration, shouldRender]);

  if (!shouldRender) return null;

  return (
    <div
      className={cn(animationClass, className)}
      style={{ animationDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}
```

### Skeleton Loading Components

**File: `apps/web/src/components/ui/Skeleton.tsx`**
```typescript
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  return (
    <div
      className={cn(
        'bg-bg-surface animate-shimmer',
        variantClasses[variant],
        className
      )}
      style={{ width, height }}
    />
  );
}

// Pre-built skeleton patterns
export function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="rectangular" height={100} />
      <div className="space-y-2">
        <Skeleton variant="text" />
        <Skeleton variant="text" width="80%" />
      </div>
    </div>
  );
}

export function SkeletonTableRow() {
  return (
    <tr className="border-b border-border-subtle">
      <td className="p-3"><Skeleton variant="text" width={80} /></td>
      <td className="p-3"><Skeleton variant="text" /></td>
      <td className="p-3"><Skeleton variant="text" width={100} /></td>
      <td className="p-3"><Skeleton variant="text" width={60} /></td>
    </tr>
  );
}

export function SkeletonMetric() {
  return (
    <div className="space-y-2">
      <Skeleton variant="text" width={60} height={12} />
      <Skeleton variant="text" width={100} height={32} />
    </div>
  );
}
```

### Loading Spinners

**File: `apps/web/src/components/ui/Spinner.tsx`**
```typescript
import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'tactical';
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-3',
  xl: 'w-12 h-12 border-4',
};

export function Spinner({ size = 'md', variant = 'default', className }: SpinnerProps) {
  if (variant === 'tactical') {
    return (
      <div className={cn('relative', sizeClasses[size], className)}>
        <div className="absolute inset-0 rounded-full border-2 border-border-default" />
        <div
          className={cn(
            'absolute inset-0 rounded-full',
            'border-2 border-transparent border-t-accent-success',
            'animate-spin'
          )}
        />
        <div className="absolute inset-1 rounded-full bg-bg-surface/50" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-full border-border-default border-t-accent-success animate-spin',
        sizeClasses[size],
        className
      )}
    />
  );
}

// Full-screen loading overlay
export function LoadingOverlay({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="xl" variant="tactical" />
        {message && (
          <p className="data-label text-text-muted animate-pulse">{message}</p>
        )}
      </div>
    </div>
  );
}
```

### Page Transition Wrapper

**File: `apps/web/src/components/layout/PageTransition.tsx`**
```typescript
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <div className={cn('animate-fade-in-up', className)}>
      {children}
    </div>
  );
}

// Use in route components
// export function DashboardPage() {
//   return (
//     <PageTransition>
//       <DashboardContent />
//     </PageTransition>
//   );
// }
```

### Animation Best Practices

| Principle | Guideline |
|-----------|-----------|
| **Duration** | Keep under 400ms for UI feedback; longer for complex transitions |
| **Easing** | Use `ease-out` for entrances, `ease-in` for exits, `ease-in-out` for transforms |
| **Purpose** | Every animation should communicate state change or provide feedback |
| **Reduce Motion** | Respect `prefers-reduced-motion` media query |
| **Performance** | Animate `transform` and `opacity` only when possible (GPU accelerated) |
| **Stagger** | Use 50-100ms delays for list animations |
| **Context** | Match animation style to component importance |

### Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Spacing & Layout Tokens

```css
:root {
  /* ═══════════════════════════════════════════════════════════
     SPACING TOKENS
     Consistent spacing scale (4px base unit)
     ═══════════════════════════════════════════════════════════ */

  --spacing-0:    0;
  --spacing-px:   1px;
  --spacing-0.5:  0.125rem;  /* 2px */
  --spacing-1:    0.25rem;   /* 4px */
  --spacing-1.5:  0.375rem;  /* 6px */
  --spacing-2:    0.5rem;    /* 8px */
  --spacing-2.5:  0.625rem;  /* 10px */
  --spacing-3:    0.75rem;   /* 12px */
  --spacing-4:    1rem;      /* 16px */
  --spacing-5:    1.25rem;   /* 20px */
  --spacing-6:    1.5rem;    /* 24px */
  --spacing-8:    2rem;      /* 32px */
  --spacing-10:   2.5rem;    /* 40px */
  --spacing-12:   3rem;      /* 48px */
  --spacing-16:   4rem;      /* 64px */
  --spacing-20:   5rem;      /* 80px */
  --spacing-24:   6rem;      /* 96px */

  /* Component-specific spacing */
  --spacing-panel-padding:    var(--spacing-4);
  --spacing-card-padding:     var(--spacing-4);
  --spacing-input-padding-x:  var(--spacing-3);
  --spacing-input-padding-y:  var(--spacing-2);
  --spacing-button-padding-x: var(--spacing-4);
  --spacing-button-padding-y: var(--spacing-2);

  /* ═══════════════════════════════════════════════════════════
     BORDER RADIUS TOKENS
     ═══════════════════════════════════════════════════════════ */

  --radius-none:  0;
  --radius-sm:    0.25rem;   /* 4px - Subtle rounding */
  --radius-md:    0.375rem;  /* 6px - Default */
  --radius-lg:    0.5rem;    /* 8px - Cards, panels */
  --radius-xl:    0.75rem;   /* 12px - Modals */
  --radius-2xl:   1rem;      /* 16px - Large elements */
  --radius-full:  9999px;    /* Pills, avatars */

  /* ═══════════════════════════════════════════════════════════
     Z-INDEX SCALE
     ═══════════════════════════════════════════════════════════ */

  --z-base:       0;
  --z-dropdown:   100;
  --z-sticky:     200;
  --z-overlay:    300;
  --z-modal:      400;
  --z-popover:    500;
  --z-toast:      600;
  --z-tooltip:    700;
  --z-max:        9999;
}
```

---

## Detailed Specifications

### 3.4 Tailwind Ops-Center Theme

**File: `apps/web/tailwind.config.ts`**
```typescript
import type { Config } from 'tailwindcss';
import tailwindAnimate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Ops-Center Dark Theme
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        // Tactical accent colors
        tactical: {
          green: '#00ff88',
          blue: '#00d4ff',
          amber: '#ffaa00',
          red: '#ff3333',
          purple: '#a855f7',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        scanline: 'scanline 8s linear infinite',
      },
      backgroundImage: {
        'grid-pattern': `linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
                         linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)`,
      },
    },
  },
  plugins: [tailwindAnimate],
};

export default config;
```

### Global Styles with Tactical Styling

**File: `apps/web/src/styles/globals.css`**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Ops-Center Dark Theme */
    --background: 0 0% 4%;          /* #0a0a0a */
    --foreground: 0 0% 90%;         /* #e5e5e5 */

    --card: 0 0% 7%;                /* #111111 */
    --card-foreground: 0 0% 90%;

    --popover: 0 0% 7%;
    --popover-foreground: 0 0% 90%;

    --primary: 152 100% 50%;        /* #00ff88 - Terminal green */
    --primary-foreground: 0 0% 4%;

    --secondary: 0 0% 10%;          /* #1a1a1a */
    --secondary-foreground: 0 0% 90%;

    --muted: 0 0% 15%;
    --muted-foreground: 0 0% 64%;   /* #a3a3a3 */

    --accent: 192 100% 50%;         /* #00d4ff - Tactical blue */
    --accent-foreground: 0 0% 4%;

    --destructive: 0 100% 60%;      /* #ff3333 */
    --destructive-foreground: 0 0% 100%;

    --border: 0 0% 16%;             /* #2a2a2a */
    --input: 0 0% 16%;
    --ring: 152 100% 50%;

    --radius: 0.5rem;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }

  /* Scrollbar styling */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    @apply bg-background;
  }

  ::-webkit-scrollbar-thumb {
    @apply bg-border rounded-full;
  }

  ::-webkit-scrollbar-thumb:hover {
    @apply bg-muted;
  }
}

@layer components {
  /* Tactical glow effect */
  .glow-green {
    box-shadow: 0 0 10px rgba(0, 255, 136, 0.3),
                0 0 20px rgba(0, 255, 136, 0.1);
  }

  .glow-blue {
    box-shadow: 0 0 10px rgba(0, 212, 255, 0.3),
                0 0 20px rgba(0, 212, 255, 0.1);
  }

  .glow-amber {
    box-shadow: 0 0 10px rgba(255, 170, 0, 0.3),
                0 0 20px rgba(255, 170, 0, 0.1);
  }

  .glow-red {
    box-shadow: 0 0 10px rgba(255, 51, 51, 0.3),
                0 0 20px rgba(255, 51, 51, 0.1);
  }

  /* Scanline overlay */
  .scanline-overlay::after {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 0, 0, 0.1) 2px,
      rgba(0, 0, 0, 0.1) 4px
    );
    pointer-events: none;
  }

  /* Grid background */
  .grid-bg {
    background-size: 20px 20px;
    background-image:
      linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
      linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px);
  }

  /* Data display monospace */
  .data-display {
    @apply font-mono text-sm tracking-tight;
  }

  /* Status indicator */
  .status-indicator {
    @apply inline-block w-2 h-2 rounded-full;
  }

  .status-indicator.active {
    @apply bg-tactical-green animate-pulse-glow;
  }

  .status-indicator.warning {
    @apply bg-tactical-amber animate-pulse-glow;
  }

  .status-indicator.critical {
    @apply bg-tactical-red animate-pulse-glow;
  }
}
```

### Tactical CSS Classes Reference

| Class | Purpose | Usage |
|-------|---------|-------|
| `.glow-green` | Terminal green glow effect | Active states, primary actions |
| `.glow-blue` | Tactical blue glow effect | Secondary highlights, info states |
| `.glow-amber` | Amber glow effect | Warnings, attention required |
| `.glow-red` | Red glow effect | Critical alerts, errors |
| `.scanline-overlay` | CRT scanline effect | Full-screen tactical aesthetic |
| `.grid-bg` | Grid pattern background | Dashboard backgrounds |
| `.data-display` | Monospace data styling | Data tables, metrics |
| `.status-indicator` | Animated status dot | Connection status, system health |
| `.status-indicator.active` | Green pulsing indicator | Online, nominal |
| `.status-indicator.warning` | Amber pulsing indicator | Degraded, attention |
| `.status-indicator.critical` | Red pulsing indicator | Offline, critical |

---

### 3.5 shadcn/ui Setup

**File: `apps/web/components.json`**
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

### Utility Functions

**File: `apps/web/src/lib/utils.ts`**
```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date) {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const now = new Date();
  const then = new Date(date);
  const diff = then.getTime() - now.getTime();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));

  if (Math.abs(days) < 1) {
    const hours = Math.round(diff / (1000 * 60 * 60));
    if (Math.abs(hours) < 1) {
      const minutes = Math.round(diff / (1000 * 60));
      return rtf.format(minutes, 'minute');
    }
    return rtf.format(hours, 'hour');
  }
  return rtf.format(days, 'day');
}
```

### Initial shadcn Components Installation

```bash
cd apps/web
npx shadcn@latest add button card input label dialog dropdown-menu \
  select tabs toast tooltip avatar badge separator scroll-area
```

---

### 3.6 AppShell Layout Component

**File: `apps/web/src/components/layout/AppShell.tsx`**
```typescript
import { ReactNode } from 'react';

import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { StatusBar } from './StatusBar';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <Header />

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>

        {/* Status bar */}
        <StatusBar />
      </div>

      {/* Optional: Scanline overlay for full tactical effect */}
      {/* <div className="fixed inset-0 pointer-events-none scanline-overlay opacity-30" /> */}
    </div>
  );
}
```

---

### 3.7 Sidebar Component

**File: `apps/web/src/components/layout/Sidebar.tsx`**
```typescript
import { Link, useRouterState } from '@tanstack/react-router';
import {
  LayoutDashboard,
  FolderKanban,
  Map,
  Shield,
  Target,
  Radio,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: FolderKanban, label: 'Projects', href: '/projects' },
  { icon: Map, label: 'Command Center', href: '/command' },
  { icon: Shield, label: 'Assessments', href: '/assessments' },
  { icon: Target, label: 'Threats', href: '/threats' },
  { icon: Radio, label: 'Intelligence', href: '/intel' },
  { icon: Bell, label: 'Alerts', href: '/alerts' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex flex-col bg-card border-r border-border transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            {!collapsed && (
              <span className="font-semibold text-foreground tracking-tight">
                SITMON
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => {
              const isActive = currentPath.startsWith(item.href);
              const Icon = item.icon;

              const linkContent = (
                <Link
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors',
                    'hover:bg-secondary',
                    isActive && 'bg-primary/10 text-primary glow-green'
                  )}
                >
                  <Icon className={cn('w-5 h-5 shrink-0', isActive && 'text-primary')} />
                  {!collapsed && (
                    <span className={cn('text-sm', isActive ? 'text-primary font-medium' : 'text-muted-foreground')}>
                      {item.label}
                    </span>
                  )}
                </Link>
              );

              return (
                <li key={item.href}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent side="right" className="bg-popover border-border">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    linkContent
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Settings & Collapse */}
        <div className="border-t border-border p-2">
          <Link
            to="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-secondary transition-colors"
          >
            <Settings className="w-5 h-5 text-muted-foreground" />
            {!collapsed && <span className="text-sm text-muted-foreground">Settings</span>}
          </Link>

          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 justify-center"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
```

---

### 3.8 Header Component

**File: `apps/web/src/components/layout/Header.tsx`**
```typescript
import { Bell, Search, User } from 'lucide-react';
import { Link } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between h-16 px-6 border-b border-border bg-card/50 backdrop-blur">
      {/* Search */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects, assessments..."
            className="pl-10 bg-background border-border"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Alerts */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            3
          </Badge>
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.avatarUrl} />
                <AvatarFallback className="bg-primary/20 text-primary">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:inline-block">
                {user?.name || 'User'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive">
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
```

---

### 3.9 StatusBar Component

**File: `apps/web/src/components/layout/StatusBar.tsx`**
```typescript
import { Activity, Clock, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

export function StatusBar() {
  const [time, setTime] = useState(new Date());
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulated connection status
  useEffect(() => {
    const handleOnline = () => setIsConnected(true);
    const handleOffline = () => setIsConnected(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <footer className="flex items-center justify-between h-8 px-4 border-t border-border bg-card/50 text-xs font-mono text-muted-foreground">
      {/* Left: Status indicators */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'status-indicator',
              isConnected ? 'active' : 'critical'
            )}
          />
          <span>{isConnected ? 'CONNECTED' : 'OFFLINE'}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3" />
          <span>SYSTEM NOMINAL</span>
        </div>
      </div>

      {/* Center: Active project indicator (optional) */}
      <div className="flex items-center gap-1.5">
        <span className="text-primary">●</span>
        <span>NO ACTIVE PROJECT</span>
      </div>

      {/* Right: Time */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          <span>{time.toLocaleTimeString('en-US', { hour12: false })}</span>
        </div>
        <span>UTC{time.getTimezoneOffset() > 0 ? '-' : '+'}{Math.abs(time.getTimezoneOffset() / 60)}</span>
      </div>
    </footer>
  );
}
```

---

## Offline Indicator Component

**File: `apps/web/src/components/common/OfflineIndicator.tsx`**
```typescript
import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-2 px-4 py-2 rounded-lg',
        'bg-tactical-amber/20 border border-tactical-amber/50',
        'text-tactical-amber text-sm font-medium',
        'animate-pulse-glow'
      )}
    >
      <WifiOff className="w-4 h-4" />
      <span>You're offline. Some features may be unavailable.</span>
    </div>
  );
}
```

---

## Toast Notification System with Sonner

### Toast Hook

**File: `apps/web/src/hooks/useToast.ts`**
```typescript
import { toast } from 'sonner';

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function useToast() {
  return {
    success: (message: string, options?: ToastOptions) => {
      toast.success(message, {
        description: options?.description,
        duration: options?.duration ?? 4000,
        action: options?.action,
      });
    },

    error: (message: string, options?: ToastOptions) => {
      toast.error(message, {
        description: options?.description,
        duration: options?.duration ?? 6000,
        action: options?.action,
      });
    },

    warning: (message: string, options?: ToastOptions) => {
      toast.warning(message, {
        description: options?.description,
        duration: options?.duration ?? 5000,
        action: options?.action,
      });
    },

    info: (message: string, options?: ToastOptions) => {
      toast.info(message, {
        description: options?.description,
        duration: options?.duration ?? 4000,
        action: options?.action,
      });
    },

    loading: (message: string) => {
      return toast.loading(message);
    },

    dismiss: (id?: string | number) => {
      toast.dismiss(id);
    },

    promise: <T>(
      promise: Promise<T>,
      messages: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((error: Error) => string);
      }
    ) => {
      return toast.promise(promise, messages);
    },
  };
}
```

### Toaster Configuration (in main.tsx)

```typescript
import { Toaster } from 'sonner';

// In your root component:
<Toaster
  theme="dark"
  position="top-right"
  richColors
  closeButton
  toastOptions={{
    style: {
      background: '#111111',
      border: '1px solid #2a2a2a',
      color: '#e5e5e5',
    },
  }}
/>
```

### Toast Usage Examples

```typescript
import { useToast } from '@/hooks/useToast';

function ProjectActions() {
  const toast = useToast();

  const handleSave = async () => {
    toast.promise(saveProject(), {
      loading: 'Saving project...',
      success: 'Project saved successfully',
      error: (err) => `Failed to save: ${err.message}`,
    });
  };

  const handleDelete = () => {
    toast.warning('Project deleted', {
      description: 'This action cannot be undone',
      action: {
        label: 'Undo',
        onClick: () => restoreProject(),
      },
    });
  };

  return (/* ... */);
}
```

---

## Theme Provider System

A centralized theme provider enables future theme modifications, user preferences, and consistent styling across all components.

### Theme Context

**File: `apps/web/src/context/ThemeContext.tsx`**
```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Theme configuration type
interface ThemeConfig {
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
        [effect]: typeof prev.effects[effect] === 'boolean'
          ? !prev.effects[effect]
          : prev.effects[effect],
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
```

### Theme Presets

**File: `apps/web/src/lib/themePresets.ts`**
```typescript
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
```

---

## Component Theming Patterns

All UI components follow consistent theming patterns for maintainability and visual coherence.

### Component Variants with CVA

Use `class-variance-authority` for consistent component variants.

**File: `apps/web/src/components/ui/tactical-button.tsx`**
```typescript
import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base styles - applied to all variants
  [
    'inline-flex items-center justify-center gap-2',
    'font-mono text-sm font-medium uppercase tracking-wide',
    'border rounded-md transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        // Primary action - Terminal green
        primary: [
          'bg-accent-success/10 border-accent-success/50 text-accent-success',
          'hover:bg-accent-success/20 hover:border-accent-success',
          'focus-visible:ring-accent-success',
          'hover:glow-green',
        ],
        // Secondary action - Tactical blue
        secondary: [
          'bg-accent-info/10 border-accent-info/50 text-accent-info',
          'hover:bg-accent-info/20 hover:border-accent-info',
          'focus-visible:ring-accent-info',
          'hover:glow-cyan',
        ],
        // Destructive action - Critical red
        danger: [
          'bg-accent-danger/10 border-accent-danger/50 text-accent-danger',
          'hover:bg-accent-danger/20 hover:border-accent-danger',
          'focus-visible:ring-accent-danger',
          'hover:glow-red',
        ],
        // Ghost - minimal styling
        ghost: [
          'bg-transparent border-transparent text-text-secondary',
          'hover:bg-bg-hover hover:text-text-primary',
          'focus-visible:ring-accent-success',
        ],
        // Outline - bordered
        outline: [
          'bg-transparent border-border-default text-text-primary',
          'hover:bg-bg-hover hover:border-border-strong',
          'focus-visible:ring-accent-success',
        ],
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface TacticalButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const TacticalButton = forwardRef<HTMLButtonElement, TacticalButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span className="status-dot status-connecting mr-2" />
        )}
        {children}
      </button>
    );
  }
);

TacticalButton.displayName = 'TacticalButton';
```

### Tactical Card Component

**File: `apps/web/src/components/ui/tactical-card.tsx`**
```typescript
import { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva(
  [
    'rounded-lg border transition-all duration-200',
    'relative overflow-hidden',
  ],
  {
    variants: {
      variant: {
        default: 'bg-bg-elevated-2 border-border-default',
        elevated: 'bg-bg-elevated-3 border-border-strong shadow-lg',
        outline: 'bg-transparent border-border-default',
        ghost: 'bg-transparent border-transparent',
      },
      status: {
        none: '',
        success: 'border-l-4 border-l-accent-success',
        warning: 'border-l-4 border-l-accent-warning',
        danger: 'border-l-4 border-l-accent-danger',
        info: 'border-l-4 border-l-accent-info',
      },
      interactive: {
        true: 'cursor-pointer hover:bg-bg-hover hover:border-border-strong',
        false: '',
      },
      glow: {
        none: '',
        success: 'glow-green',
        warning: 'glow-amber',
        danger: 'glow-red',
        info: 'glow-cyan',
      },
    },
    defaultVariants: {
      variant: 'default',
      status: 'none',
      interactive: false,
      glow: 'none',
    },
  }
);

interface TacticalCardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  header?: ReactNode;
  footer?: ReactNode;
}

export const TacticalCard = forwardRef<HTMLDivElement, TacticalCardProps>(
  ({ className, variant, status, interactive, glow, header, footer, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, status, interactive, glow }), className)}
        {...props}
      >
        {header && (
          <div className="px-4 py-3 border-b border-border-subtle">
            <div className="heading-card">{header}</div>
          </div>
        )}
        <div className="p-4">{children}</div>
        {footer && (
          <div className="px-4 py-3 border-t border-border-subtle bg-bg-surface/50">
            {footer}
          </div>
        )}
      </div>
    );
  }
);

TacticalCard.displayName = 'TacticalCard';
```

### Data Display Components

**File: `apps/web/src/components/ui/data-display.tsx`**
```typescript
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Metric display with label
interface MetricProps {
  label: string;
  value: string | number;
  unit?: string;
  status?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Metric({ label, value, unit, status = 'neutral', size = 'md', className }: MetricProps) {
  const statusColors = {
    success: 'text-accent-success',
    warning: 'text-accent-warning',
    danger: 'text-accent-danger',
    info: 'text-accent-info',
    neutral: 'text-text-primary',
  };

  const sizeClasses = {
    sm: 'data-value',
    md: 'data-metric',
    lg: 'data-hero',
  };

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="data-label">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={cn(sizeClasses[size], statusColors[status])}>
          {value}
        </span>
        {unit && <span className="data-micro text-text-muted">{unit}</span>}
      </div>
    </div>
  );
}

// Timestamp display
interface TimestampProps {
  date: Date | string;
  format?: 'full' | 'date' | 'time' | 'relative';
  className?: string;
}

export function Timestamp({ date, format = 'full', className }: TimestampProps) {
  const d = new Date(date);

  const formatted = {
    full: d.toISOString(),
    date: d.toISOString().split('T')[0],
    time: d.toISOString().split('T')[1].split('.')[0],
    relative: getRelativeTime(d),
  };

  return (
    <time dateTime={d.toISOString()} className={cn('data-timestamp', className)}>
      {formatted[format]}
    </time>
  );
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// Code/ID badge
interface CodeBadgeProps {
  code: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export function CodeBadge({ code, variant = 'default', className }: CodeBadgeProps) {
  const variantClasses = {
    default: 'bg-bg-surface text-accent-info',
    success: 'bg-accent-success/10 text-accent-success border-accent-success/30',
    warning: 'bg-accent-warning/10 text-accent-warning border-accent-warning/30',
    danger: 'bg-accent-danger/10 text-accent-danger border-accent-danger/30',
    info: 'bg-accent-info/10 text-accent-info border-accent-info/30',
  };

  return (
    <code
      className={cn(
        'font-mono text-xs px-1.5 py-0.5 rounded border',
        variantClasses[variant],
        className
      )}
    >
      {code}
    </code>
  );
}

// Status badge with indicator
interface StatusBadgeProps {
  status: 'online' | 'offline' | 'degraded' | 'unknown' | 'connecting';
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const statusConfig = {
    online: { dot: 'status-online', text: 'ONLINE', color: 'text-accent-success' },
    offline: { dot: 'status-offline', text: 'OFFLINE', color: 'text-accent-danger' },
    degraded: { dot: 'status-degraded', text: 'DEGRADED', color: 'text-accent-warning' },
    unknown: { dot: 'status-unknown', text: 'UNKNOWN', color: 'text-text-muted' },
    connecting: { dot: 'status-connecting', text: 'CONNECTING', color: 'text-accent-info' },
  };

  const config = statusConfig[status];

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <span className={cn('status-dot', config.dot)} />
      <span className={cn('data-label', config.color)}>
        {label || config.text}
      </span>
    </div>
  );
}
```

---

## Map-Centric Architecture

The Geospatial Command Center (F.0) is the **primary interface** of Situation Monitor. The map is the core layer upon which all other UI elements float.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MAP-CENTRIC UI ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                                                                  ││
│  │                         MAP LAYER (Mapbox GL JS)                 ││
│  │                    Full viewport, z-index: base                  ││
│  │                                                                  ││
│  │  ┌──────────────────┐                     ┌──────────────────┐  ││
│  │  │   Data Layers    │                     │   Marker Layer   │  ││
│  │  │   (9 toggleable) │                     │   (clustered)    │  ││
│  │  └──────────────────┘                     └──────────────────┘  ││
│  │                                                                  ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    FLOATING PANEL LAYER                          ││
│  │                    z-index: overlay (300+)                       ││
│  │                                                                  ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        ││
│  │  │ Layer    │  │ Live     │  │ Intel    │  │ Details  │        ││
│  │  │ Controls │  │ Feed     │  │ Panel    │  │ Panel    │        ││
│  │  │ (left)   │  │ (right)  │  │ (dock)   │  │ (modal)  │        ││
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘        ││
│  │                                                                  ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    CONTROL LAYER                                 ││
│  │                    z-index: controls (200)                       ││
│  │                                                                  ││
│  │  ┌──────────────────┐            ┌──────────────────────────┐   ││
│  │  │ Mini Map         │            │ Zoom / Compass           │   ││
│  │  └──────────────────┘            └──────────────────────────┘   ││
│  │                                                                  ││
│  │  ┌──────────────────────────────────────────────────────────┐   ││
│  │  │ Timeline Scrubber (bottom)                                │   ││
│  │  └──────────────────────────────────────────────────────────┘   ││
│  │                                                                  ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    STATUS BAR (fixed bottom)                     ││
│  │                    z-index: fixed (400)                          ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Map Container Component

**File: `apps/web/src/components/command/CommandCenter.tsx`**
```typescript
import { ReactNode, useState } from 'react';
import { MapProvider } from '@/context/MapContext';
import { PanelProvider } from '@/context/PanelContext';
import { MapCanvas } from './MapCanvas';
import { LayerControls } from './panels/LayerControls';
import { LiveFeedPanel } from './panels/LiveFeedPanel';
import { TimelineScrubber } from './controls/TimelineScrubber';
import { MapControls } from './controls/MapControls';
import { StatusBar } from '@/components/layout/StatusBar';

interface CommandCenterProps {
  projectId?: string;
}

export function CommandCenter({ projectId }: CommandCenterProps) {
  return (
    <MapProvider>
      <PanelProvider>
        <div className="relative h-screen w-full overflow-hidden bg-bg-base">
          {/* Base map layer - full viewport */}
          <MapCanvas className="absolute inset-0 z-0" />

          {/* Floating panels - left side */}
          <div className="absolute top-4 left-4 z-30 flex flex-col gap-3">
            <LayerControls />
          </div>

          {/* Floating panels - right side */}
          <div className="absolute top-4 right-4 z-30 flex flex-col gap-3 w-80">
            <LiveFeedPanel />
          </div>

          {/* Map controls - bottom right */}
          <div className="absolute bottom-20 right-4 z-20">
            <MapControls />
          </div>

          {/* Timeline scrubber - bottom */}
          <div className="absolute bottom-12 left-4 right-4 z-20">
            <TimelineScrubber />
          </div>

          {/* Status bar - fixed bottom */}
          <div className="absolute bottom-0 left-0 right-0 z-40">
            <StatusBar />
          </div>

          {/* Optional scanline overlay */}
          <div className="absolute inset-0 pointer-events-none scanlines opacity-10 z-50" />
        </div>
      </PanelProvider>
    </MapProvider>
  );
}
```

---

## Floating Panel System

Floating panels are the primary UI pattern for displaying information over the map. They are:
- **Draggable** - Can be repositioned
- **Collapsible** - Minimize to save space
- **Resizable** - Adjust width/height
- **Pluggable** - Easy to add new data sources

### Panel Base Component

**File: `apps/web/src/components/command/panels/FloatingPanel.tsx`**
```typescript
import { ReactNode, useState, useRef, useCallback } from 'react';
import { Minus, Maximize2, X, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingPanelProps {
  id: string;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  defaultPosition?: { x: number; y: number };
  defaultSize?: { width: number; height: number };
  collapsible?: boolean;
  closable?: boolean;
  resizable?: boolean;
  className?: string;
  headerActions?: ReactNode;
  onClose?: () => void;
}

export function FloatingPanel({
  id,
  title,
  icon,
  children,
  defaultPosition = { x: 0, y: 0 },
  defaultSize = { width: 320, height: 400 },
  collapsible = true,
  closable = false,
  resizable = true,
  className,
  headerActions,
  onClose,
}: FloatingPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [position, setPosition] = useState(defaultPosition);
  const [size, setSize] = useState(defaultSize);
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };

    const handleDrag = (moveEvent: MouseEvent) => {
      setPosition({
        x: moveEvent.clientX - dragStartRef.current.x,
        y: moveEvent.clientY - dragStartRef.current.y,
      });
    };

    const handleDragEnd = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleDragEnd);
    };

    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleDragEnd);
  }, [position]);

  return (
    <div
      ref={panelRef}
      id={`panel-${id}`}
      className={cn(
        'bg-bg-elevated-2/95 backdrop-blur-sm border border-border-default rounded-lg',
        'shadow-lg overflow-hidden transition-all duration-200',
        isDragging && 'cursor-grabbing opacity-90',
        className
      )}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        width: isCollapsed ? size.width : size.width,
        maxHeight: isCollapsed ? 'auto' : size.height,
      }}
    >
      {/* Panel Header */}
      <div
        className={cn(
          'flex items-center justify-between px-3 py-2',
          'border-b border-border-subtle bg-bg-elevated-3/50',
          'cursor-grab select-none',
          isDragging && 'cursor-grabbing'
        )}
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-text-muted" />
          {icon && <span className="text-accent-info">{icon}</span>}
          <span className="data-label text-text-primary">{title}</span>
        </div>

        <div className="flex items-center gap-1">
          {headerActions}
          {collapsible && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary"
            >
              {isCollapsed ? (
                <Maximize2 className="w-3.5 h-3.5" />
              ) : (
                <Minus className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          {closable && onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-accent-danger/20 text-text-muted hover:text-accent-danger"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Panel Content */}
      {!isCollapsed && (
        <div className="overflow-auto" style={{ maxHeight: size.height - 40 }}>
          {children}
        </div>
      )}
    </div>
  );
}
```

### Pluggable Feed Panel System

**File: `apps/web/src/components/command/panels/feeds/FeedRegistry.ts`**
```typescript
import { ComponentType, ReactNode } from 'react';

// Feed item type - common structure for all feed sources
export interface FeedItem {
  id: string;
  source: string;
  timestamp: Date;
  title: string;
  summary?: string;
  location?: {
    lat: number;
    lng: number;
    name?: string;
  };
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category?: string;
  metadata?: Record<string, unknown>;
  url?: string;
}

// Feed adapter interface - implement for each data source
export interface FeedAdapter {
  id: string;
  name: string;
  icon: ReactNode;
  description: string;
  category: FeedCategory;

  // Connection
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: () => boolean;

  // Data fetching
  fetchItems: (options?: FetchOptions) => Promise<FeedItem[]>;
  subscribe?: (callback: (item: FeedItem) => void) => () => void;

  // Configuration
  getConfig: () => FeedConfig;
  updateConfig: (config: Partial<FeedConfig>) => void;
}

export type FeedCategory =
  | 'news'
  | 'osint'
  | 'tracking'
  | 'weather'
  | 'social'
  | 'alerts'
  | 'custom';

export interface FeedConfig {
  enabled: boolean;
  refreshInterval: number; // ms
  filters?: Record<string, unknown>;
  credentials?: Record<string, string>;
}

export interface FetchOptions {
  limit?: number;
  since?: Date;
  until?: Date;
  filters?: Record<string, unknown>;
}

// Feed registry - central registration point for all feeds
class FeedRegistryClass {
  private adapters: Map<string, FeedAdapter> = new Map();
  private listeners: Set<() => void> = new Set();

  register(adapter: FeedAdapter): void {
    this.adapters.set(adapter.id, adapter);
    this.notifyListeners();
  }

  unregister(id: string): void {
    this.adapters.delete(id);
    this.notifyListeners();
  }

  get(id: string): FeedAdapter | undefined {
    return this.adapters.get(id);
  }

  getAll(): FeedAdapter[] {
    return Array.from(this.adapters.values());
  }

  getByCategory(category: FeedCategory): FeedAdapter[] {
    return this.getAll().filter((a) => a.category === category);
  }

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach((cb) => cb());
  }
}

export const FeedRegistry = new FeedRegistryClass();
```

### Example Feed Adapter: News API

**File: `apps/web/src/components/command/panels/feeds/adapters/NewsApiAdapter.ts`**
```typescript
import { Newspaper } from 'lucide-react';
import { FeedAdapter, FeedItem, FeedConfig, FetchOptions } from '../FeedRegistry';

const defaultConfig: FeedConfig = {
  enabled: true,
  refreshInterval: 60000, // 1 minute
  filters: {
    country: 'us',
    category: 'general',
  },
};

export function createNewsApiAdapter(apiKey: string): FeedAdapter {
  let config = { ...defaultConfig };
  let connected = false;

  return {
    id: 'news-api',
    name: 'News API',
    icon: <Newspaper className="w-4 h-4" />,
    description: 'Global news from multiple sources',
    category: 'news',

    async connect() {
      // Validate API key
      connected = true;
    },

    disconnect() {
      connected = false;
    },

    isConnected() {
      return connected;
    },

    async fetchItems(options?: FetchOptions): Promise<FeedItem[]> {
      if (!connected) throw new Error('Not connected');

      const response = await fetch(
        `https://newsapi.org/v2/top-headlines?` +
          new URLSearchParams({
            apiKey,
            country: config.filters?.country as string,
            category: config.filters?.category as string,
            pageSize: String(options?.limit ?? 20),
          })
      );

      const data = await response.json();

      return data.articles.map((article: any): FeedItem => ({
        id: article.url,
        source: article.source.name,
        timestamp: new Date(article.publishedAt),
        title: article.title,
        summary: article.description,
        category: 'news',
        severity: 'info',
        url: article.url,
        metadata: {
          author: article.author,
          imageUrl: article.urlToImage,
        },
      }));
    },

    getConfig() {
      return config;
    },

    updateConfig(updates: Partial<FeedConfig>) {
      config = { ...config, ...updates };
    },
  };
}
```

### Live Feed Panel with Pluggable Sources

**File: `apps/web/src/components/command/panels/LiveFeedPanel.tsx`**
```typescript
import { useState, useEffect, useMemo } from 'react';
import { Radio, Filter, RefreshCw, Settings } from 'lucide-react';
import { FloatingPanel } from './FloatingPanel';
import { FeedRegistry, FeedItem, FeedCategory } from './feeds/FeedRegistry';
import { cn } from '@/lib/utils';

export function LiveFeedPanel() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [activeFeeds, setActiveFeeds] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<FeedCategory | 'all'>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Get all registered feed adapters
  const adapters = useMemo(() => FeedRegistry.getAll(), []);

  // Fetch items from active feeds
  const refreshFeeds = async () => {
    setIsLoading(true);
    const allItems: FeedItem[] = [];

    for (const id of activeFeeds) {
      const adapter = FeedRegistry.get(id);
      if (adapter && adapter.isConnected()) {
        try {
          const feedItems = await adapter.fetchItems({ limit: 10 });
          allItems.push(...feedItems);
        } catch (err) {
          console.error(`Failed to fetch from ${id}:`, err);
        }
      }
    }

    // Sort by timestamp descending
    allItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    setItems(allItems);
    setIsLoading(false);
  };

  // Filter items by category
  const filteredItems = useMemo(() => {
    if (categoryFilter === 'all') return items;
    return items.filter((item) => item.category === categoryFilter);
  }, [items, categoryFilter]);

  // Toggle feed source
  const toggleFeed = async (id: string) => {
    const adapter = FeedRegistry.get(id);
    if (!adapter) return;

    const newActiveFeeds = new Set(activeFeeds);
    if (activeFeeds.has(id)) {
      adapter.disconnect();
      newActiveFeeds.delete(id);
    } else {
      await adapter.connect();
      newActiveFeeds.add(id);
    }
    setActiveFeeds(newActiveFeeds);
  };

  // Refresh on active feeds change
  useEffect(() => {
    if (activeFeeds.size > 0) {
      refreshFeeds();
      const interval = setInterval(refreshFeeds, 30000);
      return () => clearInterval(interval);
    }
  }, [activeFeeds]);

  return (
    <FloatingPanel
      id="live-feed"
      title="LIVE FEED"
      icon={<Radio className="w-4 h-4" />}
      defaultSize={{ width: 320, height: 500 }}
      headerActions={
        <button
          onClick={refreshFeeds}
          disabled={isLoading}
          className="p-1 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
        </button>
      }
    >
      {/* Feed Source Toggles */}
      <div className="p-3 border-b border-border-subtle">
        <div className="flex flex-wrap gap-2">
          {adapters.map((adapter) => (
            <button
              key={adapter.id}
              onClick={() => toggleFeed(adapter.id)}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono',
                'border transition-colors',
                activeFeeds.has(adapter.id)
                  ? 'bg-accent-success/10 border-accent-success/50 text-accent-success'
                  : 'bg-bg-surface border-border-default text-text-muted hover:text-text-primary'
              )}
            >
              {adapter.icon}
              <span>{adapter.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div className="px-3 py-2 border-b border-border-subtle flex items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-text-muted" />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as FeedCategory | 'all')}
          className="bg-bg-input border border-border-default rounded px-2 py-1 text-xs font-mono"
        >
          <option value="all">All Categories</option>
          <option value="news">News</option>
          <option value="osint">OSINT</option>
          <option value="tracking">Tracking</option>
          <option value="alerts">Alerts</option>
        </select>
      </div>

      {/* Feed Items */}
      <div className="divide-y divide-border-subtle">
        {filteredItems.length === 0 ? (
          <div className="p-4 text-center text-text-muted data-label">
            {activeFeeds.size === 0
              ? 'SELECT FEED SOURCES ABOVE'
              : isLoading
              ? 'LOADING...'
              : 'NO ITEMS'}
          </div>
        ) : (
          filteredItems.map((item) => (
            <FeedItemCard key={item.id} item={item} />
          ))
        )}
      </div>
    </FloatingPanel>
  );
}

// Individual feed item card
function FeedItemCard({ item }: { item: FeedItem }) {
  const severityColors = {
    critical: 'border-l-accent-danger',
    high: 'border-l-accent-warning',
    medium: 'border-l-amber-400',
    low: 'border-l-accent-info',
    info: 'border-l-text-muted',
  };

  return (
    <article
      className={cn(
        'p-3 hover:bg-bg-hover cursor-pointer transition-colors',
        'border-l-2',
        severityColors[item.severity || 'info']
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-text-primary line-clamp-2">
          {item.title}
        </h4>
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        <span className="data-label text-accent-info">{item.source}</span>
        <span className="text-text-muted">•</span>
        <span className="data-timestamp">
          {formatRelativeTime(item.timestamp)}
        </span>
      </div>
      {item.summary && (
        <p className="mt-2 text-xs text-text-secondary line-clamp-2">
          {item.summary}
        </p>
      )}
      {item.location && (
        <div className="mt-2 flex items-center gap-1 text-xs text-text-muted">
          <span>📍</span>
          <span>{item.location.name || `${item.location.lat.toFixed(2)}, ${item.location.lng.toFixed(2)}`}</span>
        </div>
      )}
    </article>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);

  if (minutes < 1) return 'NOW';
  if (minutes < 60) return `${minutes}M AGO`;
  if (hours < 24) return `${hours}H AGO`;
  return date.toLocaleDateString();
}
```

### Layer Controls Panel

**File: `apps/web/src/components/command/panels/LayerControls.tsx`**
```typescript
import { useState } from 'react';
import { Layers, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { FloatingPanel } from './FloatingPanel';
import { cn } from '@/lib/utils';
import { useMapLayers } from '@/hooks/useMapLayers';

// Layer configuration
const LAYER_GROUPS = [
  {
    id: 'base',
    name: 'Base Layers',
    layers: [
      { id: 'satellite', name: 'Satellite', icon: '🛰️' },
      { id: 'terrain', name: 'Terrain', icon: '🏔️' },
      { id: 'streets', name: 'Streets', icon: '🛣️' },
    ],
  },
  {
    id: 'tracking',
    name: 'Tracking',
    layers: [
      { id: 'flights', name: 'Aircraft (ADS-B)', icon: '✈️', color: 'accent-info' },
      { id: 'vessels', name: 'Maritime (AIS)', icon: '🚢', color: 'accent-success' },
    ],
  },
  {
    id: 'events',
    name: 'Events',
    layers: [
      { id: 'unrest', name: 'Civil Unrest', icon: '⚠️', color: 'accent-warning' },
      { id: 'fires', name: 'Active Fires', icon: '🔥', color: 'accent-danger' },
      { id: 'weather', name: 'Weather Alerts', icon: '🌦️', color: 'accent-info' },
    ],
  },
  {
    id: 'intel',
    name: 'Intelligence',
    layers: [
      { id: 'nai', name: 'NAIs', icon: '📍', color: 'accent-ai' },
      { id: 'threats', name: 'Threat Actors', icon: '🎯', color: 'accent-danger' },
      { id: 'tripwires', name: 'Tripwires', icon: '🔔', color: 'accent-warning' },
    ],
  },
];

export function LayerControls() {
  const { activeLayers, toggleLayer, setLayerOpacity } = useMapLayers();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['tracking', 'events'])
  );

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  return (
    <FloatingPanel
      id="layer-controls"
      title="LAYERS"
      icon={<Layers className="w-4 h-4" />}
      defaultSize={{ width: 240, height: 400 }}
    >
      <div className="divide-y divide-border-subtle">
        {LAYER_GROUPS.map((group) => (
          <div key={group.id}>
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group.id)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-bg-hover"
            >
              <span className="data-label text-text-secondary">{group.name}</span>
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-text-muted transition-transform',
                  expandedGroups.has(group.id) && 'rotate-180'
                )}
              />
            </button>

            {/* Group Layers */}
            {expandedGroups.has(group.id) && (
              <div className="pb-2">
                {group.layers.map((layer) => {
                  const isActive = activeLayers.has(layer.id);
                  return (
                    <div
                      key={layer.id}
                      className="flex items-center justify-between px-3 py-1.5 hover:bg-bg-hover"
                    >
                      <button
                        onClick={() => toggleLayer(layer.id)}
                        className="flex items-center gap-2 flex-1"
                      >
                        <span className="w-5 text-center">{layer.icon}</span>
                        <span
                          className={cn(
                            'text-sm',
                            isActive ? 'text-text-primary' : 'text-text-muted'
                          )}
                        >
                          {layer.name}
                        </span>
                      </button>
                      <button
                        onClick={() => toggleLayer(layer.id)}
                        className={cn(
                          'p-1 rounded',
                          isActive
                            ? 'text-accent-success'
                            : 'text-text-muted hover:text-text-primary'
                        )}
                      >
                        {isActive ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </FloatingPanel>
  );
}
```

---

## Files to Create

### Design Tokens & Theming

| Path | Description |
|------|-------------|
| `apps/web/src/styles/tokens/colors.css` | Primitive and semantic color tokens |
| `apps/web/src/styles/tokens/typography.css` | Typography tokens and font definitions |
| `apps/web/src/styles/tokens/spacing.css` | Spacing, radius, and z-index tokens |
| `apps/web/src/styles/globals.css` | Global styles with tactical classes |
| `apps/web/src/context/ThemeContext.tsx` | Theme provider with CSS variable updates |
| `apps/web/src/lib/themePresets.ts` | Theme preset configurations |
| `apps/web/tailwind.config.ts` | Tailwind configuration with ops-center theme |
| `apps/web/components.json` | shadcn/ui configuration |

### Utility Functions

| Path | Description |
|------|-------------|
| `apps/web/src/lib/utils.ts` | Utility functions including `cn()` |

### Layout Components

| Path | Description |
|------|-------------|
| `apps/web/src/components/layout/AppShell.tsx` | Main application shell layout |
| `apps/web/src/components/layout/Sidebar.tsx` | Navigation sidebar |
| `apps/web/src/components/layout/Header.tsx` | Top header with search and user menu |
| `apps/web/src/components/layout/StatusBar.tsx` | Bottom status bar |
| `apps/web/src/components/common/OfflineIndicator.tsx` | Offline status indicator |

### Tactical UI Components

| Path | Description |
|------|-------------|
| `apps/web/src/components/ui/tactical-button.tsx` | Themed button with variants |
| `apps/web/src/components/ui/tactical-card.tsx` | Themed card with status indicators |
| `apps/web/src/components/ui/data-display.tsx` | Metric, Timestamp, CodeBadge, StatusBadge components |

### Command Center (Map-Centric)

| Path | Description |
|------|-------------|
| `apps/web/src/components/command/CommandCenter.tsx` | Map-centric primary interface |
| `apps/web/src/components/command/MapCanvas.tsx` | Mapbox GL JS wrapper |
| `apps/web/src/components/command/panels/FloatingPanel.tsx` | Base floating panel component |
| `apps/web/src/components/command/panels/LayerControls.tsx` | Map layer toggle panel |
| `apps/web/src/components/command/panels/LiveFeedPanel.tsx` | Live feed display panel |
| `apps/web/src/components/command/controls/MapControls.tsx` | Zoom, compass, pitch controls |
| `apps/web/src/components/command/controls/TimelineScrubber.tsx` | Temporal navigation slider |

### Feed System (Pluggable Data Sources)

| Path | Description |
|------|-------------|
| `apps/web/src/components/command/panels/feeds/FeedRegistry.ts` | Central feed adapter registry |
| `apps/web/src/components/command/panels/feeds/adapters/NewsApiAdapter.ts` | News API feed adapter |
| `apps/web/src/components/command/panels/feeds/adapters/RssAdapter.ts` | RSS feed adapter |
| `apps/web/src/components/command/panels/feeds/adapters/GdeltAdapter.ts` | GDELT event feed adapter |
| `apps/web/src/components/command/panels/feeds/adapters/AdsbAdapter.ts` | ADS-B flight tracking adapter |
| `apps/web/src/components/command/panels/feeds/adapters/AisAdapter.ts` | AIS maritime tracking adapter |
| `apps/web/src/components/command/panels/feeds/adapters/AcledAdapter.ts` | ACLED civil unrest adapter |
| `apps/web/src/components/command/panels/feeds/adapters/FirmsAdapter.ts` | NASA FIRMS fire adapter |
| `apps/web/src/components/command/panels/feeds/adapters/TelegramAdapter.ts` | Telegram channel adapter |

### Context Providers

| Path | Description |
|------|-------------|
| `apps/web/src/context/MapContext.tsx` | Map state and controls provider |
| `apps/web/src/context/PanelContext.tsx` | Panel layout and state provider |

### Hooks

| Path | Description |
|------|-------------|
| `apps/web/src/hooks/useToast.ts` | Toast notification hook |
| `apps/web/src/hooks/useTheme.ts` | Theme access hook (re-export from context) |
| `apps/web/src/hooks/useMapLayers.ts` | Map layer toggle/opacity hook |
| `apps/web/src/hooks/useFeedRegistry.ts` | Feed adapter registry hook |

---

## Dependencies to Install

```bash
cd apps/web

# Core utilities
pnpm add clsx tailwind-merge tailwindcss-animate class-variance-authority

# Radix UI primitives (used by shadcn/ui)
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tooltip
pnpm add @radix-ui/react-avatar @radix-ui/react-label @radix-ui/react-select
pnpm add @radix-ui/react-tabs @radix-ui/react-scroll-area @radix-ui/react-separator

# Icons
pnpm add lucide-react

# Toast notifications
pnpm add sonner
```

---

## Empty State Designs

Empty states are critical UX touchpoints that guide users when no data exists. In a tactical ops-center environment, empty states should feel intentional, not broken—providing clear guidance while maintaining the aesthetic.

### Empty State Philosophy

| Principle | Implementation |
|-----------|----------------|
| **Purposeful** | Each empty state explains why it's empty and what to do next |
| **Tactical Aesthetic** | Use monospace fonts, subtle grid patterns, dashed borders |
| **Actionable** | Include clear CTAs to populate the state |
| **Consistent** | All empty states use the same visual language |
| **Informative** | Distinguish between "no data yet" vs "filtered to nothing" |

### Empty State Component

**File: `apps/web/src/components/ui/EmptyState.tsx`**
```typescript
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TacticalButton } from './TacticalButton';

type EmptyStateVariant = 'default' | 'minimal' | 'tactical' | 'card';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  variant?: EmptyStateVariant;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  children?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  variant = 'default',
  action,
  secondaryAction,
  className,
  children,
}: EmptyStateProps) {
  const variants = {
    default: 'p-8 text-center',
    minimal: 'p-4 text-center',
    tactical: cn(
      'p-8 text-center',
      'border border-dashed border-border-default rounded-lg',
      'bg-bg-surface/30 backdrop-blur-sm',
      'relative overflow-hidden'
    ),
    card: cn(
      'p-8 text-center',
      'bg-card border border-border rounded-lg',
      'shadow-lg'
    ),
  };

  return (
    <div className={cn(variants[variant], 'animate-fade-in', className)}>
      {/* Tactical grid overlay for tactical variant */}
      {variant === 'tactical' && (
        <div className="absolute inset-0 grid-tactical opacity-30 pointer-events-none" />
      )}

      <div className="relative z-10 flex flex-col items-center gap-4">
        {/* Icon */}
        {icon && (
          <div className="text-text-muted opacity-60 animate-fade-in-down">
            {icon}
          </div>
        )}

        {/* Title */}
        <h3 className="data-metric text-text-primary">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="body-default text-text-secondary max-w-sm">
            {description}
          </p>
        )}

        {/* Custom content */}
        {children}

        {/* Actions */}
        {(action || secondaryAction) && (
          <div className="flex items-center gap-3 mt-2">
            {action && (
              <TacticalButton
                variant={action.variant || 'primary'}
                onClick={action.onClick}
              >
                {action.label}
              </TacticalButton>
            )}
            {secondaryAction && (
              <TacticalButton
                variant="ghost"
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </TacticalButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

### Pre-built Empty State Patterns

**File: `apps/web/src/components/ui/empty-states/index.tsx`**
```typescript
import { ReactNode } from 'react';
import {
  FolderOpen,
  Search,
  AlertTriangle,
  MapPin,
  Radio,
  Shield,
  Target,
  FileText,
  Bell,
  Users,
  Wifi,
  Database,
  RefreshCw,
} from 'lucide-react';
import { EmptyState } from '../EmptyState';

// ════════════════════════════════════════════════════════════════════════════
// PROJECT & DATA EMPTY STATES
// ════════════════════════════════════════════════════════════════════════════

export function EmptyProjects({ onCreateProject }: { onCreateProject: () => void }) {
  return (
    <EmptyState
      variant="tactical"
      icon={<FolderOpen className="w-16 h-16" />}
      title="NO ACTIVE PROJECTS"
      description="Create a new project to begin tracking situations, threats, and intelligence."
      action={{
        label: 'Create Project',
        onClick: onCreateProject,
      }}
    />
  );
}

export function EmptySearchResults({
  query,
  onClearSearch,
}: {
  query: string;
  onClearSearch: () => void;
}) {
  return (
    <EmptyState
      variant="minimal"
      icon={<Search className="w-12 h-12" />}
      title="NO RESULTS FOUND"
      description={`No matches for "${query}". Try different keywords or filters.`}
      action={{
        label: 'Clear Search',
        onClick: onClearSearch,
        variant: 'secondary',
      }}
    />
  );
}

export function EmptyFilteredResults({ onResetFilters }: { onResetFilters: () => void }) {
  return (
    <EmptyState
      variant="minimal"
      icon={<AlertTriangle className="w-12 h-12 text-accent-warning" />}
      title="NO MATCHES"
      description="Current filters returned zero results. Adjust your filter criteria."
      action={{
        label: 'Reset Filters',
        onClick: onResetFilters,
        variant: 'secondary',
      }}
    />
  );
}

// ════════════════════════════════════════════════════════════════════════════
// INTELLIGENCE & ANALYSIS EMPTY STATES
// ════════════════════════════════════════════════════════════════════════════

export function EmptyThreats({ onAddThreat }: { onAddThreat: () => void }) {
  return (
    <EmptyState
      variant="tactical"
      icon={<Target className="w-16 h-16" />}
      title="NO THREATS IDENTIFIED"
      description="Add threat actors and assessments to track potential risks to your operation."
      action={{
        label: 'Add Threat',
        onClick: onAddThreat,
      }}
    />
  );
}

export function EmptyAssessments({ onCreateAssessment }: { onCreateAssessment: () => void }) {
  return (
    <EmptyState
      variant="tactical"
      icon={<Shield className="w-16 h-16" />}
      title="NO ASSESSMENTS"
      description="Create PMESII-PT analyses, threat matrices, or CoG assessments for this project."
      action={{
        label: 'New Assessment',
        onClick: onCreateAssessment,
      }}
    />
  );
}

export function EmptyIndicators({ onAddIndicator }: { onAddIndicator: () => void }) {
  return (
    <EmptyState
      variant="card"
      icon={<Bell className="w-14 h-14" />}
      title="NO INDICATORS"
      description="Set up tripwire indicators to monitor for early warning signs."
      action={{
        label: 'Add Indicator',
        onClick: onAddIndicator,
      }}
    />
  );
}

export function EmptyNAIs({ onAddNAI }: { onAddNAI: () => void }) {
  return (
    <EmptyState
      variant="tactical"
      icon={<MapPin className="w-16 h-16" />}
      title="NO NAMED AREAS OF INTEREST"
      description="Define geographic or topical NAIs to focus collection efforts."
      action={{
        label: 'Create NAI',
        onClick: onAddNAI,
      }}
    />
  );
}

export function EmptySources({ onAddSource }: { onAddSource: () => void }) {
  return (
    <EmptyState
      variant="card"
      icon={<Users className="w-14 h-14" />}
      title="NO SOURCES CONFIGURED"
      description="Add intelligence sources and evaluate their reliability ratings."
      action={{
        label: 'Add Source',
        onClick: onAddSource,
      }}
    />
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAP & GEOSPATIAL EMPTY STATES
// ════════════════════════════════════════════════════════════════════════════

export function EmptyMapLayer({
  layerName,
  onEnableLayer,
}: {
  layerName: string;
  onEnableLayer?: () => void;
}) {
  return (
    <EmptyState
      variant="minimal"
      icon={<MapPin className="w-10 h-10" />}
      title={`NO ${layerName.toUpperCase()} DATA`}
      description={`Enable the ${layerName} layer to view data on the map.`}
      action={
        onEnableLayer
          ? {
              label: `Enable ${layerName}`,
              onClick: onEnableLayer,
              variant: 'secondary',
            }
          : undefined
      }
    />
  );
}

export function EmptyMapSelection() {
  return (
    <EmptyState
      variant="minimal"
      icon={<MapPin className="w-10 h-10 opacity-50" />}
      title="NO SELECTION"
      description="Click on a map marker or feature to view details."
    />
  );
}

// ════════════════════════════════════════════════════════════════════════════
// FEED & REAL-TIME EMPTY STATES
// ════════════════════════════════════════════════════════════════════════════

export function EmptyFeed({
  onConfigureFeeds,
}: {
  onConfigureFeeds?: () => void;
}) {
  return (
    <EmptyState
      variant="tactical"
      icon={<Radio className="w-14 h-14" />}
      title="NO ACTIVE FEEDS"
      description="Enable data feeds to receive real-time intelligence updates."
      action={
        onConfigureFeeds
          ? {
              label: 'Configure Feeds',
              onClick: onConfigureFeeds,
            }
          : undefined
      }
    />
  );
}

export function EmptyFeedItems({ feedName }: { feedName: string }) {
  return (
    <EmptyState
      variant="minimal"
      icon={<FileText className="w-10 h-10" />}
      title="NO ITEMS"
      description={`${feedName} has no new items. Check back later.`}
    />
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ERROR & OFFLINE EMPTY STATES
// ════════════════════════════════════════════════════════════════════════════

export function ConnectionError({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      variant="card"
      icon={<Wifi className="w-14 h-14 text-accent-danger" />}
      title="CONNECTION LOST"
      description="Unable to connect to the server. Check your network connection."
      action={{
        label: 'Retry',
        onClick: onRetry,
        variant: 'primary',
      }}
    >
      <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
        <div className="status-dot status-offline" />
        <span className="data-label">OFFLINE</span>
      </div>
    </EmptyState>
  );
}

export function DataLoadError({
  error,
  onRetry,
}: {
  error?: string;
  onRetry: () => void;
}) {
  return (
    <EmptyState
      variant="card"
      icon={<Database className="w-14 h-14 text-accent-danger" />}
      title="FAILED TO LOAD DATA"
      description={error || 'An error occurred while fetching data.'}
      action={{
        label: 'Retry',
        onClick: onRetry,
      }}
    >
      <button
        onClick={onRetry}
        className="mt-2 text-xs text-accent-info hover:text-accent-info-hover flex items-center gap-1"
      >
        <RefreshCw className="w-3 h-3" />
        <span>Try again</span>
      </button>
    </EmptyState>
  );
}
```

### Table Empty State

**File: `apps/web/src/components/ui/empty-states/TableEmptyState.tsx`**
```typescript
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Inbox } from 'lucide-react';

interface TableEmptyStateProps {
  colSpan: number;
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
  variant?: 'default' | 'minimal';
}

export function TableEmptyState({
  colSpan,
  icon = <Inbox className="w-12 h-12" />,
  title = 'NO DATA',
  description,
  action,
  variant = 'default',
}: TableEmptyStateProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        <div
          className={cn(
            'flex flex-col items-center justify-center text-center',
            variant === 'default' ? 'py-16' : 'py-8',
            'border-t border-border-subtle'
          )}
        >
          <div className="text-text-muted opacity-50 animate-fade-in-down">
            {icon}
          </div>
          <h4 className="mt-4 data-label text-text-primary">{title}</h4>
          {description && (
            <p className="mt-1 text-sm text-text-muted max-w-xs">
              {description}
            </p>
          )}
          {action && <div className="mt-4">{action}</div>}
        </div>
      </td>
    </tr>
  );
}

// Usage example:
// <tbody>
//   {items.length === 0 ? (
//     <TableEmptyState
//       colSpan={5}
//       title="NO THREATS FOUND"
//       description="Add your first threat assessment to get started."
//       action={<TacticalButton onClick={onAdd}>Add Threat</TacticalButton>}
//     />
//   ) : (
//     items.map(item => <TableRow key={item.id} {...item} />)
//   )}
// </tbody>
```

### Card Grid Empty State

**File: `apps/web/src/components/ui/empty-states/GridEmptyState.tsx`**
```typescript
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

interface GridEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

export function GridEmptyState({
  icon,
  title,
  description,
  onAction,
  actionLabel = 'Add New',
  className,
}: GridEmptyStateProps) {
  return (
    <div
      className={cn(
        'col-span-full flex flex-col items-center justify-center',
        'min-h-[300px] p-8',
        'border-2 border-dashed border-border-default rounded-lg',
        'bg-bg-surface/20',
        'animate-fade-in',
        className
      )}
    >
      {icon && (
        <div className="text-text-muted opacity-40 mb-4">
          {icon}
        </div>
      )}
      <h3 className="data-metric text-text-primary text-center">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-text-muted text-center max-w-md">
          {description}
        </p>
      )}
      {onAction && (
        <button
          onClick={onAction}
          className={cn(
            'mt-6 flex items-center gap-2 px-4 py-2',
            'border border-dashed border-accent-success/50 rounded-lg',
            'text-accent-success hover:bg-accent-success/10',
            'transition-colors'
          )}
        >
          <Plus className="w-4 h-4" />
          <span className="data-label">{actionLabel}</span>
        </button>
      )}
    </div>
  );
}
```

### Inline Empty State

For smaller areas like sidebars, panels, and dropdowns:

**File: `apps/web/src/components/ui/empty-states/InlineEmptyState.tsx`**
```typescript
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface InlineEmptyStateProps {
  icon?: ReactNode;
  message: string;
  className?: string;
}

export function InlineEmptyState({
  icon,
  message,
  className,
}: InlineEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 py-4 px-3',
        'text-text-muted',
        className
      )}
    >
      {icon && <span className="opacity-50">{icon}</span>}
      <span className="data-label text-xs">{message}</span>
    </div>
  );
}

// Usage:
// <InlineEmptyState
//   icon={<Bell className="w-4 h-4" />}
//   message="NO NOTIFICATIONS"
// />
```

### Empty State Visual Guidelines

```
┌─────────────────────────────────────────────────────────────────────┐
│                     EMPTY STATE ANATOMY                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                                                               │  │
│  │                        ┌──────────┐                          │  │
│  │                        │   ICON   │  ← 40-64px, muted color │  │
│  │                        │ (◯) (📁)  │    50% opacity          │  │
│  │                        └──────────┘                          │  │
│  │                                                               │  │
│  │                    ═══════════════════                       │  │
│  │                       PRIMARY TITLE       ← data-metric     │  │
│  │                    ═══════════════════      UPPERCASE        │  │
│  │                                                               │  │
│  │              A brief description explaining                  │  │
│  │              why this state is empty and     ← body-default │  │
│  │              what the user can do about it.    max-w-sm     │  │
│  │                                                               │  │
│  │                   ┌─────────────────┐                        │  │
│  │                   │  Primary Action │    ← TacticalButton   │  │
│  │                   └─────────────────┘                        │  │
│  │                                                               │  │
│  │             ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                │  │
│  │             dashed border (tactical variant)                 │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  SPACING:                                                           │
│  - Icon to title: 16px (spacing-4)                                 │
│  - Title to description: 8px (spacing-2)                           │
│  - Description to action: 16px (spacing-4)                         │
│  - Padding: 32px (spacing-8) for default, 16px for minimal         │
│                                                                      │
│  COLORS:                                                            │
│  - Icon: text-muted at 50-60% opacity                              │
│  - Title: text-primary                                              │
│  - Description: text-secondary                                      │
│  - Border (tactical): border-default dashed                        │
│  - Background: bg-surface/30 with backdrop-blur                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Empty State Variants Reference

| Variant | When to Use | Example |
|---------|-------------|---------|
| `default` | General purpose, standalone sections | Dashboard widgets |
| `minimal` | Inline areas, smaller containers | Dropdown lists, panels |
| `tactical` | Primary empty states requiring attention | First-time setup, no data |
| `card` | Within card-based layouts | Feature sections, modals |

### Animation Patterns for Empty States

All empty states should enter with subtle animations:

```css
/* Empty state entrance animation */
.empty-state-enter {
  animation: empty-state-in 0.4s var(--ease-out) forwards;
}

@keyframes empty-state-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Icon float animation for attention */
.empty-state-icon-float {
  animation: icon-float 3s ease-in-out infinite;
}

@keyframes icon-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
```

### Empty State Copy Guidelines

| Context | Title Pattern | Description Pattern |
|---------|---------------|---------------------|
| No data yet | "NO [ITEMS]" | "Create your first [item] to get started." |
| Empty search | "NO RESULTS FOUND" | "No matches for '[query]'. Try different keywords." |
| Filtered empty | "NO MATCHES" | "Current filters returned no results." |
| Error state | "[ERROR TYPE]" | Explain what went wrong and how to fix it. |
| Offline | "CONNECTION LOST" | "Check your network connection and try again." |

---

## Acceptance Criteria

### Design Tokens (Task 3.4)
- [ ] Primitive color tokens defined (gray scale, accent colors)
- [ ] Semantic tokens reference primitives correctly
- [ ] Typography tokens define font families, sizes, weights
- [ ] Spacing tokens follow 4px base unit scale
- [ ] CSS variables update when theme changes
- [ ] Theme presets can be switched dynamically

### Theme System
- [ ] ThemeProvider wraps application and injects CSS variables
- [ ] Theme can be modified at runtime via `updateTheme()`
- [ ] Accent colors can be changed independently
- [ ] Theme presets (ops-center-dark, military-green, high-contrast, maritime-blue) work
- [ ] Effects (scanlines, glow intensity, grid) can be toggled
- [ ] Theme persists across page reloads (localStorage)

### Typography
- [ ] Monospace font (JetBrains Mono) loads correctly
- [ ] Sans-serif font (Inter) loads correctly
- [ ] Data display classes (`.data-hero`, `.data-metric`, `.data-value`, `.data-label`) styled
- [ ] Interface typography classes (`.heading-page`, `.heading-section`, `.body-default`) styled
- [ ] Tabular numbers enabled for metrics (`font-variant-numeric: tabular-nums`)
- [ ] Uppercase labels with proper letter-spacing

### Tailwind & shadcn/ui (Task 3.5)
- [ ] Tailwind config includes all ops-center color variables
- [ ] components.json configured with correct paths
- [ ] `cn()` utility function works correctly
- [ ] Initial shadcn components installed and styled
- [ ] Components inherit dark theme styling

### Layout Components (Tasks 3.6-3.9)
- [ ] AppShell renders with sidebar, header, content area, and status bar
- [ ] Sidebar collapses/expands with animation
- [ ] Sidebar navigation shows active state with glow effect
- [ ] Tooltips appear on collapsed sidebar hover
- [ ] Header displays search input and user menu
- [ ] User dropdown menu functional
- [ ] StatusBar shows connection status with animated indicator
- [ ] StatusBar displays real-time clock with timezone
- [ ] Offline indicator appears when network disconnected

### Tactical Visual Effects
- [ ] Glow classes (`.glow-green`, `.glow-cyan`, `.glow-amber`, `.glow-red`, `.glow-purple`) apply correctly
- [ ] Intense glow variants available (`.glow-green-intense`, `.glow-red-intense`)
- [ ] Text glow classes work (`.text-glow-green`, `.text-glow-cyan`)
- [ ] Scanline overlay renders correctly (`.scanlines`)
- [ ] CRT flicker effect optional (`.crt-flicker`)
- [ ] Noise overlay subtle (`.noise-overlay`)
- [ ] Grid patterns available (`.grid-tactical`, `.grid-dots`)
- [ ] Status indicators animate properly (`.status-online`, `.status-degraded`, `.status-offline`)
- [ ] Blinking cursor effect works (`.cursor-blink`)
- [ ] Scrollbars styled for dark theme

### Tactical UI Components
- [ ] TacticalButton variants (primary, secondary, danger, ghost, outline) styled
- [ ] TacticalButton shows loading state with animated indicator
- [ ] TacticalCard variants (default, elevated, outline, ghost) styled
- [ ] TacticalCard status indicators (success, warning, danger, info) work
- [ ] Metric component displays label, value, unit with status coloring
- [ ] Timestamp component formats dates in multiple modes (full, date, time, relative)
- [ ] CodeBadge component styled with variant colors
- [ ] StatusBadge component shows animated dot with label

### Map-Centric Architecture
- [ ] CommandCenter component renders with full viewport map
- [ ] MapCanvas integrates Mapbox GL JS correctly
- [ ] Map layers render in correct z-order
- [ ] Floating panels overlay map without blocking interaction
- [ ] Status bar remains fixed at bottom
- [ ] Scanline overlay (optional) renders above all content

### Floating Panel System
- [ ] FloatingPanel component draggable by header
- [ ] FloatingPanel collapses/expands correctly
- [ ] FloatingPanel closable when configured
- [ ] Panel position maintained during drag
- [ ] Multiple panels can coexist without conflict
- [ ] Panel backdrop blur effect works

### Pluggable Feed System
- [ ] FeedRegistry registers/unregisters adapters correctly
- [ ] Feed adapters implement FeedAdapter interface
- [ ] LiveFeedPanel displays registered feed sources as toggles
- [ ] Feed sources can be enabled/disabled individually
- [ ] Feed items display with severity-colored left border
- [ ] Feed items show source, timestamp, title, summary
- [ ] Category filter works across all feed sources
- [ ] Refresh button fetches latest items
- [ ] Auto-refresh interval configurable

### Layer Controls
- [ ] LayerControls panel shows grouped layers
- [ ] Layer groups expand/collapse
- [ ] Individual layers toggle visibility
- [ ] Active layers show Eye icon
- [ ] Inactive layers show EyeOff icon
- [ ] Layer toggle updates map immediately

### Toast System
- [ ] Toast notifications styled with dark theme
- [ ] Success/error/warning/info variants working
- [ ] Promise-based toasts show loading states
- [ ] Toasts dismissible

### Animation & Motion System
- [ ] Animation tokens defined (durations, easing curves)
- [ ] Core keyframes implemented (fade, scale, slide, loading)
- [ ] Utility classes available (`.animate-fade-in`, `.animate-scale-in`, `.animate-spin`, etc.)
- [ ] Stagger delay utilities work (`.delay-75` through `.delay-1000`)
- [ ] Transition utilities apply correctly (`.transition-colors`, `.transition-transform`, etc.)
- [ ] `FadeIn` React component renders with configurable direction and delay
- [ ] `Stagger` React component applies incremental delays to children
- [ ] `Collapse` React component animates height changes smoothly
- [ ] `Presence` React component handles enter/exit animations
- [ ] Skeleton loading components display shimmer animation
- [ ] `Spinner` component renders in both default and tactical variants
- [ ] `LoadingOverlay` displays full-screen loading state
- [ ] `PageTransition` wrapper animates route changes
- [ ] Reduced motion media query disables animations when user prefers
- [ ] Hover effects (`.hover-lift`, `.hover-glow`) apply correctly
- [ ] Tactical animations (radar, highlight, alert) work as expected

### Empty State Designs
- [ ] `EmptyState` component renders all variants (default, minimal, tactical, card)
- [ ] Empty state icon displays at correct size with muted opacity
- [ ] Empty state title uses data-metric typography (uppercase, monospace)
- [ ] Empty state description uses body-default typography
- [ ] Primary action button renders when provided
- [ ] Secondary action button renders when provided
- [ ] Tactical variant shows dashed border and grid overlay
- [ ] Pre-built empty states render correctly (EmptyProjects, EmptyThreats, etc.)
- [ ] `TableEmptyState` renders within table body with correct colspan
- [ ] `GridEmptyState` renders as full-width placeholder in grids
- [ ] `InlineEmptyState` renders in compact format for sidebars/panels
- [ ] Connection error state shows offline indicator
- [ ] Data load error state shows retry button
- [ ] Empty states animate in with fade-in effect
- [ ] Empty states are accessible (proper heading levels, ARIA labels)

---

## Cross-References

- **Parent Document:** [03-FRONTEND-FOUNDATION.md](./03-FRONTEND-FOUNDATION.md) - Full frontend phase overview
- **Data Layer Tasks:** See parent document for Tasks 3.1-3.3 (Router, Query, API Client)
- **Auth Flow Tasks:** See parent document for Tasks 3.10-3.11
- **Project CRUD:** See parent document for Task 3.12
- **Visualization:** See parent document for Tasks 3.13-3.14 (Charts, D3.js)
- **Design System Reference:** See [CLAUDE.md](../../CLAUDE.md) for Ops-Center Dark theme specifications
