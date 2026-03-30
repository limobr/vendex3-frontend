// src/screens/owner/ReceiptTemplateScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Switch,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';
import { receiptAPI } from '../../services/api';

export default function ReceiptTemplateScreen({ route, navigation }) {
  const shopId = route?.params?.shopId;
  const shopName = route?.params?.shopName || 'Shop';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState({
    header_text: '',
    footer_text: 'Thank you for your purchase!',
    layout: 'standard',
    show_logo: true,
    show_shop_address: true,
    show_shop_phone: true,
    show_attendant_name: true,
    show_customer_name: true,
    show_tax_breakdown: true,
    show_payment_method: true,
    printer_width: 58,
  });

  useEffect(() => {
    if (shopId) loadTemplate();
  }, [shopId]);

  const loadTemplate = async () => {
    try {
      const res = await receiptAPI.getTemplate(shopId);
      if (res?.success && res.template) {
        setTemplate(res.template);
      }
    } catch (e) {
      console.error('Load template error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await receiptAPI.updateTemplate(shopId, template);
      if (res?.success) {
        Alert.alert('Saved', 'Receipt template updated successfully.');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => setTemplate((prev) => ({ ...prev, [field]: value }));

  const LAYOUTS = [
    { key: 'standard', label: 'Standard', icon: 'document-text-outline' },
    { key: 'compact', label: 'Compact', icon: 'reader-outline' },
    { key: 'detailed', label: 'Detailed', icon: 'list-outline' },
  ];

  const WIDTHS = [
    { key: 32, label: '32mm' },
    { key: 58, label: '58mm' },
    { key: 80, label: '80mm' },
  ];

  if (loading) {
    return (
      <View style={styles.screen}>
        <Header title="Receipt Template" showBackButton />
        <View style={styles.center}><ActivityIndicator size="large" color="#667eea" /></View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Header
        title="Receipt Template"
        subtitle={shopName}
        showBackButton
        buttons={[{
          icon: 'checkmark', onPress: handleSave, color: '#667eea', position: 'right',
        }]}
      />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Header & Footer text */}
        <Text style={styles.sectionTitle}>Header & Footer</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Header Text</Text>
          <TextInput
            style={styles.input}
            value={template.header_text}
            onChangeText={(t) => updateField('header_text', t)}
            placeholder="e.g. Welcome to Our Store"
          />
          <Text style={styles.label}>Footer Text</Text>
          <TextInput
            style={styles.input}
            value={template.footer_text}
            onChangeText={(t) => updateField('footer_text', t)}
            placeholder="e.g. Thank you!"
          />
        </View>

        {/* Layout */}
        <Text style={styles.sectionTitle}>Layout</Text>
        <View style={styles.row}>
          {LAYOUTS.map((l) => (
            <TouchableOpacity
              key={l.key}
              style={[styles.chip, template.layout === l.key && styles.chipActive]}
              onPress={() => updateField('layout', l.key)}
            >
              <Ionicons name={l.icon} size={18} color={template.layout === l.key ? '#fff' : '#495057'} />
              <Text style={[styles.chipText, template.layout === l.key && styles.chipTextActive]}>
                {l.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Printer Width */}
        <Text style={styles.sectionTitle}>Printer Width</Text>
        <View style={styles.row}>
          {WIDTHS.map((w) => (
            <TouchableOpacity
              key={w.key}
              style={[styles.chip, template.printer_width === w.key && styles.chipActive]}
              onPress={() => updateField('printer_width', w.key)}
            >
              <Text style={[styles.chipText, template.printer_width === w.key && styles.chipTextActive]}>
                {w.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Toggle switches */}
        <Text style={styles.sectionTitle}>Display Options</Text>
        <View style={styles.card}>
          {[
            { key: 'show_logo', label: 'Show Logo' },
            { key: 'show_shop_address', label: 'Show Shop Address' },
            { key: 'show_shop_phone', label: 'Show Shop Phone' },
            { key: 'show_attendant_name', label: 'Show Attendant Name' },
            { key: 'show_customer_name', label: 'Show Customer Name' },
            { key: 'show_tax_breakdown', label: 'Show Tax Breakdown' },
            { key: 'show_payment_method', label: 'Show Payment Method' },
          ].map((opt) => (
            <View key={opt.key} style={styles.switchRow}>
              <Text style={styles.switchLabel}>{opt.label}</Text>
              <Switch
                value={!!template[opt.key]}
                onValueChange={(v) => updateField(opt.key, v)}
                trackColor={{ false: '#dee2e6', true: '#667eea' }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Save Template</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#212529', marginTop: 20, marginBottom: 10 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#e9ecef',
  },
  label: { fontSize: 13, fontWeight: '600', color: '#6c757d', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#f8f9fa', borderRadius: 8, padding: 12, fontSize: 15, color: '#212529',
    borderWidth: 1, borderColor: '#e9ecef',
  },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20,
    backgroundColor: '#e9ecef',
  },
  chipActive: { backgroundColor: '#667eea' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#495057' },
  chipTextActive: { color: '#fff' },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f3f5',
  },
  switchLabel: { fontSize: 15, color: '#495057' },
  saveBtn: {
    backgroundColor: '#667eea', borderRadius: 12, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 24,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
