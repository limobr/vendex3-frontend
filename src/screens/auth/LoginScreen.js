// src/screens/auth/LoginScreen.js - FIXED KEYBOARD FLICKER
import React, { useState, useEffect, memo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { authAPI } from "../../services/api";

const { width } = Dimensions.get("window");

const InputField = memo(
  ({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry = false,
    keyboardType = "default",
    autoCapitalize = "none",
    icon = null,
    showIcon = false,
    onIconPress = null,
    isFocused = false,
    autoFocus = false,
  }) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.inputWrapper, isFocused && styles.inputFocused]}>
        <View style={styles.inputIcon}>
          <Ionicons
            name={icon}
            size={20}
            color={isFocused ? "#FF6B00" : "#666"}
          />
        </View>
        <TextInput
          style={styles.inputField}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => {}}
          onBlur={() => {}}
          editable={true}
          autoFocus={autoFocus}
        />
        {showIcon && (
          <TouchableOpacity onPress={onIconPress} style={styles.toggleIcon}>
            <Ionicons
              name={secureTextEntry ? "eye-off" : "eye"}
              size={22}
              color={isFocused ? "#FF6B00" : "#666"}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  ),
);

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const { login } = useAuth();
  const [animation] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(animation, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      return Alert.alert(
        "Missing Fields",
        "Please enter both username/email and password",
      );
    }
    setLoading(true);
    try {
      const result = await login(username.trim(), password);
      if (result.success) {
        const userName =
          result.user.first_name || result.user.username || "there";
        Alert.alert("Success", `Welcome back to Vendex, ${userName}!`, [
          {
            text: "Continue",
            onPress: () => {
              if (result.user.requires_onboarding) {
                navigation.replace("Onboarding", {
                  assignedShops: result.user.assigned_shops || [],
                });
              } else {
                navigation.replace("Main");
              }
            },
          },
        ]);
      } else {
        if (result.passwordExpired) {
          Alert.alert(
            "Password Expired",
            "Your temporary password has expired. Would you like to request a new one?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Request New",
                onPress: () => handleRequestNewCredentials(),
              },
            ],
          );
        } else {
          Alert.alert("Login Failed", result.error);
        }
      }
    } catch (err) {
      console.log("Login error:", err);
      Alert.alert(
        "Login Failed",
        "An unexpected error occurred. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRequestNewCredentials = async () => {
    const email = username.trim();
    if (!email) {
      Alert.alert("Error", "Please enter your email address first.");
      return;
    }
    setLoading(true);
    try {
      const response = await authAPI.requestResendCredentials(email);
      if (response.success) {
        Alert.alert("Success", response.message);
      } else {
        Alert.alert(
          "Error",
          response.error || "Failed to request new credentials",
        );
      }
    } catch (error) {
      Alert.alert(
        "Error",
        "Could not connect to server. Please try again later.",
      );
    } finally {
      setLoading(false);
    }
  };

  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0],
  });
  const opacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardView}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <Animated.View
            style={[styles.content, { opacity, transform: [{ translateY }] }]}
          >
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <Ionicons name="storefront" size={32} color="#FF6B00" />
                </View>
                <Text style={styles.logoText}>Vendex</Text>
              </View>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>
                Login to continue managing your shop
              </Text>
            </View>

            <View style={styles.formContainer}>
              <InputField
                label="Username or Email"
                value={username}
                onChangeText={setUsername}
                placeholder="Enter username or email"
                keyboardType="email-address"
                icon="person-outline"
                isFocused={focusedInput === "Username or Email"}
                autoFocus={true}
              />
              <InputField
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                icon="lock-closed-outline"
                showIcon={true}
                onIconPress={() => setShowPassword(!showPassword)}
                isFocused={focusedInput === "Password"}
              />

              <TouchableOpacity
                style={styles.forgotButton}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.9}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Login to Vendex</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.signupContainer}>
                <Text style={styles.signupText}>New to Vendex?</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("Signup")}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.signupLink}>Create an account</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                Version 1.0 • Made in Kenya 🇰🇪
              </Text>
            </View>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: { flex: 1, backgroundColor: "#fffaf5" },
  container: { flex: 1, paddingHorizontal: 24, justifyContent: "center" },
  content: { flex: 1, justifyContent: "center" },
  header: { alignItems: "center", marginBottom: 40 },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFF3E0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFE0B2",
  },
  logoText: {
    fontSize: 40,
    fontWeight: "800",
    color: "#FF6B00",
    marginLeft: 12,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  formContainer: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 24,
  },
  inputContainer: { marginBottom: 20 },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e9ecef",
    paddingHorizontal: 16,
    minHeight: 56,
  },
  inputFocused: {
    borderColor: "#FF6B00",
    backgroundColor: "#fff",
    shadowColor: "#FF6B00",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputIcon: { marginRight: 12 },
  inputField: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    paddingVertical: 16,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  toggleIcon: { padding: 8 },
  forgotButton: { alignSelf: "flex-end", marginBottom: 24, padding: 4 },
  forgotText: { fontSize: 14, color: "#FF6B00", fontWeight: "500" },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B00",
    borderRadius: 14,
    paddingVertical: 18,
    marginBottom: 24,
    shadowColor: "#FF6B00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
    marginRight: 8,
  },
  divider: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e9ecef" },
  dividerText: {
    color: "#999",
    fontSize: 14,
    marginHorizontal: 16,
    fontWeight: "500",
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  signupText: { fontSize: 15, color: "#666", marginRight: 4 },
  signupLink: {
    fontSize: 15,
    color: "#FF6B00",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  infoContainer: { alignItems: "center", marginTop: 16 },
  infoText: { fontSize: 13, color: "#999" },
});
