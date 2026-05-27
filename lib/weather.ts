import { WeatherData, HourlyWeather, DailyWeather } from '../types';

const API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

const WEATHER_ICONS: Record<string, string> = {
  '01d': '☀️', '01n': '🌙',
  '02d': '⛅', '02n': '⛅',
  '03d': '☁️', '03n': '☁️',
  '04d': '☁️', '04n': '☁️',
  '09d': '🌧️', '09n': '🌧️',
  '10d': '🌦️', '10n': '🌦️',
  '11d': '⛈️', '11n': '⛈️',
  '13d': '❄️', '13n': '❄️',
  '50d': '🌫️', '50n': '🌫️',
};

export function getWeatherEmoji(icon: string): string {
  return WEATHER_ICONS[icon] ?? '🌤️';
}

export async function fetchCurrentWeather(lat: number, lon: number): Promise<WeatherData> {
  const [currentRes, forecastRes] = await Promise.all([
    fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=kr`),
    fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=kr`),
  ]);

  if (!currentRes.ok || !forecastRes.ok) {
    throw new Error('날씨 정보를 불러오는데 실패했습니다.');
  }

  const current = await currentRes.json();
  const forecast = await forecastRes.json();

  const hourly: HourlyWeather[] = forecast.list.slice(0, 8).map((item: any) => ({
    time: item.dt,
    temp: Math.round(item.main.temp),
    icon: item.weather[0].icon,
    description: item.weather[0].description,
  }));

  const dailyMap: Record<string, any[]> = {};
  forecast.list.forEach((item: any) => {
    const date = new Date(item.dt * 1000).toISOString().split('T')[0];
    if (!dailyMap[date]) dailyMap[date] = [];
    dailyMap[date].push(item);
  });

  const daily: DailyWeather[] = Object.entries(dailyMap)
    .slice(0, 7)
    .map(([, items]) => ({
      date: items[0].dt,
      temp_min: Math.round(Math.min(...items.map((i: any) => i.main.temp_min))),
      temp_max: Math.round(Math.max(...items.map((i: any) => i.main.temp_max))),
      icon: items[Math.floor(items.length / 2)].weather[0].icon,
      description: items[Math.floor(items.length / 2)].weather[0].description,
      pop: Math.round(Math.max(...items.map((i: any) => i.pop ?? 0)) * 100),
    }));

  return {
    city: current.name,
    temp: Math.round(current.main.temp),
    feels_like: Math.round(current.main.feels_like),
    humidity: current.main.humidity,
    description: current.weather[0].description,
    icon: current.weather[0].icon,
    wind_speed: Math.round(current.wind.speed * 3.6),
    hourly,
    daily,
  };
}

export async function fetchWeatherByCity(city: string): Promise<{ lat: number; lon: number; name: string }> {
  const res = await fetch(
    `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=5&appid=${API_KEY}`
  );
  const data = await res.json();
  if (!data.length) throw new Error('도시를 찾을 수 없습니다.');
  return { lat: data[0].lat, lon: data[0].lon, name: data[0].local_names?.ko ?? data[0].name };
}
