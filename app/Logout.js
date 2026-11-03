import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  getAdminDashboard,
  getAdminProfile,
  loginAdministrator,
  logoutAdministrator,
} from '../services/api';

import {
  SERVER_URL,
} from '../config/api';


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
  dark: '#0D171B',

  muted: '#746F69',
  lightMuted: '#9E9892',
  border: '#DDD7CF',
  softMaroon: '#F6ECEA',
  overlay: 'rgba(0, 13, 18, 0.52)',
};


const SAVED_ACCOUNTS_KEY =
  'savedInstructorCoordinatorAccounts';


const NSTP_HUB_LOGO =
  require('../assets/images/nstphub_logo.png');


/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function firstValue(
  ...values
) {
  for (
    const value of values
  ) {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ''
    ) {
      return value;
    }
  }

  return '';
}


function normalizeAccountType(
  account
) {
  const type =
    String(
      account?.account_type ??
      account?.accountType ??
      ''
    )
      .trim()
      .toLowerCase();


  if (
    type === 'instructor'
  ) {
    return 'instructor';
  }


  if (
    type === 'coordinator'
  ) {
    return 'coordinator';
  }


  if (
    type === 'administrator' ||
    type === 'university_administrator'
  ) {
    return 'administrator';
  }


  const role =
    String(
      account?.role ??
      ''
    )
      .trim()
      .toLowerCase();


  if (
    role === 'instructor'
  ) {
    return 'instructor';
  }


  if (
    role.startsWith(
      'coordinator-'
    )
  ) {
    return 'coordinator';
  }


  if (
    [
      'university-administrator',
      'university_admin',
      'universityadministrator',
      'university_administrator',
      'administrator',
      'admin',
    ].includes(role)
  ) {
    return 'administrator';
  }


  return '';
}


function getAccountKey(
  account
) {
  if (
    !account
  ) {
    return '';
  }


  const type =
    normalizeAccountType(
      account
    ) || 'account';


  const identity =
    account?.id ??
    account?.email ??
    'unknown';


  return `${type}-${identity}`;
}


function getAccountName(
  account
) {
  return (
    account?.full_name
    ||
    account?.name
    ||
    [
      account?.first_name,
      account?.middle_name,
      account?.last_name,
    ]
      .filter(Boolean)
      .join(' ')
    ||
    account?.username
    ||
    account?.email
    ||
    'NSTP Staff'
  );
}


function getUniversityName(
  account
) {
  return (
    account?.university_name
    ||
    account?.university?.name
    ||
    account?.university_acronym
    ||
    account?.university?.acronym
    ||
    ''
  );
}


function getRoleLabel(
  account
) {
  const role =
    String(
      account?.role ??
      ''
    )
      .trim()
      .toLowerCase();


  if (
    role === 'instructor'
  ) {
    return 'Instructor';
  }


  if (
    role === 'coordinator-attendance'
  ) {
    return 'Attendance Coordinator';
  }


  if (
    role === 'coordinator-announcement'
  ) {
    return 'Announcement Coordinator';
  }


  if (
    role === 'coordinator-schedule'
  ) {
    return 'Schedule Coordinator';
  }


  if (
    role.startsWith(
      'coordinator-'
    )
  ) {
    return 'Coordinator';
  }


  return 'University Administrator';
}


function getInitials(
  account
) {
  const name =
    String(
      getAccountName(
        account
      )
    )
      .trim();


  if (
    !name
  ) {
    return 'NS';
  }


  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(
      part =>
        part
          .charAt(0)
          .toUpperCase()
    )
    .join('');
}


function serverOrigin() {
  return String(
    SERVER_URL ||
    ''
  )
    .trim()
    .replace(
      /\/+$/,
      ''
    )
    .replace(
      /\/api(?:\/.*)?$/i,
      ''
    );
}


/*
|--------------------------------------------------------------------------
| PROFILE PHOTO
|--------------------------------------------------------------------------
|
| University Administrator:
|   photo
|
| Instructor / Coordinator:
|   profile_photo
|
|--------------------------------------------------------------------------
*/

function resolvePhotoUrl(
  account
) {
  const raw =
    firstValue(
      account?.profile_photo_url,
      account?.photo_url,
      account?.profile_photo,
      account?.photo
    );


  const photo =
    String(
      raw ||
      ''
    ).trim();


  if (
    !photo
  ) {
    return null;
  }


  if (
    photo.startsWith('file://') ||
    photo.startsWith('data:')
  ) {
    return photo;
  }


  const origin =
    serverOrigin();


  /*
  |--------------------------------------------------------------------------
  | ABSOLUTE URL
  |--------------------------------------------------------------------------
  */

  if (
    photo.startsWith('http://') ||
    photo.startsWith('https://')
  ) {
    if (
      origin &&
      /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?\/storage\//i
        .test(photo)
    ) {
      const storagePath =
        photo.replace(
          /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i,
          ''
        );


      return `${origin}${storagePath}`;
    }


    return photo;
  }


  /*
  |--------------------------------------------------------------------------
  | RELATIVE URL
  |--------------------------------------------------------------------------
  */

  if (
    !origin
  ) {
    return null;
  }


  const path =
    photo
      .replace(
        /^public\//i,
        ''
      )
      .replace(
        /^\/+/,
        ''
      );


  if (
    path.startsWith(
      'storage/'
    )
  ) {
    return `${origin}/${path}`;
  }


  return `${origin}/storage/${path}`;
}


function isAlreadyLoggedOutError(
  error
) {
  const message =
    String(
      error instanceof Error
        ? error.message
        : error || ''
    )
      .toLowerCase();


  return (
    message.includes('unauthenticated') ||
    message.includes('unauthorized') ||
    message.includes('not logged in') ||
    message.includes('401')
  );
}


/*
|--------------------------------------------------------------------------
| LOGOUT SCREEN
|--------------------------------------------------------------------------
*/

export default function Logout() {
  const insets =
    useSafeAreaInsets();


  const preparedRef =
    useRef(false);


  /*
  |--------------------------------------------------------------------------
  | SAVED ACCOUNTS
  |--------------------------------------------------------------------------
  */

  const [
    localAccounts,
    setLocalAccounts,
  ] =
    useState([]);


  /*
  |--------------------------------------------------------------------------
  | LOGOUT
  |--------------------------------------------------------------------------
  */

  const [
    preparing,
    setPreparing,
  ] =
    useState(true);


  const [
    logoutError,
    setLogoutError,
  ] =
    useState('');


  /*
  |--------------------------------------------------------------------------
  | LOGIN MODAL
  |--------------------------------------------------------------------------
  */

  const [
    showLoginModal,
    setShowLoginModal,
  ] =
    useState(false);


  const [
    selectedAccount,
    setSelectedAccount,
  ] =
    useState(null);


  const [
    password,
    setPassword,
  ] =
    useState('');


  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);


  const [
    loggingIn,
    setLoggingIn,
  ] =
    useState(false);


  const [
    loginError,
    setLoginError,
  ] =
    useState('');


  /*
  |--------------------------------------------------------------------------
  | REMOVE ACCOUNT MODAL
  |--------------------------------------------------------------------------
  */

  const [
    showRemoveModal,
    setShowRemoveModal,
  ] =
    useState(false);


  /*
  |--------------------------------------------------------------------------
  | READ SAVED ACCOUNTS
  |--------------------------------------------------------------------------
  */

  const readSavedAccounts =
    useCallback(
      async () => {
        try {
          const saved =
            await SecureStore
              .getItemAsync(
                SAVED_ACCOUNTS_KEY
              );


          if (
            !saved
          ) {
            return [];
          }


          const parsed =
            JSON.parse(saved);


          if (
            !Array.isArray(parsed)
          ) {
            return [];
          }


          return parsed.filter(
            account =>
              account?.email &&
              getAccountKey(account)
          );

        } catch (
          error
        ) {
          console.log(
            'Unable to read saved accounts:',
            error
          );


          return [];
        }
      },
      []
    );


  /*
  |--------------------------------------------------------------------------
  | SAVE ACCOUNTS
  |--------------------------------------------------------------------------
  */

  const saveAccounts =
    useCallback(
      async accounts => {
        await SecureStore
          .setItemAsync(
            SAVED_ACCOUNTS_KEY,
            JSON.stringify(
              accounts
            )
          );
      },
      []
    );


  /*
  |--------------------------------------------------------------------------
  | BUILD CURRENT ACCOUNT
  |--------------------------------------------------------------------------
  */

  const buildCurrentAccount =
    useCallback(
      (
        dashboard,
        profile
      ) => {
        const dashboardAccount =
          dashboard?.account
          ??
          dashboard?.administrator
          ??
          dashboard?.user
          ??
          {};


        const profileAccount =
          profile?.account
          ??
          profile?.administrator
          ??
          profile?.user
          ??
          {};


        const id =
          firstValue(
            profileAccount?.id,
            dashboardAccount?.id
          );


        const email =
          firstValue(
            profileAccount?.email,
            dashboardAccount?.email
          );


        if (
          !id ||
          !email
        ) {
          return null;
        }


        const role =
          firstValue(
            profile?.role,
            profileAccount?.role,
            dashboard?.role,
            dashboardAccount?.role
          );


        const accountType =
          normalizeAccountType({
            account_type:
              firstValue(
                profile?.account_type,
                profileAccount?.account_type,
                dashboard?.account_type,
                dashboardAccount?.account_type
              ),

            role,
          });


        if (
          !accountType
        ) {
          return null;
        }


        const profileUniversity =
          profile?.university
          ??
          profileAccount?.university
          ??
          {};


        const dashboardUniversity =
          dashboard?.university
          ??
          dashboardAccount?.university
          ??
          {};


        const firstName =
          firstValue(
            profileAccount?.first_name,
            dashboardAccount?.first_name
          );


        const middleName =
          firstValue(
            profileAccount?.middle_name,
            dashboardAccount?.middle_name
          );


        const lastName =
          firstValue(
            profileAccount?.last_name,
            dashboardAccount?.last_name
          );


        const fullName =
          firstValue(
            profileAccount?.full_name,
            profileAccount?.name,
            dashboardAccount?.full_name,
            dashboardAccount?.name,

            [
              firstName,
              middleName,
              lastName,
            ]
              .filter(Boolean)
              .join(' ')
          );


        /*
        |--------------------------------------------------------------------------
        | DATABASE PROFILE PHOTO
        |--------------------------------------------------------------------------
        */

        const databasePhoto =
          firstValue(
            profileAccount?.profile_photo,
            profileAccount?.photo,
            dashboardAccount?.profile_photo,
            dashboardAccount?.photo
          );


        const databasePhotoUrl =
          firstValue(
            profileAccount?.profile_photo_url,
            profileAccount?.photo_url,
            dashboardAccount?.profile_photo_url,
            dashboardAccount?.photo_url
          );


        return {
          id,

          email,

          username:
            firstValue(
              profileAccount?.username,
              dashboardAccount?.username
            ),

          first_name:
            firstName,

          middle_name:
            middleName,

          last_name:
            lastName,

          full_name:
            fullName,

          name:
            fullName,

          role,

          account_type:
            accountType,

          component:
            firstValue(
              profileAccount?.component,
              dashboardAccount?.component,
              dashboard
                ?.component_context
                ?.selected
            ),

          /*
          |--------------------------------------------------------------------------
          | PHOTO
          |--------------------------------------------------------------------------
          */

          profile_photo:
            databasePhoto,

          photo:
            databasePhoto,

          profile_photo_url:
            databasePhotoUrl,

          photo_url:
            databasePhotoUrl,

          /*
          |--------------------------------------------------------------------------
          | UNIVERSITY
          |--------------------------------------------------------------------------
          */

          university_name:
            firstValue(
              profileUniversity?.name,
              dashboardUniversity?.name,
              profileAccount?.university_name,
              dashboardAccount?.university_name
            ),

          university_acronym:
            firstValue(
              profileUniversity?.acronym,
              dashboardUniversity?.acronym,
              profileAccount?.university_acronym,
              dashboardAccount?.university_acronym
            ),

          university: {
            id:
              firstValue(
                profileUniversity?.id,
                dashboardUniversity?.id,
                null
              ),

            name:
              firstValue(
                profileUniversity?.name,
                dashboardUniversity?.name
              ),

            acronym:
              firstValue(
                profileUniversity?.acronym,
                dashboardUniversity?.acronym
              ),
          },
        };
      },
      []
    );


  /*
  |--------------------------------------------------------------------------
  | MERGE ACCOUNT
  |--------------------------------------------------------------------------
  */

  const mergeAccount =
    useCallback(
      (
        accounts,
        incoming
      ) => {
        if (
          !incoming
        ) {
          return accounts;
        }


        const incomingKey =
          getAccountKey(
            incoming
          );


        const existingIndex =
          accounts.findIndex(
            account =>
              getAccountKey(
                account
              ) ===
              incomingKey
          );


        /*
        |--------------------------------------------------------------------------
        | NEW ACCOUNT
        |--------------------------------------------------------------------------
        */

        if (
          existingIndex === -1
        ) {
          return [
            incoming,
            ...accounts,
          ];
        }


        /*
        |--------------------------------------------------------------------------
        | UPDATE EXISTING ACCOUNT
        |--------------------------------------------------------------------------
        */

        const next =
          [
            ...accounts,
          ];


        next[
          existingIndex
        ] = {
          ...next[
            existingIndex
          ],

          ...incoming,
        };


        const refreshed =
          next.splice(
            existingIndex,
            1
          )[0];


        return [
          refreshed,
          ...next,
        ];
      },
      []
    );


  /*
  |--------------------------------------------------------------------------
  | REAL BACKEND LOGOUT
  |--------------------------------------------------------------------------
  |
  | 1. Get profile
  | 2. Get dashboard
  | 3. Save account/profile picture
  | 4. Call backend logout
  | 5. Show Choose An Account
  |
  |--------------------------------------------------------------------------
  */

  const performRealLogout =
    useCallback(
      async () => {
        setPreparing(true);
        setLogoutError('');


        let savedAccounts =
          await readSavedAccounts();


        /*
        |--------------------------------------------------------------------------
        | GET DATABASE ACCOUNT BEFORE LOGOUT
        |--------------------------------------------------------------------------
        */

        try {
          const [
            profileResult,
            dashboardResult,
          ] =
            await Promise.allSettled([
              getAdminProfile(),
              getAdminDashboard(),
            ]);


          const profile =
            profileResult.status ===
            'fulfilled'
              ? profileResult.value
              : null;


          const dashboard =
            dashboardResult.status ===
            'fulfilled'
              ? dashboardResult.value
              : null;


          const currentAccount =
            buildCurrentAccount(
              dashboard,
              profile
            );


          if (
            currentAccount
          ) {
            savedAccounts =
              mergeAccount(
                savedAccounts,
                currentAccount
              );


            await saveAccounts(
              savedAccounts
            );
          }

        } catch (
          error
        ) {
          console.log(
            'Unable to save current account:',
            error
          );
        }


        /*
        |--------------------------------------------------------------------------
        | BACKEND LOGOUT
        |--------------------------------------------------------------------------
        */

        try {
          await logoutAdministrator();


          setLocalAccounts(
            savedAccounts
          );


          setPreparing(false);

        } catch (
          error
        ) {
          /*
          |--------------------------------------------------------------------------
          | ALREADY SIGNED OUT
          |--------------------------------------------------------------------------
          */

          if (
            isAlreadyLoggedOutError(
              error
            )
          ) {
            setLocalAccounts(
              savedAccounts
            );


            setPreparing(false);

            return;
          }


          console.log(
            'Logout failed:',
            error
          );


          setLogoutError(
            error instanceof Error
              ? error.message
              : 'Unable to sign out. Please try again.'
          );


          setPreparing(false);
        }
      },
      [
        buildCurrentAccount,
        mergeAccount,
        readSavedAccounts,
        saveAccounts,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | RUN LOGOUT ONCE
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      if (
        preparedRef.current
      ) {
        return;
      }


      preparedRef.current =
        true;


      performRealLogout();
    },
    [
      performRealLogout,
    ]
  );


  /*
  |--------------------------------------------------------------------------
  | SELECT SAVED ACCOUNT
  |--------------------------------------------------------------------------
  */

  const selectAccount =
    account => {
      if (
        loggingIn ||
        logoutError
      ) {
        return;
      }


      setSelectedAccount(
        account
      );


      setPassword('');
      setShowPassword(false);
      setLoginError('');
      setShowLoginModal(true);
    };


  /*
  |--------------------------------------------------------------------------
  | CLOSE LOGIN
  |--------------------------------------------------------------------------
  */

  const closeLoginModal =
    () => {
      if (
        loggingIn
      ) {
        return;
      }


      setShowLoginModal(false);
      setSelectedAccount(null);
      setPassword('');
      setShowPassword(false);
      setLoginError('');
    };


  /*
  |--------------------------------------------------------------------------
  | LOGIN SAVED ACCOUNT
  |--------------------------------------------------------------------------
  */

  const loginSelectedAccount =
    async () => {
      if (
        loggingIn
      ) {
        return;
      }


      if (
        !selectedAccount?.email
      ) {
        setLoginError(
          'Unable to identify this account.'
        );

        return;
      }


      if (
        !password.trim()
      ) {
        setLoginError(
          'Enter your password.'
        );

        return;
      }


      try {
        setLoggingIn(true);
        setLoginError('');


        await loginAdministrator({
          email:
            selectedAccount
              .email
              .trim()
              .toLowerCase(),

          password,
        });


        setShowLoginModal(false);


        router.replace(
          '/(tabs)/HomepageScreen'
        );

      } catch (
        error
      ) {
        const message =
          error instanceof Error
            ? error.message
            : 'Invalid email or password.';


        const normalized =
          String(
            message
          )
            .toLowerCase();


        if (
          normalized.includes(
            'access code'
          )
          ||
          normalized.includes(
            'university access'
          )
          ||
          normalized.includes(
            'institutional authorization'
          )
        ) {
          setLoginError(
            'University access has expired.'
          );

        } else {
          setLoginError(
            message ||
            'Invalid email or password.'
          );
        }

      } finally {
        setLoggingIn(false);
      }
    };


  /*
  |--------------------------------------------------------------------------
  | USE ANOTHER ACCOUNT
  |--------------------------------------------------------------------------
  |
  | app/LoginScreen.js = /LoginScreen
  |
  |--------------------------------------------------------------------------
  */

  const loginAnother =
    () => {
      if (
        loggingIn
      ) {
        return;
      }


      closeLoginModal();


      /*
      |--------------------------------------------------------------------------
      | GO DIRECTLY TO LOGIN SCREEN
      |--------------------------------------------------------------------------
      */

      router.replace(
        '/LoginScreen'
      );
    };


  /*
  |--------------------------------------------------------------------------
  | OPEN REMOVE ACCOUNTS
  |--------------------------------------------------------------------------
  */

  const openRemoveModal =
    () => {
      if (
        !localAccounts.length
      ) {
        return;
      }


      setShowRemoveModal(true);
    };


  /*
  |--------------------------------------------------------------------------
  | REMOVE SAVED ACCOUNT
  |--------------------------------------------------------------------------
  */

  const removeAccount =
    account => {
      Alert.alert(
        'Remove Account',
        `Remove ${getAccountName(account)} from this device?`,
        [
          {
            text:
              'Cancel',

            style:
              'cancel',
          },

          {
            text:
              'Remove',

            style:
              'destructive',

            onPress:
              async () => {
                const removeKey =
                  getAccountKey(
                    account
                  );


                const nextAccounts =
                  localAccounts.filter(
                    item =>
                      getAccountKey(
                        item
                      ) !==
                      removeKey
                  );


                setLocalAccounts(
                  nextAccounts
                );


                await saveAccounts(
                  nextAccounts
                );


                if (
                  !nextAccounts.length
                ) {
                  setShowRemoveModal(
                    false
                  );
                }
              },
          },
        ]
      );
    };


  /*
  |--------------------------------------------------------------------------
  | SIGNING OUT
  |--------------------------------------------------------------------------
  */

  if (
    preparing
  ) {
    return (
      <SafeAreaView
        style={
          styles.centerScreen
        }
        edges={[
          'top',
          'bottom',
          'left',
          'right',
        ]}
      >
        <Stack.Screen
          options={{
            headerShown:
              false,
          }}
        />


        <StatusBar
          barStyle="dark-content"
          backgroundColor={
            COLORS.cream
          }
        />


        <Image
          source={
            NSTP_HUB_LOGO
          }
          resizeMode="contain"
          style={
            styles.loadingLogo
          }
        />


        <ActivityIndicator
          size="small"
          color={
            COLORS.maroon
          }
          style={
            styles.loadingIndicator
          }
        />


        <Text
          style={
            styles.loadingText
          }
        >
          Signing out...
        </Text>
      </SafeAreaView>
    );
  }


  /*
  |--------------------------------------------------------------------------
  | LOGOUT ERROR
  |--------------------------------------------------------------------------
  */

  if (
    logoutError
  ) {
    return (
      <SafeAreaView
        style={
          styles.centerScreen
        }
        edges={[
          'top',
          'bottom',
          'left',
          'right',
        ]}
      >
        <Stack.Screen
          options={{
            headerShown:
              false,
          }}
        />


        <StatusBar
          barStyle="dark-content"
          backgroundColor={
            COLORS.cream
          }
        />


        <Image
          source={
            NSTP_HUB_LOGO
          }
          resizeMode="contain"
          style={
            styles.loadingLogo
          }
        />


        <Text
          style={
            styles.errorTitle
          }
        >
          Sign out failed
        </Text>


        <Text
          style={
            styles.errorText
          }
        >
          {
            logoutError
          }
        </Text>


        <Pressable
          onPress={
            performRealLogout
          }
          style={({
            pressed,
          }) => [
            styles.retryButton,

            pressed &&
              styles.pressed,
          ]}
        >
          <Ionicons
            name="refresh-outline"
            size={18}
            color={
              COLORS.white
            }
          />


          <Text
            style={
              styles.retryText
            }
          >
            Retry
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }


  /*
  |--------------------------------------------------------------------------
  | SCREEN
  |--------------------------------------------------------------------------
  */

  return (
    <SafeAreaView
      style={
        styles.safeArea
      }
      edges={[
        'top',
        'left',
        'right',
      ]}
    >
      <Stack.Screen
        options={{
          headerShown:
            false,
        }}
      />


      <StatusBar
        barStyle="dark-content"
        backgroundColor={
          COLORS.cream
        }
      />


      <ScrollView
        style={
          styles.scrollView
        }
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={[
          styles.scrollContent,

          {
            paddingBottom:
              30 +
              insets.bottom,
          },
        ]}
      >

        {/*
        |--------------------------------------------------------------------------
        | SIMPLE NSTP HUB LOGO
        |--------------------------------------------------------------------------
        */}

        <View
          style={
            styles.logoArea
          }
        >
          <Image
            source={
              NSTP_HUB_LOGO
            }
            resizeMode="contain"
            style={
              styles.logo
            }
          />
        </View>


        {/*
        |--------------------------------------------------------------------------
        | TITLE
        |--------------------------------------------------------------------------
        */}

        <Text
          style={
            styles.title
          }
        >
          Choose An Account
        </Text>


        {/*
        |--------------------------------------------------------------------------
        | ACCOUNTS
        |--------------------------------------------------------------------------
        */}

        <View
          style={
            styles.accountCard
          }
        >
          {
            localAccounts.length
              ? (
                localAccounts.map(
                  (
                    account,
                    index
                  ) => (
                    <AccountRow
                      key={
                        getAccountKey(
                          account
                        )
                      }

                      account={
                        account
                      }

                      showDivider={
                        index <
                        localAccounts.length -
                        1
                      }

                      onPress={() =>
                        selectAccount(
                          account
                        )
                      }
                    />
                  )
                )
              )
              :
              (
                <View
                  style={
                    styles.emptyState
                  }
                >
                  <Ionicons
                    name="person-outline"
                    size={34}
                    color={
                      COLORS.lightMuted
                    }
                  />


                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    No saved accounts
                  </Text>
                </View>
              )
          }


          {/*
          |--------------------------------------------------------------------------
          | ACTION DIVIDER
          |--------------------------------------------------------------------------
          */}

          <View
            style={
              styles.cardDivider
            }
          />


          {/*
          |--------------------------------------------------------------------------
          | USE ANOTHER ACCOUNT
          |--------------------------------------------------------------------------
          */}

          <Pressable
            onPress={
              loginAnother
            }
            style={({
              pressed,
            }) => [
              styles.actionRow,

              pressed &&
                styles.actionRowPressed,
            ]}
          >
            <View
              style={
                styles.actionIcon
              }
            >
              <Ionicons
                name="person-add-outline"
                size={20}
                color={
                  COLORS.maroon
                }
              />
            </View>


            <Text
              style={
                styles.actionText
              }
            >
              Use another account
            </Text>


            <Ionicons
              name="chevron-forward"
              size={19}
              color={
                COLORS.lightMuted
              }
            />
          </Pressable>


          <View
            style={
              styles.actionDivider
            }
          />


          {/*
          |--------------------------------------------------------------------------
          | REMOVE ACCOUNT
          |--------------------------------------------------------------------------
          */}

          <Pressable
            disabled={
              !localAccounts.length
            }
            onPress={
              openRemoveModal
            }
            style={({
              pressed,
            }) => [
              styles.actionRow,

              pressed &&
                localAccounts.length > 0
                &&
                styles.actionRowPressed,

              !localAccounts.length &&
                styles.disabled,
            ]}
          >
            <View
              style={
                styles.actionIcon
              }
            >
              <Ionicons
                name="trash-outline"
                size={20}
                color={
                  COLORS.maroon
                }
              />
            </View>


            <Text
              style={
                styles.actionText
              }
            >
              Remove an account
            </Text>


            <Ionicons
              name="chevron-forward"
              size={19}
              color={
                COLORS.lightMuted
              }
            />
          </Pressable>

        </View>

      </ScrollView>


      {/*
      |--------------------------------------------------------------------------
      | LOGIN MODAL
      |--------------------------------------------------------------------------
      */}

      <Modal
        visible={
          showLoginModal
        }
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={
          closeLoginModal
        }
      >
        <KeyboardAvoidingView
          style={
            styles.modalRoot
          }
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >
          <Pressable
            style={
              styles.modalBackdrop
            }
            onPress={
              closeLoginModal
            }
          >
            <Pressable
              style={
                styles.loginModal
              }
              onPress={() => {}}
            >
              <Pressable
                onPress={
                  closeLoginModal
                }
                disabled={
                  loggingIn
                }
                style={
                  styles.closeButton
                }
              >
                <Ionicons
                  name="close"
                  size={21}
                  color={
                    COLORS.teal
                  }
                />
              </Pressable>


              {/*
              |--------------------------------------------------------------------------
              | DATABASE PROFILE PICTURE
              |--------------------------------------------------------------------------
              */}

              <AccountAvatar
                account={
                  selectedAccount
                }
                size={88}
              />


              <Text
                numberOfLines={2}
                style={
                  styles.modalName
                }
              >
                {
                  getAccountName(
                    selectedAccount
                  )
                }
              </Text>


              <Text
                numberOfLines={1}
                style={
                  styles.modalEmail
                }
              >
                {
                  selectedAccount?.email
                }
              </Text>


              {
                getUniversityName(
                  selectedAccount
                )
                  ? (
                    <Text
                      numberOfLines={1}
                      style={
                        styles.modalUniversity
                      }
                    >
                      {
                        getUniversityName(
                          selectedAccount
                        )
                      }
                    </Text>
                  )
                  :
                  null
              }


              {/*
              |--------------------------------------------------------------------------
              | PASSWORD
              |--------------------------------------------------------------------------
              */}

              <View
                style={[
                  styles.passwordBox,

                  loginError
                    ? styles.passwordBoxError
                    : null,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={
                    loginError
                      ? COLORS.maroon
                      : COLORS.teal
                  }
                />


                <TextInput
                  value={
                    password
                  }
                  onChangeText={
                    value => {
                      setPassword(
                        value
                      );

                      setLoginError('');
                    }
                  }
                  secureTextEntry={
                    !showPassword
                  }
                  editable={
                    !loggingIn
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  textContentType="password"
                  placeholder="Password"
                  placeholderTextColor={
                    COLORS.lightMuted
                  }
                  returnKeyType="go"
                  onSubmitEditing={
                    loginSelectedAccount
                  }
                  selectionColor={
                    COLORS.maroon
                  }
                  style={
                    styles.passwordInput
                  }
                />


                <Pressable
                  disabled={
                    loggingIn
                  }
                  onPress={() =>
                    setShowPassword(
                      current =>
                        !current
                    )
                  }
                  style={
                    styles.eyeButton
                  }
                >
                  <Ionicons
                    name={
                      showPassword
                        ? 'eye-off-outline'
                        : 'eye-outline'
                    }
                    size={20}
                    color={
                      COLORS.maroon
                    }
                  />
                </Pressable>
              </View>


              {
                loginError
                  ? (
                    <Text
                      style={
                        styles.loginError
                      }
                    >
                      {
                        loginError
                      }
                    </Text>
                  )
                  :
                  null
              }


              {/*
              |--------------------------------------------------------------------------
              | MODAL BUTTONS
              |--------------------------------------------------------------------------
              */}

              <View
                style={
                  styles.modalButtons
                }
              >
                <Pressable
                  disabled={
                    loggingIn
                  }
                  onPress={
                    closeLoginModal
                  }
                  style={({
                    pressed,
                  }) => [
                    styles.cancelButton,

                    pressed &&
                      styles.pressed,

                    loggingIn &&
                      styles.disabled,
                  ]}
                >
                  <Text
                    style={
                      styles.cancelText
                    }
                  >
                    Cancel
                  </Text>
                </Pressable>


                <Pressable
                  disabled={
                    loggingIn
                  }
                  onPress={
                    loginSelectedAccount
                  }
                  style={({
                    pressed,
                  }) => [
                    styles.continueButton,

                    pressed &&
                      styles.pressed,

                    loggingIn &&
                      styles.disabled,
                  ]}
                >
                  {
                    loggingIn
                      ? (
                        <ActivityIndicator
                          size="small"
                          color={
                            COLORS.white
                          }
                        />
                      )
                      :
                      null
                  }


                  <Text
                    style={
                      styles.continueText
                    }
                  >
                    {
                      loggingIn
                        ? 'Signing In...'
                        : 'Continue'
                    }
                  </Text>
                </Pressable>
              </View>

            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>


      {/*
      |--------------------------------------------------------------------------
      | REMOVE ACCOUNT MODAL
      |--------------------------------------------------------------------------
      */}

      <Modal
        visible={
          showRemoveModal
        }
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() =>
          setShowRemoveModal(
            false
          )
        }
      >
        <View
          style={
            styles.modalRoot
          }
        >
          <Pressable
            style={
              styles.modalBackdrop
            }
            onPress={() =>
              setShowRemoveModal(
                false
              )
            }
          >
            <Pressable
              style={
                styles.removeModal
              }
              onPress={() => {}}
            >
              <View
                style={
                  styles.removeHeader
                }
              >
                <Text
                  style={
                    styles.removeTitle
                  }
                >
                  Remove Account
                </Text>


                <Pressable
                  onPress={() =>
                    setShowRemoveModal(
                      false
                    )
                  }
                  style={
                    styles.closeButtonInline
                  }
                >
                  <Ionicons
                    name="close"
                    size={21}
                    color={
                      COLORS.teal
                    }
                  />
                </Pressable>
              </View>


              <View
                style={
                  styles.removeTopDivider
                }
              />


              <ScrollView
                showsVerticalScrollIndicator={
                  false
                }
                style={
                  styles.removeList
                }
              >
                {
                  localAccounts.map(
                    (
                      account,
                      index
                    ) => (
                      <RemoveAccountRow
                        key={
                          getAccountKey(
                            account
                          )
                        }

                        account={
                          account
                        }

                        showDivider={
                          index <
                          localAccounts.length -
                          1
                        }

                        onPress={() =>
                          removeAccount(
                            account
                          )
                        }
                      />
                    )
                  )
                }
              </ScrollView>

            </Pressable>
          </Pressable>
        </View>
      </Modal>

    </SafeAreaView>
  );
}


/*
|--------------------------------------------------------------------------
| ACCOUNT ROW
|--------------------------------------------------------------------------
*/

function AccountRow({
  account,
  onPress,
  showDivider,
}) {
  return (
    <Pressable
      onPress={
        onPress
      }
      style={({
        pressed,
      }) => [
        styles.accountRow,

        pressed &&
          styles.accountRowPressed,
      ]}
    >
      <AccountAvatar
        account={
          account
        }
        size={62}
      />


      <View
        style={
          styles.accountInfo
        }
      >
        <Text
          numberOfLines={1}
          style={
            styles.accountName
          }
        >
          {
            getAccountName(
              account
            )
          }
        </Text>


        <Text
          numberOfLines={1}
          style={
            styles.accountRole
          }
        >
          {
            getRoleLabel(
              account
            )
          }
        </Text>


        <Text
          numberOfLines={1}
          style={
            styles.accountEmail
          }
        >
          {
            account?.email
          }
        </Text>
      </View>


      <Ionicons
        name="chevron-forward"
        size={20}
        color={
          COLORS.lightMuted
        }
      />


      {
        showDivider
          ? (
            <View
              style={
                styles.accountDivider
              }
            />
          )
          :
          null
      }
    </Pressable>
  );
}


/*
|--------------------------------------------------------------------------
| REMOVE ACCOUNT ROW
|--------------------------------------------------------------------------
*/

function RemoveAccountRow({
  account,
  onPress,
  showDivider,
}) {
  return (
    <Pressable
      onPress={
        onPress
      }
      style={({
        pressed,
      }) => [
        styles.removeAccountRow,

        pressed &&
          styles.accountRowPressed,
      ]}
    >
      <AccountAvatar
        account={
          account
        }
        size={50}
      />


      <View
        style={
          styles.removeInfo
        }
      >
        <Text
          numberOfLines={1}
          style={
            styles.removeName
          }
        >
          {
            getAccountName(
              account
            )
          }
        </Text>


        <Text
          numberOfLines={1}
          style={
            styles.removeEmail
          }
        >
          {
            account?.email
          }
        </Text>
      </View>


      <Ionicons
        name="trash-outline"
        size={19}
        color={
          COLORS.maroon
        }
      />


      {
        showDivider
          ? (
            <View
              style={
                styles.removeDivider
              }
            />
          )
          :
          null
      }
    </Pressable>
  );
}


/*
|--------------------------------------------------------------------------
| PROFILE PICTURE
|--------------------------------------------------------------------------
*/

function AccountAvatar({
  account,
  size = 56,
}) {
  const [
    failed,
    setFailed,
  ] =
    useState(false);


  const photo =
    resolvePhotoUrl(
      account
    );


  useEffect(
    () => {
      setFailed(false);
    },
    [
      photo,
    ]
  );


  return (
    <View
      style={[
        styles.avatar,

        {
          width:
            size,

          height:
            size,

          borderRadius:
            size / 2,
        },
      ]}
    >
      {
        photo &&
        !failed
          ? (
            <Image
              source={{
                uri:
                  photo,
              }}
              resizeMode="cover"
              onError={() =>
                setFailed(true)
              }
              style={{
                width:
                  '100%',

                height:
                  '100%',

                borderRadius:
                  size / 2,
              }}
            />
          )
          :
          (
            <View
              style={[
                styles.avatarFallback,

                {
                  borderRadius:
                    size / 2,
                },
              ]}
            >
              <Text
                style={[
                  styles.avatarInitials,

                  {
                    fontSize:
                      Math.max(
                        15,
                        size * 0.29
                      ),
                  },
                ]}
              >
                {
                  getInitials(
                    account
                  )
                }
              </Text>
            </View>
          )
      }
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
    | ROOT
    |--------------------------------------------------------------------------
    */

    safeArea: {
      flex: 1,
      backgroundColor:
        COLORS.cream,
    },


    scrollView: {
      flex: 1,
      backgroundColor:
        COLORS.cream,
    },


    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingTop: 30,
    },


    disabled: {
      opacity: 0.35,
    },


    pressed: {
      opacity: 0.72,
    },


    /*
    |--------------------------------------------------------------------------
    | CENTER SCREEN
    |--------------------------------------------------------------------------
    */

    centerScreen: {
      flex: 1,
      paddingHorizontal: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.cream,
    },


    loadingLogo: {
      width: 110,
      height: 110,
    },


    loadingIndicator: {
      marginTop: 20,
    },


    loadingText: {
      marginTop: 10,
      color:
        COLORS.maroon,
      fontSize: 12,
      fontWeight: '700',
    },


    /*
    |--------------------------------------------------------------------------
    | ERROR
    |--------------------------------------------------------------------------
    */

    errorTitle: {
      marginTop: 22,
      color:
        COLORS.maroon,
      fontSize: 20,
      fontWeight: '800',
    },


    errorText: {
      maxWidth: 300,
      marginTop: 8,
      color:
        COLORS.muted,
      fontSize: 11,
      lineHeight: 17,
      textAlign: 'center',
    },


    retryButton: {
      height: 48,
      marginTop: 20,
      paddingHorizontal: 24,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.maroon,
    },


    retryText: {
      marginLeft: 7,
      color:
        COLORS.white,
      fontSize: 11,
      fontWeight: '800',
    },


    /*
    |--------------------------------------------------------------------------
    | LOGO
    |--------------------------------------------------------------------------
    */

    logoArea: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
    },


    logo: {
      width: 118,
      height: 118,
    },


    /*
    |--------------------------------------------------------------------------
    | TITLE
    |--------------------------------------------------------------------------
    */

    title: {
      marginBottom: 22,
      color:
        COLORS.maroon,
      fontSize: 27,
      lineHeight: 33,
      fontWeight: '800',
      letterSpacing: -0.5,
      textAlign: 'center',
    },


    /*
    |--------------------------------------------------------------------------
    | ACCOUNT CARD
    |--------------------------------------------------------------------------
    */

    accountCard: {
      width: '100%',
      maxWidth: 520,
      alignSelf: 'center',
      overflow: 'hidden',
      borderRadius: 20,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      backgroundColor:
        COLORS.white,

      elevation: 2,

      shadowColor:
        COLORS.black,

      shadowOpacity: 0.05,
      shadowRadius: 9,

      shadowOffset: {
        width: 0,
        height: 4,
      },
    },


    /*
    |--------------------------------------------------------------------------
    | ACCOUNT
    |--------------------------------------------------------------------------
    */

    accountRow: {
      position: 'relative',
      minHeight: 94,
      paddingHorizontal: 16,
      paddingVertical: 15,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        COLORS.white,
    },


    accountRowPressed: {
      backgroundColor:
        '#F8F5EF',
    },


    accountInfo: {
      flex: 1,
      minWidth: 0,
      marginLeft: 13,
      marginRight: 10,
    },


    accountName: {
      color:
        COLORS.dark,
      fontSize: 15,
      fontWeight: '800',
    },


    accountRole: {
      marginTop: 3,
      color:
        COLORS.green,
      fontSize: 9.5,
      fontWeight: '700',
    },


    accountEmail: {
      marginTop: 4,
      color:
        COLORS.muted,
      fontSize: 10,
    },


    accountDivider: {
      position: 'absolute',
      left: 91,
      right: 16,
      bottom: 0,
      height: 1,
      backgroundColor:
        COLORS.border,
    },


    /*
    |--------------------------------------------------------------------------
    | PROFILE IMAGE
    |--------------------------------------------------------------------------
    */

    avatar: {
      overflow: 'hidden',
      flexShrink: 0,
      borderWidth: 2,
      borderColor:
        COLORS.yellow,
      backgroundColor:
        COLORS.maroon,
    },


    avatarFallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.maroon,
    },


    avatarInitials: {
      color:
        COLORS.white,
      fontWeight: '900',
    },


    /*
    |--------------------------------------------------------------------------
    | EMPTY
    |--------------------------------------------------------------------------
    */

    emptyState: {
      minHeight: 150,
      alignItems: 'center',
      justifyContent: 'center',
    },


    emptyText: {
      marginTop: 9,
      color:
        COLORS.muted,
      fontSize: 12,
    },


    /*
    |--------------------------------------------------------------------------
    | ACTIONS
    |--------------------------------------------------------------------------
    */

    cardDivider: {
      height: 1,
      marginHorizontal: 16,
      backgroundColor:
        COLORS.border,
    },


    actionRow: {
      minHeight: 62,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        COLORS.white,
    },


    actionRowPressed: {
      backgroundColor:
        '#F8F5EF',
    },


    actionIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.softMaroon,
    },


    actionText: {
      flex: 1,
      marginLeft: 12,
      color:
        COLORS.maroon,
      fontSize: 11.5,
      fontWeight: '700',
    },


    actionDivider: {
      height: 1,
      marginLeft: 66,
      marginRight: 16,
      backgroundColor:
        COLORS.border,
    },


    /*
    |--------------------------------------------------------------------------
    | MODALS
    |--------------------------------------------------------------------------
    */

    modalRoot: {
      flex: 1,
    },


    modalBackdrop: {
      flex: 1,
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.overlay,
    },


    loginModal: {
      width: '100%',
      maxWidth: 390,
      paddingHorizontal: 22,
      paddingTop: 32,
      paddingBottom: 22,
      borderRadius: 20,
      alignItems: 'center',
      backgroundColor:
        COLORS.white,

      elevation: 12,

      shadowColor:
        COLORS.black,

      shadowOpacity: 0.18,
      shadowRadius: 18,

      shadowOffset: {
        width: 0,
        height: 8,
      },
    },


    closeButton: {
      position: 'absolute',
      top: 10,
      right: 10,
      zIndex: 10,
      width: 38,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
    },


    modalName: {
      marginTop: 14,
      paddingHorizontal: 18,
      color:
        COLORS.maroon,
      fontSize: 18,
      lineHeight: 23,
      fontWeight: '800',
      textAlign: 'center',
    },


    modalEmail: {
      marginTop: 4,
      color:
        COLORS.muted,
      fontSize: 10,
      textAlign: 'center',
    },


    modalUniversity: {
      marginTop: 5,
      maxWidth: '90%',
      color:
        COLORS.green,
      fontSize: 9,
      fontWeight: '700',
      textAlign: 'center',
    },


    /*
    |--------------------------------------------------------------------------
    | PASSWORD
    |--------------------------------------------------------------------------
    */

    passwordBox: {
      width: '100%',
      height: 52,
      marginTop: 23,
      paddingLeft: 14,
      borderWidth: 1.3,
      borderColor:
        COLORS.border,
      borderRadius: 11,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        COLORS.white,
    },


    passwordBoxError: {
      borderColor:
        COLORS.maroon,
    },


    passwordInput: {
      flex: 1,
      height: '100%',
      paddingHorizontal: 10,
      color:
        COLORS.dark,
      fontSize: 11,
    },


    eyeButton: {
      width: 46,
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },


    loginError: {
      width: '100%',
      marginTop: 8,
      color:
        COLORS.maroon,
      fontSize: 9,
      lineHeight: 13,
    },


    /*
    |--------------------------------------------------------------------------
    | LOGIN BUTTONS
    |--------------------------------------------------------------------------
    */

    modalButtons: {
      width: '100%',
      marginTop: 20,
      flexDirection: 'row',
    },


    cancelButton: {
      flex: 1,
      height: 47,
      marginRight: 6,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.white,
    },


    cancelText: {
      color:
        COLORS.teal,
      fontSize: 10,
      fontWeight: '700',
    },


    continueButton: {
      flex: 1.15,
      height: 47,
      marginLeft: 6,
      borderRadius: 11,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.maroon,
    },


    continueText: {
      marginLeft: 6,
      color:
        COLORS.white,
      fontSize: 10,
      fontWeight: '800',
    },


    /*
    |--------------------------------------------------------------------------
    | REMOVE MODAL
    |--------------------------------------------------------------------------
    */

    removeModal: {
      width: '100%',
      maxWidth: 410,
      maxHeight: '80%',
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 10,
      borderRadius: 20,
      backgroundColor:
        COLORS.white,

      elevation: 12,

      shadowColor:
        COLORS.black,

      shadowOpacity: 0.18,
      shadowRadius: 18,

      shadowOffset: {
        width: 0,
        height: 8,
      },
    },


    removeHeader: {
      minHeight: 42,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },


    removeTitle: {
      color:
        COLORS.maroon,
      fontSize: 18,
      fontWeight: '800',
    },


    closeButtonInline: {
      width: 38,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
    },


    removeTopDivider: {
      height: 1,
      marginTop: 5,
      backgroundColor:
        COLORS.border,
    },


    removeList: {
      maxHeight: 320,
    },


    removeAccountRow: {
      position: 'relative',
      minHeight: 74,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
    },


    removeInfo: {
      flex: 1,
      minWidth: 0,
      marginLeft: 11,
      marginRight: 10,
    },


    removeName: {
      color:
        COLORS.dark,
      fontSize: 12,
      fontWeight: '800',
    },


    removeEmail: {
      marginTop: 4,
      color:
        COLORS.muted,
      fontSize: 9,
    },


    removeDivider: {
      position: 'absolute',
      left: 61,
      right: 0,
      bottom: 0,
      height: 1,
      backgroundColor:
        COLORS.border,
    },
  });