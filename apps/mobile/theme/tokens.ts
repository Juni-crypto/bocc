/**
 * BOCC design tokens. Mirrors mockups/mobile.html.
 * Dark theme, single lime accent, coral reserved for the live REC dot.
 */

export const colors = {
  ink: '#050505', // app background
  surface: '#0E0E10', // cards / inputs
  surface2: '#161619', // raised surface
  lime: '#D7FF3E', // single accent for CTAs / active
  coral: '#FF6B5E', // ONLY the live REC dot

  // text
  text: 'rgba(255,255,255,0.90)',
  textMuted: 'rgba(255,255,255,0.55)',
  textFaint: 'rgba(255,255,255,0.40)',
  textGhost: 'rgba(255,255,255,0.25)',

  // surfaces / lines
  fill: 'rgba(255,255,255,0.04)',
  fillStrong: 'rgba(255,255,255,0.06)',
  hairline: 'rgba(255,255,255,0.08)',
  hairlineSoft: 'rgba(255,255,255,0.05)',
  hairlineStrong: 'rgba(255,255,255,0.10)',
  hairlineDash: 'rgba(255,255,255,0.15)',
} as const;

export const fonts = {
  // display = Space Grotesk, body = Hanken Grotesk (loaded via @expo-google-fonts)
  display: 'SpaceGrotesk_700Bold',
  displaySemibold: 'SpaceGrotesk_600SemiBold',
  displayMedium: 'SpaceGrotesk_500Medium',
  body: 'HankenGrotesk_400Regular',
  bodyMedium: 'HankenGrotesk_500Medium',
  bodySemibold: 'HankenGrotesk_600SemiBold',
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

/** Uppercase tracked label style used throughout the mockup. */
export const label = {
  fontFamily: fonts.displayMedium,
  fontSize: 11,
  letterSpacing: 1.6,
  textTransform: 'uppercase' as const,
  color: '#73737a',
};

export const theme = { colors, fonts, radius, spacing, label };
export type Theme = typeof theme;
