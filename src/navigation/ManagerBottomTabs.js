import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';

// Manager Screens
import POSScreen from '../screens/employee/POSScreen';
import ProductsScreen from '../screens/employee/ProductsScreen';
import CustomersScreen from '../screens/employee/CustomersScreen';
import InventoryScreen from '../screens/manager/InventoryScreen';
import ReportsScreen from '../screens/manager/ReportsScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function ManagerBottomTabs() {
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
        tabBarActiveTintColor: '#4CAF50', // Green for managers
        tabBarInactiveTintColor: '#9ca3af',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          let iconSize = focused ? 28 : 24;

          switch (route.name) {
            case 'POS':
              iconName = focused ? 'cash' : 'cash-outline';
              break;
            case 'Products':
              iconName = focused ? 'cube' : 'cube-outline';
              break;
            case 'Customers':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Inventory':
              iconName = focused ? 'archive' : 'archive-outline';
              break;
            case 'Reports':
              iconName = focused ? 'stats-chart' : 'stats-chart-outline';
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
              {focused && <View style={[styles.activeIndicator, { backgroundColor: '#4CAF50' }]} />}
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
        name="POS" 
        component={POSScreen} 
        options={{ 
          title: 'POS',
          tabBarTestID: 'manager-pos-tab',
        }}
      />
      <Tab.Screen 
        name="Products" 
        component={ProductsScreen} 
        options={{ 
          title: 'Products',
          tabBarTestID: 'manager-products-tab',
        }}
      />
      <Tab.Screen 
        name="Customers" 
        component={CustomersScreen} 
        options={{ 
          title: 'Customers',
          tabBarTestID: 'manager-customers-tab',
        }}
      />
      <Tab.Screen 
        name="Inventory" 
        component={InventoryScreen} 
        options={{ 
          title: 'Inventory',
          tabBarTestID: 'manager-inventory-tab',
        }}
      />
      <Tab.Screen 
        name="Reports" 
        component={ReportsScreen} 
        options={{ 
          title: 'Reports',
          tabBarTestID: 'manager-reports-tab',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ 
          title: 'Profile',
          tabBarTestID: 'manager-profile-tab',
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