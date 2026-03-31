import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiFetch } from '../config/api';
import { getToken } from './auth';
import { fetchTodayCalendar } from './calendar';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge:  false,
  }),
});

export async function registerPushToken(): Promise<void> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily', {
      name: 'עדכון יומי',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return;

  try {
    const { data: pushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = await getToken();
    if (token) {
      await apiFetch('/api/users/push-token', token, {
        method: 'POST',
        body: JSON.stringify({ pushToken }),
      });
    }
  } catch (err) {
    console.warn('[notifications] Failed to register push token:', err);
  }
}

export async function scheduleDailyNotification(): Promise<void> {
  // Cancel existing scheduled notifications before rescheduling
  await Notifications.cancelAllScheduledNotificationsAsync();

  let body = 'בוקר טוב — בדוק את לוח הביודינמי להיום';

  try {
    const day = await fetchTodayCalendar();
    const dayTypeMap: Record<string, string> = {
      fruit: 'פרי 🍎', root: 'שורש 🥕', flower: 'פרח 🌸', leaf: 'עלה 🌿',
    };
    const label = dayTypeMap[day.dayType] ?? day.dayType;
    body = `היום יום ${label} — ציון ${day.plantingScore}/10`;
  } catch {
    // Use default body if calendar fetch fails
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'גינה חיה 🌱',
      body,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour:    7,
      minute:  0,
    },
  });
}
