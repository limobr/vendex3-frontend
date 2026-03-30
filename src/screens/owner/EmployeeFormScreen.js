import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomHeaderWithButton from '../../components/CustomHeaderWithButton';
import InputField from '../../components/InputField';
import { employeeAPI, shopAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import databaseService from '../../database';

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

export default function EmployeeFormScreen({ route, navigation }) {
  const { shopId, businessId: businessIdParam, shopName, employeeId } = route.params || {};
  const { user, isOnline, checkServerConnectivity } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [localShops, setLocalShops] = useState([]);
  
  // Determine if we are editing an existing employee
  const isEditing = !!employeeId;
  
  // State for phone input with country code
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showCountryModal, setShowCountryModal] = useState(false);
  
  // New state for edit mode data loading
  const [employeeLoaded, setEmployeeLoaded] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    role_id: '',
    shop_id: shopId || '',
    employment_type: 'full_time',
    salary: '',
    send_credentials: true,
  });

  // Load employee data when editing
  useEffect(() => {
    if (isEditing && employeeId && !employeeLoaded) {
      loadEmployeeData();
    }
  }, [employeeId, isEditing, employeeLoaded]);

  // Set selected role after roles are loaded
  useEffect(() => {
    if (selectedRoleId && roles.length > 0) {
      const role = roles.find(r => r.id === selectedRoleId);
      if (role) setSelectedRole(role);
    }
  }, [selectedRoleId, roles]);

  // Update phone number when country or phone input changes
  useEffect(() => {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    setForm(prev => ({ ...prev, phone_number: formattedPhone }));
  }, [selectedCountry, phoneNumber]);

  const formatPhoneNumber = (number) => {
    if (!number) return '';
    const digits = number.replace(/\D/g, '');
    const cleanDigits = digits.replace(/^0+/, '');
    const countryCode = selectedCountry.code.replace('+', '');
    return `+${countryCode}${cleanDigits}`;
  };

  const handlePhoneNumberChange = (text) => {
    const digits = text.replace(/\D/g, '');
    setPhoneNumber(digits);
  };

  const initializeData = async () => {
    try {
      await fetchRoles();
      if (!shopId) {
        await fetchShops();
      }
    } catch (error) {
      console.error('❌ Error initializing data:', error);
    }
  };

  const fetchRoles = async () => {
    try {
      const localRoles = await databaseService.RoleService.getRoles();
      if (localRoles && localRoles.length > 0) {
        setRoles(localRoles);
      }
      const online = await checkServerConnectivity();
      if (online) {
        const response = await employeeAPI.getRoles();
        if (response.success) {
          for (const role of response.roles) {
            await databaseService.RoleService.saveRole({
              id: role.id,
              name: role.name,
              role_type: role.role_type,
              description: role.description || '',
              is_default: role.is_default || false,
              created_at: new Date().toISOString(),
            });
          }
          const updatedRoles = await databaseService.RoleService.getRoles();
          setRoles(updatedRoles);
        }
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const fetchShops = async () => {
    if (!businessIdParam) return;
    try {
      const businessShops = await databaseService.ShopService.getShopsByBusiness(businessIdParam);
      if (businessShops && businessShops.length > 0) {
        setLocalShops(businessShops);
        if (businessShops.length === 1 && !shopId) {
          setForm(prev => ({ ...prev, shop_id: businessShops[0].id }));
        }
      }
      const online = await checkServerConnectivity();
      if (online) {
        const business = await databaseService.BusinessService.getBusinessById(businessIdParam);
        if (business && business.server_id) {
          const response = await shopAPI.getShops(business.server_id);
          if (response.success) {
            for (const serverShop of response.shops) {
              const localShop = {
                id: serverShop.id,
                server_id: serverShop.id,
                business_id: businessIdParam,
                name: serverShop.name,
                shop_type: serverShop.shop_type,
                location: serverShop.location,
                phone_number: serverShop.phone_number || '',
                email: serverShop.email || '',
                tax_rate: parseFloat(serverShop.tax_rate) || 0.0,
                currency: serverShop.currency || 'KES',
                is_active: serverShop.is_active !== false ? 1 : 0,
                created_at: serverShop.created_at || new Date().toISOString(),
                updated_at: serverShop.updated_at || new Date().toISOString(),
                sync_status: 'synced',
                is_dirty: 0,
              };
              await databaseService.ShopService.createOrUpdateShop(localShop);
            }
            const updatedShops = await databaseService.ShopService.getShopsByBusiness(businessIdParam);
            setLocalShops(updatedShops);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching shops:', error);
    }
  };

  const loadEmployeeData = async () => {
    try {
      const employee = await databaseService.EmployeeService.getEmployeeById(employeeId);
      if (!employee) {
        Alert.alert('Error', 'Employee not found');
        navigation.goBack();
        return;
      }

      // Pre-fill form
      setForm({
        first_name: employee.first_name || '',
        last_name: employee.last_name || '',
        email: employee.email || '',
        phone_number: employee.phone_number || '',
        role_id: employee.role_id || '',
        shop_id: employee.shop_id || (shopId ? shopId : (localShops[0]?.id || '')),
        employment_type: employee.employment_type || 'full_time',
        salary: employee.salary ? employee.salary.toString() : '',
        send_credentials: false,
      });

      // Store the role_id to set selected role later
      if (employee.role_id) setSelectedRoleId(employee.role_id);

      // Parse phone number to determine country code
      if (employee.phone_number) {
        const matchedCountry = COUNTRIES.find(c => employee.phone_number.startsWith(c.code));
        if (matchedCountry) {
          setSelectedCountry(matchedCountry);
          const localNumber = employee.phone_number.slice(matchedCountry.code.length);
          setPhoneNumber(localNumber);
        } else {
          setPhoneNumber(employee.phone_number);
        }
      }

      setEmployeeLoaded(true);
    } catch (error) {
      console.error('Error loading employee data:', error);
      Alert.alert('Error', 'Failed to load employee data');
    }
  };

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
    if (field === 'role_id') {
      const role = roles.find(r => r.id === value);
      setSelectedRole(role);
    }
  };

  const validateForm = () => {
    if (!form.first_name.trim()) {
      Alert.alert('Required', 'Please enter first name');
      return false;
    }
    if (!form.last_name.trim()) {
      Alert.alert('Required', 'Please enter last name');
      return false;
    }
    if (!form.email.trim()) {
      Alert.alert('Required', 'Please enter email address');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return false;
    }
    if (!form.role_id) {
      Alert.alert('Required', 'Please select a role for the employee');
      return false;
    }
    if (!form.shop_id) {
      Alert.alert('Required', 'Please select a shop for the employee');
      return false;
    }
    return true;
  };

  const saveEmployeeLocally = async (employeeData, update = false) => {
    try {
      const shop = await databaseService.ShopService.getShopById(form.shop_id);
      if (!shop) throw new Error('Shop not found');

      let businessId = shop.business_id;
      if (!businessId && shop.business_server_id) {
        const business = await databaseService.BusinessService.getBusinessByServerId(shop.business_server_id);
        if (business) businessId = business.id;
      }
      if (!businessId && businessIdParam) businessId = businessIdParam;
      if (!businessId) throw new Error('Could not determine business ID');

      const employeePayload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone_number: form.phone_number || '',
        role_id: form.role_id,
        shop_id: form.shop_id,
        business_id: businessId,
        employment_type: form.employment_type,
        salary: form.salary ? parseFloat(form.salary) : null,
        is_active: 1,
      };

      if (update) {
        // Update existing employee
        const result = await databaseService.EmployeeService.updateEmployee(employeeId, employeePayload);
        if (result.success) {
          return { success: true, id: employeeId, message: 'Employee updated locally' };
        } else {
          throw new Error(result.error || 'Failed to update employee locally');
        }
      } else {
        // Create new employee
        const localEmployeeData = {
          id: employeeData.id || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          server_id: employeeData.id || null,
          user_id: employeeData.user?.id || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...employeePayload,
          sync_status: employeeData.id ? 'synced' : 'pending',
          is_dirty: employeeData.id ? 0 : 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const result = await databaseService.EmployeeService.createEmployee(localEmployeeData);
        if (result.success) {
          return { success: true, id: result.id, message: 'Employee saved locally' };
        } else {
          throw new Error(result.error || 'Failed to save employee locally');
        }
      }
    } catch (error) {
      console.error('Error saving employee locally:', error);
      return { success: false, error: error.message };
    }
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const online = await checkServerConnectivity();
      if (online) {
        const serverData = {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim().toLowerCase(),
          phone_number: form.phone_number,
          role_id: form.role_id,
          shop_id: form.shop_id,
          employment_type: form.employment_type,
          salary: form.salary ? parseFloat(form.salary) : null,
          send_credentials: form.send_credentials,
        };
        const response = await employeeAPI.createEmployee(serverData);
        if (response.success) {
          await saveEmployeeLocally(response.employee, false);
          Alert.alert(
            'Success',
            response.message,
            [
              {
                text: 'Add Another',
                onPress: () => {
                  setForm({
                    ...form,
                    first_name: '',
                    last_name: '',
                    email: '',
                    phone_number: '',
                    salary: '',
                    send_credentials: true,
                  });
                  setPhoneNumber('');
                }
              },
              {
                text: 'View Employees',
                onPress: () => {
                  if (shopId) {
                    navigation.navigate('ShopDetail', { shopId, shopName });
                  } else {
                    navigation.navigate('BusinessDetail', { businessId: businessIdParam });
                  }
                },
                style: 'cancel'
              }
            ]
          );
        } else {
          throw new Error(response.error || 'Server request failed');
        }
      } else {
        // Offline mode
        Alert.alert(
          'Offline Mode',
          'Employee will be saved locally and synced when online.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Save Locally',
              onPress: async () => {
                const localSave = await saveEmployeeLocally({}, false);
                if (localSave.success) {
                  Alert.alert('Saved Locally', 'Employee saved for offline use', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                  ]);
                } else {
                  Alert.alert('Error', localSave.error);
                }
              }
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to add employee');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const online = await checkServerConnectivity();
      const updateData = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone_number: form.phone_number,
        role_id: form.role_id,
        shop_id: form.shop_id,
        employment_type: form.employment_type,
        salary: form.salary ? parseFloat(form.salary) : null,
      };
      if (online) {
        // Update on server
        const response = await employeeAPI.updateEmployee(employeeId, updateData);
        if (response.success) {
          // Update locally
          const localResult = await saveEmployeeLocally(null, true);
          if (localResult.success) {
            Alert.alert('Success', 'Employee updated successfully', [
              { text: 'OK', onPress: () => navigation.goBack() }
            ]);
          } else {
            Alert.alert('Partial Success', 'Server updated but local save failed');
          }
        } else {
          throw new Error(response.error || 'Server update failed');
        }
      } else {
        // Offline: update locally with dirty flag
        const localResult = await saveEmployeeLocally(null, true);
        if (localResult.success) {
          Alert.alert('Saved Locally', 'Changes will sync when online', [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]);
        } else {
          Alert.alert('Error', localResult.error);
        }
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update employee');
    } finally {
      setLoading(false);
    }
  };

  const renderRoleSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Select Role *</Text>
      <Text style={styles.sectionDescription}>
        Choose the role for this employee
      </Text>
      {roles.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people" size={48} color="#CBD5E1" />
          <Text style={styles.emptyStateText}>Loading roles...</Text>
        </View>
      ) : (
        <View style={styles.roleGrid}>
          {roles.map(role => (
            <TouchableOpacity
              key={role.id}
              style={[styles.roleCard, form.role_id === role.id && styles.selectedRoleCard]}
              onPress={() => handleChange('role_id', role.id)}
            >
              <View style={[styles.roleIcon, { backgroundColor: getRoleColor(role.role_type) }]}>
                <Ionicons name={getRoleIcon(role.role_type)} size={24} color="#fff" />
              </View>
              <Text style={styles.roleName}>{role.name}</Text>
              <Text style={styles.roleType}>
                {role.role_type ? role.role_type.replace('_', ' ').toUpperCase() : 'ROLE'}
              </Text>
              {form.role_id === role.id && (
                <View style={styles.selectedBadge}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const getRoleIcon = (roleType) => {
    if (!roleType) return 'person';
    switch (roleType) {
      case 'owner': return 'shield-checkmark';
      case 'manager': return 'shield';
      case 'cashier': return 'cash';
      case 'stock_keeper': return 'cube';
      case 'attendant': return 'people';
      default: return 'person';
    }
  };

  const getRoleColor = (roleType) => {
    if (!roleType) return '#607D8B';
    switch (roleType) {
      case 'owner': return '#FF6B00';
      case 'manager': return '#2196F3';
      case 'cashier': return '#4CAF50';
      case 'stock_keeper': return '#9C27B0';
      case 'attendant': return '#FF9800';
      default: return '#607D8B';
    }
  };

  const renderCountryModal = () => (
    <Modal visible={showCountryModal} transparent animationType="slide" onRequestClose={() => setShowCountryModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Country</Text>
            <TouchableOpacity onPress={() => setShowCountryModal(false)} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={COUNTRIES}
            keyExtractor={item => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.countryItem, selectedCountry.code === item.code && styles.selectedCountryItem]}
                onPress={() => {
                  setSelectedCountry(item);
                  setShowCountryModal(false);
                }}
              >
                <Text style={styles.countryFlag}>{item.flag}</Text>
                <View style={styles.countryInfo}>
                  <Text style={styles.countryName}>{item.name}</Text>
                  <Text style={styles.countryCode}>{item.code}</Text>
                </View>
                {selectedCountry.code === item.code && <Ionicons name="checkmark" size={20} color="#FF6B00" />}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </View>
    </Modal>
  );

  const handleSubmit = isEditing ? handleUpdate : handleCreate;

  useEffect(() => {
    initializeData();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeaderWithButton
        title={isEditing ? 'Edit Employee' : 'Add Employee'}
        leftButtonIcon="arrow-back"
        leftButtonAction={() => navigation.goBack()}
      />
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {!isOnline && !isEditing && (
            <View style={styles.offlineBanner}>
              <Ionicons name="cloud-offline" size={20} color="#F59E0B" />
              <Text style={styles.offlineText}>You are offline. Employee will be saved locally.</Text>
            </View>
          )}

          {/* Shop Selection (only when shopId not provided and not editing) */}
          {!shopId && !isEditing && localShops.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Shop *</Text>
              <View style={styles.shopSelector}>
                {localShops.map(shop => (
                  <TouchableOpacity
                    key={shop.id}
                    style={[styles.shopOption, form.shop_id === shop.id && styles.selectedShopOption]}
                    onPress={() => handleChange('shop_id', shop.id)}
                  >
                    <Ionicons name="storefront" size={20} color={form.shop_id === shop.id ? '#FF6B00' : '#6B7280'} />
                    <Text style={[styles.shopOptionText, form.shop_id === shop.id && styles.selectedShopOptionText]}>
                      {shop.name}
                    </Text>
                    {form.shop_id === shop.id && <Ionicons name="checkmark-circle" size={20} color="#FF6B00" />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            <View style={styles.dualInput}>
              <View style={styles.inputHalf}>
                <InputField
                  label="First Name *"
                  value={form.first_name}
                  onChangeText={text => handleChange('first_name', text)}
                  placeholder="John"
                  icon="person-outline"
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.inputHalf}>
                <InputField
                  label="Last Name *"
                  value={form.last_name}
                  onChangeText={text => handleChange('last_name', text)}
                  placeholder="Kamau"
                  icon="person-outline"
                  autoCapitalize="words"
                />
              </View>
            </View>
            <InputField
              label="Email Address *"
              value={form.email}
              onChangeText={text => handleChange('email', text)}
              placeholder="john@example.com"
              icon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <View style={styles.phoneInputContainer}>
              <Text style={styles.phoneLabel}>Phone Number</Text>
              <View style={styles.phoneInputWrapper}>
                <TouchableOpacity style={styles.countryCodeButton} onPress={() => setShowCountryModal(true)}>
                  <Text style={styles.countryFlagText}>{selectedCountry.flag}</Text>
                  <Text style={styles.countryCodeText}>{selectedCountry.code}</Text>
                  <Ionicons name="chevron-down" size={16} color="#6B7280" />
                </TouchableOpacity>
                <TextInput
                  style={styles.phoneNumberInput}
                  value={phoneNumber}
                  onChangeText={handlePhoneNumberChange}
                  placeholder="712 345 678"
                  keyboardType="phone-pad"
                  maxLength={12}
                />
              </View>
              <Text style={styles.phoneHelperText}>Will be submitted as: {form.phone_number || 'Not set'}</Text>
            </View>
          </View>

          {renderRoleSelector()}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Employment Details</Text>
            <View style={styles.employmentTypeContainer}>
              <Text style={styles.employmentTypeLabel}>Employment Type</Text>
              <View style={styles.employmentTypeOptions}>
                {['full_time', 'part_time', 'contract'].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.employmentTypeOption, form.employment_type === type && styles.selectedEmploymentTypeOption]}
                    onPress={() => handleChange('employment_type', type)}
                  >
                    <Text style={[styles.employmentTypeOptionText, form.employment_type === type && styles.selectedEmploymentTypeOptionText]}>
                      {type.replace('_', ' ').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <InputField
              label="Salary (Optional)"
              value={form.salary}
              onChangeText={text => handleChange('salary', text)}
              placeholder="KES 35,000"
              icon="cash-outline"
              keyboardType="numeric"
            />
          </View>

          {/* Email Notification - only for create mode */}
          {!isEditing && isOnline && (
            <View style={styles.notificationCard}>
              <View style={styles.notificationHeader}>
                <Ionicons name="mail" size={24} color="#FF6B00" />
                <Text style={styles.notificationTitle}>Email Notification</Text>
              </View>
              <Text style={styles.notificationText}>
                Login credentials will be sent to the employee's email address.
              </Text>
              <TouchableOpacity
                style={styles.notificationToggle}
                onPress={() => handleChange('send_credentials', !form.send_credentials)}
              >
                <Text style={styles.notificationToggleText}>
                  {form.send_credentials ? '✓' : ''} Send login credentials via email
                </Text>
                <View style={[styles.toggleSwitch, form.send_credentials && styles.toggleSwitchActive]}>
                  <View style={[styles.toggleCircle, form.send_credentials && styles.toggleCircleActive]} />
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Employee Preview */}
          {(form.first_name || form.last_name || form.email) && (
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>Employee Preview</Text>
              <View style={styles.previewContent}>
                <View style={styles.previewAvatar}>
                  <Text style={styles.avatarText}>
                    {form.first_name?.[0] || form.email?.[0] || 'E'}
                  </Text>
                </View>
                <View style={styles.previewInfo}>
                  <Text style={styles.previewName}>{form.first_name} {form.last_name}</Text>
                  <Text style={styles.previewEmail}>{form.email}</Text>
                  {selectedRole && (
                    <Text style={styles.previewRole}>
                      {selectedRole.name} • {form.employment_type.replace('_', ' ')}
                    </Text>
                  )}
                  {form.phone_number && (
                    <Text style={styles.previewPhone}>
                      <Ionicons name="call-outline" size={12} color="#6B7280" /> {form.phone_number}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}

          <View style={styles.helpCard}>
            <Ionicons name="information-circle" size={24} color="#3B82F6" />
            <View style={styles.helpContent}>
              <Text style={styles.helpTitle}>Important Information</Text>
              <Text style={styles.helpText}>
                {isEditing
                  ? '• Changes will be saved and synced when online\n• Employee will be notified via email if credentials are resent'
                  : (isOnline
                    ? '• Employee will receive an email with temporary login credentials\n• They must download the app to login'
                    : '• You are offline – employee will be saved locally\n• They will be created on server when you go online')}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading || (!form.shop_id && !shopId) || roles.length === 0}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name={isEditing ? "save-outline" : "person-add"} size={20} color="#fff" />
              <Text style={styles.submitButtonText}>
                {isEditing ? 'Save Changes' : (isOnline ? 'Add Employee' : 'Save Locally')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {renderCountryModal()}
    </SafeAreaView>
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FBBF24',
  },
  offlineText: {
    marginLeft: 8,
    color: '#92400E',
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
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
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  retryButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
    marginLeft: 8,
  },
  dualInput: {
    flexDirection: 'row',
    marginHorizontal: -6,
    marginBottom: 16,
  },
  inputHalf: {
    flex: 1,
    marginHorizontal: 6,
  },
  // Phone Input Styles
  phoneInputContainer: {
    marginBottom: 16,
  },
  phoneLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  countryCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#f3f4f6',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  countryFlagText: {
    fontSize: 18,
    marginRight: 8,
  },
  countryCodeText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
    marginRight: 8,
  },
  phoneNumberInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  phoneHelperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  // Country Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalCloseButton: {
    padding: 4,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  selectedCountryItem: {
    backgroundColor: '#FFF7F0',
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  countryCode: {
    fontSize: 14,
    color: '#6B7280',
  },
  separator: {
    height: 1,
    backgroundColor: '#f3f4f6',
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  roleCard: {
    width: '48%',
    margin: 6,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  selectedRoleCard: {
    backgroundColor: '#FFF7F0',
    borderColor: '#FF6B00',
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  roleName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  roleType: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  shopSelector: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 8,
  },
  shopOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  selectedShopOption: {
    backgroundColor: '#FFF7F0',
  },
  shopOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 12,
  },
  selectedShopOptionText: {
    color: '#FF6B00',
    fontWeight: '600',
  },
  employmentTypeContainer: {
    marginBottom: 20,
  },
  employmentTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  employmentTypeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  employmentTypeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  selectedEmploymentTypeOption: {
    backgroundColor: '#FFF7F0',
    borderColor: '#FF6B00',
  },
  employmentTypeOptionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectedEmploymentTypeOptionText: {
    color: '#FF6B00',
    fontWeight: '600',
  },
  notificationCard: {
    backgroundColor: '#FFF7F0',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFD7B5',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B00',
    marginLeft: 8,
  },
  notificationText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  notificationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#FFD7B5',
  },
  notificationToggleText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  toggleSwitch: {
    width: 52,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: '#FF6B00',
  },
  toggleCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
  },
  toggleCircleActive: {
    transform: [{ translateX: 20 }],
  },
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  previewEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  previewRole: {
    fontSize: 12,
    color: '#FF6B00',
    fontWeight: '600',
    marginBottom: 4,
  },
  previewPhone: {
    fontSize: 12,
    color: '#6B7280',
  },
  helpCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#FF6B00',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
});