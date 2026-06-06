// Noir Wealth - Design System Tokens

export const Colors = {
  // Core palette
  background: '#050505',
  surface: '#0f0f0f',
  surfaceElevated: '#161616',
  surfaceBorder: '#1e1e1e',

  // Brand / Emphasis
  gold: '#C9A84C',
  goldLight: '#E8C96A',
  goldDim: '#7A6130',
  goldSurface: '#1A1507',

  // Text
  textPrimary: '#F0EAD6',
  textSecondary: '#8A8070',
  textMuted: '#4A4540',
  textOnGold: '#0a0800',

  // Semantic
  success: '#4CAF7A',
  successSurface: '#0A1F12',
  danger: '#E05252',
  dangerSurface: '#1F0A0A',
  warning: '#E0A830',
  warningSurface: '#1F1505',
  info: '#4A90D9',
  infoSurface: '#071525',

  // Tiers
  vip1: '#8B8B8B',
  vip2: '#4A9EE8',
  vip3: '#C9A84C',
  vip4: '#E05252',
  vip5: '#9B59B6',

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  base: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  hero: 38,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};
