// src/screens/employee/POSScreen.js (or ProductsScreen.js – rename as needed)
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useBusiness } from '../../context/BusinessContext';
import CartPreview from '../../components/CartPreview';
import { ProductService, CategoryService, openDatabase, ShopService } from '../../database';

export default function POSScreen({ navigation }) {
  const { user } = useAuth();
  const { currentShop, currentBusiness } = useBusiness();

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [customPrice, setCustomPrice] = useState('');
  const [cartPreviewVisible, setCartPreviewVisible] = useState(false);

  // Load products and categories when shop or business changes
  useEffect(() => {
    if (currentShop && currentBusiness) {
      loadData();
    }
  }, [currentShop, currentBusiness, selectedCategory, searchQuery]);

  const loadData = async () => {
    if (!currentShop || !currentBusiness) return;
    try {
      setLoading(true);

      // 1. Load categories for this business
      const categoryList = await CategoryService.getCategoriesByBusiness(
        currentBusiness.id,
        user.id
      );
      setCategories(categoryList);

      // 2. Load products
      const options = {
        includeInactive: false,
        search: searchQuery,
        categoryId: selectedCategory?.id,
        limit: 100,
      };
      let productList = await ProductService.getProductsByBusiness(
        currentBusiness.id,
        user.id,
        options
      );

      // Filter products by shop inventory (only show products that have stock in this shop)
      const db = await openDatabase();
      const inventoryList = await db.getAllAsync(
        `SELECT product_id, current_stock FROM inventory 
         WHERE shop_id = ? AND is_active = 1`,
        [currentShop.id]
      );
      const inventoryMap = new Map();
      inventoryList.forEach(item => {
        if (item.product_id) inventoryMap.set(item.product_id, item.current_stock || 0);
      });
      productList = productList.filter(p => inventoryMap.has(p.id));
      productList = productList.map(p => ({
        ...p,
        currentStock: inventoryMap.get(p.id) || 0,
      }));

      setProducts(productList);
    } catch (error) {
      console.error('Error loading POS data:', error);
      Alert.alert('Error', 'Failed to load products. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Cart helpers
  const addToCart = (product, customPriceValue = null) => {
    const price = customPriceValue !== null ? parseFloat(customPriceValue) : product.base_selling_price;
    // Validate price (optional – you can allow any price or restrict to a range)
    const minPrice = product.base_selling_price - (product.maxDiscount || 0);
    if (price < minPrice || price > product.base_selling_price) {
      Alert.alert(
        'Invalid Price',
        `Price must be between Ksh ${minPrice} and Ksh ${product.base_selling_price}`
      );
      return;
    }

    setCart(prev => {
      const existing = prev.find(
        item => item.id === product.id && item.customPrice === price
      );
      if (existing) {
        return prev.map(item =>
          item.id === product.id && item.customPrice === price
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1, customPrice: price }];
    });
    setModalVisible(false);
    setCustomPrice('');
  };

  const removeFromCart = (productId, customPrice) => {
    setCart(prev =>
      prev.reduce((acc, item) => {
        if (item.id === productId && item.customPrice === customPrice) {
          if (item.quantity > 1) {
            acc.push({ ...item, quantity: item.quantity - 1 });
          }
        } else {
          acc.push(item);
        }
        return acc;
      }, [])
    );
  };

  const getProductQuantity = (productId) => {
    return cart
      .filter(item => item.id === productId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  const cartTotal = cart.reduce(
    (total, item) => total + item.customPrice * item.quantity,
    0
  );
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  const handleCheckout = () => {
    navigation.navigate('Checkout', { cart, cartTotal });
  };

  // Open price modal for a product (optional – you can also just add at default price)
  const openPriceModal = (product) => {
    setSelectedProduct(product);
    setCustomPrice(product.base_selling_price.toString());
    setModalVisible(true);
  };

  // Render helpers
  const renderProductCard = (product) => {
    const quantity = getProductQuantity(product.id);
    const hasStock = product.currentStock > 0;
    const defaultPrice = product.base_selling_price;

    return (
      <View key={product.id} style={[styles.productCard, !hasStock && styles.outOfStockCard]}>
        <View style={styles.productHeader}>
          <Text style={styles.productImage}>{product.image ? '🛍️' : '📦'}</Text>
          {hasStock && (
            <TouchableOpacity
              style={styles.discountButton}
              onPress={() => openPriceModal(product)}
            >
              <Ionicons name="pricetag-outline" size={16} color="#374151" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productPrice}>
          Ksh {defaultPrice.toLocaleString()}
          {product.maxDiscount ? ` (up to ${product.maxDiscount} off)` : ''}
        </Text>
        {!hasStock ? (
          <View style={styles.outOfStockLabel}>
            <Text style={styles.outOfStockText}>Out of Stock</Text>
          </View>
        ) : quantity === 0 ? (
          <TouchableOpacity
            onPress={() => addToCart(product)}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>+ Add to Cart</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.quantityControls}>
            <TouchableOpacity
              onPress={() => {
                const cartItem = cart.find(item => item.id === product.id);
                if (cartItem) removeFromCart(product.id, cartItem.customPrice);
              }}
              style={styles.qtyButton}
            >
              <Text style={styles.qtyText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.qtyNumber}>{quantity}</Text>
            <TouchableOpacity
              onPress={() => addToCart(product)}
              style={styles.qtyButtonAdd}
            >
              <Text style={styles.qtyTextAdd}>+</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF7F32" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Sticky Header, Search Bar, and Categories */}
      <View style={styles.stickySection}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🛒 POS</Text>
          <TouchableOpacity
            style={styles.cartIcon}
            onPress={() => setCartPreviewVisible(true)}
          >
            <Ionicons name="cart-outline" size={26} color="#1F2937" />
            {cartItemCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#6B7280" />
          <TextInput
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
          <TouchableOpacity
            onPress={() => setSelectedCategory(null)}
            style={[styles.categoryButton, !selectedCategory && styles.categoryButtonActive]}
          >
            <Text style={[styles.categoryText, !selectedCategory && styles.categoryTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setSelectedCategory(cat)}
              style={[
                styles.categoryButton,
                selectedCategory?.id === cat.id && styles.categoryButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory?.id === cat.id && styles.categoryTextActive,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Products Grid */}
      <ScrollView
        contentContainerStyle={styles.productsWrapper}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF7F32']} />
        }
      >
        {products.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No products found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery
                ? 'Try a different search term'
                : selectedCategory
                ? 'No products in this category'
                : 'Products will appear here once added'}
            </Text>
          </View>
        ) : (
          <View style={styles.productsGrid}>
            {products.map(product => renderProductCard(product))}
          </View>
        )}
      </ScrollView>

      {/* Sticky Cart Summary */}
      {cart.length > 0 && (
        <View style={styles.cartSummary}>
          <View>
            <Text style={styles.cartItemsText}>{cartItemCount} items</Text>
            <Text style={styles.cartTotalText}>Total: Ksh {cartTotal.toFixed(2)}</Text>
          </View>
          <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
            <Text style={styles.checkoutText}>Checkout</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Custom Price Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Price for {selectedProduct?.name}</Text>
            <Text style={styles.modalSubtitle}>
              Original Price: Ksh {selectedProduct?.base_selling_price}
            </Text>
            <Text style={styles.modalSubtitle}>
              Allowed Range: Ksh {selectedProduct?.base_selling_price - (selectedProduct?.maxDiscount || 0)} – Ksh {selectedProduct?.base_selling_price}
            </Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={customPrice}
              onChangeText={setCustomPrice}
              placeholder="Enter custom price"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonConfirm}
                onPress={() => selectedProduct && addToCart(selectedProduct, customPrice)}
              >
                <Text style={styles.modalButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cart Preview */}
      <CartPreview
        visible={cartPreviewVisible}
        onClose={() => setCartPreviewVisible(false)}
        cart={cart}
        addToCart={addToCart}
        removeFromCart={removeFromCart}
        cartTotal={cartTotal}
        navigation={navigation}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fffaf5',
  },
  stickySection: {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    backgroundColor: '#fffaf5',
    padding: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  cartIcon: {
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#FF7F32',
    borderRadius: 12,
    paddingHorizontal: 5,
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: '#1F2937',
  },
  categories: {
    marginBottom: 8,
  },
  categoryButton: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    marginRight: 8,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryButtonActive: {
    backgroundColor: '#FF7F32',
  },
  categoryText: {
    color: '#374151',
    fontSize: 14,
  },
  categoryTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  productsWrapper: {
    padding: 16,
    paddingBottom: 80,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    minHeight: 180,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  outOfStockCard: {
    opacity: 0.6,
    backgroundColor: '#F3F4F6',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  productImage: {
    fontSize: 36,
    textAlign: 'center',
  },
  discountButton: {
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productName: {
    fontWeight: '700',
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 4,
  },
  productPrice: {
    color: '#FF7F32',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 8,
  },
  outOfStockLabel: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  outOfStockText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#FF7F32',
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  quantityControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qtyButton: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  qtyText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#374151',
  },
  qtyNumber: {
    fontWeight: '600',
    fontSize: 16,
    color: '#1F2937',
  },
  qtyButtonAdd: {
    backgroundColor: '#FF7F32',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  qtyTextAdd: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cartSummary: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  cartItemsText: {
    color: '#6B7280',
    fontSize: 14,
  },
  cartTotalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF7F32',
  },
  checkoutButton: {
    backgroundColor: '#FF7F32',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  checkoutText: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 10,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    width: '100%',
    marginBottom: 20,
    color: '#1F2937',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButtonCancel: {
    backgroundColor: '#6B7280',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalButtonConfirm: {
    backgroundColor: '#FF7F32',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});