// src/navigation/EmployeeBottomTabs.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';

// Employee Screens
import DashboardScreen from '../screens/employee/DashboardScreen';
import POSScreen from '../screens/employee/POSScreen'; // The new POS screen (replaces Products)
import CustomersScreen from '../screens/employee/CustomersScreen';
import SalesHistoryScreen from '../screens/employee/SalesHistoryScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function EmployeeBottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: '#fff',
          height: 60,
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          paddingBottom: 5,
          paddingTop: 5,
        },
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          let iconSize = focused ? 28 : 24;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'POS':
              iconName = focused ? 'cart' : 'cart-outline';
              break;
            case 'Customers':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Sales':
              iconName = focused ? 'receipt' : 'receipt-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-circle';
          }

          return (
            <View style={styles.iconContainer}>
              <Ionicons name={iconName} size={iconSize} color={color} />
              {focused && <View style={[styles.activeIndicator, { backgroundColor: '#2196F3' }]} />}
            </View>
          );
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 4,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ 
          title: 'Home',
          tabBarTestID: 'employee-dashboard-tab',
        }}
      />
      <Tab.Screen
        name="POS"
        component={POSScreen}
        options={{
          title: 'POS',
          tabBarIcon: ({ color, size }) => <Ionicons name="cart-outline" size={size} color={color} />,
          tabBarTestID: 'employee-pos-tab',
        }}
      />
      <Tab.Screen 
        name="Customers" 
        component={CustomersScreen} 
        options={{ 
          title: 'Customers',
          tabBarTestID: 'employee-customers-tab',
        }}
      />
      <Tab.Screen 
        name="Sales" 
        component={SalesHistoryScreen} 
        options={{ 
          title: 'My Sales',
          tabBarTestID: 'employee-sales-tab',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ 
          title: 'Profile',
          tabBarTestID: 'employee-profile-tab',
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -8,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});