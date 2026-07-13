import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { AppRegistry } from 'react-native';
import { AppNavigator } from '@/navigation/AppNavigator';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';
import { colors } from '@/theme';

export default function App() {
  const { setIsLoading, isLoading } = useAppStore();

  useEffect(() => {
    // Initialize app
    const initApp = async () => {
      try {
        await api.connectWebSocket();
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
      }
      setIsLoading(false);
    };

    initApp();
  }, [setIsLoading]);

  if (isLoading) {
    return (
      <React.Fragment>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText variant="body" color={colors.textSecondary} style={{ marginTop: 16 }}>Loading AiTrader...</AppText>
        </View>
      </React.Fragment>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { AppText } from '@/components/Text';

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});

AppRegistry.registerComponent('AiTrader', () => App);