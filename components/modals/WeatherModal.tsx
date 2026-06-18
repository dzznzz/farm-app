import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, StatusBar, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { fetchCurrentWeather, fetchWeatherByCity, getWeatherIconName } from '../../lib/weather';
import { PhIcon } from '../ui/PhIcon';
import { Card } from '../ui/Card';
import { WeatherData } from '../../types';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';

const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const MONTHLY_AVG = [2, 4, 9, 16, 21, 25, 28, 29, 24, 17, 10, 3];

function formatHour(unix: number) {
  const d = new Date(unix * 1000);
  const h = d.getHours();
  if (h === 0) return '자정';
  if (h === 12) return '정오';
  return h < 12 ? `오전${h}시` : `오후${h - 12}시`;
}

function formatDay(unix: number) {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const d = new Date(unix * 1000);
  return `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  initialWeather?: WeatherData | null;
  initialCity?: string;
}

export function WeatherModal({ visible, onClose, initialWeather, initialCity }: Props) {
  const insets = useSafeAreaInsets();
  const [weather, setWeather] = useState<WeatherData | null>(initialWeather ?? null);
  const [loading, setLoading] = useState(!initialWeather);
  const [cityInput, setCityInput] = useState('');
  const [currentCity, setCurrentCity] = useState(initialCity ?? '');
  const [tab, setTab] = useState<'current' | 'monthly'>('current');

  const loadByCoords = async (lat: number, lon: number, cityName?: string) => {
    setLoading(true);
    try {
      const data = await fetchCurrentWeather(lat, lon);
      const name = cityName ?? data.city ?? '현재 위치';
      setWeather({ ...data, city: name });
      setCurrentCity(name);
    } catch (e: any) {
      Alert.alert('오류', e.message);
    }
    setLoading(false);
  };

  const loadByCity = async (city: string) => {
    setLoading(true);
    try {
      const { lat, lon, name } = await fetchWeatherByCity(city);
      const data = await fetchCurrentWeather(lat, lon);
      setWeather({ ...data, city: name });
      setCurrentCity(name);
    } catch (e: any) {
      Alert.alert('오류', e.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!visible) return;
    if (initialWeather) { setWeather(initialWeather); setCurrentCity(initialCity ?? ''); setLoading(false); return; }
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          await loadByCoords(loc.coords.latitude, loc.coords.longitude);
        } else {
          await loadByCity('서울');
        }
      } catch {
        await loadByCity('서울');
      }
    })();
  }, [visible]);

  const handleSearch = () => {
    if (cityInput.trim()) loadByCity(cityInput.trim());
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <LinearGradient colors={['#7B6BA0', Colors.primary]} style={[styles.searchHeader, { paddingTop: insets.top }]}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>날씨</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={cityInput}
              onChangeText={setCityInput}
              placeholder="도시 검색 (예: 수원)"
              placeholderTextColor="rgba(255,255,255,0.6)"
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
              <Text style={styles.searchBtnText}>검색</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView style={styles.scroll} bounces={false}>
          <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.weatherDisplay}>
            {loading ? (
              <ActivityIndicator color="#fff" style={{ marginVertical: 60 }} size="large" />
            ) : weather ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <PhIcon name="map-pin" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.cityName}>{currentCity}</Text>
                </View>
                <PhIcon name={getWeatherIconName(weather.icon) as any} size={72} color="#fff" style={{ marginVertical: 8 }} />
                <Text style={styles.temp}>{weather.temp}°</Text>
                <Text style={styles.desc}>{weather.description}</Text>
                <View style={styles.weatherMetaRow}>
                  <Text style={styles.weatherMeta}>체감 {weather.feels_like}°</Text>
                  <Text style={styles.weatherMetaDot}>·</Text>
                  <Text style={styles.weatherMeta}>습도 {weather.humidity}%</Text>
                  <Text style={styles.weatherMetaDot}>·</Text>
                  <Text style={styles.weatherMeta}>바람 {weather.wind_speed}km/h</Text>
                </View>
              </>
            ) : null}

            <View style={styles.tabRow}>
              {(['current', 'monthly'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
                  onPress={() => setTab(t)}
                >
                  <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                    {t === 'current' ? '예보' : '월별 평균'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </LinearGradient>

          {tab === 'current' && weather && !loading && (
            <>
              <Text style={styles.sectionLabel}>시간별 예보</Text>
              {Platform.OS === 'web' ? (
                <View style={styles.hourlyRowWeb}>
                  {weather.hourly.map((h, i) => (
                    <Card key={i} style={styles.hourlyCardWeb}>
                      <Text style={styles.hourlyTime}>{formatHour(h.time)}</Text>
                      <PhIcon name={getWeatherIconName(h.icon) as any} size={22} color={Colors.primary} style={{ marginBottom: 6 }} />
                      <Text style={styles.hourlyTemp}>{h.temp}°</Text>
                    </Card>
                  ))}
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hourlyScroll}>
                  {weather.hourly.map((h, i) => (
                    <Card key={i} style={styles.hourlyCard}>
                      <Text style={styles.hourlyTime}>{formatHour(h.time)}</Text>
                      <PhIcon name={getWeatherIconName(h.icon) as any} size={22} color={Colors.primary} style={{ marginBottom: 6 }} />
                      <Text style={styles.hourlyTemp}>{h.temp}°</Text>
                    </Card>
                  ))}
                </ScrollView>
              )}

              <Text style={styles.sectionLabel}>주간 예보</Text>
              <Card style={styles.dailyCard}>
                {weather.daily.map((d, i) => (
                  <View key={i} style={[styles.dailyRow, i > 0 && styles.dailyBorder]}>
                    <Text style={styles.dailyDay}>{i === 0 ? '오늘' : formatDay(d.date)}</Text>
                    <PhIcon name={getWeatherIconName(d.icon) as any} size={20} color={Colors.primary} style={{ marginRight: Spacing.sm }} />
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <PhIcon name="drop" size={13} color={Colors.textSub} />
                      <Text style={styles.dailyPop}>{d.pop}%</Text>
                    </View>
                    <Text style={styles.dailyTemp}>
                      <Text style={{ color: Colors.primary }}>{d.temp_max}°</Text>
                      <Text style={{ color: Colors.textSub }}> / {d.temp_min}°</Text>
                    </Text>
                  </View>
                ))}
              </Card>
            </>
          )}

          {tab === 'monthly' && (
            <>
              <Text style={styles.sectionLabel}>월별 평균 기온 (한국 평균)</Text>
              <Card style={styles.monthlyCard}>
                {MONTH_LABELS.map((label, i) => (
                  <View key={i} style={styles.monthlyRow}>
                    <Text style={styles.monthlyLabel}>{label}</Text>
                    <View style={styles.barTrack}>
                      <View style={[
                        styles.barFill,
                        {
                          width: `${((MONTHLY_AVG[i] + 5) / 34) * 100}%` as any,
                          backgroundColor: MONTHLY_AVG[i] > 20 ? Colors.warning : MONTHLY_AVG[i] > 10 ? Colors.primary : Colors.primaryLight,
                        },
                      ]} />
                    </View>
                    <Text style={styles.monthlyTemp}>{MONTHLY_AVG[i]}°C</Text>
                  </View>
                ))}
              </Card>

              <Card style={styles.monthlyCardBottom}>
                <Text style={[Typography.bodyBold, { marginBottom: Spacing.md }]}>농업 계절 가이드</Text>
                {[
                  { season: '봄 (3-5월)', tip: '파종 및 육묘 시기. 늦서리 주의.', icon: 'plant' },
                  { season: '여름 (6-8월)', tip: '고온다습, 병충해 방제 집중 관리.', icon: 'sun' },
                  { season: '가을 (9-11월)', tip: '주요 수확 시기. 건조 주의.', icon: 'leaf' },
                  { season: '겨울 (12-2월)', tip: '시설 보온 및 토양 관리 시기.', icon: 'snowflake' },
                ].map((item) => (
                  <View key={item.season} style={styles.seasonRow}>
                    <PhIcon name={item.icon as any} size={22} color={Colors.primary} style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={Typography.bodyBold}>{item.season}</Text>
                      <Text style={{ ...Typography.caption, marginTop: 2 }}>{item.tip}</Text>
                    </View>
                  </View>
                ))}
              </Card>
            </>
          )}

          <View style={{ height: Spacing.xl + insets.bottom }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchHeader: { paddingBottom: Spacing.md },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, marginBottom: Spacing.sm,
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  closeBtn: { padding: 6 },
  closeBtnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  searchRow: { flexDirection: 'row', marginHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.sm },
  searchInput: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: Radius.full,
    paddingHorizontal: 16, paddingVertical: 10, color: '#fff', fontSize: 14,
  },
  searchBtn: {
    backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: Radius.full,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  searchBtnText: { color: '#fff', fontWeight: '700' },
  scroll: { flex: 1 },
  weatherDisplay: { alignItems: 'center', paddingVertical: Spacing.lg, paddingBottom: 0 },
  cityName: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  weatherIcon: { fontSize: 72, marginVertical: 8 },
  temp: { fontSize: 64, fontWeight: '200', color: '#fff' },
  desc: { color: 'rgba(255,255,255,0.9)', fontSize: 16, marginTop: 4 },
  weatherMetaRow: { flexDirection: 'row', marginTop: 8, gap: 6, marginBottom: Spacing.md },
  weatherMeta: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  weatherMetaDot: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  tabRow: {
    flexDirection: 'row', marginHorizontal: Spacing.lg, marginVertical: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: Radius.full, padding: 3, alignSelf: 'stretch',
  },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: Radius.full },
  tabBtnActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  tabText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  sectionLabel: { ...Typography.label, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  hourlyScroll: { paddingLeft: Spacing.lg },
  hourlyCard: { alignItems: 'center', marginRight: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, minWidth: 72 },
  hourlyRowWeb: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  hourlyCardWeb: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, minWidth: 72 },
  hourlyTime: { fontSize: 11, color: Colors.textSub, marginBottom: 6 },
  hourlyIcon: { fontSize: 22, marginBottom: 6 },
  hourlyTemp: { fontSize: 14, fontWeight: '700', color: Colors.text },
  dailyCard: { marginHorizontal: Spacing.lg },
  dailyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  dailyBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  dailyDay: { flex: 1.5, fontSize: 14, color: Colors.text, fontWeight: '500' },
  dailyIcon: { fontSize: 20, marginRight: Spacing.sm },
  dailyPop: { flex: 1, fontSize: 12, color: Colors.textSub },
  dailyTemp: { flex: 1.5, textAlign: 'right', fontSize: 14, fontWeight: '600' },
  monthlyCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  monthlyCardBottom: { marginHorizontal: Spacing.lg, marginTop: 0, marginBottom: Spacing.xl },
  monthlyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  monthlyLabel: { width: 36, fontSize: 13, color: Colors.textSub },
  barTrack: { flex: 1, height: 8, backgroundColor: Colors.border, borderRadius: Radius.full, marginHorizontal: Spacing.sm, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: Radius.full },
  monthlyTemp: { width: 40, textAlign: 'right', fontSize: 13, fontWeight: '600', color: Colors.text },
  seasonRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm, gap: Spacing.sm },
  seasonEmoji: {},
});
