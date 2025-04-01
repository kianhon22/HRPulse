import { Stack } from 'expo-router';

export default function SurveyLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Survey',
        }}
      />
    </Stack>
  );
} 