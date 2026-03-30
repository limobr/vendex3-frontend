// src/screens/auth/SignupScreen.js - FIXED KEYBOARD FLICKER
import React, { useState, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../../constants';

const InputField = memo(({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  icon = null,
  showIcon = false,
  onIconPress = null,
  isFocused = false,
}) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={[
      styles.inputWrapper,
      isFocused && styles.inputFocused,
    ]}>
      {icon && (
        <View style={styles.inputIcon}>
          <Ionicons name={icon} size={20} color={isFocused ? "#FF6B00" : "#666"} />
        </View>
      )}
      <TextInput
        style={styles.inputField}
        placeholder={placeholder}
        placeholderTextColor="#999"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
      {showIcon && (
        <TouchableOpacity onPress={onIconPress} style={styles.toggleIcon}>
          <Ionicons
            name={secureTextEntry ? "eye" : "eye-off"}
            size={22}
            color={isFocused ? "#FF6B00" : "#666"}
          />
        </TouchableOpacity>
      )}
    </View>
  </View>
));

export default function RegisterScreen({ navigation }) {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    phone_number: '',
    password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  // ... handleRegister function remains 100% unchanged ...

  const handleRegister = async () => {
    const { first_name, last_name, username, email, password, confirm_password, phone_number } = form;
    if (!first_name.trim() || !last_name.trim()) {
      return Alert.alert("Error", "First name and last name are required");
    }
    if (!username.trim()) {
      return Alert.alert("Error", "Username is required");
    }
    if (!email.trim()) {
      return Alert.alert("Error", "Email is required");
    }
    if (!email.includes('@') || !email.includes('.')) {
      return Alert.alert("Error", "Please enter a valid email");
    }
    if (password.length < 6) {
      return Alert.alert("Error", "Password must be at least 6 characters");
    }
    if (password !== confirm_password) {
      return Alert.alert("Error", "Passwords do not match");
    }
    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/register/`, {
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        phone_number: phone_number.trim(),
        password,
        user_type: 'owner',
      });
      Alert.alert("Success!", "Your account has been created!", [
        { text: "Go to Login", onPress: () => navigation.replace('Login') }
      ]);
    } catch (err) {
      const errorMsg = err.response?.data?.detail
        || err.response?.data?.username?.[0]
        || err.response?.data?.email?.[0]
        || "Registration failed. Try again.";
      Alert.alert("Registration Failed", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header & Form — everything visually identical */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="storefront-outline" size={42} color="#FF6B00" />
              <Text style={styles.logoText}>Vendex</Text>
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join thousands of shop owners using Vendex</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.nameRow}>
              <View style={styles.halfInput}>
                <InputField
                  label="First Name"
                  value={form.first_name}
                  onChangeText={(t) => setForm({ ...form, first_name: t })}
                  placeholder="John"
                  autoCapitalize="words"
                  icon="person-outline"
                  isFocused={focusedInput === "First Name"}
                />
              </View>
              <View style={styles.halfInput}>
                <InputField
                  label="Last Name"
                  value={form.last_name}
                  onChangeText={(t) => setForm({ ...form, last_name: t })}
                  placeholder="Doe"
                  autoCapitalize="words"
                  isFocused={focusedInput === "Last Name"}
                />
              </View>
            </View>
            {/* All other inputs unchanged */}
            <InputField label="Username" value={form.username} onChangeText={(t) => setForm({ ...form, username: t })} placeholder="johndoe" icon="at-outline" isFocused={focusedInput === "Username"} />
            <InputField label="Email Address" value={form.email} onChangeText={(t) => setForm({ ...form, email: t })} placeholder="john@example.com" keyboardType="email-address" icon="mail-outline" isFocused={focusedInput === "Email Address"} />
            <InputField label="Phone Number" value={form.phone_number} onChangeText={(t) => setForm({ ...form, phone_number: t })} placeholder="+254 712 345 678" keyboardType="phone-pad" icon="call-outline" isFocused={focusedInput === "Phone Number"} />
            <InputField label="Password" value={form.password} onChangeText={(t) => setForm({ ...form, password: t })} placeholder="••••••••" secureTextEntry={!showPassword} icon="lock-closed-outline" showIcon={true} onIconPress={() => setShowPassword(!showPassword)} isFocused={focusedInput === "Password"} />
            <InputField label="Confirm Password" value={form.confirm_password} onChangeText={(t) => setForm({ ...form, confirm_password: t })} placeholder="••••••••" secureTextEntry={!showConfirm} icon="lock-closed-outline" showIcon={true} onIconPress={() => setShowConfirm(!showConfirm)} isFocused={focusedInput === "Confirm Password"} />

            {/* Rest of form unchanged */}
            <View style={styles.requirements}>
              <Text style={styles.requirementsTitle}>Password must:</Text>
              <View style={styles.requirementItem}>
                <Ionicons name={form.password.length >= 6 ? "checkmark-circle" : "ellipse-outline"} size={16} color={form.password.length >= 6 ? "#4CAF50" : "#999"} />
                <Text style={[styles.requirementText, form.password.length >= 6 && styles.requirementMet]}>Be at least 6 characters</Text>
              </View>
              <View style={styles.requirementItem}>
                <Ionicons name={form.password === form.confirm_password && form.confirm_password.length > 0 ? "checkmark-circle" : "ellipse-outline"} size={16} color={form.password === form.confirm_password && form.confirm_password.length > 0 ? "#4CAF50" : "#999"} />
                <Text style={[styles.requirementText, form.password === form.confirm_password && form.confirm_password.length > 0 && styles.requirementMet]}>Match confirmation</Text>
              </View>
            </View>

            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleRegister} disabled={loading} activeOpacity={0.9}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <><Text style={styles.buttonText}>Create Account</Text><Ionicons name="arrow-forward" size={20} color="#fff" /></>}
            </TouchableOpacity>

            <View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>or</Text><View style={styles.dividerLine} /></View>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading} activeOpacity={0.7}>
                <Text style={styles.loginLink}>Login here</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.termsText}>
              By creating an account, you agree to our <Text style={styles.termsLink}>Terms of Service</Text> and <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

// Styles 100% unchanged
const styles = StyleSheet.create({
  keyboardView: { flex: 1, backgroundColor: '#fffaf5' },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 32 },
  logoContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  logoText: { fontSize: 36, fontWeight: '800', color: '#FF6B00', marginLeft: 8, letterSpacing: -0.5 },
  title: { fontSize: 32, fontWeight: '700', color: '#333', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
  formContainer: { backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 6 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  halfInput: { flex: 1, marginRight: 12 },
  inputContainer: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 12, borderWidth: 2, borderColor: '#e9ecef', paddingHorizontal: 16, minHeight: 56 },
  inputFocused: { borderColor: '#FF6B00', backgroundColor: '#fff', shadowColor: '#FF6B00', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  inputIcon: { marginRight: 12 },
  inputField: { flex: 1, fontSize: 16, color: '#333', paddingVertical: 16, fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto' },
  toggleIcon: { padding: 8 },
  requirements: { backgroundColor: '#f8f9fa', borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#e9ecef' },
  requirementsTitle: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8 },
  requirementItem: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  requirementText: { fontSize: 13, color: '#999', marginLeft: 8 },
  requirementMet: { color: '#4CAF50' },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF6B00', borderRadius: 14, paddingVertical: 18, marginBottom: 24, shadowColor: '#FF6B00', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600', marginRight: 8 },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e9ecef' },
  dividerText: { color: '#999', fontSize: 14, marginHorizontal: 16, fontWeight: '500' },
  loginContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  loginText: { fontSize: 15, color: '#666', marginRight: 4 },
  loginLink: { fontSize: 15, color: '#FF6B00', fontWeight: '600', textDecorationLine: 'underline' },
  termsText: { fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 18 },
  termsLink: { color: '#FF6B00', fontWeight: '500' },
});