import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

let supabaseStorage: any;

// Use localStorage on web (if available), AsyncStorage on native
if (Platform.OS === 'web') {
  try {
    // Validate localStorage availability (avoids SSR crash)
    const testKey = '__test__';
    window.localStorage.setItem(testKey, 'test');
    window.localStorage.removeItem(testKey);
    supabaseStorage = window.localStorage;
  } catch (err) {
    console.warn('localStorage not available, falling back to memory');
    supabaseStorage = undefined; // fallback to memory if needed
  }
} else {
  supabaseStorage = AsyncStorage;
}

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  process.env.EXPO_PUBLIC_SUPABASE_KEY || '',
  {
    auth: {
      storage: supabaseStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);