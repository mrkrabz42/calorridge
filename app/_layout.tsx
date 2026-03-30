import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useActiveProfileStore } from '../store/activeProfileStore';
import { useMealsStore } from '../store/mealsStore';
import { useGoalsStore } from '../store/goalsStore';
import { useWorkoutsStore } from '../store/workoutsStore';
import { useProfileStore } from '../store/profileStore';
import { useChallengeStore } from '../store/challengeStore';
import { usePantryStore } from '../store/pantryStore';
import { useGymStore } from '../store/gymStore';
import { Colors } from '../constants';

export default function RootLayout() {
  const { activeProfileId, isLoaded, loadProfiles } = useActiveProfileStore();

  const fetchTodayMeals = useMealsStore((s) => s.fetchTodayMeals);
  const fetchGoals = useGoalsStore((s) => s.fetchGoals);
  const fetchTodayWorkouts = useWorkoutsStore((s) => s.fetchTodayWorkouts);
  const fetchProfile = useProfileStore((s) => s.fetchProfile);
  const fetchActiveChallenge = useChallengeStore((s) => s.fetchActiveChallenge);
  const fetchPantryItems = usePantryStore((s) => s.fetchItems);
  const checkForActiveSession = useGymStore((s) => s.checkForActiveSession);

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    if (isLoaded && activeProfileId) {
      fetchGoals();
      fetchTodayMeals();
      fetchTodayWorkouts();
      fetchProfile();
      fetchActiveChallenge();
      fetchPantryItems();
      checkForActiveSession();
    }
  }, [isLoaded, activeProfileId]);

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
          name="profile-picker"
          options={{ headerShown: false, animation: 'fade' }}
        />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false, animation: 'fade' }}
        />
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
          options={{ title: 'Review Meal', headerBackTitle: 'Retake' }}
        />
        <Stack.Screen name="meal/detail/[id]" options={{ title: 'Meal Details' }} />
        <Stack.Screen
          name="meal/barcode"
          options={{
            title: 'Scan Barcode',
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="meal/search"
          options={{
            title: 'Search Food',
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen name="meal/portion" options={{ title: 'Portion Size' }} />
        <Stack.Screen name="profile" options={{ title: 'Profile' }} />
        <Stack.Screen
          name="workout/log"
          options={{
            title: 'Log Workout',
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen name="workout/detail/[id]" options={{ title: 'Workout Details' }} />
        <Stack.Screen
          name="challenge/create"
          options={{
            title: 'New Challenge',
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen name="challenge/[id]" options={{ title: 'Challenge' }} />
        <Stack.Screen name="challenge/edit/[id]" options={{ title: 'Edit Challenge' }} />
        <Stack.Screen name="challenge/day/[id]" options={{ title: 'Day Check-in' }} />
        <Stack.Screen name="pantry" options={{ title: 'Pantry' }} />
        <Stack.Screen
          name="gym/session"
          options={{
            title: 'Workout',
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="gym/exercise-picker"
          options={{
            title: 'Add Exercise',
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="gym/session-summary/[id]"
          options={{
            title: 'Workout Summary',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="gym/templates"
          options={{
            title: 'Workout Templates',
          }}
        />
        <Stack.Screen
          name="weight-log"
          options={{ title: 'Weight Log' }}
        />
        <Stack.Screen
          name="analytics"
          options={{ title: 'Analytics' }}
        />
        <Stack.Screen
          name="profile-photo"
          options={{ title: 'Photo and Goals' }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
