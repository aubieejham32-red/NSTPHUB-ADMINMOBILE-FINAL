import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="HomepageScreen"
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: '#54100F',
        tabBarInactiveTintColor: '#988C87',

        tabBarStyle: {
          height: 68,
          paddingTop: 7,
          paddingBottom: 8,
          backgroundColor: '#FFFDF9',
          borderTopWidth: 1,
          borderTopColor: '#E7DED5',

          elevation: 8,

          shadowColor: '#000000',
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.06,
          shadowRadius: 7,
        },

        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 1,
        },

        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="HomepageScreen"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',

          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={
                focused
                  ? 'home'
                  : 'home-outline'
              }
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}