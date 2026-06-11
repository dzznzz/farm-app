import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../hooks/useAuth';
import { Colors } from '../constants/theme';

WebBrowser.maybeCompleteAuthSession();

const DAILY_NOTIF_KEY = 'daily_7pm_notif_id';

async function ensureDailyNotification() {
  if (Platform.OS === 'web') return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const { status: s } = await Notifications.requestPermissionsAsync();
    if (s !== 'granted') return;
  }

  // 기존 예약된 알림 확인
  const existingId = await AsyncStorage.getItem(DAILY_NOTIF_KEY);
  if (existingId) {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    if (scheduled.some((n) => n.identifier === existingId)) return;
    await AsyncStorage.removeItem(DAILY_NOTIF_KEY);
  }

  // 매일 19:00 배너 알림 등록
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '오늘도 수고하셨어요',
      body: '오늘을 기록해볼까요? ㅁ-ㅁ7',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 19,
      minute: 0,
    },
  });
  await AsyncStorage.setItem(DAILY_NOTIF_KEY, id);
}

export default function RootLayout() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === '(auth)';

    if (!user && !inAuth) {
      router.replace('/(auth)/login');
    } else if (user && inAuth) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  useEffect(() => {
    if (user) ensureDailyNotification();
  }, [user]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
