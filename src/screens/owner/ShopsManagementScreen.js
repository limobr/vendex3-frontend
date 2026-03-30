import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

export default function ShopsManagementScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Shops Management</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏢 Businesses Overview</Text>
        <Text style={styles.point}>• List of all businesses owned by the user</Text>
        <Text style={styles.point}>• Business cards showing: name, registration number, shop count</Text>
        <Text style={styles.point}>• Add new business button (floating action)</Text>
        <Text style={styles.point}>• Swipe actions: Edit, Archive, Delete</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏪 Shop Management</Text>
        <Text style={styles.point}>• Grid/list view of shops within selected business</Text>
        <Text style={styles.point}>• Shop cards: name, location, type, status (active/inactive)</Text>
        <Text style={styles.point}>• Quick stats: revenue, employees, inventory status</Text>
        <Text style={styles.point}>• Add new shop form with shop type selection</Text>
        <Text style={styles.point}>• Shop details screen with tabs: Overview, Employees, Inventory, Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔧 Shop Configuration</Text>
        <Text style={styles.point}>• Basic info: Name, location, contact details</Text>
        <Text style={styles.point}>• Shop type: Retail, Wholesale, Supermarket, etc.</Text>
        <Text style={styles.point}>• Currency and tax rate settings</Text>
        <Text style={styles.point}>• Business hours scheduling</Text>
        <Text style={styles.point}>• Receipt template customization</Text>
        <Text style={styles.point}>• Printer and hardware setup</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Multi-Shop Operations</Text>
        <Text style={styles.point}>• Bulk actions across multiple shops</Text>
        <Text style={styles.point}>• Transfer inventory between shops</Text>
        <Text style={styles.point}>• Consolidated reporting across shops</Text>
        <Text style={styles.point}>• Shop performance comparison charts</Text>
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