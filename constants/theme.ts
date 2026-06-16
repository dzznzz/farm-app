export const Colors = {
  primary: '#9B8EC4',
  primaryDark: '#7B6BA0',
  primaryLight: '#C4BAE8',
  primaryUltraLight: '#EDE9F8',
  background: '#F8F6FF',
  surface: '#FFFFFF',
  text: '#2D2D3A',
  textSub: '#8A8A9A',
  textLight: '#B8B8C8',
  success: '#6BCB8B',
  successLight: '#E8F8EE',
  warning: '#F4A261',
  warningLight: '#FEF3EA',
  danger: '#E07070',
  dangerLight: '#FDEAEA',
  border: '#EBEBF5',
  yellow: '#DAB910',
  shadow: 'rgba(155, 142, 196, 0.15)',
};

export const Typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, color: Colors.text },
  h2: { fontSize: 22, fontWeight: '700' as const, color: Colors.text },
  h3: { fontSize: 18, fontWeight: '600' as const, color: Colors.text },
  body: { fontSize: 15, fontWeight: '400' as const, color: Colors.text },
  bodyBold: { fontSize: 15, fontWeight: '600' as const, color: Colors.text },
  caption: { fontSize: 12, fontWeight: '400' as const, color: Colors.textSub },
  label: { fontSize: 13, fontWeight: '500' as const, color: Colors.textSub },
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
  xl: 24,
  full: 999,
};

export const Shadow = {
  card: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  sm: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
};
