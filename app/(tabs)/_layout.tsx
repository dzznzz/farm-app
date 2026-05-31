import { Tabs } from 'expo-router';
import { Colors } from '../../constants/theme';

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
        options={{ tabBarLabel: '홈', tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }}
      />
      <Tabs.Screen
        name="todo"
        options={{ tabBarLabel: '할 일', tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} /> }}
      />
      <Tabs.Screen
        name="statistics"
        options={{ tabBarLabel: '통계', tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} /> }}
      />
      <Tabs.Screen
        name="input"
        options={{ tabBarLabel: '입력', tabBarIcon: ({ focused }) => <TabIcon emoji="✏️" focused={focused} /> }}
      />
      <Tabs.Screen
        name="more"
        options={{ tabBarLabel: '더보기', tabBarIcon: ({ focused }) => <TabIcon emoji="⋯" focused={focused} /> }}
      />
      <Tabs.Screen
        name="weather"
        options={{ href: null }}
      />
    </Tabs>
  );
}

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}
