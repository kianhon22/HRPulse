import { Stack } from 'expo-router';
import { View } from 'react-native';
import Header from '../../components/Header';
import TabBar from '../../components/TabBar';

export default function NotificationsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="index"
          options={{
            header: () => <Header title="Notifications" />,
            headerShown: true,
          }}
        />
      </Stack>
      <TabBar />
    </View>
  );
} 