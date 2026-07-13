import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, AntDesign, Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { TradingScreen } from '@/screens/TradingScreen';
import { AIInsightsScreen } from '@/screens/AIInsightsScreen';
import { StrategyScreen } from '@/screens/StrategyScreen';
import { HistoryScreen } from '@/screens/HistoryScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TabBarIcon = ({ focused, color, size, iconName, library = 'Ionicons' }: { 
  focused: boolean; 
  color: string; 
  size: number; 
  iconName: string;
  library?: string;
}) => {
  const Icon = library === 'Ionicons' ? Ionicons : library === 'MaterialCommunityIcons' ? MaterialCommunityIcons : library === 'FontAwesome5' ? FontAwesome5 : library === 'AntDesign' ? AntDesign : Feather;
  return <Icon name={iconName} size={size} color={color} weight={focused ? 'bold' : 'normal'} />;
};

const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  const options = state.routes.map(route => descriptors[route.key].options);

  return (
    <View style={styles.tabBar}>
      <LinearGradient colors={colors.gradientBackground} style={StyleSheet.absoluteFillObject} />
      <View style={styles.tabBarInner}>
        {state.routes.map((route, index) => {
          const { options: routeOptions } = descriptors[route.key];
          const label = routeOptions.tabBarLabel ?? routeOptions.title ?? route.name;
          const isFocused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };
          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          const { tabBarIcon, tabBarColor } = routeOptions;
          const icon = tabBarIcon
            ? tabBarIcon({ focused: isFocused, color: tabBarColor, size: 26 })
            : null;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={label}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabItem}
              testID={route.key}
            >
              <View style={[styles.iconContainer, isFocused && styles.iconContainerFocused]}>
                {icon}
              </View>
              <AppText variant="overline" weight="semibold" color={isFocused ? colors.primary : colors.textMuted} style={styles.tabLabel}>
                {label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from '@/components/Text';

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
    paddingBottom: spacing.md,
    backgroundColor: 'transparent',
  },
  tabBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: '100%',
    paddingTop: spacing.sm,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  iconContainerFocused: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  tabLabel: {
    textAlign: 'center',
  },
});

const StackNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: colors.background },
      cardStyleInterpolator: ({ current: { progress } }) => ({
        cardStyle: {
          opacity: progress,
          transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }],
        },
      }),
    }}
  >
    <Stack.Screen name="Dashboard" component={DashboardScreen} />
    <Stack.Screen name="Trading" component={TradingScreen} />
    <Stack.Screen name="AIInsights" component={AIInsightsScreen} />
    <Stack.Screen name="Strategy" component={StrategyScreen} />
    <Stack.Screen name="History" component={HistoryScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
  </Stack.Navigator>
);

export const AppNavigator = () => (
  <NavigationContainer>
    <Tab.Navigator
      tabBar={CustomTabBar}
      tabBarOptions={{
        activeTintColor: colors.primary,
        inactiveTintColor: colors.textMuted,
        showLabel: false,
        style: { backgroundColor: 'transparent' },
      }}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, { name: string; library: string }> = {
            Dashboard: { name: 'home-outline', library: 'Ionicons' },
            Trading: { name: 'chart-line', library: 'MaterialCommunityIcons' },
            AIInsights: { name: 'sparkles', library: 'Ionicons' },
            Strategy: { name: 'settings', library: 'Ionicons' },
            History: { name: 'history', library: 'Ionicons' },
            Settings: { name: 'user', library: 'Ionicons' },
          };
          const icon = icons[route.name] || { name: 'help-outline', library: 'Ionicons' };
          return <TabBarIcon focused={focused} color={color} size={size} iconName={icon.name} library={icon.library} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={StackNavigator} />
      <Tab.Screen name="Trading" component={StackNavigator} />
      <Tab.Screen name="AIInsights" component={StackNavigator} />
      <Tab.Screen name="Strategy" component={StackNavigator} />
      <Tab.Screen name="History" component={StackNavigator} />
      <Tab.Screen name="Settings" component={StackNavigator} />
    </Tab.Navigator>
  </NavigationContainer>
);