// src/screens/employee/SalesHistoryScreen.js - Full implementation
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Modal, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { salesAPI } from '../../services/api';

export default function SalesHistoryScreen() {
  const { user, currentShop } = useAuth();
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleDetail, setSaleDetail] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const shopId = currentShop?.id || currentShop?.server_id;
  const isOwner = user?.user_type === 'owner';

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      setLoading(true);
      const params = { page: 1, page_size: 50 };
      if (shopId) params.shop_id = shopId;
      if (!isOwner) params.employee_only = true;
      if (searchQuery) params.search = searchQuery;

      const result = await salesAPI.getSales(params);
      if (result?.success) {
        setSales(result.sales || []);
        setSummary(result.summary || null);
      }
    } catch (e) {
      console.error('Error loading sales:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadSaleDetail = async (saleId) => {
    try {
      const result = await salesAPI.getSaleDetail(saleId);
      if (result?.success) {
        setSaleDetail(result.sale);
        setShowDetail(true);
      }
    } catch (e) {
      console.error('Error loading sale detail:', e);
    }
  };

  const formatPrice = (price) => `KES ${parseFloat(price || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#28a745';
      case 'pending': return '#ffc107';
      case 'refunded': return '#dc3545';
      case 'cancelled': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const renderSaleCard = ({ item: sale }) => (
    <TouchableOpacity style={styles.saleCard} onPress={() => loadSaleDetail(sale.id)} activeOpacity={0.7}>
      <View style={styles.saleCardHeader}>
        <Text style={styles.receiptNumber}>{sale.receipt_number}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(sale.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(sale.status) }]}>
            {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
          </Text>
        </View>
      </View>
      <View style={styles.saleCardBody}>
        <View style={styles.saleCardRow}>
          <Ionicons name="person-outline" size={14} color="#6c757d" />
          <Text style={styles.saleCardInfo}>{sale.customer_name}</Text>
        </View>
        <View style={styles.saleCardRow}>
          <Ionicons name="time-outline" size={14} color="#6c757d" />
          <Text style={styles.saleCardInfo}>{formatDate(sale.sale_date)}</Text>
        </View>
        <View style={styles.saleCardRow}>
          <Ionicons name="cube-outline" size={14} color="#6c757d" />
          <Text style={styles.saleCardInfo}>{sale.item_count} items</Text>
        </View>
      </View>
      <View style={styles.saleCardFooter}>
        <View style={styles.paymentBadges}>
          {(sale.payment_methods || []).map((m, i) => (
            <View key={i} style={styles.payBadge}>
              <Text style={styles.payBadgeText}>{m.charAt(0).toUpperCase() + m.slice(1)}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.saleAmount}>{formatPrice(sale.total_amount)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{isOwner ? 'All Sales' : 'My Sales'}</Text>
      </View>

      {/* Summary Cards */}
      {summary && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.sale_count}</Text>
            <Text style={styles.summaryLabel}>Sales</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardAccent]}>
            <Text style={[styles.summaryValue, { color: '#FF6B00' }]}>{formatPrice(summary.total_revenue)}</Text>
            <Text style={styles.summaryLabel}>Revenue</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{formatPrice(summary.average_sale)}</Text>
            <Text style={styles.summaryLabel}>Avg Sale</Text>
          </View>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#adb5bd" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by receipt or customer..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={loadSales}
          returnKeyType="search"
          placeholderTextColor="#adb5bd"
        />
      </View>

      {/* Sales List */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#FF6B00" /></View>
      ) : sales.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={64} color="#dee2e6" />
          <Text style={styles.emptyText}>No sales found</Text>
        </View>
      ) : (
        <FlatList
          data={sales}
          keyExtractor={(item) => item.id}
          renderItem={renderSaleCard}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadSales(); }} colors={['#FF6B00']} />}
        />
      )}

      {/* Sale Detail Modal */}
      <Modal visible={showDetail} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.detailModal}>
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={() => { setShowDetail(false); setSaleDetail(null); }}>
              <Ionicons name="close" size={24} color="#212529" />
            </TouchableOpacity>
            <Text style={styles.detailTitle}>{saleDetail?.receipt_number || 'Sale Detail'}</Text>
            <TouchableOpacity onPress={() => {}}>
              <Ionicons name="print-outline" size={24} color="#FF6B00" />
            </TouchableOpacity>
          </View>

          {saleDetail && (
            <ScrollView style={styles.detailContent}>
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Items</Text>
                {(saleDetail.items || []).map(item => (
                  <View key={item.id} style={styles.detailItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailItemName}>{item.product_name}</Text>
                      <Text style={styles.detailItemQty}>{item.quantity} × {formatPrice(item.unit_price)}</Text>
                    </View>
                    <Text style={styles.detailItemTotal}>{formatPrice(item.total_price)}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Payment</Text>
                {(saleDetail.payments || []).map(p => (
                  <View key={p.id} style={styles.detailPayment}>
                    <Text>{p.method.charAt(0).toUpperCase() + p.method.slice(1)}</Text>
                    <Text style={styles.detailPaymentAmount}>{formatPrice(p.amount)}</Text>
                  </View>
                ))}
                {saleDetail.change_given > 0 && (
                  <View style={styles.detailPayment}>
                    <Text>Change</Text>
                    <Text style={{ color: '#28a745', fontWeight: '600' }}>{formatPrice(saleDetail.change_given)}</Text>
                  </View>
                )}
              </View>

              <View style={styles.detailSection}>
                <View style={styles.detailTotalRow}>
                  <Text style={styles.detailTotalLabel}>Total</Text>
                  <Text style={styles.detailTotalValue}>{formatPrice(saleDetail.total_amount)}</Text>
                </View>
              </View>

              {saleDetail.customer && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Customer</Text>
                  <Text>{saleDetail.customer.name}</Text>
                  {saleDetail.customer.phone && <Text style={{ color: '#6c757d' }}>{saleDetail.customer.phone}</Text>}
                </View>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e9ecef' },
  title: { fontSize: 22, fontWeight: '700', color: '#212529' },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  summaryCard: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e9ecef' },
  summaryCardAccent: { borderColor: '#FFD4B0' },
  summaryValue: { fontSize: 16, fontWeight: '700', color: '#212529' },
  summaryLabel: { fontSize: 11, color: '#6c757d', marginTop: 2 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 12, marginBottom: 0, borderRadius: 8, paddingHorizontal: 12, height: 40, borderWidth: 1, borderColor: '#e9ecef', gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#212529' },
  list: { padding: 12 },
  saleCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e9ecef' },
  saleCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  receiptNumber: { fontSize: 14, fontWeight: '700', color: '#212529' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },
  saleCardBody: { gap: 4, marginBottom: 8 },
  saleCardRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  saleCardInfo: { fontSize: 12, color: '#6c757d' },
  saleCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 8 },
  paymentBadges: { flexDirection: 'row', gap: 4 },
  payBadge: { backgroundColor: '#e9ecef', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  payBadgeText: { fontSize: 10, fontWeight: '600', color: '#495057' },
  saleAmount: { fontSize: 16, fontWeight: '700', color: '#FF6B00' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 12, color: '#6c757d', fontSize: 16 },
  // Detail Modal
  detailModal: { flex: 1, backgroundColor: '#f8f9fa' },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e9ecef' },
  detailTitle: { fontSize: 16, fontWeight: '700', color: '#212529' },
  detailContent: { flex: 1, padding: 12 },
  detailSection: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10 },
  detailSectionTitle: { fontSize: 14, fontWeight: '700', color: '#212529', marginBottom: 10 },
  detailItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  detailItemName: { fontSize: 14, fontWeight: '600', color: '#212529' },
  detailItemQty: { fontSize: 12, color: '#6c757d' },
  detailItemTotal: { fontSize: 14, fontWeight: '600', color: '#212529' },
  detailPayment: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  detailPaymentAmount: { fontWeight: '600' },
  detailTotalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailTotalLabel: { fontSize: 18, fontWeight: '700', color: '#212529' },
  detailTotalValue: { fontSize: 22, fontWeight: '700', color: '#FF6B00' },
});
