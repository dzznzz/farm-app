import { View } from 'react-native';
import {
  Bell,
  Calendar,
  ChartBar,
  ChartLineUp,
  ChatCircle, ChatCircleDots,
  CheckCircle,
  Cherries,
  CircleIcon as PhCircle,
  ClipboardText,
  Clock,
  Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun,
  Coins,
  CurrencyKrw,
  Database,
  DeviceMobile,
  DotsThree,
  Drop,
  Gear,
  Handshake,
  House,
  Info,
  Leaf,
  MapPin,
  MapTrifold,
  Money,
  MoneyWavy,
  Monitor,
  Moon,
  Package,
  PencilSimple,
  Phone,
  Plant,
  Record as PhRecord,
  Robot,
  Snowflake,
  Sun,
  Table,
  Trash,
  TrendUp,
  User,
} from 'phosphor-react-native';

type IconWeight = 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';

const ICONS = {
  'bell': Bell,
  'calendar': Calendar,
  'chart-bar': ChartBar,
  'chart-line-up': ChartLineUp,
  'chat-circle': ChatCircle,
  'chat-circle-dots': ChatCircleDots,
  'check-circle': CheckCircle,
  'circle': PhCircle,
  'clipboard-text': ClipboardText,
  'clock': Clock,
  'cloud': Cloud,
  'cloud-fog': CloudFog,
  'cloud-lightning': CloudLightning,
  'cloud-rain': CloudRain,
  'cloud-snow': CloudSnow,
  'cloud-sun': CloudSun,
  'coins': Coins,
  'currency-krw': CurrencyKrw,
  'database': Database,
  'device-mobile': DeviceMobile,
  'dots-three': DotsThree,
  'drop': Drop,
  'gear': Gear,
  'handshake': Handshake,
  'house': House,
  'info': Info,
  'leaf': Leaf,
  'map-pin': MapPin,
  'map-trifold': MapTrifold,
  'money': MoneyWavy,
  'monitor': Monitor,
  'moon': Moon,
  'package': Package,
  'pencil-simple': PencilSimple,
  'phone': Phone,
  'plant': Plant,
  'record': PhRecord,
  'robot': Robot,
  'snowflake': Snowflake,
  'sun': Sun,
  'table': Table,
  'trash': Trash,
  'trend-up': TrendUp,
  'user': User,
} as const;

export type PhIconName = keyof typeof ICONS | 'blueberry';

interface PhIconProps {
  name: PhIconName;
  size?: number;
  color?: string;
  weight?: IconWeight;
  style?: object;
}

export function PhIcon({ name, size = 24, color = '#000000', weight = 'regular', style }: PhIconProps) {
    let icon = null;
    switch (name) {
      case 'blueberry':
        icon = <Cherries size={size} color={color} weight="duotone" />;
        break;
      case 'package':
        icon = <Package size={size} color={color} weight="fill" />;
        break;
      default: {
        const C = ICONS[name as keyof typeof ICONS];
        icon = C ? <C size={size} color={color} weight={weight} /> : null;
      } 
    };

  if (!icon) return null;
  if (style) return <View style={style}>{icon}</View>;
  return icon;
}
