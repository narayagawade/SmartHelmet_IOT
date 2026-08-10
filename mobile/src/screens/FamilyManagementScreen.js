import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function FamilyManagementScreen({ navigation }) {
  const { user, token } = useAuth();
  const [family, setFamily] = useState([]);
  const [linkingCode, setLinkingCode] = useState(null);

  useEffect(() => {
    fetchFamily();
  }, []);

  const fetchFamily = async () => {
    try {
      const response = await api.get('/api/family/linked-family', token);
      if (response.family) setFamily(response.family);
    } catch (error) {
      console.error('Fetch family error:', error);
    }
  };

  const generateCode = async () => {
    try {
      const response = await api.post('/api/family/generate-code', {}, token);
      if (response.code) {
        setLinkingCode(response.code);
        Alert.alert('Linking Code', `Share this code with your family member:\n\n${response.code}\n\nExpires in 24 hours.`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate code');
    }
  };

  const removeFamily = (familyMember) => {
    Alert.alert('Remove Family', `Remove ${familyMember.username}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await api.post('/api/family/unlink', { familyId: familyMember._id }, token);
          fetchFamily();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Family Management</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Generate Code */}
      <TouchableOpacity style={styles.codeButton} onPress={generateCode}>
        <Text style={styles.codeButtonText}>GENERATE LINKING CODE</Text>
      </TouchableOpacity>

      {linkingCode && (
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Your Linking Code</Text>
          <Text style={styles.code}>{linkingCode}</Text>
          <Text style={styles.codeExpiry}>Expires in 24 hours</Text>
        </View>
      )}

      {/* Family List */}
      <Text style={styles.sectionTitle}>Linked Family Members ({family.length})</Text>

      {family.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No family members linked yet.</Text>
          <Text style={styles.emptySubtext}>Share your linking code with family members.</Text>
        </View>
      ) : (
        <FlatList
          data={family}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={styles.familyCard}>
              <View style={styles.familyInfo}>
                <Text style={styles.familyName}>{item.username}</Text>
                <Text style={styles.familyEmail}>{item.email}</Text>
              </View>
              <TouchableOpacity onPress={() => removeFamily(item)}>
                <Text style={styles.removeButton}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50 },
  back: { color: '#00f2fe', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '800', color: '#fff' },
  codeButton: { backgroundColor: '#00f2fe', marginHorizontal: 20, marginBottom: 16, borderRadius: 12, padding: 16, alignItems: 'center' },
  codeButtonText: { color: '#0f172a', fontWeight: '800', fontSize: 15 },
  codeCard: { backgroundColor: 'rgba(0,242,254,0.1)', marginHorizontal: 20, marginBottom: 20, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#00f2fe' },
  codeLabel: { fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
  code: { fontSize: 36, fontWeight: '900', color: '#00f2fe', marginTop: 8, letterSpacing: 8 },
  codeExpiry: { fontSize: 12, color: '#64748b', marginTop: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#94a3b8', marginHorizontal: 20, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#64748b', fontSize: 16 },
  emptySubtext: { color: '#475569', fontSize: 13, marginTop: 8 },
  familyCard: { backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 20, marginBottom: 10, borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  familyInfo: { flex: 1 },
  familyName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  familyEmail: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  removeButton: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
});
