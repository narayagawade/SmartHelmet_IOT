import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, RefreshControl } from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function RiderDashboardScreen({ navigation }) {
  const { user, token, logout } = useAuth();
  const [sensorData, setSensorData] = useState(null);
  const [familyCount, setFamilyCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [alertActive, setAlertActive] = useState(false);
  const [alertType, setAlertType] = useState('');
  const [countdown, setCountdown] = useState(120);
  const countdownRef = useRef(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (alertActive && countdown > 0) {
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            handleNotSafe();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(countdownRef.current);
  }, [alertActive]);

  const fetchData = async () => {
    try {
      const [statusRes, familyRes, alertRes] = await Promise.all([
        api.get('/api/family/rider-status', token),
        api.get('/api/family/linked-family', token),
        api.get(`/api/alert/check-alert/${user._id}`, token),
      ]);

      if (statusRes.rider) setSensorData(statusRes.rider.sensorStatus);
      if (familyRes.family) setFamilyCount(familyRes.family.length);

      if (alertRes.hasAlert && !alertActive) {
        setAlertActive(true);
        setAlertType(alertRes.alert.type);
        setCountdown(120);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleSafe = async () => {
    clearInterval(countdownRef.current);
    await api.post('/api/alert/safe', { userId: user._id }, token);
    setAlertActive(false);
    Alert.alert('Alert Cancelled', 'Your family will not be notified.');
  };

  const handleNotSafe = async () => {
    clearInterval(countdownRef.current);
    await api.post('/api/alert/not-safe', { userId: user._id }, token);
    setAlertActive(false);
    Alert.alert('Alert Sent', 'Your family has been notified.');
  };

  const getSensorStatus = (value, threshold, invert = false) => {
    if (value === undefined || value === null) return { text: 'UNKNOWN', color: '#64748b' };
    const active = invert ? value < threshold : value > threshold;
    return active
      ? { text: 'WARNING', color: '#ef4444' }
      : { text: 'NORMAL', color: '#22c55e' };
  };

  const helmetStatus = sensorData?.helmetOn
    ? { text: 'ON', color: '#22c55e' }
    : { text: 'OFF', color: '#ef4444' };

  const drowsyStatus = sensorData?.drowsy
    ? { text: 'DROWSY', color: '#ef4444' }
    : { text: 'NORMAL', color: '#22c55e' };

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {/* Alert Popup */}
      {alertActive && (
        <View style={styles.alertCard}>
          <Text style={styles.alertTitle}>EMERGENCY DETECTED</Text>
          <Text style={styles.alertType}>{alertType.toUpperCase()}</Text>
          <Text style={styles.alertTimer}>{countdown}s</Text>
          <Text style={styles.alertSubtitle}>Emergency help will be sent automatically</Text>
          <View style={styles.alertButtons}>
            <TouchableOpacity style={styles.safeButton} onPress={handleSafe}>
              <Text style={styles.safeButtonText}>I'M SAFE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.notSafeButton} onPress={handleNotSafe}>
              <Text style={styles.notSafeButtonText}>SEND NOW</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.username}</Text>
          <Text style={styles.status}>Active Protection</Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Helmet Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Helmet Status</Text>
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Helmet</Text>
            <Text style={[styles.statusValue, { color: helmetStatus.color }]}>{helmetStatus.text}</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Drowsiness</Text>
            <Text style={[styles.statusValue, { color: drowsyStatus.color }]}>{drowsyStatus.text}</Text>
          </View>
        </View>
      </View>

      {/* Sensor Diagnostics */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Live Sensor Diagnostics</Text>
        <View style={styles.sensorGrid}>
          <SensorBox icon="activity" label="Fall" status={getSensorStatus(sensorData?.fall, 0)} />
          <SensorBox icon="droplet" label="Alcohol" status={getSensorStatus(sensorData?.alcohol, 1500)} />
          <SensorBox icon="eye" label="Drowsiness" status={drowsyStatus} />
          <SensorBox icon="geo" label="GPS" status={sensorData?.gpsActive ? { text: 'ACTIVE', color: '#22c55e' } : { text: 'INACTIVE', color: '#ef4444' }} />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Actions</Text>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('FamilyManagement')}>
          <Text style={styles.actionText}>Family Management ({familyCount} linked)</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function SensorBox({ label, status }) {
  return (
    <View style={styles.sensorBox}>
      <Text style={styles.sensorLabel}>{label}</Text>
      <Text style={[styles.sensorStatus, { color: status.color }]}>{status.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50 },
  greeting: { fontSize: 24, fontWeight: '800', color: '#fff' },
  status: { fontSize: 13, color: '#22c55e', marginTop: 4 },
  logout: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
  card: { backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 20, marginBottom: 16, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#94a3b8', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  statusRow: { flexDirection: 'row', gap: 16 },
  statusItem: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 16, alignItems: 'center' },
  statusLabel: { fontSize: 12, color: '#94a3b8', marginBottom: 4 },
  statusValue: { fontSize: 16, fontWeight: '800' },
  sensorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sensorBox: { width: '48%', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 8 },
  sensorLabel: { fontSize: 13, color: '#94a3b8', marginBottom: 6 },
  sensorStatus: { fontSize: 14, fontWeight: '800' },
  actionButton: { backgroundColor: 'rgba(0,242,254,0.15)', borderRadius: 12, padding: 16, alignItems: 'center' },
  actionText: { color: '#00f2fe', fontWeight: '700', fontSize: 15 },
  alertCard: { backgroundColor: '#991b1b', margin: 20, borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 2, borderColor: '#ef4444' },
  alertTitle: { fontSize: 14, color: '#fca5a5', fontWeight: '700', letterSpacing: 2 },
  alertType: { fontSize: 28, fontWeight: '900', color: '#fff', marginTop: 8 },
  alertTimer: { fontSize: 48, fontWeight: '900', color: '#fbbf24', marginTop: 12 },
  alertSubtitle: { fontSize: 13, color: '#fca5a5', marginTop: 8 },
  alertButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  safeButton: { backgroundColor: '#22c55e', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24 },
  safeButtonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  notSafeButton: { backgroundColor: '#ef4444', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24 },
  notSafeButtonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
