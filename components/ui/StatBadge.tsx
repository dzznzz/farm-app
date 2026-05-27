import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius } from '../../constants/theme';

interface StatBadgeProps {
  value: number;
  suffix?: string;
}

export function StatBadge({ value, suffix = '%' }: StatBadgeProps) {
  const isPositive = value >= 0;
  return (
    <View style={[styles.badge, isPositive ? styles.positive : styles.negative]}>
      <Text style={[styles.text, isPositive ? styles.positiveText : styles.negativeText]}>
        {isPositive ? '▲' : '▼'} {Math.abs(value).toFixed(1)}{suffix}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  positive: { backgroundColor: Colors.successLight },
  negative: { backgroundColor: Colors.dangerLight },
  text: { fontSize: 11, fontWeight: '600' },
  positiveText: { color: Colors.success },
  negativeText: { color: Colors.danger },
});
