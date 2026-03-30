// src/components/NetworkStatusBar.js - Global network status indicator
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export default function NetworkStatusBar() {
  const { isConnected } = useNetworkStatus();
  const slideAnim = useRef(new Animated.Value(-40)).current;
  const prevConnected = useRef(isConnected);

  useEffect(() => {
    if (!isConnected) {
      // Show offline bar
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
    } else if (prevConnected.current === false && isConnected) {
      // Show "back online" briefly
      Animated.sequence([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(slideAnim, { toValue: -40, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.timing(slideAnim, { toValue: -40, duration: 200, useNativeDriver: true }).start();
    }
    prevConnected.current = isConnected;
  }, [isConnected]);

  return (
    <Animated.View
      style={[
        styles.bar,
        isConnected ? styles.barOnline : styles.barOffline,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Ionicons
        name={isConnected ? 'cloud-done-outline' : 'cloud-offline-outline'}
        size={14}
        color={isConnected ? '#155724' : '#fff'}
      />
      <Text style={[styles.text, isConnected ? styles.textOnline : styles.textOffline]}>
        {isConnected ? 'Back online' : 'No internet connection — working offline'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 36,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, zIndex: 999,
  },
  barOffline: { backgroundColor: '#dc3545' },
  barOnline: { backgroundColor: '#d4edda' },
  text: { fontSize: 12, fontWeight: '600' },
  textOffline: { color: '#fff' },
  textOnline: { color: '#155724' },
});
