import { Stack } from 'expo-router';
import { View } from 'react-native';
import Header from '../../components/Header';
import TabBar from '../../components/TabBar';

export default function SettingsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="index"
          options={{
            header: () => <Header title="Settings" />,
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="privacy"
          options={{
            header: () => <Header title="Privacy Policy" />,
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="help"
          options={{
            header: () => <Header title="Help & Support" />,
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="about"
          options={{
            header: () => <Header title="About" />,
            headerShown: true,
          }}
        />
      </Stack>
      <TabBar />
    </View>
  );
} 