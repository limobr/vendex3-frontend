// src/screens/owner/ReportsScreen.js - Real reporting with API data
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { salesAPI } from '../../services/api';

export default function ReportsScreen() {
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('daily');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadReport(); }, [period]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const result = await salesAPI.getReports({ period });
      if (result?.success) setReport(result.report);
    } catch (e) {
      console.error('Report error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatPrice = (p) => `KES ${parseFloat(p || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

  const periods = [
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
  ];

  if (loading && !report) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color="#FF6B00" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reports</Text>
      </View>

      {/* Period Selector */}
      <View style={styles.periodRow}>
        {periods.map(p => (
          <TouchableOpacity
            key={p.id}
            style={[styles.periodBtn, period === p.id && styles.periodBtnActive]}
            onPress={() => setPeriod(p.id)}
          >
            <Text style={[styles.periodText, period === p.id && styles.periodTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadReport(); }} colors={['#FF6B00']} />}
      >
        {/* Summary Cards */}
        {report?.summary && (
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryCard, styles.summaryCardPrimary]}>
              <Ionicons name="cash-outline" size={24} color="#fff" />
              <Text style={styles.summaryValueWhite}>{formatPrice(report.summary.total_revenue)}</Text>
              <Text style={styles.summaryLabelWhite}>Total Revenue</Text>
            </View>
            <View style={styles.summaryCard}>
              <Ionicons name="receipt-outline" size={22} color="#FF6B00" />
              <Text style={styles.summaryValue}>{report.summary.sale_count}</Text>
              <Text style={styles.summaryLabel}>Sales</Text>
            </View>
            <View style={styles.summaryCard}>
              <Ionicons name="trending-up-outline" size={22} color="#28a745" />
              <Text style={styles.summaryValue}>{formatPrice(report.summary.average_sale)}</Text>
              <Text style={styles.summaryLabel}>Avg Sale</Text>
            </View>
            <View style={styles.summaryCard}>
              <Ionicons name="pricetag-outline" size={22} color="#6c757d" />
              <Text style={styles.summaryValue}>{formatPrice(report.summary.total_discount)}</Text>
              <Text style={styles.summaryLabel}>Discounts</Text>
            </View>
          </View>
        )}

        {/* Top Products */}
        {report?.top_products && report.top_products.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Products</Text>
            {report.top_products.map((p, i) => (
              <View key={p.product_id} style={styles.rankItem}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankNumber}>{i + 1}</Text>
                </View>
                <View style={styles.rankInfo}>
                  <Text style={styles.rankName}>{p.name}</Text>
                  <Text style={styles.rankDetail}>{p.qty} sold</Text>
                </View>
                <Text style={styles.rankRevenue}>{formatPrice(p.revenue)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Payment Breakdown */}
        {report?.payment_breakdown && report.payment_breakdown.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Methods</Text>
            {report.payment_breakdown.map(p => (
              <View key={p.method} style={styles.paymentRow}>
                <View style={styles.paymentLeft}>
                  <Ionicons
                    name={p.method === 'cash' ? 'cash-outline' : p.method === 'mpesa' ? 'phone-portrait-outline' : 'card-outline'}
                    size={20} color="#FF6B00"
                  />
                  <Text style={styles.paymentMethod}>{p.method.charAt(0).toUpperCase() + p.method.slice(1)}</Text>
                  <Text style={styles.paymentCount}>{p.count} txns</Text>
                </View>
                <Text style={styles.paymentTotal}>{formatPrice(p.total)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Employee Performance */}
        {report?.employee_performance && report.employee_performance.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Employee Performance</Text>
            {report.employee_performance.map(e => (
              <View key={e.id} style={styles.empRow}>
                <View style={styles.empAvatar}>
                  <Ionicons name="person-outline" size={18} color="#6c757d" />
                </View>
                <View style={styles.empInfo}>
                  <Text style={styles.empName}>{e.name || 'Unknown'}</Text>
                  <Text style={styles.empDetail}>{e.count} sales</Text>
                </View>
                <Text style={styles.empRevenue}>{formatPrice(e.revenue)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e9ecef' },
  title: { fontSize: 22, fontWeight: '700', color: '#212529' },
  periodRow: { flexDirection: 'row', padding: 12, gap: 8 },
  periodBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center', borderWidth: 1, borderColor: '#e9ecef' },
  periodBtnActive: { backgroundColor: '#FF6B00', borderColor: '#FF6B00' },
  periodText: { fontSize: 13, fontWeight: '600', color: '#495057' },
  periodTextActive: { color: '#fff' },
  content: { flex: 1 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8, gap: 8 },
  summaryCard: { width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e9ecef' },
  summaryCardPrimary: { backgroundColor: '#FF6B00', borderColor: '#FF6B00', width: '97%' },
  summaryValue: { fontSize: 20, fontWeight: '700', color: '#212529', marginTop: 8 },
  summaryValueWhite: { fontSize: 24, fontWeight: '700', color: '#fff', marginTop: 8 },
  summaryLabel: { fontSize: 12, color: '#6c757d', marginTop: 2 },
  summaryLabelWhite: { fontSize: 12, color: '#FFD4B0', marginTop: 2 },
  section: { backgroundColor: '#fff', margin: 12, marginBottom: 0, borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#212529', marginBottom: 12 },
  rankItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  rankBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFF7F0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rankNumber: { fontSize: 13, fontWeight: '700', color: '#FF6B00' },
  rankInfo: { flex: 1 },
  rankName: { fontSize: 14, fontWeight: '600', color: '#212529' },
  rankDetail: { fontSize: 12, color: '#6c757d' },
  rankRevenue: { fontSize: 14, fontWeight: '700', color: '#FF6B00' },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  paymentLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  paymentMethod: { fontSize: 14, fontWeight: '600', color: '#212529' },
  paymentCount: { fontSize: 12, color: '#6c757d' },
  paymentTotal: { fontSize: 14, fontWeight: '700', color: '#212529' },
  empRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  empAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  empInfo: { flex: 1 },
  empName: { fontSize: 14, fontWeight: '600', color: '#212529' },
  empDetail: { fontSize: 12, color: '#6c757d' },
  empRevenue: { fontSize: 14, fontWeight: '700', color: '#FF6B00' },
});
