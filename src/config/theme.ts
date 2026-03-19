export const colors = {
  primary: '#4F46E5',
  primaryLight: '#EEF2FF',
  primaryDark: '#3730A3',

  background: '#F9FAFB',
  card: '#FFFFFF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',

  success: '#16A34A',
  successLight: '#F0FDF4',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  error: '#DC2626',
  errorLight: '#FEF2F2',

  shadow: '#000000',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const typography = {
  titleLarge: { fontSize: 24, fontWeight: '700' as const, color: colors.text },
  title: { fontSize: 20, fontWeight: '700' as const, color: colors.text },
  sectionTitle: { fontSize: 18, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 16, fontWeight: '400' as const, color: colors.text },
  bodyMedium: { fontSize: 16, fontWeight: '500' as const, color: colors.text },
  bodySemibold: { fontSize: 16, fontWeight: '600' as const, color: colors.text },
  caption: { fontSize: 13, fontWeight: '400' as const, color: colors.textSecondary },
  captionMuted: { fontSize: 13, fontWeight: '400' as const, color: colors.textMuted },
  numberLarge: { fontSize: 28, fontWeight: '700' as const, color: colors.text },
  numberMedium: { fontSize: 20, fontWeight: '700' as const, color: colors.text },
} as const;

export const shadows = {
  sm: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;
