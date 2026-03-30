import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { EmployeeService } from '../../database/services/EmployeeService';
import Header from '../../components/Header';
import EmployeeCard from '../../components/EmployeeCard';
import EmptyState from '../../components/EmptyState';
import SearchBar from '../../components/SearchBar';

export default function EmployeesListScreen({ route, navigation }) {
  const { shopId } = route.params;
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadEmployees();
    
    const unsubscribe = navigation.addListener('focus', () => {
      loadEmployees();
    });

    return unsubscribe;
  }, [shopId, navigation]);

  useEffect(() => {
    filterEmployees();
  }, [searchQuery, employees]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const employeesList = await EmployeeService.getEmployeesByShop(shopId);
      setEmployees(employeesList);
      setFilteredEmployees(employeesList);
    } catch (error) {
      console.error('Error loading employees:', error);
      Alert.alert('Error', 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEmployees();
    setRefreshing(false);
  };

  const filterEmployees = () => {
    if (!searchQuery.trim()) {
      setFilteredEmployees(employees);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = employees.filter(employee => 
      (employee.first_name && employee.first_name.toLowerCase().includes(query)) ||
      (employee.last_name && employee.last_name.toLowerCase().includes(query)) ||
      (employee.username && employee.username.toLowerCase().includes(query)) ||
      (employee.role_name && employee.role_name.toLowerCase().includes(query)) ||
      (employee.role_type && employee.role_type.toLowerCase().includes(query))
    );
    
    setFilteredEmployees(filtered);
  };

  const handleAddEmployee = () => {
    navigation.navigate('AddEmployee', { shopId });
  };

  const handleEmployeePress = (employee) => {
    navigation.navigate('EmployeeDetail', { 
      employeeId: employee.id,
      shopId 
    });
  };

  const handleDeleteEmployee = async (employeeId, employeeName) => {
    Alert.alert(
      'Remove Employee',
      `Are you sure you want to remove ${employeeName} from this shop?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await EmployeeService.removeEmployee(employeeId);
              if (result.success) {
                Alert.alert('Success', `${employeeName} has been removed`);
                await loadEmployees();
              } else {
                Alert.alert('Error', result.error || 'Failed to remove employee');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to remove employee');
            }
          }
        }
      ]
    );
  };

  const handleEditEmployee = (employee) => {
    navigation.navigate('EmployeeDetail', { 
      employeeId: employee.id,
      shopId,
      editMode: true 
    });
  };

  const headerButtons = [
    {
      icon: 'add-outline',
      onPress: handleAddEmployee,
    },
    {
      icon: 'filter-outline',
      onPress: () => {
        Alert.alert(
          'Filter Employees',
          undefined,
          [
            { text: 'Active Only', onPress: () => {} },
            { text: 'By Role', onPress: () => {} },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      },
    },
  ];

  const renderEmployeeItem = ({ item }) => (
    <EmployeeCard
      employee={item}
      onPress={() => handleEmployeePress(item)}
      onDelete={() => handleDeleteEmployee(item.id, `${item.first_name} ${item.last_name}`)}
      onEdit={() => handleEditEmployee(item)}
    />
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B00" />
        <Text style={styles.loadingText}>Loading employees...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Team Members"
        subtitle="Manage employees in this shop"
        buttons={headerButtons}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          placeholder="Search employees by name or role..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery('')}
        />
        
        {searchQuery && (
          <Text style={styles.searchResultsText}>
            Found {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {/* Stats Overview */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{employees.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {employees.filter(e => e.role_type === 'manager' || e.role_type === 'assistant_manager').length}
          </Text>
          <Text style={styles.statLabel}>Managers</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {employees.filter(e => e.role_type === 'cashier').length}
          </Text>
          <Text style={styles.statLabel}>Cashiers</Text>
        </View>
      </View>

      <FlatList
        data={filteredEmployees}
        renderItem={renderEmployeeItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF6B00']}
            tintColor="#FF6B00"
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title={searchQuery ? "No Results Found" : "No Employees Yet"}
            description={
              searchQuery 
                ? "Try searching with different terms"
                : "Add employees to help manage this shop"
            }
            actionText={searchQuery ? "Clear Search" : "Add First Employee"}
            onAction={
              searchQuery 
                ? () => setSearchQuery('')
                : handleAddEmployee
            }
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Bulk Actions Footer */}
      {filteredEmployees.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.bulkAction}
            onPress={() => {}}
          >
            <Ionicons name="checkbox-outline" size={20} color="#6c757d" />
            <Text style={styles.bulkActionText}>Select Multiple</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.bulkAction}
            onPress={() => {}}
          >
            <Ionicons name="download-outline" size={20} color="#6c757d" />
            <Text style={styles.bulkActionText}>Export List</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.floatingAddButton}
        onPress={handleAddEmployee}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchResultsText: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 8,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 20,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#e9ecef',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bulkAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bulkActionText: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 8,
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    backgroundColor: '#FF6B00',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});