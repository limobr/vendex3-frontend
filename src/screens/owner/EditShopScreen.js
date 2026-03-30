// src/screens/owner/EditShopScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useShop } from "../../context/ShopContext";
import CustomHeaderWithButton from "../../components/CustomHeaderWithButton";
import InputField from "../../components/InputField";

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

export default function EditShopScreen({ route, navigation }) {
  const { shopId } = route.params;
  const { updateShop, deleteShop, getShopById, isOnline, checkNetwork } =
    useShop();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [shop, setShop] = useState(null);

  // Form state exactly matching Django model
  const [form, setForm] = useState({
    name: "",
    shop_type: "",
    location: "",
    phone_number: "",
    email: "",
    tax_rate: "",
    currency: "",
  });

  useEffect(() => {
    loadShopData();
  }, [shopId]);

  const loadShopData = async () => {
    try {
      setLoading(true);

      // Load shop from shop context
      const shopData = await getShopById(shopId);

      if (!shopData) {
        Alert.alert("Error", "Shop not found");
        navigation.goBack();
        return;
      }

      setShop(shopData);

      // Set selected type
      const shopType = SHOP_TYPES.find((t) => t.id === shopData.shop_type);
      if (shopType) {
        setSelectedType(shopType);
      }

      setForm({
        name: shopData.name || "",
        shop_type: shopData.shop_type || "",
        location: shopData.location || "",
        phone_number: shopData.phone_number || "",
        email: shopData.email || "",
        tax_rate: shopData.tax_rate?.toString() || "0.0",
        currency: shopData.currency || "KES",
      });
    } catch (error) {
      console.error("Error loading shop:", error);
      Alert.alert("Error", "Failed to load shop details");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const handleSelectType = (type) => {
    setSelectedType(type);
    handleChange("shop_type", type.id);
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      Alert.alert("Error", "Shop name is required");
      return false;
    }
    if (!form.location.trim()) {
      Alert.alert("Error", "Shop location is required");
      return false;
    }

    // Validate tax rate
    const taxRate = parseFloat(form.tax_rate);
    if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
      Alert.alert("Error", "Tax rate must be a number between 0 and 100");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    // Check network before submitting
    const online = await checkNetwork();
    if (!online) {
      Alert.alert(
        "Offline Mode",
        "You need to be online to update shop details.",
        [
          { text: "Check Connection", onPress: () => checkNetwork() },
          { text: "OK", style: "cancel" },
        ]
      );
      return;
    }

    setSaving(true);
    try {
      const updates = {
        name: form.name.trim(),
        shop_type: selectedType?.id || "",
        location: form.location.trim(),
        phone_number: form.phone_number || "",
        email: form.email || "",
        tax_rate: parseFloat(form.tax_rate) || 0.0,
        currency: form.currency || "KES",
      };

      // Check if there are any changes
      const hasChanges = Object.keys(updates).some((key) => {
        const shopValue = shop[key];
        const updateValue = updates[key];

        // Handle tax rate comparison
        if (key === "tax_rate") {
          return parseFloat(shopValue || 0) !== parseFloat(updateValue || 0);
        }

        return updateValue !== (shopValue || "");
      });

      if (!hasChanges) {
        Alert.alert("No Changes", "No changes were made to the shop details.");
        setSaving(false);
        return;
      }

      console.log("📝 Sending shop update (online-first)...");

      // Use the ShopContext's updateShop method
      const result = await updateShop(shopId, updates);

      if (result.success) {
        // Check if changes were synced immediately
        if (result.synced) {
          Alert.alert("Success! ✅", "Shop updated and synced with server!", [
            {
              text: "OK",
              onPress: () => navigation.navigate("ShopDetail", { shopId }),
            },
          ]);
        } else {
          Alert.alert(
            "Success! ✅",
            "Shop updated locally. Changes will sync when online.",
            [
              {
                text: "OK",
                onPress: () => navigation.navigate("ShopDetail", { shopId }),
              },
            ]
          );
        }
      } else {
        // Check if it's a network error
        if (result.requiresOnline) {
          Alert.alert(
            "Network Error",
            result.error ||
              "Please check your internet connection and try again.",
            [
              { text: "Retry", onPress: handleSubmit },
              { text: "Cancel", style: "cancel" },
            ]
          );
        } else {
          Alert.alert("Error", result.error || "Failed to update shop");
        }
      }
    } catch (error) {
      console.error("Update shop error:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.", [
        { text: "Retry", onPress: handleSubmit },
        { text: "Cancel", style: "cancel" },
      ]);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteShop = () => {
    Alert.alert(
      "Delete Shop",
      `Are you sure you want to delete "${shop?.name}"? This will also remove all associated employees.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);

              // Use the ShopContext's deleteShop method
              const result = await deleteShop(shopId);

              if (result.success) {
                Alert.alert("Success", "Shop deleted successfully", [
                  {
                    text: "OK",
                    onPress: () => navigation.goBack(),
                  },
                ]);
              } else {
                Alert.alert("Error", result.error || "Failed to delete shop");
              }
            } catch (error) {
              Alert.alert("Error", "Failed to delete shop");
              console.error("Delete shop error:", error);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <CustomHeaderWithButton
          title="Loading..."
          leftButtonIcon="arrow-back"
          leftButtonAction={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>Loading shop details...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeaderWithButton
        title="Edit Shop"
        leftButtonIcon="arrow-back"
        leftButtonAction={() => navigation.goBack()}
        rightButtonIcon={saving ? "hourglass-outline" : undefined}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Network Status Indicator */}
          <View style={styles.networkStatus}>
            <View
              style={[
                styles.networkDot,
                isOnline ? styles.onlineDot : styles.offlineDot,
              ]}
            />
            <Text style={styles.networkText}>
              {isOnline
                ? "✅ Online - Ready to update"
                : "❌ Offline - Connect to update"}
            </Text>
          </View>

          <View style={styles.form}>
            {/* Shop Information */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Shop Information</Text>

              <InputField
                label="Shop Name *"
                value={form.name}
                onChangeText={(text) => handleChange("name", text)}
                placeholder="e.g., Downtown Store"
                icon="storefront-outline"
                required
                editable={isOnline}
              />

              <View style={styles.typeSection}>
                <Text style={styles.sectionSubtitle}>Shop Type</Text>
                <View style={styles.typeGrid}>
                  {SHOP_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.typeCard,
                        selectedType?.id === type.id && styles.selectedTypeCard,
                        { borderColor: type.color },
                      ]}
                      onPress={() => handleSelectType(type)}
                      activeOpacity={0.7}
                      disabled={!isOnline}
                    >
                      <View
                        style={[
                          styles.typeIcon,
                          { backgroundColor: `${type.color}20` },
                        ]}
                      >
                        <Ionicons
                          name={type.icon}
                          size={20}
                          color={type.color}
                        />
                      </View>
                      <Text style={styles.typeLabel}>{type.label}</Text>
                      {selectedType?.id === type.id && (
                        <View
                          style={[
                            styles.selectedIndicator,
                            { backgroundColor: type.color },
                          ]}
                        >
                          <Ionicons name="checkmark" size={14} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <InputField
                label="Location *"
                value={form.location}
                onChangeText={(text) => handleChange("location", text)}
                placeholder="e.g., 123 Main Street, Nairobi"
                icon="location-outline"
                required
                editable={isOnline}
              />
            </View>

            {/* Contact Information */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Contact Information</Text>

              <InputField
                label="Phone Number"
                value={form.phone_number}
                onChangeText={(text) => handleChange("phone_number", text)}
                placeholder="+254 712 345 678"
                keyboardType="phone-pad"
                icon="call-outline"
                editable={isOnline}
              />

              <InputField
                label="Email Address"
                value={form.email}
                onChangeText={(text) => handleChange("email", text)}
                placeholder="shop@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                icon="mail-outline"
                editable={isOnline}
              />
            </View>

            {/* Financial Settings */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Financial Settings</Text>

              <InputField
                label="Tax Rate (%)"
                value={form.tax_rate}
                onChangeText={(text) => handleChange("tax_rate", text)}
                placeholder="16.0"
                keyboardType="numeric"
                icon="percent-outline"
                suffix="%"
                editable={isOnline}
              />

              <InputField
                label="Currency"
                value={form.currency}
                onChangeText={(text) => handleChange("currency", text)}
                placeholder="KES"
                icon="cash-outline"
                editable={isOnline}
              />
            </View>

            {/* Form Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => navigation.goBack()}
                disabled={saving || deleting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (!isOnline || saving || deleting) &&
                    styles.saveButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!isOnline || saving || deleting}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={20}
                      color="#fff"
                      style={styles.buttonIcon}
                    />
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Online Update Notice */}
            {!isOnline && (
              <View style={styles.offlineNotice}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={20}
                  color="#EF4444"
                />
                <Text style={styles.offlineNoticeText}>
                  You are offline. Shop updates require internet connection.
                </Text>
              </View>
            )}

            {/* Danger Zone */}
            <View style={styles.dangerZone}>
              <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
              <Text style={styles.dangerZoneText}>
                Deleting this shop will permanently remove it and all associated
                employees. This action cannot be undone.
              </Text>

              <TouchableOpacity
                style={[
                  styles.deleteButton,
                  deleting && styles.deleteButtonDisabled,
                ]}
                onPress={handleDeleteShop}
                disabled={deleting}
                activeOpacity={0.8}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#dc3545" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={20} color="#dc3545" />
                    <Text style={styles.deleteButtonText}>Delete Shop</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Last Updated Info */}
            {shop && shop.updated_at && (
              <View style={styles.lastUpdated}>
                <Ionicons name="time-outline" size={14} color="#6c757d" />
                <Text style={styles.lastUpdatedText}>
                  Last updated: {new Date(shop.updated_at).toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6c757d",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  networkStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: 10,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  onlineDot: {
    backgroundColor: "#10B981",
  },
  offlineDot: {
    backgroundColor: "#EF4444",
  },
  networkText: {
    fontSize: 14,
    color: "#6B7280",
  },
  form: {
    padding: 16,
  },
  formSection: {
    marginBottom: 24,
  },
  typeSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#212529",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
    fontWeight: "500",
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  typeCard: {
    width: "48%",
    margin: 6,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 2,
    borderStyle: "dashed",
    position: "relative",
  },
  selectedTypeCard: {
    borderStyle: "solid",
    backgroundColor: "#FFF7F0",
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
    textAlign: "center",
  },
  selectedIndicator: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    alignItems: "center",
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  saveButton: {
    flex: 2,
    flexDirection: "row",
    backgroundColor: "#FF6B00",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF6B00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.5,
    backgroundColor: "#9CA3AF",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  buttonIcon: {
    marginLeft: 8,
  },
  offlineNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF5F5",
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#FED7D7",
  },
  offlineNoticeText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#E53E3E",
    fontWeight: "500",
  },
  dangerZone: {
    backgroundColor: "#FFF5F5",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#F8D7DA",
  },
  dangerZoneTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#721C24",
    marginBottom: 8,
  },
  dangerZoneText: {
    fontSize: 14,
    color: "#721C24",
    lineHeight: 20,
    marginBottom: 16,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF5F5",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#dc3545",
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#dc3545",
    marginLeft: 8,
  },
  lastUpdated: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },
  lastUpdatedText: {
    fontSize: 12,
    color: "#6c757d",
    marginLeft: 4,
  },
});
