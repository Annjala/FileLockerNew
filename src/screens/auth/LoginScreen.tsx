import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
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

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export const LoginScreen = ({ navigation }: Props) => {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!email || !pin) {
      Alert.alert('Error', 'Please enter both email and PIN');
      return;
    }

    setIsLoading(true);
    try {
      await signIn(email, pin);
      // Navigation will happen automatically via the auth state change in AuthProvider
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.SCREEN_SKIN }]}>
      <View style={styles.content}>
        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={COLORS.PLACEHOLDER}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="PIN"
            placeholderTextColor={COLORS.PLACEHOLDER}
            value={pin}
            onChangeText={setPin}
            secureTextEntry
            keyboardType="numeric"
          />

          <TouchableOpacity 
            style={styles.loginButton}
            onPress={handleLogin} 
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? 'Signing In...' : 'LOGIN'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.BUTTON} />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 40,
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
  loginButton: {
    backgroundColor: COLORS.BUTTON,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
