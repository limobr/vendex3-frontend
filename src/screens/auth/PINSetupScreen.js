// screens/PINSetupScreen.js
import React, { useState } from 'react';
import { View, Alert, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import CustomPINInput from '../../components/CustomPINInput';
import { Ionicons } from '@expo/vector-icons';

export default function PINSetupScreen() {
  const { setPin, changePin } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const [isSettingUp, setIsSettingUp] = useState(false);

  const mode = route.params?.mode || 'enable'; // 'enable' or 'change'

  const handlePINComplete = async (pin) => {
    setIsSettingUp(true);
    
    try {
      let result;
      
      if (mode === 'change') {
        result = await changePin(pin);
      } else {
        result = await setPin(pin);
      }
      
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        const message = mode === 'change' 
          ? 'Your PIN has been changed successfully.'
          : 'Your PIN has been set. You can use it to unlock the app.';
          
        Alert.alert(
          'Success',
          message,
          [
            { 
              text: 'Continue', 
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to set PIN');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to set PIN. Please try again.');
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip PIN Setup',
      'Are you sure? You can set a PIN later in settings for better security.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Skip', 
          style: 'destructive',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  const getTitle = () => {
    return mode === 'change' ? 'Change Your PIN' : 'Set Your PIN';
  };

  const getSubtitle = () => {
    return mode === 'change' 
      ? 'Enter a new 4-digit PIN' 
      : 'Create a 4-digit PIN to secure your app';
  };

  return (
    <View style={styles.container}>
      {/* Back button */}
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#FF6B00" />
      </TouchableOpacity>

      {/* PIN Input Component */}
      <CustomPINInput
        title={getTitle()}
        subtitle={getSubtitle()}
        onPINComplete={handlePINComplete}
        mode="setup"
      />

      {/* Skip option at the bottom (only for enable mode) */}
      {mode === 'enable' && (
        <TouchableOpacity 
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={isSettingUp}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fffaf5',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 10,
  },
  skipButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    padding: 15,
  },
  skipText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
});