// src/screens/owner/CreateShopScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useShop } from '../../context/ShopContext';
import CustomHeaderWithButton from '../../components/CustomHeaderWithButton';
import InputField from '../../components/InputField';

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

export default function CreateShopScreen({ route, navigation }) {
  const { businessId, businessName } = route.params || {};
  const { createShop, isOnline, checkNetwork } = useShop();
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState('retail');

  // Form state exactly matching Django model
  const [form, setForm] = useState({
    business_id: businessId,
    name: '',
    shop_type: 'retail',
    location: '',
    phone_number: '',
    email: '',
    tax_rate: '16.0', // Default VAT for Kenya
    currency: 'KES',
  });

  useEffect(() => {
    if (!businessId) {
      Alert.alert('Error', 'Business ID is required');
      navigation.goBack();
    }
  }, [businessId]);

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const handleSelectType = (typeId) => {
    setSelectedType(typeId);
    handleChange('shop_type', typeId);
  };

  const validateForm = () => {
    const errors = [];
    
    if (!form.name.trim()) {
      errors.push('Shop name is required');
    }
    if (!form.location.trim()) {
      errors.push('Shop location is required');
    }

    if (errors.length > 0) {
      Alert.alert('Please check', errors.join('\n• '));
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    // Check network
    const online = await checkNetwork();
    if (!online) {
      Alert.alert(
        'Offline Mode',
        'You need to be online to create a shop. Shop creation requires an internet connection.',
        [
          { text: 'Check Connection', onPress: () => checkNetwork() },
          { text: 'OK', style: 'cancel' }
        ]
      );
      return;
    }

    setLoading(true);
    try {
      const shopData = {
        ...form,
        name: form.name.trim(),
        location: form.location.trim(),
        phone_number: form.phone_number || '',
        email: form.email || '',
        tax_rate: parseFloat(form.tax_rate) || 0.0,
        currency: form.currency || 'KES',
      };

      console.log('Creating shop with data:', shopData);
      
      // Use the ShopContext's createShop method
      const result = await createShop(shopData);
      
      if (result.success) {
        Alert.alert(
          '🎉 Shop Created!',
          `${form.name} has been successfully added to ${businessName}.`,
          [
            {
              text: 'Add Employees',
              onPress: () => navigation.navigate('AddEmployee', {
                businessId,
                shopId: result.shop.id,
                shopName: form.name,
              })
            },
            {
              text: 'View Shop',
              onPress: () => navigation.navigate('ShopDetail', {
                shopId: result.shop.id,
                shopName: form.name,
                businessId,
              }),
              style: 'cancel'
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to create shop');
      }
    } catch (error) {
      console.error('Create shop error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedType = () => {
    return SHOP_TYPES.find(type => type.id === selectedType) || SHOP_TYPES[0];
  };

  return (
    <View style={styles.container}>
      <CustomHeaderWithButton
        title="New Shop"
        leftButtonIcon="arrow-back"
        leftButtonAction={() => navigation.goBack()}
        rightButtonIcon={loading ? 'hourglass-outline' : undefined}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Network Status */}
          <View style={styles.networkStatus}>
            <View style={[styles.networkDot, isOnline ? styles.onlineDot : styles.offlineDot]} />
            <Text style={styles.networkText}>
              {isOnline ? '✅ Online - Ready to create shop' : '❌ Offline - Connect to create shop'}
            </Text>
          </View>

          {/* Shop Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shop Type</Text>
            <Text style={styles.sectionSubtitle}>Select the type of shop you're creating</Text>
            
            <View style={styles.typeGrid}>
              {SHOP_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeCard,
                    selectedType === type.id && styles.selectedTypeCard,
                    { borderColor: type.color }
                  ]}
                  onPress={() => handleSelectType(type.id)}
                  activeOpacity={0.7}
                  disabled={!isOnline}
                >
                  <View style={[styles.typeIcon, { backgroundColor: `${type.color}15` }]}>
                    <Ionicons name={type.icon} size={24} color={type.color} />
                  </View>
                  <Text style={styles.typeLabel}>{type.label}</Text>
                  {selectedType === type.id && (
                    <View style={[styles.typeCheck, { backgroundColor: type.color }]}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Shop Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shop Information</Text>
            
            <InputField
              label="Shop Name *"
              value={form.name}
              onChangeText={(text) => handleChange('name', text)}
              placeholder="e.g., Downtown Supermarket"
              icon="storefront-outline"
              autoFocus
              required
              editable={isOnline}
            />
            
            <InputField
              label="Location *"
              value={form.location}
              onChangeText={(text) => handleChange('location', text)}
              placeholder="Street, Building, City"
              icon="location-outline"
              required
              editable={isOnline}
            />
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
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
              placeholder="shop@business.com"
              keyboardType="email-address"
              autoCapitalize="none"
              icon="mail-outline"
              editable={isOnline}
            />
          </View>

          {/* Financial Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Financial Settings</Text>
            
            <InputField
              label="Tax Rate (%)"
              value={form.tax_rate}
              onChangeText={(text) => handleChange('tax_rate', text)}
              placeholder="16.0"
              keyboardType="numeric"
              icon="percent-outline"
              suffix="%"
              editable={isOnline}
            />
          </View>

          {/* Help Card */}
          <View style={styles.helpCard}>
            <Ionicons name="information-circle" size={24} color="#3B82F6" />
            <View style={styles.helpContent}>
              <Text style={styles.helpTitle}>Important Notes</Text>
              <Text style={styles.helpText}>
                • Required fields are marked with *{"\n"}
                • You can edit shop details later{"\n"}
                • Shop creation requires internet connection{"\n"}
                • Add employees after creating the shop
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed Action Bar */}
      <View style={styles.actionBar}>
        <View style={styles.stepInfo}>
          <Text style={styles.stepText}>Adding to: {businessName}</Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Ionicons name="arrow-back" size={20} color="#6B7280" />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.createButton,
              (!isOnline || loading) && styles.createButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!isOnline || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <Ionicons name="refresh" size={24} color="#fff" style={styles.loadingIcon} />
            ) : !isOnline ? (
              <>
                <Ionicons name="cloud-offline-outline" size={20} color="#fff" />
                <Text style={styles.createButtonText}>Offline</Text>
              </>
            ) : (
              <>
                <Text style={styles.createButtonText}>Create Shop</Text>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
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
    backgroundColor: '#f8fafc',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
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
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  typeCard: {
    width: '48%',
    margin: 6,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    position: 'relative',
  },
  selectedTypeCard: {
    backgroundColor: '#FFF7F0',
    borderStyle: 'solid',
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  typeCheck: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  helpCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    marginTop: 0,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'flex-start',
  },
  helpContent: {
    flex: 1,
    marginLeft: 12,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  helpText: {
    fontSize: 14,
    color: '#3B82F6',
    lineHeight: 20,
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
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  stepInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  stepText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
    marginLeft: 8,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B00',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#9CA3AF',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
  loadingIcon: {
    marginHorizontal: 8,
  },
});