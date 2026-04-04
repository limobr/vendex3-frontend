// src/screens/shared/RestockItemsScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  SectionList,
  Alert,
  ActivityIndicator,
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import CustomHeaderWithButton from '../../components/CustomHeaderWithButton';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import databaseService from '../../database';

const RestockItemsScreen = ({ navigation, route }) => {
  const { currentShop: contextShop } = useShop();
  const { shopId: paramShopId, shopName: paramShopName, businessId: paramBusinessId } = route.params || {};
  const currentShop = contextShop || (paramShopId ? { id: paramShopId, name: paramShopName, business_id: paramBusinessId } : null);

  const { user, authToken, apiUrl } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState([]);
  const [groupedData, setGroupedData] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalQuantity, setModalQuantity] = useState('');
  const [modalSupplier, setModalSupplier] = useState('');
  const [modalReference, setModalReference] = useState('');
  const [lastSync, setLastSync] = useState(null);
  const syncInProgress = useRef(false); // Prevent multiple syncs

  // Check network
  const checkNetwork = async () => {
    try {
      const state = await NetInfo.fetch();
      return state.isConnected && state.isInternetReachable;
    } catch {
      return false;
    }
  };

  // Fetch products from local DB (always immediate)
  const fetchProducts = useCallback(async () => {
    if (!currentShop) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Load local products first
      const localProducts = await databaseService.ProductService.getProductsWithInventoryForShop(currentShop.id);
      setProducts(localProducts);
      setLoading(false); // 👈 Important: stop loading immediately

      // Then, if online, sync in background without blocking
      const isOnline = await checkNetwork();
      if (isOnline && !syncInProgress.current) {
        syncInProgress.current = true;
        // Run sync without awaiting (fire and forget)
        syncFromServer().finally(() => {
          syncInProgress.current = false;
        });
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Error', 'Could not load products. Please try again.');
      setLoading(false);
    }
  }, [currentShop]);

  // Sync products and inventory from server (background)
  const syncFromServer = async () => {
    if (!currentShop) return;

    try {
      // Add timeout to the fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const url = `${apiUrl}/products/list/?shop_id=${currentShop.id}&include_variants=true`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${authToken}` },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const result = await response.json();

      if (result.success && result.products) {
        // Save to local DB
        await databaseService.ProductService.saveProductsFromServer(result.products, currentShop.id);
        // Refresh local products (only if we still have the same shop)
        const updated = await databaseService.ProductService.getProductsWithInventoryForShop(currentShop.id);
        setProducts(updated);
        setLastSync(new Date().toISOString());
      } else if (result.error) {
        console.warn('Sync failed:', result.error);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('Sync request timed out');
      } else {
        console.error('Sync error:', error);
      }
    }
  };

  // Build grouped data when products or filters change
  useEffect(() => {
    const groups = [];
    let filtered = [...products];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((p) => {
        const matchesProduct =
          p.name.toLowerCase().includes(query) ||
          (p.base_sku && p.base_sku.toLowerCase().includes(query)) ||
          (p.base_barcode && p.base_barcode.toLowerCase().includes(query));
        if (matchesProduct) return true;
        if (p.variants) {
          return p.variants.some(
            (v) =>
              (v.name && v.name.toLowerCase().includes(query)) ||
              (v.sku && v.sku.toLowerCase().includes(query)) ||
              (v.barcode && v.barcode.toLowerCase().includes(query))
          );
        }
        return false;
      });
    }

    // Low stock filter
    if (filterLowStock) {
      filtered = filtered.filter((p) => {
        if (p.has_variants) {
          return p.variants?.some((v) => (v.current_stock || 0) <= (p.reorder_level || 0));
        } else {
          return (p.current_stock || 0) <= (p.reorder_level || 0);
        }
      });
    }

    // Build sections
    for (const product of filtered) {
      const section = { title: product.name, data: [] };
      if (product.has_variants && product.variants?.length) {
        section.data = product.variants.map((variant) => ({
          id: `variant_${variant.id}`,
          type: 'variant',
          name: variant.name || product.name,
          sku: variant.sku,
          barcode: variant.barcode,
          currentStock: variant.current_stock || 0,
          productId: product.id,
          variantId: variant.id,
          reorderLevel: product.reorder_level || 0,
        }));
      } else {
        section.data = [
          {
            id: `product_${product.id}`,
            type: 'product',
            name: product.name,
            sku: product.base_sku,
            barcode: product.base_barcode,
            currentStock: product.current_stock || 0,
            productId: product.id,
            variantId: null,
            reorderLevel: product.reorder_level || 0,
          },
        ];
      }
      groups.push(section);
    }

    setGroupedData(groups);
  }, [products, searchQuery, filterLowStock]);

  // Quantity updates
  const updateQuantity = (itemId, value) => {
    setQuantities((prev) => ({
      ...prev,
      [itemId]: value === '' ? '' : parseInt(value, 10),
    }));
  };

  // Open modal
  const openModal = (item) => {
    setSelectedItem(item);
    setModalQuantity(quantities[item.id]?.toString() || '');
    setModalSupplier('');
    setModalReference('');
    setModalVisible(true);
  };

  // Submit single item
  const submitSingleItem = async () => {
    if (!selectedItem) return;
    const qty = parseInt(modalQuantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a positive number.');
      return;
    }

    await submitStockUpdates([
      {
        itemId: selectedItem.id,
        productId: selectedItem.productId,
        variantId: selectedItem.variantId,
        quantity: qty,
        supplier: modalSupplier,
        reference: modalReference,
      },
    ]);

    setModalVisible(false);
  };

  // Submit all pending quantities
  const submitAll = async () => {
    const updates = [];
    for (const section of groupedData) {
      for (const item of section.data) {
        const qty = quantities[item.id];
        if (qty && qty > 0) {
          updates.push({
            itemId: item.id,
            productId: item.productId,
            variantId: item.variantId,
            quantity: qty,
            supplier: '',
            reference: '',
          });
        }
      }
    }

    if (updates.length === 0) {
      Alert.alert('No Changes', 'No quantities entered to restock.');
      return;
    }

    await submitStockUpdates(updates);
  };

  // Submit to server and update local DB
  const submitStockUpdates = async (updates) => {
    setSubmitting(true);
    const payload = updates.map((u) => ({
      product_id: u.productId,
      variant_id: u.variantId,
      quantity: u.quantity,
      supplier: u.supplier,
      reference: u.reference,
      shop_id: currentShop.id,
    }));

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const url = `${apiUrl}/products/restock/`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const result = await response.json();

      if (result.success) {
        // Update local inventory
        for (const update of updates) {
          let currentStock = 0;
          for (const section of groupedData) {
            const item = section.data.find((i) => i.id === update.itemId);
            if (item) {
              currentStock = item.currentStock;
              break;
            }
          }
          const newStock = currentStock + update.quantity;
          await databaseService.ProductService.updateInventory(
            update.productId,
            update.variantId,
            currentShop.id,
            newStock
          );
        }

        // Clear quantities for submitted items
        const newQuantities = { ...quantities };
        updates.forEach((u) => delete newQuantities[u.itemId]);
        setQuantities(newQuantities);

        // Refresh data
        await fetchProducts(); // re-fetch local products (which will include the updated stock)
        Alert.alert('Success', `Restocked ${updates.length} item(s).`);
      } else {
        Alert.alert('Error', result.error || 'Failed to restock.');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        Alert.alert('Timeout', 'The request took too long. Please check your internet connection.');
      } else {
        console.error('Submit error:', error);
        Alert.alert('Error', 'Network error. Please try again later.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Barcode scanner simulation
  const handleBarcodeScan = () => {
    Alert.prompt(
      'Scan Barcode',
      'Enter or scan the barcode:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK', onPress: (barcode) => setSearchQuery(barcode) },
      ],
      'plain-text'
    );
  };

  // Render header
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, SKU, barcode..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleBarcodeScan} style={styles.scanButton}>
          <Ionicons name="camera" size={20} color="#FF6B00" />
        </TouchableOpacity>
      </View>
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterChip, filterLowStock && styles.filterChipActive]}
          onPress={() => setFilterLowStock(!filterLowStock)}
        >
          <Ionicons
            name="alert-circle"
            size={16}
            color={filterLowStock ? '#FF6B00' : '#6B7280'}
          />
          <Text style={[styles.filterChipText, filterLowStock && styles.filterChipTextActive]}>
            Low Stock
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render each item row
  const renderItem = ({ item }) => {
    const isLowStock = item.currentStock <= item.reorderLevel;
    const quantityValue = quantities[item.id] || '';

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <View style={styles.itemMeta}>
            {item.sku && <Text style={styles.itemMetaText}>SKU: {item.sku}</Text>}
            {item.barcode && <Text style={styles.itemMetaText}>Barcode: {item.barcode}</Text>}
          </View>
          <View style={styles.stockRow}>
            <Text style={[styles.stockLabel, isLowStock && styles.lowStockLabel]}>
              Current Stock: {item.currentStock}
            </Text>
            {isLowStock && <Text style={styles.lowStockBadge}>Low Stock</Text>}
          </View>
        </View>
        <View style={styles.itemActions}>
          <TextInput
            style={styles.quantityInput}
            keyboardType="numeric"
            placeholder="Qty"
            value={quantityValue.toString()}
            onChangeText={(text) => updateQuantity(item.id, text)}
          />
          <TouchableOpacity style={styles.moreButton} onPress={() => openModal(item)}>
            <Ionicons name="options-outline" size={20} color="#FF6B00" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  // Initial load
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomHeaderWithButton
          title="Restock Items"
          leftButtonIcon="arrow-back"
          leftButtonAction={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeaderWithButton
        title="Restock Items"
        leftButtonIcon="arrow-back"
        leftButtonAction={() => navigation.goBack()}
        rightButtonIcon="checkmark"
        rightButtonAction={submitAll}
        rightButtonDisabled={submitting}
      />

      {groupedData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>
            {searchQuery || filterLowStock ? 'No matching items found' : 'No products available'}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchQuery || filterLowStock
              ? 'Try a different search or clear filters'
              : 'Please add products to this shop first'}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={groupedData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          ListHeaderComponent={renderHeader}
          stickySectionHeadersEnabled
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await fetchProducts();
                setRefreshing(false);
              }}
              colors={['#FF6B00']}
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Restock {selectedItem?.name}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Quantity *</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={modalQuantity}
                onChangeText={setModalQuantity}
                placeholder="Enter quantity"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Supplier (optional)</Text>
              <TextInput
                style={styles.modalInput}
                value={modalSupplier}
                onChangeText={setModalSupplier}
                placeholder="Supplier name"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Reference (optional)</Text>
              <TextInput
                style={styles.modalInput}
                value={modalReference}
                onChangeText={setModalReference}
                placeholder="PO number, invoice, etc."
              />
            </View>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={submitSingleItem}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.modalButtonText}>Add Stock</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6B7280' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8 },
  headerContainer: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16, color: '#1F2937' },
  scanButton: { padding: 4, marginLeft: 8 },
  filterContainer: { flexDirection: 'row', marginTop: 12 },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  filterChipActive: { backgroundColor: '#FFF7F0' },
  filterChipText: { fontSize: 14, color: '#6B7280', marginLeft: 6 },
  filterChipTextActive: { color: '#FF6B00', fontWeight: '500' },
  listContent: { paddingBottom: 80 },
  sectionHeader: { backgroundColor: '#F9FAFB', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  itemCard: { backgroundColor: '#FFFFFF', borderRadius: 12, marginHorizontal: 16, marginVertical: 6, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  itemMeta: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  itemMetaText: { fontSize: 12, color: '#6B7280', marginRight: 12 },
  stockRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  stockLabel: { fontSize: 14, color: '#6B7280' },
  lowStockLabel: { color: '#EF4444', fontWeight: '500' },
  lowStockBadge: { backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginLeft: 8, fontSize: 12, color: '#EF4444', fontWeight: '500' },
  itemActions: { flexDirection: 'row', alignItems: 'center' },
  quantityInput: { width: 70, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, textAlign: 'center', backgroundColor: '#F9FAFB', marginRight: 8 },
  moreButton: { padding: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '600', color: '#1F2937' },
  modalField: { marginBottom: 16 },
  modalLabel: { fontSize: 14, fontWeight: '500', color: '#6B7280', marginBottom: 6 },
  modalInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: '#1F2937', backgroundColor: '#F9FAFB' },
  modalButton: { backgroundColor: '#FF6B00', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  modalButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});

export default RestockItemsScreen;