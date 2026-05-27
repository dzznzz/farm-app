import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { StatBadge } from '../ui/StatBadge';
import { Colors, Typography, Spacing } from '../../constants/theme';

interface SummaryCardProps {
  title: string;
  value: string;
  unit: string;
  changeRate: number;
  compareLabel: string;
  icon: string;
  color?: string;
}

export function SummaryCard({ title, value, unit, changeRate, compareLabel, icon, color }: SummaryCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={[styles.value, color ? { color } : {}]}>{value}</Text>
      <Text style={styles.unit}>{unit}</Text>
      <View style={styles.footer}>
        <StatBadge value={changeRate} />
        <Text style={styles.compareLabel}> {compareLabel}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  icon: { fontSize: 20, marginRight: 6 },
  title: { ...Typography.caption, fontWeight: '600' },
  value: { fontSize: 28, fontWeight: '800', color: Colors.text, lineHeight: 34 },
  unit: { ...Typography.caption, marginTop: 2, marginBottom: Spacing.sm },
  footer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  compareLabel: { ...Typography.caption, flex: 1 },
});
