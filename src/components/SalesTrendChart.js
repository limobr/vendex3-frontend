// src/components/SalesTrendChart.js
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export default function SalesTrendChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No sales data available</Text>
      </View>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);
  const chartWidth = width - 64;
  const barWidth = (chartWidth / data.length) - 4;
  const maxBarHeight = 120;

  return (
    <View style={styles.container}>
      <View style={styles.chartContainer}>
        {data.map((item, index) => {
          const height = (item.count / maxCount) * maxBarHeight;
          return (
            <View key={index} style={styles.barWrapper}>
              <View style={[styles.bar, { height, width: barWidth }]} />
              <Text style={styles.label}>{item.date.slice(5)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    width: width - 64,
  },
  barWrapper: {
    alignItems: 'center',
  },
  bar: {
    backgroundColor: '#2196F3',
    borderRadius: 4,
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    width: 30,
  },
  emptyText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    padding: 16,
  },
});