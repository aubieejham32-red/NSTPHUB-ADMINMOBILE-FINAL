import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import React from 'react';

import type {
  BottomTabBarProps,
} from '@react-navigation/bottom-tabs';

import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';


/*
|--------------------------------------------------------------------------
| COLORS
|--------------------------------------------------------------------------
*/

const COLORS = {
  cream: '#EFEBE2',
  maroon: '#54100F',
  green: '#58761C',
  yellow: '#FFBD36',
  orange: '#D99202',
  teal: '#233E47',
  black: '#000D12',
  white: '#FFFFFF',
  gray: '#BEBEBE',
  dark: '#0D171B',

  inactive: '#918A85',
  border: '#E5DED5',

  activeSoft: '#F5E9E6',
};


/*
|--------------------------------------------------------------------------
| TAB CONFIG
|--------------------------------------------------------------------------
*/

const TAB_CONFIG = {
  HomepageScreen: {
    label: 'Home',
    activeIcon: 'home',
    inactiveIcon: 'home-outline',
  },

  StudentListScreen: {
    label: 'Students',
    activeIcon: 'people',
    inactiveIcon: 'people-outline',
  },

  AttendanceScreen: {
    label: 'Attendance',
    activeIcon: 'scan',
    inactiveIcon: 'scan-outline',
  },

  ExcuseLetterScreen: {
    label: 'Excuse',
    activeIcon: 'document-text',
    inactiveIcon: 'document-text-outline',
  },

  ProfileScreen: {
    label: 'Profile',
    activeIcon: 'person',
    inactiveIcon: 'person-outline',
  },
} as const;


/*
|--------------------------------------------------------------------------
| TAB LAYOUT
|--------------------------------------------------------------------------
*/

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="HomepageScreen"

      screenOptions={{
        headerShown: false,

        tabBarHideOnKeyboard: true,

        headerShadowVisible: false,
      }}

      tabBar={props => (
        <NSTPBottomNavigation
          {...props}
        />
      )}
    >

      <Tabs.Screen
        name="HomepageScreen"
        options={{
          title: 'Home',
        }}
      />

      <Tabs.Screen
        name="StudentListScreen"
        options={{
          title: 'Students',
        }}
      />

      <Tabs.Screen
        name="AttendanceScreen"
        options={{
          title: 'Attendance',
        }}
      />

      <Tabs.Screen
        name="ExcuseLetterScreen"
        options={{
          title: 'Excuse',
        }}
      />

      <Tabs.Screen
        name="ProfileScreen"
        options={{
          title: 'Profile',
        }}
      />

      <Tabs.Screen
        name="StudentAttendanceScreen"
        options={{
          href: null,
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="EditStudentAttendanceScreen"
        options={{
          href: null,
          headerShown: false,
        }}
      />

    </Tabs>
  );
}


/*
|--------------------------------------------------------------------------
| CUSTOM BOTTOM NAVIGATION
|--------------------------------------------------------------------------
*/

function NSTPBottomNavigation({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets =
    useSafeAreaInsets();


  /*
  |--------------------------------------------------------------------------
  | SAFE AREA
  |--------------------------------------------------------------------------
  */

  const safeBottom =
    Math.max(
      insets.bottom,
      10
    );


  return (
    <View
      pointerEvents="box-none"

      style={[
        styles.floatingArea,

        {
          bottom:
            safeBottom,
        },
      ]}
    >

      {/*
      |--------------------------------------------------------------------------
      | FLOATING WHITE BAR
      |--------------------------------------------------------------------------
      */}

      <View
        style={
          styles.navigationBar
        }
      >

        {
          state.routes.map(
            (
              route,
              index
            ) => {

              const config =
                TAB_CONFIG[
                  route.name as
                    keyof typeof TAB_CONFIG
                ];


              if (!config) {
                return null;
              }


              const isFocused =
                state.index ===
                index;


              const isAttendance =
                route.name ===
                'AttendanceScreen';


              const {
                options,
              } =
                descriptors[
                  route.key
                ];


              /*
              |--------------------------------------------------------------------------
              | TAB PRESS
              |--------------------------------------------------------------------------
              */

              const onPress =
                () => {
                  const event =
                    navigation.emit({
                      type:
                        'tabPress',

                      target:
                        route.key,

                      canPreventDefault:
                        true,
                    });


                  if (
                    !isFocused &&
                    !event.defaultPrevented
                  ) {
                    navigation.navigate(
                      route.name,
                      route.params
                    );
                  }
                };


              /*
              |--------------------------------------------------------------------------
              | LONG PRESS
              |--------------------------------------------------------------------------
              */

              const onLongPress =
                () => {
                  navigation.emit({
                    type:
                      'tabLongPress',

                    target:
                      route.key,
                  });
                };


              /*
              |--------------------------------------------------------------------------
              | CENTER ATTENDANCE
              |--------------------------------------------------------------------------
              */

              if (isAttendance) {
                return (
                  <View
                    key={
                      route.key
                    }

                    style={
                      styles.centerSlot
                    }
                  >

                    <Pressable
                      onPress={
                        onPress
                      }

                      onLongPress={
                        onLongPress
                      }

                      accessibilityRole="button"

                      accessibilityState={
                        isFocused
                          ? {
                              selected:
                                true,
                            }
                          : {}
                      }

                      accessibilityLabel={
                        options
                          .tabBarAccessibilityLabel
                      }

                      style={({
                        pressed,
                      }) => [
                        styles.centerButton,

                        isFocused &&
                          styles.centerButtonActive,

                        pressed &&
                          styles.centerButtonPressed,
                      ]}
                    >

                      <View
                        style={[
                          styles.centerButtonInner,

                          isFocused &&
                            styles.centerButtonInnerActive,
                        ]}
                      >
                        <Ionicons
                          name={
                            isFocused
                              ? 'scan'
                              : 'scan-outline'
                          }

                          size={28}

                          color={
                            COLORS.white
                          }
                        />
                      </View>

                    </Pressable>


                    <Text
                      numberOfLines={1}

                      style={[
                        styles.centerLabel,

                        isFocused &&
                          styles.centerLabelActive,
                      ]}
                    >
                      Attendance
                    </Text>

                  </View>
                );
              }


              /*
              |--------------------------------------------------------------------------
              | NORMAL TAB
              |--------------------------------------------------------------------------
              */

              return (
                <Pressable
                  key={
                    route.key
                  }

                  onPress={
                    onPress
                  }

                  onLongPress={
                    onLongPress
                  }

                  accessibilityRole="button"

                  accessibilityState={
                    isFocused
                      ? {
                          selected:
                            true,
                        }
                      : {}
                  }

                  accessibilityLabel={
                    options
                      .tabBarAccessibilityLabel
                  }

                  style={({
                    pressed,
                  }) => [
                    styles.tabButton,

                    pressed &&
                      styles.tabButtonPressed,
                  ]}
                >

                  {/*
                  |--------------------------------------------------------------------------
                  | ICON
                  |--------------------------------------------------------------------------
                  */}

                  <View
                    style={[
                      styles.iconContainer,

                      isFocused &&
                        styles.iconContainerActive,
                    ]}
                  >

                    <Ionicons
                      name={
                        isFocused
                          ? config.activeIcon
                          : config.inactiveIcon
                      }

                      size={
                        isFocused
                          ? 22
                          : 21
                      }

                      color={
                        isFocused
                          ? COLORS.maroon
                          : COLORS.inactive
                      }
                    />

                  </View>


                  {/*
                  |--------------------------------------------------------------------------
                  | LABEL
                  |--------------------------------------------------------------------------
                  */}

                  <Text
                    numberOfLines={1}

                    style={[
                      styles.tabLabel,

                      isFocused &&
                        styles.tabLabelActive,
                    ]}
                  >
                    {config.label}
                  </Text>

                </Pressable>
              );
            }
          )
        }

      </View>

    </View>
  );
}


/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

const styles =
  StyleSheet.create({

    /*
    |--------------------------------------------------------------------------
    | FLOATING AREA
    |--------------------------------------------------------------------------
    |
    | Transparent area behind the white bar.
    |--------------------------------------------------------------------------
    */

    floatingArea: {
      position: 'absolute',

      left: 12,

      right: 12,

      zIndex: 100,

      elevation: 100,

      backgroundColor:
        'transparent',
    },


    /*
    |--------------------------------------------------------------------------
    | WHITE NAVIGATION BAR
    |--------------------------------------------------------------------------
    */

    navigationBar: {
      height: 70,

      paddingHorizontal: 7,

      flexDirection: 'row',

      alignItems: 'center',

      borderRadius: 25,

      backgroundColor:
        COLORS.white,

      borderWidth: 1,

      borderColor:
        COLORS.border,


      /*
      |--------------------------------------------------------------------------
      | IOS SHADOW
      |--------------------------------------------------------------------------
      */

      shadowColor:
        COLORS.black,

      shadowOffset: {
        width: 0,
        height: 5,
      },

      shadowOpacity: 0.11,

      shadowRadius: 13,


      /*
      |--------------------------------------------------------------------------
      | ANDROID
      |--------------------------------------------------------------------------
      */

      elevation:
        Platform.OS ===
        'android'
          ? 11
          : 0,
    },


    /*
    |--------------------------------------------------------------------------
    | NORMAL TAB BUTTON
    |--------------------------------------------------------------------------
    */

    tabButton: {
      flex: 1,

      minWidth: 0,

      height: 60,

      alignItems: 'center',

      justifyContent: 'center',
    },


    /*
    |--------------------------------------------------------------------------
    | PRESS EFFECT
    |--------------------------------------------------------------------------
    */

    tabButtonPressed: {
      opacity: 0.6,

      transform: [
        {
          scale: 0.93,
        },
      ],
    },


    /*
    |--------------------------------------------------------------------------
    | DEFAULT ICON
    |--------------------------------------------------------------------------
    */

    iconContainer: {
      width: 38,

      height: 34,

      borderRadius: 13,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        'transparent',
    },


    /*
    |--------------------------------------------------------------------------
    | NEW ACTIVE DESIGN
    |--------------------------------------------------------------------------
    |
    | No dot.
    | No underline.
    |
    | The icon receives a soft floating tile.
    |--------------------------------------------------------------------------
    */

    iconContainerActive: {
      width: 40,

      height: 34,

      borderRadius: 13,

      backgroundColor:
        COLORS.activeSoft,

      borderWidth: 1,

      borderColor:
        'rgba(84,16,15,0.08)',
    },


    /*
    |--------------------------------------------------------------------------
    | LABEL
    |--------------------------------------------------------------------------
    */

    tabLabel: {
      marginTop: 3,

      maxWidth: 58,

      color:
        COLORS.inactive,

      fontSize: 7.5,

      lineHeight: 9,

      fontWeight: '600',

      textAlign: 'center',
    },


    /*
    |--------------------------------------------------------------------------
    | ACTIVE LABEL
    |--------------------------------------------------------------------------
    */

    tabLabelActive: {
      color:
        COLORS.maroon,

      fontWeight: '900',
    },


    /*
    |--------------------------------------------------------------------------
    | CENTER SLOT
    |--------------------------------------------------------------------------
    */

    centerSlot: {
      flex: 1,

      minWidth: 0,

      height: 70,

      position: 'relative',

      alignItems: 'center',

      justifyContent: 'flex-end',

      paddingBottom: 6,
    },


    /*
    |--------------------------------------------------------------------------
    | ATTENDANCE OUTER BUTTON
    |--------------------------------------------------------------------------
    */

    centerButton: {
      position: 'absolute',

      top: -30,

      width: 64,

      height: 64,

      borderRadius: 32,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        COLORS.white,

      borderWidth: 4,

      borderColor:
        COLORS.cream,


      /*
      |--------------------------------------------------------------------------
      | SHADOW
      |--------------------------------------------------------------------------
      */

      shadowColor:
        COLORS.black,

      shadowOffset: {
        width: 0,
        height: 5,
      },

      shadowOpacity: 0.17,

      shadowRadius: 9,

      elevation:
        Platform.OS ===
        'android'
          ? 11
          : 0,
    },


    /*
    |--------------------------------------------------------------------------
    | ATTENDANCE ACTIVE STATE
    |--------------------------------------------------------------------------
    |
    | Instead of a dot, the entire circle gets
    | a thin yellow/gold ring when active.
    |--------------------------------------------------------------------------
    */

    centerButtonActive: {
      borderColor:
        COLORS.yellow,

      borderWidth: 4,

      transform: [
        {
          scale: 1.04,
        },
      ],
    },


    /*
    |--------------------------------------------------------------------------
    | PRESSED
    |--------------------------------------------------------------------------
    */

    centerButtonPressed: {
      transform: [
        {
          scale: 0.94,
        },
      ],
    },


    /*
    |--------------------------------------------------------------------------
    | INNER ATTENDANCE CIRCLE
    |--------------------------------------------------------------------------
    */

    centerButtonInner: {
      width: 52,

      height: 52,

      borderRadius: 26,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        COLORS.maroon,
    },


    /*
    |--------------------------------------------------------------------------
    | ACTIVE ATTENDANCE INNER CIRCLE
    |--------------------------------------------------------------------------
    */

    centerButtonInnerActive: {
      width: 50,

      height: 50,

      borderRadius: 25,
    },


    /*
    |--------------------------------------------------------------------------
    | ATTENDANCE LABEL
    |--------------------------------------------------------------------------
    */

    centerLabel: {
      color:
        COLORS.inactive,

      fontSize: 7.3,

      lineHeight: 9,

      fontWeight: '700',

      textAlign: 'center',
    },


    /*
    |--------------------------------------------------------------------------
    | ACTIVE ATTENDANCE LABEL
    |--------------------------------------------------------------------------
    */

    centerLabelActive: {
      color:
        COLORS.maroon,

      fontWeight: '900',
    },

  });