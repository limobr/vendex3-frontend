// src/navigation/OwnerEmployeesStack.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import EmployeesManagementScreen from '../screens/owner/EmployeesManagementScreen';
import EmployeeDetailScreen from '../screens/owner/EmployeeDetailScreen';
import EmployeeFormScreen from '../screens/owner/EmployeeFormScreen'; // <-- Add import

const Stack = createNativeStackNavigator();

export default function OwnerEmployeesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EmployeesList" component={EmployeesManagementScreen} />
      <Stack.Screen name="EmployeeDetail" component={EmployeeDetailScreen} />
      <Stack.Screen name="EmployeeForm" component={EmployeeFormScreen} />
    </Stack.Navigator>
  );
}