// src/screens/HomeScreen.js
import React from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet,
  Image 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomHeader from "../components/CustomHeader";
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen({ navigation }) {
  const topProducts = ["Milk 500ml", "Bread", "Cooking Oil 1L", "Sugar 2kg"];

  const handleSell = () => {
    navigation.navigate("Checkout");
  };

  const handleReports = () => {
    // Navigate to reports screen
    console.log("Reports pressed");
  };

  const handleProducts = () => {
    navigation.navigate("Products");
  };

  const handleCustomers = () => {
    // Navigate to customers screen
    console.log("Customers pressed");
  };

  const handleSwitchShop = () => {
    navigation.navigate("Shops");
  };

  return (
    <View style={styles.container}>
      <CustomHeader title="Home" />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View style={styles.section}>
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeText}>Welcome back 👋</Text>
            <Text style={styles.userName}>Limo Brian</Text>
          </View>
          
          <View style={styles.shopContainer}>
            <View style={styles.shopInfo}>
              <Ionicons name="storefront" size={20} color="#FF6B00" />
              <Text style={styles.shopText}>Vendex Supermarket</Text>
            </View>
            <TouchableOpacity 
              style={styles.switchShopBtn}
              onPress={handleSwitchShop}
            >
              <Text style={styles.switchShopText}>Switch</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary Cards */}
        <View style={styles.cardsContainer}>
          {/* Total Sales */}
          <View style={[styles.card, styles.salesCard]}>
            <View style={styles.cardHeader}>
              <Ionicons name="trending-up" size={24} color="#22C55E" />
            </View>
            <Text style={styles.cardLabel}>Total Sales</Text>
            <Text style={styles.cardValue}>KES 250,000</Text>
            <Text style={styles.cardSubtext}>+12% from last month</Text>
          </View>

          {/* Today's Sales */}
          <View style={[styles.card, styles.todayCard]}>
            <View style={styles.cardHeader}>
              <Ionicons name="today" size={24} color="#FF6B00" />
            </View>
            <Text style={styles.cardLabel}>Today's Sales</Text>
            <Text style={styles.cardValue}>KES 12,000</Text>
            <Text style={styles.cardSubtext}>+8 orders today</Text>
          </View>

          {/* Profit */}
          <View style={[styles.card, styles.profitCard]}>
            <View style={styles.cardHeader}>
              <Ionicons name="cash" size={24} color="#2563EB" />
            </View>
            <Text style={styles.cardLabel}>Profit</Text>
            <Text style={styles.cardValue}>KES 5,500</Text>
            <Text style={styles.cardSubtext}>45% profit margin</Text>
          </View>

          {/* Customers */}
          <View style={[styles.card, styles.customersCard]}>
            <View style={styles.cardHeader}>
              <Ionicons name="people" size={24} color="#9333EA" />
            </View>
            <Text style={styles.cardLabel}>Customers</Text>
            <Text style={styles.cardValue}>89</Text>
            <Text style={styles.cardSubtext}>Active today</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
          </View>

          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={[styles.actionCard, styles.sellCard]}
              onPress={handleSell}
            >
              <View style={[styles.actionIcon, styles.sellIcon]}>
                <Ionicons name="cart" size={32} color="#fff" />
              </View>
              <Text style={styles.actionTitle}>Sell</Text>
              <Text style={styles.actionSubtitle}>New Sale</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, styles.productsCard]}
              onPress={handleProducts}
            >
              <View style={[styles.actionIcon, styles.productsIcon]}>
                <Ionicons name="cube" size={32} color="#fff" />
              </View>
              <Text style={styles.actionTitle}>Products</Text>
              <Text style={styles.actionSubtitle}>Manage Items</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, styles.reportsCard]}
              onPress={handleReports}
            >
              <View style={[styles.actionIcon, styles.reportsIcon]}>
                <Ionicons name="stats-chart" size={32} color="#fff" />
              </View>
              <Text style={styles.actionTitle}>Reports</Text>
              <Text style={styles.actionSubtitle}>View Analytics</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, styles.customersActionCard]}
              onPress={handleCustomers}
            >
              <View style={[styles.actionIcon, styles.customersIcon]}>
                <Ionicons name="person-add" size={32} color="#fff" />
              </View>
              <Text style={styles.actionTitle}>Customers</Text>
              <Text style={styles.actionSubtitle}>Manage Clients</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Top Selling Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔥 Top Selling Products</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {topProducts.map((item, index) => (
            <TouchableOpacity key={index} style={styles.productCard}>
              <View style={styles.productInfo}>
                <View style={styles.productIcon}>
                  <Ionicons name="cube-outline" size={20} color="#FF6B00" />
                </View>
                <Text style={styles.productName}>{item}</Text>
              </View>
              <View style={styles.productStats}>
                <Text style={styles.productSold}>
                  +{Math.floor(Math.random() * 100)} sold
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📈 Recent Activity</Text>
          </View>
          
          <View style={styles.activityCard}>
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
              </View>
              <View style={styles.activityDetails}>
                <Text style={styles.activityTitle}>Sale Completed</Text>
                <Text style={styles.activitySubtitle}>KES 2,500 • 5 items • 10:30 AM</Text>
              </View>
            </View>
            
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Ionicons name="add-circle" size={20} color="#3B82F6" />
              </View>
              <View style={styles.activityDetails}>
                <Text style={styles.activityTitle}>Stock Added</Text>
                <Text style={styles.activitySubtitle}>Milk 500ml • 50 units • 9:15 AM</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  welcomeContainer: {
    marginBottom: 12,
  },
  welcomeText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
  },
  shopContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  shopInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  shopText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  switchShopBtn: {
    backgroundColor: "#FF6B00",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  switchShopText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  cardsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  card: {
    width: "48%",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  cardSubtext: {
    fontSize: 12,
    color: "#9ca3af",
  },
  salesCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#22C55E",
  },
  todayCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#FF6B00",
  },
  profitCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#2563EB",
  },
  customersCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#9333EA",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  seeAllText: {
    fontSize: 14,
    color: "#FF6B00",
    fontWeight: "600",
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionCard: {
    width: "48%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f3f4f6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  sellIcon: {
    backgroundColor: "#FF6B00",
  },
  productsIcon: {
    backgroundColor: "#2563EB",
  },
  reportsIcon: {
    backgroundColor: "#22C55E",
  },
  customersIcon: {
    backgroundColor: "#9333EA",
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
    textAlign: "center",
  },
  actionSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  sellCard: {
    borderTopWidth: 4,
    borderTopColor: "#FF6B00",
  },
  productsCard: {
    borderTopWidth: 4,
    borderTopColor: "#2563EB",
  },
  reportsCard: {
    borderTopWidth: 4,
    borderTopColor: "#22C55E",
  },
  customersActionCard: {
    borderTopWidth: 4,
    borderTopColor: "#9333EA",
  },
  productCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  productInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  productIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 107, 0, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  productName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
  },
  productStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  productSold: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  activityCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityDetails: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
});