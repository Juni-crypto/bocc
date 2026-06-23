import { type ReactNode } from 'react';
import { StyleSheet, Text, View, type TextStyle } from 'react-native';
import { colors, fonts, label as labelStyle } from '@/theme/tokens';
import { Toggle } from './Toggle';

/** Uppercase tracked eyebrow label. */
export function Label({
  children,
  color,
  style,
}: {
  children: ReactNode;
  color?: string;
  style?: TextStyle;
}) {
  return (
    <Text style={[labelStyle, color ? { color } : null, style]}>
      {children}
    </Text>
  );
}

/** Display-font heading. */
export function Display({
  children,
  size = 24,
  color = colors.text,
  style,
}: {
  children: ReactNode;
  size?: number;
  color?: string;
  style?: TextStyle;
}) {
  return (
    <Text
      style={[
        { fontFamily: fonts.display, fontSize: size, color, lineHeight: size * 1.08 },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/** A labelled toggle row with title + helper copy, matching the mockup. */
export function SettingRow({
  title,
  hint,
  value,
  onChange,
  divider = true,
}: {
  title: string;
  hint?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  divider?: boolean;
}) {
  return (
    <View style={[styles.row, divider && styles.divider]}>
      <View style={styles.rowText}>
        <Text style={styles.title}>{title}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Toggle value={value} onChange={onChange} label={title} />
    </View>
  );
}

/** A single stat cell for the host dashboard. */
export function StatCard({
  value,
  caption,
  accent = false,
}: {
  value: string | number;
  caption: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, accent && { color: colors.lime }]}>
        {value}
      </Text>
      <Text style={styles.statCaption}>{caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.hairlineSoft },
  rowText: { flex: 1, paddingRight: 12 },
  title: { fontFamily: fonts.body, fontSize: 14, color: colors.text },
  hint: { fontFamily: fonts.body, fontSize: 11, color: colors.textFaint, marginTop: 2 },
  stat: {
    flex: 1,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statValue: { fontFamily: fonts.display, fontSize: 26, color: colors.text },
  statCaption: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textFaint,
    marginTop: 2,
  },
});
