// src/screens/owner/ShopProductsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomHeaderWithButton from '../../components/CustomHeaderWithButton';

// Hardcoded categories based on Django Category model
const PRODUCT_CATEGORIES = [
  { 
    id: 'cat_001', 
    name: 'Beverages', 
    color: '#3B82F6', 
    icon: 'cafe',
    business: 'bus_001',
    is_active: true
  },
  { 
    id: 'cat_002', 
    name: 'Groceries', 
    color: '#10B981', 
    icon: 'basket',
    business: 'bus_001',
    is_active: true
  },
  { 
    id: 'cat_003', 
    name: 'Dairy', 
    color: '#F59E0B', 
    icon: 'water',
    business: 'bus_001',
    is_active: true
  },
  { 
    id: 'cat_004', 
    name: 'Cooking', 
    color: '#EF4444', 
    icon: 'flame',
    business: 'bus_001',
    is_active: true
  },
  { 
    id: 'cat_005', 
    name: 'Snacks', 
    color: '#8B5CF6', 
    icon: 'fast-food',
    business: 'bus_001',
    is_active: true
  },
  { 
    id: 'cat_006', 
    name: 'Personal Care', 
    color: '#EC4899', 
    icon: 'body',
    business: 'bus_001',
    is_active: true
  },
  { 
    id: 'cat_007', 
    name: 'Household', 
    color: '#6366F1', 
    icon: 'home',
    business: 'bus_001',
    is_active: true
  },
  { 
    id: 'cat_008', 
    name: 'Other', 
    color: '#6B7280', 
    icon: 'cube',
    business: 'bus_001',
    is_active: true
  },
];

// Hardcoded taxes based on Django Tax model
const TAXES = [
  { 
    id: 'tax_001', 
    name: 'VAT 16%', 
    rate: 16, 
    tax_type: 'standard', 
    is_active: true 
  },
  { 
    id: 'tax_002', 
    name: 'Zero Rated', 
    rate: 0, 
    tax_type: 'zero', 
    is_active: true 
  },
  { 
    id: 'tax_003', 
    name: 'Exempt', 
    rate: 0, 
    tax_type: 'exempt', 
    is_active: true 
  },
];

// Hardcoded unit of measures
const UNIT_OF_MEASURES = [
  { id: 'pcs', name: 'Pieces', symbol: 'pcs' },
  { id: 'kg', name: 'Kilograms', symbol: 'kg' },
  { id: 'g', name: 'Grams', symbol: 'g' },
  { id: 'l', name: 'Liters', symbol: 'L' },
  { id: 'ml', name: 'Milliliters', symbol: 'ml' },
  { id: 'box', name: 'Box', symbol: 'box' },
  { id: 'pack', name: 'Pack', symbol: 'pack' },
  { id: 'carton', name: 'Carton', symbol: 'ctn' },
];

export default function ShopProductsScreen({ route, navigation }) {
  const { shopId, shopName, businessId } = route.params;
  
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'active', 'low_stock'

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchQuery, selectedCategory, activeFilter, products]);

  const loadProducts = () => {
    // Load hardcoded products based on Django models
    const hardcodedProducts = [
      {
        id: 'prod_001',
        name: 'Premium Coffee',
        description: 'Arabica coffee beans, 500g',
        category: 'cat_001',
        product_type: 'physical',
        barcode: '789123456001',
        sku: 'COFFEE-500G',
        cost_price: 350,
        selling_price: 650,
        wholesale_price: 550,
        tax: 'tax_001',
        tax_inclusive: true,
        unit_of_measure: 'pcs',
        reorder_level: 10,
        is_trackable: true,
        business: 'bus_001',
        is_active: true,
        created_at: '2024-01-15T10:30:00Z',
        inventory: {
          id: 'inv_001',
          shop: shopId,
          current_stock: 25,
          reserved_stock: 3,
          minimum_stock: 5,
          maximum_stock: 100,
          last_restocked: '2024-01-20T09:15:00Z',
          is_active: true,
        },
      },
      {
        id: 'prod_002',
        name: 'Organic Sugar',
        description: 'Natural cane sugar, 1kg',
        category: 'cat_002',
        product_type: 'physical',
        barcode: '789123456002',
        sku: 'SUGAR-1KG',
        cost_price: 120,
        selling_price: 250,
        wholesale_price: 200,
        tax: 'tax_001',
        tax_inclusive: true,
        unit_of_measure: 'pcs',
        reorder_level: 20,
        is_trackable: true,
        business: 'bus_001',
        is_active: true,
        created_at: '2024-01-16T14:20:00Z',
        inventory: {
          id: 'inv_002',
          shop: shopId,
          current_stock: 48,
          reserved_stock: 5,
          minimum_stock: 10,
          maximum_stock: 200,
          last_restocked: '2024-01-25T11:00:00Z',
          is_active: true,
        },
      },
      {
        id: 'prod_003',
        name: 'Milk Powder',
        description: 'Full cream milk powder, 400g',
        category: 'cat_003',
        product_type: 'physical',
        barcode: '789123456003',
        sku: 'MILK-400G',
        cost_price: 180,
        selling_price: 320,
        wholesale_price: 280,
        tax: 'tax_001',
        tax_inclusive: true,
        unit_of_measure: 'pcs',
        reorder_level: 15,
        is_trackable: true,
        business: 'bus_001',
        is_active: true,
        created_at: '2024-01-17T09:15:00Z',
        inventory: {
          id: 'inv_003',
          shop: shopId,
          current_stock: 32,
          reserved_stock: 2,
          minimum_stock: 8,
          maximum_stock: 100,
          last_restocked: '2024-01-22T14:30:00Z',
          is_active: true,
        },
      },
      {
        id: 'prod_004',
        name: 'Tea Leaves',
        description: 'Premium tea leaves, 250g',
        category: 'cat_001',
        product_type: 'physical',
        barcode: '789123456004',
        sku: 'TEA-250G',
        cost_price: 220,
        selling_price: 420,
        wholesale_price: 350,
        tax: 'tax_001',
        tax_inclusive: true,
        unit_of_measure: 'pcs',
        reorder_level: 12,
        is_trackable: true,
        business: 'bus_001',
        is_active: true,
        created_at: '2024-01-18T11:45:00Z',
        inventory: {
          id: 'inv_004',
          shop: shopId,
          current_stock: 18,
          reserved_stock: 1,
          minimum_stock: 6,
          maximum_stock: 80,
          last_restocked: '2024-01-24T10:15:00Z',
          is_active: true,
        },
      },
      {
        id: 'prod_005',
        name: 'Cooking Oil',
        description: 'Vegetable cooking oil, 1L',
        category: 'cat_004',
        product_type: 'physical',
        barcode: '789123456005',
        sku: 'OIL-1L',
        cost_price: 280,
        selling_price: 480,
        wholesale_price: 400,
        tax: 'tax_002', // Zero rated
        tax_inclusive: false,
        unit_of_measure: 'pcs',
        reorder_level: 8,
        is_trackable: true,
        business: 'bus_001',
        is_active: false,
        created_at: '2024-01-19T16:30:00Z',
        inventory: {
          id: 'inv_005',
          shop: shopId,
          current_stock: 0,
          reserved_stock: 0,
          minimum_stock: 4,
          maximum_stock: 50,
          last_restocked: null,
          is_active: false,
        },
      },
      {
        id: 'prod_006',
        name: 'Wheat Flour',
        description: 'Premium wheat flour, 2kg',
        category: 'cat_002',
        product_type: 'physical',
        barcode: '789123456006',
        sku: 'FLOUR-2KG',
        cost_price: 150,
        selling_price: 280,
        wholesale_price: 240,
        tax: null, // No tax
        tax_inclusive: false,
        unit_of_measure: 'pcs',
        reorder_level: 15,
        is_trackable: true,
        business: 'bus_001',
        is_active: true,
        created_at: '2024-01-20T13:20:00Z',
        inventory: {
          id: 'inv_006',
          shop: shopId,
          current_stock: 5,
          reserved_stock: 0,
          minimum_stock: 10,
          maximum_stock: 100,
          last_restocked: '2024-01-25T09:00:00Z',
          is_active: true,
        },
      },
      {
        id: 'prod_007',
        name: 'Baking Powder',
        description: 'Baking powder, 100g',
        category: 'cat_004',
        product_type: 'physical',
        barcode: '789123456007',
        sku: 'BAKING-100G',
        cost_price: 40,
        selling_price: 80,
        wholesale_price: 65,
        tax: 'tax_003', // Exempt
        tax_inclusive: true,
        unit_of_measure: 'pcs',
        reorder_level: 20,
        is_trackable: true,
        business: 'bus_001',
        is_active: true,
        created_at: '2024-01-21T10:10:00Z',
        inventory: {
          id: 'inv_007',
          shop: shopId,
          current_stock: 35,
          reserved_stock: 0,
          minimum_stock: 10,
          maximum_stock: 200,
          last_restocked: '2024-01-23T16:45:00Z',
          is_active: true,
        },
      },
      {
        id: 'prod_008',
        name: 'Mineral Water',
        description: '500ml bottled water',
        category: 'cat_001',
        product_type: 'physical',
        barcode: '789123456008',
        sku: 'WATER-500ML',
        cost_price: 15,
        selling_price: 30,
        wholesale_price: 25,
        tax: 'tax_001',
        tax_inclusive: true,
        unit_of_measure: 'pcs',
        reorder_level: 50,
        is_trackable: true,
        business: 'bus_001',
        is_active: true,
        created_at: '2024-01-22T08:45:00Z',
        inventory: {
          id: 'inv_008',
          shop: shopId,
          current_stock: 120,
          reserved_stock: 20,
          minimum_stock: 30,
          maximum_stock: 500,
          last_restocked: '2024-01-25T14:20:00Z',
          is_active: true,
        },
      },
    ];
    
    setProducts(hardcodedProducts);
    setFilteredProducts(hardcodedProducts);
    setLoading(false);
  };

  const filterProducts = () => {
    let filtered = [...products];
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.barcode.includes(query)
      );
    }
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    // Filter by active filter
    if (activeFilter === 'active') {
      filtered = filtered.filter(product => product.is_active);
    } else if (activeFilter === 'low_stock') {
      filtered = filtered.filter(product => 
        product.inventory.current_stock <= product.reorder_level && 
        product.is_active
      );
    } else if (activeFilter === 'out_of_stock') {
      filtered = filtered.filter(product => 
        product.inventory.current_stock === 0 && 
        product.is_active
      );
    } else if (activeFilter === 'no_tax') {
      filtered = filtered.filter(product => 
        !product.tax && 
        product.is_active
      );
    }
    
    setFilteredProducts(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      loadProducts();
      setRefreshing(false);
    }, 1000);
  };

  const handleAddProduct = () => {
    navigation.navigate('AddProduct', {
      shopId,
      shopName,
      businessId,
    });
  };

  const handleViewProduct = (product) => {
    navigation.navigate('ProductDetail', {
      productId: product.id,
      productName: product.name,
      shopId,
      shopName,
      businessId,
    });
  };

  const handleEditProduct = (product) => {
    Alert.alert(
      'Product Actions',
      `What would you like to do with ${product.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'View Details', 
          onPress: () => handleViewProduct(product)
        },
        { 
          text: 'Edit Product', 
          onPress: () => navigation.navigate('EditProduct', { 
            productId: product.id, 
            shopId,
            shopName,
            businessId,
          })
        },
        { 
          text: product.is_active ? 'Deactivate' : 'Activate', 
          onPress: () => toggleProductStatus(product.id)
        }
      ]
    );
  };

  const toggleProductStatus = (productId) => {
    setProducts(prevProducts =>
      prevProducts.map(product =>
        product.id === productId
          ? { 
              ...product, 
              is_active: !product.is_active,
              inventory: {
                ...product.inventory,
                is_active: !product.is_active
              }
            }
          : product
      )
    );
  };

  const handleDeleteProduct = (productId, productName) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${productName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            setProducts(prevProducts =>
              prevProducts.filter(product => product.id !== productId)
            );
            Alert.alert('Success', `${productName} has been deleted`);
          }
        }
      ]
    );
  };

  const getCategoryInfo = (categoryId) => {
    return PRODUCT_CATEGORIES.find(cat => cat.id === categoryId) || PRODUCT_CATEGORIES[PRODUCT_CATEGORIES.length - 1];
  };

  const getTaxInfo = (taxId) => {
    return TAXES.find(tax => tax.id === taxId);
  };

  const getFilterStats = () => {
    const activeProducts = products.filter(p => p.is_active).length;
    const lowStockProducts = products.filter(p => 
      p.inventory.current_stock <= p.reorder_level && 
      p.is_active
    ).length;
    const outOfStockProducts = products.filter(p => 
      p.inventory.current_stock === 0 && 
      p.is_active
    ).length;
    const totalStock = products.reduce((sum, p) => sum + p.inventory.current_stock, 0);
    const totalValue = products.reduce((sum, p) => sum + (p.inventory.current_stock * p.cost_price), 0);
    
    return { 
      activeProducts, 
      lowStockProducts, 
      outOfStockProducts,
      totalStock, 
      totalValue 
    };
  };

  const renderProductItem = ({ item }) => {
    const isLowStock = item.inventory.current_stock <= item.reorder_level;
    const isOutOfStock = item.inventory.current_stock === 0;
    const profitMargin = ((item.selling_price - item.cost_price) / item.cost_price * 100).toFixed(1);
    const categoryInfo = getCategoryInfo(item.category);
    const taxInfo = getTaxInfo(item.tax);
    const unitMeasure = UNIT_OF_MEASURES.find(u => u.id === item.unit_of_measure) || UNIT_OF_MEASURES[0];
    const availableStock = item.inventory.current_stock - item.inventory.reserved_stock;

    return (
      <TouchableOpacity 
        style={styles.productCard}
        onPress={() => handleEditProduct(item)}
        activeOpacity={0.7}
      >
        <View style={styles.productHeader}>
          <View style={[styles.productIcon, { backgroundColor: `${categoryInfo.color}20` }]}>
            <Ionicons name={categoryInfo.icon} size={24} color={categoryInfo.color} />
          </View>
          <View style={styles.productInfo}>
            <View style={styles.productTitleRow}>
              <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
              <View style={[
                styles.productStatusBadge,
                { backgroundColor: item.is_active ? '#DCFCE7' : '#FEE2E2' }
              ]}>
                <Text style={[
                  styles.productStatusText,
                  { color: item.is_active ? '#166534' : '#991B1B' }
                ]}>
                  {item.is_active ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
            <Text style={styles.productSku} numberOfLines={1}>
              SKU: {item.sku} | Barcode: {item.barcode}
            </Text>
            <Text style={styles.productDescription} numberOfLines={2}>
              {item.description}
            </Text>
          </View>
        </View>
        
        <View style={styles.productDetails}>
          <View style={styles.detailRow}>
            <View style={styles.detailColumn}>
              <Text style={styles.detailLabel}>Available Stock</Text>
              <Text style={[
                styles.detailValue,
                isOutOfStock ? styles.outOfStockText : 
                isLowStock ? styles.lowStockText : styles.normalStockText
              ]}>
                {availableStock} {unitMeasure.symbol}
                {isOutOfStock && ' 🚫'}
                {isLowStock && !isOutOfStock && ' ⚠️'}
              </Text>
            </View>
            <View style={styles.detailColumn}>
              <Text style={styles.detailLabel}>Buy Price</Text>
              <Text style={styles.detailValue}>KES {item.cost_price}</Text>
            </View>
            <View style={styles.detailColumn}>
              <Text style={styles.detailLabel}>Sell Price</Text>
              <Text style={[styles.detailValue, styles.sellingPrice]}>
                KES {item.selling_price}
              </Text>
            </View>
            <View style={styles.detailColumn}>
              <Text style={styles.detailLabel}>Margin</Text>
              <Text style={[
                styles.detailValue,
                { color: profitMargin >= 0 ? '#16A34A' : '#DC2626' }
              ]}>
                {profitMargin}%
              </Text>
            </View>
          </View>
          
          <View style={styles.productFooter}>
            <View style={styles.productTags}>
              <View style={styles.categoryTag}>
                <Ionicons name="pricetag" size={12} color={categoryInfo.color} />
                <Text style={[styles.categoryText, { color: categoryInfo.color }]}>
                  {categoryInfo.name}
                </Text>
              </View>
              
              {taxInfo && (
                <View style={styles.taxTag}>
                  <Ionicons name="percent" size={12} color="#D97706" />
                  <Text style={[styles.taxText, { color: '#D97706' }]}>
                    {taxInfo.rate}% {item.tax_inclusive ? 'Inc.' : 'Exc.'}
                  </Text>
                </View>
              )}
              
              {!taxInfo && (
                <View style={styles.noTaxTag}>
                  <Ionicons name="close-circle" size={12} color="#6B7280" />
                  <Text style={[styles.noTaxText, { color: '#6B7280' }]}>
                    No Tax
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.productActions}>
              <TouchableOpacity 
                style={styles.productAction}
                onPress={() => Alert.alert('Adjust Stock', 'Stock adjustment coming soon')}
              >
                <Ionicons name="swap-vertical" size={18} color="#6B7280" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.productAction}
                onPress={() => handleDeleteProduct(item.id, item.name)}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Products</Text>
            <TouchableOpacity
              onPress={() => setShowFilterModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            {/* Status Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Status</Text>
              <View style={styles.filterOptions}>
                {[
                  { id: 'all', label: 'All Products', icon: 'grid' },
                  { id: 'active', label: 'Active Only', icon: 'checkmark-circle' },
                  { id: 'low_stock', label: 'Low Stock', icon: 'warning' },
                  { id: 'out_of_stock', label: 'Out of Stock', icon: 'close-circle' },
                  { id: 'no_tax', label: 'No Tax', icon: 'close-circle-outline' },
                ].map((filter) => (
                  <TouchableOpacity
                    key={filter.id}
                    style={[
                      styles.filterOption,
                      activeFilter === filter.id && styles.selectedFilterOption,
                    ]}
                    onPress={() => {
                      setActiveFilter(filter.id);
                      setShowFilterModal(false);
                    }}
                  >
                    <Ionicons 
                      name={filter.icon} 
                      size={16} 
                      color={activeFilter === filter.id ? '#FF6B00' : '#6B7280'} 
                    />
                    <Text style={[
                      styles.filterOptionText,
                      activeFilter === filter.id && styles.selectedFilterOptionText,
                    ]}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Category Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Category</Text>
              <View style={styles.categoryGrid}>
                {[{ id: 'all', name: 'All Categories', color: '#6B7280', icon: 'grid' }, ...PRODUCT_CATEGORIES].map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryOption,
                      selectedCategory === category.id && styles.selectedCategoryOption,
                    ]}
                    onPress={() => {
                      setSelectedCategory(category.id);
                      setShowFilterModal(false);
                    }}
                  >
                    <Ionicons 
                      name={category.icon} 
                      size={16} 
                      color={selectedCategory === category.id ? '#FF6B00' : category.color} 
                    />
                    <Text style={[
                      styles.categoryOptionText,
                      selectedCategory === category.id && styles.selectedCategoryOptionText,
                    ]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Reset Filters */}
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                setActiveFilter('all');
                setSelectedCategory('all');
                setShowFilterModal(false);
              }}
            >
              <Ionicons name="refresh" size={16} color="#6B7280" />
              <Text style={styles.resetButtonText}>Reset All Filters</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const stats = getFilterStats();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomHeaderWithButton
          title={`${shopName} Products`}
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
        title={`${shopName} Products`}
        leftButtonIcon="arrow-back"
        leftButtonAction={() => navigation.goBack()}
        rightButtonIcon="add"
        rightButtonAction={handleAddProduct}
      />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF6B00']}
            tintColor="#FF6B00"
          />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products by name, SKU, or barcode..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#9ca3af" />
              </TouchableOpacity>
            ) : null}
          </View>
          
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons name="filter" size={20} color="#FF6B00" />
            {(activeFilter !== 'all' || selectedCategory !== 'all') && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>!</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        
        {/* Stats Overview */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.totalProductsCard]}>
            <Text style={styles.statValue}>{products.length}</Text>
            <Text style={styles.statLabel}>Total Products</Text>
          </View>
          
          <View style={[styles.statCard, styles.activeProductsCard]}>
            <Text style={styles.statValue}>{stats.activeProducts}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          
          <View style={[styles.statCard, styles.lowStockCard]}>
            <Text style={styles.statValue}>{stats.lowStockProducts}</Text>
            <Text style={styles.statLabel}>Low Stock</Text>
          </View>
          
          <View style={[styles.statCard, styles.totalValueCard]}>
            <Text style={styles.statValue}>KES {stats.totalValue.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Stock Value</Text>
          </View>
        </View>
        
        {/* Active Filters */}
        {(activeFilter !== 'all' || selectedCategory !== 'all') && (
          <View style={styles.activeFiltersContainer}>
            <Text style={styles.activeFiltersTitle}>Active Filters:</Text>
            <View style={styles.activeFiltersList}>
              {activeFilter !== 'all' && (
                <View style={styles.activeFilterBadge}>
                  <Text style={styles.activeFilterText}>
                    {activeFilter === 'active' ? 'Active Only' : 
                     activeFilter === 'low_stock' ? 'Low Stock' :
                     activeFilter === 'out_of_stock' ? 'Out of Stock' : 'No Tax'}
                  </Text>
                  <TouchableOpacity onPress={() => setActiveFilter('all')}>
                    <Ionicons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
              {selectedCategory !== 'all' && (
                <View style={[styles.activeFilterBadge, { backgroundColor: '#8B5CF6' }]}>
                  <Text style={styles.activeFilterText}>
                    {getCategoryInfo(selectedCategory).name}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedCategory('all')}>
                    <Ionicons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
        
        {/* Products List Header */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>
            Products ({filteredProducts.length})
          </Text>
          <TouchableOpacity 
            style={styles.sortButton}
            onPress={() => Alert.alert('Sort', 'Sort functionality coming soon')}
          >
            <Ionicons name="swap-vertical" size={16} color="#6B7280" />
            <Text style={styles.sortButtonText}>Sort</Text>
          </TouchableOpacity>
        </View>
        
        {/* Products List */}
        {filteredProducts.length > 0 ? (
          <FlatList
            data={filteredProducts}
            renderItem={renderProductItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyStateTitle}>No Products Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery 
                ? `No products found matching "${searchQuery}"`
                : 'No products match your current filters'}
            </Text>
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={() => {
                setSearchQuery('');
                setActiveFilter('all');
                setSelectedCategory('all');
              }}
            >
              <Text style={styles.emptyStateButtonText}>Clear Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.emptyStateButton, styles.addProductButton]}
              onPress={handleAddProduct}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={[styles.emptyStateButtonText, { color: '#fff' }]}>Add New Product</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      
      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddProduct}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Filter Modal */}
      {renderFilterModal()}
    </SafeAreaView>
  );
}

// Add new styles for tax tags and other updates
const styles = StyleSheet.create({
  // ... keep all existing styles ...
  
  productTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  
  taxTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  
  taxText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  
  noTaxTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  
  noTaxText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  
  outOfStockText: {
    color: '#DC2626',
    fontWeight: 'bold',
  },
  
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
    marginRight: 8,
  },
  
  selectedCategoryOption: {
    backgroundColor: '#FFF7F0',
    borderColor: '#FF6B00',
  },
  
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 8,
    marginRight: 8,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    margin: '1%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  totalProductsCard: {
    borderTopWidth: 4,
    borderTopColor: '#3B82F6',
  },
  activeProductsCard: {
    borderTopWidth: 4,
    borderTopColor: '#10B981',
  },
  lowStockCard: {
    borderTopWidth: 4,
    borderTopColor: '#F59E0B',
  },
  totalValueCard: {
    borderTopWidth: 4,
    borderTopColor: '#8B5CF6',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  activeFiltersContainer: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FBBF24',
  },
  activeFiltersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  activeFiltersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  activeFilterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B00',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
  },
  activeFilterText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
    marginRight: 6,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  productIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  productStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  productStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  productSku: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  productDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailColumn: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  lowStockText: {
    color: '#DC2626',
    fontWeight: '600',
  },
  normalStockText: {
    color: '#16A34A',
    fontWeight: '500',
  },
  sellingPrice: {
    color: '#FF6B00',
    fontWeight: '600',
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  productActions: {
    flexDirection: 'row',
  },
  productAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  emptyStateButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    marginBottom: 8,
  },
  addProductButton: {
    backgroundColor: '#FF6B00',
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  filterOptions: {
    gap: 8,
  },
  filterOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedFilterOption: {
    backgroundColor: '#FFF7F0',
    borderColor: '#FF6B00',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectedFilterOptionText: {
    color: '#FF6B00',
    fontWeight: '600',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
  },
  selectedCategoryOption: {
    backgroundColor: '#FFF7F0',
  },
  categoryOptionText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectedCategoryOptionText: {
    color: '#FF6B00',
    fontWeight: '600',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  resetButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 8,
  },
});