import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { API_BASE_URL } from '@/config/api';

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>SMART TRAVEL · VIETNAM</Text>
        </View>
        <Text style={styles.title}>Plan beautifully.{`\n`}Travel confidently.</Text>
        <Text style={styles.body}>
          ADORA brings itinerary planning, verified inventory, booking, and travel vouchers into
          one dependable experience.
        </Text>

        <Link href="/about" asChild>
          <Pressable style={styles.button} accessibilityRole="button">
            <Text style={styles.buttonText}>Explore the foundation</Text>
          </Pressable>
        </Link>

        <Text style={styles.apiLabel}>API: {API_BASE_URL}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ecfeff' },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 24,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#cffafe',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  badgeText: { color: '#0e7490', fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#083344', fontSize: 42, fontWeight: '800', lineHeight: 48 },
  body: { color: '#155e75', fontSize: 17, lineHeight: 27 },
  button: {
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#0e7490',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  apiLabel: { color: '#64748b', fontSize: 12 },
});
