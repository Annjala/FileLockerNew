import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import 'react-native-url-polyfill/auto';

// Supabase configuration - using the values from your .env.example
const supabaseUrl = 'https://zqremssgjwolkfnddsxh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxcmVtc3NnandvbGtmbmRkc3hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5OTUxNTMsImV4cCI6MjA4MjU3MTE1M30.-IPhvk_d-JmxhHBDkw5o5xuZsraSvW6z3e31-KF4wgw';

// Custom storage adapter for Supabase to use SecureStore
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    return SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Helper function to handle file uploads with encryption
export const uploadFile = async (fileUri: string, userId: string, encryptionKey: string, iv: string) => {
  try {
    // Generate a unique file name
    const fileName = `${userId}/${Date.now()}_${fileUri.split('/').pop()}`;
    
    // Get file info to determine MIME type
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    const fileExtension = fileUri.split('.').pop()?.toLowerCase();
    
    // Determine MIME type based on file extension
    let mimeType = 'application/octet-stream';
    if (fileExtension === 'jpg' || fileExtension === 'jpeg') {
      mimeType = 'image/jpeg';
    } else if (fileExtension === 'png') {
      mimeType = 'image/png';
    } else if (fileExtension === 'gif') {
      mimeType = 'image/gif';
    } else if (fileExtension === 'pdf') {
      mimeType = 'application/pdf';
    } else if (fileExtension === 'txt') {
      mimeType = 'text/plain';
    } else if (fileExtension === 'doc') {
      mimeType = 'application/msword';
    } else if (fileExtension === 'docx') {
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (fileExtension === 'xls') {
      mimeType = 'application/vnd.ms-excel';
    } else if (fileExtension === 'xlsx') {
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }
    
    // Get the encrypted data from HomeScreen (passed as parameter)
    // For now, we'll encrypt it here to maintain compatibility
    const { encryptFile } = require('../utils/security');
    const { encryptedData } = await encryptFile(fileUri, encryptionKey);
    
    // Create a simple base64 to ArrayBuffer converter
    const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    };
    
    const { data, error } = await supabase.storage
      .from('user-files') // Your Supabase storage bucket name
      .upload(fileName, base64ToArrayBuffer(encryptedData), {
        contentType: mimeType,
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      throw error;
    }
    
    console.log('File uploaded to storage successfully:', data.path);
    
    // Store file metadata in database (without IV for now)
    const fileMetadata = { 
      user_id: userId, 
      file_path: data.path,
      file_name: fileUri.split('/').pop(),
      size: 0, // File size will be 0 for now since we can't easily get it
      mime_type: mimeType,
      is_encrypted: true,
    };
    
    console.log('Inserting file metadata:', fileMetadata);
    
    const { data: fileData, error: metadataError } = await supabase
      .from('files')
      .insert([fileMetadata])
      .select()
      .single();

    if (metadataError) {
      console.error('Database metadata insert error:', metadataError);
      throw metadataError;
    }
    
    console.log('File metadata inserted successfully:', fileData);
    
    return fileData;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

// Helper function to download files
export const downloadFile = async (filePath: string, localFilePath: string) => {
  try {
    const { data, error } = await supabase.storage
      .from('user-files')
      .download(filePath);

    if (error) throw error;
    
    // In a real app, you would decrypt the file here
    // For now, we'll just return the blob
    
    return data;
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
};
