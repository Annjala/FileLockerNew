import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator, TextInput, Modal, FlatList, Image, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';
import { Text } from '../../components/common/Text';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  useFonts,
  Grandstander_700Bold,
} from '@expo-google-fonts/grandstander';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Linking } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as SecureStore from 'expo-secure-store';
import { encryptFile, getEncryptionKey, hasEncryptionKey, generateEncryptionKey, storeEncryptionKey, decryptFile } from '../../utils/security';
import { uploadFile } from '../../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import RNPDFLib from 'react-native-pdf-lib';

export const HomeScreen = () => {
  const { colors } = useTheme();
  const { user, verifyPin, resetInactivityTimer } = useAuth();
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [viewingFile, setViewingFile] = useState<any>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [decryptedFileData, setDecryptedFileData] = useState<string>('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFileToDelete, setSelectedFileToDelete] = useState<any>(null);
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const [pendingFileAction, setPendingFileAction] = useState<{ type: 'view' | 'delete'; file: any } | null>(null);
  const [showActionPinPrompt, setShowActionPinPrompt] = useState(false);
  const [actionPinInput, setActionPinInput] = useState('');
  const [isVerifyingAction, setIsVerifyingAction] = useState(false);
  const navigation = useNavigation();
  
  let [fontsLoaded] = useFonts({
    Grandstander_700Bold,
  });

  // Reset inactivity timer on user interactions
  React.useEffect(() => {
    const handleUserActivity = () => {
      resetInactivityTimer();
    };

    // Add event listeners for user activity
    // Note: In React Native, we'll use touch events on the main container
    return () => {
      // Cleanup will be handled by the component unmount
    };
  }, [resetInactivityTimer]);

  if (!fontsLoaded) {
    return null;
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.SCREEN_SKIN,
    },
    mainContent: {
      flex: 1,
    },
    content: {
      flex: 1,
      padding: 20,
      justifyContent: 'center',
    },
    optionsContainer: {
      gap: 20,
    },
    optionButton: {
      backgroundColor: colors.BUTTON,
      paddingVertical: 20,
      paddingHorizontal: 30,
      borderRadius: 15,
      alignItems: 'center',
    },
    optionText: {
      fontSize: 18,
      fontFamily: 'Grandstander_700Bold',
      color: '#FFFFFF',
    },
    uploadButton: {
      backgroundColor: '#28a745',
    },
    bottomNavigation: {
      flexDirection: 'row',
      backgroundColor: colors.PANEL,
      paddingBottom: 10,
      paddingTop: 10,
    },
    navButton: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
    },
    activeNavButton: {
      backgroundColor: 'transparent',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.SCREEN_SKIN,
      padding: 30,
      borderRadius: 15,
      width: '80%',
      alignItems: 'center',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    modalTitle: {
      fontSize: 20,
      fontFamily: 'Grandstander_700Bold',
      color: colors.TEXT,
      marginBottom: 20,
      textAlign: 'center',
    },
    modalMessage: {
      fontSize: 16,
      color: colors.TEXT,
      textAlign: 'center',
      marginBottom: 30,
      lineHeight: 24,
    },
    pinInput: {
      width: '100%',
      height: 50,
      backgroundColor: '#FFFFFF',
      borderWidth: 2,
      borderColor: colors.BUTTON,
      borderRadius: 10,
      paddingHorizontal: 15,
      fontSize: 16,
      marginBottom: 25,
      fontFamily: 'Grandstander_400Regular',
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 15,
      width: '100%',
    },
    modalButton: {
      flex: 1,
      paddingVertical: 15,
      borderRadius: 10,
      alignItems: 'center',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    cancelButton: {
      backgroundColor: '#E5E7EB',
    },
    confirmButton: {
      backgroundColor: colors.BUTTON,
    },
    cancelButtonText: {
      fontSize: 16,
      fontFamily: 'Grandstander_700Bold',
      color: colors.TEXT,
    },
    confirmButtonText: {
      fontSize: 16,
      fontFamily: 'Grandstander_700Bold',
      color: '#FFFFFF',
    },
    filesModalContent: {
      backgroundColor: colors.SCREEN_SKIN,
      padding: 30,
      borderRadius: 15,
      width: '90%',
      maxHeight: '80%',
      alignItems: 'center',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    emptyFilesState: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyFilesText: {
      fontSize: 16,
      fontFamily: 'Grandstander_700Bold',
      color: colors.TEXT,
      marginTop: 15,
      textAlign: 'center',
    },
    fileItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 15,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#E0E0E0',
    },
    fileIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.BUTTON + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
    },
    fileInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    fileName: {
      fontSize: 16,
      fontFamily: 'Grandstander_700Bold',
      color: colors.TEXT,
      marginBottom: 5,
    },
    fileSize: {
      fontSize: 14,
      fontFamily: 'Grandstander_700Bold',
      color: colors.TEXT,
    },
    encryptedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.BUTTON + '20',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
      marginTop: 5,
    },
    encryptedText: {
      fontSize: 12,
      fontFamily: 'Grandstander_700Bold',
      color: colors.BUTTON,
      marginLeft: 5,
    },
    filesList: {
      width: '100%',
    },
    closeModalButton: {
      backgroundColor: colors.BUTTON,
      paddingVertical: 15,
      paddingHorizontal: 30,
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 20,
    },
    closeModalButtonText: {
      fontSize: 16,
      fontFamily: 'Grandstander_700Bold',
      color: '#FFFFFF',
    },
    fileViewerContent: {
      backgroundColor: colors.PANEL,
      borderRadius: 20,
      margin: 20,
      maxHeight: '80%',
      flex: 1,
    },
    fileViewerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.TEXT,
    },
    fileViewerTitle: {
      fontSize: 18,
      fontFamily: 'Grandstander_700Bold',
      color: colors.TEXT,
      flex: 1,
    },
    closeViewerButton: {
      padding: 5,
    },
    fileViewerBody: {
      flex: 1,
      padding: 20,
    },
    fileViewerImage: {
      width: '100%',
      height: 300,
      borderRadius: 10,
    },
    textContentView: {
      flex: 1,
    },
    textContent: {
      fontSize: 14,
      color: colors.TEXT,
      lineHeight: 20,
    },
    fileInfoView: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    fileInfoText: {
      fontSize: 16,
      color: colors.TEXT,
      marginTop: 10,
      textAlign: 'center',
    },
    fullScreenViewer: {
      flex: 1,
      backgroundColor: colors.SCREEN_SKIN,
    },
    fullScreenHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 15,
      paddingTop: 50,
      backgroundColor: colors.PANEL,
      borderBottomWidth: 1,
      borderBottomColor: colors.TEXT,
    },
    backButton: {
      padding: 5,
      marginRight: 15,
    },
    fullScreenTitle: {
      fontSize: 18,
      fontFamily: 'Grandstander_700Bold',
      color: colors.TEXT,
      flex: 1,
    },
    headerSpacer: {
      width: 34,
    },
    fullScreenBody: {
      flex: 1,
      backgroundColor: colors.SCREEN_SKIN,
    },
    fullScreenImage: {
      width: '100%',
      height: '100%',
      backgroundColor: colors.SCREEN_SKIN,
      minHeight: '100%',
    },
    fullScreenPdf: {
      flex: 1,
      width: '100%',
      height: '100%',
      backgroundColor: '#f0f0f0',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.SCREEN_SKIN,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: colors.TEXT,
      fontFamily: 'Grandstander_700Bold',
    },
    fullScreenTextContainer: {
      flex: 1,
      padding: 20,
    },
    fullScreenText: {
      fontSize: 16,
      color: colors.TEXT,
      lineHeight: 24,
    },
    pdfPreviewContainer: {
      flex: 1,
      backgroundColor: '#f5f5f5',
      borderRadius: 10,
      padding: 15,
      marginTop: 10,
      maxHeight: 300,
    },
    pdfPreviewText: {
      fontSize: 12,
      color: colors.TEXT,
      fontFamily: 'monospace',
      lineHeight: 16,
    },
    fullScreenInfoContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
      backgroundColor: colors.SCREEN_SKIN,
    },
    fullScreenInfoText: {
      fontSize: 18,
      color: colors.TEXT,
      marginTop: 15,
      textAlign: 'center',
    },
    openPdfButton: {
      backgroundColor: colors.BUTTON,
      paddingVertical: 15,
      paddingHorizontal: 30,
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 20,
    },
    openPdfButtonText: {
      fontSize: 16,
      fontFamily: 'Grandstander_700Bold',
      color: '#FFFFFF',
    },
    openFileButton: {
      backgroundColor: colors.BUTTON,
      paddingVertical: 15,
      paddingHorizontal: 30,
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 20,
    },
    openFileButtonText: {
      fontSize: 16,
      fontFamily: 'Grandstander_700Bold',
      color: '#FFFFFF',
    },
  });

  const pickDocument = async () => {
    try {
      // Clear any previous selection
      setSelectedFile(null);
      
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'image/*',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          'application/zip',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
        console.log('Selected file:', result.assets[0].name, 'URI:', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) {
      Alert.alert('Error', 'Please select a file first');
      return;
    }

    // Show PIN prompt first
    setShowPinPrompt(true);
  };

  const performUpload = async () => {
    if (!pinInput || pinInput.length < 4) {
      Alert.alert('Error', 'Please enter your PIN');
      return;
    }

    setIsUploading(true);
    setShowPinPrompt(false);

    try {
      if (!user || !selectedFile) {
        Alert.alert('Error', 'Missing user or file information');
        return;
      }

      // Verify the PIN against the user's stored PIN
      const isPinValid = await verifyPin(pinInput);
      
      if (!isPinValid) {
        Alert.alert('Authentication Failed', 'Invalid PIN. Please try again.');
        setIsUploading(false);
        return;
      }

      // Check if encryption key exists
      const keyExists = await hasEncryptionKey(user.id);
      
      if (!keyExists) {
        Alert.alert('Error', 'Encryption key not found. Please restart the app.');
        return;
      }

      // Get the encryption key
      const encryptionKey = await getEncryptionKey(user.id);
      
      if (!encryptionKey) {
        Alert.alert('Authentication Failed', 'Failed to authenticate. Please try again.');
        return;
      }

      // Encrypt the file (using file URI like the original)
      const { encryptedData, iv } = await encryptFile(selectedFile.uri, encryptionKey);

      // Upload the encrypted file
      await uploadFile(selectedFile.uri, user.id, encryptionKey);

      // Delete the original file from device after successful upload
      try {
        console.log('Attempting to delete file:', selectedFile.uri);
        await FileSystem.deleteAsync(selectedFile.uri);
        console.log('File deleted successfully from device');
        
        // Verify file is actually deleted
        const fileExists = await FileSystem.getInfoAsync(selectedFile.uri);
        if (fileExists.exists) {
          console.warn('Warning: File still exists after deletion attempt');
        } else {
          console.log('Verified: File no longer exists on device');
        }
      } catch (deleteError) {
        console.error('Error deleting original file:', deleteError);
        Alert.alert('Warning', 'File uploaded but original file could not be deleted');
      }

      Alert.alert('Success', 'File uploaded and encrypted successfully!');
      setSelectedFile(null);
      setPinInput('');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const loadFiles = async () => {
    try {
      setIsLoadingFiles(true);
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Update file sizes for existing files that have 0 bytes
      const updatedFiles = await Promise.all(
        (data || []).map(async (file: any) => {
          if (file.size === 0) {
            try {
              // Download the file to get its actual size
              const { data: fileBlob } = await supabase.storage
                .from('user-files')
                .download(file.file_path);
              
              if (fileBlob) {
                const actualSize = fileBlob.size || 0;
                
                // Update the file record with actual size
                const { data: updatedFile } = await supabase
                  .from('files')
                  .update({ size: actualSize })
                  .eq('id', file.id)
                  .select()
                  .single();
                
                return updatedFile || file;
              }
            } catch (sizeError) {
              console.error('Error getting file size:', sizeError);
            }
          }
          return file;
        })
      );
      
      setFiles(updatedFiles);
    } catch (error) {
      console.error('Error loading files:', error);
      Alert.alert('Error', 'Failed to load files');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'videocam';
    if (mimeType.startsWith('audio/')) return 'musical-notes';
    if (mimeType.includes('pdf')) return 'document-text';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return 'archive';
    return 'document';
  };

  const handleDeleteFile = async (file: any) => {
    try {
      if (!user?.id) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      // Set pending action and show PIN prompt
      setPendingFileAction({ type: 'delete', file });
      setActionPinInput('');
      setShowActionPinPrompt(true);
    } catch (error) {
      console.error('Error preparing to delete file:', error);
      Alert.alert('Error', 'Failed to prepare file deletion');
    }
  };

  const confirmDeleteFile = async () => {
    if (!selectedFileToDelete || !user?.id) {
      Alert.alert('Error', 'No file selected for deletion');
      return;
    }

    setIsDeletingFile(true);

    try {
      // Delete file from Supabase storage
      const { error: storageError } = await supabase.storage
        .from('user-files')
        .remove([selectedFileToDelete.file_path]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
        Alert.alert('Error', 'Failed to delete file from storage');
        return;
      }

      // Delete file record from database
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', selectedFileToDelete.id)
        .eq('user_id', user.id);

      if (dbError) {
        console.error('Error deleting file from database:', dbError);
        Alert.alert('Error', 'Failed to delete file from database');
        return;
      }

      // Refresh files list
      await loadFiles();

      // Close modals and reset state
      setShowDeleteModal(false);
      setSelectedFileToDelete(null);

      Alert.alert('Success', 'File deleted successfully!');
    } catch (error) {
      console.error('Error deleting file:', error);
      Alert.alert('Error', 'Failed to delete file');
    } finally {
      setIsDeletingFile(false);
    }
  };

  const handleViewFile = async (file: any) => {
    try {
      if (!user?.id) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      // Set pending action and show PIN prompt
      setPendingFileAction({ type: 'view', file });
      setActionPinInput('');
      setShowActionPinPrompt(true);
    } catch (error) {
      console.error('Error preparing to view file:', error);
      Alert.alert('Error', 'Failed to prepare file viewing');
    }
  };

  const verifyActionPin = async () => {
    if (!actionPinInput || actionPinInput.length < 4) {
      Alert.alert('Error', 'Please enter your PIN');
      return;
    }

    if (!pendingFileAction) {
      Alert.alert('Error', 'No pending action');
      return;
    }

    setIsVerifyingAction(true);

    try {
      // Verify the PIN against the user's stored PIN
      const isPinValid = await verifyPin(actionPinInput);
      
      if (!isPinValid) {
        Alert.alert('Authentication Failed', 'Invalid PIN. Please try again.');
        setIsVerifyingAction(false);
        return;
      }

      // Close PIN prompt
      setShowActionPinPrompt(false);
      setActionPinInput('');

      // Get the encryption key for file operations
      if (!user?.id) {
        Alert.alert('Error', 'User not authenticated');
        setIsVerifyingAction(false);
        return;
      }
      
      // Check if encryption key exists, if not generate one
      const keyExists = await hasEncryptionKey(user.id);
      
      let encryptionKey: string;
      if (!keyExists) {
        // Generate a new encryption key and store it in Android Keystore
        encryptionKey = await generateEncryptionKey(user.id);
      } else {
        // Retrieve the existing encryption key from Android Keystore
        const retrievedKey = await getEncryptionKey(user.id);
        if (!retrievedKey) {
          Alert.alert('Error', 'Failed to access encryption key. Please restart the app.');
          setIsVerifyingAction(false);
          return;
        }
        encryptionKey = retrievedKey;
      }
      
      // Check if the file was encrypted with a different user's key
      // This happens when switching accounts - files encrypted with previous account's key
      if (pendingFileAction.type === 'view') {
        const file = pendingFileAction.file;
        
        // For now, we'll try to decrypt with current user's key
        // If it fails, we'll show an appropriate error message
        console.log('Attempting to decrypt file with current user key');
        console.log('File owner:', file.user_id);
        console.log('Current user:', user.id);
        
        if (file.user_id !== user.id) {
          Alert.alert(
            'Access Denied', 
            'This file was encrypted with a different user account. You can only view files encrypted with your current account.',
            [{ text: 'OK' }]
          );
          setIsVerifyingAction(false);
          setPendingFileAction(null);
          return;
        }
      }

      // Execute the pending action
      if (pendingFileAction.type === 'view') {
        await executeViewFile(pendingFileAction.file, encryptionKey);
      } else if (pendingFileAction.type === 'delete') {
        setSelectedFileToDelete(pendingFileAction.file);
        setShowDeleteModal(true);
      }

      // Clear pending action
      setPendingFileAction(null);
    } catch (error) {
      console.error('Error verifying PIN:', error);
      Alert.alert('Authentication Failed', 'Invalid PIN. Please try again.');
    } finally {
      setIsVerifyingAction(false);
    }
  };

  const executeViewFile = async (file: any, encryptionKey: string) => {
    try {
      // Decrypts file data directly from Supabase (no download needed)
      const { data, error } = await supabase.storage
        .from('user-files')
        .download(file.file_path);

      if (error) {
        console.error('Error accessing file:', error);
        Alert.alert('Error', 'Failed to access file');
        return;
      }

      // Decrypts file data
      const decryptedData = await decryptFile(data, encryptionKey, 'placeholder_iv');
      
      // Check if decrypted data is valid
      if (!decryptedData || decryptedData.length === 0) {
        Alert.alert('Error', 'File content could not be decrypted');
        return;
      }
      
      let displayContent = '';
      if (file.file_name?.match(/\.(jpg|jpeg|png|gif)$/i)) {
        const imageType = file.file_name?.match(/\.(jpg|jpeg)$/i) ? 'image/jpeg' : 
                        file.file_name?.match(/\.(png)$/i) ? 'image/png' : 'image/gif';
        
        const imageDataUri = `data:${imageType};base64,${decryptedData}`;
        displayContent = imageDataUri;
      } else {
        const tempUri = FileSystem.cacheDirectory + 'temp_' + file.file_name;
        await FileSystem.writeAsStringAsync(tempUri, decryptedData, {
          encoding: FileSystem.EncodingType.Base64,
        });
        displayContent = tempUri;
      }
      
      // Set viewing file and use appropriate content
      setViewingFile(file);
      setFileContent(displayContent);
      setDecryptedFileData(decryptedData);
      setShowFileViewer(true);

    } catch (error) {
      console.error('Error viewing file:', error);
      Alert.alert('Error', 'Failed to process file');
    }
  };

  const handleUserInteraction = () => {
    resetInactivityTimer();
  };

  const renderHome = () => (
    <View style={styles.content}>
      <View style={styles.optionsContainer}>
        <TouchableOpacity style={styles.optionButton} onPress={() => { pickDocument(); handleUserInteraction(); }}>
          <Text style={styles.optionText}>
            {selectedFile ? `Selected: ${selectedFile.name}` : 'Upload File'}
          </Text>
        </TouchableOpacity>
        
        {selectedFile && (
          <TouchableOpacity 
            style={[styles.optionButton, styles.uploadButton]} 
            onPress={() => { handleUpload(); handleUserInteraction(); }}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.optionText}>Upload Now</Text>
            )}
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.optionButton} onPress={() => { loadFiles(); setShowFilesModal(true); handleUserInteraction(); }}>
          <Text style={styles.optionText}>View Files</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.optionButton} onPress={() => { loadFiles(); setShowDeleteModal(true); handleUserInteraction(); }}>
          <Text style={styles.optionText}>Delete Files</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSettings = () => (
    <View style={styles.content}>
      <Text style={styles.optionText}>Settings functionality coming soon!</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContent} onTouchStart={handleUserInteraction}>
        {renderHome()}
      </View>

      <>
        {/* PIN Authentication Modal */}
        <Modal
          visible={showPinPrompt}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowPinPrompt(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Enter PIN</Text>
              <TextInput
                style={styles.pinInput}
                value={pinInput}
                onChangeText={setPinInput}
                placeholder="Enter your PIN"
                secureTextEntry
                keyboardType="numeric"
                maxLength={6}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]} 
                  onPress={() => {
                    setShowPinPrompt(false);
                    setPinInput('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.confirmButton]} 
                  onPress={performUpload}
                >
                  <Text style={styles.confirmButtonText}>Upload</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Action PIN Verification Modal */}
        <Modal
          visible={showActionPinPrompt}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setShowActionPinPrompt(false);
            setPendingFileAction(null);
            setActionPinInput('');
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {pendingFileAction?.type === 'view' ? 'Enter PIN to View File' : 'Enter PIN to Delete File'}
              </Text>
              <Text style={styles.modalMessage}>
                File: {pendingFileAction?.file.file_name}
              </Text>
              <TextInput
                style={styles.pinInput}
                value={actionPinInput}
                onChangeText={setActionPinInput}
                placeholder="Enter your PIN"
                secureTextEntry
                keyboardType="numeric"
                maxLength={6}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]} 
                  onPress={() => {
                    setShowActionPinPrompt(false);
                    setPendingFileAction(null);
                    setActionPinInput('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.confirmButton]} 
                  onPress={verifyActionPin}
                  disabled={isVerifyingAction}
                >
                  {isVerifyingAction ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmButtonText}>
                      {pendingFileAction?.type === 'view' ? 'View' : 'Delete'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* File Viewer Modal */}
        <Modal
          visible={showFileViewer}
          animationType="slide"
          onRequestClose={() => {
    setShowFileViewer(false);
    setDecryptedFileData(''); // Clear decrypted data when closing
  }}
        >
          <View style={styles.fullScreenViewer}>
            <View style={styles.fullScreenHeader}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => {
    setShowFileViewer(false);
    setDecryptedFileData(''); // Clear decrypted data when closing
  }}
              >
                <Ionicons name="arrow-back" size={24} color={colors.TEXT} />
              </TouchableOpacity>
              <Text style={styles.fullScreenTitle}>{viewingFile?.file_name}</Text>
              <View style={styles.headerSpacer} />
            </View>
            
            <ScrollView style={styles.fullScreenBody}>
              {viewingFile?.file_name?.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                <Image 
                  source={{ uri: fileContent }}
                  style={styles.fullScreenImage}
                  resizeMode="contain"
                  onError={(error) => console.log('Image error:', error)}
                  onLoad={() => console.log('Image loaded successfully')}
                />
              ) : viewingFile?.file_name?.match(/\.(pdf)$/i) ? (
                <View style={styles.fullScreenInfoContainer}>
                  <Ionicons name="document-text" size={80} color={colors.BUTTON} />
                  <Text style={styles.fullScreenInfoText}>PDF Document</Text>
                  <Text style={styles.fullScreenInfoText}>File Name: {viewingFile?.file_name}</Text>
                  <Text style={styles.fullScreenInfoText}>Size: {formatFileSize(viewingFile?.size || 0)}</Text>
                  <Text style={styles.fullScreenInfoText}>Status: Decrypted and ready for viewing</Text>
                  <Text style={styles.fullScreenInfoText}>The PDF file has been successfully decrypted.</Text>
                  <TouchableOpacity 
                    style={styles.openFileButton}
                    onPress={async () => {
                      // Save PDF to temporary file and open it
                      try {
                        // Create a temporary file with the PDF data
                        const tempPdfUri = FileSystem.cacheDirectory + 'temp_' + viewingFile.file_name;
                        await FileSystem.writeAsStringAsync(tempPdfUri, decryptedFileData, {
                          encoding: FileSystem.EncodingType.Base64,
                        });
                        
                        console.log('PDF saved to temp file:', tempPdfUri);
                        
                        // Open the temporary file
                        await Linking.openURL(tempPdfUri);
                      } catch (error) {
                        console.log('Error saving/opening PDF:', error);
                        Alert.alert('Error', 'Could not open PDF. Please try again.');
                      }
                    }}
                  >
                    <Text style={styles.openFileButtonText}>Open PDF</Text>
                  </TouchableOpacity>
                </View>
              ) : viewingFile?.file_name?.match(/\.(txt)$/i) ? (
                <View style={styles.fullScreenTextContainer}>
                  <Text style={styles.fullScreenText}>{fileContent}</Text>
                </View>
              ) : viewingFile?.file_name?.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/i) ? (
                <View style={styles.fullScreenInfoContainer}>
                  <Ionicons name="document-text" size={80} color={colors.BUTTON} />
                  <Text style={styles.fullScreenInfoText}>Document File</Text>
                  <Text style={styles.fullScreenInfoText}>File Name: {viewingFile?.file_name}</Text>
                  <Text style={styles.fullScreenInfoText}>Size: {formatFileSize(viewingFile?.size || 0)}</Text>
                  <Text style={styles.fullScreenInfoText}>Type: {viewingFile?.file_name?.split('.').pop()?.toUpperCase()}</Text>
                  <TouchableOpacity 
                    style={styles.openFileButton}
                    onPress={() => {
                      // Try to open the document with the system viewer
                      Linking.openURL(fileContent).catch(error => {
                        console.log('Error opening document:', error);
                        Alert.alert('Error', 'Could not open document. No suitable app available.');
                      });
                    }}
                  >
                    <Text style={styles.openFileButtonText}>Open Document</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.fullScreenInfoContainer}>
                  <Ionicons name="document" size={80} color={colors.BUTTON} />
                  <Text style={styles.fullScreenInfoText}>File Type: {viewingFile?.mime_type}</Text>
                  <Text style={styles.fullScreenInfoText}>Size: {formatFileSize(viewingFile?.size || 0)}</Text>
                  <Text style={styles.fullScreenInfoText}>File Name: {viewingFile?.file_name}</Text>
                  <TouchableOpacity 
                    style={styles.openFileButton}
                    onPress={() => {
                      // Try to open the file with the system viewer
                      Linking.openURL(fileContent).catch(error => {
                        console.log('Error opening file:', error);
                        Alert.alert('Error', 'Could not open file. No suitable app available.');
                      });
                    }}
                  >
                    <Text style={styles.openFileButtonText}>Open File</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </Modal>

        {/* Files Modal */}
        <Modal
          visible={showFilesModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowFilesModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.filesModalContent}>
              <Text style={styles.modalTitle}>My Files</Text>
              {isLoadingFiles ? (
                <ActivityIndicator size="large" color={colors.BUTTON} />
              ) : files.length === 0 ? (
                <View style={styles.emptyFilesState}>
                  <Ionicons name="folder-open-outline" size={60} color={colors.TEXT} />
                  <Text style={styles.emptyFilesText}>No files uploaded yet</Text>
                </View>
              ) : (
                <FlatList
                  data={files}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.fileItem}
                      onPress={() => handleViewFile(item)}
                    >
                      <View style={styles.fileIconContainer}>
                        <Ionicons name={getFileIcon(item.mime_type)} size={24} color={colors.BUTTON} />
                      </View>
                      <View style={styles.fileInfo}>
                        <Text style={styles.fileName}>{item.file_name}</Text>
                        <Text style={styles.fileSize}>{formatFileSize(item.size)}</Text>
                        {item.is_encrypted && (
                          <View style={styles.encryptedBadge}>
                            <Ionicons name="lock-closed" size={12} color={colors.BUTTON} />
                            <Text style={styles.encryptedText}>Encrypted</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  )}
                  style={styles.filesList}
                />
              )}
              <TouchableOpacity 
                style={styles.closeModalButton} 
                onPress={() => setShowFilesModal(false)}
              >
                <Text style={styles.closeModalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Delete Files Modal */}
        <Modal
          visible={showDeleteModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDeleteModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.filesModalContent}>
              <Text style={styles.modalTitle}>Select File to Delete</Text>
              {isLoadingFiles ? (
                <ActivityIndicator size="large" color={colors.BUTTON} />
              ) : files.length === 0 ? (
                <View style={styles.emptyFilesState}>
                  <Ionicons name="document" size={40} color={colors.TEXT} />
                  <Text style={styles.emptyFilesText}>No files to delete</Text>
                </View>
              ) : (
                <FlatList
                  style={styles.filesList}
                  data={files}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.fileItem}
                      onPress={() => handleDeleteFile(item)}
                    >
                      <View style={styles.fileIconContainer}>
                        <Ionicons
                          name={getFileIcon(item.mime_type)}
                          size={20}
                          color={colors.BUTTON}
                        />
                      </View>
                      <View style={styles.fileInfo}>
                        <Text style={styles.fileName}>{item.file_name}</Text>
                        <Text style={styles.fileSize}>{formatFileSize(item.size || 0)}</Text>
                        <View style={styles.encryptedBadge}>
                          <Ionicons name="lock-closed" size={12} color={colors.BUTTON} />
                          <Text style={styles.encryptedText}>Encrypted</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              )}
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.closeModalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          visible={selectedFileToDelete !== null}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setShowDeleteModal(false);
            setSelectedFileToDelete(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Confirm Delete</Text>
              <Text style={styles.modalMessage}>
                Are you sure you want to delete "{selectedFileToDelete?.file_name}"? This action cannot be undone.
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowDeleteModal(false);
                    setSelectedFileToDelete(null);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={confirmDeleteFile}
                  disabled={isDeletingFile}
                >
                  {isDeletingFile ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </>
    </SafeAreaView>
  );
};
