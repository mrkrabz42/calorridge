export const Colors = {
  // Background layers
  bg: {
    primary: '#0F172A',    // slate-900
    secondary: '#1E293B',  // slate-800
    card: '#1E293B',
    overlay: 'rgba(15, 23, 42, 0.85)',
  },
  // Brand
  brand: {
    primary: '#22D3EE',    // cyan-400
    secondary: '#0EA5E9',  // sky-500
    accent: '#818CF8',     // indigo-400
  },
  // Macros
  macro: {
    calories: '#F97316',   // orange-500
    protein: '#22D3EE',    // cyan-400
    carbs: '#A78BFA',      // violet-400
    fat: '#FB923C',        // orange-400
    fiber: '#4ADE80',      // green-400
  },
  // Status
  status: {
    success: '#4ADE80',    // green-400
    warning: '#FACC15',    // yellow-400
    error: '#F87171',      // red-400
    info: '#60A5FA',       // blue-400
  },
  // Text
  text: {
    primary: '#F1F5F9',    // slate-100
    secondary: '#94A3B8',  // slate-400
    muted: '#475569',      // slate-600
    inverse: '#0F172A',
  },
  // Borders
  border: {
    default: '#334155',    // slate-700
    subtle: '#1E293B',
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const Typography = {
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
} as const;
