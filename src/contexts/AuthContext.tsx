import React, { createContext, useContext, useEffect, useState } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { generateEncryptionKey, storeEncryptionKey } from '../utils/security';

type User = {
  id: string;
  username: string;
};

type AuthContextData = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (username: string, pin: string) => Promise<void>;
  signUp: (username: string, pin: string) => Promise<void>;
  signOut: () => Promise<void>;
  setupBiometricAuth: () => Promise<boolean>;
  authenticateWithBiometrics: () => Promise<boolean>;
  verifyPin: (pin: string) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBiometricSetup, setIsBiometricSetup] = useState(false);

  useEffect(() => {
    // Check if user is logged in on app start
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session?.user) {
          setUser({
            id: session.user.id,
            username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || '',
          });
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || '',
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (username: string, pin: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: username, // Use the email directly
        password: pin,
      });

      if (error) throw error;
      
      if (data.user) {
        setUser({
          id: data.user.id,
          username: username,
        });
      }
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signUp = async (username: string, pin: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: username,
        password: pin,
        options: {
          data: {
            username: username,
          },
          emailRedirectTo: undefined, // Skip email confirmation
        },
      });

      if (error) throw error;
      
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const setupBiometricAuth = async (): Promise<boolean> => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        Alert.alert('Error', 'Your device is not compatible with biometric authentication');
        return false;
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        Alert.alert('Error', 'No biometric data found. Please set up biometrics in your device settings.');
        return false;
      }

      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return false;
      }

      // Generate and store encryption key
      const encryptionKey = await generateEncryptionKey();
      const keyStored = await storeEncryptionKey(encryptionKey, user.id);
      
      if (!keyStored) {
        Alert.alert('Error', 'Failed to store encryption key');
        return false;
      }

      // Store a flag that biometric setup is complete
      await SecureStore.setItemAsync('biometricSetup', 'true');
      setIsBiometricSetup(true);
      return true;
    } catch (error) {
      console.error('Error setting up biometric auth:', error);
      return false;
    }
  };

  const authenticateWithBiometrics = async (): Promise<boolean> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access your vault',
        fallbackLabel: 'Enter password',
      });

      return result.success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  };

  const verifyPin = async (pin: string): Promise<boolean> => {
    try {
      if (!user) {
        return false;
      }

      // Get the user's email/username from user metadata
      const username = user.username;
      
      // Try to sign in with the provided PIN to verify it's correct
      const { data, error } = await supabase.auth.signInWithPassword({
        email: username,
        password: pin,
      });

      if (error) {
        console.error('PIN verification failed:', error);
        return false;
      }

      // If successful, the PIN is correct
      return true;
    } catch (error) {
      console.error('Error verifying PIN:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        signIn,
        signUp,
        signOut,
        setupBiometricAuth,
        authenticateWithBiometrics,
        verifyPin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
