import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { useTheme } from '../../theme/ThemeContext';
import { Text } from '../../components/common/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useFonts,
  Grandstander_700Bold,
  Grandstander_400Regular,
} from '@expo-google-fonts/grandstander';

// Color constants
const COLORS = {
  TEXT: '#483847',
  SCREEN_SKIN: '#EFD7ED',
  BUTTON: '#B378AF',
  PLACEHOLDER: '#6B7280',
};

type Props = NativeStackScreenProps<AuthStackParamList, 'LoginRegister'>;

export const LoginRegisterScreen = ({ navigation }: Props) => {
  let [fontsLoaded] = useFonts({
    Grandstander_700Bold,
    Grandstander_400Regular,
  });

  const handleRegisterPress = () => {
    navigation.navigate('Register');
  };

  const handleLoginPress = () => {
    navigation.navigate('Login');
  };

  if (!fontsLoaded) {
    return null;
  }

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
    fontSize: 18,
    fontFamily: 'Grandstander_700Bold',
    letterSpacing: 0.5,
  },
  promptText: {
    fontSize: 16,
    fontFamily: 'Grandstander_400Regular',
    color: COLORS.TEXT,
    textAlign: 'left', // Left aligned
    marginLeft: 1,
    marginBottom: 0, // Remove space completely
  },
});
