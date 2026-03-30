// src/screens/ProfileScreen.js - Updated with BusinessContext integration
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
  FlatList,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import databaseService from "../../database";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalUser } from "../../hooks/useLocalUser";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useSync } from "../../context/SyncContext";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "../../../constants";
import imageManager from "../../utils/ImageManager";
import CustomHeader from "../../components/CustomHeader";
import { useBusiness } from "../../context/BusinessContext";
import { openDatabase } from "../../database";

// Country codes data
const COUNTRIES = [
  { code: "+254", name: "Kenya", flag: "🇰🇪" },
  { code: "+255", name: "Tanzania", flag: "🇹🇿" },
  { code: "+256", name: "Uganda", flag: "🇺🇬" },
  { code: "+250", name: "Rwanda", flag: "🇷🇼" },
  { code: "+257", name: "Burundi", flag: "🇧🇮" },
  { code: "+211", name: "South Sudan", flag: "🇸🇸" },
  { code: "+251", name: "Ethiopia", flag: "🇪🇹" },
  { code: "+252", name: "Somalia", flag: "🇸🇴" },
  { code: "+253", name: "Djibouti", flag: "🇩🇯" },
  { code: "+27", name: "South Africa", flag: "🇿🇦" },
  { code: "+234", name: "Nigeria", flag: "🇳🇬" },
  { code: "+233", name: "Ghana", flag: "🇬🇭" },
];

// Helper functions
const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return "Not set";
  const cleaned = phoneNumber.replace(/\D/g, "");
  let formatted = cleaned;
  if (formatted.startsWith("0")) {
    formatted = formatted.substring(1);
  }
  if (formatted.startsWith("254") && formatted.length === 12) {
    return `+254 (0)${formatted.substring(3, 6)} ${formatted.substring(6, 9)} ${formatted.substring(9)}`;
  }
  for (const country of COUNTRIES) {
    const countryCode = country.code.replace("+", "");
    if (formatted.startsWith(countryCode)) {
      const rest = formatted.substring(countryCode.length);
      return `${country.code} (0)${rest.substring(0, 3)} ${rest.substring(3, 6)} ${rest.substring(6)}`;
    }
  }
  return phoneNumber;
};

const parsePhoneForEdit = (phoneNumber) => {
  if (!phoneNumber) return { countryCode: "+254", localNumber: "" };
  const cleaned = phoneNumber.replace(/\D/g, "");
  let countryCode = "+254";
  let localNumber = cleaned;
  for (const country of COUNTRIES) {
    const countryDigits = country.code.replace("+", "");
    if (cleaned.startsWith(countryDigits)) {
      countryCode = country.code;
      localNumber = cleaned.substring(countryDigits.length);
      break;
    }
  }
  if (localNumber.startsWith("0")) {
    localNumber = localNumber.substring(1);
  }
  return { countryCode, localNumber };
};

const getAccessTokenFromSecureStore = async () => {
  try {
    const token = await SecureStore.getItemAsync("access_token");
    return token;
  } catch (error) {
    console.error("Error getting access token:", error);
    return null;
  }
};

export default function ProfileScreen({ navigation }) {
  const {
    user: authUser,
    isPinSet,
    logout,
    removePin,
    updateProfile,
  } = useAuth();
  const { user, isLoading, updateLocalUser, updateUserProfile, getProfile } =
    useLocalUser();

  const getSetting = async (userId, key) => {
    try {
      return await databaseService.SettingsService.getUserSetting(userId, key);
    } catch (error) {
      console.error("Error getting app setting:", error);
      return null;
    }
  };

  const setSetting = async (userId, key, value) => {
    try {
      return await databaseService.SettingsService.setUserSetting(
        userId,
        key,
        value,
      );
    } catch (error) {
      console.error("Error setting app setting:", error);
      return false;
    }
  };

  const {
    manualSync,
    syncStatus: rawSyncStatus,
    hasPendingChanges,
    pullAllData,
    checkMissingData,
    updateSyncStatus,
  } = useSync();

  const { 
    businesses, 
    loadUserBusinesses, 
    downloadInitialBusinessData,
    downloadProductData,
    productSyncStatus,
    checkProductSyncStatus
  } = useBusiness();

  // Create a safe syncStatus with defaults
  const syncStatus = rawSyncStatus || {
    isSyncing: false,
    isOnline: false,
    lastSync: null,
    pendingChanges: 0,
    autoSyncEnabled: true,
    wifiOnly: false,
    connectionType: "unknown",
    syncProgress: {
      isRunning: false,
      currentStep: "",
      totalSteps: 0,
      completedSteps: 0,
      details: "",
    },
  };

  // State variables
  const displayUser = user || authUser;
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [phoneData, setPhoneData] = useState({
    countryCode: "+254",
    localNumber: "",
  });
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    date_of_birth: "",
  });
  const [profileImage, setProfileImage] = useState(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    autoSync: true,
  });
  const [isRefreshingBusinessData, setIsRefreshingBusinessData] =
    useState(false);
  const [localBusinesses, setLocalBusinesses] = useState([]);
  const [isPullingData, setIsPullingData] = useState(false);
  const [pullProgress, setPullProgress] = useState({
    isRunning: false,
    step: "",
    details: "",
    progress: 0,
    totalSteps: 5,
  });

  // Animation for sync
  const spinValue = useRef(new Animated.Value(0)).current;
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // Start spin animation when syncing
  useEffect(() => {
    if (syncStatus.isSyncing) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      spinValue.setValue(0);
      Animated.timing(spinValue).stop();
    }
  }, [syncStatus.isSyncing]);

  // Load data on mount
  useEffect(() => {
    loadUserData();
    loadSettings();
    loadBusinessData();
  }, []);

  useEffect(() => {
    if (displayUser?.id && !isEditing) {
      loadUserData();
      loadBusinessData();
    }
  }, [displayUser?.id]);

  // ========== DATA LOADING FUNCTIONS ==========
  const loadBusinessData = async () => {
    try {
      if (displayUser?.id) {
        const db = await openDatabase();
        const userBusinesses = await db.getAllAsync(
          "SELECT * FROM businesses WHERE owner_id = ? AND is_active = 1",
          [String(displayUser.id)],
        );
        setLocalBusinesses(userBusinesses);
      }
    } catch (error) {
      console.error("Error loading business data:", error);
    }
  };

  const loadUserData = async () => {
    setIsLoadingProfile(true);
    try {
      if (displayUser) {
        setFormData({
          first_name: displayUser.first_name || "",
          last_name: displayUser.last_name || "",
          email: displayUser.email || "",
          date_of_birth: displayUser.date_of_birth || "",
        });

        if (displayUser.date_of_birth) {
          setSelectedDate(new Date(displayUser.date_of_birth));
        }

        if (displayUser.phone_number) {
          const parsedPhone = parsePhoneForEdit(displayUser.phone_number);
          setPhoneData(parsedPhone);
        }

        if (displayUser.id) {
          try {
            const profile = await getProfile(displayUser.id);
            setProfileData(profile);

            if (profile) {
              const imageUri = await imageManager.getImageUri(
                profile.server_profile_picture || profile.profile_picture,
                profile.local_profile_picture,
                displayUser.id,
              );

              if (imageUri) {
                console.log("✅ Loaded profile image:", imageUri);
                setProfileImage(imageUri);
              } else if (displayUser.profile_picture) {
                setProfileImage(displayUser.profile_picture);
              } else {
                setProfileImage(null);
              }
            }
          } catch (imageError) {
            console.error("Error loading profile image:", imageError);
            if (displayUser.profile_picture) {
              setProfileImage(displayUser.profile_picture);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const loadSettings = async () => {
    if (displayUser && displayUser.id) {
      const savedSettings = await getSetting(
        displayUser.id,
        "profile_settings",
      );
      if (savedSettings) {
        setSettings((prev) => ({ ...prev, ...savedSettings }));
      }
    }
  };

  // Add function to check and download product data using BusinessContext
  const handleDownloadProductData = async () => {
    if (!displayUser) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    Alert.alert(
      "Download Product Data",
      "This will download all your product data for offline use. This may take a few minutes depending on your data size. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Download",
          style: "default",
          onPress: async () => {
            try {
              const result = await downloadProductData();

              if (result.success) {
                Alert.alert(
                  "Success",
                  `Product data downloaded successfully!\n\nSummary:\n` +
                    `• ${result.summary.product_count} products\n` +
                    `• ${result.summary.variant_count} variants\n` +
                    `• ${result.summary.inventory_count} inventory items`,
                  [{ text: "OK" }],
                );
              } else {
                Alert.alert("Error", `Download failed: ${result.error}`);
              }
            } catch (error) {
              Alert.alert("Error", `Download failed: ${error.message}`);
            }
          },
        },
      ],
    );
  };

  // Add to useEffect to check sync status on load
  useEffect(() => {
    if (displayUser?.id) {
      checkProductSyncStatus();
    }
  }, [displayUser?.id]);

  // ========== SETTINGS FUNCTIONS ==========
  const saveSettings = async (key, value) => {
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);

      if (displayUser && displayUser.id) {
        await setSetting(displayUser.id, "profile_settings", newSettings);
      }
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };

  const toggleAppLock = async () => {
    if (isPinSet) {
      Alert.alert(
        "Disable App Lock",
        "Are you sure you want to disable app lock?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Disable",
            style: "destructive",
            onPress: async () => {
              await removePin();
              Alert.alert("Success", "App lock disabled");
            },
          },
        ],
      );
    } else {
      navigation.navigate("PINSetup", { mode: "enable" });
    }
  };

  // ========== SYNC FUNCTIONS ==========
  const handlePullMissingData = async () => {
    if (!syncStatus.isOnline) {
      Alert.alert(
        "Offline",
        "You need to be online to pull data from the server.",
      );
      return;
    }

    Alert.alert(
      "Pull Data from Server",
      "This will download all your data from the server and update your local database. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Pull Data",
          style: "default",
          onPress: async () => {
            try {
              setIsPullingData(true);
              setPullProgress({
                isRunning: true,
                step: "Starting data pull...",
                details: "Initializing sync with server",
                progress: 0,
                totalSteps: 5,
              });

              // Step 1: Check what data is missing
              setPullProgress((prev) => ({
                ...prev,
                step: "Analyzing local database...",
                details: "Checking for missing data",
                progress: 10,
              }));

              const checkResult = await checkMissingData();

              setPullProgress((prev) => ({
                ...prev,
                step: "Connecting to server...",
                details: "Establishing secure connection",
                progress: 20,
              }));

              // Step 2: Pull ALL data from server
              setPullProgress((prev) => ({
                ...prev,
                step: "Downloading user accounts...",
                details: "Fetching users, profiles, and permissions",
                progress: 40,
              }));

              const pullResult = await pullAllData();

              setPullProgress((prev) => ({
                ...prev,
                step: "Downloading business data...",
                details: "Fetching businesses and shops",
                progress: 60,
              }));

              // Step 3: Update local state
              await loadUserData();
              await loadBusinessData();

              setPullProgress((prev) => ({
                ...prev,
                step: "Processing data...",
                details: "Updating local database",
                progress: 80,
              }));

              // Step 4: Update sync status
              await updateSyncStatus();

              setPullProgress((prev) => ({
                ...prev,
                step: "Finalizing...",
                details: "Sync completed successfully",
                progress: 100,
              }));

              setTimeout(() => {
                setIsPullingData(false);
                setPullProgress({
                  isRunning: false,
                  step: "",
                  details: "",
                  progress: 0,
                  totalSteps: 5,
                });

                if (pullResult.success) {
                  Alert.alert(
                    "Success",
                    "Data successfully pulled from server! Your local database has been updated with all available data.",
                    [{ text: "OK" }],
                  );
                } else {
                  Alert.alert(
                    "Partial Success",
                    "Some data was pulled successfully. Check sync status for details.",
                    [{ text: "OK" }],
                  );
                }
              }, 1000);
            } catch (error) {
              console.error("Error pulling missing data:", error);
              setIsPullingData(false);
              setPullProgress({
                isRunning: false,
                step: "",
                details: "",
                progress: 0,
                totalSteps: 5,
              });

              Alert.alert("Error", `Failed to pull data: ${error.message}`, [
                { text: "OK" },
              ]);
            }
          },
        },
      ],
    );
  };

  // Smart sync: First push local changes, then pull from server
  const handleSmartSync = async () => {
    if (!syncStatus.isOnline) {
      Alert.alert("Offline", "You need to be online to sync data.");
      return;
    }

    Alert.alert(
      "Smart Sync",
      "This will first push your local changes to the server, then pull the latest data from the server.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sync",
          style: "default",
          onPress: async () => {
            try {
              // First push local changes
              const pushResult = await manualSync();

              if (pushResult.success || pushResult.requiresLogin) {
                // Then pull fresh data from server
                const pullResult = await pullAllData();

                if (pullResult.success) {
                  await loadUserData();
                  await loadBusinessData();
                  await updateSyncStatus();

                  Alert.alert(
                    "Sync Complete",
                    "Data synchronized successfully!",
                    [{ text: "OK" }],
                  );
                } else {
                  Alert.alert(
                    "Partial Sync",
                    "Local changes were pushed, but could not pull latest data from server.",
                    [{ text: "OK" }],
                  );
                }
              } else {
                Alert.alert(
                  "Sync Failed",
                  pushResult.error || "Failed to sync changes",
                );
              }
            } catch (error) {
              Alert.alert("Error", `Sync failed: ${error.message}`);
            }
          },
        },
      ],
    );
  };

  // ========== PROFILE FUNCTIONS ==========
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhoneNumberChange = (value) => {
    const cleaned = value.replace(/\D/g, "");
    setPhoneData((prev) => ({ ...prev, localNumber: cleaned }));
  };

  const showDatePickerModal = () => {
    setShowDatePicker(true);
  };

  const onDateChange = (event, date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      const formattedDate = date.toISOString().split("T")[0];
      handleInputChange("date_of_birth", formattedDate);
    }
  };

  const formatDateDisplay = (dateString) => {
    if (!dateString) return "Not set";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return dateString;
    }
  };

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Sorry, we need camera roll permissions to change your profile picture.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setIsImageLoading(true);

        const filename = imageManager.generateFilename(
          imageUri,
          displayUser.id,
        );
        const localPath = `${imageManager.cacheDirectory}${filename}`;

        await FileSystem.copyAsync({ from: imageUri, to: localPath });

        setProfileImage(localPath);
        await updateUserProfile({
          local_profile_picture: localPath,
          is_dirty: 1,
        });

        if (syncStatus.isOnline) {
          const formData = new FormData();
          formData.append("profile_picture", {
            uri: imageUri,
            type: "image/jpeg",
            name: "profile_picture.jpg",
          });

          try {
            const accessToken = await getAccessTokenFromSecureStore();
            if (!accessToken) throw new Error("No access token found");

            const uploadResponse = await axios.post(
              `${API_URL}/auth/profile/upload-picture/`,
              formData,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "multipart/form-data",
                },
                timeout: 30000,
              },
            );

            if (uploadResponse.data.success) {
              const serverImageUrl = uploadResponse.data.picture_url;
              await updateUserProfile({
                profile_picture: serverImageUrl,
                server_profile_picture: serverImageUrl,
              });

              const downloadedPath = await imageManager.downloadAndSaveImage(
                serverImageUrl,
                displayUser.id,
              );

              if (downloadedPath) {
                const filename = imageManager.extractFilename(downloadedPath);
                await imageManager.cleanupOldImages(displayUser.id, filename);
                await updateUserProfile({
                  local_profile_picture: downloadedPath,
                });
                setProfileImage(downloadedPath);
              }

              Alert.alert("Success", "Profile picture updated and synced!");
              setTimeout(() => {
                manualSync();
              }, 1000);
            }
          } catch (uploadError) {
            console.error("Image upload error:", uploadError);
            Alert.alert(
              "Upload Failed",
              "Profile picture saved locally. It will be uploaded when you sync.",
            );
          }
        } else {
          Alert.alert(
            "Offline Mode",
            "Profile picture saved locally. It will be uploaded when you go online and sync.",
          );
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert(
        "Error",
        "Failed to update profile picture: " + error.message,
      );
    } finally {
      setIsImageLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!displayUser) return;
    try {
      setIsSaving(true);

      // Validation
      if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
        Alert.alert("Invalid Email", "Please enter a valid email address");
        setIsSaving(false);
        return;
      }

      if (phoneData.localNumber) {
        const cleaned = phoneData.localNumber.replace(/\D/g, "");
        if (cleaned.length < 9 || cleaned.length > 12) {
          Alert.alert(
            "Invalid Phone",
            "Please enter a valid phone number (9-12 digits without country code)",
          );
          setIsSaving(false);
          return;
        }
      }

      if (formData.date_of_birth) {
        const date = new Date(formData.date_of_birth);
        if (isNaN(date.getTime())) {
          Alert.alert("Invalid Date", "Please enter a valid date");
          setIsSaving(false);
          return;
        }
      }

      const fullPhoneNumber = phoneData.localNumber
        ? phoneData.countryCode + phoneData.localNumber.replace(/^0+/, "")
        : "";

      const userUpdates = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone_number: fullPhoneNumber,
      };

      const updatedUser = await updateLocalUser(userUpdates);

      if (updatedUser) {
        const profileUpdates = {};
        if (formData.date_of_birth) {
          profileUpdates.date_of_birth = formData.date_of_birth;
        }

        if (Object.keys(profileUpdates).length > 0) {
          await updateUserProfile(profileUpdates);
        }

        await updateProfile(userUpdates);

        Alert.alert("Success", "Profile updated successfully!");
        setIsEditing(false);
        await loadUserData();

        if (syncStatus.isOnline && syncStatus.autoSyncEnabled) {
          setTimeout(() => {
            manualSync().then((result) => {
              if (result.success) {
                console.log("✅ Profile changes synced in background");
              }
            });
          }, 1000);
        }
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      Alert.alert("Error", error.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  // ========== LOGOUT FUNCTION ==========
  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  // ========== NAVIGATION FUNCTIONS ==========
  const handleNavigateToSync = () => {
    navigation.navigate("SyncScreen");
  };

  // ========== RENDER FUNCTIONS ==========

  const renderCountryItem = ({ item }) => (
    <TouchableOpacity
      style={styles.countryItem}
      onPress={() => {
        setPhoneData((prev) => ({ ...prev, countryCode: item.code }));
        setShowCountryPicker(false);
      }}
    >
      <Text style={styles.countryFlag}>{item.flag}</Text>
      <Text style={styles.countryName}>{item.name}</Text>
      <Text style={styles.countryCode}>{item.code}</Text>
    </TouchableOpacity>
  );

  const renderInfoItem = (label, field) => {
    if (isEditing) {
      return (
        <View style={styles.infoItem} key={field}>
          <Text style={styles.infoLabel}>{label}</Text>
          <TextInput
            style={styles.input}
            value={formData[field]}
            onChangeText={(value) => handleInputChange(field, value)}
            placeholder={`Enter ${label.toLowerCase()}`}
            autoCapitalize="words"
          />
        </View>
      );
    }
    return (
      <View style={styles.infoItem} key={field}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{formData[field] || "Not set"}</Text>
      </View>
    );
  };

  const renderPhoneItem = () => {
    if (isEditing) {
      return (
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Phone Number</Text>
          <View style={styles.phoneInputContainer}>
            <TouchableOpacity
              style={styles.countryCodeButton}
              onPress={() => setShowCountryPicker(true)}
            >
              <Text style={styles.countryCodeText}>
                {phoneData.countryCode}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>
            <TextInput
              style={styles.phoneNumberInput}
              value={phoneData.localNumber}
              onChangeText={handlePhoneNumberChange}
              placeholder="712 345 678"
              keyboardType="phone-pad"
              maxLength={12}
            />
          </View>
        </View>
      );
    }
    return (
      <View style={styles.infoItem}>
        <Text style={styles.infoLabel}>Phone Number</Text>
        <Text style={styles.infoValue}>
          {formatPhoneNumber(phoneData.countryCode + phoneData.localNumber)}
        </Text>
      </View>
    );
  };

  const renderDateItem = () => {
    if (isEditing) {
      return (
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Date of Birth</Text>
          <TouchableOpacity
            style={styles.dateInputContainer}
            onPress={showDatePickerModal}
          >
            <Text style={styles.dateInputText}>
              {formData.date_of_birth
                ? formatDateDisplay(formData.date_of_birth)
                : "Select date"}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.infoItem}>
        <Text style={styles.infoLabel}>Date of Birth</Text>
        <Text style={styles.infoValue}>
          {formatDateDisplay(formData.date_of_birth)}
        </Text>
      </View>
    );
  };

  const renderReadOnlyItem = (label, value) => (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || "Not set"}</Text>
    </View>
  );

  const renderUserTypeItem = () => {
    const getBadgeStyle = (type) => {
      switch (type) {
        case "owner":
          return styles.ownerBadge;
        case "admin":
          return styles.adminBadge;
        case "employee":
          return styles.employeeBadge;
        default:
          return styles.ownerBadge;
      }
    };

    return (
      <View style={styles.infoItem}>
        <Text style={styles.infoLabel}>User Type</Text>
        <View
          style={[
            styles.userTypeSmallBadge,
            getBadgeStyle(displayUser.user_type),
          ]}
        >
          <Text style={styles.userTypeSmallText}>
            {formatUserType(displayUser.user_type)}
          </Text>
        </View>
      </View>
    );
  };

  const renderSettingItem = (
    iconName,
    title,
    subtitle,
    rightComponent,
    onPress = null,
  ) => {
    const content = (
      <View style={styles.settingItem}>
        <View style={styles.settingLeft}>
          <View style={styles.settingIcon}>
            <Ionicons name={iconName} size={20} color="#FF6B00" />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>{title}</Text>
            <Text style={styles.settingSubtitle}>{subtitle}</Text>
          </View>
        </View>
        {rightComponent}
      </View>
    );

    if (onPress) {
      return (
        <TouchableOpacity key={title} onPress={onPress}>
          {content}
        </TouchableOpacity>
      );
    }

    return <View key={title}>{content}</View>;
  };

  const renderInfoRow = (iconName, title, subtitle, onPress) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          <Ionicons name={iconName} size={20} color="#666" />
        </View>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  const formatUserType = (userType) => {
    const types = { owner: "Owner", employee: "Employee", admin: "Admin" };
    return types[userType] || userType;
  };

  // Country picker modal
  const renderCountryPicker = () => (
    <Modal
      visible={showCountryPicker}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCountryPicker(false)}
    >
      <TouchableWithoutFeedback onPress={() => setShowCountryPicker(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Country</Text>
                <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={COUNTRIES}
                renderItem={renderCountryItem}
                keyExtractor={(item) => item.code}
                style={styles.countryList}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  // Date picker
  const renderDatePicker = () =>
    showDatePicker && (
      <DateTimePicker
        value={selectedDate}
        mode="date"
        display={Platform.OS === "ios" ? "spinner" : "default"}
        onChange={onDateChange}
        maximumDate={new Date()}
      />
    );

  // Loading state
  if (isLoading || isLoadingProfile) {
    return (
      <View style={styles.loadingContainer}>
        <CustomHeader title="Profile" />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  if (!displayUser) {
    return (
      <View style={styles.container}>
        <CustomHeader title="Profile" />
        <View style={styles.errorContainer}>
          <Ionicons name="person-circle-outline" size={80} color="#ccc" />
          <Text style={styles.errorText}>No user data available</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadUserData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader title="Profile" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            {/* Header Section */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={pickImage}
                style={styles.avatarContainer}
              >
                {isImageLoading ? (
                  <View style={styles.avatarPlaceholder}>
                    <ActivityIndicator size="large" color="#fff" />
                  </View>
                ) : profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {displayUser.first_name?.[0]?.toUpperCase() ||
                        displayUser.username?.[0]?.toUpperCase() ||
                        "U"}
                      {displayUser.last_name?.[0]?.toUpperCase() || ""}
                    </Text>
                  </View>
                )}
                <View style={styles.editImageIcon}>
                  <Ionicons name="camera" size={16} color="#fff" />
                </View>
              </TouchableOpacity>

              <Text style={styles.name}>
                {displayUser.first_name && displayUser.last_name
                  ? `${displayUser.first_name} ${displayUser.last_name}`
                  : displayUser.username || "User"}
              </Text>

              <Text style={styles.email}>
                {displayUser.email || "No email provided"}
              </Text>

              <View style={styles.userTypeBadge}>
                <Text style={styles.userTypeText}>
                  {formatUserType(displayUser.user_type)}
                </Text>
              </View>

              {!isEditing && (
                <View style={styles.headerButtons}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => setIsEditing(true)}
                  >
                    <Ionicons name="create-outline" size={18} color="#FF6B00" />
                    <Text style={styles.editButtonText}>Edit Profile</Text>
                  </TouchableOpacity>

                  {hasPendingChanges && !isEditing && (
                    <TouchableOpacity
                      style={styles.syncButton}
                      onPress={handleSmartSync}
                      disabled={syncStatus.isSyncing}
                    >
                      {syncStatus.isSyncing ? (
                        <Animated.View
                          style={{ transform: [{ rotate: spin }] }}
                        >
                          <Ionicons
                            name="sync-outline"
                            size={16}
                            color="#fff"
                          />
                        </Animated.View>
                      ) : (
                        <>
                          <Ionicons
                            name="sync-outline"
                            size={16}
                            color="#fff"
                          />
                          <Text style={styles.syncButtonText}>
                            Sync Changes
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* Data Pull Progress Modal */}
            {isPullingData && (
              <View style={styles.progressModal}>
                <View style={styles.progressContent}>
                  <ActivityIndicator size="large" color="#FF6B00" />
                  <Text style={styles.progressTitle}>
                    Pulling Data from Server
                  </Text>
                  <Text style={styles.progressStep}>{pullProgress.step}</Text>
                  <Text style={styles.progressDetails}>
                    {pullProgress.details}
                  </Text>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${pullProgress.progress}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressPercentage}>
                    {pullProgress.progress}%
                  </Text>
                </View>
              </View>
            )}

            {/* Sync Status Card */}
            <View style={styles.syncStatusCard}>
              <View style={styles.syncStatusHeader}>
                <Ionicons
                  name="cloud"
                  size={24}
                  color={syncStatus.isOnline ? "#4CAF50" : "#f44336"}
                />
                <Text style={styles.syncStatusTitle}>
                  {syncStatus.isOnline ? "Online" : "Offline"}
                </Text>
              </View>

              <View style={styles.syncStatusDetails}>
                <View style={styles.syncStatusItem}>
                  <Ionicons name="time-outline" size={16} color="#666" />
                  <Text style={styles.syncStatusLabel}>Last Sync:</Text>
                  <Text style={styles.syncStatusValue}>
                    {syncStatus.lastSync
                      ? new Date(syncStatus.lastSync).toLocaleString()
                      : "Never"}
                  </Text>
                </View>

                <View style={styles.syncStatusItem}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={16}
                    color={hasPendingChanges ? "#FF9800" : "#4CAF50"}
                  />
                  <Text style={styles.syncStatusLabel}>Pending Changes:</Text>
                  <Text
                    style={[
                      styles.syncStatusValue,
                      { color: hasPendingChanges ? "#FF9800" : "#4CAF50" },
                    ]}
                  >
                    {syncStatus.pendingChanges || 0}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.pullDataButton}
                onPress={handlePullMissingData}
                disabled={isPullingData}
              >
                <Ionicons
                  name="cloud-download-outline"
                  size={18}
                  color="#fff"
                />
                <Text style={styles.pullDataButtonText}>
                  {isPullingData ? "Pulling Data..." : "Pull Data from Server"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Product Data Sync Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Product Data Sync</Text>
              
              {productSyncStatus.localStats && (
                <View style={styles.statsContainer}>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Local Products:</Text>
                    <Text style={styles.statValue}>{productSyncStatus.localStats.products}</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Variants:</Text>
                    <Text style={styles.statValue}>{productSyncStatus.localStats.variants}</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Last Updated:</Text>
                    <Text style={styles.statValue}>
                      {productSyncStatus.localStats.lastUpdated 
                        ? new Date(productSyncStatus.localStats.lastUpdated).toLocaleDateString()
                        : 'Never'
                      }
                    </Text>
                  </View>
                </View>
              )}
              
              <TouchableOpacity 
                style={[styles.downloadButton, productSyncStatus.isSyncing && styles.downloadButtonDisabled]}
                onPress={handleDownloadProductData}
                disabled={productSyncStatus.isSyncing}
              >
                {productSyncStatus.isSyncing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="cloud-download" size={20} color="#fff" />
                    <Text style={styles.downloadButtonText}>
                      {productSyncStatus.syncNeeded ? 'Sync Product Data' : 'Download Product Data'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              
              {productSyncStatus.lastSync && (
                <Text style={styles.lastSyncText}>
                  Last sync: {new Date(productSyncStatus.lastSync).toLocaleString()}
                </Text>
              )}
              
              <Text style={styles.syncHelpText}>
                Product data is stored locally for offline use. Sync regularly to keep your data up to date.
              </Text>
            </View>

            {/* Profile Information Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Profile Information</Text>
              <View style={styles.infoGrid}>
                {renderInfoItem("First Name", "first_name")}
                {renderInfoItem("Last Name", "last_name")}
                {renderInfoItem("Email", "email")}
                {renderPhoneItem()}
                {renderDateItem()}
                {renderReadOnlyItem("Username", displayUser.username)}
                {renderUserTypeItem()}
                {renderReadOnlyItem(
                  "Last Login",
                  displayUser.last_login
                    ? new Date(displayUser.last_login).toLocaleString()
                    : "Never",
                )}
              </View>

              {/* Edit Mode Actions */}
              {isEditing && (
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setIsEditing(false);
                      loadUserData();
                    }}
                    disabled={isSaving}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      isSaving && styles.saveButtonDisabled,
                    ]}
                    onPress={handleSaveProfile}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="save-outline" size={18} color="#fff" />
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* App Settings Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>App Settings</Text>
              {renderSettingItem(
                "lock-closed",
                "App Lock",
                isPinSet
                  ? "Active • PIN + Biometric enabled"
                  : "Protect your app with PIN & Face ID/Fingerprint",
                <Switch
                  value={isPinSet}
                  onValueChange={toggleAppLock}
                  trackColor={{ false: "#E0E0E0", true: "#FFCCBC" }}
                  thumbColor={isPinSet ? "#FF6B00" : "#f4f3f4"}
                />,
                !isPinSet
                  ? () => navigation.navigate("PINSetup", { mode: "enable" })
                  : undefined,
              )}

              {isPinSet &&
                renderSettingItem(
                  "key",
                  "Change PIN",
                  "Set a new 4-digit PIN",
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />,
                  () => navigation.navigate("PINSetup", { mode: "change" }),
                )}

              {renderSettingItem(
                "notifications",
                "Notifications",
                "Receive app notifications",
                <Switch
                  value={settings.notifications}
                  onValueChange={(value) =>
                    saveSettings("notifications", value)
                  }
                  trackColor={{ false: "#E0E0E0", true: "#FFCCBC" }}
                  thumbColor={settings.notifications ? "#FF6B00" : "#f4f3f4"}
                />,
              )}

              {renderSettingItem(
                "sync",
                "Auto Sync",
                "Sync data automatically when online",
                <Switch
                  value={settings.autoSync}
                  onValueChange={(value) => saveSettings("autoSync", value)}
                  trackColor={{ false: "#E0E0E0", true: "#FFCCBC" }}
                  thumbColor={settings.autoSync ? "#FF6B00" : "#f4f3f4"}
                />,
              )}
            </View>

            {/* App Info Section */}
            <View style={styles.section}>
              {renderInfoRow(
                "server-outline",
                "Database Viewer",
                "View offline database contents",
                () => navigation.navigate("DatabaseViewer"),
              )}
              {renderInfoRow(
                "information-circle",
                "About Vendex",
                "Version 1.0 • Made in Kenya 🇰🇪",
                () => navigation.navigate("About"),
              )}
              {renderInfoRow(
                "help-circle",
                "Help & Support",
                "Get help or report issues",
                () => navigation.navigate("Help"),
              )}
              {renderInfoRow(
                "cloud-upload",
                "Data Sync",
                hasPendingChanges
                  ? `${syncStatus.pendingChanges} pending change(s)`
                  : "All data synced",
                handleNavigateToSync,
              )}
            </View>

            {/* Logout Button */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={20} color="#fff" />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>

            {/* Bottom Spacer */}
            <View style={{ height: 30 }} />
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Modals */}
      {renderCountryPicker()}
      {renderDatePicker()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fffaf5" },
  loadingContainer: { flex: 1, backgroundColor: "#fffaf5" },
  loadingContent: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 20, color: "#FF6B00", fontSize: 16 },
  scrollView: { flex: 1 },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: { fontSize: 18, color: "#666", marginTop: 20, marginBottom: 20 },
  retryButton: {
    backgroundColor: "#FF6B00",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  // Header Styles
  header: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  avatarContainer: { position: "relative", marginBottom: 15 },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#FF6B00",
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FF6B00",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FF6B00",
  },
  avatarText: { fontSize: 40, fontWeight: "bold", color: "#fff" },
  editImageIcon: {
    position: "absolute",
    bottom: 5,
    right: 5,
    backgroundColor: "#FF6B00",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  name: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
    textAlign: "center",
  },
  email: { fontSize: 16, color: "#666", marginBottom: 15, textAlign: "center" },
  userTypeBadge: {
    backgroundColor: "#FF6B00",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  userTypeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#FFCCBC",
  },
  editButtonText: {
    color: "#FF6B00",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  syncButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF6B00",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  syncButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 5,
  },

  // Sync Status Card
  syncStatusCard: {
    backgroundColor: "#fff",
    margin: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  syncStatusHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  syncStatusTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 10,
  },
  syncStatusDetails: { marginBottom: 20 },
  syncStatusItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  syncStatusLabel: { fontSize: 14, color: "#666", marginLeft: 8, flex: 1 },
  syncStatusValue: { fontSize: 14, fontWeight: "600", color: "#333" },
  pullDataButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2196F3",
    paddingVertical: 14,
    borderRadius: 12,
  },
  pullDataButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },

  // Progress Modal
  progressModal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  progressContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    width: "80%",
    maxWidth: 400,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 10,
  },
  progressStep: {
    fontSize: 16,
    color: "#FF6B00",
    fontWeight: "600",
    marginBottom: 5,
    textAlign: "center",
  },
  progressDetails: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    overflow: "hidden",
    width: "100%",
    marginBottom: 10,
  },
  progressFill: { height: "100%", backgroundColor: "#FF6B00", borderRadius: 4 },
  progressPercentage: { fontSize: 16, fontWeight: "bold", color: "#333" },

  // Section Styles
  section: {
    backgroundColor: "#fff",
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  infoItem: { width: "48%", marginBottom: 20 },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 6,
    fontWeight: "500",
  },
  infoValue: { fontSize: 16, color: "#333", fontWeight: "500", minHeight: 24 },
  input: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#333",
  },

  // Edit Actions
  editActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    marginRight: 10,
  },
  cancelButtonText: { color: "#666", fontSize: 16, fontWeight: "600" },
  saveButton: {
    flex: 2,
    flexDirection: "row",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B00",
    borderRadius: 10,
    marginLeft: 10,
  },
  saveButtonDisabled: { backgroundColor: "#FFB74D" },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },

  // Setting Items
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  settingLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f9f9f9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingContent: { flex: 1 },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  settingSubtitle: { fontSize: 13, color: "#888" },

  // Logout Button
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#d32f2f",
    marginHorizontal: 20,
    marginTop: 30,
    paddingVertical: 16,
    borderRadius: 12,
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 10,
  },

  // Country Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "60%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  countryList: { paddingHorizontal: 20 },
  countryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  countryFlag: { fontSize: 24, marginRight: 12 },
  countryName: { flex: 1, fontSize: 16, color: "#333" },
  countryCode: { fontSize: 16, color: "#666" },

  // Phone Input
  phoneInputContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  countryCodeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 80,
  },
  countryCodeText: { fontSize: 16, color: "#333", marginRight: 4 },
  phoneNumberInput: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#333",
  },

  // Date Input
  dateInputContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateInputText: { fontSize: 16, color: "#333" },

  // User Type Badge
  userTypeSmallBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  ownerBadge: { backgroundColor: "#FF6B00" },
  adminBadge: { backgroundColor: "#2196F3" },
  employeeBadge: { backgroundColor: "#4CAF50" },
  userTypeSmallText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  // Product Sync Styles
  statsContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  downloadButtonDisabled: {
    backgroundColor: '#81C784',
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  lastSyncText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  syncHelpText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 5,
  },
});