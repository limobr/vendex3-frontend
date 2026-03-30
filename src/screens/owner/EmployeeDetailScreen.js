// src/screens/owner/EmployeeDetailScreen.js
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
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomHeaderWithButton from '../../components/CustomHeaderWithButton';
import Button from '../../components/Button';
import PermissionBadge from '../../components/PermissionBadge';
import { EmployeeService } from '../../database';

// (Optional) Keep permission list for display only (no editing)
const PERMISSIONS = [
  // Sales Permissions
  { id: 'sales.view', label: 'View Sales', category: 'sales' },
  { id: 'sales.create', label: 'Create Sales', category: 'sales' },
  { id: 'sales.edit', label: 'Edit Sales', category: 'sales' },
  { id: 'sales.refund', label: 'Process Refunds', category: 'sales' },
  
  // Product Permissions
  { id: 'products.view', label: 'View Products', category: 'products' },
  { id: 'products.edit', label: 'Edit Products', category: 'products' },
  { id: 'products.create', label: 'Create Products', category: 'products' },
  { id: 'products.delete', label: 'Delete Products', category: 'products' },
  
  // Inventory Permissions
  { id: 'inventory.view', label: 'View Inventory', category: 'inventory' },
  { id: 'inventory.edit', label: 'Edit Inventory', category: 'inventory' },
  { id: 'inventory.adjust', label: 'Adjust Stock', category: 'inventory' },
  
  // Customer Permissions
  { id: 'customers.view', label: 'View Customers', category: 'customers' },
  { id: 'customers.edit', label: 'Edit Customers', category: 'customers' },
  { id: 'customers.create', label: 'Create Customers', category: 'customers' },
  
  // Reports Permissions
  { id: 'reports.view', label: 'View Reports', category: 'reports' },
  { id: 'reports.export', label: 'Export Reports', category: 'reports' },
  
  // Employee Permissions
  { id: 'employees.view', label: 'View Employees', category: 'employees' },
  
  // Shop Settings Permissions
  { id: 'settings.view', label: 'View Settings', category: 'settings' },
  { id: 'settings.edit', label: 'Edit Settings', category: 'settings' },
];

export default function EmployeeDetailScreen({ route, navigation }) {
  const { employeeId, shopId } = route.params;
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEmployeeData();

    const unsubscribe = navigation.addListener('focus', () => {
      loadEmployeeData();
    });

    return unsubscribe;
  }, [employeeId, navigation]);

  const loadEmployeeData = async () => {
    try {
      setLoading(true);
      const data = await EmployeeService.getEmployeeById(employeeId);
      if (!data) {
        Alert.alert('Error', 'Employee not found');
        navigation.goBack();
        return;
      }
      setEmployee(data);
    } catch (error) {
      console.error('Error loading employee data:', error);
      Alert.alert('Error', 'Failed to load employee details');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateEmployee = async () => {
    if (!employee) return;

    Alert.alert(
      employee.is_active ? 'Deactivate Employee' : 'Activate Employee',
      employee.is_active
        ? 'This will prevent the employee from accessing the shop.'
        : 'This will allow the employee to access the shop.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: employee.is_active ? 'Deactivate' : 'Activate',
          style: employee.is_active ? 'destructive' : 'default',
          onPress: async () => {
            try {
              setSaving(true);
              const result = await EmployeeService.updateEmployee(employee.id, {
                is_active: employee.is_active ? 0 : 1,
              });
              if (result.success) {
                setEmployee((prev) => ({ ...prev, is_active: !prev.is_active }));
                Alert.alert('Success', employee.is_active ? 'Employee deactivated' : 'Employee activated');
              } else {
                Alert.alert('Error', result.error || 'Failed to update employee status');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to update employee status');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteEmployee = () => {
    if (!employee) return;

    Alert.alert(
      'Remove Employee',
      `Are you sure you want to remove ${employee.first_name} ${employee.last_name} from this shop?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              const result = await EmployeeService.deleteEmployee(employee.id);
              if (result.success) {
                Alert.alert('Success', 'Employee removed successfully');
                navigation.goBack();
              } else {
                Alert.alert('Error', result.error || 'Failed to remove employee');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to remove employee');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const handleResendInvite = () => {
    Alert.alert('Resend Invite', 'This will send a new invitation email to the employee.');
    // Implement if needed
  };

  const handleResetPassword = () => {
    Alert.alert('Reset Password', 'This will send a password reset link to the employee.');
    // Implement if needed
  };

  const handleViewPerformance = () => {
    Alert.alert('Performance', 'Performance tracking coming soon.');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B00" />
        <Text style={styles.loadingText}>Loading employee details...</Text>
      </SafeAreaView>
    );
  }

  if (!employee) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomHeaderWithButton
          title="Employee Not Found"
          leftButtonIcon="arrow-back"
          leftButtonAction={() => navigation.goBack()}
        />
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={64} color="#adb5bd" />
          <Text style={styles.emptyStateTitle}>Employee Not Found</Text>
          <Text style={styles.emptyStateText}>
            The employee you're looking for doesn't exist or has been removed.
          </Text>
          <Button
            title="Go Back"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  const fullName = `${employee.first_name} ${employee.last_name}`;
  const roleName = employee.role_name || employee.role_type || 'Employee';
  const employmentDate = employee.employment_date
    ? new Date(employee.employment_date).toLocaleDateString()
    : 'N/A';

  // Permissions are not stored per employee in the current schema, so we show only labels
  const getCategoryPermissions = (category) => {
    return PERMISSIONS.filter((p) => p.category === category);
  };

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeaderWithButton
        title={fullName}
        subtitle={`@${employee.username || employee.email?.split('@')[0] || 'user'} • ${roleName}`}
        leftButtonIcon="arrow-back"
        leftButtonAction={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Employee Info Card */}
        <View style={styles.employeeInfoCard}>
          <View style={styles.employeeHeader}>
            <View style={styles.avatarContainer}>
              <View style={[styles.avatar, { backgroundColor: '#FF6B00' }]}>
                <Text style={styles.avatarText}>
                  {employee.first_name?.[0] || employee.email?.[0] || 'E'}
                  {employee.last_name?.[0] || ''}
                </Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: employee.is_active ? '#D4EDDA' : '#F8D7DA' },
                ]}
              >
                <Ionicons
                  name={employee.is_active ? 'checkmark-circle' : 'close-circle'}
                  size={12}
                  color={employee.is_active ? '#155724' : '#721C24'}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: employee.is_active ? '#155724' : '#721C24' },
                  ]}
                >
                  {employee.is_active ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>

            <View style={styles.employeeDetails}>
              <Text style={styles.employeeName}>{fullName}</Text>
              <Text style={styles.employeeUsername}>@{employee.username || employee.email?.split('@')[0]}</Text>

              <View style={styles.roleBadge}>
                <Ionicons name="person-outline" size={14} color="#FF6B00" />
                <Text style={styles.roleText}>{roleName}</Text>
              </View>
            </View>
          </View>

          <View style={styles.contactInfo}>
            {employee.email && (
              <View style={styles.contactRow}>
                <Ionicons name="mail-outline" size={16} color="#6c757d" />
                <Text style={styles.contactText}>{employee.email}</Text>
              </View>
            )}

            {employee.phone_number && (
              <View style={styles.contactRow}>
                <Ionicons name="call-outline" size={16} color="#6c757d" />
                <Text style={styles.contactText}>{employee.phone_number}</Text>
              </View>
            )}

            <View style={styles.contactRow}>
              <Ionicons name="calendar-outline" size={16} color="#6c757d" />
              <Text style={styles.contactText}>Joined {employmentDate}</Text>
            </View>

            {employee.shop_name && (
              <View style={styles.contactRow}>
                <Ionicons name="storefront-outline" size={16} color="#6c757d" />
                <Text style={styles.contactText}>Shop: {employee.shop_name}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Permissions Section (read-only for now) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions</Text>
          <Text style={styles.sectionDescription}>
            Permissions are based on the employee's role. Role-based permissions will be available in a future update.
          </Text>

          {/* Permission Categories */}
          {['sales', 'products', 'inventory', 'customers', 'reports', 'employees', 'settings'].map(
            (category) => {
              const categoryPermissions = getCategoryPermissions(category);
              const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);

              return (
                <View key={category} style={styles.permissionCategory}>
                  <Text style={styles.categoryTitle}>{categoryLabel}</Text>
                  <View style={styles.permissionsGrid}>
                    {categoryPermissions.map((permission) => (
                      <PermissionBadge
                        key={permission.id}
                        permission={permission}
                        isActive={false} // Not editable, always inactive
                        isEditable={false}
                        onToggle={() => {}}
                      />
                    ))}
                  </View>
                </View>
              );
            }
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickAction} onPress={handleResendInvite}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="mail-outline" size={24} color="#2196F3" />
              </View>
              <Text style={styles.quickActionText}>Resend Invite</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAction} onPress={handleActivateEmployee}>
              <View
                style={[
                  styles.quickActionIcon,
                  { backgroundColor: employee.is_active ? '#FFF3E0' : '#E8F5E9' },
                ]}
              >
                <Ionicons
                  name={employee.is_active ? 'pause-circle-outline' : 'play-circle-outline'}
                  size={24}
                  color={employee.is_active ? '#FF9800' : '#4CAF50'}
                />
              </View>
              <Text style={styles.quickActionText}>
                {employee.is_active ? 'Deactivate' : 'Activate'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAction} onPress={handleResetPassword}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#F3E5F5' }]}>
                <Ionicons name="shield-outline" size={24} color="#9C27B0" />
              </View>
              <Text style={styles.quickActionText}>Reset Password</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAction} onPress={handleViewPerformance}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="stats-chart-outline" size={24} color="#4CAF50" />
              </View>
              <Text style={styles.quickActionText}>View Performance</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#dc3545' }]}>Danger Zone</Text>

          <View style={styles.dangerZone}>
            <Button
              title="Remove from Shop"
              type="outline"
              color="#dc3545"
              icon="person-remove-outline"
              onPress={handleDeleteEmployee}
              loading={saving}
              style={styles.dangerButton}
            />

            <Text style={styles.dangerText}>
              Removing will revoke all access to this shop. The employee can be added back anytime.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212529',
    marginTop: 24,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    minWidth: 120,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  employeeInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  employeeHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 2,
  },
  employeeUsername: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B00',
    marginLeft: 4,
  },
  contactInfo: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#495057',
    marginLeft: 8,
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
  },
  permissionCategory: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12,
  },
  permissionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  quickAction: {
    width: '50%',
    padding: 8,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#495057',
    textAlign: 'center',
  },
  dangerZone: {
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F8D7DA',
  },
  dangerButton: {
    marginBottom: 12,
  },
  dangerText: {
    fontSize: 12,
    color: '#721C24',
    lineHeight: 18,
  },
});