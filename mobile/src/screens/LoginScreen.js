import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.error) {
      Alert.alert('Login Failed', result.error);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        <Text style={styles.logo}>SMART{'\n'}HELMET</Text>
        <Text style={styles.subtitle}>Ride Safe, Stay Connected</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#64748b"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#64748b"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'LOGIN'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.link}>Don't have an account? <Text style={styles.linkBold}>Sign Up</Text></Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { flex: 1, justifyContent: 'center', padding: 30 },
  logo: { fontSize: 42, fontWeight: '900', color: '#00f2fe', textAlign: 'center', lineHeight: 50 },
  subtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 50, marginTop: 10 },
  form: { gap: 16 },
  input: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 18, fontSize: 16, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  button: { backgroundColor: '#00f2fe', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  link: { color: '#94a3b8', textAlign: 'center', marginTop: 16, fontSize: 14 },
  linkBold: { color: '#00f2fe', fontWeight: '700' },
});
