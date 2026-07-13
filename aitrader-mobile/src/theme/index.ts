export const colors = {
  primary: '#8B5CF6',
  primaryLight: '#A78BFA',
  primaryDark: '#7C3AED',
  secondary: '#06B6D4',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  gradientPrimary: ['#8B5CF6', '#7C3AED'],
  gradientSuccess: ['#10B981', '#059669'],
  gradientError: ['#EF4444', '#DC2626'],
  gradientWarning: ['#F59E0B', '#D97706'],
  gradientBackground: ['#0F0F1A', '#1A1A2E', '#0F0F1A'],
  
  background: '#0F0F1A',
  backgroundSecondary: '#161628',
  surface: '#1A1A2E',
  surfaceElevated: '#222238',
  surfaceHover: '#2A2A44',
  
  borderPrimary: '#2D2D44',
  borderSecondary: '#3D3D5C',
  borderFocus: '#8B5CF6',
  
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0F0F1A',
  textDisabled: '#475569',
  
  bgInput: '#1A1A2E',
  bgCard: '#222238',
  bgModal: '#1A1A2E',
  
  overlay: 'rgba(15, 15, 26, 0.8)',
  overlayDark: 'rgba(0, 0, 0, 0.6)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 24,
    xxxl: 32,
    display: 40,
  },
  weights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 20,
  },
};

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  modal: 300,
  popover: 400,
  tooltip: 500,
  toast: 600,
};

export const transitions = {
  fast: 150,
  normal: 250,
  slow: 350,
};

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};