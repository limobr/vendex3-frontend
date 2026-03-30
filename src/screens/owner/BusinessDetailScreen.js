// src/screens/owner/BusinessDetailScreen.js
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
  Alert,
  ScrollView,
  Modal,
  Dimensions,
} from "react-native";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useBusiness } from "../../context/BusinessContext";
import { useShop } from "../../context/ShopContext";
import CustomHeaderWithButton from "../../components/CustomHeaderWithButton";
import EmptyState from "../../components/EmptyState";

const { width } = Dimensions.get("window");

// Shop types exactly matching Django model
const SHOP_TYPES = [
  { id: "retail", label: "Retail Store", icon: "storefront", color: "#FF6B00" },
  { id: "wholesale", label: "Wholesale", icon: "cube", color: "#2196F3" },
  { id: "supermarket", label: "Supermarket", icon: "cart", color: "#4CAF50" },
  {
    id: "restaurant",
    label: "Restaurant/Cafe",
    icon: "restaurant",
    color: "#9C27B0",
  },
  { id: "kiosk", label: "Kiosk", icon: "grid", color: "#FF9800" },
  { id: "pharmacy", label: "Pharmacy", icon: "medical", color: "#607D8B" },
  { id: "other", label: "Other", icon: "business", color: "#795548" },
];

export default function BusinessDetailScreen({ route, navigation }) {
  const { businessId } = route.params || {};
  const { user } = useAuth();
  const {
    currentBusiness,
    businesses,
    shops,
    employees,
    loading,
    syncing,
    pendingSyncCount,
    getBusinessStats,
    loadBusinessShops,
    selectBusiness,
    updateBusiness,
    deleteBusiness,
    createShop,
    manualSync,
    loadBusinessEmployees,
    database,
  } = useBusiness();

  const { loadShops } = useShop();

  const [business, setBusiness] = useState(null);
  const [businessShops, setBusinessShops] = useState([]);
  const [businessEmployees, setBusinessEmployees] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [syncModal, setSyncModal] = useState(false);
  const [businessStats, setBusinessStats] = useState(null);

  useEffect(() => {
    loadBusinessData();

    const unsubscribe = navigation.addListener("focus", () => {
      loadBusinessData();
    });

    return unsubscribe;
  }, [navigation, businessId]);

  const loadBusinessData = async () => {
    try {
      // If businessId is provided, select that business
      if (businessId) {
        const result = await selectBusiness(businessId);
        if (!result.success) {
          Alert.alert("Error", "Business not found");
          navigation.goBack();
          return;
        }
      }

      // If we have currentBusiness, load its details
      if (currentBusiness) {
        await loadBusinessDetails(currentBusiness.id);
      } else {
        // Try to load business by ID from database
        if (businessId) {
          await loadBusinessDetails(businessId);
        }
      }
    } catch (error) {
      console.error("Error loading business data:", error);
      Alert.alert("Error", "Failed to load business details");
    }
  };

  const loadBusinessDetails = async (businessId) => {
    try {
      console.log("🔍 Loading business details for ID:", businessId);

      // Load business details
      const businessData = await database.BusinessService.getBusinessById(
        businessId
      );
      if (!businessData) {
        Alert.alert("Error", "Business not found");
        navigation.goBack();
        return;
      }

      setBusiness(businessData);

      // Use the enhanced getShopsByBusiness method
      const shopsData = await database.ShopService.getShopsByBusiness(
        businessId
      );

      // DEBUG: Log what we found
      console.log(`🔍 Loading shops for business ${businessId}:`, {
        businessLocalId: businessData.id,
        businessServerId: businessData.server_id,
        businessName: businessData.name,
        shopsFound: shopsData.length,
        shopBusinessIds: shopsData.map((s) => ({
          local: s.business_id,
          server: s.business_server_id,
        })),
      });

      // Additional debug: Check shop-business relationships
      if (shopsData.length === 0) {
        console.log("⚠️ No shops found. Running diagnostic...");
        await database.ShopService.debugShopBusinessRelations();
      }

      setBusinessShops(shopsData);

      // Load employees for this business
      const employeesData =
        await database.EmployeeService.getEmployeesByBusiness(businessId);
      setBusinessEmployees(employeesData);

      // Calculate business stats
      const stats = {
        shopCount: shopsData.length,
        activeShops: shopsData.filter((s) => s.is_active).length,
        employeeCount: employeesData.length,
        activeEmployees: employeesData.filter((e) => e.is_active).length,
        totalMonthlySales: shopsData.reduce((total, shop) => {
          return total + (shop.monthly_sales || 0);
        }, 0),
      };
      setBusinessStats(stats);

      console.log(
        `✅ Loaded ${shopsData.length} shops for business ${businessData.name}`
      );
    } catch (error) {
      console.error("Error loading business details:", error);
      throw error;
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBusinessData();
    setRefreshing(false);
  };

  const handleAddShop = () => {
    if (!business) return;

    navigation.navigate("CreateShop", {
      businessId: business.id,
      businessName: business.name,
    });
  };

  const handleEditBusiness = () => {
    if (!business) return;

    navigation.navigate("EditBusiness", {
      businessId: business.id,
    });
  };

  const handleShopPress = (shop) => {
    navigation.navigate("ShopDetail", {
      shopId: shop.id,
      shopName: shop.name,
      businessId: business.id,
    });
  };

  const handleAddEmployee = () => {
    if (!business) return;

    navigation.navigate("EmployeeForm", {
      businessId: business.id,
      businessName: business.name,
    });
  };

  const handleEmployeePress = (employee) => {
    navigation.navigate("EmployeeDetail", {
      employeeId: employee.id,
      employeeName:
        employee.name || `${employee.first_name} ${employee.last_name}`,
      businessId: business.id,
    });
  };

  const handleQuickActions = (action) => {
    switch (action) {
      case "add_shop":
        handleAddShop();
        break;
      case "add_employee":
        handleAddEmployee();
        break;
      case "view_reports":
        navigation.navigate("Reports", { businessId: business.id });
        break;
      case "sync_data":
        handleSyncBusiness();
        break;
      case "business_settings":
        // Navigate to business settings if available
        Alert.alert("Coming Soon", "Business settings will be available soon");
        break;
    }
  };

  const handleDeleteShop = async (shopId, shopName) => {
    Alert.alert(
      "Delete Shop",
      `Are you sure you want to delete "${shopName}"? This will also delete all associated data.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Use ShopContext to delete shop
              const { deleteShop } = useShop();
              const result = await deleteShop(shopId);
              if (result.success) {
                Alert.alert("Success", `"${shopName}" has been deleted.`);
                await loadBusinessData();
              } else {
                Alert.alert("Error", result.error || "Failed to delete shop");
              }
            } catch (error) {
              Alert.alert("Error", "Failed to delete shop");
            }
          },
        },
      ]
    );
  };

  const handleSyncBusiness = async () => {
    setSyncModal(true);
    try {
      const result = await manualSync();
      if (result.success) {
        Alert.alert(
          "Sync Complete",
          `Successfully synced ${result.synced} items.`
        );
        await loadBusinessData();
      }
    } catch (error) {
      console.error("Sync error:", error);
    }
    setSyncModal(false);
  };

  const handleActionSheet = () => {
    if (!business) return;

    Alert.alert("Business Actions", undefined, [
      { text: "Edit Business", onPress: handleEditBusiness },
      {
        text: "View Reports",
        onPress: () => handleQuickActions("view_reports"),
      },
      {
        text: "Business Settings",
        onPress: () => handleQuickActions("business_settings"),
      },
      { text: "Sync Now", onPress: () => handleQuickActions("sync_data") },
      {
        text: business.is_active ? "Deactivate Business" : "Delete Business",
        style: "destructive",
        onPress: () => handleDeleteBusiness(),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleDeleteBusiness = () => {
    if (!business) return;

    Alert.alert(
      business.is_active ? "Deactivate Business" : "Delete Business",
      business.is_active
        ? `Are you sure you want to deactivate "${business.name}"? You can reactivate it later.`
        : `Are you sure you want to permanently delete "${business.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: business.is_active ? "Deactivate" : "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await deleteBusiness(business.id);
              if (result.success) {
                Alert.alert(
                  "Success",
                  business.is_active
                    ? `"${business.name}" has been deactivated.`
                    : `"${business.name}" has been deleted.`
                );
                navigation.goBack();
              } else {
                Alert.alert(
                  "Error",
                  result.error || "Failed to update business"
                );
              }
            } catch (error) {
              Alert.alert("Error", "Failed to update business");
            }
          },
        },
      ]
    );
  };

  const getBusinessIcon = (businessType) => {
    const icons = {
      retail: "storefront",
      wholesale: "cube",
      food: "restaurant",
      service: "build",
      manufacturing: "factory",
      other: "business",
    };
    return icons[businessType] || "business";
  };

  const getBusinessColor = (businessType) => {
    const colors = {
      retail: "#FF6B00",
      wholesale: "#2196F3",
      food: "#4CAF50",
      service: "#9C27B0",
      manufacturing: "#FF9800",
      other: "#607D8B",
    };
    return colors[businessType] || "#FF6B00";
  };

  const renderShopItem = ({ item }) => {
    const shopType =
      SHOP_TYPES.find((type) => type.id === item.shop_type) || SHOP_TYPES[0];
    const color = shopType.color;

    return (
      <TouchableOpacity
        style={[styles.shopCard, { borderLeftColor: color }]}
        onPress={() => handleShopPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.shopHeader}>
          <View style={[styles.shopIcon, { backgroundColor: `${color}20` }]}>
            <Ionicons name={shopType.icon} size={24} color={color} />
          </View>
          <View style={styles.shopInfo}>
            <Text style={styles.shopName}>{item.name}</Text>
            <Text style={styles.shopType}>{shopType.label}</Text>
            <Text style={styles.shopLocation}>
              {item.location || "No location set"}
            </Text>
          </View>
        </View>

        <View style={styles.shopStats}>
          <View style={styles.shopStat}>
            <Ionicons name="people-outline" size={16} color="#6B7280" />
            <Text style={styles.shopStatText}>
              {item.employee_count || 0} Employees
            </Text>
          </View>
          <View style={styles.shopStat}>
            <Ionicons name="percent-outline" size={16} color="#6B7280" />
            <Text style={styles.shopStatText}>{item.tax_rate || 0}% Tax</Text>
          </View>
        </View>

        {item.sync_status === "pending" && (
          <View style={styles.shopSyncStatus}>
            <Ionicons name="cloud-upload-outline" size={14} color="#FF6B00" />
            <Text style={styles.shopSyncText}>Pending sync</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmployeeItem = ({ item }) => (
    <TouchableOpacity
      style={styles.employeeCard}
      onPress={() => handleEmployeePress(item)}
    >
      <View style={styles.employeeAvatar}>
        <Text style={styles.avatarText}>
          {item.first_name?.[0] || item.username?.[0] || "U"}
          {item.last_name?.[0] || ""}
        </Text>
      </View>
      <View style={styles.employeeInfo}>
        <Text style={styles.employeeName}>
          {item.first_name && item.last_name
            ? `${item.first_name} ${item.last_name}`
            : item.username || `Employee ${item.id.substring(0, 8)}`}
        </Text>
        <Text style={styles.employeeRole}>
          {item.role_name || item.role_type || "Employee"}
        </Text>
        <Text style={styles.employeeShop}>
          {item.shop_name || "No shop assigned"}
        </Text>
      </View>
      <View
        style={[
          styles.employeeStatus,
          { backgroundColor: item.is_active ? "#10B981" : "#EF4444" },
        ]}
      >
        <Text style={styles.employeeStatusText}>
          {item.is_active ? "Active" : "Inactive"}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderOverview = () => {
    if (!business) return null;

    const icon = getBusinessIcon(business.business_type);
    const color = getBusinessColor(business.business_type);
    const stats = businessStats || {
      shopCount: 0,
      activeShops: 0,
      totalMonthlySales: 0,
      employeeCount: 0,
      activeEmployees: 0,
    };

    return (
      <>
        {/* Business Info Card */}
        <View style={styles.businessHeroCard}>
          <View style={styles.businessHeader}>
            <View
              style={[
                styles.businessIconLarge,
                { backgroundColor: `${color}20` },
              ]}
            >
              <Ionicons name={icon} size={40} color={color} />
              {business.sync_status === "pending" && (
                <View style={styles.businessSyncIndicator}>
                  <Ionicons name="sync-outline" size={12} color="#FF6B00" />
                </View>
              )}
            </View>
            <View style={styles.businessTitleContainer}>
              <Text style={styles.businessNameLarge}>{business.name}</Text>
              <Text
                style={
                  business.registration_number
                    ? styles.businessReg
                    : styles.businessNoReg
                }
              >
                {business.registration_number || "No registration number"}
              </Text>
              <View style={styles.businessStatus}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: business.is_active
                        ? "#10B981"
                        : "#EF4444",
                    },
                  ]}
                />
                <Text style={styles.statusText}>
                  {business.is_active ? "Active Business" : "Inactive"}
                </Text>
                {business.sync_status === "pending" && (
                  <View style={styles.businessSyncBadge}>
                    <Ionicons
                      name="cloud-upload-outline"
                      size={12}
                      color="#FF6B00"
                    />
                    <Text style={styles.businessSyncText}>Pending</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {business.description ? (
            <Text style={styles.businessDescription}>
              {business.description}
            </Text>
          ) : null}

          <View style={styles.businessStatsGrid}>
            <View style={styles.statItem}>
              <Ionicons name="storefront" size={24} color="#FF6B00" />
              <Text style={styles.statValue}>{stats.shopCount}</Text>
              <Text style={styles.statLabel}>Shops</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="people" size={24} color="#2196F3" />
              <Text style={styles.statValue}>{stats.employeeCount}</Text>
              <Text style={styles.statLabel}>Employees</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="cash" size={24} color="#4CAF50" />
              <Text style={styles.statValue}>
                KES {stats.totalMonthlySales.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Monthly Sales</Text>
            </View>
          </View>
        </View>

        {/* Quick Action Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: "#FFF7F0" }]}
              onPress={() => handleQuickActions("add_shop")}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#FF6B00" }]}>
                <Ionicons name="add-circle" size={28} color="#fff" />
              </View>
              <Text style={styles.actionTitle}>Add Shop</Text>
              <Text style={styles.actionSubtitle}>New location</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: "#EFF6FF" }]}
              onPress={() => handleQuickActions("add_employee")}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#2196F3" }]}>
                <Ionicons name="person-add" size={28} color="#fff" />
              </View>
              <Text style={styles.actionTitle}>Add Employee</Text>
              <Text style={styles.actionSubtitle}>Hire staff</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: "#F0FDF4" }]}
              onPress={() => handleQuickActions("view_reports")}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#10B981" }]}>
                <Ionicons name="stats-chart" size={28} color="#fff" />
              </View>
              <Text style={styles.actionTitle}>View Reports</Text>
              <Text style={styles.actionSubtitle}>Analytics</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: "#FAF5FF" }]}
              onPress={() => handleQuickActions("sync_data")}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#8B5CF6" }]}>
                <Ionicons name="cloud-upload" size={28} color="#fff" />
              </View>
              <Text style={styles.actionTitle}>Sync Data</Text>
              <Text style={styles.actionSubtitle}>Backup & sync</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Shops */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Shops</Text>
            {businessShops.length > 2 && (
              <TouchableOpacity onPress={() => setActiveTab("shops")}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            )}
          </View>

          {businessShops.slice(0, 2).map((shop) => (
            <TouchableOpacity
              key={shop.id}
              style={styles.miniShopCard}
              onPress={() => handleShopPress(shop)}
            >
              <View style={styles.miniShopInfo}>
                <View
                  style={[
                    styles.miniShopIcon,
                    { backgroundColor: "#2196F320" },
                  ]}
                >
                  <Ionicons
                    name={getBusinessIcon(shop.shop_type)}
                    size={20}
                    color="#2196F3"
                  />
                </View>
                <View>
                  <Text style={styles.miniShopName}>{shop.name}</Text>
                  <Text style={styles.miniShopLocation}>
                    {shop.location || "No location"}
                  </Text>
                </View>
              </View>
              <View style={styles.miniShopStats}>
                <Text style={styles.miniShopSales}>
                  KES {(shop.monthly_sales || 0).toLocaleString()}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
              </View>
            </TouchableOpacity>
          ))}

          {businessShops.length === 0 && (
            <View style={styles.noShopsMessage}>
              <Ionicons name="storefront-outline" size={24} color="#d1d5db" />
              <Text style={styles.noShopsText}>No shops yet</Text>
            </View>
          )}
        </View>

        {/* Business Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Details</Text>
          <View style={styles.detailsCard}>
            {business.phone_number ? (
              <View style={styles.detailRow}>
                <Ionicons name="call-outline" size={20} color="#6B7280" />
                <Text style={styles.detailLabel}>Phone</Text>
                <Text style={styles.detailValue}>{business.phone_number}</Text>
              </View>
            ) : null}

            {business.email ? (
              <View style={styles.detailRow}>
                <Ionicons name="mail-outline" size={20} color="#6B7280" />
                <Text style={styles.detailLabel}>Email</Text>
                <Text style={styles.detailValue}>{business.email}</Text>
              </View>
            ) : null}

            {business.address ? (
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={20} color="#6B7280" />
                <Text style={styles.detailLabel}>Address</Text>
                <Text style={styles.detailValue}>{business.address}</Text>
              </View>
            ) : null}

            {business.website ? (
              <View style={styles.detailRow}>
                <Ionicons name="globe-outline" size={20} color="#6B7280" />
                <Text style={styles.detailLabel}>Website</Text>
                <Text style={styles.detailValue}>{business.website}</Text>
              </View>
            ) : null}

            {business.industry ? (
              <View style={styles.detailRow}>
                <Ionicons name="briefcase-outline" size={20} color="#6B7280" />
                <Text style={styles.detailLabel}>Industry</Text>
                <Text style={styles.detailValue}>{business.industry}</Text>
              </View>
            ) : null}

            {business.business_type ? (
              <View style={styles.detailRow}>
                <Ionicons name="pricetag-outline" size={20} color="#6B7280" />
                <Text style={styles.detailLabel}>Business Type</Text>
                <Text style={styles.detailValue}>{business.business_type}</Text>
              </View>
            ) : null}

            {business.tax_id ? (
              <View style={styles.detailRow}>
                <Ionicons name="card-outline" size={20} color="#6B7280" />
                <Text style={styles.detailLabel}>Tax ID</Text>
                <Text style={styles.detailValue}>{business.tax_id}</Text>
              </View>
            ) : null}

            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              <Text style={styles.detailLabel}>Created</Text>
              <Text style={styles.detailValue}>
                {business.created_at
                  ? new Date(business.created_at).toLocaleDateString()
                  : "N/A"}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={20} color="#6B7280" />
              <Text style={styles.detailLabel}>Last Updated</Text>
              <Text style={styles.detailValue}>
                {business.updated_at
                  ? new Date(business.updated_at).toLocaleDateString()
                  : "N/A"}
              </Text>
            </View>
          </View>
        </View>
      </>
    );
  };

  const renderShopsList = () => (
    <>
      <View style={styles.section}>
        <View style={styles.tabHeader}>
          <Text style={styles.tabTitle}>Shops ({businessShops.length})</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddShop}>
            <Ionicons name="add" size={20} color="#FF6B00" />
            <Text style={styles.addButtonText}>Add Shop</Text>
          </TouchableOpacity>
        </View>

        {businessShops.length > 0 ? (
          <FlatList
            data={businessShops}
            renderItem={renderShopItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <EmptyState
            icon="storefront-outline"
            title="No Shops Yet"
            description="Add your first shop to start managing sales and employees"
            actionText="Add First Shop"
            onAction={handleAddShop}
          />
        )}
      </View>
    </>
  );

  const renderEmployeesList = () => (
    <>
      <View style={styles.section}>
        <View style={styles.tabHeader}>
          <Text style={styles.tabTitle}>
            Employees ({businessEmployees.length})
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddEmployee}
          >
            <Ionicons name="add" size={20} color="#FF6B00" />
            <Text style={styles.addButtonText}>Add Employee</Text>
          </TouchableOpacity>
        </View>

        {businessEmployees.length > 0 ? (
          <FlatList
            data={businessEmployees}
            renderItem={renderEmployeeItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <EmptyState
            icon="people-outline"
            title="No Employees Yet"
            description="Add your first employee to start managing your shops"
            actionText="Add First Employee"
            onAction={handleAddEmployee}
          />
        )}
      </View>
    </>
  );

  if ((loading || !business) && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomHeaderWithButton
          title="Loading..."
          leftButtonIcon="arrow-back"
          leftButtonAction={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>Loading business details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeaderWithButton
        title={business?.name || "Business Details"}
        leftButtonIcon="arrow-back"
        leftButtonAction={() => navigation.goBack()}
        rightButtonIcon="ellipsis-vertical"
        rightButtonAction={handleActionSheet}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#FF6B00"]}
            tintColor="#FF6B00"
          />
        }
      >
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "overview" && styles.activeTab]}
            onPress={() => setActiveTab("overview")}
          >
            <Ionicons
              name="grid-outline"
              size={20}
              color={activeTab === "overview" ? "#FF6B00" : "#9ca3af"}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === "overview" && styles.activeTabLabel,
              ]}
            >
              Overview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "shops" && styles.activeTab]}
            onPress={() => setActiveTab("shops")}
          >
            <Ionicons
              name="storefront-outline"
              size={20}
              color={activeTab === "shops" ? "#FF6B00" : "#9ca3af"}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === "shops" && styles.activeTabLabel,
              ]}
            >
              Shops ({businessShops.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "employees" && styles.activeTab]}
            onPress={() => setActiveTab("employees")}
          >
            <Ionicons
              name="people-outline"
              size={20}
              color={activeTab === "employees" ? "#FF6B00" : "#9ca3af"}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === "employees" && styles.activeTabLabel,
              ]}
            >
              Employees ({businessEmployees.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sync Status Bar */}
        {pendingSyncCount > 0 && (
          <TouchableOpacity
            style={styles.syncStatusBar}
            onPress={handleSyncBusiness}
            disabled={syncing}
          >
            <Ionicons
              name={syncing ? "sync" : "cloud-upload-outline"}
              size={18}
              color="#FF6B00"
            />
            <Text style={styles.syncStatusText}>
              {syncing
                ? "Syncing..."
                : `${pendingSyncCount} item${
                    pendingSyncCount > 1 ? "s" : ""
                  } pending sync`}
            </Text>
            {!syncing && (
              <Ionicons name="chevron-forward" size={16} color="#FF6B00" />
            )}
          </TouchableOpacity>
        )}

        {/* Content based on active tab */}
        {activeTab === "overview" && renderOverview()}
        {activeTab === "shops" && renderShopsList()}
        {activeTab === "employees" && renderEmployeesList()}
      </ScrollView>

      {/* Floating Action Button based on active tab */}
      {activeTab === "shops" && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddShop}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {activeTab === "employees" && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddEmployee}
          activeOpacity={0.9}
        >
          <Ionicons name="person-add" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Sync Modal */}
      <Modal
        visible={syncModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => !syncing && setSyncModal(false)}
      >
        <View style={styles.syncModalOverlay}>
          <View style={styles.syncModal}>
            <ActivityIndicator size="large" color="#FF6B00" />
            <Text style={styles.syncModalText}>Syncing data...</Text>
            {syncing && (
              <Text style={styles.syncModalSubtext}>
                Please wait while we sync your business data
              </Text>
            )}
          </View>
        </View>
      </Modal>
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
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
  },
  scrollContent: {
    paddingBottom: 100,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 4,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: "#FFF7F0",
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9ca3af",
    marginLeft: 6,
  },
  activeTabLabel: {
    color: "#FF6B00",
  },
  syncStatusBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7F0",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFD7B5",
  },
  syncStatusText: {
    flex: 1,
    fontSize: 14,
    color: "#FF6B00",
    marginLeft: 8,
    fontWeight: "500",
  },
  businessHeroCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  businessHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  businessIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    position: "relative",
  },
  businessSyncIndicator: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#fff",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FF6B00",
  },
  businessTitleContainer: {
    flex: 1,
  },
  businessNameLarge: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  businessReg: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  businessNoReg: {
    fontSize: 14,
    color: "#9ca3af",
    fontStyle: "italic",
    marginBottom: 8,
  },
  businessStatus: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: "#6B7280",
    marginRight: 8,
  },
  businessSyncBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7F0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  businessSyncText: {
    fontSize: 10,
    color: "#FF6B00",
    marginLeft: 4,
    fontWeight: "500",
  },
  businessDescription: {
    fontSize: 16,
    color: "#6B7280",
    lineHeight: 24,
    marginBottom: 20,
  },
  businessStatsGrid: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    padding: 20,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#e5e7eb",
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  seeAllText: {
    fontSize: 14,
    color: "#FF6B00",
    fontWeight: "600",
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  actionCard: {
    width: (width - 64) / 2, // Calculate width for 2 columns with padding
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    margin: 6,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
    textAlign: "center",
  },
  actionSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  miniShopCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  miniShopInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  miniShopIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  miniShopName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
    marginBottom: 2,
  },
  miniShopLocation: {
    fontSize: 14,
    color: "#6B7280",
  },
  miniShopStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  miniShopSales: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
    marginRight: 8,
  },
  noShopsMessage: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    borderStyle: "dashed",
  },
  noShopsText: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 8,
  },
  detailsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  detailLabel: {
    width: 100,
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 12,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "500",
    textAlign: "right",
  },
  tabHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  tabTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7F0",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF6B00",
    marginLeft: 4,
  },
  shopCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  shopHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  shopIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  shopCode: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2,
  },
  shopLocation: {
    fontSize: 14,
    color: "#6B7280",
  },
  shopMenu: {
    padding: 4,
  },
  shopStats: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  shopStat: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  shopStatText: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 6,
  },
  shopSyncStatus: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7F0",
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  shopSyncText: {
    fontSize: 12,
    color: "#FF6B00",
    marginLeft: 6,
    fontWeight: "500",
  },
  shopFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  shopManager: {
    fontSize: 14,
    color: "#6B7280",
  },
  viewShopButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewShopText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF6B00",
    marginRight: 4,
  },
  employeeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  employeeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FF6B00",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  employeeRole: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2,
  },
  employeeShop: {
    fontSize: 12,
    color: "#9ca3af",
  },
  employeeStatus: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  employeeStatusText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FF6B00",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF6B00",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  syncModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  syncModal: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  syncModalText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 16,
  },
  syncModalSubtext: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
  },
});
