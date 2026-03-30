// src/screens/owner/CreateBusinessScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useBusiness } from "../../context/BusinessContext";
import CustomHeaderWithButton from "../../components/CustomHeaderWithButton";
import InputField from "../../components/InputField";

// Mock business types for selection - UPDATED with valid icon names
const BUSINESS_TYPES = [
  { id: "retail", label: "Retail", icon: "cart-outline", color: "#FF6B00" },
  { id: "wholesale", label: "Wholesale", icon: "cube-outline", color: "#2196F3" },
  {
    id: "food",
    label: "Food & Beverage",
    icon: "restaurant-outline",
    color: "#4CAF50",
  },
  { id: "service", label: "Service", icon: "construct-outline", color: "#9C27B0" },
  {
    id: "manufacturing",
    label: "Manufacturing",
    icon: "build-outline",
    color: "#FF9800",
  },
  { id: "other", label: "Other", icon: "business-outline", color: "#607D8B" },
];

// Mock industries for selection
const INDUSTRIES = [
  "Retail & Wholesale",
  "Food & Beverage",
  "Hospitality",
  "Healthcare",
  "Technology",
  "Manufacturing",
  "Construction",
  "Education",
  "Finance",
  "Transportation",
  "Other",
];

export default function CreateBusinessScreen({ navigation }) {
  const { user } = useAuth();
  const { createBusiness, syncing, isOnline, checkNetwork } = useBusiness();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedIndustry, setSelectedIndustry] = useState(null);
  const [showOfflineWarning, setShowOfflineWarning] = useState(false);

  const [form, setForm] = useState({
    name: "",
    registration_number: "",
    phone_number: "",
    email: "",
    address: "",
    tax_id: "",
    website: "",
    description: "",
    industry: "",
    business_type: "",
    established_date: new Date().toISOString().split("T")[0],
  });

  // Check network status on mount
  useEffect(() => {
    const checkConnection = () => {
      setShowOfflineWarning(!isOnline);
    };
    
    checkConnection();
    
    const unsubscribe = navigation.addListener('focus', () => {
      checkConnection();
    });
    
    return unsubscribe;
  }, [navigation, isOnline]);

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const handleSelectType = (type) => {
    setSelectedType(type);
    setForm({ ...form, business_type: type.id });
  };

  const handleSelectIndustry = (industry) => {
    setSelectedIndustry(industry);
    setForm({ ...form, industry });
  };

  const validateStep1 = () => {
    if (!form.name.trim()) {
      Alert.alert("Required", "Business name is required");
      return false;
    }
    if (!selectedType) {
      Alert.alert("Required", "Please select a business type");
      return false;
    }
    if (!form.email && !form.phone_number) {
      Alert.alert("Required", "Please provide at least one contact method");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!form.address.trim()) {
      Alert.alert("Required", "Business address is required");
      return false;
    }
    return true;
  };

  const nextStep = async () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      await handleSubmit();
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to create a business");
      return;
    }

    const online = await checkNetwork();
    if (!online) {
      Alert.alert(
        "Offline Mode",
        "You need to be online to create a new business. Business creation requires an internet connection.\n\nPlease check your connection and try again.",
        [
          { text: "Check Connection", onPress: () => checkNetwork() },
          { text: "OK", style: "cancel" }
        ]
      );
      return;
    }

    setLoading(true);
    try {
      const businessData = {
        ...form,
        name: form.name.trim(),
        business_type: selectedType?.id || "",
        industry: selectedIndustry || "",
        phone_number: form.phone_number || "",
        email: form.email || "",
        registration_number: form.registration_number || "",
        tax_id: form.tax_id || "",
        website: form.website || "",
        description: form.description || "",
        address: form.address || "",
        established_date: form.established_date || new Date().toISOString().split("T")[0],
        owner_id: user.id,
      };

      const result = await createBusiness(businessData);

      if (result.success) {
        Alert.alert("Success! 🎉", result.message, [
          {
            text: "Add Your First Shop",
            onPress: () =>
              navigation.navigate("CreateShop", {
                businessId: result.business.id,
                businessName: result.business.name,
              }),
          },
          {
            text: "View Dashboard",
            onPress: () => navigation.navigate("Dashboard"),
            style: "cancel",
          },
        ]);
      } else {
        if (result.requiresOnline) {
          Alert.alert(
            "Offline Mode",
            result.error,
            [
              { 
                text: "Check Connection", 
                onPress: () => checkNetwork(),
                style: 'default'
              },
              { text: "OK", style: "cancel" }
            ]
          );
        } else {
          Alert.alert(
            "Error",
            result.error || "Failed to create business. Please try again."
          );
        }
      }
    } catch (error) {
      console.error("Create business error:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderOfflineWarning = () => {
    if (!showOfflineWarning) return null;
    
    return (
      <View style={styles.offlineBanner}>
        <Ionicons name="cloud-offline-outline" size={20} color="#fff" />
        <Text style={styles.offlineText}>
          You are offline. Business creation requires internet connection.
        </Text>
      </View>
    );
  };

  const renderStep1 = () => (
    <>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="business-outline" size={24} color="#FF6B00" />
          <Text style={styles.sectionTitle}>Basic Information</Text>
        </View>

        <InputField
          label="Business Name *"
          value={form.name}
          onChangeText={(text) => handleChange("name", text)}
          placeholder="e.g., Nairobi Wholesale"
          icon="business-outline"
          autoFocus
          required
          validate={InputField.Validators.required}
        />

        <InputField
          label="Business Description"
          value={form.description}
          onChangeText={(text) => handleChange("description", text)}
          placeholder="Describe your business..."
          multiline
          numberOfLines={3}
          icon="document-text-outline"
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="pricetag-outline" size={24} color="#FF6B00" />
          <Text style={styles.sectionTitle}>Business Type</Text>
        </View>

        <Text style={styles.sectionSubtitle}>
          Select the primary type of your business
        </Text>

        <View style={styles.typeGrid}>
          {BUSINESS_TYPES.map((type) => (
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
                <Ionicons name={type.icon} size={28} color={type.color} />
              </View>
              <Text style={styles.typeLabel}>{type.label}</Text>
              {selectedType?.id === type.id && (
                <View
                  style={[
                    styles.selectedIndicator,
                    { backgroundColor: type.color },
                  ]}
                >
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="call-outline" size={24} color="#FF6B00" />
          <Text style={styles.sectionTitle}>Contact Information</Text>
        </View>

        <View style={styles.dualInput}>
          <View style={styles.inputHalf}>
            <InputField
              label="Phone Number *"
              value={form.phone_number}
              onChangeText={(text) => handleChange("phone_number", text)}
              placeholder="+254 712 345 678"
              keyboardType="phone-pad"
              icon="call-outline"
              validate={InputField.Validators.phone}
            />
          </View>
          <View style={styles.inputHalf}>
            <InputField
              label="Email Address"
              value={form.email}
              onChangeText={(text) => handleChange("email", text)}
              placeholder="contact@business.com"
              keyboardType="email-address"
              autoCapitalize="none"
              icon="mail-outline"
              validate={InputField.Validators.email}
            />
          </View>
        </View>

        <InputField
          label="Website"
          value={form.website}
          onChangeText={(text) => handleChange("website", text)}
          placeholder="https://yourbusiness.com"
          keyboardType="url"
          autoCapitalize="none"
          icon="globe-outline"
        />
      </View>
    </>
  );

  const renderStep2 = () => (
    <>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="location-outline" size={24} color="#FF6B00" />
          <Text style={styles.sectionTitle}>Business Location</Text>
        </View>

        <InputField
          label="Business Address *"
          value={form.address}
          onChangeText={(text) => handleChange("address", text)}
          placeholder="Street, Building, City"
          icon="location-outline"
          multiline
          numberOfLines={2}
          required
          validate={InputField.Validators.required}
        />

        <View style={styles.mapPlaceholder}>
          <Ionicons name="map-outline" size={48} color="#d1d5db" />
          <Text style={styles.mapText}>Map will appear here</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="document-outline" size={24} color="#FF6B00" />
          <Text style={styles.sectionTitle}>Legal Information</Text>
        </View>

        <View style={styles.dualInput}>
          <View style={styles.inputHalf}>
            <InputField
              label="Registration Number"
              value={form.registration_number}
              onChangeText={(text) => handleChange("registration_number", text)}
              placeholder="CR123456"
              icon="document-text-outline"
            />
          </View>
          <View style={styles.inputHalf}>
            <InputField
              label="Tax ID (KRA PIN)"
              value={form.tax_id}
              onChangeText={(text) => handleChange("tax_id", text)}
              placeholder="P123456789X"
              icon="card-outline"
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trending-up-outline" size={24} color="#FF6B00" />
          <Text style={styles.sectionTitle}>Industry</Text>
        </View>

        <Text style={styles.sectionSubtitle}>Select your primary industry</Text>

        <View style={styles.industryGrid}>
          {INDUSTRIES.map((industry, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.industryChip,
                selectedIndustry === industry && styles.selectedIndustryChip,
              ]}
              onPress={() => handleSelectIndustry(industry)}
              activeOpacity={0.7}
              disabled={!isOnline}
            >
              <Text
                style={[
                  styles.industryText,
                  selectedIndustry === industry && styles.selectedIndustryText,
                ]}
              >
                {industry}
              </Text>
              {selectedIndustry === industry && (
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color="#FF6B00"
                  style={styles.industryCheck}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </>
  );

  const isSubmitting = loading || syncing;
  const canProceed = isOnline && !isSubmitting && selectedType && form.name.trim();

  return (
    <View style={styles.container}>
      <CustomHeaderWithButton
        title={`Create Business ${step}/2`}
        leftButtonIcon="arrow-back"
        leftButtonAction={prevStep}
        rightButtonIcon={isSubmitting ? "hourglass-outline" : undefined}
      />

      {renderOfflineWarning()}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.networkStatus}>
            <View style={[styles.networkDot, isOnline ? styles.onlineDot : styles.offlineDot]} />
            <Text style={styles.networkText}>
              {isOnline ? "✅ Online - Ready to create business" : "❌ Offline - Connect to create business"}
            </Text>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${step * 50}%` }]} />
            </View>
            <View style={styles.stepLabels}>
              <Text
                style={[styles.stepLabel, step >= 1 && styles.activeStepLabel]}
              >
                Basic Info
              </Text>
              <Text
                style={[styles.stepLabel, step >= 2 && styles.activeStepLabel]}
              >
                Details
              </Text>
            </View>
          </View>

          <View style={styles.formContainer}>
            {step === 1 ? renderStep1() : renderStep2()}
          </View>

          {syncing && (
            <View style={styles.syncStatus}>
              <Ionicons name="sync-outline" size={16} color="#FF6B00" />
              <Text style={styles.syncText}>Syncing with server...</Text>
            </View>
          )}

          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb-outline" size={24} color="#FFB800" />
              <Text style={styles.tipsTitle}>Quick Tips</Text>
            </View>
            <Text style={styles.tipsText}>
              • Business creation requires internet connection{"\n"}
              • Use your official business name{"\n"}
              • Add accurate contact information{"\n"}
              • You can edit these details later{"\n"}
              • Data syncs automatically when online
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.bottomBar}>
        <View style={styles.stepIndicator}>
          {step === 1 ? (
            <Ionicons name="document-text-outline" size={20} color="#FF6B00" />
          ) : (
            <Ionicons name="business-outline" size={20} color="#FF6B00" />
          )}
          <Text style={styles.stepIndicatorText}>Step {step} of 2</Text>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={prevStep}
            disabled={isSubmitting}
          >
            <Text style={styles.secondaryButtonText}>
              {step === 1 ? "Cancel" : "Back"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              !canProceed && styles.primaryButtonDisabled,
            ]}
            onPress={nextStep}
            disabled={!canProceed}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <Ionicons name="refresh" size={24} color="#fff" />
            ) : !isOnline ? (
              <>
                <Ionicons name="cloud-offline-outline" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>
                  Offline
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.primaryButtonText}>
                  {step === 1 ? "Continue" : "Create Business"}
                </Text>
                <Ionicons
                  name={step === 1 ? "arrow-forward" : "checkmark-circle"}
                  size={20}
                  color="#fff"
                  style={styles.buttonIcon}
                />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  offlineBanner: {
    backgroundColor: "#EF4444",
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    justifyContent: 'center',
  },
  offlineText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  networkStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 10,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  onlineDot: {
    backgroundColor: '#10B981',
  },
  offlineDot: {
    backgroundColor: '#EF4444',
  },
  networkText: {
    fontSize: 14,
    color: '#6B7280',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  progressBar: {
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FF6B00",
    borderRadius: 3,
  },
  stepLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  stepLabel: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "500",
  },
  activeStepLabel: {
    color: "#FF6B00",
  },
  formContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginLeft: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  typeCard: {
    width: "31.3%",
    margin: 6,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderStyle: "dashed",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedTypeCard: {
    borderStyle: "solid",
    backgroundColor: "#FFF7F0",
    shadowColor: "#FF6B00",
    shadowOpacity: 0.1,
  },
  typeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    textAlign: "center",
  },
  selectedIndicator: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  dualInput: {
    flexDirection: "row",
    marginHorizontal: -6,
  },
  inputHalf: {
    flex: 1,
    marginHorizontal: 6,
  },
  mapPlaceholder: {
    height: 150,
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
  },
  mapText: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 8,
  },
  industryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  industryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    margin: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  selectedIndustryChip: {
    backgroundColor: "#FFF7F0",
    borderColor: "#FF6B00",
  },
  industryText: {
    fontSize: 14,
    color: "#6B7280",
  },
  selectedIndustryText: {
    color: "#FF6B00",
    fontWeight: "600",
  },
  industryCheck: {
    marginLeft: 6,
  },
  syncStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7F0",
    padding: 12,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFD7B5",
  },
  syncText: {
    fontSize: 14,
    color: "#FF6B00",
    marginLeft: 8,
    fontWeight: "500",
  },
  tipsCard: {
    margin: 20,
    marginTop: 16,
    backgroundColor: "#FFFBEB",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#92400E",
    marginLeft: 12,
  },
  tipsText: {
    fontSize: 14,
    color: "#92400E",
    lineHeight: 22,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  stepIndicatorText: {
    fontSize: 14,
    color: "#FF6B00",
    fontWeight: "600",
    marginLeft: 8,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    alignItems: "center",
    marginRight: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  primaryButton: {
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
  primaryButtonDisabled: {
    opacity: 0.5,
    backgroundColor: "#9CA3AF",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  buttonIcon: {
    marginLeft: 8,
  },
});