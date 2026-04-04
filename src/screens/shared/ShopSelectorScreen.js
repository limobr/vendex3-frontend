import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomHeader from '../../components/CustomHeader';
import { useShop } from '../../context/ShopContext';
import { useBusiness } from '../../context/BusinessContext';
import databaseService from '../../database';

export default function ShopSelectorScreen({ navigation }) {
  const { currentShop, selectShop } = useShop();
  const { currentBusiness } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [shopList, setShopList] = useState([]);

  useEffect(() => {
    loadShopList();
  }, [currentBusiness]);

  const loadShopList = async () => {
    setLoading(true);
    try {
      let list = [];
      if (currentBusiness) {
        list = await databaseService.ShopService.getShopsByBusiness(currentBusiness.id);
      } else {
        // Fallback: get first business for current user
        const user = await databaseService.UserService.getCurrentUser();
        if (user) {
          const businesses = await databaseService.BusinessService.getBusinessesByOwner(user.id);
          if (businesses.length > 0) {
            list = await databaseService.ShopService.getShopsByBusiness(businesses[0].id);
          }
        }
      }
      setShopList(list);
    } catch (error) {
      console.error('Error loading shops:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectShop = async (shop) => {
    const success = await selectShop(shop.id);
    if (success) {
      navigation.goBack();
    } else {
      alert('Failed to select shop');
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.shopItem, currentShop?.id === item.id && styles.selectedShop]}
      onPress={() => handleSelectShop(item)}
    >
      <View style={styles.shopInfo}>
        <Ionicons name="storefront" size={24} color={currentShop?.id === item.id ? '#FF6B00' : '#6B7280'} />
        <View style={styles.shopDetails}>
          <Text style={styles.shopName}>{item.name}</Text>
          {item.location && <Text style={styles.shopLocation}>{item.location}</Text>}
        </View>
      </View>
      {currentShop?.id === item.id && (
        <Ionicons name="checkmark-circle" size={24} color="#FF6B00" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader title="Select Shop" showBack />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>Loading shops...</Text>
        </View>
      ) : shopList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="storefront-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>No Shops Found</Text>
          <Text style={styles.emptySubtext}>
            Create a shop for your business to manage inventory.
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('AddShop')}
          >
            <Text style={styles.createButtonText}>Create Shop</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={shopList}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6B7280' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8 },
  createButton: { marginTop: 24, backgroundColor: '#FF6B00', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  createButtonText: { color: '#FFFFFF', fontWeight: '600' },
  listContent: { paddingVertical: 8 },
  shopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  selectedShop: { backgroundColor: '#FFF7F0' },
  shopInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  shopDetails: { marginLeft: 12, flex: 1 },
  shopName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  shopLocation: { fontSize: 14, color: '#6B7280', marginTop: 2 },
});