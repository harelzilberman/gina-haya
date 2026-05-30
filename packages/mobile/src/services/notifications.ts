// expo-notifications removed — push notifications disabled for Expo Go development.
// Re-enable by reinstalling expo-notifications and restoring this service.

export async function registerPushToken(): Promise<void> {
  // no-op
}

export async function scheduleDailyNotification(): Promise<void> {
  // no-op
}

export async function scheduleTaskNotification(
  _title: string,
  _dueDateISO: string,
): Promise<void> {
  // no-op
}
