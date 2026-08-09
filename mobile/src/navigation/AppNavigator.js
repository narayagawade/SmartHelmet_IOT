import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import RiderDashboardScreen from '../screens/RiderDashboardScreen';
import FamilyDashboardScreen from '../screens/FamilyDashboardScreen';
import FamilyManagementScreen from '../screens/FamilyManagementScreen';
import LinkRiderScreen from '../screens/LinkRiderScreen';
import MapScreen from '../screens/MapScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function RiderTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0f172a', borderTopColor: 'rgba(255,255,255,0.1)' },
        tabBarActiveTintColor: '#00f2fe',
        tabBarInactiveTintColor: '#64748b',
      }}
    >
      <Tab.Screen name="Dashboard" component={RiderDashboardScreen} />
      <Tab.Screen name="Family" component={FamilyManagementScreen} />
    </Tab.Navigator>
  );
}

function FamilyTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0f172a', borderTopColor: 'rgba(255,255,255,0.1)' },
        tabBarActiveTintColor: '#00f2fe',
        tabBarInactiveTintColor: '#64748b',
      }}
    >
      <Tab.Screen name="Dashboard" component={FamilyDashboardScreen} />
      <Tab.Screen name="Link" component={LinkRiderScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        ) : (
          <>
            {user.role === 'rider' ? (
              <Stack.Screen name="RiderTabs" component={RiderTabs} />
            ) : (
              <Stack.Screen name="FamilyTabs" component={FamilyTabs} />
            )}
            <Stack.Screen name="Map" component={MapScreen} />
            <Stack.Screen name="FamilyManagement" component={FamilyManagementScreen} />
            <Stack.Screen name="LinkRider" component={LinkRiderScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
