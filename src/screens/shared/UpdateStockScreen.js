// src/screens/shared/UpdateStockScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomHeaderWithButton from "../../components/CustomHeaderWithButton";

// Mock products list
const mockProducts = [
  { id: "1", name: "Espresso", variant: "Small", currentStock: 45 },
  { id: "2", name: "Espresso", variant: "Large", currentStock: 32 },
  { id: "3", name: "Cappuccino", variant: "Small", currentStock: 25 },
  { id: "4", name: "Cappuccino", variant: "Large", currentStock: 15 },
  { id: "5", name: "Croissant", variant: null, currentStock: 8 },
];

const UpdateStockScreen = ({ navigation }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustment, setAdjustment] = useState("");
  const [reason, setReason] = useState("");

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setAdjustment("");
    setReason("");
  };

  const handleSubmit = () => {
    if (!selectedProduct) {
      Alert.alert("Error", "Please select a product");
      return;
    }
    const qty = parseInt(adjustment);
    if (isNaN(qty) || qty === 0) {
      Alert.alert("Error", "Please enter a valid adjustment quantity (non-zero)");
      return;
    }
    if (!reason.trim()) {
      Alert.alert("Error", "Please provide a reason for the adjustment");
      return;
    }

    // Here you would call your API to update stock
    Alert.alert(
      "Success",
      `Stock for ${selectedProduct.name}${
        selectedProduct.variant ? ` (${selectedProduct.variant})` : ""
      } updated by ${qty > 0 ? `+${qty}` : qty}. New stock: ${
        selectedProduct.currentStock + qty
      }`,
      [{ text: "OK", onPress: () => navigation.goBack() }]
    );
  };

  const renderProductItem = (product) => (
    <TouchableOpacity
      key={product.id}
      style={[
        styles.productItem,
        selectedProduct?.id === product.id && styles.selectedProduct,
      ]}
      onPress={() => handleProductSelect(product)}
    >
      <View>
        <Text style={styles.productName}>{product.name}</Text>
        {product.variant && <Text style={styles.variant}>{product.variant}</Text>}
      </View>
      <Text style={styles.currentStock}>Stock: {product.currentStock}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeaderWithButton
        title="Update Stock"
        leftButtonIcon="arrow-back"
        leftButtonAction={() => navigation.goBack()}
        rightButtonIcon="checkmark"
        rightButtonAction={handleSubmit}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Select Product</Text>
        <View style={styles.productList}>{mockProducts.map(renderProductItem)}</View>

        {selectedProduct && (
          <>
            <Text style={styles.sectionTitle}>Adjustment Quantity</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter quantity (+ to add, - to remove)"
                keyboardType="numeric"
                value={adjustment}
                onChangeText={setAdjustment}
              />
              <Text style={styles.helperText}>
                Use positive number to add stock, negative to reduce
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Reason</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g., Damaged goods, Inventory correction, Stock take..."
                multiline
                numberOfLines={3}
                value={reason}
                onChangeText={setReason}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
  },
  productList: {
    marginBottom: 16,
  },
  productItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  selectedProduct: {
    borderColor: "#FF6B00",
    backgroundColor: "#FFF7F0",
  },
  productName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
  },
  variant: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  currentStock: {
    fontSize: 14,
    color: "#6B7280",
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  helperText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
});

export default UpdateStockScreen;