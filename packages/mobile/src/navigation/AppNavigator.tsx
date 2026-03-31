import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { CalendarScreen }  from '../screens/CalendarScreen';
import { TasksScreen }     from '../screens/TasksScreen';
import { MooshScreen }     from '../screens/MooshScreen';
import { SettingsScreen }  from '../screens/SettingsScreen';

export type TabParamList = {
  Calendar: undefined;
  Tasks:    undefined;
  Moosh:    undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const ICON: Record<string, string> = {
  Calendar: '📅',
  Tasks:    '✅',
  Moosh:    '🌕',
  Settings: '⚙️',
};

const LABEL: Record<string, string> = {
  Calendar: 'לוח',
  Tasks:    'משימות',
  Moosh:    'מוש',
  Settings: 'הגדרות',
};

export function AppNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Calendar"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f2212',
          borderTopColor:  'rgba(200,168,75,0.2)',
          height:          60,
          paddingBottom:   8,
        },
        tabBarActiveTintColor:   '#c8a84b',
        tabBarInactiveTintColor: 'rgba(237,224,196,0.45)',
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.6 }}>
            {ICON[route.name]}
          </Text>
        ),
        tabBarLabel: LABEL[route.name] ?? route.name,
        tabBarLabelStyle: {
          fontFamily: 'System',
          fontSize: 11,
        },
      })}
    >
      <Tab.Screen name="Calendar"  component={CalendarScreen}  />
      <Tab.Screen name="Tasks"     component={TasksScreen}     />
      <Tab.Screen name="Moosh"     component={MooshScreen}     />
      <Tab.Screen name="Settings"  component={SettingsScreen}  />
    </Tab.Navigator>
  );
}
