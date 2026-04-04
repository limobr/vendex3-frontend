// src/screens/shared/InventoryScreen.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomHeader from '../../components/CustomHeader';
import { useShop } from '../../context/ShopContext';
import databaseService from '../../database';

const MOCK_SUMMARY = {
  totalProducts: 150,
  totalVariants: 320,
  lowStockItems: 12,
  outOfStockItems: 5,
};

const tabs = [
  { key: 'products', label: 'Products' },
  { key: 'variants', label: 'Variants' },
  { key: 'stock', label: 'Stock' },
  { key: 'movements', label: 'Movements' },
  { key: 'categories', label: 'Categories' },
  { key: 'prices', label: 'Prices' },
];

// ==================== MOCK DATA ====================
const productData = [
  { id: '1', name: 'Espresso', price: 3.5, stock: 45, category: 'Beverages' },
  { id: '2', name: 'Cappuccino', price: 4.0, stock: 32, category: 'Beverages' },
  { id: '3', name: 'Croissant', price: 2.5, stock: 8, category: 'Pastries' },
];

const variantData = [
  { id: '1', product: 'Espresso', variant: 'Small', sku: 'ESP-S', stock: 20, price: 3.5 },
  { id: '2', product: 'Espresso', variant: 'Large', sku: 'ESP-L', stock: 25, price: 4.5 },
  { id: '3', product: 'Cappuccino', variant: 'Small', sku: 'CAP-S', stock: 15, price: 4.0 },
];

const stockData = [
  { id: '1', name: 'Espresso', stock: 45, reorderLevel: 10 },
  { id: '2', name: 'Cappuccino', stock: 32, reorderLevel: 10 },
  { id: '3', name: 'Croissant', stock: 8, reorderLevel: 5 },
];

const movementsData = [
  { id: '1', date: '2025-04-01', type: 'Purchase', quantity: 50, reference: 'PO-123' },
  { id: '2', date: '2025-04-02', type: 'Sale', quantity: -5, reference: 'INV-456' },
  { id: '3', date: '2025-04-03', type: 'Adjustment', quantity: 10, reference: 'ADJ-789' },
];

const categoriesData = [
  { id: '1', name: 'Beverages', description: 'Hot and cold drinks', productCount: 12 },
  { id: '2', name: 'Pastries', description: 'Fresh baked goods', productCount: 8 },
];

const pricesData = [
  { id: '1', name: 'Espresso', price: 3.5, effectiveFrom: '2025-01-01' },
  { id: '2', name: 'Cappuccino', price: 4.0, effectiveFrom: '2025-01-01' },
];

// ==================== HELPER COMPONENTS ====================
const SummaryCard = ({ title, value, icon, color }) => (
  <View style={[styles.summaryCard, { borderLeftColor: color }]}>
    <View style={[styles.summaryIcon, { backgroundColor: `${color}20` }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text style={styles.summaryValue}>{value}</Text>
    <Text style={styles.summaryTitle}>{title}</Text>
  </View>
);

const ActionCard = ({ title, icon, onPress, color = '#FF6B00' }) => (
  <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.actionIconBg, { backgroundColor: `${color}20` }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text style={styles.actionTitle}>{title}</Text>
  </TouchableOpacity>
);

const TabBar = ({ tabs, activeTab, onTabPress }) => (
  <View style={styles.tabBar}>
    {tabs.map((tab) => (
      <TouchableOpacity
        key={tab.key}
        style={[styles.tab, activeTab === tab.key && styles.activeTab]}
        onPress={() => onTabPress(tab.key)}
      >
        <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

// Tab Content Components
const ProductsTab = () => (
  <View style={styles.tabContent}>
    <View style={styles.tableHeader}>
      <Text style={[styles.tableHeaderText, { flex: 2 }]}>Name</Text>
      <Text style={[styles.tableHeaderText, { flex: 1 }]}>Price</Text>
      <Text style={[styles.tableHeaderText, { flex: 1 }]}>Stock</Text>
      <Text style={[styles.tableHeaderText, { flex: 2 }]}>Category</Text>
    </View>
    <FlatList
      data={productData}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>{item.name}</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>${item.price}</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>{item.stock}</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>{item.category}</Text>
        </View>
      )}
      scrollEnabled={false}
    />
  </View>
);

const VariantsTab = () => (
  <View style={styles.tabContent}>
    <View style={styles.tableHeader}>
      <Text style={[styles.tableHeaderText, { flex: 2 }]}>Product</Text>
      <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Variant</Text>
      <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>SKU</Text>
      <Text style={[styles.tableHeaderText, { flex: 1 }]}>Stock</Text>
      <Text style={[styles.tableHeaderText, { flex: 1 }]}>Price</Text>
    </View>
    <FlatList data={variantData} keyExtractor={(item) => item.id} renderItem={({ item }) => (
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { flex: 2 }]}>{item.product}</Text>
        <Text style={[styles.tableCell, { flex: 1.5 }]}>{item.variant}</Text>
        <Text style={[styles.tableCell, { flex: 1.5 }]}>{item.sku}</Text>
        <Text style={[styles.tableCell, { flex: 1 }]}>{item.stock}</Text>
        <Text style={[styles.tableCell, { flex: 1 }]}>${item.price}</Text>
      </View>
    )} scrollEnabled={false} />
  </View>
);

const StockTab = () => (
  <View style={styles.tabContent}>
    <View style={styles.tableHeader}>
      <Text style={[styles.tableHeaderText, { flex: 2 }]}>Item</Text>
      <Text style={[styles.tableHeaderText, { flex: 1 }]}>Stock</Text>
      <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Reorder Level</Text>
    </View>
    <FlatList data={stockData} keyExtractor={(item) => item.id} renderItem={({ item }) => (
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { flex: 2 }]}>{item.name}</Text>
        <Text style={[styles.tableCell, { flex: 1 }]}>{item.stock}</Text>
        <Text style={[styles.tableCell, { flex: 1.5 }]}>{item.reorderLevel}</Text>
      </View>
    )} scrollEnabled={false} />
  </View>
);

const MovementsTab = () => (
  <View style={styles.tabContent}>
    <View style={styles.tableHeader}>
      <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Date</Text>
      <Text style={[styles.tableHeaderText, { flex: 1 }]}>Type</Text>
      <Text style={[styles.tableHeaderText, { flex: 1 }]}>Quantity</Text>
      <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Reference</Text>
    </View>
    <FlatList data={movementsData} keyExtractor={(item) => item.id} renderItem={({ item }) => (
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { flex: 1.5 }]}>{item.date}</Text>
        <Text style={[styles.tableCell, { flex: 1 }]}>{item.type}</Text>
        <Text style={[styles.tableCell, { flex: 1 }]}>{item.quantity}</Text>
        <Text style={[styles.tableCell, { flex: 1.5 }]}>{item.reference}</Text>
      </View>
    )} scrollEnabled={false} />
  </View>
);

const CategoriesTab = () => (
  <View style={styles.tabContent}>
    <View style={styles.tableHeader}>
      <Text style={[styles.tableHeaderText, { flex: 2 }]}>Name</Text>
      <Text style={[styles.tableHeaderText, { flex: 3 }]}>Description</Text>
      <Text style={[styles.tableHeaderText, { flex: 1 }]}>Products</Text>
    </View>
    <FlatList data={categoriesData} keyExtractor={(item) => item.id} renderItem={({ item }) => (
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { flex: 2 }]}>{item.name}</Text>
        <Text style={[styles.tableCell, { flex: 3 }]}>{item.description}</Text>
        <Text style={[styles.tableCell, { flex: 1 }]}>{item.productCount}</Text>
      </View>
    )} scrollEnabled={false} />
  </View>
);

const PricesTab = () => (
  <View style={styles.tabContent}>
    <View style={styles.tableHeader}>
      <Text style={[styles.tableHeaderText, { flex: 2 }]}>Product/Variant</Text>
      <Text style={[styles.tableHeaderText, { flex: 1 }]}>Price</Text>
      <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Effective From</Text>
    </View>
    <FlatList data={pricesData} keyExtractor={(item) => item.id} renderItem={({ item }) => (
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { flex: 2 }]}>{item.name}</Text>
        <Text style={[styles.tableCell, { flex: 1 }]}>${item.price}</Text>
        <Text style={[styles.tableCell, { flex: 1.5 }]}>{item.effectiveFrom}</Text>
      </View>
    )} scrollEnabled={false} />
  </View>
);

const tabComponents = {
  products: ProductsTab,
  variants: VariantsTab,
  stock: StockTab,
  movements: MovementsTab,
  categories: CategoriesTab,
  prices: PricesTab,
};

// ==================== MAIN SCREEN ====================
export default function InventoryScreen({ navigation }) {
  const { currentShop } = useShop();
  const [activeTab, setActiveTab] = useState('products');

  // No loading effect; if no shop, show selector
  if (!currentShop) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomHeader title="Inventory" />
        <View style={styles.noShopContainer}>
          <Ionicons name="storefront-outline" size={64} color="#D1D5DB" />
          <Text style={styles.noShopText}>No Shop Selected</Text>
          <Text style={styles.noShopSubtext}>
            Please select a shop to view inventory
          </Text>
          <TouchableOpacity
            style={styles.selectShopButton}
            onPress={() => navigation.navigate('ShopSelector')}
          >
            <Text style={styles.selectShopButtonText}>Select Shop</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const ActiveTabComponent = tabComponents[activeTab];

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader title="Inventory" />

      {/* Shop Info Bar */}
      <View style={styles.shopInfoBar}>
        <Ionicons name="storefront" size={20} color="#FF6B00" />
        <Text style={styles.shopName}>{currentShop.name}</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('ShopSelector')}
          style={styles.changeShopButton}
        >
          <Text style={styles.changeShopText}>Change</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <SummaryCard title="Total Products" value={MOCK_SUMMARY.totalProducts} icon="cube-outline" color="#FF6B00" />
          <SummaryCard title="Total Variants" value={MOCK_SUMMARY.totalVariants} icon="git-branch-outline" color="#3B82F6" />
          <SummaryCard title="Low Stock" value={MOCK_SUMMARY.lowStockItems} icon="alert-circle-outline" color="#F59E0B" />
          <SummaryCard title="Out of Stock" value={MOCK_SUMMARY.outOfStockItems} icon="close-circle-outline" color="#EF4444" />
        </View>

        {/* Quick Action Groups */}
        <View style={styles.actionGroup}>
          <Text style={styles.groupTitle}>📦 Product Management</Text>
          <View style={styles.actionGrid}>
            <ActionCard
              title="Add Product"
              icon="add-circle-outline"
              onPress={() => navigation.navigate('AddProduct', { shopId: currentShop.id })}
            />
            <ActionCard
              title="Manage Products"
              icon="list-outline"
              onPress={() => navigation.navigate('ShopProducts', { shopId: currentShop.id })}
            />
          </View>
        </View>

        <View style={styles.actionGroup}>
          <Text style={styles.groupTitle}>📊 Inventory Actions</Text>
          <View style={styles.actionGrid}>
            <ActionCard
              title="Restock Items"
              icon="cart-outline"
              onPress={() => navigation.navigate('RestockItems', {
                shopId: currentShop.id,
                shopName: currentShop.name,
                businessId: currentShop.business_id,
              })}
            />
            <ActionCard
              title="Update Stock"
              icon="refresh-outline"
              onPress={() => navigation.navigate('UpdateStock')}
            />
          </View>
        </View>

        <View style={styles.actionGroup}>
          <Text style={styles.groupTitle}>📈 Tracking</Text>
          <View style={styles.actionGrid}>
            <ActionCard
              title="Stock Movements"
              icon="swap-vertical-outline"
              onPress={() => navigation.navigate('StockMovements')}
            />
            <ActionCard
              title="Price History"
              icon="time-outline"
              onPress={() => navigation.navigate('PriceHistory')}
            />
          </View>
        </View>

        {/* Tabs Section */}
        <View style={styles.tabSection}>
          <TabBar tabs={tabs} activeTab={activeTab} onTabPress={setActiveTab} />
          {ActiveTabComponent && <ActiveTabComponent />}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6B7280' },

  shopInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFD7B5',
  },
  shopName: { flex: 1, fontSize: 16, fontWeight: '600', color: '#FF6B00', marginLeft: 8 },
  changeShopButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD7B5',
  },
  changeShopText: { fontSize: 12, color: '#FF6B00', fontWeight: '500' },

  scrollContent: { paddingBottom: 24 },

  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  summaryCard: {
    width: cardWidth,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryValue: { fontSize: 28, fontWeight: 'bold', color: '#1F2937', marginTop: 4 },
  summaryTitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },

  actionGroup: { marginTop: 8, marginBottom: 16, paddingHorizontal: 16 },
  groupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
    paddingLeft: 4,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: cardWidth,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },

  tabSection: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 16,
  },
  tab: { paddingVertical: 12, marginRight: 24 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#FF6B00' },
  tabText: { fontSize: 16, color: '#6B7280', fontWeight: '500' },
  activeTabText: { color: '#FF6B00', fontWeight: '600' },

  tabContent: { paddingVertical: 8 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  tableHeaderText: { fontWeight: '600', fontSize: 14, color: '#1F2937' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableCell: { fontSize: 14, color: '#374151' },

  noShopContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  noShopText: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginTop: 16 },
  noShopSubtext: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8 },
  selectShopButton: {
    marginTop: 24,
    backgroundColor: '#FF6B00',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  selectShopButtonText: { color: '#FFFFFF', fontWeight: '600' },
});