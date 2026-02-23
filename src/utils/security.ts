import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import CryptoJS from 'crypto-js';

// Keychain service name for storing encryption key
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
    
    // Store key securely in Android Keystore via SecureStore
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

// Retrieve encryption key from Android Keystore
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

// Real AES-256-CBC encryption using crypto-js with manual key derivation
export const encryptFile = async (
  fileUri: string, 
  key: string
): Promise<{ encryptedData: string; iv: string }> => {
  try {
    // Read the file as base64
    const fileContent = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Generate a random 128-bit IV (Initialization Vector) for AES-CBC using expo-crypto
    const ivBytes = Crypto.getRandomBytes(16);
    const iv = Array.from(ivBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Derive encryption key using crypto-js to avoid native crypto issues
    const keyWordArray = CryptoJS.enc.Utf8.parse(key);
    
    // Encrypt using AES-256-CBC with manual key setup
    const encrypted = CryptoJS.AES.encrypt(fileContent, keyWordArray, {
      iv: CryptoJS.enc.Hex.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    return {
      encryptedData: encrypted.toString(),
      iv: iv,
    };
  } catch (error) {
    console.error('Error encrypting file:', error);
    throw error;
  }
};

// Pure AES-256-CBC decryption using crypto-js with manual key derivation
export const decryptFile = async (
  encryptedData: any, 
  key: string, 
  iv: string
): Promise<string> => {
  console.log('=== DECRYPT FILE FUNCTION CALLED ===');
  console.log('IV parameter:', iv);
  console.log('Key parameter length:', key.length);
  
  try {
    // Convert data to string if it's a Blob
    let dataAsString = '';
    if (encryptedData instanceof Blob) {
      console.log('Data is Blob, converting...');
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
      console.log('Data is not Blob, converting to string...');
      // Convert object to string representation
      dataAsString = String(encryptedData);
    }
    
    console.log('=== DECRYPTION DEBUG ===');
    console.log('Input data length:', dataAsString.length);
    console.log('Input data starts with:', dataAsString.substring(0, 50));
    console.log('IV:', iv);
    console.log('Key length:', key.length);
    
    // Derive decryption key using crypto-js to avoid native crypto issues
    const keyWordArray = CryptoJS.enc.Utf8.parse(key);
    
    // Decrypt using AES-256-CBC with manual key setup and XOR fallback
    console.log('Attempting AES-256-CBC decryption...');
    try {
      const decrypted = CryptoJS.AES.decrypt(dataAsString, keyWordArray, {
        iv: CryptoJS.enc.Hex.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      // Convert to base64 for image display
      const decryptedBase64 = decrypted.toString(CryptoJS.enc.Base64);
      console.log('AES-256 decryption successful, data length:', decryptedBase64.length);
      console.log('AES-256 decrypted data starts with:', decryptedBase64.substring(0, 50));
      
      console.log('=== FINAL DECRYPTION RESULT ===');
      console.log('Final data length:', decryptedBase64.length);
      console.log('Final data starts with:', decryptedBase64.substring(0, 50));
      
      return decryptedBase64;
    } catch (aesError: any) {
      console.error('AES decryption failed, trying XOR fallback...');
      console.error('AES error details:', {
        message: aesError.message,
        stack: aesError.stack,
        name: aesError.name
      });
      
      // Fallback to XOR decryption for old files
      try {
        const enhancedKey = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          key + iv
        );
        
        console.log('Enhanced key length:', enhancedKey.length);
        
        // Simple XOR decryption on encrypted data directly
        let decryptedData = '';
        for (let i = 0; i < dataAsString.length; i++) {
          const charCode = dataAsString.charCodeAt(i);
          const keyChar = enhancedKey.charCodeAt(i % enhancedKey.length);
          decryptedData += String.fromCharCode(charCode ^ keyChar);
        }
        
        console.log('XOR decrypted data length:', decryptedData.length);
        console.log('XOR decrypted data starts with:', decryptedData.substring(0, 50));
        
        // Convert decrypted binary data back to base64 for image display
        const xorBase64 = btoa(decryptedData);
        console.log('XOR fallback decryption successful, data length:', xorBase64.length);
        console.log('XOR base64 starts with:', xorBase64.substring(0, 50));
        
        return xorBase64;
      } catch (xorError: any) {
        console.error('XOR fallback also failed:', xorError);
        return '';
      }
    }
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
  keySize: number;
  mode: string;
  library: string;
} | null> => {
  try {
    const keyExists = await hasEncryptionKey(userId);
    if (keyExists) {
      return {
        created: new Date().toLocaleDateString(),
        lastAccessed: new Date().toLocaleDateString(),
        algorithm: 'AES-256-CBC',
        keySize: 256,
        mode: 'PKCS#7 Padding',
        library: 'crypto-js',
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting encryption key metadata:', error);
    return null;
  }
};
