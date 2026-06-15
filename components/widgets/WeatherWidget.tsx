import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { fetchCurrentWeather, fetchWeatherByCity, getWeatherIconName } from '../../lib/weather';
import { PhIcon } from '../ui/PhIcon';
import { WeatherData } from '../../types';
import { WeatherModal } from '../modals/WeatherModal';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const data = await fetchCurrentWeather(loc.coords.latitude, loc.coords.longitude);
          const name = data.city ?? '현재 위치';
          setWeather({ ...data, city: name });
          setCity(name);
        } else {
          const { lat, lon, name } = await fetchWeatherByCity('서울');
          const data = await fetchCurrentWeather(lat, lon);
          setWeather({ ...data, city: name });
          setCity(name);
        }
      } catch {
        // 날씨 로드 실패 시 위젯 숨김
      }
      setLoading(false);
    })();
  }, []);

  if (!loading && !weather) return null;

  return (
    <>
      <TouchableOpacity style={styles.widget} onPress={() => setShowModal(true)} activeOpacity={0.8}>
        {loading ? (
          <ActivityIndicator color={Colors.primary} size="small" />
        ) : weather ? (
          <View style={styles.content}>
            <PhIcon name={getWeatherIconName(weather.icon) as any} size={36} color={Colors.primary} />
            <View style={styles.info}>
              <View style={styles.tempRow}>
                <Text style={styles.temp}>{weather.temp}°C</Text>
                <Text style={styles.desc}>{weather.description}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                <PhIcon name="map-pin" size={12} color={Colors.textSub} />
                <Text style={styles.city}>{city}</Text>
              </View>
              <Text style={styles.meta}>습도 {weather.humidity}% · 바람 {weather.wind_speed}km/h</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      <WeatherModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        initialWeather={weather}
        initialCity={city}
      />
    </>
  );
}

const styles = StyleSheet.create({
  widget: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 56,
    justifyContent: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  emoji: {},
  info: { flex: 1 },
  tempRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  temp: { fontSize: 22, fontWeight: '800', color: Colors.primaryDark },
  desc: { ...Typography.caption, color: Colors.textSub },
  city: { ...Typography.caption, color: Colors.textSub, marginTop: 2 },
  meta: { ...Typography.caption, color: Colors.textLight, marginTop: 1 },
  arrow: { fontSize: 20, color: Colors.textLight },
});
