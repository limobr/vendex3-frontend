// src/screens/owner/EmployeesManagementScreen.js
import React, { useState, useEffect, useMemo } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useBusiness } from "../../context/BusinessContext";
import CustomHeader from "../../components/CustomHeader";
import EmptyState from "../../components/EmptyState";
import OfflineDataStatus from "../../components/OfflineDataStatus";
import { EmployeeService, ShopService, RoleService } from "../../database";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function EmployeesManagementScreen({ navigation }) {
  const { user } = useAuth();
  const { businesses, currentBusiness, selectBusiness } = useBusiness();

  // State
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [shops, setShops] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [selectedShop, setSelectedShop] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null); // 'active', 'inactive'
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name"); // 'name', 'role', 'shop', 'status', 'date'
  const [sortOrder, setSortOrder] = useState("asc"); // 'asc' or 'desc'
  const [viewMode, setViewMode] = useState("list"); // 'list' or 'grid'
  const [showFilters, setShowFilters] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [filterHeight] = useState(new Animated.Value(0));
  const [actionModal, setActionModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    initializeScreen();
  }, []);

  useEffect(() => {
    if (selectedBusiness) {
      loadEmployees();
      loadShops();
      loadRoles();
    }
  }, [
    selectedBusiness,
    selectedShop,
    selectedRole,
    selectedStatus,
    searchQuery,
    sortBy,
    sortOrder,
  ]);

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
    if (!selectedBusiness) return;
    try {
      const shopList = await ShopService.getShopsByBusiness(
        selectedBusiness.id,
      );
      setShops(shopList);
    } catch (error) {
      console.error("Error loading shops:", error);
    }
  };

  const loadRoles = async () => {
    try {
      const roleList = await RoleService.getRoles();
      setRoles(roleList);
    } catch (error) {
      console.error("Error loading roles:", error);
    }
  };

  const loadEmployees = async () => {
    if (!selectedBusiness || !user) return;

    try {
      setLoading(true);
      let employeeList = [];

      // If a shop is selected, use getEmployeesByShop
      if (selectedShop) {
        employeeList = await EmployeeService.getEmployeesByShop(
          selectedShop.id,
        );
      } else {
        employeeList = await EmployeeService.getEmployeesByBusiness(
          selectedBusiness.id,
        );
      }

      // Apply filters (additional if needed)
      if (selectedRole) {
        employeeList = employeeList.filter(
          (emp) => emp.role_id === selectedRole.id,
        );
      }

      if (selectedStatus) {
        const isActive = selectedStatus === "active";
        employeeList = employeeList.filter(
          (emp) => emp.is_active === (isActive ? 1 : 0),
        );
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        employeeList = employeeList.filter(
          (emp) =>
            emp.first_name?.toLowerCase().includes(query) ||
            emp.last_name?.toLowerCase().includes(query) ||
            `${emp.first_name} ${emp.last_name}`
              .toLowerCase()
              .includes(query) ||
            emp.email?.toLowerCase().includes(query) ||
            emp.phone_number?.toLowerCase().includes(query),
        );
      }

      // Apply sorting
      employeeList.sort((a, b) => {
        let aVal, bVal;
        switch (sortBy) {
          case "name":
            aVal = `${a.first_name} ${a.last_name}`.toLowerCase();
            bVal = `${b.first_name} ${b.last_name}`.toLowerCase();
            break;
          case "role":
            aVal = (a.role_name || "").toLowerCase();
            bVal = (b.role_name || "").toLowerCase();
            break;
          case "shop":
            aVal = (a.shop_name || "").toLowerCase();
            bVal = (b.shop_name || "").toLowerCase();
            break;
          case "status":
            aVal = a.is_active;
            bVal = b.is_active;
            break;
          case "date":
            aVal = new Date(a.created_at || a.employment_date || 0);
            bVal = new Date(b.created_at || b.employment_date || 0);
            break;
          default:
            aVal = a.first_name?.toLowerCase() || "";
            bVal = b.first_name?.toLowerCase() || "";
        }

        if (sortOrder === "asc") {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });

      setEmployees(employeeList);
    } catch (error) {
      console.error("Error loading employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEmployees();
    setRefreshing(false);
  };

  const handleBusinessChange = (business) => {
    setSelectedBusiness(business);
    setSelectedShop(null);
    setSelectedRole(null);
    setSelectedStatus(null);
    setSearchQuery("");
  };

  const handleShopChange = (shop) => {
    setSelectedShop(shop);
  };

  const handleRoleChange = (role) => {
    setSelectedRole(role);
  };

  const handleStatusChange = (status) => {
    setSelectedStatus(status);
  };

  const clearFilters = () => {
    setSelectedShop(null);
    setSelectedRole(null);
    setSelectedStatus(null);
    setSearchQuery("");
    setShowFilterModal(false);
    setShowFilters(false);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedShop) count++;
    if (selectedRole) count++;
    if (selectedStatus) count++;
    if (searchQuery) count++;
    return count;
  };

  const handleEmployeePress = (employee) => {
    navigation.navigate("EmployeeDetail", {
      employeeId: employee.id,
      shopId: employee.shop_id,
    });
  };

  const handleQuickActions = (employee) => {
    setSelectedEmployee(employee);
    setActionModal(true);
  };

  const handleEditEmployee = () => {
    if (selectedEmployee) {
      navigation.navigate("EmployeeForm", { employeeId: selectedEmployee.id });
      setActionModal(false);
    }
  };

  const handleDeactivateEmployee = async () => {
    if (selectedEmployee) {
      const newStatus = selectedEmployee.is_active ? 0 : 1;
      const result = await EmployeeService.updateEmployee(selectedEmployee.id, {
        is_active: newStatus,
      });
      if (result.success) {
        await loadEmployees();
        setActionModal(false);
      } else {
        alert("Failed to update employee status");
      }
    }
  };

  const handleDeleteEmployee = async () => {
    if (selectedEmployee) {
      Alert.alert(
        "Remove Employee",
        `Are you sure you want to remove ${selectedEmployee.first_name} ${selectedEmployee.last_name}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              const result = await EmployeeService.deleteEmployee(
                selectedEmployee.id,
              );
              if (result.success) {
                await loadEmployees();
                setActionModal(false);
              } else {
                alert("Failed to remove employee");
              }
            },
          },
        ],
      );
    }
  };

  const renderEmployeeCard = ({ item }) => {
    const fullName = `${item.first_name} ${item.last_name}`;
    const username = item.username || item.email?.split("@")[0] || "user";
    const roleName = item.role_name || item.role_type || "Employee";
    const shopName = item.shop_name || "No shop assigned";
    const isActive = item.is_active === 1;

    return (
      <TouchableOpacity
        style={[styles.employeeCard, !isActive && styles.inactiveCard]}
        onPress={() => handleEmployeePress(item)}
        onLongPress={() => handleQuickActions(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: "#FF6B00" }]}>
            <Text style={styles.avatarText}>
              {item.first_name?.[0]}
              {item.last_name?.[0]}
            </Text>
          </View>
          <View style={styles.employeeInfo}>
            <Text style={styles.employeeName}>{fullName}</Text>
            <Text style={styles.employeeUsername}>@{username}</Text>
            <View style={styles.employeeMeta}>
              <Text style={styles.employeeRole}>{roleName}</Text>
              <Text style={styles.employeeShop}>{shopName}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => handleQuickActions(item)}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <View style={styles.cardFooter}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: isActive ? "#DCFCE7" : "#FEE2E2" },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isActive ? "#16A34A" : "#DC2626" },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: isActive ? "#166534" : "#991B1B" },
              ]}
            >
              {isActive ? "Active" : "Inactive"}
            </Text>
          </View>
          <Text style={styles.employeeEmail}>{item.email}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderGridItem = ({ item }) => {
    const fullName = `${item.first_name} ${item.last_name}`;
    const roleName = item.role_name || item.role_type || "Employee";
    const isActive = item.is_active === 1;

    return (
      <TouchableOpacity
        style={[styles.gridCard, !isActive && styles.inactiveGridCard]}
        onPress={() => handleEmployeePress(item)}
        onLongPress={() => handleQuickActions(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.gridAvatar, { backgroundColor: "#FF6B00" }]}>
          <Text style={styles.gridAvatarText}>
            {item.first_name?.[0]}
            {item.last_name?.[0]}
          </Text>
        </View>
        <Text style={styles.gridName} numberOfLines={1}>
          {fullName}
        </Text>
        <Text style={styles.gridRole}>{roleName}</Text>
        <View style={styles.gridStatus}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isActive ? "#16A34A" : "#DC2626" },
            ]}
          />
          <Text
            style={[
              styles.gridStatusText,
              { color: isActive ? "#166534" : "#991B1B" },
            ]}
          >
            {isActive ? "Active" : "Inactive"}
          </Text>
        </View>
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
        onPress={() => setShowSortModal(true)}
      >
        <Ionicons name="swap-vertical" size={20} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={() => setViewMode(viewMode === "list" ? "grid" : "list")}
      >
        <Ionicons
          name={viewMode === "list" ? "grid-outline" : "list-outline"}
          size={20}
          color="#fff"
        />
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

  const filterContainerHeight = filterHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 220], // adjust based on content
  });

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader
        title="Employees"
        showBack={false}
        rightComponent={renderHeaderRight()}
      />

      <View style={styles.contentContainer}>
        {/* Compact Filter Bar */}
        <View style={styles.compactFilterBar}>
          <View style={styles.compactFilterRow}>
            <View style={styles.compactFilterItem}>
              <Ionicons name="business" size={16} color="#FF6B00" />
              <Text style={styles.compactFilterLabel} numberOfLines={1}>
                {selectedBusiness?.name || "Select Business"}
              </Text>
              <TouchableOpacity
                onPress={() => setShowFilterModal(true)}
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
                onPress={() => setShowFilterModal(true)}
                style={styles.compactFilterEdit}
              >
                <Ionicons name="chevron-down" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {getActiveFilterCount() > 0 && (
            <TouchableOpacity
              style={styles.activeFiltersBadge}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Text style={styles.activeFiltersBadgeText}>
                {getActiveFilterCount()} filter
                {getActiveFilterCount() !== 1 ? "s" : ""} active
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
        <Animated.View
          style={[styles.filterPanel, { height: filterContainerHeight }]}
        >
          <ScrollView
            style={styles.filterPanelContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Role</Text>
              <View style={styles.filterOptionsRow}>
                <TouchableOpacity
                  style={[
                    styles.filterOptionButton,
                    !selectedRole && styles.filterOptionButtonSelected,
                  ]}
                  onPress={() => setSelectedRole(null)}
                >
                  <Text
                    style={[
                      styles.filterOptionButtonText,
                      !selectedRole && styles.filterOptionButtonTextSelected,
                    ]}
                  >
                    All Roles
                  </Text>
                </TouchableOpacity>
                {roles.slice(0, 5).map((role) => (
                  <TouchableOpacity
                    key={role.id}
                    style={[
                      styles.filterOptionButton,
                      selectedRole?.id === role.id &&
                        styles.filterOptionButtonSelected,
                    ]}
                    onPress={() => setSelectedRole(role)}
                  >
                    <Text
                      style={[
                        styles.filterOptionButtonText,
                        selectedRole?.id === role.id &&
                          styles.filterOptionButtonTextSelected,
                      ]}
                    >
                      {role.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Status</Text>
              <View style={styles.filterOptionsRow}>
                <TouchableOpacity
                  style={[
                    styles.filterOptionButton,
                    !selectedStatus && styles.filterOptionButtonSelected,
                  ]}
                  onPress={() => setSelectedStatus(null)}
                >
                  <Text
                    style={[
                      styles.filterOptionButtonText,
                      !selectedStatus && styles.filterOptionButtonTextSelected,
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOptionButton,
                    selectedStatus === "active" &&
                      styles.filterOptionButtonSelected,
                  ]}
                  onPress={() => setSelectedStatus("active")}
                >
                  <Text
                    style={[
                      styles.filterOptionButtonText,
                      selectedStatus === "active" &&
                        styles.filterOptionButtonTextSelected,
                    ]}
                  >
                    Active
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOptionButton,
                    selectedStatus === "inactive" &&
                      styles.filterOptionButtonSelected,
                  ]}
                  onPress={() => setSelectedStatus("inactive")}
                >
                  <Text
                    style={[
                      styles.filterOptionButtonText,
                      selectedStatus === "inactive" &&
                        styles.filterOptionButtonTextSelected,
                    ]}
                  >
                    Inactive
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {getActiveFilterCount() > 0 && (
              <TouchableOpacity
                style={styles.clearAllButton}
                onPress={clearFilters}
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
              placeholder="Search by name, email, or phone..."
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

        {/* Summary Bar */}
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>
            {employees.length} employee{employees.length !== 1 ? "s" : ""} found
          </Text>
          <Text style={styles.sortIndicator}>
            Sorted by{" "}
            {sortBy === "name"
              ? "Name"
              : sortBy === "role"
                ? "Role"
                : sortBy === "shop"
                  ? "Shop"
                  : sortBy === "status"
                    ? "Status"
                    : "Date"}{" "}
            ({sortOrder === "asc" ? "A-Z" : "Z-A"})
          </Text>
        </View>

        {/* Employees List */}
        {employees.length > 0 ? (
          <FlatList
            data={employees}
            renderItem={
              viewMode === "list" ? renderEmployeeCard : renderGridItem
            }
            keyExtractor={(item) => item.id}
            contentContainerStyle={
              viewMode === "list" ? styles.listContent : styles.gridContent
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#FF6B00"]}
                tintColor="#FF6B00"
              />
            }
            showsVerticalScrollIndicator={false}
            key={viewMode}
            numColumns={viewMode === "grid" ? 2 : 1}
          />
        ) : (
          <EmptyState
            icon="people-outline"
            title="No Employees Found"
            message={
              !selectedBusiness
                ? "Please select a business to view employees"
                : searchQuery
                  ? "No employees match your search criteria"
                  : selectedRole
                    ? `No employees with role "${selectedRole.name}"`
                    : selectedShop
                      ? `No employees in ${selectedShop.name}`
                      : "No employees added to this business yet"
            }
            actionText={
              !selectedBusiness
                ? "Select Business"
                : getActiveFilterCount() > 0
                  ? "Clear Filters"
                  : "Add Employee"
            }
            onAction={
              !selectedBusiness
                ? () => navigation.navigate("BusinessesList")
                : getActiveFilterCount() > 0
                  ? clearFilters
                  : () => {
                      const params = { businessId: selectedBusiness.id };
                      if (selectedShop) {
                        params.shopId = selectedShop.id;
                        params.shopName = selectedShop.name;
                      }
                      navigation.navigate("EmployeeForm", params);
                    }
            }
          />
        )}
        <OfflineDataStatus />
      </View>

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        shops={shops}
        roles={roles}
        selectedBusiness={selectedBusiness}
        selectedShop={selectedShop}
        selectedRole={selectedRole}
        selectedStatus={selectedStatus}
        onApply={({ shop, role, status }) => {
          setSelectedShop(shop);
          setSelectedRole(role);
          setSelectedStatus(status);
          setShowFilterModal(false);
        }}
        onClear={clearFilters}
        onClose={() => setShowFilterModal(false)}
      />

      {/* Sort Modal */}
      <SortModal
        visible={showSortModal}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onApply={({ by, order }) => {
          setSortBy(by);
          setSortOrder(order);
          setShowSortModal(false);
        }}
        onClose={() => setShowSortModal(false)}
      />

      {/* Action Modal */}
      <Modal
        visible={actionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setActionModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActionModal(false)}
        >
          <View style={styles.actionModal}>
            <Text style={styles.modalTitle}>
              {selectedEmployee
                ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}`
                : "Employee"}
            </Text>

            <TouchableOpacity
              style={styles.modalAction}
              onPress={handleEditEmployee}
            >
              <Ionicons name="create-outline" size={24} color="#3B82F6" />
              <Text style={styles.modalActionText}>Edit Employee</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalAction}
              onPress={handleDeactivateEmployee}
            >
              <Ionicons
                name={
                  selectedEmployee?.is_active
                    ? "pause-circle-outline"
                    : "play-circle-outline"
                }
                size={24}
                color={selectedEmployee?.is_active ? "#FF9800" : "#4CAF50"}
              />
              <Text style={styles.modalActionText}>
                {selectedEmployee?.is_active ? "Deactivate" : "Activate"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalAction, styles.deleteAction]}
              onPress={handleDeleteEmployee}
            >
              <Ionicons name="trash-outline" size={24} color="#EF4444" />
              <Text style={[styles.modalActionText, styles.deleteText]}>
                Remove from Shop
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setActionModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// Filter Modal Component
const FilterModal = ({
  visible,
  shops,
  roles,
  selectedBusiness,
  selectedShop,
  selectedRole,
  selectedStatus,
  onApply,
  onClear,
  onClose,
}) => {
  const [localShop, setLocalShop] = useState(selectedShop);
  const [localRole, setLocalRole] = useState(selectedRole);
  const [localStatus, setLocalStatus] = useState(selectedStatus);

  useEffect(() => {
    setLocalShop(selectedShop);
    setLocalRole(selectedRole);
    setLocalStatus(selectedStatus);
  }, [selectedShop, selectedRole, selectedStatus]);

  const handleApply = () => {
    onApply({ shop: localShop, role: localRole, status: localStatus });
  };

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
            <Text style={styles.modalTitle}>Filter Employees</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterContent}>
            {/* Shop Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Shop</Text>
              <View style={styles.filterOptionsRow}>
                <TouchableOpacity
                  style={[
                    styles.filterOptionButton,
                    !localShop && styles.filterOptionButtonSelected,
                  ]}
                  onPress={() => setLocalShop(null)}
                >
                  <Text
                    style={[
                      styles.filterOptionButtonText,
                      !localShop && styles.filterOptionButtonTextSelected,
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
                      localShop?.id === shop.id &&
                        styles.filterOptionButtonSelected,
                    ]}
                    onPress={() => setLocalShop(shop)}
                  >
                    <Text
                      style={[
                        styles.filterOptionButtonText,
                        localShop?.id === shop.id &&
                          styles.filterOptionButtonTextSelected,
                      ]}
                    >
                      {shop.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Role Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Role</Text>
              <View style={styles.filterOptionsRow}>
                <TouchableOpacity
                  style={[
                    styles.filterOptionButton,
                    !localRole && styles.filterOptionButtonSelected,
                  ]}
                  onPress={() => setLocalRole(null)}
                >
                  <Text
                    style={[
                      styles.filterOptionButtonText,
                      !localRole && styles.filterOptionButtonTextSelected,
                    ]}
                  >
                    All Roles
                  </Text>
                </TouchableOpacity>
                {roles.map((role) => (
                  <TouchableOpacity
                    key={role.id}
                    style={[
                      styles.filterOptionButton,
                      localRole?.id === role.id &&
                        styles.filterOptionButtonSelected,
                    ]}
                    onPress={() => setLocalRole(role)}
                  >
                    <Text
                      style={[
                        styles.filterOptionButtonText,
                        localRole?.id === role.id &&
                          styles.filterOptionButtonTextSelected,
                      ]}
                    >
                      {role.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Status Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Status</Text>
              <View style={styles.filterOptionsRow}>
                <TouchableOpacity
                  style={[
                    styles.filterOptionButton,
                    !localStatus && styles.filterOptionButtonSelected,
                  ]}
                  onPress={() => setLocalStatus(null)}
                >
                  <Text
                    style={[
                      styles.filterOptionButtonText,
                      !localStatus && styles.filterOptionButtonTextSelected,
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOptionButton,
                    localStatus === "active" &&
                      styles.filterOptionButtonSelected,
                  ]}
                  onPress={() => setLocalStatus("active")}
                >
                  <Text
                    style={[
                      styles.filterOptionButtonText,
                      localStatus === "active" &&
                        styles.filterOptionButtonTextSelected,
                    ]}
                  >
                    Active
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOptionButton,
                    localStatus === "inactive" &&
                      styles.filterOptionButtonSelected,
                  ]}
                  onPress={() => setLocalStatus("inactive")}
                >
                  <Text
                    style={[
                      styles.filterOptionButtonText,
                      localStatus === "inactive" &&
                        styles.filterOptionButtonTextSelected,
                    ]}
                  >
                    Inactive
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={styles.filterActions}>
            <TouchableOpacity
              style={styles.clearFilterButton}
              onPress={onClear}
            >
              <Text style={styles.clearFilterButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyFilterButton}
              onPress={handleApply}
            >
              <Text style={styles.applyFilterButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// Sort Modal Component
const SortModal = ({ visible, sortBy, sortOrder, onApply, onClose }) => {
  const [localSortBy, setLocalSortBy] = useState(sortBy);
  const [localSortOrder, setLocalSortOrder] = useState(sortOrder);

  const sortOptions = [
    { value: "name", label: "Name" },
    { value: "role", label: "Role" },
    { value: "shop", label: "Shop" },
    { value: "status", label: "Status" },
    { value: "date", label: "Date Joined" },
  ];

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
        <View style={styles.sortModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sort Employees</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterContent}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Sort By</Text>
              <View style={styles.sortOptions}>
                {sortOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.sortOption,
                      localSortBy === option.value && styles.sortOptionSelected,
                    ]}
                    onPress={() => setLocalSortBy(option.value)}
                  >
                    <Text
                      style={[
                        styles.sortOptionText,
                        localSortBy === option.value &&
                          styles.sortOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {localSortBy === option.value && (
                      <Ionicons name="checkmark" size={20} color="#FF6B00" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Order</Text>
              <View style={styles.sortOrderOptions}>
                <TouchableOpacity
                  style={[
                    styles.sortOrderOption,
                    localSortOrder === "asc" && styles.sortOrderOptionSelected,
                  ]}
                  onPress={() => setLocalSortOrder("asc")}
                >
                  <Text
                    style={[
                      styles.sortOrderText,
                      localSortOrder === "asc" && styles.sortOrderTextSelected,
                    ]}
                  >
                    Ascending (A-Z)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.sortOrderOption,
                    localSortOrder === "desc" && styles.sortOrderOptionSelected,
                  ]}
                  onPress={() => setLocalSortOrder("desc")}
                >
                  <Text
                    style={[
                      styles.sortOrderText,
                      localSortOrder === "desc" && styles.sortOrderTextSelected,
                    ]}
                  >
                    Descending (Z-A)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={styles.filterActions}>
            <TouchableOpacity
              style={styles.clearFilterButton}
              onPress={() => onApply({ by: "name", order: "asc" })}
            >
              <Text style={styles.clearFilterButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyFilterButton}
              onPress={() =>
                onApply({ by: localSortBy, order: localSortOrder })
              }
            >
              <Text style={styles.applyFilterButtonText}>Apply Sort</Text>
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
  sortIndicator: {
    fontSize: 12,
    color: "#6B7280",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  gridContent: {
    paddingHorizontal: 12,
    paddingBottom: 100,
  },
  employeeCard: {
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
  inactiveCard: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
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
  employeeUsername: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  employeeMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  employeeRole: {
    fontSize: 12,
    fontWeight: "500",
    color: "#FF6B00",
    backgroundColor: "#FFF7F0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  employeeShop: {
    fontSize: 12,
    color: "#6B7280",
  },
  moreButton: {
    padding: 4,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
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
    fontWeight: "500",
  },
  employeeEmail: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  gridCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    margin: 6,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  inactiveGridCard: {
    opacity: 0.6,
  },
  gridAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  gridAvatarText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  gridName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 4,
  },
  gridRole: {
    fontSize: 12,
    color: "#FF6B00",
    marginBottom: 6,
  },
  gridStatus: {
    flexDirection: "row",
    alignItems: "center",
  },
  gridStatusText: {
    fontSize: 11,
    fontWeight: "500",
    marginLeft: 4,
  },
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
  sortModal: {
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
  filterContent: {
    padding: 20,
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
  sortOptions: {
    gap: 8,
  },
  sortOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  sortOptionSelected: {
    backgroundColor: "#FFF7F0",
  },
  sortOptionText: {
    fontSize: 16,
    color: "#4B5563",
  },
  sortOptionTextSelected: {
    color: "#FF6B00",
    fontWeight: "500",
  },
  sortOrderOptions: {
    flexDirection: "row",
    gap: 12,
  },
  sortOrderOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  sortOrderOptionSelected: {
    backgroundColor: "#FF6B00",
    borderColor: "#FF6B00",
  },
  sortOrderText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4B5563",
  },
  sortOrderTextSelected: {
    color: "#fff",
  },
  actionModal: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    margin: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  modalAction: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalActionText: {
    fontSize: 16,
    color: "#1F2937",
    marginLeft: 12,
    flex: 1,
  },
  deleteAction: {
    borderBottomWidth: 0,
  },
  deleteText: {
    color: "#EF4444",
  },
  modalCancel: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "600",
  },
});
