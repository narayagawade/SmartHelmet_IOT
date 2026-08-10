import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function FamilyDashboardScreen({ navigation }) {
  const { user, token, logout } = useAuth();
  const [rider, setRider] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchRiderStatus();
    const interval = setInterval(fetchRiderStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchRiderStatus = async () => {
    try {
      const response = await api.get('/api/family/rider-status', token);
      if (response.rider) {
        setRider(response.rider);
      }
    } catch (error) {
      console.error('Fetch rider error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRiderStatus();
    setRefreshing(false);
  };

  const handleUnlink = () => {
    Alert.alert('Unlink Rider', 'Are you sure you want to unlink from this rider?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unlink',
        style: 'destructive',
        onPress: async () => {
          await api.post('/api/family/unlink', {}, token);
          setRider(null);
        },
      },
    ]);
  };

  const getAlertInfo = (type) => {
    switch (type) {
      case 'fall': return { text: 'ACCIDENT DETECTED', color: '#ef4444', icon: '🚨' };
      case 'alcohol': return { text: 'ALCOHOL DETECTED', color: '#f59e0b', icon: '🍷' };
      case 'drowsiness': return { text: 'DROWSINESS DETECTED', color: '#a855f7', icon: '😴' };
      default: return { text: 'UNKNOWN ALERT', color: '#64748b', icon: '⚠️' };
    }
  };

  if (!rider) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Family Dashboard</Text>
          <TouchableOpacity onPress={logout}>
            <Text style={styles.logout}>Logout</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔗</Text>
          <Text style={styles.emptyTitle}>Not Linked to Any Rider</Text>
          <Text style={styles.emptyText}>Ask your rider for a linking code to get started.</Text>
          <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('LinkRider')}>
            <Text style={styles.linkButtonText}>LINK TO RIDER</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const sensorStatus = rider.sensorStatus || {};
  const alertInfo = rider.currentAlert?.active ? getAlertInfo(rider.currentAlert.type) : null;

  const timeSince = (date) => {
    if (!date) return 'No data';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Monitoring</Text>
          <Text style={styles.riderName}>{rider.username}</Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Active Alert */}
      {alertInfo && (
        <View style={[styles.alertCard, { borderColor: alertInfo.color }]}>
          <Text style={styles.alertIcon}>{alertInfo.icon}</Text>
          <Text style={[styles.alertText, { color: alertInfo.color }]}>{alertInfo.text}</Text>
          <Text style={styles.alertTime}>{timeSince(rider.currentAlert.timestamp)}</Text>
          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => navigation.navigate('Map', { location: rider.currentAlert.location })}
          >
            <Text style={styles.mapButtonText}>VIEW LOCATION ON MAP</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Rider Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Rider Info</Text>
        <InfoRow label="Vehicle" value={rider.vehicle || 'Not set'} />
        <InfoRow label="Email" value={rider.email} />
        <InfoRow label="Last Update" value={timeSince(sensorStatus.lastUpdate)} />
      </View>

      {/* Sensor Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sensor Status</Text>
        <View style={styles.sensorGrid}>
          <SensorStatus label="Helmet" active={sensorStatus.helmetOn} activeText="ON" inactiveText="OFF" />
          <SensorStatus label="Alcohol" active={sensorStatus.alcohol > 1500} activeText="DETECTED" inactiveText="NORMAL" warning />
          <SensorStatus label="Drowsy" active={sensorStatus.drowsy} activeText="DROWSY" inactiveText="NORMAL" warning />
          <SensorStatus label="GPS" active={sensorStatus.gpsActive} activeText="ACTIVE" inactiveText="INACTIVE" />
        </View>
      </View>

      {/* Map Button */}
      <TouchableOpacity style={styles.fullMapButton} onPress={() => navigation.navigate('Map', { location: rider.currentAlert?.location })}>
        <Text style={styles.fullMapButtonText}>VIEW ON MAP</Text>
      </TouchableOpacity>

      {/* Unlink */}
      <TouchableOpacity style={styles.unlinkButton} onPress={handleUnlink}>
        <Text style={styles.unlinkText}>Unlink from Rider</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function SensorStatus({ label, active, activeText, inactiveText, warning }) {
  const isActive = warning ? active : !active;
  return (
    <View style={styles.sensorBox}>
      <Text style={styles.sensorLabel}>{label}</Text>
      <Text style={[styles.sensorValue, { color: active ? (warning ? '#ef4444' : '#22c55e') : '#64748b' }]}>
        {active ? activeText : inactiveText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50 },
  greeting: { fontSize: 14, color: '#94a3b8' },
  riderName: { fontSize: 24, fontWeight: '800', color: '#fff' },
  logout: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
  card: { backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 20, marginBottom: 16, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#94a3b8', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  infoLabel: { color: '#94a3b8', fontSize: 14 },
  infoValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  sensorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sensorBox: { width: '48%', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 8 },
  sensorLabel: { fontSize: 12, color: '#94a3b8', marginBottom: 6 },
  sensorValue: { fontSize: 14, fontWeight: '800' },
  alertCard: { backgroundColor: 'rgba(239,68,68,0.15)', margin: 20, borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 2 },
  alertIcon: { fontSize: 40 },
  alertText: { fontSize: 18, fontWeight: '900', marginTop: 8 },
  alertTime: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  mapButton: { backgroundColor: '#00f2fe', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, marginTop: 16 },
  mapButtonText: { color: '#0f172a', fontWeight: '800', fontSize: 14 },
  fullMapButton: { backgroundColor: 'rgba(0,242,254,0.15)', marginHorizontal: 20, marginBottom: 16, borderRadius: 12, padding: 16, alignItems: 'center' },
  fullMapButtonText: { color: '#00f2fe', fontWeight: '700', fontSize: 15 },
  unlinkButton: { marginHorizontal: 20, marginBottom: 40, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  unlinkText: { color: '#ef4444', fontWeight: '600', fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 24 },
  linkButton: { backgroundColor: '#00f2fe', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 },
  linkButtonText: { color: '#0f172a', fontWeight: '800', fontSize: 15 },
});
