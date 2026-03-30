import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const StatsCard = ({ title, value, icon, color = '#FF6B00', size = 'medium' }) => {
  const isLarge = size === 'large';

  return (
    <View style={[
      styles.card,
      isLarge && styles.cardLarge
    ]}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={isLarge ? 24 : 20} color={color} />
      </View>
      
      <View style={styles.content}>
        <Text style={[
          styles.value,
          isLarge && styles.valueLarge
        ]}>
          {value}
        </Text>
        <Text style={[
          styles.title,
          isLarge && styles.titleLarge
        ]}>
          {title}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  cardLarge: {
    padding: 24,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  content: {
    alignItems: 'center',
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 4,
  },
  valueLarge: {
    fontSize: 28,
  },
  title: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
  },
  titleLarge: {
    fontSize: 14,
  },
});

export default StatsCard;