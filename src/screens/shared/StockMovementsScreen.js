// src/screens/shared/StockMovementsScreen.js
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

// Mock data for stock movements
const mockMovements = [
  {
    id: "1",
    date: "2025-04-01 10:30",
    type: "Restock",
    product: "Espresso",
    variant: "Small",
    quantity: 50,
    reference: "PO-123",
    reason: "Supplier delivery",
  },
  {
    id: "2",
    date: "2025-04-02 14:15",
    type: "Sale",
    product: "Cappuccino",
    variant: "Large",
    quantity: -5,
    reference: "INV-456",
    reason: "Customer purchase",
  },
  {
    id: "3",
    date: "2025-04-03 09:00",
    type: "Adjustment",
    product: "Croissant",
    variant: null,
    quantity: -2,
    reference: "ADJ-789",
    reason: "Damaged goods",
  },
];

const StockMovementsScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [movements, setMovements] = useState(mockMovements);

  const filteredMovements = movements.filter(
    (movement) =>
      movement.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      movement.reference.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderItem = ({ item }) => (
    <View style={styles.movementCard}>
      <View style={styles.movementHeader}>
        <View style={styles.movementInfo}>
          <Text style={styles.productName}>{item.product}</Text>
          {item.variant && <Text style={styles.variantName}>({item.variant})</Text>}
        </View>
        <View
          style={[
            styles.typeBadge,
            item.type === "Restock"
              ? styles.restockBadge
              : item.type === "Sale"
              ? styles.saleBadge
              : styles.adjustmentBadge,
          ]}
        >
          <Text style={styles.typeText}>{item.type}</Text>
        </View>
      </View>
      <View style={styles.movementDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>{item.date}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="swap-horizontal-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>
            Qty: <Text style={item.quantity > 0 ? styles.positive : styles.negative}>
              {item.quantity > 0 ? `+${item.quantity}` : item.quantity}
            </Text>
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="document-text-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>Ref: {item.reference}</Text>
        </View>
        {item.reason && (
          <View style={styles.detailRow}>
            <Ionicons name="chatbubble-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>{item.reason}</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeaderWithButton
        title="Stock Movements"
        leftButtonIcon="arrow-back"
        leftButtonAction={() => navigation.goBack()}
      />
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by product or reference..."
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
        data={filteredMovements}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="swap-horizontal-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No movements found</Text>
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
  movementCard: {
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
  movementHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  movementInfo: {
    flexDirection: "row",
    alignItems: "baseline",
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  variantName: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 6,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  restockBadge: {
    backgroundColor: "#E6F7E6",
  },
  saleBadge: {
    backgroundColor: "#FEF2F2",
  },
  adjustmentBadge: {
    backgroundColor: "#FFF3E0",
  },
  typeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
  movementDetails: {
    marginTop: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  detailText: {
    fontSize: 14,
    color: "#4B5563",
    marginLeft: 8,
  },
  positive: {
    color: "#10B981",
    fontWeight: "600",
  },
  negative: {
    color: "#EF4444",
    fontWeight: "600",
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

export default StockMovementsScreen;