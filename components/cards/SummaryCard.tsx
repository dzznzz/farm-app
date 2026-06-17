import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { PhIcon, type PhIconName } from '../ui/PhIcon';
import { Card } from '../ui/Card';
import { StatBadge } from '../ui/StatBadge';
import { Colors, Typography, Spacing } from '../../constants/theme';

interface SummaryCardProps {
  title: string;
  value: string;
  unit: string;
  changeRate: number | null;
  compareLabel: string;
  icon: PhIconName;
  color?: string;
}

/** value 문자열을 0 → 실제 값까지 또르륵 올라가는 카운트업 애니메이션 */
function useCountUp(value: string): string {
  // "1,234" / "12.5" 같은 표시 문자열을 숫자로 파싱
  const target = parseFloat(value.replace(/,/g, ''));
  const decimals = value.includes('.') ? (value.split('.')[1]?.length ?? 0) : 0;

  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(0);

  useEffect(() => {
    if (Number.isNaN(target)) { setDisplay(value); return; }
    const format = (n: number) =>
      decimals > 0
        ? n.toFixed(decimals)
        : Math.round(n).toLocaleString();

    anim.stopAnimation((current) => { fromRef.current = current; });
    anim.setValue(fromRef.current);
    const id = anim.addListener(({ value: v }) => setDisplay(format(v)));
    Animated.timing(anim, {
      toValue: target,
      duration: 800,
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
  }, [target, decimals]);

  return Number.isNaN(target) ? value : display;
}

export function SummaryCard({ title, value, unit, changeRate, compareLabel, icon, color }: SummaryCardProps) {
  const animatedValue = useCountUp(value);
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <PhIcon name={icon} size={20} color={color || Colors.text} style={{ marginRight: 6 }} />
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={[styles.value, color ? { color } : {}]}>{animatedValue}</Text>
      <Text style={styles.unit}>{unit}</Text>
      {changeRate !== null && (
        <View style={styles.footer}>
          <StatBadge value={changeRate} />
          <Text style={styles.compareLabel}> {compareLabel}</Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  icon: { marginRight: 6 },
  title: { ...Typography.caption, fontWeight: '600' },
  value: { fontSize: 28, fontWeight: '800', color: Colors.text, lineHeight: 34 },
  unit: { ...Typography.caption, marginTop: 2, marginBottom: Spacing.sm },
  footer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  compareLabel: { ...Typography.caption, flex: 1 },
});
