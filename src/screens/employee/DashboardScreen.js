// src/screens/employee/DashboardScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useBusiness } from '../../context/BusinessContext';
import databaseService from '../../database';
import { formatCurrency } from '../../utils/formatters';
import QuickActionButton from '../../components/QuickActionButton';
import SalesTrendChart from '../../components/SalesTrendChart';
import RecentSaleItem from '../../components/RecentSaleItem';
import LowStockAlert from '../../components/LowStockAlert';
import AppHeader from '../../components/AppHeader'; // Import AppHeader

const DashboardScreen = ({ navigation }) => {
  const { user, currentEmployeeContext, isOnline } = useAuth();
  const { currentShop, loadCurrentShop } = useBusiness();

  // State for dashboard data
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [stats, setStats] = useState({
    todaySalesCount: 0,
    todayRevenue: 0,
    averageSaleValue: 0,
    itemsSold: 0,
  });
  const [lowStockItems, setLowStockItems] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [permissions, setPermissions] = useState({
    make_sale: false,
    view_sale: false,
    view_inventory: false,
    view_customer: false,
  });

  // Fetch dashboard data from local DB
  const fetchDashboardData = useCallback(async () => {
    if (!user || !currentShop) {
      setIsLoadingData(false);
      setRefreshing(false);
      return;
    }

    setIsLoadingData(true);
    setHasError(false);
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const db = await databaseService.openDatabase();

      // 1. Stats for today (filter by employee user_id via employees table)
      const salesWithItems = await db.getAllAsync(
        `SELECT s.id, s.total_amount, s.status,
                COALESCE((SELECT SUM(si.quantity) FROM sale_items si WHERE si.sale_id = s.id), 0) as items_sold
         FROM sales s
         INNER JOIN employees e ON s.attendant_id = e.id
         WHERE e.user_id = ? 
           AND s.created_at BETWEEN ? AND ?
           AND s.status = 'completed'`,
        [String(user.id), todayStart.toISOString(), todayEnd.toISOString()]
      );

      const todayCount = salesWithItems.length;
      const todayRevenue = salesWithItems.reduce((sum, s) => sum + (s.total_amount || 0), 0);
      const itemsSold = salesWithItems.reduce((sum, s) => sum + (s.items_sold || 0), 0);
      const avgSale = todayCount > 0 ? todayRevenue / todayCount : 0;

      setStats({
        todaySalesCount: todayCount,
        todayRevenue,
        averageSaleValue: avgSale,
        itemsSold,
      });

      // 2. Recent sales (last 10) for this employee
      const recent = await db.getAllAsync(
        `SELECT s.id, s.receipt_number, s.total_amount, s.status, s.created_at
         FROM sales s
         INNER JOIN employees e ON s.attendant_id = e.id
         WHERE e.user_id = ?
         ORDER BY s.created_at DESC
         LIMIT 10`,
        [String(user.id)]
      );
      setRecentSales(recent);

      // 3. Low stock items (if permission) – adapt to your actual inventory table
      if (permissions.view_inventory && currentShop) {
        const lowStock = await db.getAllAsync(
          `SELECT p.id, p.name, i.current_stock as stock, p.reorder_level
           FROM products p
           INNER JOIN inventory i ON p.id = i.product_id
           WHERE i.shop_id = ? AND i.current_stock <= i.minimum_stock AND i.current_stock > 0
           ORDER BY i.current_stock ASC
           LIMIT 10`,
          [currentShop.id]
        );
        setLowStockItems(lowStock);
      }

      // 4. Sales trend (last 7 days, daily counts)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const trendRaw = await db.getAllAsync(
        `SELECT DATE(s.created_at) as date, COUNT(*) as count, SUM(s.total_amount) as revenue
         FROM sales s
         INNER JOIN employees e ON s.attendant_id = e.id
         WHERE e.user_id = ? AND s.created_at >= ?
         GROUP BY DATE(s.created_at)
         ORDER BY date ASC`,
        [String(user.id), sevenDaysAgo.toISOString()]
      );

      // Fill missing dates
      const trend = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const dateStr = date.toISOString().slice(0, 10);
        const found = trendRaw.find(d => d.date === dateStr);
        trend.push({
          date: dateStr,
          count: found ? found.count : 0,
          revenue: found ? found.revenue : 0,
        });
      }
      setTrendData(trend);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setHasError(true);
      Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoadingData(false);
      setRefreshing(false);
    }
  }, [user, currentShop, permissions]);

  // Load permissions from employee context (role + custom permissions)
  useEffect(() => {
    const loadPermissions = async () => {
      if (!currentEmployeeContext) return;
      const role = currentEmployeeContext.role;
      const customPerms = currentEmployeeContext.custom_permissions || [];
      const rolePerms = role?.permissions || [];

      // Combine permissions
      const allPerms = [...rolePerms, ...customPerms];
      setPermissions({
        make_sale: allPerms.some(p => p.code === 'make_sale'),
        view_sale: allPerms.some(p => p.code === 'view_sale'),
        view_inventory: allPerms.some(p => p.code === 'view_inventory'),
        view_customer: allPerms.some(p => p.code === 'view_customer'),
      });
    };
    loadPermissions();
  }, [currentEmployeeContext]);

  // Fallback: if user exists but currentShop is null, try to load it
  useEffect(() => {
    if (user && !currentShop && !isLoadingData) {
      console.log("🔄 Dashboard: currentShop is null, attempting to load...");
      loadCurrentShop();
    }
  }, [user, currentShop, isLoadingData, loadCurrentShop]);

  // Trigger fetch when user, shop, or permissions are ready
  useEffect(() => {
    if (user && currentShop) {
      fetchDashboardData();
    }
  }, [user, currentShop, fetchDashboardData]);

  const onRefresh = useCallback(() => {
    if (user && currentShop) {
      setRefreshing(true);
      fetchDashboardData();
    }
  }, [fetchDashboardData, user, currentShop]);

  // Navigation handlers
  const goToPOS = () => navigation.navigate('POS');
  const goToCustomers = () => navigation.navigate('Customers');
  const goToSalesHistory = () => navigation.navigate('Sales');
  const goToProducts = () => navigation.navigate('Products');
  const goToLowStock = () => navigation.navigate('Products', { filter: 'low_stock' });

  // Greeting
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Render waiting state if prerequisites missing
  if (!user || !currentShop) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loaderText}>Waiting for shop data...</Text>
      </View>
    );
  }

  if (isLoadingData) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loaderText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={styles.loaderContainer}>
        <Ionicons name="alert-circle" size={48} color="#f44336" />
        <Text style={styles.errorText}>Failed to load dashboard data.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchDashboardData()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Smart messages for empty states
  const noSalesToday = stats.todaySalesCount === 0;
  const noLowStock = lowStockItems.length === 0;

  return (
    <View style={styles.container}>
      <AppHeader title={`${greeting()}, ${user?.first_name || user?.username}`} />
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Personal Stats Cards */}
        <View style={styles.statsContainer}>
          <StatCard
            icon="cart-outline"
            label="Today's Sales"
            value={stats.todaySalesCount}
            color="#4CAF50"
          />
          <StatCard
            icon="cash-outline"
            label="Revenue"
            value={formatCurrency(stats.todayRevenue)}
            color="#2196F3"
          />
          <StatCard
            icon="trending-up"
            label="Avg Sale"
            value={formatCurrency(stats.averageSaleValue)}
            color="#FF9800"
          />
          <StatCard
            icon="cube-outline"
            label="Items Sold"
            value={stats.itemsSold}
            color="#9C27B0"
          />
        </View>

        {/* Quick Actions (based on permissions) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            {permissions.make_sale && (
              <QuickActionButton
                icon="cash"
                label="Start Sale"
                onPress={goToPOS}
                color="#2196F3"
              />
            )}
            {permissions.view_customer && (
              <QuickActionButton
                icon="people"
                label="Customers"
                onPress={goToCustomers}
                color="#4CAF50"
              />
            )}
            {permissions.view_sale && (
              <QuickActionButton
                icon="receipt"
                label="Sales History"
                onPress={goToSalesHistory}
                color="#FF9800"
              />
            )}
            <QuickActionButton
              icon="cube"
              label="Products"
              onPress={goToProducts}
              color="#9C27B0"
            />
          </View>
        </View>

        {/* Low Stock Alerts */}
        {permissions.view_inventory && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Low Stock Alerts</Text>
            {noLowStock ? (
              <Text style={styles.emptyText}>All stock levels are healthy</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {lowStockItems.map(item => (
                  <LowStockAlert key={item.id} item={item} onPress={goToLowStock} />
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Sales Trend Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Sales Trend (Last 7 days)</Text>
          <SalesTrendChart data={trendData} />
        </View>

        {/* Recent Sales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Sales</Text>
          {recentSales.length === 0 ? (
            <Text style={styles.emptyText}>No sales yet today</Text>
          ) : (
            recentSales.map(sale => (
              <RecentSaleItem
                key={sale.id}
                sale={sale}
                onPress={() => navigation.navigate('SaleDetail', { saleId: sale.id })}
              />
            ))
          )}
        </View>

        {/* Offline Message */}
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline" size={20} color="#fff" />
            <Text style={styles.offlineText}>You are offline. Sales will sync later.</Text>
          </View>
        )}

        {/* No sales today prompt */}
        {noSalesToday && isOnline && (
          <View style={styles.promptBanner}>
            <Ionicons name="bulb-outline" size={20} color="#FF9800" />
            <Text style={styles.promptText}>
              No sales yet today — start your first sale!
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// Helper: Stat Card Component (unchanged)
const StatCard = ({ icon, label, value, color }) => (
  <View style={styles.statCard}>
    <Ionicons name={icon} size={24} color={color} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { flex: 1 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  loaderText: { marginTop: 10, color: '#666' },
  errorText: { marginTop: 10, color: '#f44336', textAlign: 'center', marginHorizontal: 20 },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: { color: '#fff', fontWeight: '600' },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: { fontSize: 20, fontWeight: 'bold', marginTop: 8, color: '#333' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  section: { backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 12, borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#212529', marginBottom: 12 },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  emptyText: { color: '#999', textAlign: 'center', marginVertical: 16 },
  offlineBanner: {
    backgroundColor: '#f44336',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 8,
  },
  offlineText: { color: '#fff', marginLeft: 8, fontSize: 12 },
  promptBanner: {
    backgroundColor: '#fff3e0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffe0b2',
  },
  promptText: { color: '#FF9800', marginLeft: 8, fontSize: 12 },
});

export default DashboardScreen;