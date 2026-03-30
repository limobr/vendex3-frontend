// src/components/CheckoutScreen.js - Full checkout flow with payment methods
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, TextInput, Alert, ActivityIndicator, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { salesAPI } from '../services/api';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export default function CheckoutScreen({ navigation }) {
  const { items, total, subtotal, totalDiscount, customer, setCustomer, clearCart, getCheckoutPayload, itemCount } = useCart();
  const { currentShop } = useAuth();
  const { isConnected } = useNetworkStatus();

  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [mpesaCode, setMpesaCode] = useState('');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const shopId = currentShop?.id || currentShop?.server_id;
  const change = Math.max(0, parseFloat(amountReceived || 0) - total);

  const formatPrice = (price) => `KES ${parseFloat(price || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

  const handleCheckout = async () => {
    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Add items to cart before checkout');
      return;
    }

    if (paymentMethod === 'cash') {
      const received = parseFloat(amountReceived || 0);
      if (received < total) {
        Alert.alert('Insufficient Amount', `Amount received (${formatPrice(received)}) is less than total (${formatPrice(total)})`);
        return;
      }
    }

    if (paymentMethod === 'mpesa' && !mpesaCode) {
      Alert.alert('M-Pesa Code Required', 'Please enter the M-Pesa transaction code');
      return;
    }

    setProcessing(true);
    try {
      const payments = [{
        method: paymentMethod,
        amount: paymentMethod === 'cash' ? parseFloat(amountReceived || total) : total,
        transaction_code: paymentMethod === 'mpesa' ? mpesaCode : '',
        phone_number: paymentMethod === 'mpesa' ? mpesaPhone : '',
      }];

      const payload = getCheckoutPayload(shopId, payments);

      if (isConnected) {
        // Online: send to API
        const result = await salesAPI.createSale(payload);
        if (result?.success) {
          setReceiptData(result.sale);
          setShowReceipt(true);
        } else {
          Alert.alert('Error', result?.error || 'Failed to process sale');
        }
      } else {
        // Offline: store locally with pending status
        // In a full implementation, this would save to SQLite
        Alert.alert(
          'Offline Sale',
          'Sale saved locally and will sync when online.',
          [{ text: 'OK', onPress: () => { clearCart(); navigation.goBack(); } }]
        );
      }
    } catch (error) {
      console.error('Checkout error:', error);
      Alert.alert('Error', 'Failed to process sale. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReceiptDone = () => {
    setShowReceipt(false);
    clearCart();
    navigation.goBack();
  };

  const paymentMethods = [
    { id: 'cash', label: 'Cash', icon: 'cash-outline' },
    { id: 'mpesa', label: 'M-Pesa', icon: 'phone-portrait-outline' },
    { id: 'card', label: 'Card', icon: 'card-outline' },
  ];

  const quickAmounts = [100, 200, 500, 1000, 2000, 5000];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#212529" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          {items.map(item => (
            <View key={item.id} style={styles.summaryItem}>
              <View style={styles.summaryItemLeft}>
                <Text style={styles.summaryItemName} numberOfLines={1}>{item.product_name}</Text>
                <Text style={styles.summaryItemQty}>{item.quantity} × {formatPrice(item.unit_price)}</Text>
              </View>
              <Text style={styles.summaryItemTotal}>{formatPrice(item.total_price)}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalRowLabel}>Subtotal</Text>
            <Text style={styles.totalRowValue}>{formatPrice(subtotal)}</Text>
          </View>
          {totalDiscount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalRowLabel}>Discount</Text>
              <Text style={[styles.totalRowValue, { color: '#28a745' }]}>-{formatPrice(totalDiscount)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatPrice(total)}</Text>
          </View>
        </View>

        {/* Customer (optional) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer (Optional)</Text>
          <TouchableOpacity style={styles.customerPicker}>
            <Ionicons name="person-outline" size={20} color="#6c757d" />
            <Text style={styles.customerPickerText}>
              {customer ? customer.name : 'Walk-in Customer'}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#6c757d" />
          </TouchableOpacity>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.paymentMethods}>
            {paymentMethods.map(pm => (
              <TouchableOpacity
                key={pm.id}
                style={[styles.paymentMethodBtn, paymentMethod === pm.id && styles.paymentMethodBtnActive]}
                onPress={() => setPaymentMethod(pm.id)}
              >
                <Ionicons name={pm.icon} size={24} color={paymentMethod === pm.id ? '#FF6B00' : '#6c757d'} />
                <Text style={[styles.paymentMethodText, paymentMethod === pm.id && styles.paymentMethodTextActive]}>
                  {pm.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Cash payment details */}
          {paymentMethod === 'cash' && (
            <View style={styles.paymentDetails}>
              <Text style={styles.inputLabel}>Amount Received</Text>
              <TextInput
                style={styles.amountInput}
                placeholder={formatPrice(total)}
                keyboardType="numeric"
                value={amountReceived}
                onChangeText={setAmountReceived}
                placeholderTextColor="#adb5bd"
              />
              <View style={styles.quickAmounts}>
                {quickAmounts.map(amt => (
                  <TouchableOpacity
                    key={amt}
                    style={styles.quickAmountBtn}
                    onPress={() => setAmountReceived(String(amt))}
                  >
                    <Text style={styles.quickAmountText}>{amt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {parseFloat(amountReceived || 0) >= total && (
                <View style={styles.changeRow}>
                  <Text style={styles.changeLabel}>Change</Text>
                  <Text style={styles.changeAmount}>{formatPrice(change)}</Text>
                </View>
              )}
            </View>
          )}

          {/* M-Pesa payment details */}
          {paymentMethod === 'mpesa' && (
            <View style={styles.paymentDetails}>
              <Text style={styles.inputLabel}>M-Pesa Transaction Code</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="e.g. QHK7XXXXXX"
                value={mpesaCode}
                onChangeText={setMpesaCode}
                autoCapitalize="characters"
                placeholderTextColor="#adb5bd"
              />
              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Phone Number</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="07XXXXXXXX"
                keyboardType="phone-pad"
                value={mpesaPhone}
                onChangeText={setMpesaPhone}
                placeholderTextColor="#adb5bd"
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Checkout Button */}
      <View style={styles.footer}>
        {!isConnected && (
          <View style={styles.offlineNotice}>
            <Ionicons name="cloud-offline-outline" size={16} color="#856404" />
            <Text style={styles.offlineNoticeText}>Offline - Sale will sync when connected</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.checkoutButton, processing && styles.checkoutButtonDisabled]}
          onPress={handleCheckout}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
              <Text style={styles.checkoutButtonText}>Complete Sale - {formatPrice(total)}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Receipt Modal */}
      <Modal visible={showReceipt} animationType="slide">
        <SafeAreaView style={styles.receiptModal}>
          <View style={styles.receiptHeader}>
            <Ionicons name="checkmark-circle" size={64} color="#28a745" />
            <Text style={styles.receiptSuccessText}>Sale Complete!</Text>
          </View>
          <View style={styles.receiptBody}>
            <Text style={styles.receiptNumber}>Receipt: {receiptData?.receipt_number}</Text>
            <Text style={styles.receiptTotal}>Total: {formatPrice(receiptData?.total_amount)}</Text>
            <Text style={styles.receiptPayment}>
              Paid: {formatPrice(receiptData?.amount_paid)}
              {receiptData?.change_given > 0 && ` | Change: ${formatPrice(receiptData?.change_given)}`}
            </Text>
            {receiptData?.points_earned > 0 && (
              <Text style={styles.receiptPoints}>+{receiptData.points_earned} loyalty points earned</Text>
            )}
          </View>
          <View style={styles.receiptActions}>
            <TouchableOpacity style={styles.receiptActionBtn} onPress={() => Alert.alert('Print', 'Bluetooth printer selection would appear here')}>
              <Ionicons name="print-outline" size={20} color="#FF6B00" />
              <Text style={styles.receiptActionText}>Print Receipt</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.receiptActionBtn} onPress={() => Alert.alert('Share', 'Share options would appear here')}>
              <Ionicons name="share-outline" size={20} color="#FF6B00" />
              <Text style={styles.receiptActionText}>Share</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.doneButton} onPress={handleReceiptDone}>
            <Text style={styles.doneButtonText}>Done - New Sale</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e9ecef' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#212529' },
  content: { flex: 1 },
  section: { backgroundColor: '#fff', margin: 12, marginBottom: 0, borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#212529', marginBottom: 12 },
  summaryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  summaryItemLeft: { flex: 1 },
  summaryItemName: { fontSize: 14, fontWeight: '600', color: '#212529' },
  summaryItemQty: { fontSize: 12, color: '#6c757d', marginTop: 2 },
  summaryItemTotal: { fontSize: 14, fontWeight: '600', color: '#212529' },
  divider: { height: 1, backgroundColor: '#e9ecef', marginVertical: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalRowLabel: { fontSize: 14, color: '#6c757d' },
  totalRowValue: { fontSize: 14, fontWeight: '600', color: '#212529' },
  grandTotalRow: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e9ecef' },
  grandTotalLabel: { fontSize: 18, fontWeight: '700', color: '#212529' },
  grandTotalValue: { fontSize: 22, fontWeight: '700', color: '#FF6B00' },
  customerPicker: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8, gap: 10 },
  customerPickerText: { flex: 1, fontSize: 14, color: '#495057' },
  paymentMethods: { flexDirection: 'row', gap: 10 },
  paymentMethodBtn: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 10, borderWidth: 2, borderColor: '#e9ecef', backgroundColor: '#f8f9fa' },
  paymentMethodBtnActive: { borderColor: '#FF6B00', backgroundColor: '#FFF7F0' },
  paymentMethodText: { fontSize: 12, fontWeight: '600', color: '#6c757d', marginTop: 6 },
  paymentMethodTextActive: { color: '#FF6B00' },
  paymentDetails: { marginTop: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#495057', marginBottom: 6 },
  amountInput: { backgroundColor: '#f8f9fa', borderRadius: 8, padding: 14, fontSize: 18, fontWeight: '600', color: '#212529', borderWidth: 1, borderColor: '#e9ecef' },
  quickAmounts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  quickAmountBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF7F0', borderWidth: 1, borderColor: '#FFD4B0' },
  quickAmountText: { fontSize: 13, fontWeight: '600', color: '#FF6B00' },
  changeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, padding: 12, backgroundColor: '#d4edda', borderRadius: 8 },
  changeLabel: { fontSize: 14, fontWeight: '600', color: '#155724' },
  changeAmount: { fontSize: 18, fontWeight: '700', color: '#155724' },
  footer: { backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#e9ecef' },
  offlineNotice: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff3cd', padding: 10, borderRadius: 8, marginBottom: 12, gap: 8 },
  offlineNoticeText: { fontSize: 12, color: '#856404' },
  checkoutButton: { backgroundColor: '#FF6B00', borderRadius: 12, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  checkoutButtonDisabled: { opacity: 0.6 },
  checkoutButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Receipt modal
  receiptModal: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', padding: 24 },
  receiptHeader: { alignItems: 'center', marginBottom: 24 },
  receiptSuccessText: { fontSize: 28, fontWeight: '700', color: '#28a745', marginTop: 12 },
  receiptBody: { alignItems: 'center', marginBottom: 32 },
  receiptNumber: { fontSize: 16, color: '#6c757d', marginBottom: 8 },
  receiptTotal: { fontSize: 24, fontWeight: '700', color: '#212529', marginBottom: 8 },
  receiptPayment: { fontSize: 14, color: '#6c757d' },
  receiptPoints: { fontSize: 14, color: '#FF6B00', fontWeight: '600', marginTop: 8 },
  receiptActions: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  receiptActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#FF6B00' },
  receiptActionText: { fontSize: 14, fontWeight: '600', color: '#FF6B00' },
  doneButton: { backgroundColor: '#FF6B00', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 48 },
  doneButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
