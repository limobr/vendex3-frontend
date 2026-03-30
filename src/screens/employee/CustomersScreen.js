// src/screens/employee/CustomersScreen.js - Full implementation
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Modal, ScrollView, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { customerAPI } from '../../services/api';

export default function CustomersScreen() {
  const { user, currentShop } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone_number: '', email: '', address: '' });
  const [saving, setSaving] = useState(false);

  const businessId = currentShop?.business_id;

  useEffect(() => { if (businessId) loadCustomers(); }, [businessId]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const result = await customerAPI.getCustomers(businessId, searchQuery);
      if (result?.success) setCustomers(result.customers || []);
    } catch (e) {
      console.error('Error loading customers:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadCustomerDetail = async (customerId) => {
    try {
      const result = await customerAPI.getCustomerDetail(customerId);
      if (result?.success) {
        setSelectedCustomer(result.customer);
        setShowDetailModal(true);
      }
    } catch (e) {
      console.error('Error loading customer:', e);
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim()) {
      Alert.alert('Required', 'Customer name is required');
      return;
    }
    try {
      setSaving(true);
      const result = await customerAPI.createCustomer({
        business_id: businessId,
        ...newCustomer,
      });
      if (result?.success) {
        setShowAddModal(false);
        setNewCustomer({ name: '', phone_number: '', email: '', address: '' });
        loadCustomers();
        Alert.alert('Success', 'Customer added successfully');
      } else {
        Alert.alert('Error', result?.error || 'Failed to add customer');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to add customer');
    } finally {
      setSaving(false);
    }
  };

  const formatPrice = (p) => `KES ${parseFloat(p || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

  const getLoyaltyTier = (points) => {
    if (points >= 1000) return { name: 'Gold', color: '#FFD700', icon: 'star' };
    if (points >= 500) return { name: 'Silver', color: '#C0C0C0', icon: 'star-half' };
    if (points >= 100) return { name: 'Bronze', color: '#CD7F32', icon: 'star-outline' };
    return { name: 'New', color: '#6c757d', icon: 'person-outline' };
  };

  const renderCustomerCard = ({ item: c }) => {
    const tier = getLoyaltyTier(c.loyalty_points);
    return (
      <TouchableOpacity style={styles.customerCard} onPress={() => loadCustomerDetail(c.id)} activeOpacity={0.7}>
        <View style={[styles.avatar, { backgroundColor: tier.color + '30' }]}>
          <Ionicons name={tier.icon} size={24} color={tier.color} />
        </View>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{c.name}</Text>
          {c.phone_number && (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={12} color="#6c757d" />
              <Text style={styles.customerDetail}>{c.phone_number}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Ionicons name="wallet-outline" size={12} color="#6c757d" />
            <Text style={styles.customerDetail}>Spent: {formatPrice(c.total_spent)}</Text>
          </View>
        </View>
        <View style={styles.loyaltyBadge}>
          <Text style={[styles.loyaltyPoints, { color: tier.color }]}>{c.loyalty_points}</Text>
          <Text style={styles.loyaltyLabel}>pts</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Customers</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#adb5bd" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search customers..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={loadCustomers}
          returnKeyType="search"
          placeholderTextColor="#adb5bd"
        />
      </View>

      {/* Customer List */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#FF6B00" /></View>
      ) : customers.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={64} color="#dee2e6" />
          <Text style={styles.emptyText}>No customers yet</Text>
          <TouchableOpacity style={styles.addFirstBtn} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add-circle-outline" size={20} color="#FF6B00" />
            <Text style={styles.addFirstText}>Add First Customer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          renderItem={renderCustomerCard}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadCustomers(); }} colors={['#FF6B00']} />}
        />
      )}

      {/* Add Customer Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color="#212529" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Customer</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.inputLabel}>Name *</Text>
            <TextInput style={styles.input} placeholder="Customer name" value={newCustomer.name} onChangeText={v => setNewCustomer(p => ({ ...p, name: v }))} placeholderTextColor="#adb5bd" />

            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput style={styles.input} placeholder="07XXXXXXXX" keyboardType="phone-pad" value={newCustomer.phone_number} onChangeText={v => setNewCustomer(p => ({ ...p, phone_number: v }))} placeholderTextColor="#adb5bd" />

            <Text style={styles.inputLabel}>Email</Text>
            <TextInput style={styles.input} placeholder="email@example.com" keyboardType="email-address" value={newCustomer.email} onChangeText={v => setNewCustomer(p => ({ ...p, email: v }))} placeholderTextColor="#adb5bd" autoCapitalize="none" />

            <Text style={styles.inputLabel}>Address</Text>
            <TextInput style={[styles.input, { height: 80 }]} placeholder="Physical address" multiline value={newCustomer.address} onChangeText={v => setNewCustomer(p => ({ ...p, address: v }))} placeholderTextColor="#adb5bd" />
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleAddCustomer} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Add Customer</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Customer Detail Modal */}
      <Modal visible={showDetailModal} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowDetailModal(false); setSelectedCustomer(null); }}>
              <Ionicons name="close" size={24} color="#212529" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Customer Profile</Text>
            <View style={{ width: 24 }} />
          </View>
          {selectedCustomer && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.profileHeader}>
                <View style={[styles.profileAvatar, { backgroundColor: getLoyaltyTier(selectedCustomer.loyalty_points).color + '30' }]}>
                  <Ionicons name="person" size={40} color={getLoyaltyTier(selectedCustomer.loyalty_points).color} />
                </View>
                <Text style={styles.profileName}>{selectedCustomer.name}</Text>
                <View style={styles.tierBadge}>
                  <Text style={styles.tierText}>{getLoyaltyTier(selectedCustomer.loyalty_points).name} Member</Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{selectedCustomer.loyalty_points}</Text>
                  <Text style={styles.statLabel}>Points</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{formatPrice(selectedCustomer.total_spent)}</Text>
                  <Text style={styles.statLabel}>Total Spent</Text>
                </View>
              </View>

              {selectedCustomer.phone_number && (
                <View style={styles.detailRow}>
                  <Ionicons name="call-outline" size={18} color="#6c757d" />
                  <Text style={styles.detailText}>{selectedCustomer.phone_number}</Text>
                </View>
              )}
              {selectedCustomer.email && (
                <View style={styles.detailRow}>
                  <Ionicons name="mail-outline" size={18} color="#6c757d" />
                  <Text style={styles.detailText}>{selectedCustomer.email}</Text>
                </View>
              )}
              {selectedCustomer.address && (
                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={18} color="#6c757d" />
                  <Text style={styles.detailText}>{selectedCustomer.address}</Text>
                </View>
              )}

              {/* Purchase History */}
              {selectedCustomer.purchase_history && selectedCustomer.purchase_history.length > 0 && (
                <View style={styles.purchaseSection}>
                  <Text style={styles.purchaseSectionTitle}>Recent Purchases</Text>
                  {selectedCustomer.purchase_history.map(p => (
                    <View key={p.id} style={styles.purchaseItem}>
                      <View>
                        <Text style={styles.purchaseReceipt}>{p.receipt_number}</Text>
                        <Text style={styles.purchaseDate}>
                          {new Date(p.sale_date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                      </View>
                      <Text style={styles.purchaseAmount}>{formatPrice(p.total_amount)}</Text>
                    </View>
                  ))}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e9ecef' },
  title: { fontSize: 22, fontWeight: '700', color: '#212529' },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FF6B00', justifyContent: 'center', alignItems: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 12, borderRadius: 8, paddingHorizontal: 12, height: 40, borderWidth: 1, borderColor: '#e9ecef', gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#212529' },
  list: { padding: 12 },
  customerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e9ecef' },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 15, fontWeight: '600', color: '#212529', marginBottom: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  customerDetail: { fontSize: 12, color: '#6c757d' },
  loyaltyBadge: { alignItems: 'center' },
  loyaltyPoints: { fontSize: 18, fontWeight: '700' },
  loyaltyLabel: { fontSize: 10, color: '#6c757d' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#6c757d' },
  addFirstBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: '#FFF7F0' },
  addFirstText: { fontSize: 14, fontWeight: '600', color: '#FF6B00' },
  // Modal
  modalContainer: { flex: 1, backgroundColor: '#f8f9fa' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e9ecef' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#212529' },
  modalContent: { flex: 1, padding: 16 },
  modalFooter: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e9ecef' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#495057', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 15, color: '#212529', borderWidth: 1, borderColor: '#e9ecef' },
  saveBtn: { backgroundColor: '#FF6B00', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Profile
  profileHeader: { alignItems: 'center', paddingVertical: 20 },
  profileAvatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  profileName: { fontSize: 22, fontWeight: '700', color: '#212529' },
  tierBadge: { marginTop: 6, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: '#FFF7F0' },
  tierText: { fontSize: 12, fontWeight: '600', color: '#FF6B00' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#e9ecef' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#FF6B00' },
  statLabel: { fontSize: 11, color: '#6c757d', marginTop: 2 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', padding: 14, borderRadius: 8, marginBottom: 6 },
  detailText: { fontSize: 14, color: '#212529' },
  purchaseSection: { marginTop: 16 },
  purchaseSectionTitle: { fontSize: 16, fontWeight: '700', color: '#212529', marginBottom: 10 },
  purchaseItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 6, borderWidth: 1, borderColor: '#e9ecef' },
  purchaseReceipt: { fontSize: 13, fontWeight: '600', color: '#212529' },
  purchaseDate: { fontSize: 11, color: '#6c757d', marginTop: 2 },
  purchaseAmount: { fontSize: 14, fontWeight: '700', color: '#FF6B00' },
});
