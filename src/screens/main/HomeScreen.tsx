import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator, TextInput, Modal, FlatList, Image, ScrollView } from 'react-native';
import { Text } from '../../components/common/Text';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
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

const COLORS = {
  TEXT: '#483847',
  SCREEN_SKIN: '#EFD7ED',
  BUTTON: '#B378AF',
  PANEL: '#D7B3D5',
};

export const HomeScreen = () => {
  const [activeTab, setActiveTab] = useState('home');
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
  const { user } = useAuth();
  const navigation = useNavigation();
  
  let [fontsLoaded] = useFonts({
    Grandstander_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

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
      setFiles(data || []);
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

  const handleViewFile = async (file: any) => {
    try {
      if (!user?.id) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      // Get encryption key
      const encryptionKey = await getEncryptionKey(user.id);
      
      if (!encryptionKey) {
        Alert.alert('Error', 'Failed to get encryption key');
        return;
      }

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
      
      // Log debugging information
      console.log('File info:', file);
      console.log('File content length:', decryptedData.length);
      console.log('File content type:', typeof decryptedData);
      console.log('First 50 chars:', decryptedData.substring(0, 50));
      
      // Set the viewing file and content
      setViewingFile(file);
      setFileContent(decryptedData);
      setShowFileViewer(true);

    } catch (error) {
      console.error('Error viewing file:', error);
      Alert.alert('Error', 'Failed to process file');
    }
  };

  const renderHome = () => (
    <View style={styles.content}>
      <View style={styles.optionsContainer}>
        <TouchableOpacity style={styles.optionButton} onPress={pickDocument}>
          <Text style={styles.optionText}>
            {selectedFile ? `Selected: ${selectedFile.name}` : 'Upload File'}
          </Text>
        </TouchableOpacity>
        
        {selectedFile && (
          <TouchableOpacity 
            style={[styles.optionButton, styles.uploadButton]} 
            onPress={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.optionText}>Upload Now</Text>
            )}
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.optionButton} onPress={() => {
          loadFiles();
          setShowFilesModal(true);
        }}>
          <Text style={styles.optionText}>View Files</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.optionButton}>
          <Text style={styles.optionText}>Delete Files</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSettings = () => (
    <View style={styles.content}>
      {/* Settings content will go here */}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContent}>
        {activeTab === 'home' ? renderHome() : renderSettings()}
      </View>
      
      <View style={styles.bottomNavigation}>
        <TouchableOpacity 
          style={[styles.navButton, activeTab === 'home' && styles.activeNavButton]}
          onPress={() => setActiveTab('home')}
        >
          <Ionicons 
            name="home" 
            size={20} 
            color={activeTab === 'home' ? '#FFFFFF' : COLORS.TEXT} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navButton, activeTab === 'settings' && styles.activeNavButton]}
          onPress={() => setActiveTab('settings')}
        >
          <Ionicons 
            name="settings" 
            size={20} 
            color={activeTab === 'settings' ? '#FFFFFF' : COLORS.TEXT} 
          />
        </TouchableOpacity>
      </View>

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

      {/* File Viewer Modal */}
      <Modal
        visible={showFileViewer}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFileViewer(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.fileViewerContent}>
            <View style={styles.fileViewerHeader}>
              <Text style={styles.fileViewerTitle}>{viewingFile?.file_name}</Text>
              <TouchableOpacity 
                style={styles.closeViewerButton}
                onPress={() => setShowFileViewer(false)}
              >
                <Ionicons name="close" size={24} color={COLORS.TEXT} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.fileViewerBody}>
              {viewingFile?.mime_type.startsWith('image/') || viewingFile?.file_name?.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                <Image 
                  source={{ uri: `data:image/jpeg;base64,${fileContent}` }}
                  style={styles.fileViewerImage}
                  resizeMode="contain"
                />
              ) : viewingFile?.mime_type.includes('text') || viewingFile?.file_name?.match(/\.(txt)$/i) ? (
                <View style={styles.textContentView}>
                  <Text style={styles.textContent}>{fileContent}</Text>
                </View>
              ) : (
                <View style={styles.fileInfoView}>
                  <Ionicons name="document" size={60} color={COLORS.BUTTON} />
                  <Text style={styles.fileInfoText}>File Type: {viewingFile?.mime_type}</Text>
                  <Text style={styles.fileInfoText}>Size: {formatFileSize(viewingFile?.size || 0)}</Text>
                  <Text style={styles.fileInfoText}>File Name: {viewingFile?.file_name}</Text>
                  <Text style={styles.fileInfoText}>This file type cannot be displayed within the app.</Text>
                </View>
              )}
            </ScrollView>
          </View>
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
              <ActivityIndicator size="large" color={COLORS.BUTTON} />
            ) : files.length === 0 ? (
              <View style={styles.emptyFilesState}>
                <Ionicons name="folder-open-outline" size={60} color={COLORS.TEXT} />
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
                      <Ionicons name={getFileIcon(item.mime_type)} size={24} color={COLORS.BUTTON} />
                    </View>
                    <View style={styles.fileInfo}>
                      <Text style={styles.fileName}>{item.file_name}</Text>
                      <Text style={styles.fileSize}>{formatFileSize(item.size)}</Text>
                      {item.is_encrypted && (
                        <View style={styles.encryptedBadge}>
                          <Ionicons name="lock-closed" size={12} color={COLORS.BUTTON} />
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.SCREEN_SKIN,
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
    backgroundColor: COLORS.BUTTON,
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
    backgroundColor: COLORS.PANEL,
    paddingBottom: 10,
    paddingTop: 10,
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeNavButton: {
    backgroundColor: COLORS.BUTTON,
    marginHorizontal: 20,
    borderRadius: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.SCREEN_SKIN,
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
    fontSize: 24,
    fontFamily: 'Grandstander_700Bold',
    color: COLORS.TEXT,
    marginBottom: 25,
    textAlign: 'center',
  },
  pinInput: {
    width: '100%',
    height: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: COLORS.BUTTON,
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
    backgroundColor: COLORS.BUTTON,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Grandstander_700Bold',
    color: COLORS.TEXT,
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: 'Grandstander_700Bold',
    color: '#FFFFFF',
  },
  filesModalContent: {
    backgroundColor: COLORS.SCREEN_SKIN,
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
    color: COLORS.TEXT,
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
    backgroundColor: COLORS.BUTTON + '20',
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
    color: COLORS.TEXT,
    marginBottom: 5,
  },
  fileSize: {
    fontSize: 14,
    fontFamily: 'Grandstander_700Bold',
    color: COLORS.TEXT,
  },
  encryptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BUTTON + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 5,
  },
  encryptedText: {
    fontSize: 12,
    fontFamily: 'Grandstander_700Bold',
    color: COLORS.BUTTON,
    marginLeft: 5,
  },
  filesList: {
    width: '100%',
  },
  closeModalButton: {
    backgroundColor: COLORS.BUTTON,
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
    backgroundColor: COLORS.PANEL,
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
    borderBottomColor: COLORS.TEXT,
  },
  fileViewerTitle: {
    fontSize: 18,
    fontFamily: 'Grandstander_700Bold',
    color: COLORS.TEXT,
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
    color: COLORS.TEXT,
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
    color: COLORS.TEXT,
    marginTop: 10,
    textAlign: 'center',
  },
});
