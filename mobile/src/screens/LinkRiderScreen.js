import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function LinkRiderScreen({ navigation }) {
  const { token } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLink = async () => {
    if (code.length !== 6) {
      Alert.alert('Error', 'Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/family/link', { code }, token);
      setLoading(false);

      if (response.error) {
        Alert.alert('Link Failed', response.error);
      } else {
        Alert.alert('Success', `Linked to ${response.rider.username}!`, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Failed to link. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Link to Rider</Text>
        <Text style={styles.subtitle}>Enter the 6-digit code from your rider</Text>

        <TextInput
          style={styles.codeInput}
          placeholder="000000"
          placeholderTextColor="#475569"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          textAlign="center"
        />

        <TouchableOpacity style={styles.button} onPress={handleLink} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Linking...' : 'LINK NOW'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { flex: 1, padding: 30, paddingTop: 60 },
  back: { color: '#00f2fe', fontSize: 16, fontWeight: '600', marginBottom: 30 },
  title: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 40 },
  codeInput: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 24, fontSize: 32, fontWeight: '800', color: '#00f2fe', letterSpacing: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)' },
  button: { backgroundColor: '#00f2fe', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 30 },
  buttonText: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
});
