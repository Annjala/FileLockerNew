import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../components/common/Text';

// Color constants
const COLORS = {
  TEXT: '#483847',
  SCREEN_SKIN: '#EFD7ED',
  BUTTON: '#B378AF',
  PLACEHOLDER: '#6B7280',
};

type Props = NativeStackScreenProps<AuthStackParamList, 'LoginRegister'>;

export const LoginRegisterScreen = ({ navigation }: Props) => {
  const handleRegisterPress = () => {
    navigation.navigate('DetectingFace');
  };

  const handleLoginPress = () => {
    navigation.navigate('LoginDetectingFace');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.SCREEN_SKIN }]}>
      <View style={styles.content}>
        <View style={styles.buttonContainer}>
          <Text style={styles.promptText}>New user?</Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={handleRegisterPress}
          >
            <Text style={styles.buttonText}>REGISTER</Text>
          </TouchableOpacity>
          
          <Text style={styles.promptText}>Already have an account?</Text>
          <TouchableOpacity 
            style={[styles.button, styles.loginButton]}
            onPress={handleLoginPress}
          >
            <Text style={styles.buttonText}>LOGIN</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  buttonContainer: {
    gap: 17, // Space between text and button pairs
  },
  button: {
    backgroundColor: COLORS.BUTTON,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    elevation: 2,
  },
  loginButton: {
    backgroundColor: COLORS.BUTTON,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  promptText: {
    fontSize: 14,
    color: COLORS.TEXT,
    textAlign: 'left', // Left aligned
    marginLeft: 1,
    marginBottom: 0, // Remove space completely
  },
});
