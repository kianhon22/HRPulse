import { Stack } from 'expo-router';
import { View } from 'react-native';
import Header from '../../components/Header';
import TabBar from '../../components/TabBar';

export default function CalendarLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="index"
          options={{
            header: () => <Header title="Calendar" />,
            headerShown: true,
          }}
        />
      </Stack>
      <TabBar />
    </View>
  );
}