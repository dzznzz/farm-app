import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Colors, Spacing, Typography } from '../../constants/theme';
import { pageStyles } from './shared';

interface Props {
  onBack: () => void;
  userId?: string;
}

export function HarvestPage({ onBack, userId }: Props) {
  const [isTracking, setIsTracking] = useState(false);
  const [tracks, setTracks] = useState<{ lat: number; lng: number }[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const locationSub = useRef<Location.LocationSubscription | null>(null);

  const startTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { Alert.alert('권한 필요', '위치 권한을 허용해주세요.'); return; }
    if (!userId) return;
    const { data: session } = await supabase.from('harvest_sessions').insert({
      user_id: userId, started_at: new Date().toISOString(), is_active: true,
    }).select().single();
    if (!session) return;
    setSessionId(session.id); setIsTracking(true); setTracks([]);
    locationSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 30000, distanceInterval: 10 },
      async (loc) => {
        const point = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setTracks((prev) => [...prev, point]);
        await supabase.from('harvest_tracks').insert({
          session_id: session.id, lat: point.lat, lng: point.lng, recorded_at: new Date().toISOString(),
        });
      }
    );
  };

  const stopTracking = async () => {
    locationSub.current?.remove(); locationSub.current = null; setIsTracking(false);
    if (sessionId) {
      await supabase.from('harvest_sessions').update({ ended_at: new Date().toISOString(), is_active: false }).eq('id', sessionId);
    }
    Alert.alert('완료', `총 ${tracks.length}개 위치가 기록되었습니다.`);
  };

  useEffect(() => () => { locationSub.current?.remove(); }, []);

  return (
    <SafeAreaView style={pageStyles.container}>
      <View style={pageStyles.subHeader}>
        <TouchableOpacity onPress={onBack}><Text style={pageStyles.backBtn}>←</Text></TouchableOpacity>
        <Text style={pageStyles.subTitle}>🗺️ 수확 동선 추적</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={pageStyles.scroll}>
        <Card style={{ margin: Spacing.lg, alignItems: 'center' }}>
          <Text style={{ fontSize: 72, marginBottom: Spacing.md }}>{isTracking ? '🔴' : '🟢'}</Text>
          <Text style={Typography.h3}>{isTracking ? '추적 중...' : '추적 대기 중'}</Text>
          {isTracking && <Text style={[Typography.caption, { marginTop: 8 }]}>기록된 위치: {tracks.length}개</Text>}
          <View style={{ marginTop: Spacing.lg, width: '100%' }}>
            {!isTracking
              ? <Button title="🌾 수확 시작" onPress={startTracking} />
              : <Button title="⏹ 수확 완료" onPress={stopTracking} variant="outline" />
            }
          </View>
        </Card>
        <Card style={{ margin: Spacing.lg, marginTop: 0 }}>
          <Text style={[Typography.bodyBold, { marginBottom: Spacing.md }]}>사용 방법</Text>
          {[
            '수확 시작 버튼을 누르면 GPS 추적이 시작됩니다.',
            '30초 간격으로 위치가 자동으로 기록됩니다.',
            '수확 완료 버튼을 누르면 동선이 저장됩니다.',
            'Apple Watch 연동 시 더 정확한 추적이 가능합니다.',
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={styles.tipNum}>{i + 1}</Text>
              <Text style={[Typography.caption, { flex: 1 }]}>{tip}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tipRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xs },
  tipNum: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.primaryUltraLight,
    color: Colors.primary, fontSize: 11, fontWeight: '700', textAlign: 'center', lineHeight: 20,
  },
});
