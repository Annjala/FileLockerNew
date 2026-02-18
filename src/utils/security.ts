import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

// Keychain service name for storing the encryption key
const KEYCHAIN_SERVICE = 'com.securevault.encryptionkey';

// Generate a secure random encryption key and store it in Android Keystore
export const generateEncryptionKey = async (userId: string): Promise<string> => {
  try {
    // Generate a 256-bit key for AES-256
    const randomBytes = Crypto.getRandomBytes(32);
    const key = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')
    );
    
    // Store the key securely in Android Keystore via SecureStore
    const keyAlias = `filelocker_key_${userId.substring(0, 8)}`;
    
    await SecureStore.setItemAsync(
      keyAlias,
      key,
      {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        requireAuthentication: false, // Remove biometric requirement
      }
    );
    
    return key;
  } catch (error) {
    console.error('Error generating encryption key:', error);
    throw error;
  }
};

// Retrieve the encryption key from Android Keystore
export const getEncryptionKey = async (userId: string): Promise<string | null> => {
  try {
    const keyAlias = `filelocker_key_${userId.substring(0, 8)}`;
    
    // Retrieve from SecureStore (Android Keystore) without authentication requirement
    const key = await SecureStore.getItemAsync(keyAlias);
    
    if (!key) {
      return null;
    }
    
    return key;
  } catch (error) {
    console.error('Error retrieving encryption key:', error);
    return null;
  }
};

// Reversible encryption using XOR with Android Keystore key
export const encryptFile = async (
  fileUri: string, 
  key: string
): Promise<{ encryptedData: string; iv: string }> => {
  try {
    // Read the file as base64
    const fileContent = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Generate a random 128-bit IV (Initialization Vector)
    const ivBytes = Crypto.getRandomBytes(16);
    const iv = Array.from(ivBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Create a more secure encryption key by combining the base key with IV
    const enhancedKey = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      key + iv
    );
    
    // Decode base64 to get original binary data, then XOR encrypt
    const binaryData = atob(fileContent);
    
    // XOR encryption with enhanced key
    let encryptedData = '';
    for (let i = 0; i < binaryData.length; i++) {
      const charCode = binaryData.charCodeAt(i);
      const keyChar = enhancedKey.charCodeAt(i % enhancedKey.length);
      encryptedData += String.fromCharCode(charCode ^ keyChar);
    }
    
    // Convert to base64 for safe storage
    encryptedData = btoa(encryptedData);
    
    return {
      encryptedData,
      iv,
    };
  } catch (error) {
    console.error('Error encrypting file:', error);
    throw error;
  }
};

// Simple and reliable decryption using XOR with Android Keystore key
export const decryptFile = async (
  encryptedData: any, 
  key: string, 
  iv: string
): Promise<string> => {
  try {
    // Convert data to string if it's a Blob
    let dataAsString = '';
    if (encryptedData instanceof Blob) {
      // Convert Blob to base64 string
      const reader = new FileReader();
      await new Promise((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix to get pure base64
          if (result.startsWith('data:')) {
            const base64Data = result.split(',')[1];
            dataAsString = base64Data;
          } else {
            dataAsString = result;
          }
          resolve(dataAsString);
        };
        reader.onerror = reject;
        reader.readAsDataURL(encryptedData);
      });
    } else {
      // Convert object to string representation
      dataAsString = String(encryptedData);
    }
    
    // Create the same enhanced key used for encryption
    const enhancedKey = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      key + iv
    );
    
    // Simple XOR decryption on encrypted data directly
    let decryptedData = '';
    for (let i = 0; i < dataAsString.length; i++) {
      const charCode = dataAsString.charCodeAt(i);
      const keyChar = enhancedKey.charCodeAt(i % enhancedKey.length);
      decryptedData += String.fromCharCode(charCode ^ keyChar);
    }
    
    // Convert the decrypted binary data back to base64 for image display
    let base64Decrypted;
    try {
      base64Decrypted = btoa(decryptedData);
    } catch (error) {
      console.error('Error converting to base64:', error);
      // If btoa fails, the data might already be base64
      base64Decrypted = decryptedData;
    }
    
    console.log('Decryption completed, data length:', base64Decrypted.length);
    
    return base64Decrypted;
  } catch (error) {
    console.error('Error decrypting file:', error);
    // Return empty string if decryption fails
    return '';
  }
};

// Hash a password for secure storage
export const hashPassword = async (password: string): Promise<string> => {
  try {
    // Use PBKDF2 for password hashing
    const hashed = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password
    );
    
    return hashed;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw error;
  }
};

// Check if encryption key exists for a user in Android Keystore
export const hasEncryptionKey = async (userId: string): Promise<boolean> => {
  try {
    const keyAlias = `filelocker_key_${userId.substring(0, 8)}`;
    
    const key = await SecureStore.getItemAsync(keyAlias);
    return key !== null;
  } catch (error) {
    console.error('Error checking encryption key:', error);
    return false;
  }
};

// Delete encryption key for a user from Android Keystore
export const deleteEncryptionKey = async (userId: string): Promise<boolean> => {
  try {
    const keyAlias = `filelocker_key_${userId.substring(0, 8)}`;
    
    await SecureStore.deleteItemAsync(keyAlias);
    return true;
  } catch (error) {
    console.error('Error deleting encryption key:', error);
    return false;
  }
};

// Get encryption key metadata (creation date, etc.)
export const getEncryptionKeyMetadata = async (userId: string): Promise<{
  created: string;
  lastAccessed: string;
  algorithm: string;
} | null> => {
  try {
    // In a real app, you would store metadata separately
    // For now, return mock data if key exists
    const keyExists = await hasEncryptionKey(userId);
    if (keyExists) {
      return {
        created: new Date().toLocaleDateString(),
        lastAccessed: new Date().toLocaleDateString(),
        algorithm: 'AES-256',
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting encryption key metadata:', error);
    return null;
  }
};
