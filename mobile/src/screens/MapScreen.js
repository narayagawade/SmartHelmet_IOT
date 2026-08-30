import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

export default function MapScreen({ route }) {
  const { location } = route.params || {};

  // Parse location URL or use default
  let latitude = 28.6139;
  let longitude = 77.2090;

  if (location && location.includes('maps.google.com')) {
    const latMatch = location.match(/q=([-\d.]+),([-\d.]+)/);
    if (latMatch) {
      latitude = parseFloat(latMatch[1]);
      longitude = parseFloat(latMatch[2]);
    }
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={false}
      >
        <Marker
          coordinate={{ latitude, longitude }}
          title="Rider Location"
          description="Last known position"
          pinColor="#ef4444"
        />
      </MapView>

      <View style={styles.infoBar}>
        <Text style={styles.infoText}>Rider's Last Known Location</Text>
        <Text style={styles.coords}>{latitude.toFixed(4)}, {longitude.toFixed(4)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  map: { flex: 1 },
  infoBar: { backgroundColor: 'rgba(15,23,42,0.95)', padding: 20, alignItems: 'center' },
  infoText: { color: '#94a3b8', fontSize: 13 },
  coords: { color: '#00f2fe', fontSize: 16, fontWeight: '700', marginTop: 4 },
});
