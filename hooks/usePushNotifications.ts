import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../supabase';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [notification, setNotification] = useState<Notifications.Notification | undefined>();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      console.log('🔔 Push token received in hook:', token);
      setExpoPushToken(token);
      // Store token in Supabase profile
      if (token) {
        updatePushTokenInProfile(token);
      }
    });

    // Listen for incoming notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    // Listen for user interactions with notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      // Handle notification tap
      console.log('Notification tapped:', response);
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const updatePushTokenInProfile = async (token: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('users')
          .update({ expo_push_token: token })
          .eq('id', user.id);
        
        if (error) {
          console.error('Error updating push token:', error);
        } else {
          console.log('✅ Push token updated successfully in database');
        }
      }
    } catch (error) {
      console.error('Error in updatePushTokenInProfile:', error);
    }
  };

  return {
    expoPushToken,
    notification,
  };
}

async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  console.log('🚀 Starting push notification registration...');
  
  let token;

  // Check if it's a physical device
  if (!Device.isDevice) {
    console.warn('❌ Push notifications require a physical device');
    alert('Must use physical device for Push Notifications');
    return;
  }

  console.log('✅ Running on physical device');

  // Set up Android notification channel
  if (Platform.OS === 'android') {
    console.log('📱 Setting up Android notification channel...');
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  // Request permissions
  console.log('🔐 Checking permissions...');
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  console.log('Current permission status:', existingStatus);
  
  if (existingStatus !== 'granted') {
    console.log('📋 Requesting permissions...');
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.error('❌ Permission not granted for push notifications');
    alert('Failed to get push token for push notification!');
    return;
  }

  console.log('✅ Permissions granted');
  
  try {
    // Get project ID - this is the key part for Expo push notifications
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                     Constants.easConfig?.projectId ||
                     process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
                     'e9494641-e6b3-455d-80c3-824bb2be88ec'; // Your specific project ID
    
    console.log('🆔 Using project ID:', projectId);
    console.log('📊 Constants debug info:');
    console.log('  - expoConfig.extra:', Constants.expoConfig?.extra);
    console.log('  - easConfig:', Constants.easConfig);
    console.log('  - ENV var:', process.env.EXPO_PUBLIC_EAS_PROJECT_ID);
    
    if (!projectId) {
      throw new Error('❌ Project ID not found in any configuration');
    }
    
    console.log('🎯 Getting Expo push token...');
    const tokenResult = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    
    token = tokenResult.data;
    console.log('🎉 Expo push token obtained successfully:', token);
  } catch (e) {
    console.error('❌ Error getting push token:', e);
    console.error('Error details:', JSON.stringify(e, null, 2));
  }

  return token;
} 