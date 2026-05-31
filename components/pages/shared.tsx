import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';

export function SettingField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: Spacing.md }}>
      <Text style={{ ...Typography.label, marginBottom: Spacing.xs }}>{label}</Text>
      {children}
    </View>
  );
}

export const pageStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  subHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.lg, paddingTop: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { fontSize: 22, color: Colors.primary, fontWeight: '600' },
  subTitle: { ...Typography.h3 },
  addBtnText: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
  settingInput: {
    backgroundColor: Colors.background, borderRadius: Radius.md, padding: 14,
    fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border,
  },
  editBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.primary,
  },
  editBtnText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  cancelBtn: {
    flex: 1, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  cancelBtnText: { color: Colors.textSub, fontWeight: '600' },
  emptyAddBtn: {
    marginTop: Spacing.lg, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    backgroundColor: Colors.primaryUltraLight, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.primary,
  },
  emptyAddBtnText: { color: Colors.primaryDark, fontWeight: '700' },
});
