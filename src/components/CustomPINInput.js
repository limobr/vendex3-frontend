// src/components/CustomPINInput.js
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function CustomPINInput({
  title,
  subtitle,
  onPINComplete,
  onBiometricPress,
  error,
  remainingAttempts,
  pinResetSignal,
  mode = "enter",
}) {
  const [pin, setPin] = useState("");
  const [dotState, setDotState] = useState("normal");
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (error) {
      setDotState("error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      triggerShakeAnimation();
    }
  }, [error]);

  useEffect(() => {
    setPin("");
    setDotState("normal");
    shakeAnimation.setValue(0); // Reset shake animation
  }, [pinResetSignal]);

  const triggerShakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePress = (digit) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      // Reset dot state to normal when user starts typing again
      if (dotState === "error") {
        setDotState("normal");
      }
      if (newPin.length === 4) {
        onPINComplete(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleSubmit = () => {
    if (pin.length === 4) {
      onPINComplete(pin);
    }
  };

  // ───────────────────────────── Dots Rendering ─────────────────────────────
  const renderDots = () => (
    <Animated.View 
      style={[
        styles.dotsContainer, 
        { transform: [{ translateX: shakeAnimation }] }
      ]}
    >
      {[0, 1, 2, 3].map((i) => {
        const filled = i < pin.length;

        let style = styles.dot;

        if (filled) {
          style = [
            styles.dot,
            dotState === "error" ? styles.dotError : styles.dotFilled,
          ];
        }

        return <View key={i} style={style} />;
      })}
    </Animated.View>
  );

  // ───────────────────────────── Keypad Rendering ─────────────────────────────
  const renderKey = (item, index) => {
    // Tick
    if (item === "tick") {
      if (pin.length === 0) {
        return <View key={index} style={[styles.key, styles.hiddenKey]} />;
      }
      return (
        <TouchableOpacity
          key={index}
          style={[styles.key, styles.tickKey]}
          onPress={handleSubmit}
        >
          <Ionicons name="checkmark" size={34} color="#4CAF50" />
        </TouchableOpacity>
      );
    }

    // Delete
    if (item === "del") {
      if (pin.length === 0) {
        return <View key={index} style={[styles.key, styles.hiddenKey]} />;
      }
      return (
        <TouchableOpacity
          key={index}
          style={[styles.key, styles.deleteKey]}
          onPress={handleBackspace}
        >
          <Ionicons name="backspace-outline" size={30} color="#FF6B35" />
        </TouchableOpacity>
      );
    }

    // Biometric
    if (item === "bio") {
      return (
        <TouchableOpacity
          key={index}
          style={[styles.key, styles.bioKey]}
          onPress={onBiometricPress}
        >
          <Ionicons name="finger-print" size={30} color="#FF6B35" />
        </TouchableOpacity>
      );
    }

    // Numbers
    return (
      <TouchableOpacity
        key={index}
        style={styles.key}
        onPress={() => handlePress(item)}
      >
        <Text style={styles.keyText}>{item}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {/* Dots */}
      {renderDots()}

      {/* Error + Attempts */}
      <View style={styles.messageContainer}>
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning" size={18} color="#FF3B30" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {remainingAttempts < 5 && remainingAttempts > 0 && (
          <View style={styles.attemptsContainer}>
            <Ionicons
              name="shield-checkmark"
              size={16}
              color={remainingAttempts <= 2 ? "#FF9500" : "#34C759"}
            />
            <Text
              style={[
                styles.attemptsText,
                remainingAttempts <= 2 && styles.attemptsWarning,
              ]}
            >
              {remainingAttempts} attempt{remainingAttempts > 1 ? "s" : ""} remaining
            </Text>
          </View>
        )}
      </View>

      {/* Biometric Button */}
      <TouchableOpacity
        onPress={onBiometricPress}
        style={styles.biometricButton}
      >
        <Ionicons name="finger-print" size={45} color="#FF6B35" />
        <Text style={styles.biometricText}>Use Biometric</Text>
      </TouchableOpacity>

      {/* Keypad */}
      <View style={styles.pad}>
        {[
          "1",
          "2",
          "3",
          "4",
          "5",
          "6",
          "7",
          "8",
          "9",
          "tick",
          "0",
          "del",
        ].map((item, index) => renderKey(item, index))}
      </View>
    </View>
  );
}

//
// ─────────────────────────────────── STYLES ───────────────────────────────────
//
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: height * 0.12,
    alignItems: "center",
    backgroundColor: "#fffaf5",
  },

  header: {
    alignItems: "center",
    marginBottom: 35,
    paddingHorizontal: 20,
  },

  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FF6B35",
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 16,
    color: "#666",
  },

  dotsContainer: {
    flexDirection: "row",
    marginBottom: 25,
    gap: 22,
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#FF6B35",
  },
  dotFilled: {
    backgroundColor: "#FF6B35",
  },
  dotError: {
    backgroundColor: "#FF3B30",
    borderColor: "#FF3B30",
  },

  messageContainer: {
    minHeight: 70,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },

  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FFCDD2",
    marginBottom: 8,
  },
  errorText: {
    marginLeft: 8,
    color: "#D32F2F",
    fontWeight: "600",
    fontSize: 15,
  },

  attemptsContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  attemptsText: {
    marginLeft: 6,
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
  },
  attemptsWarning: {
    color: "#E65100",
    fontWeight: "600",
  },

  biometricButton: {
    alignItems: "center",
    marginBottom: 35,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 70,
    backgroundColor: "#fff",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { height: 3 },
  },
  biometricText: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "bold",
    color: "#FF6B35",
  },

  pad: {
    width: width * 0.83,
    maxWidth: 330,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
  },

  key: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { height: 3 },
    borderWidth: 1,
    borderColor: "#EFEFEF",
    paddingBottom: 16,
  },

  hiddenKey: {
    backgroundColor: "transparent",
    borderColor: "transparent",
    elevation: 0,
    shadowOpacity: 0,
  },

  tickKey: {
    backgroundColor: "#F1F8E9",
    borderColor: "#4CAF50",
  },
  deleteKey: {
    backgroundColor: "#FFF3E0",
    borderColor: "#FF6B35",
  },
  bioKey: {
    backgroundColor: "#F3E5F5",
    borderColor: "#FF6B35",
  },

  keyText: {
    fontSize: 30,
    fontWeight: "700",
    color: "#FF6B35",
  },
});