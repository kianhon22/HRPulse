import { Stack } from 'expo-router';
import Header from '../../components/Header';

export default function AttendanceLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          header: () => <Header title="Attendances" />,
        }}
      />
    </Stack>
  );
} 