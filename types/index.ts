export interface User {
  id: string;
  email: string;
  name: string;
  region: string;
  location_lat?: number;
  location_lng?: number;
}

export interface Farm {
  id: string;
  user_id: string;
  name: string;
  crop_type: string;
  area_sqm?: number;
}

export interface HarvestRecord {
  id: string;
  user_id: string;
  farm_id: string;
  date: string;
  quantity: number;
  unit: string;
  note?: string;
  created_at: string;
}

export interface SaleRecord {
  id: string;
  user_id: string;
  farm_id: string;
  date: string;
  quantity: number;
  price_per_unit: number;
  total_revenue: number;
  buyer?: string;
  created_at: string;
}

export interface HarvestSession {
  id: string;
  user_id: string;
  farm_id: string;
  started_at: string;
  ended_at?: string;
  is_active: boolean;
}

export interface HarvestTrack {
  id: string;
  session_id: string;
  lat: number;
  lng: number;
  recorded_at: string;
}

export interface WeatherData {
  city: string;
  temp: number;
  feels_like: number;
  humidity: number;
  description: string;
  icon: string;
  wind_speed: number;
  hourly: HourlyWeather[];
  daily: DailyWeather[];
}

export interface HourlyWeather {
  time: number;
  temp: number;
  icon: string;
  description: string;
}

export interface DailyWeather {
  date: number;
  temp_min: number;
  temp_max: number;
  icon: string;
  description: string;
  pop: number;
}

export interface DailyStat {
  date: string;
  harvest: number;
  sales: number;
  revenue: number;
  netRevenue: number;
}

export type PeriodType = 'day' | 'week' | 'month' | 'year';

export interface BreakdownItem {
  key: string;
  harvest: number;
  sales: number;
  other: number;
}
