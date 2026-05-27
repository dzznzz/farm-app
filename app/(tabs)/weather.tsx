import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchCurrentWeather, fetchWeatherByCity, getWeatherEmoji } from '../../lib/weather';
import { Card } from '../../components/ui/Card';
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

export default function WeatherScreen() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [cityInput, setCityInput] = useState('');
  const [currentCity, setCurrentCity] = useState('');
  const [tab, setTab] = useState<'current' | 'monthly'>('current');

  const loadWeather = async (city: string) => {
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

  useEffect(() => { loadWeather('서울'); }, []);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#7B6BA0', Colors.primary]} style={styles.header}>
        <Text style={styles.headerTitle}>날씨</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={cityInput}
            onChangeText={setCityInput}
            placeholder="도시 검색 (예: 수원)"
            placeholderTextColor="rgba(255,255,255,0.6)"
            returnKeyType="search"
            onSubmitEditing={() => { if (cityInput.trim()) loadWeather(cityInput.trim()); }}
          />
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={() => { if (cityInput.trim()) loadWeather(cityInput.trim()); }}
          >
            <Text style={styles.searchBtnText}>검색</Text>
          </TouchableOpacity>
        </View>

        {weather && !loading && (
          <View style={styles.mainWeather}>
            <Text style={styles.cityName}>📍 {currentCity}</Text>
            <Text style={styles.weatherIcon}>{getWeatherEmoji(weather.icon)}</Text>
            <Text style={styles.temp}>{weather.temp}°</Text>
            <Text style={styles.desc}>{weather.description}</Text>
            <View style={styles.weatherMetaRow}>
              <Text style={styles.weatherMeta}>체감 {weather.feels_like}°</Text>
              <Text style={styles.weatherMetaDot}>·</Text>
              <Text style={styles.weatherMeta}>습도 {weather.humidity}%</Text>
              <Text style={styles.weatherMetaDot}>·</Text>
              <Text style={styles.weatherMeta}>바람 {weather.wind_speed}km/h</Text>
            </View>
          </View>
        )}

        {loading && <ActivityIndicator color="#fff" style={{ marginVertical: 40 }} />}

        <View style={styles.tabRow}>
          {['current', 'monthly'].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
              onPress={() => setTab(t as any)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'current' ? '예보' : '월별 평균'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll}>
        {tab === 'current' && weather && (
          <>
            <Text style={styles.sectionLabel}>시간별 예보</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hourlyScroll}>
              {weather.hourly.map((h, i) => (
                <Card key={i} style={styles.hourlyCard}>
                  <Text style={styles.hourlyTime}>{formatHour(h.time)}</Text>
                  <Text style={styles.hourlyIcon}>{getWeatherEmoji(h.icon)}</Text>
                  <Text style={styles.hourlyTemp}>{h.temp}°</Text>
                </Card>
              ))}
            </ScrollView>

            <Text style={styles.sectionLabel}>주간 예보</Text>
            <Card style={styles.dailyCard}>
              {weather.daily.map((d, i) => (
                <View key={i} style={[styles.dailyRow, i > 0 && styles.dailyBorder]}>
                  <Text style={styles.dailyDay}>{i === 0 ? '오늘' : formatDay(d.date)}</Text>
                  <Text style={styles.dailyIcon}>{getWeatherEmoji(d.icon)}</Text>
                  <Text style={styles.dailyPop}>💧 {d.pop}%</Text>
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
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${((MONTHLY_AVG[i] + 5) / 34) * 100}%`,
                          backgroundColor: MONTHLY_AVG[i] > 20 ? Colors.warning : MONTHLY_AVG[i] > 10 ? Colors.primary : Colors.primaryLight,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.monthlyTemp}>{MONTHLY_AVG[i]}°C</Text>
                </View>
              ))}
            </Card>

            <Card style={[styles.monthlyCard, { marginTop: 0, marginBottom: Spacing.xl }]}>
              <Text style={[Typography.bodyBold, { marginBottom: Spacing.md }]}>농업 계절 가이드</Text>
              {[
                { season: '봄 (3-5월)', tip: '파종 및 육묘 시기. 늦서리 주의.', emoji: '🌱' },
                { season: '여름 (6-8월)', tip: '고온다습, 병충해 방제 집중 관리.', emoji: '☀️' },
                { season: '가을 (9-11월)', tip: '주요 수확 시기. 건조 주의.', emoji: '🍂' },
                { season: '겨울 (12-2월)', tip: '시설 보온 및 토양 관리 시기.', emoji: '❄️' },
              ].map((item) => (
                <View key={item.season} style={styles.seasonRow}>
                  <Text style={styles.seasonEmoji}>{item.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={Typography.bodyBold}>{item.season}</Text>
                    <Text style={{ ...Typography.caption, marginTop: 2 }}>{item.tip}</Text>
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingBottom: Spacing.md },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, marginBottom: Spacing.sm },
  searchRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
  },
  searchBtn: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: Radius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBtnText: { color: '#fff', fontWeight: '700' },
  mainWeather: { alignItems: 'center', paddingVertical: Spacing.md },
  cityName: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  weatherIcon: { fontSize: 72, marginVertical: 8 },
  temp: { fontSize: 64, fontWeight: '200', color: '#fff' },
  desc: { color: 'rgba(255,255,255,0.9)', fontSize: 16, marginTop: 4 },
  weatherMetaRow: { flexDirection: 'row', marginTop: 8, gap: 6 },
  weatherMeta: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  weatherMetaDot: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.full,
    padding: 3,
  },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: Radius.full },
  tabBtnActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  tabText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  scroll: { flex: 1 },
  sectionLabel: { ...Typography.label, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  hourlyScroll: { paddingLeft: Spacing.lg },
  hourlyCard: { alignItems: 'center', marginRight: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, minWidth: 72 },
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
  monthlyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  monthlyLabel: { width: 36, fontSize: 13, color: Colors.textSub },
  barTrack: { flex: 1, height: 8, backgroundColor: Colors.border, borderRadius: Radius.full, marginHorizontal: Spacing.sm, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: Radius.full },
  monthlyTemp: { width: 40, textAlign: 'right', fontSize: 13, fontWeight: '600', color: Colors.text },
  seasonRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm, gap: Spacing.sm },
  seasonEmoji: { fontSize: 22, marginTop: 2 },
});
