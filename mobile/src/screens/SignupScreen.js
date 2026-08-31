import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function SignupScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('rider');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();

  const handleSignup = async () => {
    if (!username || !email || !password) {
      Alert.alert('Error', 'Please fill required fields');
      return;
    }

    setLoading(true);
    const result = await signup(email, password, username, phone, vehicle, role);
    setLoading(false);

    if (result.error) {
      Alert.alert('Signup Failed', result.error);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>CREATE ACCOUNT</Text>
        <Text style={styles.subtitle}>Join Smart Helmet Safety Network</Text>

        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={[styles.roleButton, role === 'rider' && styles.roleButtonActive]}
            onPress={() => setRole('rider')}
          >
            <Text style={[styles.roleText, role === 'rider' && styles.roleTextActive]}>RIDER</Text>
            <Text style={[styles.roleDesc, role === 'rider' && styles.roleDescActive]}>I ride a bike</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleButton, role === 'family' && styles.roleButtonActive]}
            onPress={() => setRole('family')}
          >
            <Text style={[styles.roleText, role === 'family' && styles.roleTextActive]}>FAMILY</Text>
            <Text style={[styles.roleDesc, role === 'family' && styles.roleDescActive]}>I monitor a rider</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Full Name *" placeholderTextColor="#64748b" value={username} onChangeText={setUsername} />
          <TextInput style={styles.input} placeholder="Email *" placeholderTextColor="#64748b" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Phone" placeholderTextColor="#64748b" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          {role === 'rider' && (
            <TextInput style={styles.input} placeholder="Vehicle Number" placeholderTextColor="#64748b" value={vehicle} onChangeText={setVehicle} autoCapitalize="characters" />
          )}
          <TextInput style={styles.input} placeholder="Password *" placeholderTextColor="#64748b" value={password} onChangeText={setPassword} secureTextEntry />

          <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Creating Account...' : 'SIGN UP'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>Already have an account? <Text style={styles.linkBold}>Login</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 30, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '900', color: '#00f2fe', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 30 },
  roleContainer: { flexDirection: 'row', gap: 12, marginBottom: 30 },
  roleButton: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  roleButtonActive: { borderColor: '#00f2fe', backgroundColor: 'rgba(0,242,254,0.1)' },
  roleText: { fontSize: 16, fontWeight: '800', color: '#64748b' },
  roleTextActive: { color: '#00f2fe' },
  roleDesc: { fontSize: 11, color: '#64748b', marginTop: 4 },
  roleDescActive: { color: '#94a3b8' },
  form: { gap: 14 },
  input: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 18, fontSize: 16, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  button: { backgroundColor: '#00f2fe', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  link: { color: '#94a3b8', textAlign: 'center', marginTop: 16, fontSize: 14 },
  linkBold: { color: '#00f2fe', fontWeight: '700' },
});
