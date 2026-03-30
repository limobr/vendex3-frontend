// src/components/MessageItem.js
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { formatRelativeTime } from '../utils/formatters';

export default function MessageItem({ message, onPress }) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <Text style={styles.sender}>{message.sender_name}</Text>
      <Text style={styles.message} numberOfLines={1}>{message.message}</Text>
      <Text style={styles.time}>{formatRelativeTime(message.created_at)}</Text>
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
  sender: { fontSize: 14, fontWeight: '600' },
  message: { fontSize: 12, color: '#666', marginTop: 2 },
  time: { fontSize: 10, color: '#999', marginTop: 4, alignSelf: 'flex-end' },
});