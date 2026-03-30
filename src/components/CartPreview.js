import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { height, width } = Dimensions.get("window");

export default function CartPreview({
  visible,
  onClose,
  cart,
  addToCart,
  removeFromCart,
  cartTotal,
  navigation,
}) {
  const slideAnim = useRef(new Animated.Value(height)).current;

  // Estimate sticky section height (header, search bar, categories)
  const stickySectionHeight = 150; // Adjust based on actual layout if needed
  const targetY = stickySectionHeight; // Stop at bottom of categories

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: targetY,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity
        style={styles.overlayBackground}
        onPress={onClose}
        accessibilityLabel="Close cart preview"
      />
      <Animated.View
        style={[
          styles.cartContainer,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.handleBar} />
        <View style={styles.header}>
          <Text style={styles.headerText}>Cart Preview</Text>
          <TouchableOpacity
            onPress={onClose}
            accessibilityLabel="Close cart preview"
          >
            <Ionicons name="close" size={24} color="#1F2937" />
          </TouchableOpacity>
        </View>
        <ScrollView
          style={styles.cartItems}
          contentContainerStyle={styles.cartItemsContent}
        >
          {cart.length === 0 ? (
            <Text style={styles.emptyText}>Your cart is empty</Text>
          ) : (
            <>
              {cart.map((item, index) => (
                <View key={`${item.id}-${item.customPrice}-${index}`} style={styles.cartItem}>
                  <Text style={styles.itemImage}>{item.image}</Text>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemPrice}>
                      Ksh. {item.customPrice} x {item.quantity}
                    </Text>
                  </View>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      onPress={() => removeFromCart(item.id, item.customPrice)}
                      style={styles.qtyButton}
                      accessibilityLabel={`Remove one ${item.name} from cart`}
                    >
                      <Text style={styles.qtyText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyNumber}>{item.quantity}</Text>
                    <TouchableOpacity
                      onPress={() => addToCart(item, item.customPrice)}
                      style={styles.qtyButtonAdd}
                      accessibilityLabel={`Add one ${item.name} to cart`}
                    >
                      <Text style={styles.qtyTextAdd}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              {cart.length > 0 && (
                <View style={styles.totalsContainer}>
                  <Text style={styles.totalText}>
                    Total: Ksh. {cartTotal.toFixed(2)}
                  </Text>
                  <TouchableOpacity
                    style={styles.checkoutButton}
                    onPress={() => {
                      onClose();
                      navigation.navigate("Checkout", { cart, cartTotal });
                    }}
                    accessibilityLabel="Proceed to checkout"
                  >
                    <Text style={styles.checkoutText}>Checkout</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 20,
  },
  overlayBackground: {
    flex: 1,
  },
  cartContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    width: "100%",
    height: height - 150, // Adjust to stop at categories
    backgroundColor: "#fffaf5",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: "#d1d5db",
    borderRadius: 2.5,
    alignSelf: "center",
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  cartItems: {
    flex: 1,
  },
  cartItemsContent: {
    paddingBottom: 70, // Ensure content is visible above bottom navbar
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 20,
  },
  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
  },
  itemImage: {
    fontSize: 24,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  itemPrice: {
    fontSize: 14,
    color: "#FF7F32",
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  qtyButton: {
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  qtyText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#374151",
  },
  qtyNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginHorizontal: 8,
  },
  qtyButtonAdd: {
    backgroundColor: "#FF7F32",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  qtyTextAdd: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  totalsContainer: {
    paddingTop: 16,
    paddingBottom: 70, // Ensure visibility above bottom navbar
  },
  totalText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FF7F32",
    marginBottom: 12,
  },
  checkoutButton: {
    backgroundColor: "#FF7F32",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  checkoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});