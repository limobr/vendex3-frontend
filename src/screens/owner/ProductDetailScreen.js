// src/screens/owner/ProductDetailScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomHeaderWithButton from '../../components/CustomHeaderWithButton';
import {
  ProductService,
  TaxService,
  CategoryService,
  InventoryService,
  PriceHistoryService,
  UserService,
  ShopService,
  BusinessService,
} from '../../database';

// Product types from Django model
const PRODUCT_TYPES = [
  { id: 'physical', label: 'Physical Product', icon: 'cube', color: '#FF6B00' },
  { id: 'digital', label: 'Digital Product', icon: 'cloud', color: '#3B82F6' },
  { id: 'service', label: 'Service', icon: 'construct', color: '#10B981' },
];

// Tax types from Django model
const TAX_TYPES = [
  { id: 'standard', name: 'Standard VAT' },
  { id: 'zero', name: 'Zero Rated' },
  { id: 'exempt', name: 'Exempt' },
];

// Unit of measures
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

export default function ProductDetailScreen({ route, navigation }) {
  const { productId, shopId, businessId } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [showPriceHistoryModal, setShowPriceHistoryModal] = useState(false);
  const [showInventoryHistoryModal, setShowInventoryHistoryModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // State for data
  const [product, setProduct] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [taxes, setTaxes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);
  const [inventoryHistory, setInventoryHistory] = useState([]);
  const [shop, setShop] = useState(null);
  const [business, setBusiness] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [allShops, setAllShops] = useState([]);

  useEffect(() => {
    loadProductData();
  }, [productId, shopId, businessId]);

  const loadProductData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const user = await UserService.getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'User not found');
        navigation.goBack();
        return;
      }
      setCurrentUser(user);

      // Get product with details
      const productData = await ProductService.getProductWithDetails(productId, user.id);
      if (!productData) {
        Alert.alert('Error', 'Product not found or access denied');
        navigation.goBack();
        return;
      }
      setProduct(productData);
      
      console.log(`🔍 Loaded product: ${productData.name} (${productData.id})`);

      // Get business
      if (productData.business_id) {
        const businessData = await BusinessService.getBusinessById(productData.business_id);
        setBusiness(businessData);
        console.log(`🔍 Loaded business: ${businessData?.name} (${businessData?.id})`);
      }

      // Get shop if provided
      if (shopId) {
        const shopData = await ShopService.getShopById(shopId);
        setShop(shopData);
        console.log(`🔍 Loaded shop: ${shopData?.name} (${shopData?.id})`);
      }

      // Fetch shops for business
      console.log(`🔍 Fetching shops for business: ${productData.business_id}`);
      const shopsData = await ShopService.getShopsByBusiness(productData.business_id);
      console.log(`🔍 Fetched ${shopsData.length} shops for business ${productData.business_id}`);
      setAllShops(shopsData);

      // Now fetch inventory using the shops data
      const inventoryData = await getInventoryForProduct(productData, user.id, shopsData);
      setInventory(inventoryData);

      // Get other data in parallel
      const [taxesData, categoriesData, priceHistoryData] = await Promise.all([
        TaxService.getTaxes(),
        productData.business_id ? CategoryService.getCategoriesByBusiness(productData.business_id, user.id) : Promise.resolve([]),
        PriceHistoryService.getPriceHistory(productId, 'product', user.id)
      ]);

      setTaxes(taxesData);
      setCategories(categoriesData);
      setPriceHistory(priceHistoryData);

    } catch (error) {
      console.error('Error loading product data:', error);
      Alert.alert('Error', 'Failed to load product data');
    } finally {
      setLoading(false);
    }
  };

  const getInventoryForProduct = async (productData, userId, shops = []) => {
    try {
      console.log(`🔍 Getting inventory for product: ${productData.name} (${productData.id})`);
      console.log(`🔍 Using ${shops.length} shops for inventory calculation`);
      
      let inventoryData = {
        current_stock: 0,
        reserved_stock: 0,
        minimum_stock: 0,
        maximum_stock: null,
        last_restocked: null,
        shop_inventory: [],
      };

      // If a specific shop is selected
      if (shopId) {
        console.log(`🔍 Getting inventory for specific shop: ${shopId}`);
        
        const allInventory = await InventoryService.getInventoryByShop(shopId, userId);
        
        if (productData.has_variants && productData.variants) {
          // Handle variants
          const variantInventory = [];
          let totalStock = 0;
          
          for (const variant of productData.variants) {
            const variantInv = allInventory.find(inv => inv.variant_id === variant.id);
            
            const stockData = {
              variant_id: variant.id,
              variant_name: variant.name,
              current_stock: variantInv?.current_stock || 0,
              reserved_stock: variantInv?.reserved_stock || 0,
              minimum_stock: variantInv?.minimum_stock || 0,
              maximum_stock: variantInv?.maximum_stock || null,
              last_restocked: variantInv?.last_restocked,
              shop_id: shopId,
              shop_name: shop?.name || 'Selected Shop'
            };
            
            variantInventory.push(stockData);
            totalStock += stockData.current_stock;
          }
          
          inventoryData.current_stock = totalStock;
          inventoryData.shop_inventory = variantInventory;
        } else {
          // For simple products
          const productInv = allInventory.find(inv => inv.product_id === productData.id);
          
          if (productInv) {
            inventoryData = {
              ...inventoryData,
              current_stock: productInv.current_stock || 0,
              reserved_stock: productInv.reserved_stock || 0,
              minimum_stock: productInv.minimum_stock || 0,
              maximum_stock: productInv.maximum_stock || null,
              last_restocked: productInv.last_restocked,
              shop_inventory: [{
                shop_id: shopId,
                shop_name: shop?.name || 'Selected Shop',
                current_stock: productInv.current_stock || 0,
                reserved_stock: productInv.reserved_stock || 0,
                minimum_stock: productInv.minimum_stock || 0,
                maximum_stock: productInv.maximum_stock || null,
                last_restocked: productInv.last_restocked
              }]
            };
          } else {
            inventoryData.shop_inventory = [{
              shop_id: shopId,
              shop_name: shop?.name || 'Selected Shop',
              current_stock: 0,
              reserved_stock: 0
            }];
          }
        }
      } else {
        // No specific shop - get inventory from all shops
        console.log(`🔍 Getting inventory from ${shops.length} shops`);
        
        if (shops.length === 0) {
          console.log('⚠️ No shops available for inventory calculation');
          return inventoryData;
        }

        if (productData.has_variants && productData.variants) {
          // Handle variants across shops
          const variantInventory = [];
          let totalStock = 0;
          
          for (const variant of productData.variants) {
            let variantTotalStock = 0;
            let variantTotalReserved = 0;
            const variantShopDetails = [];
            
            for (const shop of shops) {
              const shopInventory = await InventoryService.getInventoryByShop(shop.id, userId);
              const variantInv = shopInventory.find(inv => inv.variant_id === variant.id);
              
              if (variantInv) {
                variantTotalStock += variantInv.current_stock || 0;
                variantTotalReserved += variantInv.reserved_stock || 0;
                
                variantShopDetails.push({
                  shop_id: shop.id,
                  shop_name: shop.name,
                  current_stock: variantInv.current_stock || 0,
                  reserved_stock: variantInv.reserved_stock || 0
                });
              }
            }
            
            variantInventory.push({
              variant_id: variant.id,
              variant_name: variant.name,
              current_stock: variantTotalStock,
              reserved_stock: variantTotalReserved,
              shop_details: variantShopDetails
            });
            
            totalStock += variantTotalStock;
          }
          
          inventoryData.current_stock = totalStock;
          inventoryData.shop_inventory = variantInventory;
        } else {
          // Simple product across shops
          let totalStock = 0;
          let totalReserved = 0;
          const shopInventory = [];
          
          for (const shop of shops) {
            const shopInv = await InventoryService.getInventoryByShop(shop.id, userId);
            const productInv = shopInv.find(inv => inv.product_id === productData.id);
            
            if (productInv) {
              totalStock += productInv.current_stock || 0;
              totalReserved += productInv.reserved_stock || 0;
              
              shopInventory.push({
                shop_id: shop.id,
                shop_name: shop.name,
                current_stock: productInv.current_stock || 0,
                reserved_stock: productInv.reserved_stock || 0,
                minimum_stock: productInv.minimum_stock || 0,
                maximum_stock: productInv.maximum_stock || null,
                last_restocked: productInv.last_restocked
              });
            } else {
              // Include shop even if no inventory to show 0 stock
              shopInventory.push({
                shop_id: shop.id,
                shop_name: shop.name,
                current_stock: 0,
                reserved_stock: 0,
                minimum_stock: 0,
                maximum_stock: null,
                last_restocked: null
              });
            }
          }
          
          inventoryData.current_stock = totalStock;
          inventoryData.reserved_stock = totalReserved;
          inventoryData.shop_inventory = shopInventory;
        }
      }

      console.log(`✅ Inventory calculated: ${inventoryData.current_stock} units`);
      console.log(`✅ Shop inventory details:`, inventoryData.shop_inventory);
      return inventoryData;
    } catch (error) {
      console.error('Error getting inventory:', error);
      return {
        current_stock: 0,
        reserved_stock: 0,
        minimum_stock: 0,
        maximum_stock: null,
        last_restocked: null,
        shop_inventory: []
      };
    }
  };

  const calculateProfitMargin = () => {
    if (!product) return 0;
    
    const sellingPrice = product.base_selling_price || 0;
    const costPrice = product.base_cost_price || 0;
    
    if (costPrice <= 0) return 0;
    
    const margin = ((sellingPrice - costPrice) / costPrice * 100);
    return margin.toFixed(1);
  };

  const calculateProfitPerUnit = () => {
    if (!product) return 0;
    
    const sellingPrice = product.base_selling_price || 0;
    const costPrice = product.base_cost_price || 0;
    
    return sellingPrice - costPrice;
  };

  const calculateAvailableStock = () => {
    if (!inventory) return 0;
    
    if (product?.has_variants) {
      // For variants, sum all inventory
      if (Array.isArray(inventory.shop_inventory)) {
        return inventory.shop_inventory.reduce((total, inv) => {
          const currentStock = inv.current_stock || 0;
          const reservedStock = inv.reserved_stock || 0;
          return total + (currentStock - reservedStock);
        }, 0);
      }
      return 0;
    } else {
      // For simple products
      const currentStock = inventory.current_stock || 0;
      const reservedStock = inventory.reserved_stock || 0;
      return currentStock - reservedStock;
    }
  };

  const calculateTaxInfo = () => {
    if (!product || !product.tax_id) return { amount: 0, rate: 0, name: 'No Tax', tax_type: null };
    
    const selectedTax = taxes.find(t => t.id === product.tax_id);
    if (!selectedTax) return { amount: 0, rate: 0, name: 'No Tax', tax_type: null };
    
    const price = product.base_selling_price || 0;
    let taxAmount;
    
    if (product.tax_inclusive) {
      const taxRate = selectedTax.rate / 100;
      taxAmount = price - (price / (1 + taxRate));
    } else {
      taxAmount = price * (selectedTax.rate / 100);
    }
    
    return { 
      amount: taxAmount.toFixed(2), 
      rate: selectedTax.rate,
      name: selectedTax.name,
      tax_type: selectedTax.tax_type
    };
  };

  const calculateFinalPrice = () => {
    if (!product) return 0;
    
    const price = product.base_selling_price || 0;
    const taxInfo = calculateTaxInfo();
    
    if (product.tax_inclusive) {
      return price;
    } else {
      return (price + parseFloat(taxInfo.amount)).toFixed(2);
    }
  };

  const getStockStatus = () => {
    const available = calculateAvailableStock();
    const reorderLevel = product?.reorder_level || 10;
    
    if (available <= 0) {
      return { status: 'out', color: '#DC2626', label: 'Out of Stock', icon: 'close-circle' };
    } else if (available <= reorderLevel) {
      return { status: 'low', color: '#DC2626', label: 'Low Stock', icon: 'warning' };
    } else if (available <= reorderLevel * 2) {
      return { status: 'medium', color: '#F59E0B', label: 'Medium Stock', icon: 'alert-circle' };
    } else {
      return { status: 'high', color: '#10B981', label: 'Good Stock', icon: 'checkmark-circle' };
    }
  };

  const getCategoryInfo = () => {
    if (!product || !product.category_id) {
      return { name: 'Uncategorized', color: '#6B7280', icon: 'cube' };
    }
    
    const category = categories.find(cat => cat.id === product.category_id);
    return category || { name: 'Uncategorized', color: '#6B7280', icon: 'cube' };
  };

  const getProductTypeInfo = () => {
    const type = product?.product_type || 'physical';
    return PRODUCT_TYPES.find(t => t.id === type) || PRODUCT_TYPES[0];
  };

  const getUnitInfo = () => {
    const unit = product?.unit_of_measure || 'pcs';
    return UNIT_OF_MEASURES.find(u => u.id === unit) || UNIT_OF_MEASURES[0];
  };

  const getTaxInfo = () => {
    if (!product || !product.tax_id) return null;
    return taxes.find(tax => tax.id === product.tax_id);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  const formatCurrency = (amount) => {
    const numAmount = parseFloat(amount) || 0;
    return `KES ${numAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleEditProduct = () => {
    if (!product) return;
    
    navigation.navigate('EditProduct', {
      productId: product.id,
      shopId: shopId,
      shopName: shop?.name || '',
      businessId: product.business_id,
    });
  };

  const handleToggleStatus = async () => {
    if (!product || !currentUser) return;
    
    Alert.alert(
      product.is_active ? 'Deactivate Product' : 'Activate Product',
      `Are you sure you want to ${product.is_active ? 'deactivate' : 'activate'} "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: product.is_active ? 'Deactivate' : 'Activate',
          style: product.is_active ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await ProductService.updateProduct(product.id, { 
                is_active: !product.is_active 
              }, currentUser.id);
              
              // Reload product data
              await loadProductData();
              
              Alert.alert(
                'Success',
                `Product has been ${product.is_active ? 'deactivated' : 'activated'}`,
                [{ text: 'OK' }]
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to update product status');
            }
          }
        }
      ]
    );
  };

  const handleAdjustStock = () => {
    navigation.navigate('AdjustStock', {
      productId: product.id,
      productName: product.name,
      shopId: shopId,
      currentStock: calculateAvailableStock(),
      unit: getUnitInfo().symbol
    });
  };

  const handleViewShop = () => {
    if (shop) {
      navigation.navigate('ShopDetail', { 
        shopId: shop.id,
        shopName: shop.name,
        businessId: shop.business_id 
      });
    }
  };

  const handleDeleteProduct = async () => {
    if (!product || !currentUser) return;
    
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await ProductService.deleteProduct(product.id, currentUser.id);
              
              Alert.alert('Success', `"${product.name}" has been deleted`);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete product');
            }
          }
        }
      ]
    );
  };

  const renderPriceHistoryModal = () => (
    <Modal
      visible={showPriceHistoryModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowPriceHistoryModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Price History</Text>
            <TouchableOpacity
              onPress={() => setShowPriceHistoryModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <View style={styles.historyList}>
              {priceHistory.length > 0 ? (
                priceHistory.map((item, index) => (
                  <View key={item.id} style={styles.historyItem}>
                    <View style={styles.historyHeader}>
                      <View style={styles.historyIconContainer}>
                        <Ionicons name="pricetag" size={20} color="#FF6B00" />
                      </View>
                      <View style={styles.historyInfo}>
                        <Text style={styles.historyTitle}>{item.change_reason || 'Price Change'}</Text>
                        <Text style={styles.historySubtitle}>
                          {item.changed_by_username ? `By ${item.changed_by_username}` : ''} • {formatDate(item.changed_at)}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.priceChangeContainer}>
                      <View style={styles.oldPrice}>
                        <Text style={styles.priceLabel}>Old Price</Text>
                        <Text style={styles.priceValue}>{formatCurrency(item.old_price)}</Text>
                      </View>
                      <Ionicons name="arrow-forward" size={20} color="#9ca3af" />
                      <View style={styles.newPrice}>
                        <Text style={styles.priceLabel}>New Price</Text>
                        <Text style={[styles.priceValue, { color: '#FF6B00' }]}>
                          {formatCurrency(item.new_price)}
                        </Text>
                      </View>
                      <View style={styles.changeAmount}>
                        <Text style={styles.priceLabel}>Change</Text>
                        <Text style={[
                          styles.priceValue,
                          { color: item.new_price > item.old_price ? '#DC2626' : '#10B981' }
                        ]}>
                          {item.new_price > item.old_price ? '+' : ''}
                          {formatCurrency(item.new_price - item.old_price)}
                        </Text>
                      </View>
                    </View>
                    
                    {index < priceHistory.length - 1 && <View style={styles.historyDivider} />}
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="time-outline" size={48} color="#9ca3af" />
                  <Text style={styles.emptyStateText}>No price history available</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderInventoryHistoryModal = () => (
    <Modal
      visible={showInventoryHistoryModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowInventoryHistoryModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Inventory Details</Text>
            <TouchableOpacity
              onPress={() => setShowInventoryHistoryModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <View style={styles.inventoryStats}>
              <View style={styles.inventoryStat}>
                <Text style={styles.inventoryStatValue}>
                  {inventory?.current_stock || 0}
                </Text>
                <Text style={styles.inventoryStatLabel}>Current Stock</Text>
              </View>
              <View style={styles.inventoryStat}>
                <Text style={styles.inventoryStatValue}>{calculateAvailableStock()}</Text>
                <Text style={styles.inventoryStatLabel}>Available</Text>
              </View>
              <View style={styles.inventoryStat}>
                <Text style={styles.inventoryStatValue}>
                  {inventory?.reserved_stock || 0}
                </Text>
                <Text style={styles.inventoryStatLabel}>Reserved</Text>
              </View>
              <View style={styles.inventoryStat}>
                <Text style={styles.inventoryStatValue}>{product?.reorder_level || 10}</Text>
                <Text style={styles.inventoryStatLabel}>Reorder Level</Text>
              </View>
            </View>
            
            {product?.has_variants ? (
              <View style={styles.variantInventorySection}>
                <Text style={styles.sectionTitle}>📦 Variant Inventory</Text>
                <View style={styles.variantInventoryList}>
                  {inventory?.shop_inventory?.map((inv, index) => (
                    <View key={inv.variant_id || index} style={styles.variantInventoryItem}>
                      <Text style={styles.variantName}>{inv.variant_name || 'Variant'}</Text>
                      <View style={styles.variantStockInfo}>
                        <Text style={styles.variantStockLabel}>Current:</Text>
                        <Text style={styles.variantStockValue}>{inv.current_stock || 0}</Text>
                        <Text style={styles.variantStockLabel}>Available:</Text>
                        <Text style={styles.variantStockValue}>
                          {(inv.current_stock || 0) - (inv.reserved_stock || 0)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.shopInventorySection}>
                <Text style={styles.sectionTitle}>🏪 Shop Inventory Details</Text>
                <View style={styles.shopInventoryList}>
                  {inventory?.shop_inventory?.map((shopInv, index) => (
                    <View key={shopInv.shop_id || index} style={styles.shopInventoryItem}>
                      <Text style={styles.shopName}>{shopInv.shop_name || 'Shop'}</Text>
                      <View style={styles.shopStockInfo}>
                        <View style={styles.shopStockRow}>
                          <Text style={styles.shopStockLabel}>Current Stock:</Text>
                          <Text style={styles.shopStockValue}>{shopInv.current_stock || 0}</Text>
                        </View>
                        <View style={styles.shopStockRow}>
                          <Text style={styles.shopStockLabel}>Available:</Text>
                          <Text style={[styles.shopStockValue, { color: '#10B981' }]}>
                            {(shopInv.current_stock || 0) - (shopInv.reserved_stock || 0)}
                          </Text>
                        </View>
                        <View style={styles.shopStockRow}>
                          <Text style={styles.shopStockLabel}>Reserved:</Text>
                          <Text style={styles.shopStockValue}>{shopInv.reserved_stock || 0}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
            
            {(!inventory?.shop_inventory || inventory.shop_inventory.length === 0) && (
              <View style={styles.emptyState}>
                <Ionicons name="cube-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyStateText}>
                  {shopId ? 'No inventory in this shop' : 'No inventory in any shop'}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderOverview = () => {
    if (!product) return null;
    
    const categoryInfo = getCategoryInfo();
    const productTypeInfo = getProductTypeInfo();
    const unitInfo = getUnitInfo();
    const taxInfo = getTaxInfo();
    const stockStatus = getStockStatus();
    const profitMargin = calculateProfitMargin();
    const profitPerUnit = calculateProfitPerUnit();
    const availableStock = calculateAvailableStock();
    const calculatedTaxInfo = calculateTaxInfo();
    const finalPrice = calculateFinalPrice();

    return (
      <>
        {/* Product Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.productHeader}>
            <View style={[styles.productIconLarge, { backgroundColor: `${categoryInfo.color}20` }]}>
              <Ionicons name={categoryInfo.icon || 'cube'} size={48} color={categoryInfo.color} />
            </View>
            <View style={styles.productTitleContainer}>
              <Text style={styles.productNameLarge}>{product.name}</Text>
              <View style={styles.productBadges}>
                <View style={[styles.productBadge, { backgroundColor: `${categoryInfo.color}20` }]}>
                  <Ionicons name="pricetag" size={12} color={categoryInfo.color} />
                  <Text style={[styles.productBadgeText, { color: categoryInfo.color }]}>
                    {categoryInfo.name}
                  </Text>
                </View>
                <View style={[styles.productBadge, { backgroundColor: `${productTypeInfo.color}20` }]}>
                  <Ionicons name={productTypeInfo.icon} size={12} color={productTypeInfo.color} />
                  <Text style={[styles.productBadgeText, { color: productTypeInfo.color }]}>
                    {productTypeInfo.label}
                  </Text>
                </View>
                {taxInfo && (
                  <View style={[styles.productBadge, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="percent" size={12} color="#D97706" />
                    <Text style={[styles.productBadgeText, { color: '#D97706' }]}>
                      {taxInfo.name}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.productStatus}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: product.is_active ? '#10B981' : '#EF4444' },
                  ]}
                />
                <Text style={styles.statusText}>
                  {product.is_active ? 'Active Product' : 'Inactive'}
                </Text>
              </View>
            </View>
          </View>
          
          {product.description && (
            <Text style={styles.productDescription}>
              {product.description}
            </Text>
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.stockCard, { borderTopColor: stockStatus.color }]}>
            <View style={styles.statHeader}>
              <Ionicons name={stockStatus.icon} size={24} color={stockStatus.color} />
            </View>
            <Text style={styles.statLabel}>Available Stock</Text>
            <Text style={[styles.statValue, { color: stockStatus.color }]}>
              {availableStock} {unitInfo.symbol}
            </Text>
            <Text style={styles.statTrend}>{stockStatus.label}</Text>
          </View>
          
          <View style={[styles.statCard, styles.profitCard]}>
            <View style={styles.statHeader}>
              <Ionicons name="trending-up" size={24} color="#10B981" />
            </View>
            <Text style={styles.statLabel}>Profit Margin</Text>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{profitMargin}%</Text>
            <Text style={styles.statTrend}>{formatCurrency(profitPerUnit)}/unit</Text>
          </View>
          
          <View style={[styles.statCard, styles.priceCard]}>
            <View style={styles.statHeader}>
              <Ionicons name="cash" size={24} color="#FF6B00" />
            </View>
            <Text style={styles.statLabel}>Final Price</Text>
            <Text style={[styles.statValue, { color: '#FF6B00' }]}>
              {formatCurrency(finalPrice)}
            </Text>
            <Text style={styles.statTrend}>
              {product.tax_inclusive ? 'Tax included' : 'Tax excluded'}
            </Text>
          </View>
          
          <View style={[styles.statCard, styles.taxCard]}>
            <View style={styles.statHeader}>
              <Ionicons name="percent" size={24} color="#8B5CF6" />
            </View>
            <Text style={styles.statLabel}>Tax</Text>
            <Text style={[styles.statValue, { color: '#8B5CF6' }]}>
              {taxInfo ? `${taxInfo.rate}%` : 'None'}
            </Text>
            <Text style={styles.statTrend}>
              {taxInfo ? taxInfo.name : 'No tax'}
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={handleEditProduct}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#3B82F620' }]}>
                <Ionicons name="create" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.quickActionText}>Edit Product</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={handleAdjustStock}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#10B98120' }]}>
                <Ionicons name="swap-vertical" size={24} color="#10B981" />
              </View>
              <Text style={styles.quickActionText}>Adjust Stock</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => setShowPriceHistoryModal(true)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#FF6B0020' }]}>
                <Ionicons name="time" size={24} color="#FF6B00" />
              </View>
              <Text style={styles.quickActionText}>Price History</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => setShowInventoryHistoryModal(true)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#8B5CF620' }]}>
                <Ionicons name="stats-chart" size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.quickActionText}>Stock Details</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pricing Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Pricing Details</Text>
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Ionicons name="pricetag-outline" size={20} color="#6B7280" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Cost Price</Text>
                <Text style={styles.detailValue}>{formatCurrency(product.base_cost_price || 0)}</Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="cash-outline" size={20} color="#6B7280" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Selling Price</Text>
                <Text style={[styles.detailValue, { color: '#FF6B00', fontWeight: '600' }]}>
                  {formatCurrency(product.base_selling_price || 0)}
                </Text>
              </View>
            </View>
            
            {product.base_wholesale_price && (
              <View style={styles.detailRow}>
                <Ionicons name="business-outline" size={20} color="#6B7280" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Wholesale Price</Text>
                  <Text style={styles.detailValue}>{formatCurrency(product.base_wholesale_price)}</Text>
                </View>
              </View>
            )}
            
            <View style={styles.detailRow}>
              <Ionicons name="trending-up-outline" size={20} color="#6B7280" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Profit per Unit</Text>
                <Text style={[styles.detailValue, { color: profitPerUnit > 0 ? '#10B981' : '#DC2626' }]}>
                  {formatCurrency(profitPerUnit)} ({profitMargin}%)
                </Text>
              </View>
            </View>
            
            {taxInfo && (
              <>
                <View style={styles.detailRow}>
                  <Ionicons name="percent-outline" size={20} color="#6B7280" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Tax</Text>
                    <Text style={styles.detailValue}>
                      {taxInfo.name} ({taxInfo.rate}%)
                    </Text>
                  </View>
                </View>
                
                <View style={styles.detailRow}>
                  <Ionicons name={product.tax_inclusive ? 'checkmark-circle' : 'close-circle'} 
                    size={20} color="#6B7280" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Tax Type</Text>
                    <Text style={styles.detailValue}>
                      {product.tax_inclusive ? 'Tax Inclusive' : 'Tax Exclusive'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.detailRow}>
                  <Ionicons name="calculator-outline" size={20} color="#6B7280" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Tax Amount</Text>
                    <Text style={styles.detailValue}>
                      {formatCurrency(calculatedTaxInfo.amount)}
                    </Text>
                  </View>
                </View>
                
                <View style={[styles.detailRow, styles.finalPriceRow]}>
                  <Ionicons name="receipt-outline" size={20} color="#FF6B00" />
                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: '#FF6B00' }]}>Final Price</Text>
                    <Text style={[styles.detailValue, { color: '#FF6B00', fontWeight: 'bold' }]}>
                      {formatCurrency(finalPrice)}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Inventory Details - UPDATED to show specific shop inventory */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 Inventory Details</Text>
          <View style={styles.detailsCard}>
            {product.has_variants === 1 ? (  // FIXED: Converted to explicit comparison to avoid boolean rendering issue
              <>
                <Text style={styles.variantsTitle}>Product has {product.variants?.length || 0} variants</Text>
                {inventory?.shop_inventory && inventory.shop_inventory.length > 0 ? (
                  <View style={styles.variantsList}>
                    {inventory.shop_inventory.map((inv) => (
                      <View key={inv.variant_id} style={styles.variantItem}>
                        <Text style={styles.variantName}>{inv.variant_name || 'Variant'}</Text>
                        <View style={styles.variantStock}>
                          <Text style={styles.variantStockLabel}>Stock:</Text>
                          <Text style={styles.variantStockValue}>{inv.current_stock || 0} {unitInfo.symbol}</Text>
                          <Text style={styles.variantStockLabel}>Available:</Text>
                          <Text style={[styles.variantStockValue, { color: '#10B981' }]}>
                            {(inv.current_stock || 0) - (inv.reserved_stock || 0)} {unitInfo.symbol}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noDataText}>
                    {shopId ? 'No inventory data for this shop' : 'No inventory data in any shop'}
                  </Text>
                )}
              </>
            ) : (
              <>
                <View style={styles.inventoryGrid}>
                  <View style={styles.inventoryItem}>
                    <Text style={styles.inventoryLabel}>Current Stock</Text>
                    <Text style={styles.inventoryValue}>
                      {inventory?.current_stock || 0} {unitInfo.symbol}
                    </Text>
                  </View>
                  <View style={styles.inventoryItem}>
                    <Text style={styles.inventoryLabel}>Reserved</Text>
                    <Text style={styles.inventoryValue}>
                      {inventory?.reserved_stock || 0} {unitInfo.symbol}
                    </Text>
                  </View>
                  <View style={styles.inventoryItem}>
                    <Text style={styles.inventoryLabel}>Available</Text>
                    <Text style={[
                      styles.inventoryValue,
                      { color: stockStatus.color, fontWeight: '600' }
                    ]}>
                      {availableStock} {unitInfo.symbol}
                    </Text>
                  </View>
                  <View style={styles.inventoryItem}>
                    <Text style={styles.inventoryLabel}>Reorder Level</Text>
                    <Text style={styles.inventoryValue}>
                      {product.reorder_level || 10} {unitInfo.symbol}
                    </Text>
                  </View>
                </View>
                
                {/* UPDATED: Show specific shop inventory details */}
                {inventory?.shop_inventory && inventory.shop_inventory.length > 0 ? (
                  <View style={styles.shopInventoryContainer}>
                    <Text style={styles.shopInventoryTitle}>
                      {shopId 
                        ? `📊 Inventory in ${shop?.name || 'selected shop'}`
                        : `📊 Inventory across ${allShops.length} shops`}
                    </Text>
                    <View style={styles.shopInventoryList}>
                      {inventory.shop_inventory.map((shopInv, index) => (
                        <View key={shopInv.shop_id || index} style={styles.shopInventoryItem}>
                          <Text style={styles.shopName}>{shopInv.shop_name || 'Shop'}</Text>
                          <View style={styles.shopStockInfo}>
                            <View style={styles.shopStockRow}>
                              <Text style={styles.shopStockLabel}>Current:</Text>
                              <Text style={styles.shopStockValue}>{shopInv.current_stock || 0} {unitInfo.symbol}</Text>
                            </View>
                            <View style={styles.shopStockRow}>
                              <Text style={styles.shopStockLabel}>Available:</Text>
                              <Text style={[styles.shopStockValue, { color: '#10B981' }]}>
                                {(shopInv.current_stock || 0) - (shopInv.reserved_stock || 0)} {unitInfo.symbol}
                              </Text>
                            </View>
                            {shopInv.reserved_stock > 0 && (
                              <View style={styles.shopStockRow}>
                                <Text style={styles.shopStockLabel}>Reserved:</Text>
                                <Text style={styles.shopStockValue}>{shopInv.reserved_stock || 0} {unitInfo.symbol}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : (
                  <Text style={styles.noDataText}>
                    {shopId ? 'No inventory data for this shop' : 'No inventory data in any shop'}
                  </Text>
                )}
                
                {inventory?.minimum_stock > 0 && (
                  <View style={styles.detailRow}>
                    <Ionicons name="alert-circle-outline" size={20} color="#6B7280" />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Minimum Stock</Text>
                      <Text style={styles.detailValue}>
                        {inventory.minimum_stock} {unitInfo.symbol}
                      </Text>
                    </View>
                  </View>
                )}
                
                {inventory?.maximum_stock && (
                  <View style={styles.detailRow}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#6B7280" />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Maximum Stock</Text>
                      <Text style={styles.detailValue}>
                        {inventory.maximum_stock} {unitInfo.symbol}
                      </Text>
                    </View>
                  </View>
                )}
              </>
            )}
            
            {inventory?.last_restocked && (
              <View style={styles.detailRow}>
                <Ionicons name="reload-circle-outline" size={20} color="#6B7280" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Last Restocked</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(inventory.last_restocked)}
                  </Text>
                </View>
              </View>
            )}
            
            <View style={styles.detailRow}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#6B7280" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Stock Tracking</Text>
                <Text style={styles.detailValue}>
                  {product.is_trackable === 1 ? 'Enabled' : 'Disabled'}  {/* FIXED: Converted to explicit comparison */}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </>
    );
  };

  const renderDetails = () => {
    if (!product) return null;
    
    const unitInfo = getUnitInfo();
    const categoryInfo = getCategoryInfo();
    const taxInfo = getTaxInfo();
    
    // Helper function to safely render any value
    const renderSafeText = (value, fallback = 'N/A') => {
      if (value === null || value === undefined) {
        return fallback;
      }
      
      // Convert booleans to strings
      if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
      }
      
      // Convert numbers to strings
      if (typeof value === 'number') {
        return value.toString();
      }
      
      // Return strings as-is
      if (typeof value === 'string') {
        return value;
      }
      
      // For objects or arrays, stringify
      try {
        return JSON.stringify(value);
      } catch (error) {
        return fallback;
      }
    };

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Product Details</Text>
        <View style={styles.detailsCard}>
          {/* Product Information */}
          <View style={styles.detailRow}>
            <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>SKU</Text>
              <Text style={styles.detailValue}>
                {renderSafeText(product.base_sku)}
              </Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="barcode-outline" size={20} color="#6B7280" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Barcode</Text>
              <Text style={styles.detailValue}>
                {renderSafeText(product.base_barcode)}
              </Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="cube-outline" size={20} color="#6B7280" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Unit of Measure</Text>
              <Text style={styles.detailValue}>
                {renderSafeText(unitInfo.name)} ({renderSafeText(unitInfo.symbol)})
              </Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="pricetag-outline" size={20} color="#6B7280" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Category</Text>
              <View style={styles.categoryDetail}>
                <View style={[
                  styles.categoryDot,
                  { backgroundColor: categoryInfo.color || '#6B7280' }
                ]} />
                <Text style={styles.detailValue}>
                  {renderSafeText(categoryInfo.name)}
                </Text>
              </View>
            </View>
          </View>
          
          {/* FIXED: has_variants is integer (0/1), not boolean */}
          <View style={styles.detailRow}>
            <Ionicons name="git-branch-outline" size={20} color="#6B7280" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Has Variants</Text>
              <Text style={styles.detailValue}>
                {product.has_variants === 1 ? 'Yes' : 'No'}
              </Text>
            </View>
          </View>
          
          {product.has_variants === 1 && product.variants && (
            <View style={styles.detailRow}>
              <Ionicons name="layers-outline" size={20} color="#6B7280" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Number of Variants</Text>
                <Text style={styles.detailValue}>
                  {renderSafeText(product.variants.length)}
                </Text>
              </View>
            </View>
          )}
          
          {taxInfo && (
            <View style={styles.detailRow}>
              <Ionicons name="calculator-outline" size={20} color="#6B7280" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Tax</Text>
                <Text style={styles.detailValue}>
                  {renderSafeText(taxInfo.name)} ({renderSafeText(taxInfo.rate)}%)
                  {taxInfo.tax_type ? ` - ${renderSafeText(TAX_TYPES.find(t => t.id === taxInfo.tax_type)?.name || taxInfo.tax_type)}` : ''}
                </Text>
              </View>
            </View>
          )}
          
          {/* Business Information */}
          {business && (
            <View style={styles.detailRow}>
              <Ionicons name="business-outline" size={20} color="#6B7280" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Business</Text>
                <Text style={styles.detailValue}>
                  {renderSafeText(business.name)}
                </Text>
              </View>
            </View>
          )}
          
          {shop && (
            <View style={styles.detailRow}>
              <Ionicons name="storefront-outline" size={20} color="#6B7280" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Shop</Text>
                <TouchableOpacity onPress={handleViewShop}>
                  <Text style={[styles.detailValue, { color: '#FF6B00' }]}>
                    {renderSafeText(shop.name)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {/* Timestamps */}
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={20} color="#6B7280" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Created</Text>
              <Text style={styles.detailValue}>
                {renderSafeText(formatDate(product.created_at))}
              </Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={20} color="#6B7280" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Last Updated</Text>
              <Text style={styles.detailValue}>
                {renderSafeText(formatDate(product.updated_at))}
              </Text>
            </View>
          </View>
          
          {product.created_by_username && (
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={20} color="#6B7280" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Created By</Text>
                <Text style={styles.detailValue}>
                  {renderSafeText(product.created_by_username)}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading || !product) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomHeaderWithButton
          title="Loading..."
          leftButtonIcon="arrow-back"
          leftButtonAction={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>Loading product details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeaderWithButton
        title={product.name}
        leftButtonIcon="arrow-back"
        leftButtonAction={() => navigation.goBack()}
        rightButtonIcon="ellipsis-vertical"
        rightButtonAction={() => {
          Alert.alert(
            'Product Actions',
            'Select an action',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Edit Product', onPress: handleEditProduct },
              { 
                text: product.is_active ? 'Deactivate' : 'Activate', 
                onPress: handleToggleStatus 
              },
              { 
                text: 'Delete Product', 
                style: 'destructive',
                onPress: handleDeleteProduct 
              },
            ]
          );
        }}
      />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
            onPress={() => setActiveTab('overview')}
          >
            <Ionicons 
              name="grid-outline" 
              size={20} 
              color={activeTab === 'overview' ? '#FF6B00' : '#9ca3af'} 
            />
            <Text style={[
              styles.tabLabel,
              activeTab === 'overview' && styles.activeTabLabel
            ]}>Overview</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'details' && styles.activeTab]}
            onPress={() => setActiveTab('details')}
          >
            <Ionicons 
              name="information-circle-outline" 
              size={20} 
              color={activeTab === 'details' ? '#FF6B00' : '#9ca3af'} 
            />
            <Text style={[
              styles.tabLabel,
              activeTab === 'details' && styles.activeTabLabel
            ]}>Details</Text>
          </TouchableOpacity>
        </View>

        {/* Content based on active tab */}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'details' && renderDetails()}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={handleToggleStatus}
        >
          <Ionicons 
            name={product.is_active ? 'pause-circle' : 'play-circle'} 
            size={20} 
            color="#6B7280" 
          />
          <Text style={styles.secondaryButtonText}>
            {product.is_active ? 'Deactivate' : 'Activate'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={handleEditProduct}
        >
          <Ionicons name="create" size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>Edit Product</Text>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      {renderPriceHistoryModal()}
      {renderInventoryHistoryModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    paddingBottom: 120,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: '#FFF7F0',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginLeft: 6,
  },
  activeTabLabel: {
    color: '#FF6B00',
  },
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  productIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  productTitleContainer: {
    flex: 1,
  },
  productNameLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  productBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 8,
  },
  productBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  productBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  productStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#6B7280',
  },
  productDescription: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    margin: '1%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  stockCard: {
    borderTopWidth: 4,
  },
  profitCard: {
    borderTopWidth: 4,
    borderTopColor: '#10B981',
  },
  priceCard: {
    borderTopWidth: 4,
    borderTopColor: '#FF6B00',
  },
  taxCard: {
    borderTopWidth: 4,
    borderTopColor: '#8B5CF6',
  },
  statHeader: {
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statTrend: {
    fontSize: 12,
    color: '#9ca3af',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    margin: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailContent: {
    flex: 1,
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inventoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  inventoryItem: {
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  inventoryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  inventoryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  variantsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  variantsList: {
    marginBottom: 16,
  },
  variantItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  variantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  variantStock: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  variantStockLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 4,
  },
  variantStockValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 12,
  },
  shopInventoryContainer: {
    marginTop: 16,
  },
  shopInventoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  shopInventoryList: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
  },
  shopInventoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  shopName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  shopStockInfo: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  shopStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  shopStockLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 4,
  },
  shopStockValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  finalPriceRow: {
    backgroundColor: '#FFF7F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
  },
  noDataText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 8,
  },
  primaryButton: {
    flex: 2,
    backgroundColor: '#FF6B00',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
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
  inventoryStats: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  inventoryStat: {
    flex: 1,
    alignItems: 'center',
  },
  inventoryStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  inventoryStatLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  variantInventorySection: {
    marginTop: 16,
  },
  variantInventoryList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  variantInventoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  variantStockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shopInventorySection: {
    marginTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 12,
    textAlign: 'center',
  },
});