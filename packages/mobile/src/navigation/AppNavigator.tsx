import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { HomeScreen }     from '../screens/HomeScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { GuidesScreen }   from '../screens/GuidesScreen';

export type TabParamList = {
  Home:     undefined;
  Calendar: undefined;
  Guides:   undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const ICON: Record<string, string> = {
  Home:     '🌱',
  Calendar: '📅',
  Guides:   '📖',
};

const LABEL: Record<string, string> = {
  Home:     'בית',
  Calendar: 'לוח',
  Guides:   'מדריכים',
};

export function AppNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0e0e08',
          borderTopColor:  'rgba(196,134,10,0.2)',
          height:          64,
          paddingBottom:   10,
          paddingTop:      4,
        },
        tabBarActiveTintColor:   '#c4860a',
        tabBarInactiveTintColor: 'rgba(245,240,232,0.4)',
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 28, opacity: focused ? 1 : 0.55 }}>
            {ICON[route.name]}
          </Text>
        ),
        tabBarLabel: LABEL[route.name] ?? route.name,
        tabBarLabelStyle: {
          fontFamily: 'System',
          fontSize:   13,
          marginTop:  2,
        },
      })}
    >
      <Tab.Screen name="Home"     component={HomeScreen}     />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Guides"   component={GuidesScreen}   />
    </Tab.Navigator>
  );
}
