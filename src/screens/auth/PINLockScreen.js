// src/screens/PINLockScreen.js
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import CustomPINInput from '../../components/CustomPINInput';

export default function PINLockScreen() {
  const navigation = useNavigation();
  const { verifyPin, authenticateBiometric, user, pinAttempts } = useAuth();

  const [biometricAttempted, setBiometricAttempted] = useState(false);
  const [error, setError] = useState('');
  const [pinResetSignal, setPinResetSignal] = useState(0);

  useEffect(() => {
    const tryBiometric = async () => {
      if (!biometricAttempted) {
        setBiometricAttempted(true);
        const unlocked = await authenticateBiometric();
        if (unlocked) {
          navigation.replace('Main');
        }
      }
    };

    const timer = setTimeout(tryBiometric, 500);
    return () => clearTimeout(timer);
  }, [navigation, biometricAttempted]);

  const handlePINComplete = async (pin) => {
    const correct = await verifyPin(pin);

    if (correct) {
      setError('');
      navigation.replace('Main');
    } else {
      const remainingAttempts = 5 - pinAttempts;

      setError("Incorrect PIN");

      // Trigger visual reset of dots
      setPinResetSignal(prev => prev + 1);

      if (remainingAttempts <= 0) {
        setError("Too many failed attempts. App will be wiped.");
      }
    }
  };

  const handleBiometricPress = async () => {
    const unlocked = await authenticateBiometric();
    if (unlocked) {
      setError('');
      navigation.replace('Main');
    }
  };

  const remainingAttempts = 5 - pinAttempts;

  return (
    <View style={{ flex: 1, backgroundColor: '#fffaf5' }}>
      <CustomPINInput
        title={`Welcome Back${user?.first_name ? `, ${user.first_name}` : ''}`}
        subtitle="Enter your PIN to continue"
        onPINComplete={handlePINComplete}
        mode="enter"
        onBiometricPress={handleBiometricPress}
        error={error}
        remainingAttempts={remainingAttempts}
        pinResetSignal={pinResetSignal}
      />
    </View>
  );
}