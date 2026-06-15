import { View } from 'react-native';
import { Tabs } from 'expo-router';
import {
  House, ClipboardText, ChartBar, PencilSimple, DotsThree,
} from 'phosphor-react-native';
import { Colors } from '../../constants/theme';

type TabIconName = 'house' | 'clipboard-text' | 'chart-bar' | 'pencil-simple' | 'dots-three';

const TAB_ICONS = {
  'house': House,
  'clipboard-text': ClipboardText,
  'chart-bar': ChartBar,
  'pencil-simple': PencilSimple,
  'dots-three': DotsThree,
} as const;

function TabIcon({ iconName, focused }: { iconName: TabIconName; focused: boolean }) {
  const Icon = TAB_ICONS[iconName];
  return (
    <View style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={24} color={focused ? Colors.primary : Colors.textLight} weight={focused ? 'fill' : 'regular'} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 84,
          paddingBottom: 24,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarLabel: '홈', tabBarIcon: ({ focused }) => <TabIcon iconName="house" focused={focused} /> }}
      />
      <Tabs.Screen
        name="todo"
        options={{ tabBarLabel: '할 일', tabBarIcon: ({ focused }) => <TabIcon iconName="clipboard-text" focused={focused} /> }}
      />
      <Tabs.Screen
        name="statistics"
        options={{ tabBarLabel: '통계', tabBarIcon: ({ focused }) => <TabIcon iconName="chart-bar" focused={focused} /> }}
      />
      <Tabs.Screen
        name="input"
        options={{ tabBarLabel: '입력', tabBarIcon: ({ focused }) => <TabIcon iconName="pencil-simple" focused={focused} /> }}
      />
      <Tabs.Screen
        name="more"
        options={{ tabBarLabel: '더보기', tabBarIcon: ({ focused }) => <TabIcon iconName="dots-three" focused={focused} /> }}
      />
      <Tabs.Screen
        name="weather"
        options={{ href: null }}
      />
    </Tabs>
  );
}
