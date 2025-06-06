import { Drawer } from 'expo-router/drawer';
import { Ionicons } from '@expo/vector-icons';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, useRef } from 'react';
import { useColorScheme, View, Text } from 'react-native';
import { supabase } from '../supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...Ionicons.font,
  });

  const [initialSessionChecked, setInitialSessionChecked] = useState(false);
  const [session, setSession] = useState<any>(null);
  const router = useRouter();
  const segments = useSegments();
  const colorScheme = useColorScheme();
  const [redirecting, setRedirecting] = useState(false);
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      // Add a small delay before hiding splash screen in production builds
      setTimeout(() => {
        SplashScreen.hideAsync();
      }, 500);
    }
  }, [loaded]);

  useEffect(() => {
    const handleRedirect = (currentSession: any) => {
      setSession(currentSession);
      setInitialSessionChecked(true); // Mark that session has been checked

      const currentSegment = segments[0] || '';
      console.log('Session:', currentSession);
      console.log('Current segment:', currentSegment);
      
      // Use setTimeout to ensure navigation happens after component mounting
      setTimeout(() => {
        // If not logged in and not already on login, register, or reset-password, redirect to login
        if (
          !currentSession &&
          currentSegment !== 'login' &&
          currentSegment !== 'register' &&
          currentSegment !== 'reset-password'
        ) {
          router.replace('/login');
        }
        // If logged in and on login/register/reset-password, redirect to home
        if (
          currentSession &&
          (currentSegment === 'login' || currentSegment === 'register' || currentSegment === 'reset-password')
        ) {
          router.replace('/');
        }
      }, 100);
    };

    // Initial session check
    console.log('Checking initial session...');
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check complete:', session);
      handleRedirect(session);
    }).catch((error) => {
      console.error('Error getting session:', error);
      setInitialSessionChecked(true); // Still mark as checked to prevent infinite loading
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleRedirect(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [segments]);

  useEffect(() => {
    if (!loaded || !initialSessionChecked) return;
    const currentSegment = segments[0] || '';
    
    // Use setTimeout to ensure navigation happens after component mounting
    setTimeout(() => {
      // If not logged in and not on login/register/reset-password, force redirect
      if (
        !session &&
        currentSegment !== 'login' &&
        currentSegment !== 'register' &&
        currentSegment !== 'reset-password' &&
        !hasRedirected.current
      ) {
        setRedirecting(true);
        hasRedirected.current = true;
        router.replace('/login');
        return;
      }
      // If logged in and on login/register/reset-password, redirect to home
      if (
        session &&
        (currentSegment === 'login' || currentSegment === 'register' || currentSegment === 'reset-password') &&
        !hasRedirected.current
      ) {
        setRedirecting(true);
        hasRedirected.current = true;
        router.replace('/');
        return;
      }
      setRedirecting(false);
      hasRedirected.current = false;
    }, 100);
  }, [session, loaded, initialSessionChecked, segments]);

  if (!loaded || !initialSessionChecked || redirecting) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const currentSegment = segments[0] || '';

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {session ? (
        <Drawer
          screenOptions={{
            headerShown: false,
            drawerStyle: {
              backgroundColor: '#fff',
              width: 220,
            },
            drawerActiveBackgroundColor: '#6A1B9A20',
            drawerActiveTintColor: '#6A1B9A',
            drawerInactiveTintColor: '#333',
            drawerItemStyle: {
              paddingLeft: 10,
              borderRadius: 8,
            },
            drawerLabelStyle: {
              marginLeft: 8,
              fontSize: 16,
              fontWeight: '500',
            },
          }}
        >
          <Drawer.Screen
            name="profile"
            options={{
              drawerLabel: 'Profile',
              drawerIcon: ({ color, size }: { color: string; size: number }) => (
                <Ionicons name="person" size={size} color={color} />
              ),
            }}
          />
          <Drawer.Screen
            name="calendar"
            options={{
              drawerLabel: 'Calendar',
              drawerIcon: ({ color, size }: { color: string; size: number }) => (
                <Ionicons name="calendar" size={size} color={color} />
              ),
            }}
          />
          <Drawer.Screen
            name="holiday"
            options={{
              drawerLabel: 'Holiday',
              drawerIcon: ({ color, size }: { color: string; size: number }) => (
                <Ionicons name="airplane" size={size} color={color} />
              ),
            }}
          />
          <Drawer.Screen
            name="settings"
            options={{
              drawerLabel: 'Settings',
              drawerIcon: ({ color, size }: { color: string; size: number }) => (
                <Ionicons name="settings" size={size} color={color} />
              ),
            }}
          />
          <Drawer.Screen
            name="(tabs)"
            options={{
              drawerItemStyle: { display: 'none' },
            }}
          />
          <Drawer.Screen
            name="notifications"
            options={{
              drawerItemStyle: { display: 'none' },
            }}
          />
          <Drawer.Screen
            name="login"
            options={{
              drawerItemStyle: { display: 'none' },
            }}
          />
          <Drawer.Screen
            name="register"
            options={{
              drawerItemStyle: { display: 'none' },
            }}
          />
          <Drawer.Screen
            name="+not-found"
            options={{
              drawerItemStyle: { display: 'none' },
            }}
          />
          <Drawer.Screen
            name="reset-password"
            options={{
              drawerItemStyle: { display: 'none' },
            }}
          />
        </Drawer>
      ) : (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="reset-password" />
        </Stack>
      )}
    </ThemeProvider>
  );
}