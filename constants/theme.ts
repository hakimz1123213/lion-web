// Noir Wealth - Design System Tokens (Upgraded to Royal Blue & Gold)

export const Colors = {
  // Core palette - أزرق ليلي عميق
  background: '#030B17',       // خلفية زرقاء داكنة جداً بدلاً من الأسود
  surface: '#0A172B',          // كروت زرقاء ليلية
  surfaceElevated: '#10223D',  // طبقات أعلى
  surfaceBorder: '#1A3357',    // حدود زرقاء مضيئة خفيفة

  // Brand / Emphasis - ذهبي مشع وساطع
  gold: '#FFD700',             // ذهبي ساطع جداً 
  goldLight: '#FFE873',        // ذهبي فاتح للتأثيرات
  goldDim: '#A88D00',          // ذهبي داكن للحدود
  goldSurface: '#1A1600',      // خلفية الكروت الذهبية

  // Text
  textPrimary: '#FFFFFF',      // أبيض ناصع للقراءة المريحة
  textSecondary: '#94A6C5',    // رمادي مائل للأزرق للنصوص الثانوية
  textMuted: '#52678C',        // أزرق باهت
  textOnGold: '#030B17',       // أزرق داكن فوق الأزرار الذهبية

  // Semantic
  success: '#00E676',
  successSurface: '#002613',
  danger: '#FF3D00',
  dangerSurface: '#260900',
  warning: '#FFC107',
  warningSurface: '#261C00',
  info: '#29B6F6',
  infoSurface: '#041621',

  // Tiers (معدلة لتناسب الثيم الجديد)
  vip1: '#B0BEC5',
  vip2: '#29B6F6',
  vip3: '#FFD700',
  vip4: '#FF3D00',
  vip5: '#D500F9',

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

// زوايا أكثر نعومة وعصرية
export const Radius = {
  sm: 10,
  md: 16,     // كانت 12
  lg: 24,     // كانت 16
  xl: 32,     // كانت 20
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