// src/screens/shared/ShopProductsScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Modal,
  TextInput,
  Image,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useBusiness } from "../../context/BusinessContext";
import CustomHeader from "../../components/CustomHeader";
import EmptyState from "../../components/EmptyState";
import OfflineDataStatus from "../../components/OfflineDataStatus";
import { ProductService, CategoryService, openDatabase, ShopService } from "../../database";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ShopProductsScreen({ navigation }) {
  const { user } = useAuth();
  const { businesses, currentBusiness, selectBusiness } = useBusiness();

  // State
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [shops, setShops] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [selectedShop, setSelectedShop] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false); // Control filter visibility
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  // Animation value for filter collapse
  const [filterHeight] = useState(new Animated.Value(0));

  // Filter state
  const [filters, setFilters] = useState({
    hasStock: null,
    priceRange: { min: null, max: null },
    hasVariants: null,
    productType: "all",
  });

  // Add this state for tracking categories with direct products
  const [categoryIdsWithDirectProducts, setCategoryIdsWithDirectProducts] = useState(new Set());

  useEffect(() => {
    initializeScreen();
  }, []);

  useEffect(() => {
    if (selectedBusiness) {
      loadShops();
      loadProducts();
      loadCategories();
    }
  }, [selectedBusiness, selectedShop, selectedCategory, selectedSubcategory, searchQuery, filters]);

  // Toggle filter visibility
  useEffect(() => {
    Animated.timing(filterHeight, {
      toValue: showFilters ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [showFilters]);

  const initializeScreen = async () => {
    if (currentBusiness) {
      setSelectedBusiness(currentBusiness);
    } else if (businesses && businesses.length > 0) {
      setSelectedBusiness(businesses[0]);
    }
  };

  const loadShops = async () => {
    if (!selectedBusiness || !user) return;
    
    try {
      console.log("🏪 Loading shops for business:", selectedBusiness.id);
      const shopList = await ShopService.getShopsByBusiness(selectedBusiness.id);
      console.log("🏪 Found shops:", shopList.length);
      setShops(shopList);
    } catch (error) {
      console.error("Error loading shops:", error);
    }
  };

  const loadProducts = async () => {
    if (!selectedBusiness || !user) return;

    try {
      setLoading(true);
      console.log("🔍 Starting loadProducts with filters:", {
        selectedShop: selectedShop ? selectedShop.name : "All Shops",
        selectedCategory: selectedCategory?.name,
        selectedSubcategory: selectedSubcategory?.name,
        searchQuery,
        filters
      });

      // Build options for product query
      const options = {
        includeInactive: false,
        search: searchQuery,
        categoryId: null,
        hasVariants: filters.hasVariants,
        limit: 100,
        offset: 0,
      };

      console.log("🔍 ProductService options:", options);

      // Get products from database
      let productList = await ProductService.getProductsByBusiness(
        selectedBusiness.id,
        user.id,
        options
      );

      console.log("🔍 Raw products from service:", productList.length);
      
      // If a shop is selected, filter products by shop inventory
      if (selectedShop && selectedShop.id) {
        console.log(`🏪 Filtering products by shop: ${selectedShop.name}`);
        
        const db = await openDatabase();
        
        // Get inventory for this specific shop
        const inventoryList = await db.getAllAsync(
          `SELECT * FROM inventory 
           WHERE shop_id = ? 
           AND is_active = 1`,
          [selectedShop.id]
        );
        
        console.log(`📊 Found ${inventoryList.length} inventory records for shop ${selectedShop.name}`);
        
        // Create a map of product_id -> stock for this shop
        const inventoryMap = new Map();
        inventoryList.forEach(item => {
          if (item.product_id) {
            inventoryMap.set(item.product_id, item.current_stock || 0);
          }
        });
        
        console.log("🔍 Inventory map for selected shop:", Array.from(inventoryMap.entries()));
        
        // Filter products to only include those with inventory in this shop
        const originalCount = productList.length;
        productList = productList.filter(product => {
          const hasStockInShop = inventoryMap.has(product.id);
          console.log(`🔍 Product "${product.name}" (${product.id}): has stock in shop ${selectedShop.name}? ${hasStockInShop}`);
          return hasStockInShop;
        });
        console.log(`🔍 Shop filter: ${originalCount} → ${productList.length} products in shop ${selectedShop.name}`);
        
        // Attach shop-specific inventory to products
        productList = productList.map(product => {
          const stockInShop = inventoryMap.get(product.id) || 0;
          console.log(`🔍 Product "${product.name}" (${product.id}): stock in shop = ${stockInShop}`);
          
          return {
            ...product,
            inventory: {
              current_stock: stockInShop,
              reserved_stock: 0,
              minimum_stock: product.reorder_level || 0,
              maximum_stock: null,
              last_restocked: null
            }
          };
        });
      } else {
        console.log("🏪 No shop selected - showing products from all shops");
        // Get ALL shops for this business
        const db = await openDatabase();
        const allShops = await ShopService.getShopsByBusiness(selectedBusiness.id);
        console.log("🔍 All shops for business:", allShops.length);
        
        if (allShops.length > 0) {
          // Get ALL inventory records for ALL shops in this business
          const inventoryList = await db.getAllAsync(
            `SELECT * FROM inventory 
             WHERE shop_id IN (${allShops.map(shop => `'${shop.id}'`).join(',')}) 
             AND is_active = 1`,
            []
          );
          
          console.log(`📊 Found ${inventoryList.length} inventory records across all shops`);
          
          // Create a map of product_id -> total stock (sum across all shops)
          const inventoryMap = new Map();
          inventoryList.forEach(item => {
            if (item.product_id) {
              const currentTotal = inventoryMap.get(item.product_id) || 0;
              inventoryMap.set(item.product_id, currentTotal + (item.current_stock || 0));
            }
          });
          
          console.log("🔍 Inventory map size:", inventoryMap.size);
          
          // Attach inventory to products
          productList = productList.map(product => {
            const totalStock = inventoryMap.get(product.id) || 0;
            console.log(`🔍 Product "${product.name}" (${product.id}): total stock across all shops = ${totalStock}`);
            
            return {
              ...product,
              inventory: {
                current_stock: totalStock,
                reserved_stock: 0,
                minimum_stock: product.reorder_level || 0,
                maximum_stock: null,
                last_restocked: null
              }
            };
          });
        } else {
          console.log("⚠️ No shops found for this business");
          // Add empty inventory to all products
          productList = productList.map(product => ({
            ...product,
            inventory: {
              current_stock: 0,
              reserved_stock: 0,
              minimum_stock: product.reorder_level || 0,
              maximum_stock: null,
              last_restocked: null
            }
          }));
        }
      }

      // Function to get all descendant category IDs for a given category
      const getAllDescendantCategoryIds = (categoryId) => {
        const descendantIds = new Set([categoryId]);
        const stack = [categoryId];
        
        while (stack.length > 0) {
          const currentId = stack.pop();
          const currentCategory = allCategories.find(cat => cat.id === currentId);
          
          if (!currentCategory) continue;
          
          // Find children by checking parent_id matches current ID or current category's server_id
          const children = allCategories.filter(child => {
            // Direct parent match
            if (child.parent_id === currentId) {
              return true;
            }
            
            // Match by server_id
            if (currentCategory.server_id && child.parent_id === currentCategory.server_id) {
              return true;
            }
            
            return false;
          });
          
          children.forEach(child => {
            if (!descendantIds.has(child.id)) {
              descendantIds.add(child.id);
              stack.push(child.id);
            }
          });
        }
        
        return Array.from(descendantIds);
      };

      // Apply category filter - include all descendant categories
      if (selectedSubcategory) {
        console.log(`🔍 Filtering by subcategory: "${selectedSubcategory.name}" (ID: ${selectedSubcategory.id})`);
        const before = productList.length;
        productList = productList.filter(product => 
          product.category_id === selectedSubcategory.id
        );
        console.log(`🔍 Subcategory filter: ${before} → ${productList.length}`);
      } else if (selectedCategory) {
        console.log(`🔍 Filtering by category: "${selectedCategory.name}" (ID: ${selectedCategory.id})`);
        const descendantIds = getAllDescendantCategoryIds(selectedCategory.id);
        console.log(`🔍 Including descendant categories:`, descendantIds);
        
        const before = productList.length;
        productList = productList.filter(product => 
          product.category_id && descendantIds.includes(product.category_id)
        );
        console.log(`🔍 Category filter (with descendants): ${before} → ${productList.length}`);
      }

      // Apply additional filters
      const originalCount = productList.length;
      
      if (filters.hasStock !== null) {
        const before = productList.length;
        productList = productList.filter((product) => {
          if (filters.hasStock) {
            return product.inventory && product.inventory.current_stock > 0;
          } else {
            return !product.inventory || product.inventory.current_stock === 0;
          }
        });
        console.log(`🔍 Stock filter (${filters.hasStock}): ${before} → ${productList.length}`);
      }

      if (filters.priceRange.min !== null) {
        const before = productList.length;
        productList = productList.filter(
          (product) => product.base_selling_price >= filters.priceRange.min
        );
        console.log(`🔍 Min price filter (${filters.priceRange.min}): ${before} → ${productList.length}`);
      }

      if (filters.priceRange.max !== null) {
        const before = productList.length;
        productList = productList.filter(
          (product) => product.base_selling_price <= filters.priceRange.max
        );
        console.log(`🔍 Max price filter (${filters.priceRange.max}): ${before} → ${productList.length}`);
      }

      if (filters.productType !== "all") {
        const before = productList.length;
        productList = productList.filter(
          (product) => product.product_type === filters.productType
        );
        console.log(`🔍 Product type filter (${filters.productType}): ${before} → ${productList.length}`);
      }

      console.log("✅ Final product count:", productList.length, "out of", originalCount);
      
      setProducts(productList);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    if (!selectedBusiness || !user) return;

    try {
      console.log("📊 Loading categories for business:", selectedBusiness.id);
      
      // Get all categories for this business
      const categoryList = await CategoryService.getCategoriesByBusiness(
        selectedBusiness.id,
        user.id
      );

      console.log("📋 Total categories found:", categoryList.length);
      
      // Get products to check which categories have products
      const productList = await ProductService.getProductsByBusiness(
        selectedBusiness.id,
        user.id,
        { includeInactive: false }
      );

      console.log("🛒 Total products found:", productList.length);

      // Create a set of category IDs that have products directly
      const categoryIdsWithDirectProducts = new Set();
      
      // Add category IDs from products
      productList.forEach(product => {
        if (product.category_id) {
          categoryIdsWithDirectProducts.add(product.category_id);
        }
      });

      console.log("🏷️ Categories with direct products:", Array.from(categoryIdsWithDirectProducts));

      // Create category maps for easy lookup
      const categoryMap = new Map();
      const serverIdMap = new Map();
      
      categoryList.forEach(cat => {
        categoryMap.set(cat.id, cat);
        if (cat.server_id) {
          serverIdMap.set(cat.server_id, cat);
        }
      });

      // Function to find root parent (top-level category)
      const findRootParent = (categoryId) => {
        let currentCategory = categoryMap.get(categoryId);
        if (!currentCategory) {
          console.log(`❌ Category ID ${categoryId} not found in categoryMap`);
          return categoryId;
        }
        
        let visited = new Set();
        visited.add(currentCategory.id);
        
        while (currentCategory && currentCategory.parent_id) {
          // First check if parent_id is a local ID
          let parent = categoryMap.get(currentCategory.parent_id);
          
          // If not found, check if it's a server ID
          if (!parent) {
            parent = serverIdMap.get(currentCategory.parent_id);
          }
          
          if (!parent) {
            console.log(`❌ Parent ${currentCategory.parent_id} not found for ${currentCategory.name}`);
            break;
          }
          
          if (visited.has(parent.id)) {
            console.log(`⚠️ Circular reference detected in ${currentCategory.name} -> ${parent.name}`);
            break;
          }
          
          visited.add(parent.id);
          currentCategory = parent;
        }
        
        console.log(`🔍 Root parent for "${categoryMap.get(categoryId)?.name}": "${currentCategory?.name}"`);
        return currentCategory?.id || categoryId;
      };

      // Collect all root parent categories that have products in their hierarchy
      const rootParentCategories = new Set();
      
      // For each category with direct products, find its root parent
      categoryIdsWithDirectProducts.forEach(categoryId => {
        const rootParentId = findRootParent(categoryId);
        if (rootParentId) {
          rootParentCategories.add(rootParentId);
        }
      });

      console.log("🌳 Root parent categories:", Array.from(rootParentCategories).map(id => categoryMap.get(id)?.name));

      // Get the actual category objects for root parents
      const parentCategoriesToShow = categoryList.filter(category => 
        rootParentCategories.has(category.id)
      );

      console.log("👨‍👩‍👧 Parent categories to show:", parentCategoriesToShow.length);
      console.log("👨‍👩‍👧 Parent category names:", parentCategoriesToShow.map(c => c.name));

      // Store all categories for reference
      setAllCategories(categoryList);
      // Store categoryIdsWithDirectProducts for use in renderCategoryChip
      setCategoryIdsWithDirectProducts(categoryIdsWithDirectProducts);
      // Set parent categories to show (only root parents)
      setCategories(parentCategoriesToShow);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadShops();
    await loadProducts();
    await loadCategories();
    setRefreshing(false);
  };

  const handleBusinessChange = (business) => {
    setSelectedBusiness(business);
    setSelectedShop(null);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSearchQuery("");
    setShowFilters(false);
  };

  const handleShopChange = (shop) => {
    console.log("🏪 Shop selected:", shop?.name || "All Shops");
    setSelectedShop(shop);
  };

  const handleCategorySelect = (category) => {
    console.log("✅ Category selected:", category.name);
    if (selectedCategory?.id === category.id) {
      setSelectedCategory(null);
      setSelectedSubcategory(null);
    } else {
      setSelectedCategory(category);
      setSelectedSubcategory(null);
    }
  };

  const handleSubcategorySelect = (subcategory) => {
    if (selectedSubcategory?.id === subcategory.id) {
      setSelectedSubcategory(null);
    } else {
      setSelectedSubcategory(subcategory);
    }
  };

  const handleProductPress = (product) => {
    // SAFETY: only pass shopId if a shop is selected
    navigation.navigate("ProductDetail", {
      productId: product.id, // Use local ID
      productName: product.name,
      shopId: selectedShop ? selectedShop.id : null,
      shopName: selectedShop ? selectedShop.name : null,
      businessId: selectedBusiness.id,
    });
  };

  const applyFilters = (newFilters) => {
    setFilters(newFilters);
    setShowFilterModal(false);
  };

  const clearAllFilters = () => {
    setSelectedShop(null);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setFilters({
      hasStock: null,
      priceRange: { min: null, max: null },
      hasVariants: null,
      productType: "all",
    });
    setShowFilterModal(false);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedShop) count++;
    if (filters.hasStock !== null) count++;
    if (filters.priceRange.min !== null || filters.priceRange.max !== null) count++;
    if (filters.hasVariants !== null) count++;
    if (filters.productType !== "all") count++;
    if (selectedCategory) count++;
    if (selectedSubcategory) count++;
    return count;
  };

  const renderProductCard = ({ item }) => {
    const hasStock = item.inventory && item.inventory.current_stock > 0;
    const stockCount = item.inventory?.current_stock || 0;

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => handleProductPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.productImageContainer}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.productImage} />
          ) : (
            <View style={[styles.productImage, styles.placeholderImage]}>
              <Ionicons name="cube-outline" size={40} color="#9CA3AF" />
            </View>
          )}
          {!hasStock && (
            <View style={styles.outOfStockBadge}>
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </View>
          )}
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>

          {item.category_name && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{item.category_name}</Text>
            </View>
          )}

          <View style={styles.productMeta}>
            <Text style={styles.productSKU}>SKU: {item.base_sku || "N/A"}</Text>
            {item.has_variants === 1 && (
              <View style={styles.variantBadge}>
                <Ionicons name="options-outline" size={12} color="#FF6B00" />
                <Text style={styles.variantBadgeText}>Variants</Text>
              </View>
            )}
          </View>

          <View style={styles.priceRow}>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Price:</Text>
              <Text style={styles.price}>
                KES {item.base_selling_price?.toLocaleString() || "0"}
              </Text>
            </View>
            {item.base_cost_price && (
              <View style={styles.costContainer}>
                <Text style={styles.costLabel}>Cost:</Text>
                <Text style={styles.cost}>
                  KES {item.base_cost_price?.toLocaleString()}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.stockRow}>
            <Ionicons
              name={hasStock ? "checkmark-circle" : "close-circle"}
              size={16}
              color={hasStock ? "#10B981" : "#EF4444"}
            />
            <Text
              style={[
                styles.stockText,
                { color: hasStock ? "#10B981" : "#EF4444" },
              ]}
            >
              {hasStock ? `${stockCount} in stock` : "Out of stock"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategoryChip = ({ item }) => {
    const isSelected = selectedCategory?.id === item.id;
    
    // Function to count products in this category's entire hierarchy
    const countProductsInTree = (categoryId) => {
      let count = 0;
      
      // Check if this category has direct products
      if (categoryIdsWithDirectProducts.has(categoryId)) {
        count++;
      }
      
      // Helper to get all descendant category IDs
      const getAllDescendantIds = (parentId) => {
        const descendantIds = new Set();
        const stack = [parentId];
        
        while (stack.length > 0) {
          const currentId = stack.pop();
          const currentCategory = allCategories.find(cat => cat.id === currentId);
          
          if (!currentCategory) continue;
          
          // Find children
          const children = allCategories.filter(child => {
            // Direct parent match
            if (child.parent_id === currentId) {
              return true;
            }
            
            // Match by server_id
            if (currentCategory.server_id && child.parent_id === currentCategory.server_id) {
              return true;
            }
            
            return false;
          });
          
          children.forEach(child => {
            if (!descendantIds.has(child.id)) {
              descendantIds.add(child.id);
              stack.push(child.id);
            }
          });
        }
        
        return Array.from(descendantIds);
      };
      
      // Get all descendants and count products
      const descendantIds = getAllDescendantIds(categoryId);
      descendantIds.forEach(descendantId => {
        if (categoryIdsWithDirectProducts.has(descendantId)) {
          count++;
        }
      });
      
      return count;
    };
    
    const productCount = countProductsInTree(item.id);
    
    // ALWAYS show the category if it's a root parent (has no parent itself)
    const isRootCategory = !item.parent_id;
    
    if (productCount === 0 && !isRootCategory) {
      return null;
    }
    
    return (
      <TouchableOpacity
        style={[
          styles.categoryChip,
          isSelected && {
            backgroundColor: item.color || "#FF6B00",
            borderColor: item.color || "#FF6B00",
          },
        ]}
        onPress={() => handleCategorySelect(item)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.categoryChipText,
            isSelected && styles.categoryChipTextSelected,
          ]}
        >
          {item.name}
        </Text>
        {productCount > 0 && (
          <View style={[styles.categoryCountBadge, isSelected && styles.categoryCountBadgeSelected]}>
            <Text style={[styles.categoryCountText, isSelected && styles.categoryCountTextSelected]}>
              {productCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderHeaderRight = () => (
    <View style={styles.headerRight}>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={() => setShowFilterModal(true)}
      >
        <Ionicons name="filter" size={20} color="#fff" />
        {getActiveFilterCount() > 0 && (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{getActiveFilterCount()}</Text>
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={() => setShowFilters(!showFilters)}
      >
        <Ionicons 
          name={showFilters ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#fff" 
        />
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomHeader
          title="Products"
          rightComponent={renderHeaderRight()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Get subcategories for selected category
  const subcategories = selectedCategory && allCategories.length > 0
    ? allCategories.filter((cat) => cat.parent_id === selectedCategory.id)
    : [];

  // Calculate interpolated height for filters
  const filterContainerHeight = filterHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 180], // Adjust this based on content height
  });

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader
        title="Products"
        rightComponent={renderHeaderRight()}
      />

      <View style={styles.contentContainer}>
        {/* Compact Business & Shop Selector */}
        <View style={styles.compactFilterBar}>
          <View style={styles.compactFilterRow}>
            <View style={styles.compactFilterItem}>
              <Ionicons name="business" size={16} color="#FF6B00" />
              <Text style={styles.compactFilterLabel} numberOfLines={1}>
                {selectedBusiness?.name || "Select Business"}
              </Text>
              <TouchableOpacity 
                onPress={() => setShowFilters(true)}
                style={styles.compactFilterEdit}
              >
                <Ionicons name="chevron-down" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.compactFilterItem}>
              <Ionicons name="storefront" size={16} color="#FF6B00" />
              <Text style={styles.compactFilterLabel} numberOfLines={1}>
                {selectedShop ? selectedShop.name : "All Shops"}
              </Text>
              <TouchableOpacity 
                onPress={() => setShowFilters(true)}
                style={styles.compactFilterEdit}
              >
                <Ionicons name="chevron-down" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Active Filters Badge */}
          {getActiveFilterCount() > 0 && (
            <TouchableOpacity 
              style={styles.activeFiltersBadge}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Text style={styles.activeFiltersBadgeText}>
                {getActiveFilterCount()} filter{getActiveFilterCount() !== 1 ? 's' : ''} active
              </Text>
              <Ionicons 
                name={showFilters ? "chevron-up" : "chevron-down"} 
                size={14} 
                color="#FF6B00" 
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Collapsible Filter Panel */}
        <Animated.View style={[styles.filterPanel, { height: filterContainerHeight }]}>
          <ScrollView 
            style={styles.filterPanelContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Business Selection */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Business</Text>
              <View style={styles.filterOptionsRow}>
                {businesses.map((business) => (
                  <TouchableOpacity
                    key={business.id}
                    style={[
                      styles.filterOptionButton,
                      selectedBusiness?.id === business.id && styles.filterOptionButtonSelected,
                    ]}
                    onPress={() => handleBusinessChange(business)}
                  >
                    <Text
                      style={[
                        styles.filterOptionButtonText,
                        selectedBusiness?.id === business.id && styles.filterOptionButtonTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {business.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Shop Selection */}
            {selectedBusiness && shops.length > 0 && (
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Shop</Text>
                <View style={styles.filterOptionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.filterOptionButton,
                      !selectedShop && styles.filterOptionButtonSelected,
                    ]}
                    onPress={() => handleShopChange(null)}
                  >
                    <Text
                      style={[
                        styles.filterOptionButtonText,
                        !selectedShop && styles.filterOptionButtonTextSelected,
                      ]}
                    >
                      All Shops
                    </Text>
                  </TouchableOpacity>
                  
                  {shops.map((shop) => (
                    <TouchableOpacity
                      key={shop.id}
                      style={[
                        styles.filterOptionButton,
                        selectedShop?.id === shop.id && styles.filterOptionButtonSelected,
                      ]}
                      onPress={() => handleShopChange(shop)}
                    >
                      <Text
                        style={[
                          styles.filterOptionButtonText,
                          selectedShop?.id === shop.id && styles.filterOptionButtonTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {shop.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Category Selection */}
            {categories.length > 0 && (
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Category</Text>
                <View style={styles.filterOptionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.filterOptionButton,
                      !selectedCategory && styles.filterOptionButtonSelected,
                    ]}
                    onPress={() => {
                      setSelectedCategory(null);
                      setSelectedSubcategory(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.filterOptionButtonText,
                        !selectedCategory && styles.filterOptionButtonTextSelected,
                      ]}
                    >
                      All Categories
                    </Text>
                  </TouchableOpacity>
                  
                  {categories.slice(0, 5).map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.filterOptionButton,
                        selectedCategory?.id === category.id && styles.filterOptionButtonSelected,
                      ]}
                      onPress={() => handleCategorySelect(category)}
                    >
                      <Text
                        style={[
                          styles.filterOptionButtonText,
                          selectedCategory?.id === category.id && styles.filterOptionButtonTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            
            {/* Clear All Button */}
            {getActiveFilterCount() > 0 && (
              <TouchableOpacity 
                style={styles.clearAllButton}
                onPress={clearAllFilters}
              >
                <Ionicons name="close-circle" size={16} color="#EF4444" />
                <Text style={styles.clearAllButtonText}>Clear All Filters</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </Animated.View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons
              name="search"
              size={20}
              color="#6B7280"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products by name, SKU, or barcode..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Products Summary */}
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>
            {products.length} product{products.length !== 1 ? "s" : ""} found
            {selectedShop ? ` in ${selectedShop.name}` : ""}
          </Text>
        </View>

        {/* Products List */}
        {products.length > 0 ? (
          <FlatList
            data={products}
            renderItem={renderProductCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.productsList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#FF6B00"]}
                tintColor="#FF6B00"
              />
            }
            showsVerticalScrollIndicator={false}
          />
        ) : (
          selectedBusiness ? (
            <EmptyState
              icon="cube-outline"
              title="No Products Found"
              message={
                searchQuery
                  ? "No products match your search criteria"
                  : selectedCategory
                  ? "No products in this category"
                  : selectedShop
                  ? `No products available in ${selectedShop.name}`
                  : "No products available for this business"
              }
              actionText="Clear Filters"
              onAction={clearAllFilters}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Please select a business to view products</Text>
            </View>
          )
        )}

        <OfflineDataStatus />
      </View>

      {/* Filter Modal (for advanced filters) */}
      <FilterModal
        visible={showFilterModal}
        filters={filters}
        onApply={applyFilters}
        onClear={clearAllFilters}
        onClose={() => setShowFilterModal(false)}
      />
    </SafeAreaView>
  );
}

// Filter Modal Component (for advanced filters)
const FilterModal = ({ visible, filters, onApply, onClear, onClose }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.filterModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Advanced Filters</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterContent}>
            {/* Stock Status Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Stock Status</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    localFilters.hasStock === null && styles.filterOptionSelected,
                  ]}
                  onPress={() =>
                    setLocalFilters({ ...localFilters, hasStock: null })
                  }
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      localFilters.hasStock === null &&
                        styles.filterOptionTextSelected,
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    localFilters.hasStock === true && styles.filterOptionSelected,
                  ]}
                  onPress={() =>
                    setLocalFilters({ ...localFilters, hasStock: true })
                  }
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      localFilters.hasStock === true &&
                        styles.filterOptionTextSelected,
                    ]}
                  >
                    In Stock
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    localFilters.hasStock === false && styles.filterOptionSelected,
                  ]}
                  onPress={() =>
                    setLocalFilters({ ...localFilters, hasStock: false })
                  }
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      localFilters.hasStock === false &&
                        styles.filterOptionTextSelected,
                    ]}
                  >
                    Out of Stock
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Product Type Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Product Type</Text>
              <View style={styles.filterOptions}>
                {["all", "physical", "digital", "service"].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterOption,
                      localFilters.productType === type &&
                        styles.filterOptionSelected,
                    ]}
                    onPress={() =>
                      setLocalFilters({ ...localFilters, productType: type })
                    }
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        localFilters.productType === type &&
                          styles.filterOptionTextSelected,
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Variant Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Variants</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    localFilters.hasVariants === null &&
                      styles.filterOptionSelected,
                  ]}
                  onPress={() =>
                    setLocalFilters({ ...localFilters, hasVariants: null })
                  }
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      localFilters.hasVariants === null &&
                        styles.filterOptionTextSelected,
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    localFilters.hasVariants === true &&
                      styles.filterOptionSelected,
                  ]}
                  onPress={() =>
                    setLocalFilters({ ...localFilters, hasVariants: true })
                  }
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      localFilters.hasVariants === true &&
                        styles.filterOptionTextSelected,
                    ]}
                  >
                    Has Variants
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    localFilters.hasVariants === false &&
                      styles.filterOptionSelected,
                  ]}
                  onPress={() =>
                    setLocalFilters({ ...localFilters, hasVariants: false })
                  }
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      localFilters.hasVariants === false &&
                        styles.filterOptionTextSelected,
                    ]}
                  >
                    Simple Products
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Price Range Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Price Range (KES)</Text>
              <View style={styles.priceRangeInputs}>
                <View style={styles.priceInput}>
                  <Text style={styles.priceInputLabel}>Min</Text>
                  <TextInput
                    style={styles.priceInputField}
                    placeholder="0"
                    keyboardType="numeric"
                    value={
                      localFilters.priceRange.min?.toString() || ""
                    }
                    onChangeText={(text) =>
                      setLocalFilters({
                        ...localFilters,
                        priceRange: {
                          ...localFilters.priceRange,
                          min: text ? parseFloat(text) : null,
                        },
                      })
                    }
                  />
                </View>
                <Text style={styles.priceRangeSeparator}>-</Text>
                <View style={styles.priceInput}>
                  <Text style={styles.priceInputLabel}>Max</Text>
                  <TextInput
                    style={styles.priceInputField}
                    placeholder="∞"
                    keyboardType="numeric"
                    value={
                      localFilters.priceRange.max?.toString() || ""
                    }
                    onChangeText={(text) =>
                      setLocalFilters({
                        ...localFilters,
                        priceRange: {
                          ...localFilters.priceRange,
                          max: text ? parseFloat(text) : null,
                        },
                      })
                    }
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.filterActions}>
            <TouchableOpacity
              style={styles.clearFilterButton}
              onPress={() => {
                onClear();
                setLocalFilters({
                  hasStock: null,
                  priceRange: { min: null, max: null },
                  hasVariants: null,
                  productType: "all",
                });
              }}
            >
              <Text style={styles.clearFilterButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyFilterButton}
              onPress={() => onApply(localFilters)}
            >
              <Text style={styles.applyFilterButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#FF6B00",
  },
  filterBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  // Compact Filter Bar - NEW DESIGN
  compactFilterBar: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  compactFilterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  compactFilterItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  compactFilterLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
    marginLeft: 8,
    marginRight: 4,
  },
  compactFilterEdit: {
    padding: 2,
  },
  activeFiltersBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7F0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FFD7B5",
    marginTop: 8,
    alignSelf: "flex-start",
  },
  activeFiltersBadgeText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#FF6B00",
    marginRight: 4,
  },
  // Collapsible Filter Panel
  filterPanel: {
    overflow: "hidden",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filterPanelContent: {
    padding: 16,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  filterOptionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterOptionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 8,
  },
  filterOptionButtonSelected: {
    backgroundColor: "#FF6B00",
    borderColor: "#FF6B00",
  },
  filterOptionButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4B5563",
  },
  filterOptionButtonTextSelected: {
    color: "#fff",
  },
  clearAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginTop: 8,
  },
  clearAllButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#EF4444",
    marginLeft: 6,
  },
  // Search Bar
  searchContainer: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
  },
  clearButton: {
    padding: 4,
  },
  // Summary Bar
  summaryBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 12,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  // Products List
  productsList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  productCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  productImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 12,
    position: "relative",
  },
  productImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  placeholderImage: {
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  outOfStockBadge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(239, 68, 68, 0.9)",
    paddingVertical: 4,
    alignItems: "center",
  },
  outOfStockText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  productInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  categoryBadgeText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  productMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  productSKU: {
    fontSize: 12,
    color: "#9CA3AF",
    marginRight: 8,
  },
  variantBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7F0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  variantBadgeText: {
    fontSize: 10,
    color: "#FF6B00",
    fontWeight: "500",
    marginLeft: 2,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginRight: 12,
  },
  priceLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginRight: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF6B00",
  },
  costContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  costLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    marginRight: 4,
  },
  cost: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stockText: {
    fontSize: 13,
    fontWeight: "500",
    marginLeft: 4,
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  filterModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  // Filter Modal Content
  filterContent: {
    padding: 20,
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 8,
    marginBottom: 8,
  },
  filterOptionSelected: {
    backgroundColor: "#FF6B00",
    borderColor: "#FF6B00",
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4B5563",
  },
  filterOptionTextSelected: {
    color: "#fff",
  },
  priceRangeInputs: {
    flexDirection: "row",
    alignItems: "center",
  },
  priceInput: {
    flex: 1,
  },
  priceInputLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  priceInputField: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: "#1F2937",
  },
  priceRangeSeparator: {
    fontSize: 18,
    color: "#6B7280",
    marginHorizontal: 12,
  },
  filterActions: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  clearFilterButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    marginRight: 12,
  },
  clearFilterButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  applyFilterButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#FF6B00",
    alignItems: "center",
  },
  applyFilterButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
});