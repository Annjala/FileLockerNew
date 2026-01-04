import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Text } from '../../components/common/Text';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/MainStack';
import {
  useFonts,
  Grandstander_700Bold,
} from '@expo-google-fonts/grandstander';

export const SettingsScreen = () => {
  const { user, signOut, setupBiometricAuth, setAutoLockTime, getAutoLockTime, lockApp } = useAuth();
  const { isDarkMode, colors, toggleDarkMode } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoLockTime, setAutoLockTimeState] = useState(getAutoLockTime());
  const [autoLockEnabled, setAutoLockEnabled] = useState(autoLockTime > 0);
  
  let [fontsLoaded] = useFonts({
    Grandstander_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  const handleAutoLockTimeChange = (minutes: number) => {
    setAutoLockTimeState(minutes);
    setAutoLockTime(minutes);
    setAutoLockEnabled(minutes > 0);
  };

  const handleAutoLockToggle = (value: boolean) => {
    if (value) {
      // Show time selection popup when enabling
      Alert.alert(
        'Auto-Lock Settings',
        'Select auto-lock time',
        [
          { text: '1 minute', onPress: () => { 
            setAutoLockTimeState(1); 
            setAutoLockTime(1); 
            setAutoLockEnabled(true); 
          }},
          { text: '2 minutes', onPress: () => { 
            setAutoLockTimeState(2); 
            setAutoLockTime(2); 
            setAutoLockEnabled(true); 
          }},
          { text: '5 minutes', onPress: () => { 
            setAutoLockTimeState(5); 
            setAutoLockTime(5); 
            setAutoLockEnabled(true); 
          }},
          { text: '10 minutes', onPress: () => { 
            setAutoLockTimeState(10); 
            setAutoLockTime(10); 
            setAutoLockEnabled(true); 
          }},
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } else {
      // Disable immediately
      setAutoLockEnabled(false);
      setAutoLockTimeState(0);
      setAutoLockTime(0);
    }
  };

  const getAutoLockDisplayText = (minutes: number) => {
    if (minutes === 0) return 'Disabled';
    if (minutes === 1) return '1 minute';
    return `${minutes} minutes`;
  };

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      const success = await setupBiometricAuth();
      if (success) {
        setBiometricEnabled(true);
        Alert.alert('Success', 'Biometric authentication enabled');
      }
    } else {
      setBiometricEnabled(false);
      Alert.alert('Disabled', 'Biometric authentication disabled');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const handleEncryptionKeyPress = () => {
    navigation.navigate('EncryptionKey');
  };

  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    showArrow = true,
    rightElement,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showArrow?: boolean;
    rightElement?: React.ReactNode;
  }) => (
    <TouchableOpacity
      style={[styles.settingItem, { backgroundColor: colors.PANEL, borderColor: colors.BUTTON }]}
      onPress={onPress}
      disabled={!onPress && !rightElement}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.BUTTON + '20' }]}>
        <Ionicons name={icon} size={24} color={colors.BUTTON} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: colors.TEXT }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: colors.TEXT }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement || (showArrow && (
        <Ionicons name="chevron-forward" size={20} color={colors.TEXT} />
      ))}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.SCREEN_SKIN }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.PANEL, borderBottomColor: colors.BUTTON }]}>
        <Text style={[styles.headerTitle, { color: colors.TEXT }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.TEXT }]}>ACCOUNT</Text>
          
          <SettingItem
            icon="person-outline"
            title="Profile"
            subtitle="View your profile"
            onPress={() => Alert.alert('Profile', 'Profile feature coming soon!')}
          />
          
          <SettingItem
            icon="key-outline"
            title="Change Password"
            subtitle="Update your password"
            onPress={() => Alert.alert('Change Password', 'Password change feature coming soon!')}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.TEXT }]}>SECURITY</Text>
          
          <SettingItem
            icon="finger-print"
            title="Biometric Authentication"
            subtitle={biometricEnabled ? 'Enabled' : 'Disabled'}
            showArrow={false}
            rightElement={
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                trackColor={{ false: colors.BUTTON, true: colors.BUTTON }}
                thumbColor="#fff"
              />
            }
          />
          
          <SettingItem
            icon="shield-checkmark-outline"
            title="Encryption Key"
            subtitle="Manage your encryption key"
            onPress={handleEncryptionKeyPress}
          />
          
          <SettingItem
            icon="lock-closed-outline"
            title="Auto-Lock"
            subtitle={getAutoLockDisplayText(autoLockTime)}
            showArrow={false}
            rightElement={
              <Switch
                value={autoLockEnabled}
                onValueChange={handleAutoLockToggle}
                trackColor={{ false: colors.BUTTON, true: colors.BUTTON }}
                thumbColor="#fff"
              />
            }
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.TEXT }]}>PREFERENCES</Text>
          
          <SettingItem
            icon="moon-outline"
            title="Dark Mode"
            subtitle={isDarkMode ? 'Enabled' : 'Disabled'}
            showArrow={false}
            rightElement={
              <Switch
                value={isDarkMode}
                onValueChange={toggleDarkMode}
                trackColor={{ false: colors.BUTTON, true: colors.BUTTON }}
                thumbColor="#fff"
              />
            }
          />
          
          <SettingItem
            icon="notifications-outline"
            title="Notifications"
            subtitle={notificationsEnabled ? 'Enabled' : 'Disabled'}
            showArrow={false}
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: colors.BUTTON, true: colors.BUTTON }}
                thumbColor="#fff"
              />
            }
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.TEXT }]}>STORAGE</Text>
          
          <SettingItem
            icon="cloud-outline"
            title="Storage Usage"
            subtitle="View storage details"
            onPress={() => Alert.alert('Storage Usage', 'Storage usage feature coming soon!')}
          />
          
          <SettingItem
            icon="trash-outline"
            title="Clear Cache"
            subtitle="Free up space"
            onPress={() => {
              Alert.alert(
                'Clear Cache',
                'Are you sure you want to clear the cache?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Clear', onPress: () => Alert.alert('Success', 'Cache cleared!') }
                ]
              );
            }}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.TEXT }]}>ABOUT</Text>
          
          <SettingItem
            icon="information-circle-outline"
            title="About"
            subtitle="Version 1.0.0"
            onPress={() => Alert.alert('About', 'FileLocker v1.0.0\n\nSecure file storage app')}
          />
          
          <SettingItem
            icon="document-text-outline"
            title="Privacy Policy"
            onPress={() => Alert.alert('Privacy Policy', 'Privacy policy will be available soon.')}
          />
          
          <SettingItem
            icon="shield-outline"
            title="Terms of Service"
            onPress={() => Alert.alert('Terms of Service', 'Terms of service will be available soon.')}
          />
        </View>

        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: colors.BUTTON }]}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={24} color="#fff" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Grandstander_700Bold',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Grandstander_700Bold',
    marginBottom: 12,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 15,
    marginBottom: 8,
    borderWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Grandstander_700Bold',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    fontFamily: 'Grandstander_700Bold',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 15,
    marginTop: 20,
    gap: 8,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Grandstander_700Bold',
  },
});
