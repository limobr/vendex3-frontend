// src/navigation/AppNavigator.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LandingScreen from '../screens/shared/LandingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import PINSetupScreen from '../screens/auth/PINSetupScreen';
import PINLockScreen from '../screens/auth/PINLockScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import SyncScreen from '../screens/shared/SyncScreen';
import DatabaseViewerScreen from '../screens/shared/DatabaseViewerScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import MessagesScreen from '../screens/shared/MessagesScreen';
import CheckoutScreen from '../components/CheckoutScreen';
import ShopSelectorScreen from '../screens/shared/ShopSelectorScreen';

// Import user type navigators
import OwnerBottomTabs from './OwnerBottomTabs';
import EmployeeBottomTabs from './EmployeeBottomTabs';
import ManagerBottomTabs from './ManagerBottomTabs';

// Import Product Screens
import ShopProductsScreen from '../screens/owner/ShopProductsScreen';
import AddProductScreen from '../screens/owner/AddProductScreen';
import ProductDetailScreen from '../screens/owner/ProductDetailScreen';
import EditProductScreen from '../screens/owner/EditProductScreen';
import ReceiptTemplateScreen from '../screens/owner/ReceiptTemplateScreen';

const Stack = createNativeStackNavigator();

// Component to determine which navigator to show based on user type
function UserTypeNavigator() {
  const { user, currentEmployeeContext } = useAuth();

  console.log('👤 User Type Navigator - User:', {
    username: user?.username,
    user_type: user?.user_type,
    employeeContext: currentEmployeeContext?.role_type,
    hasContext: !!currentEmployeeContext
  });

  if (user?.user_type === 'owner') {
    console.log('👑 Rendering OwnerBottomTabs');
    return <OwnerBottomTabs />;
  } else if (user?.user_type === 'employee') {
    // Check if employee has manager role
    const roleType = currentEmployeeContext?.role_type;
    
    console.log('👤 Employee role check:', {
      roleType,
      isManager: roleType === 'manager' || roleType === 'shop_manager'
    });
    
    if (roleType === 'manager' || roleType === 'shop_manager') {
      console.log('🎯 Rendering ManagerBottomTabs');
      return <ManagerBottomTabs />;
    } else {
      console.log('👷 Rendering EmployeeBottomTabs');
      return <EmployeeBottomTabs />;
    }
  } else if (user?.user_type === 'admin') {
    // Admins use owner tabs for now
    console.log('👑 Rendering OwnerBottomTabs for admin');
    return <OwnerBottomTabs />;
  }

  // Fallback to employee tabs
  console.log('🔀 Fallback to EmployeeBottomTabs');
  return <EmployeeBottomTabs />;
}

export default function AppNavigator() {
  const { user, isPinSet, isLoading, currentEmployeeContext } = useAuth();

  console.log('🚀 AppNavigator State:', {
    hasUser: !!user,
    userType: user?.user_type,
    isPinSet,
    isLoading,
    hasEmployeeContext: !!currentEmployeeContext
  });

  if (isLoading) {
    return null;
  }

  // Determine initial route based on user state
  let initialRouteName = "Landing";
  
  if (user) {
    if (isPinSet) {
      initialRouteName = "PINLock";
    } else {
      // Check if employee needs onboarding (first login / temp password)
      if (user.user_type === 'employee' && (user.requires_onboarding || !user.is_first_login_complete)) {
        console.log('📋 Employee needs onboarding');
        initialRouteName = "Onboarding";
      } else if (user.user_type === 'employee' && !currentEmployeeContext) {
        console.log('🛍️ Employee needs shop selection');
        initialRouteName = "ShopSelector";
      } else {
        console.log('🏠 User authenticated, going to Main');
        initialRouteName = "Main";
      }
    }
  }

  console.log('📍 Initial Route Name:', initialRouteName);

  return (
    <Stack.Navigator 
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* Auth Flow */}
      {!user && (
        <>
          <Stack.Screen 
            name="Landing" 
            component={LandingScreen}
          />
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
          />
          <Stack.Screen 
            name="Signup" 
            component={SignupScreen}
          />
        </>
      )}

      {/* PIN Lock Screen (if PIN is set) */}
      {user && isPinSet && (
        <Stack.Screen 
          name="PINLock" 
          component={PINLockScreen}
        />
      )}

      {/* Employee Onboarding (first login setup) */}
      {user && user.user_type === 'employee' && (
        <Stack.Screen 
          name="Onboarding" 
          component={OnboardingScreen}
        />
      )}

      {/* Shop Selector for Employees */}
      {user && user.user_type === 'employee' && !currentEmployeeContext && (
        <Stack.Screen 
          name="ShopSelector" 
          component={ShopSelectorScreen}
        />
      )}

      {/* Main App Flow */}
      {user && (
        <>
          <Stack.Screen 
            name="Main" 
            component={UserTypeNavigator}
          />
          <Stack.Screen 
            name="Checkout" 
            component={CheckoutScreen}
          />
          <Stack.Screen 
            name="PINSetup" 
            component={PINSetupScreen}
          />
          <Stack.Screen 
            name="Sync" 
            component={SyncScreen}
          />
          <Stack.Screen 
            name="DatabaseViewer" 
            component={DatabaseViewerScreen}
          />
          
          {/* Product Management Screens */}
          <Stack.Screen 
            name="ShopProducts" 
            component={ShopProductsScreen}
          />
          <Stack.Screen 
            name="AddProduct" 
            component={AddProductScreen}
          />
          <Stack.Screen 
            name="ProductDetail" 
            component={ProductDetailScreen}
          />
          <Stack.Screen 
            name="EditProduct" 
            component={EditProductScreen}
          />

          {/* Notifications & Messages (NEW) */}
          <Stack.Screen 
            name="Notifications" 
            component={NotificationsScreen}
          />
          <Stack.Screen 
            name="Messages" 
            component={MessagesScreen}
          />
          <Stack.Screen 
            name="ReceiptTemplate" 
            component={ReceiptTemplateScreen}
          />
        </>
      )}
    </Stack.Navigator>
  );
}