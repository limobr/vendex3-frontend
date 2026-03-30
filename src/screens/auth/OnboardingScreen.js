// src/screens/auth/OnboardingScreen.js
// Employee finish-setup screen: change temp password, update profile, select shop
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { onboardingAPI } from '../../services/api';
import tokenService from '../../services/tokenService';

export default function OnboardingScreen({ navigation, route }) {
  const { user, updateUser } = useAuth();  // <-- add updateUser from auth context
  const assignedShops = route?.params?.assignedShops || [];

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '');
  const [selectedShopId, setSelectedShopId] = useState(
    assignedShops.length === 1 ? assignedShops[0].shop_id : null
  );
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handleChangePassword = () => {
    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    setStep(2);
  };

  const handleCompleteSetup = async () => {
    if (!firstName.trim()) {
      Alert.alert('Error', 'First name is required.');
      return;
    }
    setLoading(true);
    try {
      const response = await onboardingAPI.completeOnboarding({
        new_password: newPassword,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phoneNumber.trim(),
      });

      if (response.success) {
        // Store new tokens
        if (response.access && response.refresh) {
          await tokenService.setAccessToken(response.access);
          await tokenService.setRefreshToken(response.refresh);
        }

        // Update the user in AuthContext with the new profile data
        if (response.user && updateUser) {
          updateUser(response.user);
        } else if (response.user) {
          // If updateUser is not available, just log a warning (fallback)
          console.warn('updateUser not available, user state may be stale');
        }

        Alert.alert('Welcome!', 'Your account setup is complete.', [
          {
            text: 'Continue',
            onPress: () => {
              navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
            },
          },
        ]);
      } else {
        Alert.alert('Error', response.error || 'Failed to complete setup');
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      if (error.response?.status === 401) {
        Alert.alert('Session Expired', 'Your session has expired. Please log in again.', [
          { text: 'OK', onPress: () => navigation.replace('Login') },
        ]);
      } else {
        Alert.alert('Error', error?.response?.data?.error || 'Network error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.progressRow}>
          <View style={[styles.progressDot, step >= 1 && styles.progressDotActive]} />
          <View style={styles.progressLine} />
          <View style={[styles.progressDot, step >= 2 && styles.progressDotActive]} />
        </View>

        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name={step === 1 ? 'lock-closed' : 'person'} size={32} color="#fff" />
          </View>
          <Text style={styles.title}>
            {step === 1 ? 'Set Your Password' : 'Complete Your Profile'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 1
              ? 'For security, please create a new password to replace the temporary one.'
              : 'Almost done! Confirm your details below.'}
          </Text>
        </View>

        {step === 1 && (
          <View style={styles.form}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="At least 8 characters"
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#6c757d" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter password"
              secureTextEntry={!showPassword}
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={handleChangePassword}>
              <Text style={styles.primaryBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={styles.form}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Your first name"
            />

            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Your last name"
            />

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="+254 7XX XXX XXX"
              keyboardType="phone-pad"
            />

            {assignedShops.length > 1 && (
              <>
                <Text style={styles.label}>Select Your Shop</Text>
                {assignedShops.map((shop) => (
                  <TouchableOpacity
                    key={shop.shop_id}
                    style={[
                      styles.shopOption,
                      selectedShopId === shop.shop_id && styles.shopOptionActive,
                    ]}
                    onPress={() => setSelectedShopId(shop.shop_id)}
                  >
                    <Ionicons
                      name={selectedShopId === shop.shop_id ? 'radio-button-on' : 'radio-button-off'}
                      size={22}
                      color={selectedShopId === shop.shop_id ? '#667eea' : '#adb5bd'}
                    />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.shopName}>{shop.shop_name}</Text>
                      <Text style={styles.shopRole}>{shop.role_name}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(1)}>
                <Ionicons name="arrow-back" size={20} color="#667eea" />
                <Text style={styles.secondaryBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 1, marginLeft: 12 }]}
                onPress={handleCompleteSetup}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Finish Setup</Text>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9fa' },
  container: { padding: 24, paddingTop: 40 },
  progressRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 32,
  },
  progressDot: {
    width: 12, height: 12, borderRadius: 6, backgroundColor: '#dee2e6',
  },
  progressDotActive: { backgroundColor: '#667eea' },
  progressLine: { width: 60, height: 2, backgroundColor: '#dee2e6', marginHorizontal: 8 },
  header: { alignItems: 'center', marginBottom: 32 },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#667eea',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#212529', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6c757d', textAlign: 'center', lineHeight: 20 },
  form: {},
  label: { fontSize: 14, fontWeight: '600', color: '#495057', marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#dee2e6', borderRadius: 10,
    padding: 14, fontSize: 16, color: '#212529',
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  passwordInput: {
    flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dee2e6', borderRadius: 10,
    padding: 14, fontSize: 16, color: '#212529',
  },
  eyeBtn: { marginLeft: -44, padding: 10 },
  primaryBtn: {
    backgroundColor: '#667eea', borderRadius: 10, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 24, gap: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: {
    borderWidth: 1, borderColor: '#667eea', borderRadius: 10, paddingVertical: 14,
    paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  secondaryBtnText: { color: '#667eea', fontSize: 16, fontWeight: '600' },
  btnRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24 },
  shopOption: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#dee2e6', borderRadius: 10, padding: 14, marginTop: 8,
  },
  shopOptionActive: { borderColor: '#667eea', backgroundColor: '#f0f0ff' },
  shopName: { fontSize: 16, fontWeight: '600', color: '#212529' },
  shopRole: { fontSize: 13, color: '#6c757d', marginTop: 2 },
});