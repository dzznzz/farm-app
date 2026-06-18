import React, { useRef } from 'react';
import {
  Pressable, Animated, ViewStyle, StyleProp, GestureResponderEvent,
} from 'react-native';
import { hapticLight, hapticMedium } from '../../lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps {
  children: React.ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  /** 눌렀을 때 줄어드는 비율 (기본 0.97) */
  scaleTo?: number;
  /** 터치 시 햅틱 피드백 (기본 'light', 끄려면 'none') */
  haptic?: 'light' | 'medium' | 'none';
}

/**
 * 누르면 살짝 줄어드는(scale) + 햅틱 피드백을 주는 터치 래퍼.
 * TouchableOpacity 대체용 드롭인 — style(flex 등 레이아웃)이 그대로 적용된다.
 */
export function PressableScale({
  children,
  onPress,
  style,
  disabled,
  scaleTo = 0.97,
  haptic = 'light',
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (to: number) =>
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();

  const handlePressIn = () => {
    if (disabled) return;
    animateTo(scaleTo);
    if (haptic === 'light') hapticLight();
    else if (haptic === 'medium') hapticMedium();
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={() => animateTo(1)}
      onPress={onPress}
      disabled={disabled}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}
