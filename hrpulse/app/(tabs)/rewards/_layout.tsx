import { Stack } from 'expo-router';
import Header from '../../../components/Header';

export default function RewardsLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index"
        options={{
          header: () => <Header title="Rewards & Recognition" />,
        }}
      />
    </Stack>
  );
} 