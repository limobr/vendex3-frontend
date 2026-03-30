// src/components/RecentSaleItem.js
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { formatCurrency, formatDateTime } from '../utils/formatters';

export default function RecentSaleItem({ sale, onPress }) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <View style={styles.row}>
        <Text style={styles.receipt}>#{sale.receipt_number}</Text>
        <Text style={styles.amount}>{formatCurrency(sale.total_amount)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.time}>{formatDateTime(sale.created_at)}</Text>
        <Text style={[styles.status, sale.status === 'completed' ? styles.completed : styles.pending]}>
          {sale.status}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  receipt: { fontSize: 14, fontWeight: '500' },
  amount: { fontSize: 14, fontWeight: '600', color: '#2196F3' },
  time: { fontSize: 12, color: '#999' },
  status: { fontSize: 12, fontWeight: '500' },
  completed: { color: '#4CAF50' },
  pending: { color: '#FF9800' },
});