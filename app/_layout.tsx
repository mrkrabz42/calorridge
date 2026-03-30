import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useMealsStore } from '../store/mealsStore';
import { useGoalsStore } from '../store/goalsStore';
import { Colors } from '../constants';

export default function RootLayout() {
  const fetchTodayMeals = useMealsStore((s) => s.fetchTodayMeals);
  const fetchGoals = useGoalsStore((s) => s.fetchGoals);

  useEffect(() => {
    fetchGoals();
    fetchTodayMeals();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.bg.primary },
          headerTintColor: Colors.text.primary,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: Colors.bg.primary },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="meal/capture"
          options={{
            title: 'Capture Meal',
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerStyle: { backgroundColor: '#000' },
          }}
        />
        <Stack.Screen
          name="meal/confirm"
          options={{
            title: 'Review Meal',
            headerBackTitle: 'Retake',
          }}
        />
        <Stack.Screen
          name="meal/detail/[id]"
          options={{
            title: 'Meal Details',
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
