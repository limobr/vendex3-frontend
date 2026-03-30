// src/components/LowStockAlert.js
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function LowStockAlert({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Ionicons name="alert-circle" size={20} color="#f44336" />
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.stock}>Stock: {item.stock}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    width: 120,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  name: { fontSize: 12, fontWeight: '500', marginTop: 4 },
  stock: { fontSize: 10, color: '#666', marginTop: 2 },
});