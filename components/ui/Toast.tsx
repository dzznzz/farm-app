import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Text, StyleSheet, Animated, Platform } from 'react-native';
import { PhIcon, type PhIconName } from './PhIcon';
import { Colors, Radius } from '../../constants/theme';

type ToastType = 'success' | 'error' | 'info';

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** 전역 토스트. `ToastProvider` 하위에서 `const toast = useToast()` 후 toast.success(...) 호출 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

const ICON: Record<ToastType, { name: PhIconName; color: string }> = {
  success: { name: 'check-circle', color: Colors.success },
  error: { name: 'info', color: Colors.danger },
  info: { name: 'info', color: Colors.primaryLight },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anim = useRef(new Animated.Value(0)).current;

  const hide = useCallback(() => {
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true })
      .start(() => setToast(null));
  }, [anim]);

  const show = useCallback((message: string, type: ToastType = 'info') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, type });
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
    timer.current = setTimeout(hide, 2200);
  }, [anim, hide]);

  const value = useMemo<ToastContextValue>(() => ({
    show,
    success: (m: string) => show(m, 'success'),
    error: (m: string) => show(m, 'error'),
    info: (m: string) => show(m, 'info'),
  }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[styles.toast, {
            opacity: anim,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
          }]}
        >
          <PhIcon name={ICON[toast.type].name} size={20} color={ICON[toast.type].color} weight="fill" />
          <Text style={styles.text}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 104 : 88,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(30,30,30,0.92)',
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: 18,
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  text: { flex: 1, color: '#fff', fontWeight: '600', fontSize: 14 },
});
