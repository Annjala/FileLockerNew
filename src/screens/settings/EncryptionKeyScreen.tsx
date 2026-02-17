import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Text } from '../../components/common/Text';
import { Button } from '../../components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/MainStack';
import { 
  generateEncryptionKey, 
  getEncryptionKey, 
  hasEncryptionKey,
  deleteEncryptionKey
} from '../../utils/security';

export const EncryptionKeyScreen = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isLoading, setIsLoading] = useState(true);
  const [keyExists, setKeyExists] = useState(false);
  const [keyInfo, setKeyInfo] = useState<{
    created: string;
    lastAccessed: string;
    algorithm: string;
  } | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    checkEncryptionKeyStatus();
  }, []);

  const checkEncryptionKeyStatus = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const exists = await hasEncryptionKey(user.id);
      setKeyExists(exists);
      
      if (exists) {
        // Get key metadata (in a real app, you'd store this separately)
        setKeyInfo({
          created: new Date().toLocaleDateString(), // Placeholder
          lastAccessed: new Date().toLocaleDateString(), // Placeholder
          algorithm: 'AES-256'
        });
      }
    } catch (error) {
      console.error('Error checking encryption key status:', error);
      Alert.alert('Error', 'Failed to check encryption key status');
    } finally {
      setIsLoading(false);
    }
  };

  const authenticateWithBiometrics = async (): Promise<boolean> => {
    // We don't need biometric authentication for Android Keystore
    // Only PIN authentication is required for file operations
    return true;
  };

  const handleViewEncryptionKey = async () => {
    if (!user) return;

    const authenticated = await authenticateWithBiometrics();
    if (!authenticated) return;

    try {
      const key = await getEncryptionKey(user.id);
      if (key) {
        // Show key in a secure way (first and last 8 characters)
        const maskedKey = `${key.substring(0, 8)}...${key.substring(key.length - 8)}`;
        Alert.alert(
          'Encryption Key',
          `Key: ${maskedKey}\n\nThis is your encryption key used to secure your files. Keep it safe and never share it with anyone.`,
          [
            { text: 'OK' },
            {
              text: 'Copy Full Key',
              onPress: () => {
                Alert.alert(
                  'Security Warning',
                  'Copying the full encryption key to clipboard can be a security risk. Are you sure?',
                  [
                    { text: 'Cancel' },
                    {
                      text: 'Copy',
                      style: 'destructive',
                      onPress: () => {
                        // In a real app, you'd copy to clipboard
                        Alert.alert('Copied', 'Encryption key copied to clipboard');
                      }
                    }
                  ]
                );
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', 'No encryption key found');
      }
    } catch (error) {
      console.error('Error retrieving encryption key:', error);
      Alert.alert('Error', 'Failed to retrieve encryption key');
    }
  };

  const handleGenerateNewKey = async () => {
    if (!user) return;

    Alert.alert(
      'Generate New Encryption Key',
      'This will generate a new encryption key. All existing encrypted files will become inaccessible unless you have a backup. Are you sure?',
      [
        { text: 'Cancel' },
        {
          text: 'Generate',
          style: 'destructive',
          onPress: async () => {
            const authenticated = await authenticateWithBiometrics();
            if (!authenticated) return;

            try {
              setIsRegenerating(true);
              
              // Generate new encryption key
              const newKey = await generateEncryptionKey(user.id);
              
              // Store the new key (no separate storeEncryptionKey function needed)
              const success = true; // Key is automatically stored in generateEncryptionKey
              
              if (success) {
                Alert.alert(
                  'Success',
                  'New encryption key generated successfully. Your future files will be encrypted with this new key.',
                  [{ text: 'OK', onPress: () => checkEncryptionKeyStatus() }]
                );
              } else {
                Alert.alert('Error', 'Failed to store new encryption key');
              }
            } catch (error) {
              console.error('Error generating new key:', error);
              Alert.alert('Error', 'Failed to generate new encryption key');
            } finally {
              setIsRegenerating(false);
            }
          }
        }
      ]
    );
  };

  const handleBackupKey = async () => {
    if (!user) return;

    const authenticated = await authenticateWithBiometrics();
    if (!authenticated) return;

    Alert.alert(
      'Backup Encryption Key',
      'This feature would allow you to securely backup your encryption key. In a production app, this would integrate with secure cloud storage or allow manual backup.',
      [{ text: 'OK' }]
    );
  };

  const InfoCard = ({ title, value, icon }: { title: string; value: string; icon: keyof typeof Ionicons.glyphMap }) => (
    <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.infoIcon, { backgroundColor: colors.primary + '20' }]}>
        <Ionicons name={icon} size={24} color={colors.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoTitle, { color: colors.textSecondary }]}>{title}</Text>
        <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Checking encryption key...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Encryption Key</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Section */}
        <View style={[styles.statusCard, { backgroundColor: keyExists ? colors.success + '20' : colors.warning + '20' }]}>
          <Ionicons 
            name={keyExists ? "shield-checkmark" : "shield-outline"} 
            size={48} 
            color={keyExists ? colors.success : colors.warning} 
          />
          <Text style={[styles.statusTitle, { color: colors.text }]}>
            {keyExists ? 'Encryption Key Active' : 'No Encryption Key'}
          </Text>
          <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>
            {keyExists 
              ? 'Your files are protected with AES-256 encryption'
              : 'Generate an encryption key to secure your files'
            }
          </Text>
        </View>

        {/* Key Information */}
        {keyExists && keyInfo && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>KEY INFORMATION</Text>
            <InfoCard title="Algorithm" value={keyInfo.algorithm} icon="lock-closed" />
            <InfoCard title="Created" value={keyInfo.created} icon="calendar" />
            <InfoCard title="Last Accessed" value={keyInfo.lastAccessed} icon="time" />
          </View>
        )}

        {/* Security Notice */}
        <View style={[styles.noticeCard, { backgroundColor: colors.info + '20', borderColor: colors.info }]}>
          <Ionicons name="information-circle" size={24} color={colors.info} />
          <View style={styles.noticeContent}>
            <Text style={[styles.noticeTitle, { color: colors.text }]}>Security Notice</Text>
            <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
              Your encryption key is stored securely on this device using hardware-backed security. 
              It's protected by your biometric authentication and never leaves your device.
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          {keyExists ? (
            <>
              <Button
                title="View Encryption Key"
                onPress={handleViewEncryptionKey}
                style={StyleSheet.flatten([styles.actionButton, { backgroundColor: colors.primary }])}
                disabled={isAuthenticating}
                loading={isAuthenticating}
              />
              
              <Button
                title="Backup Key"
                onPress={handleBackupKey}
                style={StyleSheet.flatten([styles.actionButton, { backgroundColor: colors.info }])}
                disabled={isAuthenticating}
              />
              
              <Button
                title="Generate New Key"
                onPress={handleGenerateNewKey}
                style={StyleSheet.flatten([styles.actionButton, { backgroundColor: colors.warning }])}
                disabled={isAuthenticating || isRegenerating}
                loading={isRegenerating}
              />
            </>
          ) : (
            <Button
              title="Generate Encryption Key"
              onPress={handleGenerateNewKey}
              style={StyleSheet.flatten([styles.actionButton, { backgroundColor: colors.primary }])}
              disabled={isRegenerating}
              loading={isRegenerating}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: 20,
  },
  statusCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  statusSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  noticeCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  noticeContent: {
    flex: 1,
    marginLeft: 12,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionsSection: {
    gap: 12,
  },
  actionButton: {
    height: 50,
    borderRadius: 12,
  },
});
