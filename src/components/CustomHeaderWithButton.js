// src/components/CustomHeaderWithButton.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const CustomHeaderWithButton = ({ 
  title, 
  leftButtonIcon, 
  leftButtonAction,
  rightButtonIcon, 
  rightButtonAction,
  showTitle = true
}) => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        {/* Left: Custom Button or Empty */}
        <View style={styles.leftContainer}>
          {leftButtonIcon && leftButtonAction ? (
            <TouchableOpacity 
              style={styles.leftButton}
              onPress={leftButtonAction}
              activeOpacity={0.7}
            >
              <Ionicons name={leftButtonIcon} size={24} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={styles.emptySpace} />
          )}
        </View>

        {/* Center: Title */}
        <View style={styles.titleContainer}>
          {showTitle && (
            <Text style={styles.title} numberOfLines={1}>
              {title || 'Vendex'}
            </Text>
          )}
        </View>

        {/* Right: Custom Button or Empty */}
        <View style={styles.rightContainer}>
          {rightButtonIcon && rightButtonAction ? (
            <TouchableOpacity 
              style={styles.rightButton}
              onPress={rightButtonAction}
              activeOpacity={0.7}
            >
              <Ionicons name={rightButtonIcon} size={24} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={styles.emptySpace} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FF6B00',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    backgroundColor: '#FF6B00',
    paddingHorizontal: 16,
  },
  leftContainer: {
    width: 40,
    alignItems: 'flex-start',
  },
  leftButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  rightContainer: {
    width: 40,
    alignItems: 'flex-end',
  },
  rightButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  emptySpace: {
    width: 40,
  },
});

export default CustomHeaderWithButton;