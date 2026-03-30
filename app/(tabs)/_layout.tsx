import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { Colors, Typography } from '../../constants';

function TabIcon({ letter, focused }: { letter: string; focused: boolean }) {
  return (
    <View
      style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: focused ? Colors.brand.primary : 'transparent',
        borderWidth: focused ? 0 : 1.5,
        borderColor: Colors.text.muted,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: '700',
          color: focused ? Colors.text.inverse : Colors.text.muted,
        }}
      >
        {letter}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: Colors.bg.primary },
        headerTintColor: Colors.text.primary,
        headerTitleStyle: { fontWeight: '600', fontSize: Typography.sizes.lg },
        tabBarStyle: {
          backgroundColor: Colors.bg.secondary,
          borderTopColor: Colors.border.default,
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 16,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.brand.primary,
        tabBarInactiveTintColor: Colors.text.muted,
        tabBarLabelStyle: {
          fontSize: Typography.sizes.xs,
          fontWeight: Typography.weights.medium,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon letter="H" focused={focused} />,
          headerTitle: 'CalorRidge',
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: 'Meals',
          tabBarLabel: 'Meals',
          tabBarIcon: ({ focused }) => <TabIcon letter="M" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Workouts',
          tabBarLabel: 'Workouts',
          tabBarIcon: ({ focused }) => <TabIcon letter="W" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="suggestions"
        options={{
          title: 'Suggestions',
          tabBarLabel: 'Suggest',
          tabBarIcon: ({ focused }) => <TabIcon letter="S" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'CalorRidge AI',
          tabBarLabel: 'Chat',
          tabBarIcon: ({ focused }) => <TabIcon letter="C" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          title: 'Goals and Settings',
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
