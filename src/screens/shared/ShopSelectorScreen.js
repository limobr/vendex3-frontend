import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useBusiness } from '../../context/BusinessContext';
import databaseService from '../../database';

export default function ShopSelectorScreen({ navigation }) {
  const { user, logout } = useAuth();               // logout from AuthContext
  const { selectShop } = useBusiness();             // selectShop from BusinessContext
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShop, setSelectedShop] = useState(null);

  useEffect(() => {
    loadEmployeeShops();
  }, []);

  const loadEmployeeShops = async () => {
    try {
      console.log('📋 Loading shops for employee:', user?.username);
      
      // Get shops where user is an employee (pass the user ID)
      const employeeShops = await databaseService.ShopService.getUserShops(user.id);
      
      console.log('🏪 Employee shops found:', employeeShops?.length || 0);
      
      if (employeeShops && employeeShops.length > 0) {
        setShops(employeeShops);
        
        // Auto-select if only one shop
        if (employeeShops.length === 1) {
          handleSelectShop(employeeShops[0]);
        }
      } else {
        Alert.alert(
          'No Shop Access',
          'You are not assigned to any shop. Please contact your manager.',
          [{ text: 'OK', onPress: () => navigation.replace('Landing') }]
        );
      }
    } catch (error) {
      console.error('❌ Error loading shops:', error);
      Alert.alert('Error', 'Failed to load shops. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectShop = async (shop) => {
    try {
      setSelectedShop(shop.id);
      
      // Select shop using BusinessContext
      const result = await selectShop(shop.id);
      
      if (result.success) {
        console.log('✅ Shop selected:', shop.name);
        navigation.replace('Main');
      } else {
        Alert.alert('Error', result.error || 'Failed to select shop');
        setSelectedShop(null);
      }
    } catch (error) {
      console.error('❌ Error selecting shop:', error);
      Alert.alert('Error', 'Failed to select shop. Please try again.');
      setSelectedShop(null);
    }
  };

  const renderShopItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.shopCard,
        selectedShop === item.id && styles.selectedShopCard,
      ]}
      onPress={() => handleSelectShop(item)}
      disabled={selectedShop === item.id}
    >
      <View style={styles.shopIconContainer}>
        <Ionicons 
          name="business" 
          size={32} 
          color={selectedShop === item.id ? '#FF6B00' : '#9ca3af'} 
        />
      </View>
      
      <View style={styles.shopInfo}>
        <Text style={styles.shopName}>{item.name}</Text>
        <Text style={styles.businessName}>{item.business_name}</Text>
        <Text style={styles.shopLocation}>{item.location}</Text>
        
        {item.role && (
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{item.role}</Text>
          </View>
        )}
      </View>
      
      <Ionicons 
        name="chevron-forward" 
        size={24} 
        color="#9ca3af" 
      />
    </TouchableOpacity>
  );

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          onPress: async () => {
            await logout();          // clear authentication state
            navigation.replace('Landing'); // go back to the landing screen
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B00" />
        <Text style={styles.loadingText}>Loading your shops...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select a Shop</Text>
        <Text style={styles.subtitle}>
          Choose which shop you want to work in today
        </Text>
      </View>

      {shops.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="business-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyStateText}>
            No shops assigned to you yet
          </Text>
          <Text style={styles.emptyStateSubtext}>
            Contact your manager to get access to a shop
          </Text>
        </View>
      ) : (
        <FlatList
          data={shops}
          renderItem={renderShopItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
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
    marginTop: 20,
    fontSize: 16,
    color: '#6c757d',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  listContent: {
    padding: 20,
  },
  shopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedShopCard: {
    borderColor: '#FF6B00',
    borderWidth: 2,
    backgroundColor: '#FFF7F0',
  },
  shopIconContainer: {
    marginRight: 16,
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  businessName: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 2,
  },
  shopLocation: {
    fontSize: 13,
    color: '#868e96',
    marginBottom: 8,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e7f5ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1c7ed6',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#495057',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#868e96',
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    backgroundColor: '#fff',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 8,
  },
});