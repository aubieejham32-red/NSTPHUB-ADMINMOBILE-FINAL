import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: {
            backgroundColor: '#54100F',
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="LoadingScreen"
          options={{
            headerShown: false,
            animation: 'fade',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="AccessCodeScreen"
          options={{
            headerShown: false,
            animation: 'fade',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="LoginScreen"
          options={{
            headerShown: false,
            animation: 'fade',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
      </Stack>
      <StatusBar style="light" backgroundColor="#54100F" />
    </>
  );
}
