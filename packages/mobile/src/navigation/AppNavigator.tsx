import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalendarScreen } from '../screens/CalendarScreen';
import { GuidesScreen }   from '../screens/GuidesScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ChupChuScreen }  from '../screens/ChupChuScreen';

export type TabParamList = {
  Chupchu:  undefined;
  Calendar: undefined;
  Guides:   undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const ICON: Record<string, string> = {
  Chupchu:  '🤖',
  Calendar: '📅',
  Guides:   '📖',
  Settings: '⚙️',
};

const LABEL: Record<string, string> = {
  Chupchu:  "צ'ופצ'ו",
  Calendar: 'לוח',
  Guides:   'מדריכים',
  Settings: 'הגדרות',
};

export function AppNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="Chupchu"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0e0e08',
          borderTopColor:  'rgba(196,134,10,0.2)',
          height:          56 + insets.bottom,
          paddingBottom:   insets.bottom + 6,
          paddingTop:      6,
        },
        tabBarActiveTintColor:   '#c4860a',
        tabBarInactiveTintColor: 'rgba(245,240,232,0.4)',
        tabBarIcon: ({ focused }) => (
          route.name === 'Chupchu' ? (
            <Image
              source={require('../assets/chupchu_web_in_hole.png')}
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                opacity: focused ? 1 : 0.45,
                borderWidth: focused ? 1.5 : 0,
                borderColor: '#c4860a',
              }}
              resizeMode="cover"
            />
          ) : (
            <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.5 }}>
              {ICON[route.name]}
            </Text>
          )
        ),
        tabBarLabel: LABEL[route.name] ?? route.name,
        tabBarLabelStyle: {
          fontFamily: 'System',
          fontSize:   12,
          marginTop:  2,
        },
      })}
    >
      <Tab.Screen name="Chupchu"  component={ChupChuScreen}  />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Guides"   component={GuidesScreen}   />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
