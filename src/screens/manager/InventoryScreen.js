import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

export default function InventoryScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Inventory Management</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Stock Overview</Text>
        <Text style={styles.point}>• Real-time stock levels for current shop</Text>
        <Text style={styles.point}>• Low stock alerts with reorder recommendations</Text>
        <Text style={styles.point}>• Overstock items identification</Text>
        <Text style={styles.point}>• Stock value calculation</Text>
        <Text style={styles.point}>• Stock turnover rate</Text>
        <Text style={styles.point}>• Category-wise stock distribution</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📦 Stock Adjustments</Text>
        <Text style={styles.point}>• Add stock (receiving new inventory)</Text>
        <Text style={styles.point}>• Remove stock (damage, loss, internal use)</Text>
        <Text style={styles.point}>• Transfer stock between locations</Text>
        <Text style={styles.point}>• Bulk stock update via CSV import</Text>
        <Text style={styles.point}>• Reason codes for all adjustments</Text>
        <Text style={styles.point}>• Approval workflow for large adjustments</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Stock Taking</Text>
        <Text style={styles.point}>• Start new stock count session</Text>
        <Text style={styles.point}>• Barcode scanner integration for counting</Text>
        <Text style={styles.point}>• Multiple counters support</Text>
        <Text style={styles.point}>• Variance report (expected vs actual)</Text>
        <Text style={styles.point}>• Approve and apply stock count results</Text>
        <Text style={styles.point}>• Historical stock take records</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📈 Inventory Analytics</Text>
        <Text style={styles.point}>• Fast vs slow moving analysis</Text>
        <Text style={styles.point}>• Dead stock identification</Text>
        <Text style={styles.point}>• Stock aging report</Text>
        <Text style={styles.point}>• ABC analysis (80/20 rule)</Text>
        <Text style={styles.point}>• Seasonality trends</Text>
        <Text style={styles.point}>• Predictive reorder suggestions</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔄 Reorder Management</Text>
        <Text style={styles.point}>• Automatic reorder point calculations</Text>
        <Text style={styles.point}>• Create purchase orders</Text>
        <Text style={styles.point}>• Supplier management</Text>
        <Text style={styles.point}>• Expected delivery tracking</Text>
        <Text style={styles.point}>• Receive shipments against POs</Text>
        <Text style={styles.point}>• Backorder management</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8f9fa' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#212529' },
  section: { marginBottom: 24, backgroundColor: '#fff', padding: 16, borderRadius: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, color: '#495057' },
  point: { fontSize: 14, color: '#6c757d', marginBottom: 8, marginLeft: 8 },
});