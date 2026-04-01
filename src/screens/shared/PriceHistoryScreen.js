// src/screens/shared/PriceHistoryScreen.js
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

// Mock price history data
const mockPriceHistory = [
  {
    id: "1",
    product: "Espresso",
    variant: "Small",
    oldPrice: 3.0,
    newPrice: 3.5,
    date: "2025-03-01",
    reason: "Price increase",
  },
  {
    id: "2",
    product: "Cappuccino",
    variant: "Large",
    oldPrice: 4.5,
    newPrice: 4.0,
    date: "2025-03-15",
    reason: "Promotion",
  },
  {
    id: "3",
    product: "Croissant",
    variant: null,
    oldPrice: 2.2,
    newPrice: 2.5,
    date: "2025-04-01",
    reason: "Cost adjustment",
  },
];

const PriceHistoryScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [priceHistory, setPriceHistory] = useState(mockPriceHistory);

  const filteredHistory = priceHistory.filter(
    (item) =>
      item.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.variant &&
        item.variant.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderItem = ({ item }) => (
    <View style={styles.historyCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.productName}>
          {item.product}
          {item.variant && <Text style={styles.variant}> ({item.variant})</Text>}
        </Text>
        <Text style={styles.date}>{item.date}</Text>
      </View>
      <View style={styles.priceContainer}>
        <View style={styles.priceChange}>
          <Text style={styles.oldPrice}>${item.oldPrice.toFixed(2)}</Text>
          <Ionicons name="arrow-forward" size={20} color="#9CA3AF" />
          <Text style={styles.newPrice}>${item.newPrice.toFixed(2)}</Text>
        </View>
        <View
          style={[
            styles.changeBadge,
            item.newPrice > item.oldPrice
              ? styles.increase
              : styles.decrease,
          ]}
        >
          <Text style={styles.changeText}>
            {item.newPrice > item.oldPrice ? "+" : ""}
            {((item.newPrice - item.oldPrice) / item.oldPrice * 100).toFixed(0)}%
          </Text>
        </View>
      </View>
      {item.reason && (
        <View style={styles.reasonContainer}>
          <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
          <Text style={styles.reasonText}>{item.reason}</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeaderWithButton
        title="Price History"
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
        data={filteredHistory}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No price history found</Text>
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
  historyCard: {
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
    flex: 1,
  },
  variant: {
    fontSize: 14,
    fontWeight: "normal",
    color: "#6B7280",
  },
  date: {
    fontSize: 14,
    color: "#6B7280",
  },
  priceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  priceChange: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  oldPrice: {
    fontSize: 16,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
  newPrice: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  changeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  increase: {
    backgroundColor: "#E6F7E6",
  },
  decrease: {
    backgroundColor: "#FEF2F2",
  },
  changeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
  reasonContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  reasonText: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 8,
    flex: 1,
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

export default PriceHistoryScreen;