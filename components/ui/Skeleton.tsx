import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import { Card } from './Card';
import { Colors, Radius, Spacing } from '../../constants/theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

/** 회색 깜빡임(shimmer) 자리표시 블록 */
export function Skeleton({ width = '100%', height = 14, radius = Radius.sm, style }: SkeletonProps) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: Colors.border, opacity: pulse }, style]}
    />
  );
}

/** 요약 카드(수확량/매출 등) 로딩 자리표시 — 2×2 그리드 */
export function SummaryCardSkeleton() {
  return (
    <View style={styles.summarySection}>
      {[0, 1].map((row) => (
        <View key={row} style={styles.summaryRow}>
          {[0, 1].map((col) => (
            <Card key={col} style={styles.card}>
              <Skeleton width={64} height={12} style={{ marginBottom: Spacing.sm }} />
              <Skeleton width={90} height={26} radius={Radius.md} style={{ marginBottom: Spacing.sm }} />
              <Skeleton width="70%" height={11} />
            </Card>
          ))}
        </View>
      ))}
    </View>
  );
}

/** 막대 차트 로딩 자리표시 */
export function BarChartSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <View style={styles.barChart}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.barRow}>
          <Skeleton width={40} height={11} />
          <Skeleton width={`${35 + ((i * 53) % 55)}%`} height={18} radius={9} style={{ flexShrink: 0 }} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  summarySection: { paddingTop: Spacing.md, gap: Spacing.sm },
  summaryRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm },
  card: { flex: 1 },
  barChart: { gap: 8, paddingVertical: 4 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
