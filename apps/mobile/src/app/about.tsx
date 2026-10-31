import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const capabilities = ['AI-assisted itineraries', 'Transactional booking', 'Secure QR vouchers'];

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>PHASE 1.0</Text>
        <Text style={styles.title}>A reliable foundation for every journey.</Text>
        <Text style={styles.body}>
          This mobile shell is wired for typed API access, server-state caching, secure device
          storage, and file-based navigation.
        </Text>
        <View style={styles.list}>
          {capabilities.map((capability) => (
            <View key={capability} style={styles.row}>
              <View style={styles.dot} />
              <Text style={styles.rowText}>{capability}</Text>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, padding: 28, justifyContent: 'center', gap: 20 },
  eyebrow: { color: '#0891b2', fontSize: 12, fontWeight: '800', letterSpacing: 1.6 },
  title: { color: '#0f172a', fontSize: 34, fontWeight: '800', lineHeight: 40 },
  body: { color: '#475569', fontSize: 16, lineHeight: 25 },
  list: { gap: 14, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 9, height: 9, borderRadius: 999, backgroundColor: '#06b6d4' },
  rowText: { color: '#164e63', fontSize: 16, fontWeight: '600' },
});
