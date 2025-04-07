import { Stack } from 'expo-router';
import Header from '../../../components/Header';

export default function SurveyLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index"
        options={{
          header: () => <Header title="Survey & Feedback" />,
        }}
      />
      <Stack.Screen 
        name="[id]"
        options={{
          header: () => <Header title="Survey Form" />,
        }}
      />
    </Stack>
  );
}