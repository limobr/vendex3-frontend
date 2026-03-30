// App.js - UPDATED
import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { ActivityIndicator, View, Text, StyleSheet, Alert } from "react-native";
import { AuthProvider } from "./src/context/AuthContext";
import { DatabaseProvider } from "./src/context/DatabaseContext";
import { BusinessProvider } from "./src/context/BusinessContext";
import { ShopProvider } from "./src/context/ShopContext";
import { SyncProvider } from "./src/context/SyncContext";
import { CartProvider } from "./src/context/CartContext";
import databaseService from "./src/database";
import AppNavigator from "./src/navigation/AppNavigator";
import NetInfo from "@react-native-community/netinfo";
import BusinessDataLoader from "./src/components/BusinessDataLoader";

const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#FF6B00" />
    <Text style={styles.loadingText}>Initializing Vendex...</Text>
  </View>
);

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log("🚀 Starting Vendex initialization...");

        // Configure NetInfo for network monitoring
        console.log("📶 Configuring network monitoring...");
        NetInfo.configure({
          reachabilityUrl: "https://clients3.google.com/generate_204",
          reachabilityTest: async (response) => response.status === 204,
          reachabilityLongTimeout: 60 * 1000,
          reachabilityShortTimeout: 5 * 1000,
          reachabilityRequestTimeout: 15 * 1000,
        });
        console.log("✅ Network monitoring configured");

        // Initialize database
        console.log("📊 Initializing database...");
        const dbInitialized = await databaseService.initDatabase();
        if (!dbInitialized) {
          const errorMsg = "Failed to initialize database";
          console.error(`❌ ${errorMsg}`);
          setInitError(errorMsg);
          Alert.alert("Error", `${errorMsg}. Please restart the app.`);
          return;
        }

        // CRITICAL: Clean up duplicate employees on app start
        console.log("🧹 Running database cleanup...");
        const cleanupResult = await databaseService.cleanupDuplicateEmployees();
        if (cleanupResult.success) {
          console.log(`✅ Cleanup completed: Fixed ${cleanupResult.nullIdsFixed || 0} null IDs, removed ${cleanupResult.duplicatesCleaned || 0} duplicates`);
        } else {
          console.warn('⚠️ Cleanup had issues:', cleanupResult.error);
        }
        console.log("✅ Database initialized with business tables");

        console.log("✅ App initialized successfully");
        setIsReady(true);
      } catch (error) {
        const errorMsg = `Failed to initialize app: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        setInitError(errorMsg);
        setIsReady(true); // Still allow app to run
      }
    };

    initializeApp();
  }, []);

  if (!isReady) {
    return <LoadingScreen />;
  }

  return (
    <DatabaseProvider>
      <AuthProvider>
        <BusinessProvider>
          <ShopProvider>
            <SyncProvider>
              <CartProvider>
                <NavigationContainer>
                  <BusinessDataLoader>
                    <AppNavigator />
                  </BusinessDataLoader>
                </NavigationContainer>
              </CartProvider>
            </SyncProvider>
          </ShopProvider>
        </BusinessProvider>
      </AuthProvider>
    </DatabaseProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fffaf5",
  },
  loadingText: {
    marginTop: 20,
    color: "#FF6B00",
    fontSize: 18,
    fontWeight: "600",
  },
});