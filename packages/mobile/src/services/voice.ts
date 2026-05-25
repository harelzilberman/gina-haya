import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

const OPENAI_KEY = process.env.EXPO_PUBLIC_OPENAI_KEY ?? '';

let activeRecording: Audio.Recording | null = null;

export async function startRecording(): Promise<void> {
  await Audio.requestPermissionsAsync();
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });
  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync({
    ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
    android: {
      ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
      extension: '.m4a',
      outputFormat: Audio.AndroidOutputFormat.MPEG_4,
      audioEncoder: Audio.AndroidAudioEncoder.AAC,
    },
  });
  await recording.startAsync();
  activeRecording = recording;
}

export async function stopRecordingAndTranscribe(): Promise<string> {
  if (!activeRecording) throw new Error('No active recording');
  await activeRecording.stopAndUnloadAsync();
  const uri = activeRecording.getURI();
  activeRecording = null;

  if (!uri) throw new Error('אין קובץ הקלטה');
  if (!OPENAI_KEY) throw new Error('מפתח OpenAI לא מוגדר');

  await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

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
