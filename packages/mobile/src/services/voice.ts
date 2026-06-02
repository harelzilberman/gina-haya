import * as Speech from 'expo-speech';
import {
  AudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';

const OPENAI_KEY = process.env.EXPO_PUBLIC_OPENAI_KEY ?? '';

let activeRecorder: any = null;

export async function startRecording(): Promise<void> {
  const { granted } = await requestRecordingPermissionsAsync();
  if (!granted) throw new Error('אין אישור גישה למיקרופון בהגדרות');
  await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
  const recorder = new AudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    android: {
      ...RecordingPresets.HIGH_QUALITY.android,
      outputFormat: 'mpeg4',
      audioEncoder: 'aac',
    },
  });
  await recorder.prepareToRecordAsync();
  recorder.record();
  activeRecorder = recorder;
}

export async function stopRecordingAndTranscribe(): Promise<string> {
  if (!activeRecorder) throw new Error('No active recording');
  await activeRecorder.stop();
  const uri = activeRecorder.uri;
  activeRecorder = null;
  if (!uri) throw new Error('אין קובץ הקלטה');
  if (!OPENAI_KEY) throw new Error('מפתח OpenAI לא מוגדר');
  await setAudioModeAsync({ allowsRecording: false });
  const formData = new FormData();
  formData.append('file', { uri, type: 'audio/m4a', name: 'audio.m4a' } as any);
  formData.append('model', 'whisper-1');
  formData.append('language', 'he');
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_KEY}` },
    body: formData,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message ?? `Whisper error ${response.status}`);
  }
  const { text } = await response.json();
  return (text ?? '').trim();
}

export function speakHebrew(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    Speech.speak(text, {
      language: 'he-IL',
      rate: 0.92,
      onDone: resolve,
      onError: reject,
    });
  });
}

export function stopSpeaking(): void {
  Speech.stop();
}

export function isSpeaking(): Promise<boolean> {
  return Speech.isSpeakingAsync();
}
