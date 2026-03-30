// src/navigation/OwnerBusinessStack.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BusinessesScreen from '../screens/owner/BusinessesScreen';
import CreateBusinessScreen from '../screens/owner/CreateBusinessScreen';
import BusinessDetailScreen from '../screens/owner/BusinessDetailScreen';
import CreateShopScreen from '../screens/owner/CreateShopScreen';
import ShopDetailScreen from '../screens/owner/ShopDetailScreen';
import EditBusinessScreen from '../screens/owner/EditBusinessScreen';
import EditShopScreen from '../screens/owner/EditShopScreen';
import EmployeesListScreen from '../screens/owner/EmployeesListScreen';
import EmployeeDetailScreen from '../screens/owner/EmployeeDetailScreen';
import EmployeeFormScreen from '../screens/owner/EmployeeFormScreen'; // <-- Add this import

const Stack = createNativeStackNavigator();

export default function OwnerBusinessStack() {
  return (
    <Stack.Navigator
      initialRouteName="BusinessesList"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 200,
      }}
    >
      <Stack.Screen name="BusinessesList" component={BusinessesScreen} />
      <Stack.Screen name="CreateBusiness" component={CreateBusinessScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="BusinessDetail" component={BusinessDetailScreen} />
      <Stack.Screen name="CreateShop" component={CreateShopScreen} />
      <Stack.Screen name="ShopDetail" component={ShopDetailScreen} />
      <Stack.Screen name="EditBusiness" component={EditBusinessScreen} />
      <Stack.Screen name="EditShop" component={EditShopScreen} />
      <Stack.Screen name="EmployeesList" component={EmployeesListScreen} />
      <Stack.Screen name="EmployeeDetail" component={EmployeeDetailScreen} />
      <Stack.Screen name="EmployeeForm" component={EmployeeFormScreen} />
    </Stack.Navigator>
  );
}