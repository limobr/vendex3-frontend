import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import CartPreview from "../../components/CartPreview";

// Categories
const categories = ["All", "Drinks", "Snacks", "Household", "Electronics", "Books", "Clothing"];

// Products Data
const products = [
  { id: 1, name: "Premium Coffee", price: 499, maxDiscount: 10, category: "Drinks", image: "☕" },
  { id: 2, name: "Energy Drink", price: 249, maxDiscount: 10, category: "Drinks", image: "🥤" },
  { id: 3, name: "Chocolate Bar", price: 199, maxDiscount: 10, category: "Snacks", image: "🍫" },
  { id: 4, name: "Mineral Water", price: 99, maxDiscount: 10, category: "Drinks", image: "💧" },
  { id: 5, name: "Potato Chips", price: 299, maxDiscount: 10, category: "Snacks", image: "🥔" },
  { id: 6, name: "Notebook", price: 599, maxDiscount: 10, category: "Books", image: "📓" },
  { id: 7, name: "Cleaning Spray", price: 349, maxDiscount: 10, category: "Household", image: "🧽" },
  { id: 8, name: "Phone Charger", price: 1299, maxDiscount: 10, category: "Electronics", image: "🔌" },
  { id: 9, name: "Trousers", price: 1500, maxDiscount: 200, category: "Clothing", image: "👖" },
];

export default function ProductsScreen({ navigation }) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [customPrice, setCustomPrice] = useState("");
  const [cartPreviewVisible, setCartPreviewVisible] = useState(false);

  // Listen for navigation result from CheckoutScreen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const result = navigation.getState()?.routes.find((route) => route.name === 'Checkout')?.params?.result;
      if (result?.orderCompleted) {
        setCart([]);
        setCartPreviewVisible(false);
        Alert.alert("Success", "Order placed successfully!");
      } else if (result?.cancelCheckout) {
        setCart([]);
        setCartPreviewVisible(false);
      }
    });
    return unsubscribe;
  }, [navigation]);

  // Filter Products
  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === "All" || product.category === selectedCategory;
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Cart Functions
  const openPriceModal = (product) => {
    setSelectedProduct(product);
    setCustomPrice(product.price.toString());
    setModalVisible(true);
  };

  const addToCart = (product, price) => {
    const parsedPrice = parseFloat(price);
    const minPrice = product.price - product.maxDiscount;
    if (isNaN(parsedPrice) || parsedPrice < minPrice || parsedPrice > product.price) {
      Alert.alert(
        "Invalid Price",
        `Price must be between Ksh. ${minPrice} and Ksh. ${product.price}`,
      );
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id && item.customPrice === parsedPrice);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id && item.customPrice === parsedPrice
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1, customPrice: parsedPrice }];
    });
    setModalVisible(false);
    setCustomPrice("");
  };

  const removeFromCart = (productId, customPrice) => {
    setCart((prev) =>
      prev.reduce((acc, item) => {
        if (item.id === productId && item.customPrice === customPrice) {
          if (item.quantity > 1) {
            acc.push({ ...item, quantity: item.quantity - 1 });
          }
        } else {
          acc.push(item);
        }
        return acc;
      }, [])
    );
  };

  const getProductQuantity = (productId) => {
    return cart
      .filter((item) => item.id === productId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  const cartTotal = cart.reduce(
    (total, item) => total + item.customPrice * item.quantity,
    0
  );
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  const handleCheckout = () => {
    navigation.navigate("Checkout", { cart, cartTotal });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Sticky Header, Search Bar, and Categories */}
      <View style={styles.stickySection}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📦 Products</Text>
          <TouchableOpacity
            style={styles.cartIcon}
            onPress={() => setCartPreviewVisible(true)}
            accessibilityLabel="View cart"
          >
            <Ionicons name="cart-outline" size={26} color="#1F2937" />
            {cartItemCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#6B7280" />
          <TextInput
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            accessibilityLabel="Search products"
          />
        </View>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categories}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              onPress={() => setSelectedCategory(category)}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.categoryButtonActive,
              ]}
              accessibilityLabel={`Filter by ${category}`}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category && styles.categoryTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Scrollable Products Grid */}
      <ScrollView contentContainerStyle={styles.productsWrapper}>
        <View style={styles.productsGrid}>
          {filteredProducts.map((product) => {
            const quantity = getProductQuantity(product.id);
            return (
              <View key={product.id} style={styles.productCard}>
                <View style={styles.productHeader}>
                  <Text style={styles.productImage}>{product.image}</Text>
                  <TouchableOpacity
                    style={styles.discountButton}
                    onPress={() => openPriceModal(product)}
                    accessibilityLabel={`Set discount for ${product.name}`}
                  >
                    <Ionicons name="pricetag-outline" size={16} color="#374151" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productPrice}>
                  Ksh. {product.price} (Up to {product.maxDiscount} off)
                </Text>

                {quantity === 0 ? (
                  <TouchableOpacity
                    onPress={() => addToCart(product, product.price)}
                    style={styles.addButton}
                    accessibilityLabel={`Add ${product.name} to cart at full price`}
                  >
                    <Text style={styles.addButtonText}>+ Add to Cart</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      onPress={() => {
                        const cartItem = cart.find((item) => item.id === product.id);
                        if (cartItem) removeFromCart(product.id, cartItem.customPrice);
                      }}
                      style={styles.qtyButton}
                      accessibilityLabel={`Remove one ${product.name} from cart`}
                    >
                      <Text style={styles.qtyText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyNumber}>{quantity}</Text>
                    <TouchableOpacity
                      onPress={() => addToCart(product, product.price)}
                      style={styles.qtyButtonAdd}
                      accessibilityLabel={`Add one ${product.name} to cart at full price`}
                    >
                      <Text style={styles.qtyTextAdd}>+</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Sticky Cart Summary */}
      {cart.length > 0 && (
        <View style={styles.cartSummary}>
          <View>
            <Text style={styles.cartItemsText}>{cartItemCount} items</Text>
            <Text style={styles.cartTotalText}>Total: Ksh. {cartTotal.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={styles.checkoutButton}
            onPress={handleCheckout}
            accessibilityLabel="Checkout cart"
          >
            <Text style={styles.checkoutText}>Checkout</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Custom Price Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Set Price for {selectedProduct?.name}
            </Text>
            <Text style={styles.modalSubtitle}>
              Original Price: Ksh. {selectedProduct?.price}
            </Text>
            <Text style={styles.modalSubtitle}>
              Allowed Range: Ksh. {selectedProduct?.price - selectedProduct?.maxDiscount} - Ksh. {selectedProduct?.price}
            </Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={customPrice}
              onChangeText={setCustomPrice}
              placeholder="Enter custom price"
              accessibilityLabel={`Enter custom price for ${selectedProduct?.name}`}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setModalVisible(false)}
                accessibilityLabel="Cancel price input"
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonConfirm}
                onPress={() => selectedProduct && addToCart(selectedProduct, customPrice)}
                accessibilityLabel="Confirm custom price"
              >
                <Text style={styles.modalButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cart Preview */}
      <CartPreview
        visible={cartPreviewVisible}
        onClose={() => setCartPreviewVisible(false)}
        cart={cart}
        addToCart={addToCart}
        removeFromCart={removeFromCart}
        cartTotal={cartTotal}
        navigation={navigation}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fffaf5",
  },
  stickySection: {
    position: "sticky",
    top: 0,
    zIndex: 10,
    backgroundColor: "#fffaf5",
    padding: 16,
    paddingTop: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
  },
  cartIcon: {
    position: "relative",
  },
  cartBadge: {
    position: "absolute",
    top: -6,
    right: -8,
    backgroundColor: "#FF7F32",
    borderRadius: 12,
    paddingHorizontal: 5,
  },
  cartBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: "#1F2937",
  },
  categories: {
    marginBottom: 16,
  },
  categoryButton: {
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    marginRight: 8,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryButtonActive: {
    backgroundColor: "#FF7F32",
  },
  categoryText: {
    color: "#374151",
    fontSize: 14,
  },
  categoryTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  productsWrapper: {
    padding: 16,
    paddingBottom: 80, // Space for sticky cart summary
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  productCard: {
    width: "48%",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    minHeight: 180,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  productImage: {
    fontSize: 36,
    textAlign: "center",
  },
  productName: {
    fontWeight: "700",
    fontSize: 16,
    color: "#1F2937",
    marginBottom: 4,
  },
  productPrice: {
    color: "#FF7F32",
    fontWeight: "600",
    fontSize: 14,
    marginBottom: 8,
  },
  discountButton: {
    backgroundColor: "#e5e7eb",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  addButton: {
    backgroundColor: "#FF7F32",
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
  },
  quantityControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  qtyButton: {
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  qtyText: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#374151",
  },
  qtyNumber: {
    fontWeight: "600",
    fontSize: 16,
    color: "#1F2937",
  },
  qtyButtonAdd: {
    backgroundColor: "#FF7F32",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  qtyTextAdd: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  cartSummary: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  cartItemsText: {
    color: "#6B7280",
    fontSize: 14,
  },
  cartTotalText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FF7F32",
  },
  checkoutButton: {
    backgroundColor: "#FF7F32",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  checkoutText: {
    color: "#fff",
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "80%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 10,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
    width: "100%",
    marginBottom: 20,
    color: "#1F2937",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButtonCancel: {
    backgroundColor: "#6B7280",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalButtonConfirm: {
    backgroundColor: "#FF7F32",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});