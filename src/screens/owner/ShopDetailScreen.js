// src/screens/owner/ShopDetailScreen.js
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBusiness } from '../../context/BusinessContext';
import { useShop } from '../../context/ShopContext';
import CustomHeaderWithButton from '../../components/CustomHeaderWithButton';
import EmptyState from '../../components/EmptyState';

// Shop types exactly matching Django model
const SHOP_TYPES = [
  { id: 'retail', label: 'Retail Store', icon: 'storefront', color: '#FF6B00' },
  { id: 'wholesale', label: 'Wholesale', icon: 'cube', color: '#2196F3' },
  { id: 'supermarket', label: 'Supermarket', icon: 'cart', color: '#4CAF50' },
  { id: 'restaurant', label: 'Restaurant/Cafe', icon: 'restaurant', color: '#9C27B0' },
  { id: 'kiosk', label: 'Kiosk', icon: 'grid', color: '#FF9800' },
  { id: 'pharmacy', label: 'Pharmacy', icon: 'medical', color: '#607D8B' },
  { id: 'other', label: 'Other', icon: 'business', color: '#795548' },
];

export default function ShopDetailScreen({ route, navigation }) {
  const { shopId } = route.params || {};
  const { database } = useBusiness();
  const { getShopById } = useShop();
  
  const [shop, setShop] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadShopData();
    
    const unsubscribe = navigation.addListener('focus', () => {
      loadShopData();
    });

    return unsubscribe;
  }, [navigation, shopId]);

  const loadShopData = async () => {
    try {
      setLoading(true);
      
      // Load shop details from shop context
      const shopData = await getShopById(shopId);
      if (!shopData) {
        Alert.alert('Error', 'Shop not found');
        navigation.goBack();
        return;
      }
      
      setShop(shopData);
      
      // Load employees for this shop
      const employeesData = await database.EmployeeService.getEmployeesByShop(shopId);
      setEmployees(employeesData);
      
      // Load hardcoded products for this shop
      loadHardcodedProducts();
      
    } catch (error) {
      console.error('Error loading shop data:', error);
      Alert.alert('Error', 'Failed to load shop details');
    } finally {
      setLoading(false);
    }
  };

  const loadHardcodedProducts = () => {
    // Hardcoded products for now (5 products as requested)
    const hardcodedProducts = [
      {
        id: 'prod_001',
        name: 'Premium Coffee',
        description: 'Arabica coffee beans, 500g',
        category: 'beverages',
        product_type: 'physical',
        barcode: '789123456001',
        sku: 'COFFEE-500G',
        cost_price: 350,
        selling_price: 650,
        wholesale_price: 550,
        is_taxable: true,
        tax_rate: 16,
        unit_of_measure: 'pcs',
        reorder_level: 10,
        is_trackable: true,
        current_stock: 25,
        minimum_stock: 5,
        is_active: true,
        created_at: '2024-01-15T10:30:00Z',
      },
      {
        id: 'prod_002',
        name: 'Organic Sugar',
        description: 'Natural cane sugar, 1kg',
        category: 'groceries',
        product_type: 'physical',
        barcode: '789123456002',
        sku: 'SUGAR-1KG',
        cost_price: 120,
        selling_price: 250,
        wholesale_price: 200,
        is_taxable: true,
        tax_rate: 16,
        unit_of_measure: 'pcs',
        reorder_level: 20,
        is_trackable: true,
        current_stock: 48,
        minimum_stock: 10,
        is_active: true,
        created_at: '2024-01-16T14:20:00Z',
      },
      {
        id: 'prod_003',
        name: 'Milk Powder',
        description: 'Full cream milk powder, 400g',
        category: 'dairy',
        product_type: 'physical',
        barcode: '789123456003',
        sku: 'MILK-400G',
        cost_price: 180,
        selling_price: 320,
        wholesale_price: 280,
        is_taxable: true,
        tax_rate: 16,
        unit_of_measure: 'pcs',
        reorder_level: 15,
        is_trackable: true,
        current_stock: 32,
        minimum_stock: 8,
        is_active: true,
        created_at: '2024-01-17T09:15:00Z',
      },
      {
        id: 'prod_004',
        name: 'Tea Leaves',
        description: 'Premium tea leaves, 250g',
        category: 'beverages',
        product_type: 'physical',
        barcode: '789123456004',
        sku: 'TEA-250G',
        cost_price: 220,
        selling_price: 420,
        wholesale_price: 350,
        is_taxable: true,
        tax_rate: 16,
        unit_of_measure: 'pcs',
        reorder_level: 12,
        is_trackable: true,
        current_stock: 18,
        minimum_stock: 6,
        is_active: true,
        created_at: '2024-01-18T11:45:00Z',
      },
      {
        id: 'prod_005',
        name: 'Cooking Oil',
        description: 'Vegetable cooking oil, 1L',
        category: 'cooking',
        product_type: 'physical',
        barcode: '789123456005',
        sku: 'OIL-1L',
        cost_price: 280,
        selling_price: 480,
        wholesale_price: 400,
        is_taxable: true,
        tax_rate: 16,
        unit_of_measure: 'pcs',
        reorder_level: 8,
        is_trackable: true,
        current_stock: 0,
        minimum_stock: 4,
        is_active: false,
        created_at: '2024-01-19T16:30:00Z',
      },
    ];
    
    setProducts(hardcodedProducts);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadShopData();
    setRefreshing(false);
  };

  const handleEditShop = () => {
    navigation.navigate('EditShop', { 
      shopId: shop.id,
    });
  };

  const handleAddEmployee = () => {
    navigation.navigate('AddEmployee', { 
      businessId: shop.business_id,
      shopId: shop.id,
      shopName: shop.name,
    });
  };

  const handleViewEmployee = (employee) => {
    navigation.navigate('EmployeeDetail', { 
      employeeId: employee.id,
      employeeName: employee.name || `${employee.first_name} ${employee.last_name}`,
      businessId: shop.business_id,
    });
  };

  const handleDeleteEmployee = async (employeeId, employeeName) => {
    Alert.alert(
      'Remove Employee',
      `Are you sure you want to remove ${employeeName} from ${shop.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await database.EmployeeService.deleteEmployee(employeeId);
              if (result.success) {
                Alert.alert('Success', `${employeeName} has been removed from the shop`);
                await loadShopData();
              } else {
                Alert.alert('Error', result.error || 'Failed to remove employee');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to remove employee');
            }
          }
        }
      ]
    );
  };

  const handleViewProducts = () => {
    navigation.navigate('ShopProducts', {
      shopId: shop.id,
      shopName: shop.name,
      businessId: shop.business_id,
    });
  };

  const handleAddProduct = () => {
    navigation.navigate('AddProduct', {
      shopId: shop.id,
      shopName: shop.name,
      businessId: shop.business_id,
    });
  };

  const handleViewProduct = (product) => {
    navigation.navigate('ProductDetail', {
      productId: product.id,
      productName: product.name,
      shopId: shop.id,
      shopName: shop.name,
    });
  };

  const getShopType = () => {
    return SHOP_TYPES.find(type => type.id === shop.shop_type) || SHOP_TYPES[0];
  };

  const renderEmployeeItem = ({ item }) => {
    const employeeName = item.first_name && item.last_name 
      ? `${item.first_name} ${item.last_name}`
      : item.username || `Employee ${item.id.substring(0, 8)}`;

    return (
      <TouchableOpacity 
        style={styles.employeeCard}
        onPress={() => handleViewEmployee(item)}
        activeOpacity={0.7}
      >
        <View style={styles.employeeHeader}>
          <View style={[styles.employeeAvatar, { backgroundColor: '#FF6B00' }]}>
            <Text style={styles.avatarText}>
              {item.first_name?.[0] || item.username?.[0] || 'E'}
              {item.last_name?.[0] || ''}
            </Text>
          </View>
          <View style={styles.employeeInfo}>
            <Text style={styles.employeeName}>{employeeName}</Text>
            <Text style={styles.employeeRole}>{item.role_name || item.role_type || 'Employee'}</Text>
            <Text style={styles.employeeEmail}>{item.email || item.username || 'No email'}</Text>
          </View>
        </View>
        
        <View style={styles.employeeFooter}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: item.is_active ? '#DCFCE7' : '#FEE2E2' }
          ]}>
            <View style={[
              styles.statusDot,
              { backgroundColor: item.is_active ? '#16A34A' : '#DC2626' }
            ]} />
            <Text style={[
              styles.statusText,
              { color: item.is_active ? '#166534' : '#991B1B' }
            ]}>
              {item.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.employeeAction}
            onPress={() => handleDeleteEmployee(item.id, employeeName)}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderProductItem = ({ item }) => {
    const isLowStock = item.current_stock <= item.reorder_level;
    const profitMargin = ((item.selling_price - item.cost_price) / item.cost_price * 100).toFixed(1);

    return (
      <TouchableOpacity 
        style={styles.productCard}
        onPress={() => handleViewProduct(item)}
        activeOpacity={0.7}
      >
        <View style={styles.productHeader}>
          <View style={styles.productIconContainer}>
            <View style={[styles.productIcon, { backgroundColor: '#FF6B0020' }]}>
              <Ionicons name="cube" size={24} color="#FF6B00" />
            </View>
          </View>
          <View style={styles.productInfo}>
            <View style={styles.productTitleRow}>
              <Text style={styles.productName}>{item.name}</Text>
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
            <Text style={styles.productDescription} numberOfLines={2}>
              {item.description}
            </Text>
            <Text style={styles.productCategory}>
              <Ionicons name="pricetag" size={12} color="#6B7280" /> {item.category}
            </Text>
          </View>
        </View>
        
        <View style={styles.productDetails}>
          <View style={styles.detailRow}>
            <View style={styles.detailColumn}>
              <Text style={styles.detailLabel}>Stock</Text>
              <Text style={[
                styles.detailValue,
                isLowStock && styles.lowStockText
              ]}>
                {item.current_stock} {item.unit_of_measure}
                {isLowStock && ' ⚠️'}
              </Text>
            </View>
            <View style={styles.detailColumn}>
              <Text style={styles.detailLabel}>Buying Price</Text>
              <Text style={styles.detailValue}>KES {item.cost_price}</Text>
            </View>
            <View style={styles.detailColumn}>
              <Text style={styles.detailLabel}>Selling Price</Text>
              <Text style={[styles.detailValue, styles.sellingPrice]}>
                KES {item.selling_price}
              </Text>
            </View>
          </View>
          
          <View style={styles.productFooter}>
            <View style={styles.productMetrics}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>SKU</Text>
                <Text style={styles.metricValue}>{item.sku}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Margin</Text>
                <Text style={[styles.metricValue, { color: profitMargin >= 0 ? '#16A34A' : '#DC2626' }]}>
                  {profitMargin}%
                </Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Tax</Text>
                <Text style={styles.metricValue}>{item.tax_rate}%</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.productAction}
              onPress={() => handleViewProduct(item)}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderOverview = () => {
    if (!shop) return null;

    const shopType = getShopType();

    return (
      <>
        {/* Shop Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.shopHeader}>
            <View style={[styles.shopIconLarge, { backgroundColor: `${shopType.color}20` }]}>
              <Ionicons name={shopType.icon} size={40} color={shopType.color} />
            </View>
            <View style={styles.shopTitleContainer}>
              <Text style={styles.shopNameLarge}>{shop.name}</Text>
              <Text style={styles.shopTypeLabel}>{shopType.label}</Text>
              <View style={styles.shopStatus}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: shop.is_active ? '#10B981' : '#EF4444' },
                  ]}
                />
                <Text style={styles.statusText}>
                  {shop.is_active ? 'Active Shop' : 'Inactive'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Shop Stats */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.employeesCard]}>
            <View style={styles.statHeader}>
              <Ionicons name="people" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.statLabel}>Employees</Text>
            <Text style={styles.statValue}>{employees.length}</Text>
            <TouchableOpacity onPress={() => setActiveTab('team')}>
              <Text style={styles.statTrend}>
                {employees.filter(e => e.is_active).length} active
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.statCard, styles.productsCard]}>
            <View style={styles.statHeader}>
              <Ionicons name="cube" size={24} color="#FF6B00" />
            </View>
            <Text style={styles.statLabel}>Products</Text>
            <Text style={styles.statValue}>{products.length}</Text>
            <TouchableOpacity onPress={() => setActiveTab('products')}>
              <Text style={styles.statTrend}>
                {products.filter(p => p.is_active).length} active
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.statCard, styles.taxCard]}>
            <View style={styles.statHeader}>
              <Ionicons name="percent" size={24} color="#FF6B00" />
            </View>
            <Text style={styles.statLabel}>Tax Rate</Text>
            <Text style={styles.statValue}>{shop.tax_rate}%</Text>
            <Text style={styles.statTrend}>VAT included</Text>
          </View>
          
          <View style={[styles.statCard, styles.currencyCard]}>
            <View style={styles.statHeader}>
              <Ionicons name="cash" size={24} color="#4CAF50" />
            </View>
            <Text style={styles.statLabel}>Currency</Text>
            <Text style={styles.statValue}>{shop.currency}</Text>
            <Text style={styles.statTrend}>Primary currency</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={handleAddEmployee}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#3B82F620' }]}>
                <Ionicons name="person-add" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.quickActionText}>Add Employee</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={handleAddProduct}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#FF6B0020' }]}>
                <Ionicons name="add-circle" size={24} color="#FF6B00" />
              </View>
              <Text style={styles.quickActionText}>Add Product</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={handleViewProducts}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#10B98120' }]}>
                <Ionicons name="list" size={24} color="#10B981" />
              </View>
              <Text style={styles.quickActionText}>View Products</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('EditShop', { shopId: shop.id })}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#8B5CF620' }]}>
                <Ionicons name="settings" size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.quickActionText}>Shop Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Shop Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏪 Shop Details</Text>
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={20} color="#6B7280" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>{shop.location}</Text>
              </View>
            </View>
            
            {shop.phone_number ? (
              <View style={styles.detailRow}>
                <Ionicons name="call-outline" size={20} color="#6B7280" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>{shop.phone_number}</Text>
                </View>
              </View>
            ) : null}
            
            {shop.email ? (
              <View style={styles.detailRow}>
                <Ionicons name="mail-outline" size={20} color="#6B7280" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{shop.email}</Text>
                </View>
              </View>
            ) : null}
            
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={20} color="#6B7280" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Last Updated</Text>
                <Text style={styles.detailValue}>
                  {shop.updated_at ? new Date(shop.updated_at).toLocaleDateString() : 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Recent Products */}
        {products.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📦 Recent Products</Text>
              {products.length > 2 && (
                <TouchableOpacity onPress={() => setActiveTab('products')}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {products.slice(0, 2).map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.miniProductCard}
                onPress={() => handleViewProduct(product)}
              >
                <View style={styles.miniProductInfo}>
                  <View style={[styles.miniProductIcon, { backgroundColor: '#FF6B0020' }]}>
                    <Ionicons name="cube" size={16} color="#FF6B00" />
                  </View>
                  <View>
                    <Text style={styles.miniProductName} numberOfLines={1}>
                      {product.name}
                    </Text>
                    <Text style={styles.miniProductSku}>{product.sku}</Text>
                  </View>
                </View>
                <View style={styles.miniProductStatus}>
                  <Text style={[
                    styles.miniProductStock,
                    product.current_stock <= product.reorder_level && styles.lowStockText
                  ]}>
                    {product.current_stock} in stock
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent Employees */}
        {employees.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>👥 Recent Employees</Text>
              {employees.length > 2 && (
                <TouchableOpacity onPress={() => setActiveTab('team')}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {employees.slice(0, 2).map((employee) => (
              <TouchableOpacity
                key={employee.id}
                style={styles.miniEmployeeCard}
                onPress={() => handleViewEmployee(employee)}
              >
                <View style={styles.miniEmployeeInfo}>
                  <View style={[styles.miniEmployeeAvatar, { backgroundColor: '#FF6B00' }]}>
                    <Text style={styles.miniAvatarText}>
                      {employee.first_name?.[0] || employee.username?.[0] || 'E'}
                      {employee.last_name?.[0] || ''}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.miniEmployeeName}>
                      {employee.first_name && employee.last_name 
                        ? `${employee.first_name} ${employee.last_name}`
                        : employee.username || `Employee ${employee.id.substring(0, 8)}`}
                    </Text>
                    <Text style={styles.miniEmployeeRole}>
                      {employee.role_name || employee.role_type || 'Employee'}
                    </Text>
                  </View>
                </View>
                <View style={styles.miniEmployeeStatus}>
                  <View
                    style={[
                      styles.miniStatusDot,
                      { backgroundColor: employee.is_active ? '#10B981' : '#EF4444' },
                    ]}
                  />
                  <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </>
    );
  };

  const renderTeamList = () => (
    <View style={styles.section}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabTitle}>Team Members ({employees.length})</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddEmployee}
        >
          <Ionicons name="add" size={20} color="#FF6B00" />
          <Text style={styles.addButtonText}>Add Member</Text>
        </TouchableOpacity>
      </View>
      
      {employees.length > 0 ? (
        <>
          <View style={styles.teamStats}>
            <View style={styles.teamStat}>
              <Text style={styles.teamStatValue}>{employees.filter(e => e.is_active).length}</Text>
              <Text style={styles.teamStatLabel}>Active</Text>
            </View>
            <View style={styles.teamStat}>
              <Text style={styles.teamStatValue}>{employees.length}</Text>
              <Text style={styles.teamStatLabel}>Total</Text>
            </View>
            <View style={styles.teamStat}>
              <Text style={styles.teamStatValue}>
                {employees.filter(e => e.role_type === 'manager' || e.role_name?.toLowerCase().includes('manager')).length}
              </Text>
              <Text style={styles.teamStatLabel}>Managers</Text>
            </View>
          </View>
          
          <FlatList
            data={employees}
            renderItem={renderEmployeeItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        <EmptyState
          icon="people-outline"
          title="No Team Members"
          description="Add employees to manage this shop"
          actionText="Add First Employee"
          onAction={handleAddEmployee}
        />
      )}
    </View>
  );

  const renderProductsList = () => (
    <View style={styles.section}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabTitle}>Products ({products.length})</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddProduct}
        >
          <Ionicons name="add" size={20} color="#FF6B00" />
          <Text style={styles.addButtonText}>Add Product</Text>
        </TouchableOpacity>
      </View>
      
      {products.length > 0 ? (
        <>
          <View style={styles.productsStats}>
            <View style={styles.productStat}>
              <Text style={styles.productStatValue}>{products.filter(p => p.is_active).length}</Text>
              <Text style={styles.productStatLabel}>Active</Text>
            </View>
            <View style={styles.productStat}>
              <Text style={styles.productStatValue}>
                {products.filter(p => p.current_stock <= p.reorder_level && p.is_active).length}
              </Text>
              <Text style={styles.productStatLabel}>Low Stock</Text>
            </View>
            <View style={styles.productStat}>
              <Text style={styles.productStatValue}>
                {products.reduce((sum, p) => sum + p.current_stock, 0)}
              </Text>
              <Text style={styles.productStatLabel}>Total Stock</Text>
            </View>
          </View>
          
          <FlatList
            data={products}
            renderItem={renderProductItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        <EmptyState
          icon="cube-outline"
          title="No Products"
          description="Add products to start selling in this shop"
          actionText="Add First Product"
          onAction={handleAddProduct}
        />
      )}
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomHeaderWithButton
          title="Loading..."
          leftButtonIcon="arrow-back"
          leftButtonAction={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>Loading shop details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!shop) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomHeaderWithButton
          title="Shop Not Found"
          leftButtonIcon="arrow-back"
          leftButtonAction={() => navigation.goBack()}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>Shop not found</Text>
          <TouchableOpacity 
            style={styles.errorButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeaderWithButton
        title={shop.name}
        leftButtonIcon="arrow-back"
        leftButtonAction={() => navigation.goBack()}
        rightButtonIcon="ellipsis-vertical"
        rightButtonAction={() => navigation.navigate('EditShop', { shopId: shop.id })}
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
            style={[styles.tab, activeTab === 'team' && styles.activeTab]}
            onPress={() => setActiveTab('team')}
          >
            <Ionicons 
              name="people-outline" 
              size={20} 
              color={activeTab === 'team' ? '#FF6B00' : '#9ca3af'} 
            />
            <Text style={[
              styles.tabLabel,
              activeTab === 'team' && styles.activeTabLabel
            ]}>Team ({employees.length})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'products' && styles.activeTab]}
            onPress={() => setActiveTab('products')}
          >
            <Ionicons 
              name="cube-outline" 
              size={20} 
              color={activeTab === 'products' ? '#FF6B00' : '#9ca3af'} 
            />
            <Text style={[
              styles.tabLabel,
              activeTab === 'products' && styles.activeTabLabel
            ]}>Products ({products.length})</Text>
          </TouchableOpacity>
        </View>

        {/* Content based on active tab */}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'team' && renderTeamList()}
        {activeTab === 'products' && renderProductsList()}
      </ScrollView>

      {/* Floating Action Button based on active tab */}
      {activeTab === 'team' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddEmployee}
          activeOpacity={0.9}
        >
          <Ionicons name="person-add" size={24} color="#fff" />
        </TouchableOpacity>
      )}
      
      {activeTab === 'products' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddProduct}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      )}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  scrollContent: {
    paddingBottom: 100,
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
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  shopIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  shopTitleContainer: {
    flex: 1,
  },
  shopNameLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  shopTypeLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  shopStatus: {
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
  employeesCard: {
    borderTopWidth: 4,
    borderTopColor: '#3B82F6',
  },
  productsCard: {
    borderTopWidth: 4,
    borderTopColor: '#FF6B00',
  },
  taxCard: {
    borderTopWidth: 4,
    borderTopColor: '#FF6B00',
  },
  currencyCard: {
    borderTopWidth: 4,
    borderTopColor: '#4CAF50',
  },
  createdCard: {
    borderTopWidth: 4,
    borderTopColor: '#9C27B0',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  seeAllText: {
    fontSize: 14,
    color: '#FF6B00',
    fontWeight: '600',
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
    alignItems: 'center',
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
  miniProductCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  miniProductInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniProductIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  miniProductName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
    maxWidth: 150,
  },
  miniProductSku: {
    fontSize: 14,
    color: '#6B7280',
  },
  miniProductStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniProductStock: {
    fontSize: 14,
    color: '#16A34A',
    marginRight: 8,
  },
  miniEmployeeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  miniEmployeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniEmployeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  miniAvatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  miniEmployeeName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  miniEmployeeRole: {
    fontSize: 14,
    color: '#6B7280',
  },
  miniEmployeeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tabTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B00',
    marginLeft: 4,
  },
  teamStats: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  teamStat: {
    flex: 1,
    alignItems: 'center',
  },
  teamStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  teamStatLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  productsStats: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  productStat: {
    flex: 1,
    alignItems: 'center',
  },
  productStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  productStatLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  employeeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  employeeAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  employeeRole: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  employeeEmail: {
    fontSize: 12,
    color: '#9ca3af',
  },
  employeeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  employeeAction: {
    padding: 4,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
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
  productIconContainer: {
    marginRight: 12,
  },
  productIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  productStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  productStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  productDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    color: '#6B7280',
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
    marginBottom: 2,
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
  sellingPrice: {
    color: '#FF6B00',
    fontWeight: '600',
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productMetrics: {
    flexDirection: 'row',
    flex: 1,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  metricLabel: {
    fontSize: 10,
    color: '#9ca3af',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  productAction: {
    padding: 4,
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
});