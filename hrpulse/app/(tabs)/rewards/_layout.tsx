import { Stack } from 'expo-router';

export default function RewardsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Rewards',
        }}
      />
    </Stack>
  );
} 