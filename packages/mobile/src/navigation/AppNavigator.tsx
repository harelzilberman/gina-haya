import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ChupChuScreen } from '../screens/ChupChuScreen';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';
import { theme } from '../theme';

const Tab = createBottomTabNavigator();

export function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBar,
          borderTopColor: theme.colors.border,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: {
          fontSize: theme.fontSize.xs,
          writingDirection: 'rtl',
        },
      }}
    >
      <Tab.Screen
        name="Chupchu"
        component={ChupChuScreen}
        options={{
          tabBarLabel: "צ'ופצ'ו",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🌿</Text>,
        }}
      />
      <Tab.Screen
        name="Tasks"
        options={{
          tabBarLabel: 'משימות',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>✅</Text>,
        }}
      >
        {() => <PlaceholderScreen name="משימות" />}
      </Tab.Screen>
      <Tab.Screen
        name="Calendar"
        options={{
          tabBarLabel: 'לוח',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🌙</Text>,
        }}
      >
        {() => <PlaceholderScreen name="לוח ביודינמי" />}
      </Tab.Screen>
      <Tab.Screen
        name="Settings"
        options={{
          tabBarLabel: 'הגדרות',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⚙️</Text>,
        }}
      >
        {() => <PlaceholderScreen name="הגדרות" />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
