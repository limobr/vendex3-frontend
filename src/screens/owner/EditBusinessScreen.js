// src/screens/owner/EditBusinessScreen.js
import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useBusiness } from '../../context/BusinessContext';
import { useAuth } from '../../context/AuthContext';
import CustomHeaderWithButton from '../../components/CustomHeaderWithButton';
import InputField from '../../components/InputField';
import Button from '../../components/Button';

// Mock business types for selection
const BUSINESS_TYPES = [
  { id: "retail", label: "Retail", icon: "storefront", color: "#FF6B00" },
  { id: "wholesale", label: "Wholesale", icon: "cube", color: "#2196F3" },
  {
    id: "food",
    label: "Food & Beverage",
    icon: "restaurant",
    color: "#4CAF50",
  },
  { id: "service", label: "Service", icon: "build", color: "#9C27B0" },
  {
    id: "manufacturing",
    label: "Manufacturing",
    icon: "factory",
    color: "#FF9800",
  },
  { id: "other", label: "Other", icon: "business", color: "#607D8B" },
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

export default function EditBusinessScreen({ route, navigation }) {
  const { businessId, businessData: initialBusinessData } = route.params;
  const { updateBusiness, deleteBusiness, businesses, isOnline, checkNetwork } = useBusiness();
  const { checkServerConnectivity } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedIndustry, setSelectedIndustry] = useState(null);
  const [business, setBusiness] = useState(null);
  
  const [form, setForm] = useState({
    name: '',
    registration_number: '',
    phone_number: '',
    email: '',
    address: '',
    industry: '',
    business_type: '',
    tax_id: '',
    website: '',
    description: '',
  });

  useEffect(() => {
    loadBusiness();
    
    // Listen for network changes
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected && state.isInternetReachable;
    });

    return () => unsubscribe();
  }, [businessId]);

  const checkNetworkStatus = async () => {
    try {
      return await checkNetwork();
    } catch (error) {
      console.error('Error checking network:', error);
      return false;
    }
  };

  const loadBusiness = async () => {
    try {
      setLoading(true);
      
      // Find business from context or use initial data
      let businessData;
      if (initialBusinessData) {
        businessData = initialBusinessData;
      } else {
        businessData = businesses.find(b => b.id === businessId);
      }
      
      if (businessData) {
        setBusiness(businessData);
        
        // Set selected type
        const businessType = BUSINESS_TYPES.find(t => t.id === businessData.business_type);
        if (businessType) {
          setSelectedType(businessType);
        }
        
        // Set selected industry
        if (businessData.industry && INDUSTRIES.includes(businessData.industry)) {
          setSelectedIndustry(businessData.industry);
        }
        
        setForm({
          name: businessData.name || '',
          registration_number: businessData.registration_number || '',
          phone_number: businessData.phone_number || '',
          email: businessData.email || '',
          address: businessData.address || '',
          industry: businessData.industry || '',
          business_type: businessData.business_type || '',
          tax_id: businessData.tax_id || '',
          website: businessData.website || '',
          description: businessData.description || '',
        });
      } else {
        Alert.alert('Error', 'Business not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading business:', error);
      Alert.alert('Error', 'Failed to load business details');
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
    setForm({ ...form, business_type: type.id });
  };

  const handleSelectIndustry = (industry) => {
    setSelectedIndustry(industry);
    setForm({ ...form, industry });
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      Alert.alert('Error', 'Business name is required');
      return false;
    }
    if (!form.address.trim()) {
      Alert.alert('Error', 'Business address is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    // Check network before submitting
    const online = await checkNetworkStatus();
    if (!online) {
      Alert.alert(
        'Offline Mode',
        'You need to be online to update business details. Business updates require an internet connection.\n\nPlease check your connection and try again.',
        [
          { text: 'Check Connection', onPress: () => checkNetworkStatus() },
          { text: 'OK', style: 'cancel' }
        ]
      );
      return;
    }

    // Check server connectivity specifically
    const serverOnline = await checkServerConnectivity();
    if (!serverOnline) {
      Alert.alert(
        'Server Offline',
        'Cannot connect to the server. Please check your internet connection and try again.',
        [
          { text: 'Retry', onPress: handleSubmit },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    setSaving(true);
    try {
      // Prepare updates - include all form fields
      const updates = {
        name: form.name.trim(),
        registration_number: form.registration_number || '',
        phone_number: form.phone_number || '',
        email: form.email || '',
        address: form.address.trim(),
        industry: selectedIndustry || '',
        business_type: selectedType?.id || '',
        tax_id: form.tax_id || '',
        website: form.website || '',
        description: form.description || '',
      };

      // Check if there are any changes
      const hasChanges = Object.keys(updates).some(key => {
        return updates[key] !== (business[key] || '');
      });

      if (!hasChanges) {
        Alert.alert('No Changes', 'No changes were made to the business details.');
        setSaving(false);
        return;
      }

      console.log('📝 Updating business with changes:', updates);
      
      const result = await updateBusiness(businessId, updates);
      
      if (result.success) {
        Alert.alert(
          'Success! ✅',
          'Business updated successfully! Changes will sync with the server.',
          [
            { 
              text: 'OK', 
              onPress: () => navigation.navigate('BusinessDetail', { businessId })
            }
          ]
        );
      } else {
        if (result.requiresOnline) {
          Alert.alert(
            'Offline Mode',
            result.error,
            [
              { text: 'Check Connection', onPress: () => checkNetworkStatus() },
              { text: 'OK', style: 'cancel' }
            ]
          );
        } else {
          Alert.alert('Error', result.error || 'Failed to update business');
        }
      }
    } catch (error) {
      console.error('Update business error:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.',
        [
          { text: 'Retry', onPress: handleSubmit },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBusiness = () => {
    Alert.alert(
      'Delete Business',
      'Are you sure you want to delete this business? This will also delete all associated shops and employees.\n\nYou must be online to delete a business.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Check Online & Delete', 
          style: 'destructive',
          onPress: async () => {
            // Check network before deleting
            const online = await checkNetworkStatus();
            if (!online) {
              Alert.alert(
                'Offline Mode',
                'You must be online to delete a business. Please check your connection and try again.',
                [
                  { text: 'Check Connection', onPress: () => checkNetworkStatus() },
                  { text: 'OK', style: 'cancel' }
                ]
              );
              return;
            }
            
            confirmDeleteBusiness();
          }
        }
      ]
    );
  };

  const confirmDeleteBusiness = async () => {
    try {
      setDeleting(true);
      const result = await deleteBusiness(businessId);
      
      if (result.success) {
        Alert.alert(
          'Success',
          'Business deleted successfully',
          [
            { 
              text: 'OK', 
              onPress: () => navigation.navigate('Businesses')
            }
          ]
        );
      } else {
        if (result.requiresOnline) {
          Alert.alert(
            'Offline Mode',
            result.error,
            [
              { text: 'Check Connection', onPress: () => checkNetworkStatus() },
              { text: 'OK', style: 'cancel' }
            ]
          );
        } else {
          Alert.alert('Error', result.error || 'Failed to delete business');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete business');
      console.error('Delete business error:', error);
    } finally {
      setDeleting(false);
    }
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
          <Text style={styles.loadingText}>Loading business details...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeaderWithButton
        title="Edit Business"
        leftButtonIcon="arrow-back"
        leftButtonAction={() => navigation.goBack()}
        rightButtonIcon={saving ? "hourglass-outline" : undefined}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Network Status Indicator */}
          <View style={styles.networkStatus}>
            <View style={[styles.networkDot, isOnline ? styles.onlineDot : styles.offlineDot]} />
            <Text style={styles.networkText}>
              {isOnline ? '✅ Online - Ready to update' : '❌ Offline - Connect to update'}
            </Text>
          </View>

          <View style={styles.form}>
            {/* Business Info */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Business Information</Text>
              
              <InputField
                label="Business Name *"
                value={form.name}
                onChangeText={(text) => handleChange('name', text)}
                placeholder="e.g., ABC Enterprises"
                icon="business-outline"
                required
                editable={isOnline}
              />

              <InputField
                label="Business Description"
                value={form.description}
                onChangeText={(text) => handleChange('description', text)}
                placeholder="Describe your business..."
                multiline
                numberOfLines={3}
                icon="document-text-outline"
                editable={isOnline}
              />

              <View style={styles.section}>
                <Text style={styles.sectionSubtitle}>Business Type</Text>
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
                        <Ionicons name={type.icon} size={24} color={type.color} />
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

              <View style={styles.section}>
                <Text style={styles.sectionSubtitle}>Industry</Text>
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
            </View>

            {/* Contact Information */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              
              <InputField
                label="Phone Number"
                value={form.phone_number}
                onChangeText={(text) => handleChange('phone_number', text)}
                placeholder="+254 712 345 678"
                keyboardType="phone-pad"
                icon="call-outline"
                editable={isOnline}
              />

              <InputField
                label="Email Address"
                value={form.email}
                onChangeText={(text) => handleChange('email', text)}
                placeholder="business@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                icon="mail-outline"
                editable={isOnline}
              />

              <InputField
                label="Website"
                value={form.website}
                onChangeText={(text) => handleChange('website', text)}
                placeholder="https://yourbusiness.com"
                keyboardType="url"
                autoCapitalize="none"
                icon="globe-outline"
                editable={isOnline}
              />

              <InputField
                label="Business Address *"
                value={form.address}
                onChangeText={(text) => handleChange('address', text)}
                placeholder="Street, City, Country"
                multiline
                numberOfLines={3}
                icon="location-outline"
                required
                editable={isOnline}
              />
            </View>

            {/* Legal Information */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Legal Information</Text>
              
              <InputField
                label="Registration Number"
                value={form.registration_number}
                onChangeText={(text) => handleChange('registration_number', text)}
                placeholder="e.g., CR123456"
                icon="document-text-outline"
                editable={isOnline}
              />

              <InputField
                label="Tax ID (KRA PIN)"
                value={form.tax_id}
                onChangeText={(text) => handleChange('tax_id', text)}
                placeholder="P123456789X"
                icon="card-outline"
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
                  (!isOnline || saving || deleting) && styles.saveButtonDisabled,
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
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={styles.buttonIcon} />
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Online Update Notice */}
            {!isOnline && (
              <View style={styles.offlineNotice}>
                <Ionicons name="cloud-offline-outline" size={20} color="#EF4444" />
                <Text style={styles.offlineNoticeText}>
                  You are offline. Business updates require internet connection.
                </Text>
              </View>
            )}

            {/* Stats */}
            {business && (
              <View style={styles.statsContainer}>
                <Text style={styles.statsTitle}>Business Stats</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Ionicons name="storefront-outline" size={20} color="#FF6B00" />
                    <Text style={styles.statValue}>{business.shop_count || 0}</Text>
                    <Text style={styles.statLabel}>Shops</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Ionicons name="people-outline" size={20} color="#2196F3" />
                    <Text style={styles.statValue}>{business.employee_count || 0}</Text>
                    <Text style={styles.statLabel}>Employees</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Ionicons name="calendar-outline" size={20} color="#4CAF50" />
                    <Text style={styles.statValue}>
                      {business.created_at ? new Date(business.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        year: 'numeric' 
                      }) : 'N/A'}
                    </Text>
                    <Text style={styles.statLabel}>Created</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Danger Zone */}
            <View style={styles.dangerZone}>
              <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
              <Text style={styles.dangerZoneText}>
                Deleting this business will permanently remove all associated shops and employees.
                This action cannot be undone and requires internet connection.
              </Text>
              
              <TouchableOpacity
                style={[
                  styles.deleteButton,
                  (!isOnline || deleting) && styles.deleteButtonDisabled,
                ]}
                onPress={handleDeleteBusiness}
                disabled={!isOnline || deleting}
                activeOpacity={0.8}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#dc3545" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={20} color="#dc3545" />
                    <Text style={styles.deleteButtonText}>Delete Business</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Help Text */}
            <View style={styles.helpContainer}>
              <Ionicons name="information-circle-outline" size={20} color="#6c757d" />
              <Text style={styles.helpText}>
                • Business updates require internet connection{"\n"}
                • Changes will sync with server automatically{"\n"}
                • You can view business offline after updates{"\n"}
                • Make sure you're online before saving changes
              </Text>
            </View>

            {/* Last Updated Info */}
            {business && business.updated_at && (
              <View style={styles.lastUpdated}>
                <Ionicons name="time-outline" size={14} color="#6c757d" />
                <Text style={styles.lastUpdatedText}>
                  Last updated: {new Date(business.updated_at).toLocaleString()}
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  networkStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 10,
    marginHorizontal: 16,
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
  form: {
    padding: 16,
  },
  formSection: {
    marginBottom: 32,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    fontWeight: '500',
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
  industryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  industryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    fontSize: 12,
    color: "#6B7280",
  },
  selectedIndustryText: {
    color: "#FF6B00",
    fontWeight: "600",
  },
  industryCheck: {
    marginLeft: 6,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  offlineNoticeText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#E53E3E',
    fontWeight: '500',
  },
  statsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
  },
  dangerZone: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F8D7DA',
  },
  dangerZoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#721C24',
    marginBottom: 8,
  },
  dangerZoneText: {
    fontSize: 14,
    color: '#721C24',
    lineHeight: 20,
    marginBottom: 16,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#dc3545',
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc3545',
    marginLeft: 8,
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B00',
  },
  helpText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
  },
  lastUpdated: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  lastUpdatedText: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 4,
  },
});