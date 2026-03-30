// src/screens/manager/ReportsScreen.js - Manager reports (scoped to shop)
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { salesAPI } from '../../services/api';

export default function ManagerReportsScreen() {
  const { currentShop } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('daily');

  const shopId = currentShop?.id || currentShop?.server_id;

  useEffect(() => { loadReport(); }, [period]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const result = await salesAPI.getReports({ shop_id: shopId, period });
      if (result?.success) setReport(result.report);
    } catch (e) {
      console.error('Manager report error:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (p) => `KES ${parseFloat(p || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Shop Reports</Text>
        {currentShop && <Text style={styles.shopName}>{currentShop.name}</Text>}
      </View>

      <View style={styles.periodRow}>
        {['daily', 'weekly', 'monthly'].map(p => (
          <TouchableOpacity key={p} style={[styles.periodBtn, period === p && styles.periodBtnActive]} onPress={() => setPeriod(p)}>
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={false} onRefresh={loadReport} colors={['#FF6B00']} />}>
        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color="#FF6B00" /></View>
        ) : report?.summary ? (
          <>
            <View style={styles.summaryGrid}>
              <View style={[styles.summaryCard, { backgroundColor: '#FF6B00' }]}>
                <Text style={{ color: '#FFD4B0', fontSize: 12 }}>Revenue</Text>
                <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>{formatPrice(report.summary.total_revenue)}</Text>
                <Text style={{ color: '#FFD4B0', fontSize: 12 }}>{report.summary.sale_count} sales</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={{ color: '#6c757d', fontSize: 12 }}>Avg Sale</Text>
                <Text style={{ color: '#212529', fontSize: 18, fontWeight: '700' }}>{formatPrice(report.summary.average_sale)}</Text>
              </View>
            </View>

            {report.top_products?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top Products</Text>
                {report.top_products.slice(0, 5).map((p, i) => (
                  <View key={p.product_id} style={styles.listItem}>
                    <Text style={styles.rank}>{i + 1}.</Text>
                    <Text style={styles.itemName}>{p.name}</Text>
                    <Text style={styles.itemValue}>{formatPrice(p.revenue)}</Text>
                  </View>
                ))}
              </View>
            )}

            {report.employee_performance?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Employee Performance</Text>
                {report.employee_performance.map(e => (
                  <View key={e.id} style={styles.listItem}>
                    <Ionicons name="person-outline" size={16} color="#6c757d" />
                    <Text style={styles.itemName}>{e.name}</Text>
                    <Text style={styles.itemValue}>{e.count} sales · {formatPrice(e.revenue)}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={styles.center}>
            <Ionicons name="bar-chart-outline" size={64} color="#dee2e6" />
            <Text style={{ color: '#6c757d', marginTop: 12 }}>No report data available</Text>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e9ecef' },
  title: { fontSize: 22, fontWeight: '700', color: '#212529' },
  shopName: { fontSize: 13, color: '#6c757d', marginTop: 2 },
  periodRow: { flexDirection: 'row', padding: 12, gap: 8 },
  periodBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center', borderWidth: 1, borderColor: '#e9ecef' },
  periodBtnActive: { backgroundColor: '#FF6B00', borderColor: '#FF6B00' },
  periodText: { fontSize: 13, fontWeight: '600', color: '#495057' },
  periodTextActive: { color: '#fff' },
  content: { flex: 1 },
  summaryGrid: { flexDirection: 'row', padding: 12, gap: 8 },
  summaryCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e9ecef' },
  section: { backgroundColor: '#fff', margin: 12, borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#212529', marginBottom: 12 },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 8 },
  rank: { fontSize: 14, fontWeight: '700', color: '#FF6B00', width: 24 },
  itemName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#212529' },
  itemValue: { fontSize: 13, fontWeight: '600', color: '#6c757d' },
});
