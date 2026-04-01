// src/screens/shared/ViewInventoryScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomHeaderWithButton from "../../components/CustomHeaderWithButton";

// Mock inventory data
const mockInventory = [
  { id: "1", name: "Espresso", variant: "Small", stock: 45, reorderLevel: 10 },
  { id: "2", name: "Espresso", variant: "Large", stock: 32, reorderLevel: 10 },
  { id: "3", name: "Cappuccino", variant: "Small", stock: 25, reorderLevel: 10 },
  { id: "4", name: "Cappuccino", variant: "Large", stock: 15, reorderLevel: 10 },
  { id: "5", name: "Croissant", variant: null, stock: 8, reorderLevel: 5 },
];

const ViewInventoryScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [inventory, setInventory] = useState(mockInventory);

  const filteredInventory = inventory.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.variant &&
        item.variant.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderItem = ({ item }) => (
    <View style={styles.inventoryCard}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.productName}>{item.name}</Text>
          {item.variant && <Text style={styles.variant}>{item.variant}</Text>}
        </View>
        <View style={styles.stockContainer}>
          <Text style={styles.stockValue}>{item.stock}</Text>
          <Text style={styles.unit}>units</Text>
        </View>
      </View>
      <View style={styles.reorderContainer}>
        <Text style={styles.reorderText}>Reorder at: {item.reorderLevel} units</Text>
        {item.stock <= item.reorderLevel && (
          <View style={styles.warningBadge}>
            <Ionicons name="alert-circle" size={14} color="#F59E0B" />
            <Text style={styles.warningText}>Low stock</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeaderWithButton
        title="View Inventory"
        leftButtonIcon="arrow-back"
        leftButtonAction={() => navigation.goBack()}
      />
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by product or variant..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery !== "" && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={filteredInventory}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No inventory items found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#1F2937",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  inventoryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  productName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  variant: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  stockContainer: {
    alignItems: "flex-end",
  },
  stockValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
  },
  unit: {
    fontSize: 12,
    color: "#6B7280",
  },
  reorderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  reorderText: {
    fontSize: 14,
    color: "#6B7280",
  },
  warningBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  warningText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#F59E0B",
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#9CA3AF",
    marginTop: 12,
  },
});

export default ViewInventoryScreen;