// src/screens/owner/DashboardScreen.js - Updated with real API data
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  RefreshControl, ActivityIndicator, TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { salesAPI } from '../../services/api';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import NetworkStatusBar from '../../components/NetworkStatusBar';
import AppHeader from '../../components/AppHeader';

export default function OwnerDashboardScreen({ navigation }) {
  const { user, currentShop } = useAuth();
  const { isConnected } = useNetworkStatus();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState(null);

  const businessId = currentShop?.business_id;

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      if (isConnected) {
        const result = await salesAPI.getDashboard({ business_id: businessId });
        if (result?.success) setDashboard(result.dashboard);
      }
    } catch (e) {
      console.error('Dashboard error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatPrice = (p) => `KES ${parseFloat(p || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={styles.container}>
      <NetworkStatusBar />

      {/* Header with notifications & messages */}
      <AppHeader
        title={`${greeting()}, ${user?.first_name || user?.username || 'Owner'}`}
      />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadDashboard(); }}
            colors={['#FF6B00']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading && !dashboard ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B00" />
          </View>
        ) : (
          <>
            {/* Revenue Cards */}
            <View style={styles.revenueSection}>
              <View style={[styles.revenueCard, styles.revenueCardPrimary]}>
                <View style={styles.revenueCardHeader}>
                  <Ionicons name="today-outline" size={20} color="#FFD4B0" />
                  <Text style={styles.revenueCardLabel}>Today</Text>
                </View>
                <Text style={styles.revenueCardValue}>
                  {formatPrice(dashboard?.today?.revenue)}
                </Text>
                <Text style={styles.revenueCardSub}>
                  {dashboard?.today?.count || 0} sales
                </Text>
              </View>

              <View style={styles.revenueRow}>
                <View style={styles.revenueCard}>
                  <View style={styles.revenueCardHeader}>
                    <Ionicons name="calendar-outline" size={18} color="#6c757d" />
                    <Text style={styles.revenueCardLabelSmall}>This Week</Text>
                  </View>
                  <Text style={styles.revenueCardValueSmall}>
                    {formatPrice(dashboard?.this_week?.revenue)}
                  </Text>
                  <Text style={styles.revenueCardSubSmall}>
                    {dashboard?.this_week?.count || 0} sales
                  </Text>
                </View>
                <View style={styles.revenueCard}>
                  <View style={styles.revenueCardHeader}>
                    <Ionicons name="calendar-outline" size={18} color="#6c757d" />
                    <Text style={styles.revenueCardLabelSmall}>This Month</Text>
                  </View>
                  <Text style={styles.revenueCardValueSmall}>
                    {formatPrice(dashboard?.this_month?.revenue)}
                  </Text>
                  <Text style={styles.revenueCardSubSmall}>
                    {dashboard?.this_month?.count || 0} sales
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.actionsGrid}>
                {[
                  { icon: 'storefront-outline', label: 'Businesses', screen: 'Businesses', color: '#4361ee' },
                  { icon: 'cube-outline', label: 'Products', screen: 'ProductsManagement', color: '#FF6B00' },
                  { icon: 'people-outline', label: 'Employees', screen: 'EmployeesManagement', color: '#2ec4b6' },
                  { icon: 'bar-chart-outline', label: 'Reports', screen: 'Reports', color: '#9b59b6' },
                ].map((action, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.actionCard}
                    onPress={() => navigation.navigate(action.screen)}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: action.color + '15' }]}>
                      <Ionicons name={action.icon} size={24} color={action.color} />
                    </View>
                    <Text style={styles.actionLabel}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Low Stock Alerts */}
            {dashboard?.low_stock_alerts && dashboard.low_stock_alerts.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Low Stock Alerts</Text>
                  <View style={styles.alertBadge}>
                    <Text style={styles.alertBadgeText}>{dashboard.low_stock_alerts.length}</Text>
                  </View>
                </View>
                {dashboard.low_stock_alerts.map((alert, i) => (
                  <View key={i} style={styles.alertItem}>
                    <Ionicons name="warning-outline" size={18} color="#ffc107" />
                    <View style={styles.alertInfo}>
                      <Text style={styles.alertName}>{alert.product_name}</Text>
                      <Text style={styles.alertDetail}>
                        {alert.shop_name} • {alert.current_stock}/{alert.minimum_stock} units
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Recent Sales */}
            {dashboard?.recent_sales && dashboard.recent_sales.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Sales</Text>
                {dashboard.recent_sales.map((sale, i) => (
                  <View key={sale.id} style={styles.saleItem}>
                    <View style={styles.saleIcon}>
                      <Ionicons name="receipt-outline" size={18} color="#FF6B00" />
                    </View>
                    <View style={styles.saleInfo}>
                      <Text style={styles.saleReceipt}>{sale.receipt_number}</Text>
                      <Text style={styles.saleCustomer}>{sale.customer_name}</Text>
                    </View>
                    <View style={styles.saleRight}>
                      <Text style={styles.saleAmount}>{formatPrice(sale.total_amount)}</Text>
                      <Text style={styles.saleTime}>
                        {new Date(sale.sale_date).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {!dashboard && (
              <View style={styles.emptyDashboard}>
                <Ionicons name="analytics-outline" size={64} color="#dee2e6" />
                <Text style={styles.emptyText}>No sales data yet</Text>
                <Text style={styles.emptySubtext}>
                  Start making sales to see your dashboard come alive
                </Text>
              </View>
            )}

            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingTop: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e9ecef',
  },
  greeting: { fontSize: 14, color: '#6c757d' },
  userName: { fontSize: 22, fontWeight: '700', color: '#212529', marginTop: 2 },
  syncBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFF7F0',
    justifyContent: 'center', alignItems: 'center',
  },
  content: { flex: 1 },
  loadingContainer: { paddingVertical: 60, alignItems: 'center' },
  revenueSection: { padding: 12, gap: 8 },
  revenueCardPrimary: {
    backgroundColor: '#FF6B00', borderColor: '#FF6B00', padding: 20,
    borderRadius: 14, borderWidth: 0,
  },
  revenueRow: { flexDirection: 'row', gap: 8 },
  revenueCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#e9ecef',
  },
  revenueCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  revenueCardLabel: { fontSize: 13, color: '#FFD4B0', fontWeight: '600' },
  revenueCardLabelSmall: { fontSize: 12, color: '#6c757d', fontWeight: '500' },
  revenueCardValue: { fontSize: 28, fontWeight: '700', color: '#fff' },
  revenueCardValueSmall: { fontSize: 18, fontWeight: '700', color: '#212529' },
  revenueCardSub: { fontSize: 13, color: '#FFD4B0', marginTop: 4 },
  revenueCardSubSmall: { fontSize: 12, color: '#6c757d', marginTop: 2 },
  section: {
    backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 10,
    borderRadius: 12, padding: 16,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#212529', marginBottom: 12 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: {
    width: '47%', alignItems: 'center', paddingVertical: 16,
    borderRadius: 10, borderWidth: 1, borderColor: '#e9ecef',
  },
  actionIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 13, fontWeight: '600', color: '#495057' },
  alertBadge: {
    backgroundColor: '#ffc107', borderRadius: 12, minWidth: 22, height: 22,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6,
  },
  alertBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  alertItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  alertInfo: { flex: 1 },
  alertName: { fontSize: 14, fontWeight: '600', color: '#212529' },
  alertDetail: { fontSize: 12, color: '#6c757d', marginTop: 2 },
  saleItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  saleIcon: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFF7F0',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  saleInfo: { flex: 1 },
  saleReceipt: { fontSize: 13, fontWeight: '600', color: '#212529' },
  saleCustomer: { fontSize: 12, color: '#6c757d', marginTop: 2 },
  saleRight: { alignItems: 'flex-end' },
  saleAmount: { fontSize: 14, fontWeight: '700', color: '#FF6B00' },
  saleTime: { fontSize: 11, color: '#adb5bd', marginTop: 2 },
  emptyDashboard: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#6c757d', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#adb5bd', marginTop: 6, textAlign: 'center', paddingHorizontal: 40 },
});
