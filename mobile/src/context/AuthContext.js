import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../services/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        setToken(idToken);

        // Get or create user profile from our server
        try {
          const response = await api.get('/api/auth/me', idToken);
          if (response.user) {
            setUser(response.user);
          }
        } catch (error) {
          console.log('User profile not found on server yet');
        }
      } else {
        setToken(null);
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signup = async (email, password, username, phone, vehicle, role) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();

      // Register user profile on our server
      const response = await api.post('/api/auth/register', {
        firebaseUid: userCredential.user.uid,
        email,
        username,
        phone,
        vehicle,
        role,
      }, idToken);

      if (response.error) return { error: response.error };

      setToken(idToken);
      setUser(response.user);
      return { success: true };
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        return { error: 'Email already registered' };
      }
      return { error: error.message };
    }
  };

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();

      const response = await api.get('/api/auth/me', idToken);
      if (response.user) {
        setToken(idToken);
        setUser(response.user);
        return { success: true };
      }
      return { error: 'User profile not found' };
    } catch (error) {
      if (error.code === 'auth/user-not-found') return { error: 'User not found' };
      if (error.code === 'auth/wrong-password') return { error: 'Wrong password' };
      return { error: error.message };
    }
  };

  const logout = async () => {
    await signOut(auth);
    setToken(null);
    setUser(null);
  };

  const updateUser = async (updates) => {
    try {
      const response = await api.put('/api/auth/profile', updates, token);
      if (response.user) {
        const updatedUser = { ...user, ...response.user };
        setUser(updatedUser);
      }
      return response;
    } catch (error) {
      return { error: 'Update failed' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
