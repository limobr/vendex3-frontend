import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet } from "react-native";

// Owner Screens
import OwnerDashboardScreen from "../screens/owner/DashboardScreen";
import OwnerBusinessStack from "./OwnerBusinessStack";
import InventoryScreen from "../screens/shared/InventoryScreen"; // <-- NEW
import ReportsScreen from "../screens/owner/ReportsScreen";
import ProfileScreen from "../screens/shared/ProfileScreen";
import OwnerEmployeesStack from "./OwnerEmployeesStack";

const Tab = createBottomTabNavigator();

// Screens where tab bar should be hidden (inside the Business or Employees stacks)
const tabBarHiddenScreens = [
  "BusinessDetail",
  "CreateBusiness",
  "EditBusiness",
  "CreateShop",
  "ShopDetail",
  "EditShop",
  "AddEmployee",
  "EmployeeDetail",
  "EmployeeForm",      // Only hide on the add/edit employee screen
  // "EmployeesList" is NOT included so the tab bar remains visible on the employee list
];

const getTabBarVisibility = (route) => {
  const routeName = getFocusedRouteNameFromRoute(route) || "BusinessesList";
  return !tabBarHiddenScreens.includes(routeName);
};

export default function OwnerBottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: "#fff",
          height: 60,
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          paddingBottom: 5,
          paddingTop: 5,
        },
        tabBarActiveTintColor: "#FF6B00",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarIcon: ({ focused, color }) => {
          let iconName;
          let iconSize = focused ? 28 : 24;

          switch (route.name) {
            case "Dashboard":
              iconName = focused ? "grid" : "grid-outline";
              break;
            case "Businesses":
              iconName = focused ? "business" : "business-outline";
              break;
            case "Inventory":               // <-- CHANGED
              iconName = focused ? "cube" : "cube-outline";
              break;
            case "Employees":
              iconName = focused ? "people" : "people-outline";
              break;
            case "Reports":
              iconName = focused ? "stats-chart" : "stats-chart-outline";
              break;
            case "Profile":
              iconName = focused ? "person" : "person-outline";
              break;
            default:
              iconName = "help-circle";
          }

          return (
            <View style={styles.iconContainer}>
              <Ionicons name={iconName} size={iconSize} color={color} />
              {focused && <View style={styles.activeIndicator} />}
            </View>
          );
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginBottom: 4,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={OwnerDashboardScreen}
        options={{ title: "Dashboard", tabBarTestID: "owner-dashboard-tab" }}
      />
      <Tab.Screen
        name="Businesses"
        component={OwnerBusinessStack}
        options={({ route }) => ({
          title: "Businesses",
          tabBarTestID: "owner-businesses-tab",
          tabBarStyle: { display: getTabBarVisibility(route) ? "flex" : "none" },
        })}
      />
      <Tab.Screen
        name="Inventory"                 // <-- REPLACED "Products"
        component={InventoryScreen}      // <-- NEW component
        options={{ title: "Inventory", tabBarTestID: "owner-inventory-tab" }}
      />
      <Tab.Screen
        name="Employees"
        component={OwnerEmployeesStack}
        options={({ route }) => ({
          title: "Team",
          tabBarTestID: "owner-employees-tab",
          tabBarStyle: { display: getTabBarVisibility(route) ? "flex" : "none" },
        })}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ title: "Reports", tabBarTestID: "owner-reports-tab" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Profile", tabBarTestID: "owner-profile-tab" }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  activeIndicator: {
    position: "absolute",
    bottom: -8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FF6B00",
  },
});