import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { profileManager } from '../services/profileManager';
import { Colors } from '../constants';

export default function Index() {
  const [destination, setDestination] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const activeId = await profileManager.getActiveProfileId();
        if (activeId) {
          setDestination('/(tabs)/dashboard');
          return;
        }

        const profiles = await profileManager.getProfiles();
        if (profiles.length > 0) {
          setDestination('/profile-picker');
        } else {
          setDestination('/onboarding');
        }
      } catch {
        setDestination('/onboarding');
      }
    })();
  }, []);

  if (!destination) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.brand.primary} />
      </View>
    );
  }

  return <Redirect href={destination as any} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
