import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginRegisterScreen } from '../screens/auth/LoginRegisterScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { BiometricSetupScreen } from '../screens/auth/BiometricSetupScreen';
import { DetectingFaceScreen } from '../screens/auth/DetectingFaceScreen';
import { CheckingLivenessScreen } from '../screens/auth/CheckingLivenessScreen';
import { LoginDetectingFaceScreen } from '../screens/auth/LoginDetectingFaceScreen';
import { LoginCheckingLivenessScreen } from '../screens/auth/LoginCheckingLivenessScreen';

export type AuthStackParamList = {
  LoginRegister: undefined;
  Login: undefined;
  LoginDetectingFace: undefined;
  LoginCheckingLiveness: undefined;
  Register: undefined;
  DetectingFace: undefined;
  CheckingLiveness: undefined;
  BiometricSetup: { email: string; password: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="LoginRegister" component={LoginRegisterScreen} />
      <Stack.Screen name="LoginDetectingFace" component={LoginDetectingFaceScreen} />
      <Stack.Screen name="LoginCheckingLiveness" component={LoginCheckingLivenessScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="DetectingFace" component={DetectingFaceScreen} />
      <Stack.Screen name="CheckingLiveness" component={CheckingLivenessScreen} />
      <Stack.Screen 
        name="BiometricSetup" 
        component={BiometricSetupScreen} 
        options={{
          gestureEnabled: false,
          headerLeft: () => null,
        }}
      />
    </Stack.Navigator>
  );
};
