import { Stack } from 'expo-router';
import Header from '../../../components/Header';

export default function LeaveLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index"
        options={{
          header: () => <Header title="Leaves" />,
        }}
      />
      <Stack.Screen 
        name="apply"
        options={{
          header: () => <Header title="Leave Application" />,
        }}
      />
    </Stack>
  );
} 