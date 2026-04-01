// src/screens/shared/RestockItemsScreen.js
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

// Mock products
const mockProducts = [
  { id: "1", name: "Espresso", variant: "Small" },
  { id: "2", name: "Espresso", variant: "Large" },
  { id: "3", name: "Cappuccino", variant: "Small" },
  { id: "4", name: "Cappuccino", variant: "Large" },
  { id: "5", name: "Croissant", variant: null },
];

const RestockItemsScreen = ({ navigation }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [supplier, setSupplier] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [reference, setReference] = useState("");

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
  };

  const handleSubmit = () => {
    if (!selectedProduct) {
      Alert.alert("Error", "Please select a product");
      return;
    }
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert("Error", "Please enter a valid positive quantity");
      return;
    }
    if (!supplier.trim()) {
      Alert.alert("Error", "Please enter supplier name");
      return;
    }
    const price = parseFloat(purchasePrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert("Error", "Please enter a valid purchase price");
      return;
    }

    // Here you would call your API to add stock
    Alert.alert(
      "Success",
      `Restocked ${qty} units of ${selectedProduct.name}${
        selectedProduct.variant ? ` (${selectedProduct.variant})` : ""
      } from ${supplier}`,
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
      <Text style={styles.productName}>
        {product.name}
        {product.variant && <Text style={styles.variant}> ({product.variant})</Text>}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeaderWithButton
        title="Restock Items"
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
            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter quantity"
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
              />
            </View>

            <Text style={styles.sectionTitle}>Supplier</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Supplier name"
                value={supplier}
                onChangeText={setSupplier}
              />
            </View>

            <Text style={styles.sectionTitle}>Purchase Price (per unit)</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                keyboardType="numeric"
                value={purchasePrice}
                onChangeText={setPurchasePrice}
              />
            </View>

            <Text style={styles.sectionTitle}>Reference (Optional)</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="PO number, invoice, etc."
                value={reference}
                onChangeText={setReference}
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
    fontWeight: "normal",
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
});

export default RestockItemsScreen;