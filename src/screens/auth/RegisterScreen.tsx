import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { useAuth } from '../../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../components/common/Text';

// Color constants
const COLORS = {
  TEXT: '#483847',
  SCREEN_SKIN: '#EFD7ED',
  BUTTON: '#B378AF',
  PLACEHOLDER: '#6B7280',
};

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export const RegisterScreen = ({ navigation }: Props) => {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const { signUp } = useAuth();

  const validateForm = (): boolean => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return false;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(username)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    
    if (!pin.trim()) {
      Alert.alert('Error', 'Please enter your PIN');
      return false;
    }
    
    if (pin.length < 6) {
      Alert.alert('Error', 'PIN must be at least 6 characters');
      return false;
    }
    
    if (pin !== confirmPin) {
      Alert.alert('Error', 'PINs do not match');
      return false;
    }
    
    if (!termsAccepted) {
      Alert.alert('Error', 'You must accept the terms and conditions');
      return false;
    }
    
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      await signUp(username, pin);
      // Success message is handled in AuthContext
      // Navigate back to LoginRegister screen
      navigation.navigate('LoginRegister');
    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert('Registration Failed', error.message || 'An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.SCREEN_SKIN }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Username (Mail id)"
            placeholderTextColor={COLORS.PLACEHOLDER}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Enter PIN (min 6 characters)"
            placeholderTextColor={COLORS.PLACEHOLDER}
            value={pin}
            onChangeText={setPin}
            secureTextEntry
            keyboardType="numeric"
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm PIN"
            placeholderTextColor={COLORS.PLACEHOLDER}
            value={confirmPin}
            onChangeText={setConfirmPin}
            secureTextEntry
            keyboardType="numeric"
          />

          <View style={styles.termsContainer}>
            <TouchableOpacity 
              style={styles.checkbox}
              onPress={() => setTermsAccepted(!termsAccepted)}
            >
              <View style={[styles.checkboxInner, termsAccepted && styles.checkboxChecked]}>
                {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </TouchableOpacity>
            <Text style={styles.termsText}>
              I agree to the{' '}
              <Text style={styles.linkText}>Terms and Conditions</Text>
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.registerButton}
            onPress={handleRegister}
            disabled={isLoading}
          >
            <Text style={styles.registerButtonText}>
              {isLoading ? 'CREATING ACCOUNT...' : 'REGISTER'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    gap: 20,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: COLORS.TEXT,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  checkbox: {
    marginRight: 10,
  },
  checkboxInner: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.BUTTON,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.BUTTON,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.TEXT,
  },
  linkText: {
    color: COLORS.BUTTON,
    textDecorationLine: 'underline',
  },
  registerButton: {
    backgroundColor: COLORS.BUTTON,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
