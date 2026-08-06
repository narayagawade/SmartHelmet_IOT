import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

const API_URL = 'http://192.168.1.104:3000';

function apiPost(endpoint, data, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${API_URL}${endpoint}`, { method: 'POST', headers, body: JSON.stringify(data) }).then(r => r.json());
}

function apiGet(endpoint, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${API_URL}${endpoint}`, { method: 'GET', headers }).then(r => r.json());
}

export default function App() {
  const [screen, setScreen] = useState('loading');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  // Auto-login: check stored session on startup
  useEffect(() => {
    const checkSession = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('authToken');
        const storedUser = await AsyncStorage.getItem('user');
        if (storedToken && storedUser) {
          const parsed = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsed);
          setScreen('dashboard');
        } else {
          setScreen('login');
        }
      } catch (e) {
        setScreen('login');
      }
    };
    setTimeout(checkSession, 1500);
  }, []);

  const handleLogin = (t, u) => {
    setToken(t);
    setUser(u);
    AsyncStorage.setItem('authToken', t);
    AsyncStorage.setItem('user', JSON.stringify(u));
    setScreen('dashboard');
  };

  const handleLogout = () => {
    apiPost('/api/auth/logout', {}, token).catch(() => {});
    setToken(null);
    setUser(null);
    AsyncStorage.removeItem('authToken');
    AsyncStorage.removeItem('user');
    setScreen('login');
  };

  if (screen === 'loading') {
    return (
      <View style={styles.center}>
        <StatusBar style="light" />
        <Text style={styles.logo}>SMART{'\n'}HELMET</Text>
        <ActivityIndicator size="large" color="#00f2fe" style={{ marginTop: 30 }} />
      </View>
    );
  }

  if (screen === 'login') {
    return <LoginScreen onLogin={handleLogin} onSignup={() => setScreen('signup')} />;
  }

  if (screen === 'signup') {
    return <SignupScreen onBack={() => setScreen('login')} onSignup={handleLogin} />;
  }

  if (screen === 'dashboard' && user) {
    return user.role === 'rider'
      ? <RiderDashboard user={user} token={token} onLogout={handleLogout} />
      : <FamilyDashboard user={user} token={token} onLogout={handleLogout} />;
  }

  return null;
}

// ==================== LOGIN ====================
function LoginScreen({ onLogin, onSignup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Error', 'Fill all fields'); return; }
    setLoading(true);
    try {
      const res = await apiPost('/api/auth/login', { email, password });
      if (res.error) { Alert.alert('Error', res.error); setLoading(false); return; }
      onLogin(res.token, res.user);
    } catch (e) { Alert.alert('Error', 'Server not reachable'); }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.formContainer}>
        <Text style={styles.logo}>SMART{'\n'}HELMET</Text>
        <Text style={styles.subtitle}>Ride Safe, Stay Connected</Text>
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#64748b" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#64748b" value={password} onChangeText={setPassword} secureTextEntry />
        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'LOGIN'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onSignup}>
          <Text style={styles.link}>Don't have an account? <Text style={styles.linkBold}>Sign Up</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ==================== SIGNUP ====================
function SignupScreen({ onBack, onSignup }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('rider');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!username || !email || !password) { Alert.alert('Error', 'Fill required fields'); return; }
    setLoading(true);
    try {
      const res = await apiPost('/api/auth/signup-direct', { email, password, username, phone, vehicle, role });
      if (res.error) { Alert.alert('Error', res.error); setLoading(false); return; }
      onSignup(res.token, res.user);
    } catch (e) { Alert.alert('Error', 'Server not reachable'); }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.formContainer}>
        <TouchableOpacity onPress={onBack}><Text style={styles.back}>Back to Login</Text></TouchableOpacity>
        <Text style={styles.title}>CREATE ACCOUNT</Text>
        <View style={styles.roleContainer}>
          <TouchableOpacity style={[styles.roleButton, role === 'rider' && styles.roleActive]} onPress={() => setRole('rider')}>
            <Text style={[styles.roleText, role === 'rider' && styles.roleTextActive]}>RIDER</Text>
            <Text style={[styles.roleDesc, role === 'rider' && styles.roleDescActive]}>I ride a bike</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.roleButton, role === 'family' && styles.roleActive]} onPress={() => setRole('family')}>
            <Text style={[styles.roleText, role === 'family' && styles.roleTextActive]}>FAMILY</Text>
            <Text style={[styles.roleDesc, role === 'family' && styles.roleDescActive]}>I monitor a rider</Text>
          </TouchableOpacity>
        </View>
        <TextInput style={styles.input} placeholder="Full Name *" placeholderTextColor="#64748b" value={username} onChangeText={setUsername} />
        <TextInput style={styles.input} placeholder="Email *" placeholderTextColor="#64748b" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Phone" placeholderTextColor="#64748b" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        {role === 'rider' && <TextInput style={styles.input} placeholder="Vehicle Number" placeholderTextColor="#64748b" value={vehicle} onChangeText={setVehicle} autoCapitalize="characters" />}
        <TextInput style={styles.input} placeholder="Password *" placeholderTextColor="#64748b" value={password} onChangeText={setPassword} secureTextEntry />
        <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Creating...' : 'SIGN UP'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ==================== RIDER DASHBOARD ====================
function RiderDashboard({ user, token, onLogout }) {
  const [sensor, setSensor] = useState(null);
  const [familyCount, setFamilyCount] = useState(0);
  const [familyList, setFamilyList] = useState([]);
  const [linkCode, setLinkCode] = useState(null);
  const [tab, setTab] = useState('dashboard');

  // Fall Alert Countdown Logic
  const [activeAlert, setActiveAlert] = useState(null);
  const [countdown, setCountdown] = useState(-1);
  const countdownTimerRef = React.useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiGet('/api/alert/check-alert/' + user._id, token);
        // Only trigger countdown for 'fall' type
        if (res.hasAlert && res.alert && res.alert.type === 'fall') {
          if (!activeAlert) {
            setActiveAlert(res.alert);
            setCountdown(10);
          }
        } else {
          setActiveAlert(null);
          setCountdown(-1);
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        }

        const s = await apiGet('/api/family/rider-status', token);
        if (s.rider) setSensor(s.rider.sensorStatus);
        const f = await apiGet('/api/family/linked-family', token);
        if (f.family) { setFamilyCount(f.family.length); setFamilyList(f.family); }
      } catch (e) {}
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [activeAlert]);

  useEffect(() => {
    if (countdown > 0) {
      countdownTimerRef.current = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0 && activeAlert) {
      handleAutoSend();
    }
    return () => clearTimeout(countdownTimerRef.current);
  }, [countdown, activeAlert]);

  const handleSafe = async () => {
    try {
      await apiPost('/api/alert/safe', { userId: user._id }, token);
      setActiveAlert(null);
      setCountdown(-1);
      Alert.alert('Safe', 'Alert cancelled. Family will not be notified.');
    } catch (e) {
      Alert.alert('Error', 'Failed to cancel alert');
    }
  };

  const handleAutoSend = async () => {
    try {
      await apiPost('/api/alert/not-safe', { userId: user._id }, token);
      setActiveAlert(null);
      setCountdown(-1);
      Alert.alert('Alert Sent', 'Emergency alert has been sent to your family.');
    } catch (e) {}
  };

  const generateCode = async () => {
    try {
      const res = await apiPost('/api/family/generate-code', {}, token);
      if (res.code) { setLinkCode(res.code); Alert.alert('Linking Code', `Share this code with family:\n\n${res.code}\n\nExpires in 24 hours.`); }
    } catch (e) { Alert.alert('Error', 'Failed to generate code'); }
  };

  const helmetOn = sensor?.helmetOn;
  const alcohol = sensor?.alcohol > 1500;
  const drowsy = sensor?.drowsy;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user.username}</Text>
          <Text style={styles.statusGreen}>Active Protection</Text>
        </View>
        <TouchableOpacity onPress={onLogout}><Text style={styles.logout}>Logout</Text></TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, tab === 'dashboard' && styles.tabActive]} onPress={() => setTab('dashboard')}>
          <Text style={[styles.tabText, tab === 'dashboard' && styles.tabTextActive]}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'family' && styles.tabActive]} onPress={() => setTab('family')}>
          <Text style={[styles.tabText, tab === 'family' && styles.tabTextActive]}>Family ({familyCount})</Text>
        </TouchableOpacity>
      </View>

      {tab === 'dashboard' && (
        <ScrollView style={styles.scrollArea}>
          {activeAlert && (
            <View style={styles.emergencyCardRider}>
              <Text style={styles.emergencyIcon}>🚨</Text>
              <Text style={styles.emergencyTitleRider}>{activeAlert.type?.toUpperCase()} DETECTED!</Text>
              <Text style={styles.emergencySub}>Notifying family in</Text>
              <Text style={styles.countdownText}>{countdown > 0 ? countdown : 0}s</Text>

              <TouchableOpacity style={styles.safeButton} onPress={handleSafe}>
                <Text style={styles.safeButtonText}>I AM SAFE (CANCEL)</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.notSafeButton} onPress={handleAutoSend}>
                <Text style={styles.notSafeButtonText}>SEND NOW</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>HELMET STATUS</Text>
            <View style={styles.row}>
              <StatusBox label="Helmet" value={helmetOn ? 'ON' : 'OFF'} ok={helmetOn} />
              <StatusBox label="Alcohol" value={alcohol ? 'DETECTED' : 'NORMAL'} ok={!alcohol} />
              <StatusBox label="Drowsy" value={drowsy ? 'YES' : 'NO'} ok={!drowsy} />
              <StatusBox label="GPS" value={sensor?.gpsActive ? 'ACTIVE' : 'OFF'} ok={sensor?.gpsActive} />
            </View>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>LINKED FAMILY</Text>
            <Text style={{ color: '#fff', fontSize: 36, fontWeight: '900', marginTop: 10 }}>{familyCount}</Text>
            <Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>members monitoring you</Text>
          </View>
        </ScrollView>
      )}

      {tab === 'family' && (
        <ScrollView style={styles.scrollArea}>
          <TouchableOpacity style={styles.codeButton} onPress={generateCode}>
            <Text style={styles.codeButtonText}>GENERATE LINKING CODE</Text>
          </TouchableOpacity>

          {linkCode && (
            <View style={styles.codeCard}>
              <Text style={styles.codeLabel}>Your Linking Code</Text>
              <Text style={styles.code}>{linkCode}</Text>
              <Text style={styles.codeExpiry}>Expires in 24 hours</Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Linked Family ({familyList.length})</Text>
          {familyList.length === 0 ? (
            <View style={styles.card}>
              <Text style={{ color: '#64748b', textAlign: 'center' }}>No family members linked yet.</Text>
              <Text style={{ color: '#475569', textAlign: 'center', marginTop: 8, fontSize: 13 }}>Share your linking code with family.</Text>
            </View>
          ) : familyList.map((f) => (
            <View key={f._id} style={styles.familyCard}>
              <View>
                <Text style={styles.familyName}>{f.username}</Text>
                <Text style={styles.familyEmail}>{f.email}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ==================== ALERT HELPERS ====================
function getAlertConfig(type) {
  switch (type) {
    case 'fall':
      return { icon: '\u{1F6A8}', color: '#ef4444', bgColor: 'rgba(239,68,68,0.15)', borderColor: '#ef4444', label: 'ACCIDENT DETECTED' };
    case 'alcohol':
      return { icon: '\u{1F377}', color: '#f97316', bgColor: 'rgba(249,115,22,0.15)', borderColor: '#f97316', label: 'ALCOHOL DETECTED' };
    case 'drowsiness':
      return { icon: '\u{1F634}', color: '#a855f7', bgColor: 'rgba(168,85,247,0.15)', borderColor: '#a855f7', label: 'DROWSINESS DETECTED' };
    default:
      return { icon: '\u26A0\uFE0F', color: '#ef4444', bgColor: 'rgba(239,68,68,0.15)', borderColor: '#ef4444', label: 'EMERGENCY ALERT' };
  }
}

// ==================== FAMILY DASHBOARD ====================
function FamilyDashboard({ user, token, onLogout }) {
  const [rider, setRider] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const [linkCode, setLinkCode] = useState('');
  const [alertHistory, setAlertHistory] = useState([]);
  const [showEmergencyOverlay, setShowEmergencyOverlay] = useState(false);
  const [currentAlertConfig, setCurrentAlertConfig] = useState(null);
  const prevAlertActiveRef = React.useRef(false);
  const prevConfirmedRef = React.useRef(false);

  useEffect(() => {
    const fetchRider = async () => {
      try {
        const r = await apiGet('/api/family/rider-status', token);
        if (r.rider) {
          setRider(r.rider);
          if (r.rider.alertHistory) setAlertHistory(r.rider.alertHistory);

          const hasActiveAlert = r.rider.currentAlert?.active;
          const isConfirmed = r.rider.currentAlert?.confirmed;

          // Only show overlay if the alert is active and confirmed (immediate for alcohol/drowsy, 10s delay for fall)
          if (hasActiveAlert && isConfirmed && !prevConfirmedRef.current) {
            const config = getAlertConfig(r.rider.currentAlert.type);
            setCurrentAlertConfig({ ...config, alert: r.rider.currentAlert });
            setShowEmergencyOverlay(true);
            setTab('dashboard');
          }
          prevAlertActiveRef.current = hasActiveAlert;
          prevConfirmedRef.current = !!isConfirmed;
        }
      } catch (e) {}
    };
    fetchRider();
    const interval = setInterval(fetchRider, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleLink = async () => {
    if (linkCode.length !== 6) { Alert.alert('Error', 'Enter 6-digit code'); return; }
    try {
      const res = await apiPost('/api/family/link', { code: linkCode }, token);
      if (res.error) { Alert.alert('Error', res.error); return; }
      Alert.alert('Success', `Linked to ${res.rider.username}!`);
      setTab('dashboard');
      const r = await apiGet('/api/family/rider-status', token);
      if (r.rider) { setRider(r.rider); if (r.rider.alertHistory) setAlertHistory(r.rider.alertHistory); }
    } catch (e) { Alert.alert('Error', 'Failed to link'); }
  };

  const handleUnlink = () => {
    Alert.alert('Unlink', 'Remove this rider?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unlink', style: 'destructive', onPress: async () => {
        await apiPost('/api/family/unlink', {}, token);
        setRider(null);
      }},
    ]);
  };

  const handleDismiss = async (alertId) => {
    Alert.alert('Delete Alert', 'Delete this alert from history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const res = await apiPost('/api/alert/dismiss', { userId: rider._id, alertId: alertId }, token);
          if (res.alertHistory) {
            setAlertHistory(res.alertHistory);
          }
        } catch (e) {
          Alert.alert('Error', 'Failed to delete');
        }
      }},
    ]);
  };

  const openMap = (location) => {
    if (location && location.includes('maps.google.com')) {
      const latMatch = location.match(/q=([-\d.]+),([-\d.]+)/);
      if (latMatch) {
        const lat = latMatch[1];
        const lng = latMatch[2];
        const url = `https://www.google.com/maps?q=${lat},${lng}`;
        Linking.openURL(url).catch(() => {
          const geoUrl = `geo:${lat},${lng}?q=${lat},${lng}`;
          Linking.openURL(geoUrl).catch(() => {
            Alert.alert('Error', 'Cannot open maps on this device');
          });
        });
      }
    } else {
      Alert.alert('GPS Not Available', 'GPS satellite signal not received yet. Go outdoors and wait 30 seconds for GPS lock.');
    }
  };

  const timeSince = (date) => {
    if (!date) return 'Unknown';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const renderAlertCard = (alert) => {
    if (!alert?.active) return null;
    const cfg = getAlertConfig(alert.type);
    return (
      <View style={[styles.alertCard, { backgroundColor: cfg.bgColor, borderColor: cfg.borderColor }]}>
        <Text style={styles.alertIcon}>{cfg.icon}</Text>
        <Text style={[styles.alertText, { color: cfg.color }]}>{cfg.label}</Text>
        <Text style={{ color: '#fca5a5', marginTop: 6 }}>{timeSince(alert.timestamp)}</Text>
        <View style={styles.alertButtons}>
          <TouchableOpacity style={styles.viewMapButton} onPress={() => openMap(alert.location)}>
            <Text style={styles.viewMapButtonText}>VIEW LOCATION</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderHistoryItem = (alert, realIndex) => {
    const cfg = getAlertConfig(alert.type);
    return (
      <View key={realIndex} style={[styles.historyCard, { borderLeftColor: cfg.borderColor, borderLeftWidth: 4 }]}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyIcon}>{cfg.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.historyType, { color: cfg.color }]}>{cfg.label}</Text>
            <Text style={styles.historyTime}>{timeSince(alert.timestamp)}</Text>
          </View>
          <TouchableOpacity style={styles.dismissButton} onPress={() => handleDismiss(alert._id)}>
            <Text style={styles.dismissButtonText}>DELETE</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.historyMapLink} onPress={() => openMap(alert.location)}>
          <Text style={styles.historyMapText}>Tap to open location on map</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {showEmergencyOverlay && currentAlertConfig && (
        <View style={styles.emergencyOverlay}>
          <View style={[styles.emergencyCard, { borderColor: currentAlertConfig.borderColor }]}>
            <Text style={styles.emergencyIcon}>{currentAlertConfig.icon}</Text>
            <Text style={[styles.emergencyTitle, { color: currentAlertConfig.color }]}>{currentAlertConfig.label}</Text>
            <Text style={styles.emergencyRider}>{rider?.username || 'Rider'}</Text>
            <Text style={styles.emergencyTime}>{timeSince(currentAlertConfig.alert?.timestamp)}</Text>
            <TouchableOpacity
              style={[styles.emergencyMapButton, { backgroundColor: currentAlertConfig.borderColor }]}
              onPress={() => {
                setShowEmergencyOverlay(false);
                openMap(currentAlertConfig.alert?.location);
              }}
            >
              <Text style={styles.emergencyMapButtonText}>VIEW LOCATION ON MAP</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.emergencyDismiss} onPress={() => setShowEmergencyOverlay(false)}>
              <Text style={styles.emergencyDismissText}>DISMISS</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Family Dashboard</Text>
          <Text style={{ color: '#94a3b8', fontSize: 13 }}>{user.username}</Text>
        </View>
        <TouchableOpacity onPress={onLogout}><Text style={styles.logout}>Logout</Text></TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, tab === 'dashboard' && styles.tabActive]} onPress={() => setTab('dashboard')}>
          <Text style={[styles.tabText, tab === 'dashboard' && styles.tabTextActive]}>Status</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'history' && styles.tabActive]} onPress={() => setTab('history')}>
          <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>History ({alertHistory.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'link' && styles.tabActive]} onPress={() => setTab('link')}>
          <Text style={[styles.tabText, tab === 'link' && styles.tabTextActive]}>{rider ? 'Settings' : 'Link'}</Text>
        </TouchableOpacity>
      </View>

      {tab === 'dashboard' && !rider && (
        <ScrollView style={styles.scrollArea}>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔗</Text>
            <Text style={styles.emptyTitle}>Not Linked to Any Rider</Text>
            <Text style={styles.emptyText}>Ask your rider for a 6-digit linking code.</Text>
            <TouchableOpacity style={styles.button} onPress={() => setTab('link')}>
              <Text style={styles.buttonText}>LINK TO RIDER</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {tab === 'dashboard' && rider && (
        <ScrollView style={styles.scrollArea}>
          {renderAlertCard(rider.currentAlert)}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>RIDER INFO</Text>
            <InfoRow label="Name" value={rider.username} />
            <InfoRow label="Vehicle" value={rider.vehicle || 'Not set'} />
            <InfoRow label="Email" value={rider.email} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>SENSOR STATUS</Text>
            <View style={styles.row}>
              <StatusBox label="Helmet" value={rider.sensorStatus?.helmetOn ? 'ON' : 'OFF'} ok={rider.sensorStatus?.helmetOn} />
              <StatusBox label="Alcohol" value={rider.sensorStatus?.alcohol > 1500 ? 'DETECTED' : 'NORMAL'} ok={!(rider.sensorStatus?.alcohol > 1500)} />
              <StatusBox label="Drowsy" value={rider.sensorStatus?.drowsy ? 'YES' : 'NO'} ok={!rider.sensorStatus?.drowsy} />
              <StatusBox label="GPS" value={rider.sensorStatus?.gpsActive ? 'ACTIVE' : 'OFF'} ok={rider.sensorStatus?.gpsActive} />
            </View>
          </View>

          <TouchableOpacity style={styles.unlinkButton} onPress={handleUnlink}>
            <Text style={styles.unlinkText}>Unlink from Rider</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {tab === 'history' && (
        <ScrollView style={styles.scrollArea}>
          <Text style={styles.sectionTitle}>ALERT HISTORY</Text>
          {alertHistory.length === 0 ? (
            <View style={styles.card}>
              <Text style={{ color: '#64748b', textAlign: 'center' }}>No alerts yet.</Text>
              <Text style={{ color: '#475569', textAlign: 'center', marginTop: 8, fontSize: 13 }}>Alerts will appear here when detected.</Text>
            </View>
          ) : alertHistory.slice().reverse().map((alert, idx) => {
            const realIndex = alertHistory.length - 1 - idx;
            return renderHistoryItem(alert, realIndex);
          })}
        </ScrollView>
      )}

      {tab === 'link' && (
        <ScrollView style={styles.scrollArea}>
          {rider ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>LINKED RIDER</Text>
              <InfoRow label="Name" value={rider.username} />
              <InfoRow label="Email" value={rider.email} />
              <TouchableOpacity style={styles.unlinkButton} onPress={handleUnlink}>
                <Text style={styles.unlinkText}>Unlink from Rider</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>ENTER LINKING CODE</Text>
              <Text style={{ color: '#94a3b8', marginTop: 8, marginBottom: 16 }}>Ask your rider for their 6-digit code.</Text>
              <TextInput
                style={styles.codeInput}
                placeholder="000000"
                placeholderTextColor="#475569"
                value={linkCode}
                onChangeText={setLinkCode}
                keyboardType="number-pad"
                maxLength={6}
                textAlign="center"
              />
              <TouchableOpacity style={[styles.button, { marginTop: 16 }]} onPress={handleLink}>
                <Text style={styles.buttonText}>LINK NOW</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ==================== COMPONENTS ====================
function StatusBox({ label, value, ok }) {
  return (
    <View style={styles.statusBox}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={[styles.statusValue, { color: ok ? '#22c55e' : '#ef4444' }]}>{value}</Text>
    </View>
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

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  scrollArea: { flex: 1, paddingBottom: 20 },
  formContainer: { flex: 1, justifyContent: 'center', padding: 30 },
  logo: { fontSize: 42, fontWeight: '900', color: '#00f2fe', textAlign: 'center', lineHeight: 50 },
  subtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 50, marginTop: 10 },
  title: { fontSize: 28, fontWeight: '900', color: '#00f2fe', textAlign: 'center', marginTop: 20 },
  back: { color: '#00f2fe', fontSize: 16, marginBottom: 20 },
  input: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 18, fontSize: 16, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', marginBottom: 14 },
  button: { backgroundColor: '#00f2fe', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  link: { color: '#94a3b8', textAlign: 'center', marginTop: 16, fontSize: 14 },
  linkBold: { color: '#00f2fe', fontWeight: '700' },
  roleContainer: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  roleButton: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  roleActive: { borderColor: '#00f2fe', backgroundColor: 'rgba(0,242,254,0.1)' },
  roleText: { fontSize: 16, fontWeight: '800', color: '#64748b' },
  roleTextActive: { color: '#00f2fe' },
  roleDesc: { fontSize: 11, color: '#64748b', marginTop: 4 },
  roleDescActive: { color: '#94a3b8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50 },
  greeting: { fontSize: 24, fontWeight: '800', color: '#fff' },
  statusGreen: { fontSize: 13, color: '#22c55e', marginTop: 4 },
  logout: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
  tabBar: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 10 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#00f2fe' },
  tabText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#00f2fe' },
  card: { backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 20, marginBottom: 16, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  statusBox: { width: '47%', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 16, alignItems: 'center' },
  statusLabel: { fontSize: 12, color: '#94a3b8', marginBottom: 6 },
  statusValue: { fontSize: 14, fontWeight: '800' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  infoLabel: { color: '#94a3b8', fontSize: 14 },
  infoValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  codeButton: { backgroundColor: '#00f2fe', marginHorizontal: 20, marginBottom: 16, borderRadius: 12, padding: 16, alignItems: 'center' },
  codeButtonText: { color: '#0f172a', fontWeight: '800', fontSize: 15 },
  codeCard: { backgroundColor: 'rgba(0,242,254,0.1)', marginHorizontal: 20, marginBottom: 20, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#00f2fe' },
  codeLabel: { fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
  code: { fontSize: 36, fontWeight: '900', color: '#00f2fe', marginTop: 8, letterSpacing: 8 },
  codeExpiry: { fontSize: 12, color: '#64748b', marginTop: 8 },
  codeInput: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 24, fontSize: 32, fontWeight: '800', color: '#00f2fe', letterSpacing: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#94a3b8', marginHorizontal: 20, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  familyCard: { backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 20, marginBottom: 10, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  familyName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  familyEmail: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  alertCard: { backgroundColor: 'rgba(239,68,68,0.15)', margin: 20, borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 2, borderColor: '#ef4444' },
  alertIcon: { fontSize: 40 },
  alertText: { fontSize: 18, fontWeight: '900', color: '#ef4444', marginTop: 8 },
  unlinkButton: { marginHorizontal: 20, marginBottom: 40, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  unlinkText: { color: '#ef4444', fontWeight: '600', fontSize: 14 },
  emptyContainer: { alignItems: 'center', padding: 40, marginTop: 60 },
  emptyIcon: { fontSize: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  alertButtons: { flexDirection: 'row', gap: 10, marginTop: 16 },
  viewMapButton: { backgroundColor: '#00f2fe', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20 },
  viewMapButtonText: { color: '#0f172a', fontWeight: '800', fontSize: 13 },
  historyCard: { backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 20, marginBottom: 12, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyIcon: { fontSize: 28 },
  historyType: { fontSize: 15, fontWeight: '800', color: '#ef4444' },
  historyTime: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  historyMapLink: { marginTop: 10, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 10 },
  historyMapText: { color: '#94a3b8', fontSize: 12 },
  dismissButton: { backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  dismissButtonText: { color: '#ef4444', fontSize: 11, fontWeight: '700' },
  emergencyOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  emergencyCard: { backgroundColor: '#1e293b', borderRadius: 24, padding: 32, alignItems: 'center', width: '85%', borderWidth: 3 },
  emergencyIcon: { fontSize: 64, marginBottom: 16 },
  emergencyTitle: { fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  emergencyRider: { fontSize: 18, color: '#fff', fontWeight: '700', marginTop: 4 },
  emergencyTime: { fontSize: 14, color: '#94a3b8', marginTop: 8 },
  emergencyMapButton: { borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32, marginTop: 24, width: '100%', alignItems: 'center' },
  emergencyMapButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  emergencyDismiss: { marginTop: 16, padding: 12 },
  emergencyDismissText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
  emergencyCardRider: { backgroundColor: '#ef4444', margin: 20, borderRadius: 24, padding: 32, alignItems: 'center' },
  emergencyTitleRider: { fontSize: 24, fontWeight: '900', color: '#fff', textAlign: 'center' },
  emergencySub: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 8 },
  countdownText: { fontSize: 64, fontWeight: '900', color: '#fff', marginVertical: 10 },
  safeButton: { backgroundColor: '#fff', borderRadius: 16, paddingVertical: 18, width: '100%', alignItems: 'center', marginTop: 10 },
  safeButtonText: { color: '#ef4444', fontSize: 16, fontWeight: '900' },
  notSafeButton: { padding: 16, marginTop: 10 },
  notSafeButtonText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
});
