// src/screens/owner/AddProductScreen.js
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Switch,
  Modal,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomHeaderWithButton from "../../components/CustomHeaderWithButton";
import { nanoid } from "nanoid/non-secure";
import { productAPI } from "../../services/api";
import databaseService from "../../database";
import { useAuth } from "../../context/AuthContext";

const { width } = Dimensions.get("window");

// Product types from Django model
const PRODUCT_TYPES = [
  { id: "physical", label: "Physical Product", icon: "cube" },
  { id: "digital", label: "Digital Product", icon: "cloud" },
  { id: "service", label: "Service", icon: "construct" },
];

// Variant types from Django model
const VARIANT_TYPES = [
  { id: "none", label: "No Variants", icon: "close-circle" },
  { id: "single", label: "Single Option", icon: "options" },
  { id: "multiple", label: "Multiple Options", icon: "layers" },
];

// Predefined attribute options for common products
const PREDEFINED_ATTRIBUTES = [
  {
    name: "Size",
    values: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"],
    icon: "resize",
  },
  {
    name: "Color",
    values: ["Red", "Blue", "Green", "Black", "White", "Yellow", "Purple"],
    icon: "color-palette",
  },
  {
    name: "Weight",
    values: ["50g", "100g", "250g", "500g", "1kg", "2kg", "5kg"],
    icon: "scale",
  },
  {
    name: "Material",
    values: ["Cotton", "Polyester", "Silk", "Wool", "Leather", "Denim"],
    icon: "shirt",
  },
  {
    name: "Capacity",
    values: ["500ml", "1L", "1.5L", "2L", "5L", "10L", "20L"],
    icon: "flask",
  },
];

// Unit of measures (fallback in case API fails)
const UNIT_OF_MEASURES = [
  { id: "pcs", name: "Pieces", symbol: "pcs" },
  { id: "kg", name: "Kilograms", symbol: "kg" },
  { id: "g", name: "Grams", symbol: "g" },
  { id: "l", name: "Liters", symbol: "L" },
  { id: "ml", name: "Milliliters", symbol: "ml" },
  { id: "box", name: "Box", symbol: "box" },
  { id: "pack", name: "Pack", symbol: "pack" },
  { id: "carton", name: "Carton", symbol: "ctn" },
  { id: "m", name: "Meters", symbol: "m" },
  { id: "cm", name: "Centimeters", symbol: "cm" },
  { id: "bottle", name: "Bottle", symbol: "btl" },
  { id: "can", name: "Can", symbol: "can" },
];

// Tax types from Django model
const TAX_TYPES = [
  { id: "standard", name: "Standard VAT" },
  { id: "zero", name: "Zero Rated" },
  { id: "exempt", name: "Exempt" },
];

// Helper function to build category tree
const buildCategoryTree = (categories) => {
  if (!categories || !Array.isArray(categories)) return [];

  const categoryMap = {};
  categories.forEach((category) => {
    categoryMap[category.id] = {
      ...category,
      children: [],
      isExpanded: false,
    };
  });

  const tree = [];
  categories.forEach((category) => {
    if (category.parent_id) {
      if (categoryMap[category.parent_id]) {
        categoryMap[category.parent_id].children.push(categoryMap[category.id]);
      } else {
        tree.push(categoryMap[category.id]);
      }
    } else {
      tree.push(categoryMap[category.id]);
    }
  });

  tree.sort((a, b) => a.name.localeCompare(b.name));
  tree.forEach((category) => {
    if (category.children.length > 0) {
      category.children.sort((a, b) => a.name.localeCompare(b.name));
    }
  });

  return tree;
};

// Function to expand tree to show selected category
const expandToSelectedCategory = (categoryId, tree, currentExpanded = {}) => {
  const findCategoryPath = (node, targetId, path = []) => {
    if (node.id === targetId) {
      return [...path, node.id];
    }

    if (node.children) {
      for (const child of node.children) {
        const result = findCategoryPath(child, targetId, [...path, node.id]);
        if (result) return result;
      }
    }

    return null;
  };

  const newExpanded = { ...currentExpanded };

  // Find the path to the selected category
  for (const root of tree) {
    const path = findCategoryPath(root, categoryId);
    if (path) {
      // Expand all categories in the path except the last one (the selected category itself)
      path.forEach((catId) => {
        newExpanded[catId] = true;
      });
      break;
    }
  }

  return newExpanded;
};

// Attribute Item Component
const AttributeItem = ({
  attribute,
  index,
  onUpdate,
  onRemove,
  onAddValue,
}) => {
  const [newValue, setNewValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  return (
    <View style={styles.attributeCard}>
      <View style={styles.attributeHeader}>
        <View style={styles.attributeHeaderLeft}>
          <Ionicons name="pricetag" size={20} color="#FF6B00" />
          <TextInput
            style={styles.attributeNameInput}
            value={attribute.name}
            onChangeText={(text) => onUpdate(index, "name", text)}
            placeholder="Attribute name (e.g., Size)"
            autoCapitalize="words"
          />
        </View>
        <TouchableOpacity
          onPress={() => onRemove(index)}
          style={styles.removeButton}
        >
          <Ionicons name="trash" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <Text style={styles.attributeLabel}>Values:</Text>
      <View style={styles.valuesContainer}>
        {attribute.values.map((value, valueIndex) => (
          <View key={valueIndex} style={styles.valueTag}>
            <Text style={styles.valueText}>{value}</Text>
            <TouchableOpacity
              onPress={() => {
                const newValues = [...attribute.values];
                newValues.splice(valueIndex, 1);
                onUpdate(index, "values", newValues);
              }}
            >
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        ))}

        {isAdding ? (
          <View style={styles.valueInputContainer}>
            <TextInput
              style={styles.valueInput}
              value={newValue}
              onChangeText={setNewValue}
              placeholder="Enter value"
              autoFocus
            />
            <TouchableOpacity
              style={styles.addValueButton}
              onPress={() => {
                if (newValue.trim()) {
                  onAddValue(index, newValue.trim());
                  setNewValue("");
                }
                setIsAdding(false);
              }}
            >
              <Ionicons name="checkmark" size={20} color="#10B981" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelValueButton}
              onPress={() => setIsAdding(false)}
            >
              <Ionicons name="close" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addValueButtonSmall}
            onPress={() => setIsAdding(true)}
          >
            <Ionicons name="add" size={16} color="#3B82F6" />
            <Text style={styles.addValueText}>Add Value</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={styles.presetButton}
        onPress={() => {
          const preset = PREDEFINED_ATTRIBUTES.find(
            (p) => p.name.toLowerCase() === attribute.name.toLowerCase(),
          );
          if (preset) {
            onUpdate(index, "values", [
              ...attribute.values,
              ...preset.values.filter((v) => !attribute.values.includes(v)),
            ]);
          }
        }}
      >
        <Text style={styles.presetButtonText}>Load Common Values</Text>
      </TouchableOpacity>
    </View>
  );
};

// Variant Item Component
const VariantItem = ({
  variant,
  index,
  onUpdate,
  onRemove,
  isBaseProduct = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Generate variant barcode
  const generateVariantBarcode = () => {
    const timestamp = Date.now().toString();
    const randomPart = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, "0");
    const generatedBarcode = `VBC${timestamp.slice(-10)}${randomPart}`;
    onUpdate(index, "barcode", generatedBarcode);
  };

  // Scan variant barcode (simulated)
  const scanVariantBarcode = () => {
    Alert.alert("Scan Barcode", "Position the barcode in front of the camera", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Simulate Scan",
        onPress: () => {
          const dummyBarcode = `978${Math.floor(Math.random() * 10000000000)
            .toString()
            .padStart(10, "0")}`;
          onUpdate(index, "barcode", dummyBarcode);
          Alert.alert("Barcode Scanned", `Scanned barcode: ${dummyBarcode}`);
        },
      },
    ]);
  };

  return (
    <View style={styles.variantCard}>
      <TouchableOpacity
        style={styles.variantHeader}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <View style={styles.variantHeaderLeft}>
          <Ionicons
            name={isExpanded ? "chevron-down" : "chevron-forward"}
            size={20}
            color="#6B7280"
          />
          <Text style={styles.variantName}>
            {variant.name || `Variant ${index + 1}`}
          </Text>
          {variant.is_default && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Default</Text>
            </View>
          )}
        </View>
        {!isBaseProduct && (
          <TouchableOpacity onPress={() => onRemove(index)}>
            <Ionicons name="trash" size={20} color="#EF4444" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.variantContent}>
          <View style={styles.variantRow}>
            <View style={styles.variantInputGroup}>
              <Text style={styles.variantLabel}>SKU</Text>
              <TextInput
                style={styles.variantInput}
                value={variant.sku}
                onChangeText={(text) => onUpdate(index, "sku", text)}
                placeholder="Variant SKU"
              />
            </View>
            <View style={styles.variantInputGroup}>
              <Text style={styles.variantLabel}>Barcode</Text>
              <View style={styles.barcodeSection}>
                <View style={styles.barcodeInputContainer}>
                  <TextInput
                    style={[styles.variantInput, styles.barcodeInput]}
                    value={variant.barcode}
                    onChangeText={(text) => onUpdate(index, "barcode", text)}
                    placeholder="Enter or scan barcode"
                    keyboardType="numeric"
                    maxLength={100}
                  />
                  {variant.barcode ? (
                    <TouchableOpacity
                      style={styles.clearButton}
                      onPress={() => onUpdate(index, "barcode", "")}
                    >
                      <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <View style={styles.variantBarcodeButtons}>
                  <TouchableOpacity
                    style={[styles.variantBarcodeButton, styles.scanButton]}
                    onPress={scanVariantBarcode}
                  >
                    <Ionicons name="camera" size={16} color="#fff" />
                    <Text style={styles.variantBarcodeButtonText}>Scan</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.variantBarcodeButton, styles.generateButton]}
                    onPress={generateVariantBarcode}
                  >
                    <Ionicons name="barcode" size={16} color="#fff" />
                    <Text style={styles.variantBarcodeButtonText}>
                      Generate
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.variantRow}>
            <View style={styles.variantInputGroup}>
              <Text style={styles.variantLabel}>Cost Price</Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>KES</Text>
                <TextInput
                  style={styles.priceInput}
                  value={variant.cost_price}
                  onChangeText={(text) => onUpdate(index, "cost_price", text)}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <View style={styles.variantInputGroup}>
              <Text style={styles.variantLabel}>Selling Price *</Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>KES</Text>
                <TextInput
                  style={styles.priceInput}
                  value={variant.selling_price}
                  onChangeText={(text) =>
                    onUpdate(index, "selling_price", text)
                  }
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>

          <View style={styles.variantRow}>
            <View style={styles.variantInputGroup}>
              <Text style={styles.variantLabel}>Wholesale Price</Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>KES</Text>
                <TextInput
                  style={styles.priceInput}
                  value={variant.wholesale_price}
                  onChangeText={(text) =>
                    onUpdate(index, "wholesale_price", text)
                  }
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            {!isBaseProduct && (
              <View style={styles.variantInputGroup}>
                <Text style={styles.variantLabel}>Initial Stock</Text>
                <TextInput
                  style={styles.variantInput}
                  value={variant.initial_stock}
                  onChangeText={(text) =>
                    onUpdate(index, "initial_stock", text)
                  }
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
            )}
          </View>

          {!isBaseProduct &&
            variant.attribute_values &&
            variant.attribute_values.length > 0 && (
              <View style={styles.variantAttributes}>
                <Text style={styles.variantLabel}>Attributes:</Text>
                <View style={styles.attributeTags}>
                  {variant.attribute_values.map((attr, idx) => (
                    <View key={idx} style={styles.attributeTag}>
                      <Text style={styles.attributeTagText}>
                        {attr.attribute_name}: {attr.value}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

          {!isBaseProduct && (
            <View style={styles.variantToggle}>
              <Text style={styles.toggleLabel}>Set as Default</Text>
              <Switch
                value={variant.is_default || false}
                onValueChange={(value) => {
                  if (value) {
                    onUpdate(index, "is_default", true);
                  }
                }}
                trackColor={{ false: "#D1D5DB", true: "#FF6B00" }}
                thumbColor="#fff"
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
};

// Enhanced Tax Calculator Component for variants
const TaxCalculator = ({
  sellingPrice,
  taxRate,
  taxInclusive,
  taxName,
  variantName,
}) => {
  const sellingPriceNum = parseFloat(sellingPrice) || 0;
  const taxRateNum = parseFloat(taxRate) || 0;

  let taxAmount = 0;
  let finalPrice = 0;
  let priceWithoutTax = 0;

  if (taxInclusive) {
    // Price includes tax
    finalPrice = sellingPriceNum;
    priceWithoutTax = sellingPriceNum / (1 + taxRateNum / 100);
    taxAmount = finalPrice - priceWithoutTax;
  } else {
    // Price excludes tax
    priceWithoutTax = sellingPriceNum;
    taxAmount = sellingPriceNum * (taxRateNum / 100);
    finalPrice = sellingPriceNum + taxAmount;
  }

  return (
    <View style={styles.taxCalculatorCard}>
      <View style={styles.taxCalculatorHeader}>
        <Text style={styles.taxCalculatorTitle}>💰 Tax Calculation</Text>
        {variantName && (
          <Text style={styles.taxCalculatorVariant} numberOfLines={1}>
            {variantName}
          </Text>
        )}
      </View>

      <View style={styles.taxCalculationGrid}>
        <View style={styles.taxCalculationRow}>
          <Text style={styles.taxCalculationLabel}>Tax Rate:</Text>
          <Text style={styles.taxCalculationValue}>
            {taxRate}% ({taxName})
          </Text>
        </View>

        <View style={styles.taxCalculationRow}>
          <Text style={styles.taxCalculationLabel}>
            {taxInclusive ? "Price (Tax Inclusive):" : "Price (Tax Exclusive):"}
          </Text>
          <Text style={styles.taxCalculationValue}>
            KES {sellingPriceNum.toFixed(2)}
          </Text>
        </View>

        {taxInclusive ? (
          <>
            <View style={styles.taxCalculationRow}>
              <Text style={styles.taxCalculationLabel}>Price without Tax:</Text>
              <Text style={styles.taxCalculationValue}>
                KES {priceWithoutTax.toFixed(2)}
              </Text>
            </View>
            <View style={styles.taxCalculationRow}>
              <Text style={styles.taxCalculationLabel}>Tax Amount:</Text>
              <Text style={styles.taxCalculationValue}>
                KES {taxAmount.toFixed(2)}
              </Text>
            </View>
            <View style={styles.taxCalculationRow}>
              <Text style={styles.taxCalculationLabel}>
                Final Price (same):
              </Text>
              <Text style={styles.taxCalculationValue}>
                KES {finalPrice.toFixed(2)}
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.taxCalculationRow}>
              <Text style={styles.taxCalculationLabel}>Tax Amount:</Text>
              <Text style={styles.taxCalculationValue}>
                KES {taxAmount.toFixed(2)}
              </Text>
            </View>
            <View style={styles.taxCalculationRow}>
              <Text style={styles.taxCalculationLabel}>
                Final Price (with Tax):
              </Text>
              <Text
                style={[styles.taxCalculationValue, styles.finalPriceHighlight]}
              >
                KES {finalPrice.toFixed(2)}
              </Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.taxSummary}>
        <Ionicons name="calculator" size={16} color="#3B82F6" />
        <Text style={styles.taxSummaryText}>
          {taxInclusive
            ? `Customer pays KES ${finalPrice.toFixed(2)} (tax included)`
            : `Customer pays KES ${finalPrice.toFixed(2)} (KES ${sellingPriceNum.toFixed(2)} + KES ${taxAmount.toFixed(2)} tax)`}
        </Text>
      </View>
    </View>
  );
};

// New Tax Calculation Table Component
const TaxCalculationTable = ({
  variants,
  baseSellingPrice,
  taxRate,
  taxInclusive,
  taxName,
  hasVariants,
  variantType,
}) => {
  const [expandedSections, setExpandedSections] = useState({});

  // Calculate tax for a given price
  const calculateTax = (price) => {
    const priceNum = parseFloat(price) || 0;
    const taxRateNum = parseFloat(taxRate) || 0;

    if (taxInclusive) {
      const priceWithoutTax = priceNum / (1 + taxRateNum / 100);
      const taxAmount = priceNum - priceWithoutTax;
      return {
        taxAmount,
        finalPrice: priceNum,
        priceWithoutTax,
      };
    } else {
      const taxAmount = priceNum * (taxRateNum / 100);
      const finalPrice = priceNum + taxAmount;
      return {
        taxAmount,
        finalPrice,
        priceWithoutTax: priceNum,
      };
    }
  };

  const toggleSection = (id) => {
    setExpandedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // For wide screens (table layout)
  const isWideScreen = width > 768;

  // No tax selected
  if (!taxRate || taxRate === 0) {
    return (
      <View style={styles.noTaxContainer}>
        <Ionicons name="receipt-outline" size={24} color="#6B7280" />
        <Text style={styles.noTaxText}>No tax applied to this product</Text>
      </View>
    );
  }

  // Single product (no variants)
  if (!hasVariants || variantType === "none") {
    const taxData = calculateTax(baseSellingPrice);

    if (isWideScreen) {
      return (
        <View style={styles.taxTableContainer}>
          <View style={styles.taxTableHeader}>
            <Text style={styles.taxTableHeaderText}>Product</Text>
            <Text style={styles.taxTableHeaderText}>Selling Price</Text>
            <Text style={styles.taxTableHeaderText}>Tax Amount</Text>
            <Text style={styles.taxTableHeaderText}>Final Price</Text>
          </View>

          <View style={styles.taxTableRow}>
            <Text style={styles.taxTableCell}>Base Product</Text>
            <Text style={styles.taxTableCell}>
              KES {parseFloat(baseSellingPrice || 0).toFixed(2)}
            </Text>
            <Text style={styles.taxTableCell}>
              KES {taxData.taxAmount.toFixed(2)}
            </Text>
            <Text style={[styles.taxTableCell, styles.finalPriceCell]}>
              KES {taxData.finalPrice.toFixed(2)}
            </Text>
          </View>
        </View>
      );
    }

    // Mobile card layout
    return (
      <TouchableOpacity
        style={styles.taxCard}
        onPress={() => toggleSection("base")}
        activeOpacity={0.7}
      >
        <View style={styles.taxCardHeader}>
          <View style={styles.taxCardHeaderLeft}>
            <Ionicons
              name={expandedSections.base ? "chevron-up" : "chevron-down"}
              size={20}
              color="#6B7280"
            />
            <Text style={styles.taxCardTitle}>Base Product</Text>
          </View>
          <View style={styles.taxCardSummary}>
            <Text style={styles.taxCardPrice}>
              KES {taxData.finalPrice.toFixed(2)}
            </Text>
            <Text style={styles.taxCardTax}>
              + KES {taxData.taxAmount.toFixed(2)} tax
            </Text>
          </View>
        </View>

        {expandedSections.base && (
          <View style={styles.taxCardContent}>
            <View style={styles.taxDetailRow}>
              <Text style={styles.taxDetailLabel}>Selling Price:</Text>
              <Text style={styles.taxDetailValue}>
                KES {parseFloat(baseSellingPrice || 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.taxDetailRow}>
              <Text style={styles.taxDetailLabel}>Tax Rate:</Text>
              <Text style={styles.taxDetailValue}>
                {taxRate}% ({taxName})
              </Text>
            </View>
            <View style={styles.taxDetailRow}>
              <Text style={styles.taxDetailLabel}>Tax Amount:</Text>
              <Text style={styles.taxDetailValue}>
                KES {taxData.taxAmount.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.taxDetailRow, styles.finalPriceRow]}>
              <Text style={[styles.taxDetailLabel, styles.finalPriceLabel]}>
                Final Price:
              </Text>
              <Text style={[styles.taxDetailValue, styles.finalPriceValue]}>
                KES {taxData.finalPrice.toFixed(2)}
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // With variants
  const allVariants = variants || [];

  if (isWideScreen) {
    return (
      <View style={styles.taxTableContainer}>
        <View style={styles.taxTableHeader}>
          <Text style={styles.taxTableHeaderText}>Variant</Text>
          <Text style={styles.taxTableHeaderText}>Selling Price</Text>
          <Text style={styles.taxTableHeaderText}>Tax Amount</Text>
          <Text style={styles.taxTableHeaderText}>Final Price</Text>
          <Text style={styles.taxTableHeaderText}>Default</Text>
        </View>

        {allVariants.map((variant, index) => {
          const taxData = calculateTax(variant.selling_price);

          return (
            <View
              key={index}
              style={[
                styles.taxTableRow,
                variant.is_default && styles.defaultVariantRow,
              ]}
            >
              <Text style={styles.taxTableCell} numberOfLines={2}>
                {variant.name || `Variant ${index + 1}`}
              </Text>
              <Text style={styles.taxTableCell}>
                KES {parseFloat(variant.selling_price || 0).toFixed(2)}
              </Text>
              <Text style={styles.taxTableCell}>
                KES {taxData.taxAmount.toFixed(2)}
              </Text>
              <Text style={[styles.taxTableCell, styles.finalPriceCell]}>
                KES {taxData.finalPrice.toFixed(2)}
              </Text>
              <Text style={styles.taxTableCell}>
                {variant.is_default ? (
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                ) : (
                  <Text style={styles.notDefaultText}>-</Text>
                )}
              </Text>
            </View>
          );
        })}
      </View>
    );
  }

  // Mobile card layout for variants
  return (
    <View style={styles.taxCardsContainer}>
      {allVariants.map((variant, index) => {
        const taxData = calculateTax(variant.selling_price);
        const isExpanded = expandedSections[`variant_${index}`];
        const isDefault = variant.is_default;

        return (
          <TouchableOpacity
            key={index}
            style={[styles.taxCard, isDefault && styles.defaultTaxCard]}
            onPress={() => toggleSection(`variant_${index}`)}
            activeOpacity={0.7}
          >
            <View style={styles.taxCardHeader}>
              <View style={styles.taxCardHeaderLeft}>
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#6B7280"
                />
                <View>
                  <Text style={styles.taxCardTitle} numberOfLines={1}>
                    {variant.name || `Variant ${index + 1}`}
                  </Text>
                  {isDefault && (
                    <View style={styles.defaultBadgeSmall}>
                      <Text style={styles.defaultBadgeSmallText}>Default</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.taxCardSummary}>
                <Text style={styles.taxCardPrice}>
                  KES {taxData.finalPrice.toFixed(2)}
                </Text>
                <Text style={styles.taxCardTax}>
                  + KES {taxData.taxAmount.toFixed(2)} tax
                </Text>
              </View>
            </View>

            {isExpanded && (
              <View style={styles.taxCardContent}>
                <View style={styles.taxDetailRow}>
                  <Text style={styles.taxDetailLabel}>Selling Price:</Text>
                  <Text style={styles.taxDetailValue}>
                    KES {parseFloat(variant.selling_price || 0).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.taxDetailRow}>
                  <Text style={styles.taxDetailLabel}>Tax Rate:</Text>
                  <Text style={styles.taxDetailValue}>
                    {taxRate}% ({taxName})
                  </Text>
                </View>
                <View style={styles.taxDetailRow}>
                  <Text style={styles.taxDetailLabel}>Tax Amount:</Text>
                  <Text style={styles.taxDetailValue}>
                    KES {taxData.taxAmount.toFixed(2)}
                  </Text>
                </View>
                <View style={[styles.taxDetailRow, styles.finalPriceRow]}>
                  <Text style={[styles.taxDetailLabel, styles.finalPriceLabel]}>
                    Final Price:
                  </Text>
                  <Text style={[styles.taxDetailValue, styles.finalPriceValue]}>
                    KES {taxData.finalPrice.toFixed(2)}
                  </Text>
                </View>

                {/* Variant attributes if available */}
                {variant.attribute_values &&
                  variant.attribute_values.length > 0 && (
                    <View style={styles.variantAttributesSection}>
                      <Text style={styles.variantAttributesLabel}>
                        Attributes:
                      </Text>
                      <View style={styles.variantAttributesTags}>
                        {variant.attribute_values.map((attr, idx) => (
                          <View key={idx} style={styles.variantAttributeTag}>
                            <Text style={styles.variantAttributeTagText}>
                              {attr.attribute_name}: {attr.value}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// Tax Summary Component
const TaxSummary = ({
  variants,
  baseSellingPrice,
  taxRate,
  taxInclusive,
  taxName,
  hasVariants,
}) => {
  const calculateTotalTax = () => {
    if (!hasVariants || variants.length === 0) {
      const price = parseFloat(baseSellingPrice) || 0;
      const rate = parseFloat(taxRate) || 0;

      if (taxInclusive) {
        const taxAmount = price - price / (1 + rate / 100);
        return taxAmount;
      } else {
        return price * (rate / 100);
      }
    }

    // Sum tax for all variants
    return variants.reduce((total, variant) => {
      const price = parseFloat(variant.selling_price) || 0;
      const rate = parseFloat(taxRate) || 0;

      if (taxInclusive) {
        const taxAmount = price - price / (1 + rate / 100);
        return total + taxAmount;
      } else {
        return total + price * (rate / 100);
      }
    }, 0);
  };

  const calculateTotalRevenue = () => {
    if (!hasVariants || variants.length === 0) {
      const price = parseFloat(baseSellingPrice) || 0;
      const rate = parseFloat(taxRate) || 0;

      if (taxInclusive) {
        return price;
      } else {
        return price + price * (rate / 100);
      }
    }

    // Sum final prices for all variants
    return variants.reduce((total, variant) => {
      const price = parseFloat(variant.selling_price) || 0;
      const rate = parseFloat(taxRate) || 0;

      if (taxInclusive) {
        return total + price;
      } else {
        return total + (price + price * (rate / 100));
      }
    }, 0);
  };

  const totalTax = calculateTotalTax();
  const totalRevenue = calculateTotalRevenue();

  return (
    <View style={styles.taxSummaryContainer}>
      <Text style={styles.taxSummaryTitle}>📊 Tax Summary</Text>

      <View style={styles.taxSummaryGrid}>
        <View style={styles.taxSummaryItem}>
          <Text style={styles.taxSummaryItemLabel}>Tax Rate</Text>
          <Text style={styles.taxSummaryItemValue}>{taxRate}%</Text>
        </View>

        <View style={styles.taxSummaryItem}>
          <Text style={styles.taxSummaryItemLabel}>Total Tax</Text>
          <Text style={[styles.taxSummaryItemValue, styles.taxAmountValue]}>
            KES {totalTax.toFixed(2)}
          </Text>
        </View>

        <View style={styles.taxSummaryItem}>
          <Text style={styles.taxSummaryItemLabel}>Total Revenue</Text>
          <Text style={[styles.taxSummaryItemValue, styles.revenueValue]}>
            KES {totalRevenue.toFixed(2)}
          </Text>
        </View>

        <View style={styles.taxSummaryItem}>
          <Text style={styles.taxSummaryItemLabel}>Items</Text>
          <Text style={styles.taxSummaryItemValue}>
            {hasVariants && variants.length > 0 ? variants.length : 1}
          </Text>
        </View>
      </View>

      <Text style={styles.taxSummaryNote}>
        {taxInclusive
          ? "All prices include tax"
          : "Tax will be added at checkout"}
      </Text>
    </View>
  );
};

// Enhanced Category Tree Item Component with tick only for selection
const CategoryTreeItem = ({
  category,
  depth = 0,
  selectedCategoryId,
  onSelect,
  expandedCategories,
  onToggleExpand,
}) => {
  const hasChildren = category.children && category.children.length > 0;
  const isExpanded = expandedCategories[category.id] || false;
  const isSelected = selectedCategoryId === category.id;

  // IMPORTANT: Use useMemo to prevent unnecessary re-renders
  const shouldHighlight = React.useMemo(() => {
    if (isSelected) return true;
    if (!hasChildren || !selectedCategoryId) return false;

    const checkChildren = (cat) => {
      if (cat.id === selectedCategoryId) return true;
      if (cat.children && cat.children.length > 0) {
        return cat.children.some((child) => checkChildren(child));
      }
      return false;
    };

    return checkChildren(category);
  }, [category, selectedCategoryId, hasChildren, isSelected]);

  return (
    <View>
      <View
        style={[styles.categoryItemContainer, { paddingLeft: 20 + depth * 20 }]}
      >
        {/* Main category area - click to expand */}
        <TouchableOpacity
          style={[
            styles.categoryMainArea,
            shouldHighlight && styles.highlightedCategory,
          ]}
          onPress={() => {
            if (hasChildren) {
              onToggleExpand(category.id);
            } else {
              // If no children, clicking main area also selects
              onSelect(category);
            }
          }}
          activeOpacity={0.7}
        >
          <View style={styles.categoryLeft}>
            {hasChildren && (
              <View style={styles.expandButton}>
                <Ionicons
                  name={isExpanded ? "chevron-down" : "chevron-forward"}
                  size={20}
                  color="#6B7280"
                />
              </View>
            )}

            {!hasChildren && depth > 0 && (
              <View style={styles.childIndicator}>
                <Ionicons
                  name="return-down-forward"
                  size={16}
                  color="#9CA3AF"
                />
              </View>
            )}

            <View
              style={[
                styles.categoryIcon,
                { backgroundColor: `${category.color || "#FF6B35"}20` },
              ]}
            >
              <Ionicons
                name={category.icon || (hasChildren ? "folder" : "cube")}
                size={20}
                color={category.color || "#FF6B35"}
              />
            </View>

            <View style={styles.categoryInfo}>
              <Text
                style={[
                  styles.categoryName,
                  shouldHighlight && styles.selectedCategoryName,
                ]}
              >
                {category.name}
              </Text>
              {category.product_count !== undefined &&
                category.product_count > 0 && (
                  <Text style={styles.categoryDescription}>
                    {category.product_count}{" "}
                    {category.product_count === 1 ? "product" : "products"}
                  </Text>
                )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Tick button - click to select without expanding */}
        <TouchableOpacity
          style={styles.tickButton}
          onPress={() => onSelect(category)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.tickContainer,
              isSelected ? styles.tickSelected : styles.tickUnselected,
            ]}
          >
            {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Add Category Button Component (appears at the end of each category list)
const AddCategoryButton = ({ depth, parentId, onPress, isCreating }) => {
  if (isCreating) return null;

  return (
    <TouchableOpacity
      style={[styles.addCategoryButton, { paddingLeft: 20 + depth * 20 }]}
      onPress={() => onPress(parentId)}
      activeOpacity={0.7}
    >
      <View style={styles.addCategoryButtonContent}>
        <Ionicons name="add-circle-outline" size={24} color="#3B82F6" />
        <Text style={styles.addCategoryButtonText}>Add New Category</Text>
      </View>
    </TouchableOpacity>
  );
};

// Create Category Input Component
const CreateCategoryInput = ({
  depth,
  parentId,
  onConfirm,
  onCancel,
  newCategoryName,
  setNewCategoryName,
  creatingCategoryLoading,
}) => {
  return (
    <View
      style={[styles.createCategoryInput, { paddingLeft: 20 + depth * 20 }]}
    >
      <View style={styles.createCategoryInputRow}>
        <TextInput
          style={styles.createCategoryTextInput}
          value={newCategoryName}
          onChangeText={setNewCategoryName}
          placeholder="Enter category name"
          autoFocus
          autoCapitalize="words"
        />
        <TouchableOpacity
          style={styles.createCategoryConfirmButton}
          onPress={() => onConfirm(parentId)}
          disabled={!newCategoryName.trim() || creatingCategoryLoading}
        >
          {creatingCategoryLoading ? (
            <ActivityIndicator size="small" color="#10B981" />
          ) : (
            <Ionicons
              name="checkmark"
              size={20}
              color={newCategoryName.trim() ? "#10B981" : "#9CA3AF"}
            />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.createCategoryCancelButton}
          onPress={onCancel}
          disabled={creatingCategoryLoading}
        >
          <Ionicons name="close" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Replace the entire renderCategoryList function with this corrected version:
const renderCategoryList = ({
  categories,
  depth = 0,
  selectedCategoryId,
  onSelect,
  expandedCategories,
  onToggleExpand,
  onCreateCategory,
  isCreating,
  creatingParentId,
  onCancelCreate,
  onCreateConfirm,
  newCategoryName,
  setNewCategoryName,
  creatingCategoryLoading,
  parentId = null,
  shouldRenderAddButton = true, // New parameter to control when to show add button
}) => {
  return (
    <View>
      {categories.map((category) => {
        const hasChildren = category.children && category.children.length > 0;
        const isExpanded = expandedCategories[category.id] || false;

        return (
          <View key={category.id}>
            <CategoryTreeItem
              category={category}
              depth={depth}
              selectedCategoryId={selectedCategoryId}
              onSelect={onSelect}
              expandedCategories={expandedCategories}
              onToggleExpand={onToggleExpand}
            />

            {isExpanded && hasChildren && (
              <View>
                {renderCategoryList({
                  categories: category.children,
                  depth: depth + 1,
                  selectedCategoryId,
                  onSelect,
                  expandedCategories,
                  onToggleExpand,
                  onCreateCategory,
                  isCreating,
                  creatingParentId,
                  onCancelCreate,
                  onCreateConfirm,
                  newCategoryName,
                  setNewCategoryName,
                  creatingCategoryLoading,
                  parentId: category.id,
                  shouldRenderAddButton: true,
                })}
              </View>
            )}

            {/* Add Category button at the end of children (always show if category is expanded) */}
            {isExpanded &&
              shouldRenderAddButton &&
              (isCreating && creatingParentId === category.id ? (
                <CreateCategoryInput
                  depth={depth + 1}
                  parentId={category.id}
                  onConfirm={onCreateConfirm}
                  onCancel={onCancelCreate}
                  newCategoryName={newCategoryName}
                  setNewCategoryName={setNewCategoryName}
                  creatingCategoryLoading={creatingCategoryLoading}
                />
              ) : (
                <AddCategoryButton
                  depth={depth + 1}
                  parentId={category.id}
                  onPress={onCreateCategory}
                  isCreating={isCreating}
                />
              ))}
          </View>
        );
      })}
    </View>
  );
};

export default function AddProductScreen({ route, navigation }) {
  const { shopId, shopName, businessId } = route.params || {};
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [showAttributeModal, setShowAttributeModal] = useState(false);

  // Fetched data states
  const [categories, setCategories] = useState([]);
  const [categoryTree, setCategoryTree] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [taxes, setTaxes] = useState([]);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  // New state for server UUID
  const [businessServerId, setBusinessServerId] = useState(null);

  // Variant states
  const [hasVariants, setHasVariants] = useState(false);
  const [variantType, setVariantType] = useState("none");
  const [attributes, setAttributes] = useState([]);
  const [variants, setVariants] = useState([]);

  // Category creation states
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [creatingCategoryParentId, setCreatingCategoryParentId] =
    useState(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategoryLoading, setCreatingCategoryLoading] = useState(false);

  // Form state
  const [form, setForm] = useState({
    // Basic Information
    name: "",
    description: "",
    category: null,
    product_type: "physical",

    // Variants (will be updated based on variant states)
    has_variants: false,
    variant_type: "none",

    // Identification (auto-generated)
    base_barcode: "",
    base_sku: "",

    // Pricing
    base_cost_price: "",
    base_selling_price: "",
    base_wholesale_price: "",

    // Tax
    tax: null,
    tax_inclusive: true,

    // Product Details
    unit_of_measure: "pcs",
    reorder_level: "10",
    is_trackable: true,

    // Status
    is_active: true,

    // Relationships
    business: businessId || "",
    shop: shopId || "",
  });

  const [errors, setErrors] = useState({});
  const [autoGenerateBarcode, setAutoGenerateBarcode] = useState(false);
  const [showBarcodePrompt, setShowBarcodePrompt] = useState(false);
  const [scanningBarcode, setScanningBarcode] = useState(false);

  // Load business server ID on mount
  useEffect(() => {
    const loadBusinessServerId = async () => {
      if (businessId && user?.id) {
        try {
          const business =
            await databaseService.BusinessService.getBusinessById(businessId);
          if (business && business.server_id) {
            setBusinessServerId(business.server_id);
            console.log("✅ Business server ID loaded:", business.server_id);
          } else {
            console.warn("⚠️ Business has no server_id. API calls may fail.");
          }
        } catch (error) {
          console.error("Error loading business server ID:", error);
        }
      }
    };
    loadBusinessServerId();
  }, [businessId, user?.id]);

  // Load initial data after businessServerId and user are available
  useEffect(() => {
    if (businessServerId && user?.id) {
      loadInitialData();
    }
  }, [businessServerId, user?.id]);

  // Auto-generate SKU when product name changes
  useEffect(() => {
    if (form.name && form.name.trim().length > 2 && !form.base_sku) {
      const name = form.name.trim();
      const skuBase = name.substring(0, 3).toUpperCase().replace(/\s+/g, "");
      const timestamp = Date.now().toString().slice(-6);
      const generatedSKU = `${skuBase}${timestamp}`;

      setForm((prev) => ({
        ...prev,
        base_sku: generatedSKU,
      }));
    }
  }, [form.name]);

  // Auto-fill variant prices when base prices change
  useEffect(() => {
    if (hasVariants && variants.length > 0) {
      const updatedVariants = variants.map((variant) => ({
        ...variant,
        cost_price: variant.cost_price || form.base_cost_price,
        selling_price: variant.selling_price || form.base_selling_price,
        wholesale_price: variant.wholesale_price || form.base_wholesale_price,
      }));
      setVariants(updatedVariants);
    }
  }, [
    form.base_cost_price,
    form.base_selling_price,
    form.base_wholesale_price,
  ]);

  // Update form when variant states change
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      has_variants: hasVariants,
      variant_type: variantType,
    }));
  }, [hasVariants, variantType]);

  // Expand tree to show selected category when modal opens
  useEffect(() => {
    if (showCategoryModal && form.category && categoryTree.length > 0) {
      const expanded = expandToSelectedCategory(
        form.category,
        categoryTree,
        expandedCategories,
      );
      setExpandedCategories(expanded);
    }
  }, [showCategoryModal, form.category, categoryTree]);

  // Load initial data from offline database
  const loadInitialData = async () => {
    try {
      setLoading(true);

      if (businessId && user?.id) {
        const localCategories =
          await databaseService.CategoryService.getCategoriesByBusiness(
            businessId,
            user.server_id,
          );

        if (localCategories && localCategories.length > 0) {
          const tree = buildCategoryTree(localCategories);
          setCategories(localCategories);
          setCategoryTree(tree);
        } else {
          await refreshCategoriesFromServer();
        }
      }

      const localTaxes = await databaseService.TaxService.getTaxes();
      if (localTaxes && localTaxes.length > 0) {
        setTaxes(localTaxes);
      } else {
        await refreshTaxesFromServer();
      }

      setInitialDataLoaded(true);
      setLoading(false);

      fetchUpdatesInBackground();
    } catch (error) {
      console.error("Error loading initial data:", error);
      setLoading(false);
      await fetchDataFromAPI();
    }
  };

  // NEW: Fetch categories using server UUID and save with server UUID as local ID
  const refreshCategoriesFromServer = async () => {
    if (!businessServerId) return;
    try {
      const response = await productAPI.getCategories(businessServerId);
      if (response.success && response.categories) {
        for (const cat of response.categories) {
          const localCategory = {
            ...cat,
            id: cat.id, // server UUID becomes local ID
            business_id: businessId, // local business ID
            business_server_id: cat.business_id, // store server business UUID
            server_id: cat.id, // same as id
          };
          await databaseService.CategoryService.saveCategory(
            localCategory,
            user.id,
          );
        }
        const updatedLocal =
          await databaseService.CategoryService.getCategoriesByBusiness(
            businessId,
            user?.id,
          );
        const tree = buildCategoryTree(updatedLocal);
        setCategories(updatedLocal);
        setCategoryTree(tree);
      }
    } catch (error) {
      console.error("Error refreshing categories from API:", error);
    }
  };

  // NEW: Fetch taxes and save
  const refreshTaxesFromServer = async () => {
    try {
      const response = await productAPI.getTaxes();
      if (response.success && response.taxes) {
        for (const tax of response.taxes) {
          await databaseService.TaxService.saveTax(tax);
        }
        const updatedTaxes = await databaseService.TaxService.getTaxes();
        setTaxes(updatedTaxes);
      }
    } catch (error) {
      console.error("Error refreshing taxes from API:", error);
    }
  };

  const toggleCategoryExpansion = (categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const fetchUpdatesInBackground = async () => {
    if (!businessServerId) return;
    try {
      const categoriesResponse =
        await productAPI.getCategories(businessServerId);
      if (categoriesResponse.success && categoriesResponse.categories) {
        for (const category of categoriesResponse.categories) {
          await databaseService.CategoryService.saveCategory(
            category,
            user?.id,
          );
        }

        const tree = buildCategoryTree(categoriesResponse.categories);
        setCategories(categoriesResponse.categories);
        setCategoryTree(tree);
      }

      const taxesResponse = await productAPI.getTaxes();
      if (taxesResponse.success && taxesResponse.taxes) {
        for (const tax of taxesResponse.taxes) {
          await databaseService.TaxService.saveTax(tax);
        }
        setTaxes(taxesResponse.taxes);
      }
    } catch (error) {
      console.error("Error fetching updates in background:", error);
    }
  };

  const fetchDataFromAPI = async () => {
    if (!businessServerId) return;
    try {
      const categoriesResponse =
        await productAPI.getCategories(businessServerId);
      if (categoriesResponse.success) {
        const tree = buildCategoryTree(categoriesResponse.categories || []);
        setCategories(categoriesResponse.categories || []);
        setCategoryTree(tree);
      }

      const taxesResponse = await productAPI.getTaxes();
      if (taxesResponse.success) {
        setTaxes(taxesResponse.taxes || []);
      }
    } catch (error) {
      console.error("Error fetching data from API:", error);
    }
  };

  const fetchCategoriesFromAPI = async () => {
    if (!businessServerId) return;
    try {
      const categoriesResponse =
        await productAPI.getCategories(businessServerId);
      if (categoriesResponse.success && categoriesResponse.categories) {
        const tree = buildCategoryTree(categoriesResponse.categories);
        setCategories(categoriesResponse.categories);
        setCategoryTree(tree);

        for (const category of categoriesResponse.categories) {
          await databaseService.CategoryService.saveCategory(
            category,
            user?.id,
          );
        }
      }
    } catch (error) {
      console.error("Error fetching categories from API:", error);
    }
  };

  const fetchTaxesFromAPI = async () => {
    try {
      const taxesResponse = await productAPI.getTaxes();
      if (taxesResponse.success && taxesResponse.taxes) {
        setTaxes(taxesResponse.taxes);

        for (const tax of taxesResponse.taxes) {
          await databaseService.TaxService.saveTax(tax);
        }
      }
    } catch (error) {
      console.error("Error fetching taxes from API:", error);
    }
  };

  // Handle category selection
  const handleCategorySelect = (category) => {
    handleChange("category", category.id);

    // Automatically expand the category if it has children
    if (category.children && category.children.length > 0) {
      setExpandedCategories((prev) => ({
        ...prev,
        [category.id]: true,
      }));
    }

    setShowCategoryModal(false);
    // Reset creation state
    setIsCreatingCategory(false);
    setCreatingCategoryParentId(null);
    setNewCategoryName("");
  };

  // Handle creating a new category
  const handleCreateCategory = async (parentId = null) => {
    if (!newCategoryName.trim()) {
      Alert.alert("Error", "Please enter a category name");
      return;
    }

    if (!businessServerId) {
      Alert.alert("Error", "Business ID not found. Please try again.");
      return;
    }

    setCreatingCategoryLoading(true);

    try {
      const categoryData = {
        business_id: businessServerId, // use server UUID
        name: newCategoryName.trim(),
        parent_id: parentId, // parentId is the server UUID (if parent exists)
        color: "#FF6B35",
        is_active: true,
      };

      console.log("Creating category:", categoryData);

      const response = await productAPI.createCategory(categoryData);

      if (response.success) {
        // Refresh categories from server
        await refreshCategoriesFromServer();
        console.log(
          "🔍 Saving category with user.id:",
          user.id,
          "businessId:",
          businessId,
        );

        // Reset creation state
        setIsCreatingCategory(false);
        setCreatingCategoryParentId(null);
        setNewCategoryName("");

        // Select the newly created category
        handleChange("category", response.category.id);

        // Close the modal
        setShowCategoryModal(false);

        Alert.alert(
          "Success",
          `Category "${newCategoryName}" created and selected`,
        );
      } else {
        Alert.alert("Error", response.error || "Failed to create category");
      }
    } catch (error) {
      console.error("Error creating category:", error);
      Alert.alert("Error", "Failed to create category. Please try again.");
    } finally {
      setCreatingCategoryLoading(false);
    }
  };

  // Start creating a new category
  const startCreatingCategory = (parentId = null) => {
    setIsCreatingCategory(true);
    setCreatingCategoryParentId(parentId);
    setNewCategoryName("");
  };

  // Cancel category creation
  const cancelCategoryCreation = () => {
    setIsCreatingCategory(false);
    setCreatingCategoryParentId(null);
    setNewCategoryName("");
  };

  // Auto-generate barcode when requested
  const handleGenerateBarcode = () => {
    const timestamp = Date.now().toString();
    const randomPart = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, "0");
    const generatedBarcode = `BC${timestamp.slice(-10)}${randomPart}`;

    setForm((prev) => ({
      ...prev,
      base_barcode: generatedBarcode,
    }));
  };

  // Simulate barcode scanning
  const handleScanBarcode = () => {
    setScanningBarcode(true);

    setTimeout(() => {
      const dummyBarcode = `978${Math.floor(Math.random() * 10000000000)
        .toString()
        .padStart(10, "0")}`;
      setForm((prev) => ({
        ...prev,
        base_barcode: dummyBarcode,
      }));
      setScanningBarcode(false);

      Alert.alert("Barcode Scanned", `Scanned barcode: ${dummyBarcode}`, [
        { text: "OK" },
      ]);
    }, 1500);
  };

  // Ask user about barcode generation
  const promptBarcodeGeneration = () => {
    Alert.alert(
      "Generate Barcode",
      "Do you want to auto-generate a barcode for this product?",
      [
        {
          text: "No",
          style: "cancel",
          onPress: () => {
            setAutoGenerateBarcode(false);
            setShowBarcodePrompt(false);
          },
        },
        {
          text: "Yes",
          onPress: () => {
            setAutoGenerateBarcode(true);
            handleGenerateBarcode();
            setShowBarcodePrompt(false);
          },
        },
      ],
    );
  };

  useEffect(() => {
    if (showBarcodePrompt) {
      promptBarcodeGeneration();
    }
  }, [showBarcodePrompt]);

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const toggleVariantType = (type) => {
    setVariantType(type);
    setHasVariants(type !== "none");

    if (type === "none") {
      setAttributes([]);
      setVariants([]);
    }
  };

  const toggleHasVariants = (value) => {
    setHasVariants(value);
    if (!value) {
      setVariantType("none");
      setAttributes([]);
      setVariants([]);
    }
  };

  const calculateMargin = () => {
    const cost = parseFloat(form.base_cost_price) || 0;
    const selling = parseFloat(form.base_selling_price) || 0;

    if (cost > 0 && selling > 0) {
      const margin = ((selling - cost) / cost) * 100;
      return margin.toFixed(1);
    }
    return "0.0";
  };

  const calculateTaxAmount = () => {
    if (!form.tax) return { amount: 0, taxRate: 0, taxName: "No Tax" };

    const selectedTax = taxes.find((t) => t.id === form.tax);
    if (!selectedTax) return { amount: 0, taxRate: 0, taxName: "No Tax" };

    const price = parseFloat(form.base_selling_price) || 0;
    if (form.tax_inclusive) {
      const taxRate = selectedTax.rate / 100;
      const taxAmount = price - price / (1 + taxRate);
      return {
        amount: taxAmount.toFixed(2),
        taxRate: selectedTax.rate,
        taxName: selectedTax.name,
      };
    } else {
      const taxAmount = price * (selectedTax.rate / 100);
      return {
        amount: taxAmount.toFixed(2),
        taxRate: selectedTax.rate,
        taxName: selectedTax.name,
      };
    }
  };

  const calculateFinalPrice = () => {
    const price = parseFloat(form.base_selling_price) || 0;
    const taxInfo = calculateTaxAmount();

    if (form.tax_inclusive || !form.tax) {
      return { finalPrice: price, taxAmount: parseFloat(taxInfo.amount) };
    } else {
      return {
        finalPrice: (price + parseFloat(taxInfo.amount)).toFixed(2),
        taxAmount: parseFloat(taxInfo.amount),
      };
    }
  };

  // Attribute management
  const addAttribute = () => {
    setAttributes([...attributes, { name: "", values: [] }]);
  };

  const updateAttribute = (index, field, value) => {
    const newAttributes = [...attributes];
    newAttributes[index][field] = value;
    setAttributes(newAttributes);
  };

  const removeAttribute = (index) => {
    const newAttributes = [...attributes];
    newAttributes.splice(index, 1);
    setAttributes(newAttributes);
  };

  const addAttributeValue = (attributeIndex, value) => {
    const newAttributes = [...attributes];
    if (!newAttributes[attributeIndex].values.includes(value)) {
      newAttributes[attributeIndex].values.push(value);
      setAttributes(newAttributes);
    }
  };

  // Variant generation
  const generateVariants = () => {
    if (attributes.length === 0) {
      Alert.alert(
        "No Attributes",
        "Please add attributes before generating variants.",
      );
      return;
    }

    for (const attr of attributes) {
      if (!attr.name.trim()) {
        Alert.alert(
          "Invalid Attribute",
          "Please enter a name for all attributes.",
        );
        return;
      }
      if (attr.values.length === 0) {
        Alert.alert(
          "No Values",
          `Please add values for attribute "${attr.name}".`,
        );
        return;
      }
    }

    const generateCombinations = (
      arrays,
      index = 0,
      current = {},
      combination = [],
    ) => {
      if (index === arrays.length) {
        combination.push({ ...current });
        return;
      }

      const attr = arrays[index];
      for (const value of attr.values) {
        current[attr.name] = value;
        generateCombinations(arrays, index + 1, current, combination);
      }
    };

    const combinations = [];
    generateCombinations(attributes, 0, {}, combinations);

    const newVariants = combinations.map((combo, index) => {
      const variantName = Object.entries(combo)
        .map(([key, value]) => `${key}: ${value}`)
        .join(" / ");

      const attributeValues = Object.entries(combo).map(
        ([attribute_name, value]) => ({
          attribute_name,
          value,
        }),
      );

      return {
        id: nanoid(),
        name: variantName,
        sku: form.base_sku
          ? `${form.base_sku}-${index + 1}`
          : `V-${Date.now()}-${index + 1}`,
        barcode: "",
        cost_price: form.base_cost_price || "",
        selling_price: form.base_selling_price || "",
        wholesale_price: form.base_wholesale_price || "",
        initial_stock: "0",
        is_default: index === 0,
        is_active: true,
        attribute_values: attributeValues,
      };
    });

    setVariants(newVariants);
    Alert.alert(
      "Variants Generated",
      `Generated ${newVariants.length} variants.`,
    );
  };

  const updateVariant = (index, field, value) => {
    const newVariants = [...variants];
    newVariants[index][field] = value;

    if (field === "is_default" && value === true) {
      newVariants.forEach((v, i) => {
        if (i !== index) {
          v.is_default = false;
        }
      });
    }

    setVariants(newVariants);
  };

  const removeVariant = (index) => {
    const newVariants = [...variants];
    newVariants.splice(index, 1);

    if (variants[index].is_default && newVariants.length > 0) {
      newVariants[0].is_default = true;
    }

    setVariants(newVariants);
  };

  const clearVariants = () => {
    setVariants([]);
    setAttributes([]);
  };

  const validateForm = () => {
    // Debug: print all form inputs and variant states
    console.log("🔍 Form validation - Current state:", {
      name: form.name,
      description: form.description,
      category: form.category,
      product_type: form.product_type,
      hasVariants,
      variantType,
      attributes: attributes.length,
      variants: variants.length,
      base_sku: form.base_sku,
      base_barcode: form.base_barcode,
      base_cost_price: form.base_cost_price,
      base_selling_price: form.base_selling_price,
      base_wholesale_price: form.base_wholesale_price,
      tax: form.tax,
      tax_inclusive: form.tax_inclusive,
      unit_of_measure: form.unit_of_measure,
      reorder_level: form.reorder_level,
      is_trackable: form.is_trackable,
      is_active: form.is_active,
      business: form.business,
      shop: form.shop,
    });

    const newErrors = {};

    // Product name is always required
    if (!form.name.trim()) {
      newErrors.name = "Product name is required";
    }

    // SKU is always required
    if (!form.base_sku.trim()) {
      newErrors.base_sku = "SKU is required";
    } else if (form.base_sku.length > 100) {
      newErrors.base_sku = "SKU cannot exceed 100 characters";
    }

    // --- Pricing validation only for products without variants ---
    if (!hasVariants) {
      const sellingPrice = parseFloat(form.base_selling_price);
      if (!form.base_selling_price || isNaN(sellingPrice) || sellingPrice < 0) {
        newErrors.base_selling_price =
          "Selling price is required and must be a valid number";
      }

      // Optional cost price – only check if provided
      const costPrice = parseFloat(form.base_cost_price);
      if (form.base_cost_price && (isNaN(costPrice) || costPrice < 0)) {
        newErrors.base_cost_price = "Cost price must be a valid number";
      }

      // Optional wholesale price – only check if provided
      const wholesalePrice = parseFloat(form.base_wholesale_price);
      if (
        form.base_wholesale_price &&
        (isNaN(wholesalePrice) || wholesalePrice < 0)
      ) {
        newErrors.base_wholesale_price =
          "Wholesale price must be a valid number";
      }
    }

    // --- Variant validation (if applicable) ---
    if (hasVariants && variantType !== "none") {
      if (attributes.length === 0) {
        newErrors.variants = "Please add attributes for product variants";
      }

      if (variants.length === 0) {
        newErrors.variants = "Please generate variants";
      }

      variants.forEach((variant, index) => {
        if (!variant.selling_price || parseFloat(variant.selling_price) <= 0) {
          newErrors[`variant_${index}_selling_price`] =
            `Variant "${variant.name}" must have a valid selling price`;
        }
      });
    }

    // Barcode validation (optional but length check)
    if (form.base_barcode && form.base_barcode.length > 100) {
      newErrors.base_barcode = "Barcode cannot exceed 100 characters";
    }

    // Business is required (should always be set)
    if (!form.business) {
      newErrors.business = "Business is required";
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    console.log(
      "🔍 Validation result:",
      isValid ? "PASSED" : "FAILED",
      newErrors,
    );
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert("Validation Error", "Please fix the errors in the form");
      return;
    }

    if (!businessServerId) {
      Alert.alert("Error", "Business ID not found. Please try again.");
      return;
    }

    setSaving(true);

    try {
      const productData = {
        name: form.name.trim(),
        description: form.description.trim(),
        category_id: form.category,
        product_type: form.product_type,
        has_variants: hasVariants,
        variant_type: variantType,
        base_barcode: !hasVariants ? form.base_barcode || null : null,
        base_sku: form.base_sku.trim(),
        base_cost_price: form.base_cost_price
          ? parseFloat(form.base_cost_price)
          : null,
        base_selling_price: parseFloat(form.base_selling_price),
        base_wholesale_price: form.base_wholesale_price
          ? parseFloat(form.base_wholesale_price)
          : null,
        tax_id: form.tax || null,
        tax_inclusive: form.tax_inclusive,
        unit_of_measure: form.unit_of_measure,
        reorder_level: parseInt(form.reorder_level) || 10,
        is_trackable: form.is_trackable,
        business_id: businessServerId, // use server UUID
        attributes:
          hasVariants && variantType !== "none"
            ? attributes.map((attr) => ({
                name: attr.name.trim(),
                values: attr.values
                  .filter((v) => v.trim())
                  .map((value) => ({ value: value.trim() })),
              }))
            : [],
        variants:
          hasVariants && variantType !== "none"
            ? variants.map((variant) => ({
                name:
                  variant.name.trim() ||
                  `Variant ${variants.indexOf(variant) + 1}`,
                sku: variant.sku.trim(),
                barcode: variant.barcode || null,
                cost_price: variant.cost_price
                  ? parseFloat(variant.cost_price)
                  : null,
                selling_price: parseFloat(variant.selling_price),
                wholesale_price: variant.wholesale_price
                  ? parseFloat(variant.wholesale_price)
                  : null,
                is_default: variant.is_default || false,
                attribute_values: variant.attribute_values.map((attr) => ({
                  attribute_name: attr.attribute_name,
                  value: attr.value,
                })),
                initial_stock: parseInt(variant.initial_stock) || 0,
              }))
            : [],
        auto_generate_barcode: autoGenerateBarcode && !hasVariants,
      };

      console.log("Submitting product data:", productData);

      const response = await productAPI.createProduct(productData);

      if (response.success) {
        Alert.alert(
          "Success",
          `Product "${form.name}" has been created successfully`,
          [
            {
              text: "View Product",
              onPress: () => {
                navigation.navigate("ProductDetail", {
                  productId: response.product.id,
                  productName: form.name,
                  shopId,
                  shopName,
                  businessId,
                });
              },
            },
            {
              text: "Add Another",
              onPress: () => {
                resetForm();
              },
            },
            {
              text: "Back to List",
              onPress: () => {
                navigation.navigate("ShopProducts", {
                  shopId,
                  shopName,
                  businessId,
                });
              },
            },
          ],
        );
      } else {
        Alert.alert("Error", response.error || "Failed to create product");
      }
    } catch (error) {
      console.error("Error submitting product:", error);
      Alert.alert("Error", "Failed to create product. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      category: null,
      product_type: "physical",
      has_variants: false,
      variant_type: "none",
      base_barcode: "",
      base_sku: "",
      base_cost_price: "",
      base_selling_price: "",
      base_wholesale_price: "",
      tax: null,
      tax_inclusive: true,
      unit_of_measure: "pcs",
      reorder_level: "10",
      is_trackable: true,
      is_active: true,
      business: businessId,
      shop: shopId,
    });
    setHasVariants(false);
    setVariantType("none");
    setVariants([]);
    setAttributes([]);
    setErrors({});
    setAutoGenerateBarcode(false);
    setIsCreatingCategory(false);
    setCreatingCategoryParentId(null);
    setNewCategoryName("");
  };

  const selectedCategory = categories.find((cat) => cat.id === form.category);
  const selectedUnit = UNIT_OF_MEASURES.find(
    (unit) => unit.id === form.unit_of_measure,
  );
  const selectedTax = taxes.find((tax) => tax.id === form.tax);
  const margin = calculateMargin();
  const taxInfo = calculateTaxAmount();
  const priceInfo = calculateFinalPrice();

  const renderAttributeModal = () => (
    <Modal
      visible={showAttributeModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowAttributeModal(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Predefined Attribute</Text>
            <TouchableOpacity
              onPress={() => setShowAttributeModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={PREDEFINED_ATTRIBUTES}
            keyExtractor={(item) => item.name}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.presetAttributeItem}
                onPress={() => {
                  setAttributes([
                    ...attributes,
                    { name: item.name, values: [...item.values] },
                  ]);
                  setShowAttributeModal(false);
                }}
              >
                <View style={styles.presetAttributeIcon}>
                  <Ionicons name={item.icon} size={24} color="#3B82F6" />
                </View>
                <View style={styles.presetAttributeInfo}>
                  <Text style={styles.presetAttributeName}>{item.name}</Text>
                  <Text style={styles.presetAttributeValues}>
                    {item.values.slice(0, 3).join(", ")}...
                  </Text>
                </View>
                <Ionicons name="add-circle" size={24} color="#10B981" />
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderCategoryModal = () => (
    <Modal
      visible={showCategoryModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => {
        setShowCategoryModal(false);
        setIsCreatingCategory(false);
        setCreatingCategoryParentId(null);
        setNewCategoryName("");
        // Reset expanded categories when modal closes
        setExpandedCategories({});
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <TouchableOpacity
              onPress={() => {
                setShowCategoryModal(false);
                setIsCreatingCategory(false);
                setCreatingCategoryParentId(null);
                setNewCategoryName("");
                // Reset expanded categories when modal closes
                setExpandedCategories({});
              }}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {loading && !initialDataLoaded ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF6B00" />
              <Text style={styles.loadingText}>Loading categories...</Text>
            </View>
          ) : (
            <ScrollView style={styles.categoryTreeScroll}>
              {/* Root categories */}
              {categoryTree.length > 0 ? (
                <View>
                  {renderCategoryList({
                    categories: categoryTree,
                    depth: 0,
                    selectedCategoryId: form.category,
                    onSelect: handleCategorySelect,
                    expandedCategories,
                    onToggleExpand: toggleCategoryExpansion,
                    onCreateCategory: startCreatingCategory,
                    isCreating: isCreatingCategory,
                    creatingParentId: creatingCategoryParentId,
                    onCancelCreate: cancelCategoryCreation,
                    onCreateConfirm: handleCreateCategory,
                    newCategoryName,
                    setNewCategoryName,
                    creatingCategoryLoading,
                    parentId: null,
                    shouldRenderAddButton: true,
                  })}

                  {/* Root level add category button */}
                  {isCreatingCategory && creatingCategoryParentId === null ? (
                    <CreateCategoryInput
                      depth={0}
                      parentId={null}
                      onConfirm={handleCreateCategory}
                      onCancel={cancelCategoryCreation}
                      newCategoryName={newCategoryName}
                      setNewCategoryName={setNewCategoryName}
                      creatingCategoryLoading={creatingCategoryLoading}
                    />
                  ) : (
                    <AddCategoryButton
                      depth={0}
                      parentId={null}
                      onPress={startCreatingCategory}
                      isCreating={isCreatingCategory}
                    />
                  )}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="folder-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.emptyStateText}>No categories found</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Create your first category below.
                  </Text>

                  {isCreatingCategory && creatingCategoryParentId === null ? (
                    <CreateCategoryInput
                      depth={0}
                      parentId={null}
                      onConfirm={handleCreateCategory}
                      onCancel={cancelCategoryCreation}
                      newCategoryName={newCategoryName}
                      setNewCategoryName={setNewCategoryName}
                      creatingCategoryLoading={creatingCategoryLoading}
                    />
                  ) : (
                    <TouchableOpacity
                      style={styles.emptyStateButton}
                      onPress={() => startCreatingCategory(null)}
                    >
                      <Ionicons name="add-circle" size={20} color="#3B82F6" />
                      <Text style={styles.emptyStateButtonText}>
                        Add First Category
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderUnitModal = () => (
    <Modal
      visible={showUnitModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowUnitModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Unit of Measure</Text>
            <TouchableOpacity
              onPress={() => setShowUnitModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={UNIT_OF_MEASURES}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.unitItem,
                  form.unit_of_measure === item.id && styles.selectedUnitItem,
                ]}
                onPress={() => {
                  handleChange("unit_of_measure", item.id);
                  setShowUnitModal(false);
                }}
              >
                <Text
                  style={[
                    styles.unitName,
                    form.unit_of_measure === item.id && styles.selectedUnitName,
                  ]}
                >
                  {item.name} ({item.symbol})
                </Text>
                {form.unit_of_measure === item.id && (
                  <Ionicons name="checkmark" size={20} color="#FF6B00" />
                )}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </View>
    </Modal>
  );

  const renderTaxModal = () => (
    <Modal
      visible={showTaxModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowTaxModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Tax</Text>
            <TouchableOpacity
              onPress={() => setShowTaxModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.taxItem, !form.tax && styles.selectedTaxItem]}
            onPress={() => {
              handleChange("tax", null);
              setShowTaxModal(false);
            }}
          >
            <View style={styles.taxInfo}>
              <Text style={styles.taxName}>No Tax</Text>
              <Text style={styles.taxDescription}>Tax exempt product</Text>
            </View>
            {!form.tax && (
              <Ionicons name="checkmark" size={20} color="#FF6B00" />
            )}
          </TouchableOpacity>

          <View style={styles.separator} />

          {loading && taxes.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF6B00" />
              <Text style={styles.loadingText}>Loading taxes...</Text>
            </View>
          ) : taxes.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyStateText}>No taxes configured</Text>
              <Text style={styles.emptyStateSubtext}>
                Configure taxes in your business settings.
              </Text>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={fetchTaxesFromAPI}
              >
                <Ionicons name="refresh" size={20} color="#3B82F6" />
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={taxes.filter((tax) => tax.is_active)}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.taxItem,
                    form.tax === item.id && styles.selectedTaxItem,
                  ]}
                  onPress={() => {
                    handleChange("tax", item.id);
                    setShowTaxModal(false);
                  }}
                >
                  <View style={styles.taxInfo}>
                    <Text
                      style={[
                        styles.taxName,
                        form.tax === item.id && styles.selectedTaxName,
                      ]}
                    >
                      {item.name} ({item.rate}%)
                    </Text>
                    <Text style={styles.taxDescription}>
                      {item.tax_type === "standard"
                        ? "Standard VAT"
                        : item.tax_type === "zero"
                          ? "Zero Rated"
                          : item.tax_type === "exempt"
                            ? "Exempt"
                            : item.tax_type}
                    </Text>
                  </View>
                  {form.tax === item.id && (
                    <Ionicons name="checkmark" size={20} color="#FF6B00" />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              refreshing={loading}
              onRefresh={fetchTaxesFromAPI}
            />
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeaderWithButton
        title="Add New Product"
        leftButtonIcon="arrow-back"
        leftButtonAction={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Shop Info */}
          {shopName && (
            <View style={styles.shopInfoCard}>
              <Ionicons name="storefront" size={24} color="#FF6B00" />
              <View style={styles.shopInfoText}>
                <Text style={styles.shopName}>{shopName}</Text>
                <Text style={styles.shopLabel}>
                  Adding product to this shop
                </Text>
              </View>
            </View>
          )}

          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Basic Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Product Name *</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                value={form.name}
                onChangeText={(text) => handleChange("name", text)}
                placeholder="e.g., Premium Coffee 500g"
                autoCapitalize="words"
                maxLength={255}
              />
              {errors.name && (
                <Text style={styles.errorText}>{errors.name}</Text>
              )}
              <Text style={styles.hintText}>
                Enter name first to auto-generate SKU
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.description}
                onChangeText={(text) => handleChange("description", text)}
                placeholder="Product description..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category</Text>
              <TouchableOpacity
                style={[
                  styles.selectInput,
                  errors.category && styles.inputError,
                ]}
                onPress={() => setShowCategoryModal(true)}
              >
                <Text
                  style={[
                    styles.selectInputText,
                    !form.category && styles.placeholderText,
                  ]}
                >
                  {selectedCategory ? selectedCategory.name : "Select Category"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6B7280" />
              </TouchableOpacity>
              {errors.category && (
                <Text style={styles.errorText}>{errors.category}</Text>
              )}
              <Text style={styles.hintText}>
                Tap to select existing category or create new one
              </Text>
            </View>

            {/* Product Type Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Product Type</Text>
              <View style={styles.productTypeContainer}>
                {PRODUCT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.productTypeOption,
                      form.product_type === type.id &&
                        styles.selectedProductTypeOption,
                    ]}
                    onPress={() => handleChange("product_type", type.id)}
                  >
                    <Ionicons
                      name={type.icon}
                      size={16}
                      color={
                        form.product_type === type.id ? "#FF6B00" : "#6B7280"
                      }
                    />
                    <Text
                      style={[
                        styles.productTypeText,
                        form.product_type === type.id &&
                          styles.selectedProductTypeText,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Identification */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔍 Identification</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>SKU *</Text>
              <View style={styles.skuContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.skuInput,
                    errors.base_sku && styles.inputError,
                  ]}
                  value={form.base_sku}
                  onChangeText={(text) => handleChange("base_sku", text)}
                  placeholder="Auto-generated from name"
                  autoCapitalize="characters"
                  maxLength={100}
                  editable={!!form.name}
                />
                {!form.base_sku && (
                  <TouchableOpacity
                    style={styles.generateButtonSmall}
                    onPress={() => {
                      if (!form.name) {
                        Alert.alert(
                          "Product Name Required",
                          "Please enter product name first",
                        );
                        return;
                      }
                      const name = form.name.trim();
                      const skuBase = name
                        .substring(0, 3)
                        .toUpperCase()
                        .replace(/\s+/g, "");
                      const timestamp = Date.now().toString().slice(-6);
                      handleChange("base_sku", `${skuBase}${timestamp}`);
                    }}
                  >
                    <Ionicons name="refresh" size={16} color="#3B82F6" />
                    <Text style={styles.generateButtonTextSmall}>Generate</Text>
                  </TouchableOpacity>
                )}
              </View>
              {errors.base_sku && (
                <Text style={styles.errorText}>{errors.base_sku}</Text>
              )}
              <Text style={styles.hintText}>
                Auto-generated when you enter product name
              </Text>
            </View>
          </View>

          {/* Variant Configuration - MOVED BEFORE PRICING */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔄 Product Variants</Text>

            <View style={styles.variantToggle}>
              <Text style={styles.variantToggleLabel}>Has Variants:</Text>
              <Switch
                value={hasVariants}
                onValueChange={toggleHasVariants}
                trackColor={{ false: "#D1D5DB", true: "#FF6B00" }}
                thumbColor="#fff"
              />
            </View>

            {hasVariants && (
              <>
                <View style={styles.variantTypeSection}>
                  <Text style={styles.variantTypeLabel}>Variant Type:</Text>
                  <View style={styles.variantTypeOptions}>
                    {VARIANT_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type.id}
                        style={[
                          styles.variantTypeOption,
                          variantType === type.id &&
                            styles.selectedVariantTypeOption,
                        ]}
                        onPress={() => toggleVariantType(type.id)}
                      >
                        <Ionicons
                          name={type.icon}
                          size={16}
                          color={
                            variantType === type.id ? "#FF6B00" : "#6B7280"
                          }
                        />
                        <Text
                          style={[
                            styles.variantTypeOptionText,
                            variantType === type.id &&
                              styles.selectedVariantTypeOptionText,
                          ]}
                        >
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {variantType !== "none" && (
                  <>
                    {/* Attributes Section */}
                    <View style={styles.attributesSection}>
                      <View style={styles.sectionHeader}>
                        <Text style={styles.attributesTitle}>Attributes</Text>
                        <View style={styles.attributeButtons}>
                          <TouchableOpacity
                            style={styles.addButton}
                            onPress={addAttribute}
                          >
                            <Ionicons name="add" size={20} color="#fff" />
                            <Text style={styles.addButtonText}>Custom</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.addButton, styles.presetButton]}
                            onPress={() => setShowAttributeModal(true)}
                          >
                            <Ionicons name="list" size={20} color="#fff" />
                            <Text style={styles.addButtonText}>Preset</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {attributes.length === 0 ? (
                        <View style={styles.emptyAttributes}>
                          <Ionicons
                            name="pricetag-outline"
                            size={48}
                            color="#D1D5DB"
                          />
                          <Text style={styles.emptyAttributesText}>
                            No attributes added
                          </Text>
                          <Text style={styles.emptyAttributesSubtext}>
                            Add attributes like Size, Color, Weight, etc.
                          </Text>
                        </View>
                      ) : (
                        attributes.map((attribute, index) => (
                          <AttributeItem
                            key={index}
                            attribute={attribute}
                            index={index}
                            onUpdate={updateAttribute}
                            onRemove={removeAttribute}
                            onAddValue={addAttributeValue}
                          />
                        ))
                      )}
                    </View>

                    {/* Variants Section */}
                    <View style={styles.variantsSection}>
                      <View style={styles.sectionHeader}>
                        <Text style={styles.variantsTitle}>
                          Variants{" "}
                          {variants.length > 0 && `(${variants.length})`}
                        </Text>
                        <View style={styles.variantButtons}>
                          {attributes.length > 0 && (
                            <TouchableOpacity
                              style={styles.generateButton}
                              onPress={generateVariants}
                            >
                              <Ionicons name="shuffle" size={20} color="#fff" />
                              <Text style={styles.generateButtonText}>
                                Generate
                              </Text>
                            </TouchableOpacity>
                          )}
                          {variants.length > 0 && (
                            <TouchableOpacity
                              style={styles.clearButton}
                              onPress={clearVariants}
                            >
                              <Ionicons name="trash" size={20} color="#fff" />
                              <Text style={styles.clearButtonText}>Clear</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>

                      {variants.length === 0 ? (
                        <View style={styles.emptyVariants}>
                          <Ionicons
                            name="options-outline"
                            size={48}
                            color="#D1D5DB"
                          />
                          <Text style={styles.emptyVariantsText}>
                            No variants generated
                          </Text>
                          <Text style={styles.emptyVariantsSubtext}>
                            Add attributes and click "Generate" to create
                            variants
                          </Text>
                        </View>
                      ) : (
                        variants.map((variant, index) => (
                          <VariantItem
                            key={index}
                            variant={variant}
                            index={index}
                            onUpdate={updateVariant}
                            onRemove={removeVariant}
                          />
                        ))
                      )}
                    </View>
                  </>
                )}
              </>
            )}
          </View>

          {/* Pricing Section - Always visible */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💰 Pricing</Text>
            {hasVariants && variantType !== "none" && (
              <View style={styles.basePriceInfo}>
                <Ionicons name="information-circle" size={20} color="#3B82F6" />
                <Text style={styles.basePriceInfoText}>
                  These are the default prices. Variants will use them unless
                  you set specific prices per variant.
                </Text>
              </View>
            )}

            <View style={styles.pricingGrid}>
              <View style={styles.pricingCard}>
                <Text style={styles.pricingLabel}>Cost Price</Text>
                <View
                  style={[
                    styles.priceInputContainer,
                    errors.base_cost_price && styles.inputError,
                  ]}
                >
                  <Text style={styles.currencySymbol}>KES</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={form.base_cost_price}
                    onChangeText={(text) =>
                      handleChange("base_cost_price", text)
                    }
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </View>
                {errors.base_cost_price && (
                  <Text style={[styles.errorText, styles.centerError]}>
                    {errors.base_cost_price}
                  </Text>
                )}
                <Text style={styles.pricingHint}>Buying price (optional)</Text>
              </View>

              <View style={styles.pricingCard}>
                <Text style={styles.pricingLabel}>Selling Price *</Text>
                <View
                  style={[
                    styles.priceInputContainer,
                    errors.base_selling_price && styles.inputError,
                  ]}
                >
                  <Text style={styles.currencySymbol}>KES</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={form.base_selling_price}
                    onChangeText={(text) =>
                      handleChange("base_selling_price", text)
                    }
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </View>
                {errors.base_selling_price && (
                  <Text style={[styles.errorText, styles.centerError]}>
                    {errors.base_selling_price}
                  </Text>
                )}
                <Text style={styles.pricingHint}>
                  {hasVariants
                    ? "Default retail price (overridable per variant)"
                    : "Retail price"}
                </Text>
              </View>

              <View style={styles.pricingCard}>
                <Text style={styles.pricingLabel}>Wholesale Price</Text>
                <View
                  style={[
                    styles.priceInputContainer,
                    errors.base_wholesale_price && styles.inputError,
                  ]}
                >
                  <Text style={styles.currencySymbol}>KES</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={form.base_wholesale_price}
                    onChangeText={(text) =>
                      handleChange("base_wholesale_price", text)
                    }
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </View>
                {errors.base_wholesale_price && (
                  <Text style={[styles.errorText, styles.centerError]}>
                    {errors.base_wholesale_price}
                  </Text>
                )}
                <Text style={styles.pricingHint}>Bulk price (optional)</Text>
              </View>

              <View style={styles.pricingCard}>
                <Text style={styles.pricingLabel}>Profit Margin</Text>
                <View style={styles.marginDisplay}>
                  <Text
                    style={[
                      styles.marginValue,
                      {
                        color: parseFloat(margin) >= 0 ? "#16A34A" : "#DC2626",
                      },
                    ]}
                  >
                    {margin}%
                  </Text>
                </View>
                <Text style={styles.pricingHint}>
                  {parseFloat(margin) >= 0 ? "Profit" : "Loss"}
                </Text>
              </View>
            </View>
          </View>

          {/* Tax Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Tax Settings</Text>

            <View style={styles.taxRow}>
              <View style={styles.taxInfoContainer}>
                <Text style={styles.inputLabel}>Tax</Text>
                <TouchableOpacity
                  style={styles.selectInput}
                  onPress={() => setShowTaxModal(true)}
                >
                  <Text
                    style={[
                      styles.selectInputText,
                      !form.tax && styles.placeholderText,
                    ]}
                  >
                    {selectedTax
                      ? `${selectedTax.name} (${selectedTax.rate}%)`
                      : "No Tax"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {form.tax && (
                <View style={styles.taxInclusiveToggle}>
                  <Text style={styles.taxLabel}>Tax Inclusive</Text>
                  <Switch
                    value={form.tax_inclusive}
                    onValueChange={(value) =>
                      handleChange("tax_inclusive", value)
                    }
                    trackColor={{ false: "#D1D5DB", true: "#FF6B00" }}
                    thumbColor="#fff"
                  />
                </View>
              )}
            </View>

            {form.tax && (
              <>
                {/* Tax Summary */}
                <TaxSummary
                  variants={variants}
                  baseSellingPrice={form.base_selling_price}
                  taxRate={selectedTax?.rate || 0}
                  taxInclusive={form.tax_inclusive}
                  taxName={selectedTax?.name || "Tax"}
                  hasVariants={hasVariants && variantType !== "none"}
                />

                {/* Tax Calculation Details */}
                <View style={styles.taxDetailsSection}>
                  <Text style={styles.taxDetailsTitle}>
                    {hasVariants && variantType !== "none"
                      ? `Tax Calculations (${variants.length} ${variants.length === 1 ? "Variant" : "Variants"})`
                      : "Tax Calculation Details"}
                  </Text>

                  <TaxCalculationTable
                    variants={variants}
                    baseSellingPrice={form.base_selling_price}
                    taxRate={selectedTax?.rate || 0}
                    taxInclusive={form.tax_inclusive}
                    taxName={selectedTax?.name || "Tax"}
                    hasVariants={hasVariants && variantType !== "none"}
                    variantType={variantType}
                  />
                </View>
              </>
            )}
          </View>

          {/* Product Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📦 Product Details</Text>

            <View style={styles.dualInput}>
              <View style={styles.inputHalf}>
                <Text style={styles.inputLabel}>Unit of Measure *</Text>
                <TouchableOpacity
                  style={[
                    styles.selectInput,
                    errors.unit_of_measure && styles.inputError,
                  ]}
                  onPress={() => setShowUnitModal(true)}
                >
                  <Text
                    style={[
                      styles.selectInputText,
                      !form.unit_of_measure && styles.placeholderText,
                    ]}
                  >
                    {selectedUnit
                      ? `${selectedUnit.name} (${selectedUnit.symbol})`
                      : "Select Unit"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6B7280" />
                </TouchableOpacity>
                {errors.unit_of_measure && (
                  <Text style={styles.errorText}>{errors.unit_of_measure}</Text>
                )}
              </View>

              <View style={styles.inputHalf}>
                <Text style={styles.inputLabel}>Reorder Level</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.reorder_level && styles.inputError,
                  ]}
                  value={form.reorder_level}
                  onChangeText={(text) => handleChange("reorder_level", text)}
                  placeholder="10"
                  keyboardType="numeric"
                />
                {errors.reorder_level && (
                  <Text style={styles.errorText}>{errors.reorder_level}</Text>
                )}
              </View>
            </View>

            {!hasVariants && (
              <View style={styles.dualInput}>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>Minimum Stock</Text>
                  <TextInput
                    style={[styles.input]}
                    value="5"
                    editable={false}
                  />
                </View>

                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>Initial Stock</Text>
                  <TextInput
                    style={[styles.input]}
                    value="0"
                    editable={false}
                  />
                </View>
              </View>
            )}

            <View style={styles.toggleRow}>
              <View style={styles.toggleItem}>
                <Text style={styles.toggleLabel}>Track Stock</Text>
                <Switch
                  value={form.is_trackable}
                  onValueChange={(value) => handleChange("is_trackable", value)}
                  trackColor={{ false: "#D1D5DB", true: "#FF6B00" }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.toggleItem}>
                <Text style={styles.toggleLabel}>Active Product</Text>
                <Switch
                  value={form.is_active}
                  onValueChange={(value) => handleChange("is_active", value)}
                  trackColor={{ false: "#D1D5DB", true: "#FF6B00" }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          </View>

          {/* BARCODE SECTION - Only show for products without variants */}
          {!hasVariants && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📷 Product Barcode</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Barcode</Text>
                <View style={styles.barcodeSection}>
                  <View style={styles.barcodeInputContainer}>
                    <TextInput
                      style={[
                        styles.input,
                        styles.barcodeInput,
                        errors.base_barcode && styles.inputError,
                      ]}
                      value={form.base_barcode}
                      onChangeText={(text) =>
                        handleChange("base_barcode", text)
                      }
                      placeholder="Enter or scan barcode"
                      keyboardType="numeric"
                      maxLength={100}
                    />
                    {form.base_barcode ? (
                      <TouchableOpacity
                        style={styles.clearButton}
                        onPress={() => handleChange("base_barcode", "")}
                      >
                        <Ionicons
                          name="close-circle"
                          size={20}
                          color="#9CA3AF"
                        />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <View style={styles.barcodeButtons}>
                    <TouchableOpacity
                      style={[
                        styles.barcodeButton,
                        scanningBarcode && styles.barcodeButtonDisabled,
                      ]}
                      onPress={handleScanBarcode}
                      disabled={scanningBarcode}
                    >
                      {scanningBarcode ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="camera" size={20} color="#fff" />
                          <Text style={styles.barcodeButtonText}>Scan</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.barcodeButton}
                      onPress={handleGenerateBarcode}
                    >
                      <Ionicons name="barcode" size={20} color="#fff" />
                      <Text style={styles.barcodeButtonText}>Generate</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {errors.base_barcode && (
                  <Text style={styles.errorText}>{errors.base_barcode}</Text>
                )}

                <View style={styles.barcodeOptions}>
                  <TouchableOpacity
                    style={styles.barcodeOption}
                    onPress={() => setShowBarcodePrompt(true)}
                  >
                    <Ionicons
                      name={autoGenerateBarcode ? "checkbox" : "square-outline"}
                      size={20}
                      color={autoGenerateBarcode ? "#FF6B00" : "#6B7280"}
                    />
                    <Text
                      style={[
                        styles.barcodeOptionText,
                        autoGenerateBarcode && styles.barcodeOptionTextActive,
                      ]}
                    >
                      Auto-generate barcode on save
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.barcodeHint}>
                    {scanningBarcode
                      ? "Scanning..."
                      : autoGenerateBarcode
                        ? "✓ Barcode will be auto-generated"
                        : "Scan with camera or generate random barcode"}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Product Preview */}
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Product Preview</Text>
            <View style={styles.previewContent}>
              <View style={styles.previewIcon}>
                <Ionicons
                  name="cube"
                  size={32}
                  color={selectedCategory?.color || "#FF6B00"}
                />
              </View>
              <View style={styles.previewInfo}>
                <Text style={styles.previewName}>
                  {form.name || "Product Name"}
                </Text>
                {form.description ? (
                  <Text style={styles.previewDescription} numberOfLines={2}>
                    {form.description}
                  </Text>
                ) : null}
                <View style={styles.previewDetails}>
                  {form.base_sku && (
                    <Text style={styles.previewDetail}>
                      SKU: {form.base_sku}
                    </Text>
                  )}
                  {form.category && (
                    <Text style={styles.previewDetail}>
                      Category: {selectedCategory?.name}
                    </Text>
                  )}
                  {hasVariants && variantType !== "none" ? (
                    <Text style={styles.previewDetail}>
                      {variants.length} variants
                    </Text>
                  ) : (
                    <>
                      {form.base_cost_price && (
                        <Text style={styles.previewDetail}>
                          Cost: KES {form.base_cost_price}
                        </Text>
                      )}
                      {form.base_selling_price && (
                        <Text style={styles.previewDetail}>
                          Sell: KES {form.base_selling_price}
                          {form.tax &&
                            ` (${selectedTax?.rate}% tax ${form.tax_inclusive ? "inclusive" : "exclusive"})`}
                        </Text>
                      )}
                      {!hasVariants && form.base_barcode && (
                        <Text style={styles.previewDetail}>
                          Barcode: {form.base_barcode}
                        </Text>
                      )}
                    </>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Help Information */}
          <View style={styles.helpCard}>
            <Ionicons name="information-circle" size={24} color="#3B82F6" />
            <View style={styles.helpContent}>
              <Text style={styles.helpTitle}>Important Notes</Text>
              <Text style={styles.helpText}>
                • Product name is required to auto-generate SKU{"\n"}• Selling
                price is required for all products{"\n"}• Base prices auto-fill
                variant prices{"\n"}• Configure variants after setting base
                prices{"\n"}• Tax inclusive means tax is included in price{"\n"}
                • Click any category to expand it, tick means selected{"\n"}•
                Scroll to bottom to add new category if not found{"\n"}
                {hasVariants
                  ? "• Each variant will have its own barcode"
                  : "• Barcode is optional but recommended"}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.actionButton, styles.cancelButton]}
          onPress={() => navigation.goBack()}
          disabled={saving}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.submitButton,
            saving && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>
                {hasVariants
                  ? `Add Product (${variants.length} variants)`
                  : "Create Product"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Modals */}
      {renderCategoryModal()}
      {renderAttributeModal()}
      {renderUnitModal()}
      {renderTaxModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  shopInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7F0",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#FFD7B5",
  },
  shopInfoText: {
    marginLeft: 12,
    flex: 1,
  },
  shopName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF6B00",
    marginBottom: 2,
  },
  shopLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 4,
  },
  hintText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },
  centerError: {
    textAlign: "center",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  productTypeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  productTypeOption: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginHorizontal: 4,
  },
  selectedProductTypeOption: {
    backgroundColor: "#FFF7F0",
    borderColor: "#FF6B00",
  },
  productTypeText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
  },
  selectedProductTypeText: {
    color: "#FF6B00",
    fontWeight: "600",
  },
  dualInput: {
    flexDirection: "row",
    marginHorizontal: -6,
    marginBottom: 16,
  },
  inputHalf: {
    flex: 1,
    marginHorizontal: 6,
  },
  selectInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  selectInputText: {
    fontSize: 16,
    color: "#1F2937",
  },
  placeholderText: {
    color: "#9ca3af",
  },
  skuContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  skuInput: {
    flex: 1,
    marginRight: 8,
  },
  generateButtonSmall: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  generateButtonTextSmall: {
    fontSize: 12,
    color: "#3B82F6",
    fontWeight: "500",
    marginLeft: 4,
  },
  barcodeSection: {
    marginTop: 8,
  },
  barcodeInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  barcodeInput: {
    flex: 1,
    paddingRight: 40,
  },
  clearButton: {
    position: "absolute",
    right: 12,
    padding: 4,
  },
  barcodeButtons: {
    flexDirection: "row",
    gap: 12,
  },
  barcodeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    backgroundColor: "#4F46E5",
    borderRadius: 8,
  },
  barcodeButtonDisabled: {
    backgroundColor: "#A5B4FC",
  },
  barcodeButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
  },
  barcodeOptions: {
    marginTop: 16,
  },
  barcodeOption: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  barcodeOptionText: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 8,
  },
  barcodeOptionTextActive: {
    color: "#FF6B00",
    fontWeight: "600",
  },
  barcodeHint: {
    fontSize: 12,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  pricingGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  pricingCard: {
    width: "48%",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    margin: 6,
    alignItems: "center",
  },
  pricingLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  priceInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
    marginBottom: 4,
  },
  currencySymbol: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#6B7280",
    backgroundColor: "#f3f4f6",
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb",
  },
  priceInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#1F2937",
    textAlign: "center",
  },
  marginDisplay: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 4,
    width: "100%",
  },
  marginValue: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  pricingHint: {
    fontSize: 11,
    color: "#9ca3af",
    textAlign: "center",
  },
  variantToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  variantToggleLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  variantTypeSection: {
    marginBottom: 20,
  },
  variantTypeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },
  variantTypeOptions: {
    flexDirection: "row",
    gap: 8,
  },
  variantTypeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  selectedVariantTypeOption: {
    backgroundColor: "#FFF7F0",
    borderColor: "#FF6B00",
  },
  variantTypeOptionText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 4,
    fontWeight: "500",
  },
  selectedVariantTypeOptionText: {
    color: "#FF6B00",
    fontWeight: "600",
  },
  attributesSection: {
    marginBottom: 20,
  },
  variantsSection: {
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  attributesTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
  },
  variantsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
  },
  attributeButtons: {
    flexDirection: "row",
    gap: 8,
  },
  variantButtons: {
    flexDirection: "row",
    gap: 8,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3B82F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  presetButton: {
    backgroundColor: "#8B5CF6",
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  generateButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EF4444",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  emptyAttributes: {
    alignItems: "center",
    padding: 32,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
  },
  emptyAttributesText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 16,
  },
  emptyAttributesSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 4,
  },
  emptyVariants: {
    alignItems: "center",
    padding: 32,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
  },
  emptyVariantsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 16,
  },
  emptyVariantsSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 4,
  },
  attributeCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  attributeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  attributeHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  attributeNameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginLeft: 8,
    padding: 4,
  },
  removeButton: {
    padding: 4,
  },
  attributeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },
  valuesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  valueTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 4,
  },
  valueText: {
    fontSize: 14,
    color: "#1F2937",
  },
  valueInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  valueInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  addValueButton: {
    padding: 8,
  },
  cancelValueButton: {
    padding: 8,
  },
  addValueButtonSmall: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: "#3B82F6",
    borderStyle: "dashed",
    gap: 4,
  },
  addValueText: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "500",
  },
  variantCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  variantHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 0,
  },
  variantHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  variantName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginLeft: 8,
  },
  defaultBadge: {
    backgroundColor: "#FF6B00",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  defaultBadgeText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "600",
  },
  variantContent: {
    marginTop: 16,
  },
  variantRow: {
    flexDirection: "row",
    marginHorizontal: -6,
    marginBottom: 16,
  },
  variantInputGroup: {
    flex: 1,
    marginHorizontal: 6,
  },
  variantLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },
  variantInput: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  variantBarcodeButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  variantBarcodeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  variantBarcodeButtonText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "500",
  },
  scanButton: {
    backgroundColor: "#4F46E5",
  },
  generateButton: {
    backgroundColor: "#10B981",
  },
  variantAttributes: {
    marginTop: 8,
  },
  attributeTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  attributeTag: {
    backgroundColor: "#E0E7FF",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  attributeTagText: {
    fontSize: 12,
    color: "#4F46E5",
    fontWeight: "500",
  },
  variantToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  toggleLabel: {
    fontSize: 14,
    color: "#1F2937",
    marginRight: 12,
  },
  basePriceInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  basePriceInfoText: {
    flex: 1,
    fontSize: 14,
    color: "#3B82F6",
    lineHeight: 18,
  },
  taxRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  taxInfoContainer: {
    flex: 1,
  },
  taxInclusiveToggle: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 16,
  },
  taxLabel: {
    fontSize: 14,
    color: "#1F2937",
    marginRight: 8,
  },
  // Enhanced Tax Calculator Styles
  taxCalculatorCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  taxCalculatorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  taxCalculatorTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  taxCalculatorVariant: {
    fontSize: 12,
    color: "#6B7280",
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: width * 0.4,
  },
  taxCalculationGrid: {
    gap: 8,
  },
  taxCalculationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  taxCalculationLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  taxCalculationValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  finalPriceHighlight: {
    color: "#FF6B00",
    fontWeight: "600",
  },
  taxSummary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  taxSummaryText: {
    flex: 1,
    fontSize: 14,
    color: "#3B82F6",
    lineHeight: 18,
  },
  // New Tax Calculation Table Styles
  taxDetailsSection: {
    marginTop: 20,
  },
  taxDetailsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  taxSummaryContainer: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  taxSummaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  taxSummaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
    marginBottom: 8,
  },
  taxSummaryItem: {
    width: "50%",
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  taxSummaryItemLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  taxSummaryItemValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  taxAmountValue: {
    color: "#EF4444",
  },
  revenueValue: {
    color: "#10B981",
  },
  taxSummaryNote: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
    marginTop: 8,
  },
  noTaxContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 32,
    marginTop: 16,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
  },
  noTaxText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 12,
  },
  // Tax Table Styles (for wide screens)
  taxTableContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
    marginTop: 12,
  },
  taxTableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  taxTableHeaderText: {
    flex: 1,
    padding: 12,
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: "center",
  },
  taxTableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  defaultVariantRow: {
    backgroundColor: "#FFF7F0",
  },
  taxTableCell: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: "#1F2937",
    textAlign: "center",
  },
  finalPriceCell: {
    color: "#FF6B00",
    fontWeight: "600",
  },
  notDefaultText: {
    color: "#9CA3AF",
  },
  // Tax Card Styles (for mobile)
  taxCardsContainer: {
    marginTop: 12,
  },
  taxCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  defaultTaxCard: {
    borderColor: "#FF6B00",
    backgroundColor: "#FFF7F0",
  },
  taxCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  taxCardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  taxCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginLeft: 8,
    flex: 1,
  },
  taxCardSummary: {
    alignItems: "flex-end",
  },
  taxCardPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF6B00",
  },
  taxCardTax: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  taxCardContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  taxDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  taxDetailLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  taxDetailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  finalPriceRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  finalPriceLabel: {
    fontWeight: "600",
    color: "#1F2937",
  },
  finalPriceValue: {
    fontWeight: "600",
    color: "#FF6B00",
    fontSize: 16,
  },
  defaultBadgeSmall: {
    backgroundColor: "#FF6B00",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  defaultBadgeSmallText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "600",
  },
  variantAttributesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  variantAttributesLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },
  variantAttributesTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  variantAttributeTag: {
    backgroundColor: "#E0E7FF",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  variantAttributeTagText: {
    fontSize: 11,
    color: "#4F46E5",
    fontWeight: "500",
  },
  // Enhanced Category Selection Styles
  categoryItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 56,
  },

  categoryMainArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingRight: 12,
  },

  highlightedCategory: {
    backgroundColor: "#FFF7F0",
    borderRadius: 8,
  },

  categoryLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  tickButton: {
    padding: 12,
    marginLeft: 8,
  },

  tickContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  tickSelected: {
    backgroundColor: "#FF6B00",
  },

  tickUnselected: {
    borderWidth: 2,
    borderColor: "#E5E7EB",
    backgroundColor: "transparent",
  },

  selectedCategoryName: {
    color: "#FF6B00",
    fontWeight: "600",
  },

  expandButton: {
    marginRight: 8,
  },

  childIndicator: {
    width: 36,
    alignItems: "center",
  },

  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  categoryInfo: {
    flex: 1,
  },

  categoryName: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
  },

  categoryDescription: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },

  // Add Category Button Styles
  addCategoryButton: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    backgroundColor: "#f9fafb",
  },

  addCategoryButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },

  addCategoryButtonText: {
    fontSize: 16,
    color: "#3B82F6",
    fontWeight: "500",
    marginLeft: 8,
  },

  // Create Category Input Styles
  createCategoryInput: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#f9fafb",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },

  createCategoryInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  createCategoryTextInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginRight: 8,
  },

  createCategoryConfirmButton: {
    padding: 12,
    backgroundColor: "#f0fdf4",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },

  createCategoryCancelButton: {
    padding: 12,
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
    marginLeft: 8,
  },

  categoryTreeScroll: {
    maxHeight: 400,
  },

  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },

  toggleItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  previewCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  previewTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },

  previewContent: {
    flexDirection: "row",
    alignItems: "center",
  },

  previewIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#FFF7F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },

  previewInfo: {
    flex: 1,
  },

  previewName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },

  previewDescription: {
    fontSize: 14,
    color: "#6B7280",
  },

  previewDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },

  previewDetail: {
    fontSize: 12,
    color: "#9CA3AF",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },

  helpCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },

  helpContent: {
    flex: 1,
    marginLeft: 12,
  },

  helpTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3B82F6",
    marginBottom: 8,
  },

  helpText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },

  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingBottom: Platform.OS === "ios" ? 34 : 0,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },

  modalCloseButton: {
    padding: 4,
  },

  loadingContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 12,
  },

  emptyState: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 16,
  },

  emptyStateSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 4,
  },

  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 16,
    gap: 4,
  },

  refreshButtonText: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "500",
  },

  presetAttributeItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },

  presetAttributeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  presetAttributeInfo: {
    flex: 1,
  },

  presetAttributeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },

  presetAttributeValues: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 2,
  },

  unitItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },

  selectedUnitItem: {
    backgroundColor: "#FFF7F0",
  },

  unitName: {
    fontSize: 16,
    color: "#1F2937",
  },

  selectedUnitName: {
    color: "#FF6B00",
    fontWeight: "600",
  },

  taxItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },

  selectedTaxItem: {
    backgroundColor: "#FFF7F0",
  },

  taxInfo: {
    flex: 1,
  },

  taxName: {
    fontSize: 16,
    color: "#1F2937",
  },

  selectedTaxName: {
    color: "#FF6B00",
    fontWeight: "600",
  },

  taxDescription: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 2,
  },

  separator: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 16,
  },

  // Action Bar Styles
  actionBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },

  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    marginHorizontal: 8,
  },

  cancelButton: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },

  submitButton: {
    backgroundColor: "#FF6B00",
  },

  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 8,
  },

  buttonDisabled: {
    backgroundColor: "#FFA94D",
  },

  emptyStateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  emptyStateButtonText: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "500",
  },
});
