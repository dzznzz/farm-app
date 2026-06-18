import React from 'react';
import { Text, StyleSheet, ViewStyle, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius } from '../../constants/theme';
import { PressableScale } from './PressableScale';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, style }: ButtonProps) {
  const inactive = disabled || loading;
  // 주요 액션(primary)은 조금 더 묵직한 햅틱, 나머지는 가벼운 햅틱
  const haptic = inactive ? 'none' : variant === 'primary' ? 'medium' : 'light';

  if (variant === 'primary') {
    return (
      <PressableScale onPress={onPress} disabled={inactive} style={style} haptic={haptic}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.primary}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>{title}</Text>
          )}
        </LinearGradient>
      </PressableScale>
    );
  }

  if (variant === 'outline') {
    return (
      <PressableScale onPress={onPress} disabled={inactive} style={[styles.outline, style]} haptic={haptic}>
        <Text style={styles.outlineText}>{title}</Text>
      </PressableScale>
    );
  }

  return (
    <PressableScale onPress={onPress} disabled={inactive} style={style} haptic={haptic}>
      <View style={styles.ghost}>
        <Text style={styles.ghostText}>{title}</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  primary: {
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: Radius.full,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  outline: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
  },
  outlineText: { color: Colors.primary, fontSize: 16, fontWeight: '600' },
  ghost: { alignItems: 'center' },
  ghostText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
});
