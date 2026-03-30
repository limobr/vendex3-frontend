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
  Alert,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useBusiness } from "../../context/BusinessContext";
import CustomHeader from "../../components/CustomHeader";
import EmptyState from "../../components/EmptyState";
import OfflineDataStatus from '../../components/OfflineDataStatus';

export default function BusinessesScreen({ navigation }) {
  const { user } = useAuth();
  const {
    businesses,
    loading,
    syncing,
    pendingSyncCount,
    loadUserBusinesses,
    deleteBusiness,
    selectBusiness,
    manualSync,
  } = useBusiness();

  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState("list"); // 'list' or 'grid'
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [actionModal, setActionModal] = useState(false);
  const [syncModal, setSyncModal] = useState(false);

  useEffect(() => {
    loadBusinesses();

    const unsubscribe = navigation.addListener("focus", () => {
      loadBusinesses();
    });

    return unsubscribe;
  }, [navigation]);

  const loadBusinesses = async () => {
    try {
      await loadUserBusinesses();
    } catch (error) {
      console.error("Error loading businesses:", error);
      Alert.alert("Error", "Failed to load businesses");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBusinesses();
    setRefreshing(false);
  };

  const handleAddBusiness = () => {
    navigation.navigate("CreateBusiness");
  };

  const handleBusinessPress = async (business) => {
    try {
      // Select the business first
      const result = await selectBusiness(business.id);
      if (result.success) {
        navigation.navigate("BusinessDetail", {
          businessId: business.id,
          businessName: business.name,
        });
      } else {
        Alert.alert("Error", result.error || "Failed to select business");
      }
    } catch (error) {
      console.error("Error selecting business:", error);
      Alert.alert("Error", "Failed to select business");
    }
  };

  const handleEditBusiness = (business) => {
    navigation.navigate("EditBusiness", {
      businessId: business.id,
      businessData: business,
    });
    setActionModal(false);
  };

  const handleDeleteBusiness = async (business) => {
    Alert.alert(
      "Delete Business",
      `Are you sure you want to delete "${business.name}"? This will also delete all associated shops and employees.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await deleteBusiness(business.id);
              if (result.success) {
                Alert.alert("Success", `"${business.name}" has been deleted.`);
                await loadBusinesses();
              } else {
                Alert.alert(
                  "Error",
                  result.error || "Failed to delete business"
                );
              }
            } catch (error) {
              console.error("Error deleting business:", error);
              Alert.alert("Error", "Failed to delete business");
            }
            setActionModal(false);
          },
        },
      ]
    );
  };

  const handleQuickActions = (business) => {
    setSelectedBusiness(business);
    setActionModal(true);
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
      }
    } catch (error) {
      console.error("Sync error:", error);
    }
    setSyncModal(false);
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

  const renderBusinessItem = ({ item }) => {
    const icon = getBusinessIcon(item.business_type);
    const color = getBusinessColor(item.business_type);

    return (
      <TouchableOpacity
        style={[styles.businessCard, { borderLeftColor: color }]}
        onPress={() => handleBusinessPress(item)}
        onLongPress={() => handleQuickActions(item)}
        activeOpacity={0.7}
      >
        <View style={styles.businessHeader}>
          <View
            style={[styles.businessIcon, { backgroundColor: `${color}20` }]}
          >
            <Ionicons name={icon} size={24} color={color} />
            {item.sync_status === "pending" && (
              <View style={styles.syncIndicator}>
                <Ionicons name="sync-outline" size={12} color="#FF6B00" />
              </View>
            )}
          </View>
          <View style={styles.businessInfo}>
            <View style={styles.businessTitleRow}>
              <Text style={styles.businessName}>{item.name}</Text>
              {!item.is_active && (
                <View style={styles.inactiveBadge}>
                  <Text style={styles.inactiveText}>Inactive</Text>
                </View>
              )}
            </View>
            {item.description ? (
              <Text style={styles.businessDescription} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
            {item.industry ? (
              <Text style={styles.businessIndustry}>{item.industry}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => handleQuickActions(item)}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.businessStats}>
          <View style={styles.statItem}>
            <Ionicons name="storefront-outline" size={16} color="#6B7280" />
            <Text style={styles.statText}>{item.shop_count || 0} Shops</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="people-outline" size={16} color="#6B7280" />
            <Text style={styles.statText}>
              {item.employee_count || 0} Employees
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.statText}>
              {item.created_at
                ? new Date(item.created_at).toLocaleDateString()
                : "N/A"}
            </Text>
          </View>
        </View>

        {item.sync_status === "pending" && (
          <View style={styles.syncStatusBar}>
            <Ionicons name="cloud-upload-outline" size={14} color="#FF6B00" />
            <Text style={styles.syncStatusText}>Pending sync</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={() => handleBusinessPress(item)}
        >
          <Text style={styles.viewDetailsText}>View Details</Text>
          <Ionicons name="chevron-forward" size={16} color="#FF6B00" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderGridItem = ({ item }) => {
    const icon = getBusinessIcon(item.business_type);
    const color = getBusinessColor(item.business_type);

    return (
      <TouchableOpacity
        style={[styles.gridCard, { borderTopColor: color }]}
        onPress={() => handleBusinessPress(item)}
        onLongPress={() => handleQuickActions(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.gridIcon, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={32} color={color} />
          {item.sync_status === "pending" && (
            <View style={styles.gridSyncIndicator}>
              <Ionicons name="sync-outline" size={10} color="#FF6B00" />
            </View>
          )}
        </View>
        <Text style={styles.gridName} numberOfLines={1}>
          {item.name}
        </Text>
        {item.description ? (
          <Text style={styles.gridDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <View style={styles.gridStats}>
          <View style={styles.gridStat}>
            <Ionicons name="storefront" size={14} color="#6B7280" />
            <Text style={styles.gridStatText}>{item.shop_count || 0}</Text>
          </View>
          <View style={styles.gridStat}>
            <Ionicons name="people" size={14} color="#6B7280" />
            <Text style={styles.gridStatText}>{item.employee_count || 0}</Text>
          </View>
        </View>

        {!item.is_active && (
          <View style={styles.gridInactiveOverlay}>
            <Text style={styles.gridInactiveText}>Inactive</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderHeaderRight = () => (
    <View style={styles.headerRight}>
      {pendingSyncCount > 0 && (
        <TouchableOpacity
          style={styles.syncButton}
          onPress={handleSyncBusiness}
          disabled={syncing}
        >
          <View style={styles.syncBadge}>
            <Text style={styles.syncBadgeText}>{pendingSyncCount}</Text>
          </View>
          <Ionicons
            name={syncing ? "sync" : "cloud-upload-outline"}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={styles.headerButton}
        onPress={() => setViewMode(viewMode === "list" ? "grid" : "list")}
      >
        <Ionicons
          name={viewMode === "list" ? "grid-outline" : "list-outline"}
          size={24}
          color="#fff"
        />
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomHeader title="Businesses" rightComponent={renderHeaderRight()} />
        <OfflineDataStatus />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>Loading businesses...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader title="Businesses" rightComponent={renderHeaderRight()} />

      <View style={styles.contentContainer}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View>
            <Text style={styles.welcomeText}>
              Welcome back, {user?.first_name || "Owner"}!
            </Text>
            <Text style={styles.pageTitle}>Your Businesses</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{businesses.length}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {businesses.reduce(
                  (acc, biz) => acc + (biz.shop_count || 0),
                  0
                )}
              </Text>
              <Text style={styles.summaryLabel}>Shops</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {businesses.reduce(
                  (acc, biz) => acc + (biz.employee_count || 0),
                  0
                )}
              </Text>
              <Text style={styles.summaryLabel}>Employees</Text>
            </View>
          </View>

          {/* Sync Status */}
          {pendingSyncCount > 0 && (
            <TouchableOpacity
              style={styles.pendingSyncCard}
              onPress={handleSyncBusiness}
              disabled={syncing}
            >
              <Ionicons
                name={syncing ? "sync" : "cloud-upload-outline"}
                size={20}
                color="#FF6B00"
              />
              <Text style={styles.pendingSyncText}>
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
        </View>

        {/* Businesses List */}
        {businesses.length > 0 ? (
          <FlatList
            data={businesses}
            renderItem={
              viewMode === "list" ? renderBusinessItem : renderGridItem
            }
            keyExtractor={(item) => item.id}
            key={viewMode}
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
            numColumns={viewMode === "grid" ? 2 : 1}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.emptyContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#FF6B00"]}
                tintColor="#FF6B00"
              />
            }
          >
            <EmptyState
              icon="business-outline"
              title="No Businesses Yet"
              description="Create your first business to start managing shops and employees"
              actionText="Add Your First Business"
              onAction={handleAddBusiness}
            />
          </ScrollView>
        )}
      </View>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddBusiness}
        activeOpacity={0.9}
      >
        <View style={styles.fabInner}>
          <Ionicons name="add" size={30} color="#fff" />
        </View>
        <View style={styles.fabTextContainer}>
          <Text style={styles.fabText}>Add Business</Text>
        </View>
      </TouchableOpacity>

      {/* Action Modal */}
      <Modal
        visible={actionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActionModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActionModal(false)}
        >
          <View style={styles.actionModal}>
            <Text style={styles.modalTitle}>{selectedBusiness?.name}</Text>

            <TouchableOpacity
              style={styles.modalAction}
              onPress={() => handleEditBusiness(selectedBusiness)}
            >
              <Ionicons name="create-outline" size={24} color="#3B82F6" />
              <Text style={styles.modalActionText}>Edit Business</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalAction}
              onPress={() => {
                setActionModal(false);
                navigation.navigate("ShopsManagement", {
                  businessId: selectedBusiness?.id,
                });
              }}
            >
              <Ionicons name="storefront-outline" size={24} color="#FF6B00" />
              <Text style={styles.modalActionText}>Manage Shops</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalAction}
              onPress={() => {
                setActionModal(false);
                navigation.navigate("EmployeesManagement", {
                  businessId: selectedBusiness?.id,
                });
              }}
            >
              <Ionicons name="people-outline" size={24} color="#4CAF50" />
              <Text style={styles.modalActionText}>Manage Employees</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalAction, styles.deleteAction]}
              onPress={() => handleDeleteBusiness(selectedBusiness)}
            >
              <Ionicons name="trash-outline" size={24} color="#EF4444" />
              <Text style={[styles.modalActionText, styles.deleteText]}>
                {selectedBusiness?.is_active
                  ? "Deactivate Business"
                  : "Delete Business"}
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
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  syncButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginRight: 8,
    position: "relative",
  },
  syncBadge: {
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
    zIndex: 1,
  },
  syncBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  headerSection: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
  },
  summaryCard: {
    flexDirection: "row",
    backgroundColor: "#FFF7F0",
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FF6B00",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  summaryDivider: {
    width: 1,
    backgroundColor: "#FFD7B5",
    marginHorizontal: 10,
  },
  pendingSyncCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7F0",
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#FFD7B5",
  },
  pendingSyncText: {
    flex: 1,
    fontSize: 14,
    color: "#FF6B00",
    marginLeft: 8,
    fontWeight: "500",
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  gridContent: {
    padding: 16,
    paddingBottom: 100,
  },
  businessCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  businessHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  businessIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    position: "relative",
  },
  syncIndicator: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#fff",
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FF6B00",
  },
  businessInfo: {
    flex: 1,
  },
  businessTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  businessName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginRight: 8,
  },
  inactiveBadge: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inactiveText: {
    fontSize: 10,
    color: "#EF4444",
    fontWeight: "500",
  },
  businessDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
    lineHeight: 20,
  },
  businessIndustry: {
    fontSize: 12,
    color: "#9ca3af",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  moreButton: {
    padding: 4,
  },
  businessStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statText: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 6,
  },
  syncStatusBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7F0",
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  syncStatusText: {
    fontSize: 12,
    color: "#FF6B00",
    marginLeft: 6,
    fontWeight: "500",
  },
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7F0",
    paddingVertical: 12,
    borderRadius: 12,
  },
  viewDetailsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF6B00",
    marginRight: 4,
  },
  gridCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    margin: 8,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    borderTopWidth: 4,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: "relative",
  },
  gridIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    position: "relative",
  },
  gridSyncIndicator: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#fff",
    borderRadius: 6,
    width: 12,
    height: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FF6B00",
  },
  gridName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  gridDescription: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 20,
  },
  gridStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 12,
  },
  gridStat: {
    flexDirection: "row",
    alignItems: "center",
  },
  gridStatText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginLeft: 4,
  },
  gridInactiveOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  gridInactiveText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FF6B00",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  fabTextContainer: {
    backgroundColor: "#1F2937",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  fabText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  actionModal: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: "80%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 20,
  },
  modalAction: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  modalActionText: {
    fontSize: 16,
    color: "#1F2937",
    marginLeft: 12,
    flex: 1,
  },
  deleteAction: {
    borderBottomWidth: 0,
    marginTop: 8,
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