import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { useTheme } from '../../theme/ThemeContext';
import { Text } from '../../components/common/Text';
import { SafeAreaView } from 'react-native-safe-area-context';

// Color constants
const COLORS = {
  TEXT: '#483847',
  SCREEN_SKIN: '#EFD7ED',
  BUTTON: '#B378AF',
  PLACEHOLDER: '#6B7280',
};

// Custom Loader Component
const CustomLoader = () => {
  return (
    <View style={loaderStyles.container}>
      <View style={[loaderStyles.dot, loaderStyles.dot1]} />
      <View style={[loaderStyles.dot, loaderStyles.dot2]} />
      <View style={[loaderStyles.dot, loaderStyles.dot3]} />
      <View style={[loaderStyles.dot, loaderStyles.dot4]} />
      <View style={[loaderStyles.dot, loaderStyles.dot5]} />
    </View>
  );
};

const loaderStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.TEXT,
  },
  dot1: {
    opacity: 1,
  },
  dot2: {
    opacity: 0.8,
  },
  dot3: {
    opacity: 0.6,
  },
  dot4: {
    opacity: 0.4,
  },
  dot5: {
    opacity: 0.2,
  },
});

type Props = NativeStackScreenProps<AuthStackParamList, 'LoginCheckingLiveness'>;

export const LoginCheckingLivenessScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(true);

  const handlePress = () => {
    setIsLoading(false);
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.SCREEN_SKIN }]}>
      <TouchableOpacity 
        style={styles.pressableArea} 
        onPress={handlePress}
        activeOpacity={1}
      >
        <View style={styles.content}>
          <Text style={styles.title}>CHECKING LIVENESS</Text>
          {isLoading ? <CustomLoader /> : null}
          <Text style={styles.subtitle}>PLEASE WAIT FOR</Text>
          <Text style={styles.subtitle}>A MOMENT</Text>
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pressableArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 30, // Proper space between title and loader
  },
  title: {
    fontSize: 28, // BIG title font
    fontWeight: '700',
    color: COLORS.TEXT,
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 0,
  },
  subtitle: {
    fontSize: 18, // BIG subtitle font
    color: COLORS.TEXT,
    textAlign: 'center',
    lineHeight: 22, // More space between lines
    letterSpacing: 1,
    marginTop: 30, // Space between loader and subtitle
  },
});
