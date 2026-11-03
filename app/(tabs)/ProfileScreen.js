import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import * as ImagePicker from 'expo-image-picker';

import {
  getAdminProfile,
  uploadAdminProfilePhoto,
} from '../../services/api';


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

  page: '#F5F2EC',
  muted: '#746F69',
  lightMuted: '#9D9791',
  border: '#DDD7CE',

  softMaroon: '#F4E8E6',
  softYellow: '#FFF3D5',
  softGreen: '#E9F0E0',
  softTeal: '#E6ECEE',
};


/*
|--------------------------------------------------------------------------
| API BASE
|--------------------------------------------------------------------------
*/

const API_BASE_URL =
  process.env.EXPO_PUBLIC_NSTPHUB_SERVER_URL ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  '';


/*
|--------------------------------------------------------------------------
| SERVER ORIGIN
|--------------------------------------------------------------------------
*/

function serverOrigin() {
  const value =
    String(
      API_BASE_URL ||
      ''
    )
      .trim()
      .replace(
        /\/+$/,
        ''
      );

  if (!value) {
    return '';
  }

  return value.replace(
    /\/api(?:\/.*)?$/i,
    ''
  );
}


/*
|--------------------------------------------------------------------------
| RESOLVE PHOTO URL
|--------------------------------------------------------------------------
*/

function resolvePhotoUrl(
  value
) {
  if (!value) {
    return null;
  }

  const raw =
    String(
      value
    ).trim();

  if (!raw) {
    return null;
  }


  if (
    raw.startsWith(
      'file://'
    ) ||
    raw.startsWith(
      'data:'
    )
  ) {
    return raw;
  }


  const origin =
    serverOrigin();


  if (
    raw.startsWith(
      'http://'
    ) ||
    raw.startsWith(
      'https://'
    )
  ) {
    if (
      origin &&
      /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?\/storage\//i
        .test(
          raw
        )
    ) {
      const storagePath =
        raw.replace(
          /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i,
          ''
        );

      return (
        `${origin}${storagePath}`
      );
    }

    return raw;
  }


  if (!origin) {
    return null;
  }

  const cleanPath =
    raw
      .replace(
        /^public\//i,
        ''
      )
      .replace(
        /^\/+/,
        ''
      );

  if (
    cleanPath.startsWith(
      'storage/'
    )
  ) {
    return (
      `${origin}/${cleanPath}`
    );
  }

  return (
    `${origin}/storage/${cleanPath}`
  );
}


/*
|--------------------------------------------------------------------------
| INITIALS
|--------------------------------------------------------------------------
*/

function initialsFromName(
  name
) {
  return (
    String(
      name ||
      ''
    )
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(
        0,
        2
      )
      .map(
        part =>
          part
            .charAt(0)
            .toUpperCase()
      )
      .join('')
    ||
    'NS'
  );
}


/*
|--------------------------------------------------------------------------
| NORMALIZE COMPONENT
|--------------------------------------------------------------------------
*/

function normalizeComponent(
  value
) {
  return String(
    value ||
    ''
  )
    .trim()
    .toUpperCase();
}


/*
|--------------------------------------------------------------------------
| PROFILE SCREEN
|--------------------------------------------------------------------------
*/

export default function ProfileScreen() {
  const insets =
    useSafeAreaInsets();


  /*
  |--------------------------------------------------------------------------
  | STATE
  |--------------------------------------------------------------------------
  */

  const [
    data,
    setData,
  ] =
    useState(null);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);


  const [
    uploadingPhoto,
    setUploadingPhoto,
  ] =
    useState(false);


  const [
    loggingOut,
    setLoggingOut,
  ] =
    useState(false);


  const [
    failedImage,
    setFailedImage,
  ] =
    useState(false);


  const [
    error,
    setError,
  ] =
    useState('');


  /*
  |--------------------------------------------------------------------------
  | LOAD PROFILE
  |--------------------------------------------------------------------------
  */

  const loadProfile =
    useCallback(
      async (
        manual = false
      ) => {
        try {
          if (manual) {
            setRefreshing(
              true
            );
          }

          const result =
            await getAdminProfile();

          setData(
            result
          );

          setError(
            ''
          );

          setFailedImage(
            false
          );

        } catch (
          err
        ) {
          const message =
            err instanceof Error
              ? err.message
              : 'Unable to load profile information.';

          setError(
            message
          );

          const normalized =
            String(
              message
            )
              .toLowerCase();

          if (
            normalized.includes(
              'unauthenticated'
            ) ||
            normalized.includes(
              'unauthorized'
            ) ||
            normalized.includes(
              'logged in'
            )
          ) {
            router.replace(
              '/LoginScreen'
            );
          }

        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      []
    );


  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      loadProfile();
    },
    [
      loadProfile,
    ]
  );


  /*
  |--------------------------------------------------------------------------
  | ACCOUNT
  |--------------------------------------------------------------------------
  */

  const account =
    data?.account
    ??
    data?.administrator
    ??
    data?.user
    ??
    {};


  /*
  |--------------------------------------------------------------------------
  | UNIVERSITY
  |--------------------------------------------------------------------------
  */

  const university =
    data?.university
    ??
    account?.university
    ??
    {};


  /*
  |--------------------------------------------------------------------------
  | ROLE
  |--------------------------------------------------------------------------
  */

  const role =
    String(
      data?.role
      ??
      account?.role
      ??
      ''
    )
      .trim()
      .toLowerCase();


  /*
  |--------------------------------------------------------------------------
  | NAME
  |--------------------------------------------------------------------------
  */

  const displayName =
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
    'NSTP Staff';


  /*
  |--------------------------------------------------------------------------
  | USERNAME
  |--------------------------------------------------------------------------
  */

  const username =
    account?.username
    ||
    'NSTP User';


  /*
  |--------------------------------------------------------------------------
  | EMAIL
  |--------------------------------------------------------------------------
  */

  const email =
    account?.email
    ||
    'No email available';


  /*
  |--------------------------------------------------------------------------
  | PHONE
  |--------------------------------------------------------------------------
  */

  const phone =
    account?.phone_number
    ||
    account?.phone
    ||
    account?.contact_number
    ||
    'No phone number';


  /*
  |--------------------------------------------------------------------------
  | UNIVERSITY NAME
  |--------------------------------------------------------------------------
  */

  const universityName =
    university?.name
    ||
    university?.acronym
    ||
    'University';


  const universityShortName =
    university?.acronym
    ||
    university?.name
    ||
    'NSTP';


  /*
  |--------------------------------------------------------------------------
  | CAMPUS
  |--------------------------------------------------------------------------
  */

  const campusText =
    useMemo(
      () => {
        const campus =
          university
            ?.campus_type;

        if (!campus) {
          return 'Main Campus';
        }

        const value =
          String(
            campus
          ).trim();

        if (
          value
            .toLowerCase()
            .includes(
              'campus'
            )
        ) {
          return value;
        }

        return (
          `${value} Campus`
        );
      },
      [
        university
          ?.campus_type,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | COMPONENT OPTIONS
  |--------------------------------------------------------------------------
  */

  const componentOptions =
    useMemo(
      () => {
        const raw =
          data
            ?.component_context
            ?.options
          ??
          account
            ?.components
          ??
          account
            ?.component_codes
          ??
          [];

        if (
          !Array.isArray(
            raw
          )
        ) {
          return [];
        }

        return [
          ...new Set(
            raw
              .map(
                normalizeComponent
              )
              .filter(Boolean)
          ),
        ];
      },
      [
        data
          ?.component_context
          ?.options,

        account
          ?.components,

        account
          ?.component_codes,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | COMPONENT
  |--------------------------------------------------------------------------
  */

  const component =
    normalizeComponent(
      account?.component
      ||
      data
        ?.component_context
        ?.selected
      ||
      componentOptions[0]
      ||
      'NSTP'
    );


  const componentLabel =
    componentOptions.length > 1
      ? componentOptions
          .join(' / ')
      : component;


  /*
  |--------------------------------------------------------------------------
  | ROLE LABEL
  |--------------------------------------------------------------------------
  */

  const roleLabel =
    role ===
    'coordinator-attendance'
      ? 'Attendance Coordinator'

      : role ===
        'coordinator-announcement'
        ? 'Announcement Coordinator'

        : role ===
          'coordinator-schedule'
          ? 'Schedule Coordinator'

          : role ===
            'instructor'
            ? 'NSTP Instructor'

            : 'University Administrator';


  /*
  |--------------------------------------------------------------------------
  | ROLE ICON
  |--------------------------------------------------------------------------
  */

  const roleIcon =
    role ===
    'coordinator-attendance'
      ? 'calendar-clear-outline'

      : role ===
        'coordinator-announcement'
        ? 'megaphone-outline'

        : role ===
          'coordinator-schedule'
          ? 'time-outline'

          : role ===
            'instructor'
            ? 'school-outline'

            : 'shield-checkmark-outline';


  /*
  |--------------------------------------------------------------------------
  | PROFILE PHOTO
  |--------------------------------------------------------------------------
  */

  const rawProfilePhoto =
    account?.profile_photo_url
    ||
    account?.photo_url
    ||
    account?.profile_photo
    ||
    account?.photo
    ||
    '';


  const profilePhotoUrl =
    useMemo(
      () =>
        resolvePhotoUrl(
          rawProfilePhoto
        ),
      [
        rawProfilePhoto,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | INITIALS
  |--------------------------------------------------------------------------
  */

  const initials =
    useMemo(
      () =>
        initialsFromName(
          displayName
        ),
      [
        displayName,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | SELECT PHOTO FROM GALLERY
  |--------------------------------------------------------------------------
  */

  const handlePhotoAction =
    async () => {
      if (
        uploadingPhoto
      ) {
        return;
      }

      try {
        const permission =
          await ImagePicker
            .requestMediaLibraryPermissionsAsync();


        if (
          !permission.granted
        ) {
          Alert.alert(
            'Gallery permission required',
            'Allow NSTP HUB to access your photos so you can select a profile picture.'
          );

          return;
        }


        const result =
          await ImagePicker
            .launchImageLibraryAsync({
              mediaTypes: [
                'images',
              ],

              allowsEditing:
                true,

              aspect: [
                1,
                1,
              ],

              quality:
                0.85,
            });


        if (
          result.canceled ||
          !result.assets
            ?.length
        ) {
          return;
        }


        const asset =
          result.assets[0];


        if (
          !asset?.uri
        ) {
          throw new Error(
            'The selected image could not be read.'
          );
        }


        setUploadingPhoto(
          true
        );


        const originalName =
          String(
            asset.fileName
            ||
            ''
          ).trim();


        const lowerName =
          originalName
            .toLowerCase();


        const mimeType =
          asset.mimeType
          ||
          (
            lowerName.endsWith(
              '.png'
            )
              ? 'image/png'

              : lowerName.endsWith(
                  '.webp'
                )
                ? 'image/webp'

                : 'image/jpeg'
          );


        const extension =
          mimeType ===
          'image/png'
            ? 'png'

            : mimeType ===
              'image/webp'
              ? 'webp'

              : 'jpg';


        const uploadName =
          originalName
          ||
          `profile-${Date.now()}.${extension}`;


        await uploadAdminProfilePhoto({
          uri:
            asset.uri,

          name:
            uploadName,

          type:
            mimeType,
        });


        await loadProfile(
          true
        );


        Alert.alert(
          'Profile updated',
          'Your profile picture has been updated successfully.'
        );

      } catch (
        err
      ) {
        Alert.alert(
          'Unable to update photo',

          err instanceof Error
            ? err.message
            : 'Please try again.'
        );

      } finally {
        setUploadingPhoto(
          false
        );
      }
    };


  /*
  |--------------------------------------------------------------------------
  | CHANGE PASSWORD
  |--------------------------------------------------------------------------
  */

  const handleChangePassword =
    () => {
      router.push(
        '/AdminChangePasswordScreen'
      );
    };


  /*
  |--------------------------------------------------------------------------
  | GO TO LOGOUT SCREEN
  |--------------------------------------------------------------------------
  |
  | IMPORTANT:
  |
  | DO NOT call logoutAdministrator() here.
  |
  | Logout.js needs the current authentication token first so it can:
  |
  | 1. Read the current signed-in account
  | 2. Save account information in SecureStore
  | 3. Call logoutAdministrator()
  | 4. Clear the authentication token
  | 5. Show the account in "Choose an account"
  |
  |--------------------------------------------------------------------------
  */

  const handleLogout =
    () => {
      if (
        loggingOut
      ) {
        return;
      }

      setLoggingOut(
        true
      );

      router.replace(
        '/Logout'
      );
    };


  /*
  |--------------------------------------------------------------------------
  | CONFIRM LOGOUT
  |--------------------------------------------------------------------------
  */

  const confirmLogout =
    () => {
      if (
        loggingOut
      ) {
        return;
      }

      Alert.alert(
        'Sign out',
        'Are you sure you want to sign out of NSTP HUB?',
        [
          {
            text:
              'Cancel',

            style:
              'cancel',
          },

          {
            text:
              'Sign out',

            style:
              'destructive',

            onPress:
              handleLogout,
          },
        ]
      );
    };


  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (
    loading
  ) {
    return (
      <SafeAreaView
        style={
          styles.loadingScreen
        }
        edges={[
          'top',
          'left',
          'right',
        ]}
      >
        <StatusBar
          backgroundColor={
            COLORS.page
          }
          barStyle="dark-content"
        />

        <View
          style={
            styles.loadingMark
          }
        >
          <Ionicons
            name="person-outline"
            size={28}
            color={
              COLORS.maroon
            }
          />
        </View>

        <ActivityIndicator
          size="small"
          color={
            COLORS.maroon
          }
          style={{
            marginTop: 20,
          }}
        />

        <Text
          style={
            styles.loadingTitle
          }
        >
          Loading Profile
        </Text>

        <Text
          style={
            styles.loadingText
          }
        >
          Preparing your account
        </Text>
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
      <StatusBar
        backgroundColor={
          COLORS.page
        }
        barStyle="dark-content"
      />


      <ScrollView
        style={
          styles.scrollView
        }
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={() =>
              loadProfile(
                true
              )
            }
            tintColor={
              COLORS.maroon
            }
            colors={[
              COLORS.maroon,
            ]}
          />
        }
        contentContainerStyle={{
          paddingBottom:
            130 +
            insets.bottom,
        }}
      >

        {/*
        |--------------------------------------------------------------------------
        | PROFILE HEADER
        |--------------------------------------------------------------------------
        */}

        <View
          style={
            styles.profileHeader
          }
        >
          <View
            style={
              styles.profileHeaderTop
            }
          >
            <View>
              <Text
                style={
                  styles.profileHeaderEyebrow
                }
              >
                MY ACCOUNT
              </Text>

              <Text
                style={
                  styles.profileHeaderTitle
                }
              >
                Profile
              </Text>
            </View>


            <View
              style={
                styles.profileHeaderMark
              }
            >
              <Ionicons
                name="person-outline"
                size={23}
                color={
                  COLORS.maroon
                }
              />
            </View>
          </View>


          <Text
            style={
              styles.profileHeaderSubtitle
            }
          >
            Your NSTP HUB account and personal information
          </Text>


          <View
            style={
              styles.photoArea
            }
          >
            <View
              style={
                styles.photoOuterRing
              }
            >
              <View
                style={
                  styles.photoInnerRing
                }
              >
                {
                  profilePhotoUrl &&
                  !failedImage
                    ? (
                      <Image
                        source={{
                          uri:
                            profilePhotoUrl,
                        }}
                        resizeMode="cover"
                        onError={() =>
                          setFailedImage(
                            true
                          )
                        }
                        style={
                          styles.profilePhoto
                        }
                      />
                    )
                    :
                    (
                      <View
                        style={
                          styles.profilePhotoFallback
                        }
                      >
                        <Text
                          style={
                            styles.profileInitials
                          }
                        >
                          {
                            initials
                          }
                        </Text>
                      </View>
                    )
                }
              </View>


              <Pressable
                disabled={
                  uploadingPhoto
                }
                onPress={
                  handlePhotoAction
                }
                style={({
                  pressed,
                }) => [
                  styles.editPhotoButton,

                  pressed &&
                    styles.editPhotoButtonPressed,

                  uploadingPhoto &&
                    styles.disabled,
                ]}
              >
                {
                  uploadingPhoto
                    ? (
                      <ActivityIndicator
                        size="small"
                        color={
                          COLORS.maroon
                        }
                      />
                    )
                    :
                    (
                      <Ionicons
                        name="images-outline"
                        size={18}
                        color={
                          COLORS.maroon
                        }
                      />
                    )
                }
              </Pressable>
            </View>


            <Text
              style={
                styles.profileName
              }
            >
              {
                displayName
              }
            </Text>


            <Text
              style={
                styles.username
              }
            >
              @{
                username
              }
            </Text>


            <View
              style={
                styles.rolePill
              }
            >
              <Ionicons
                name={
                  roleIcon
                }
                size={14}
                color={
                  COLORS.maroon
                }
              />

              <Text
                style={
                  styles.rolePillText
                }
              >
                {
                  roleLabel
                }
              </Text>
            </View>


            <View
              style={
                styles.syncIndicator
              }
            >
              <View
                style={
                  styles.syncDot
                }
              />

              <Text
                style={
                  styles.syncText
                }
              >
                {
                  rawProfilePhoto
                    ? 'Profile picture synced with web'
                    : 'No profile picture saved yet'
                }
              </Text>
            </View>
          </View>
        </View>


        <View
          style={
            styles.content
          }
        >

          {/*
          |--------------------------------------------------------------------------
          | ERROR
          |--------------------------------------------------------------------------
          */}

          {
            error
              ? (
                <View
                  style={
                    styles.errorBox
                  }
                >
                  <Ionicons
                    name="alert-circle-outline"
                    size={20}
                    color={
                      COLORS.maroon
                    }
                  />

                  <Text
                    style={
                      styles.errorText
                    }
                  >
                    {
                      error
                    }
                  </Text>

                  <TouchableOpacity
                    onPress={() =>
                      loadProfile(
                        true
                      )
                    }
                    style={
                      styles.retryButton
                    }
                  >
                    <Ionicons
                      name="refresh-outline"
                      size={18}
                      color={
                        COLORS.maroon
                      }
                    />
                  </TouchableOpacity>
                </View>
              )
              :
              null
          }


          {/*
          |--------------------------------------------------------------------------
          | ASSIGNMENT
          |--------------------------------------------------------------------------
          */}

          <View
            style={
              styles.assignmentStrip
            }
          >
            <View
              style={
                styles.assignmentAccent
              }
            />

            <View
              style={
                styles.assignmentIcon
              }
            >
              <Ionicons
                name={
                  roleIcon
                }
                size={22}
                color={
                  COLORS.yellow
                }
              />
            </View>


            <View
              style={
                styles.assignmentCopy
              }
            >
              <Text
                style={
                  styles.assignmentLabel
                }
              >
                CURRENT ASSIGNMENT
              </Text>

              <Text
                style={
                  styles.assignmentRole
                }
              >
                {
                  roleLabel
                }
              </Text>

              <Text
                style={
                  styles.assignmentMeta
                }
              >
                {
                  componentLabel
                } · {
                  universityShortName
                }
              </Text>
            </View>
          </View>


          {/*
          |--------------------------------------------------------------------------
          | PERSONAL DETAILS
          |--------------------------------------------------------------------------
          */}

          <ProfileSectionTitle
            title="Personal details"
            subtitle="Information linked to your NSTP HUB account"
          />


          <View
            style={
              styles.detailsBlock
            }
          >
            <DetailRow
              icon="mail-outline"
              label="Email"
              value={
                email
              }
            />

            <DetailSeparator />

            <DetailRow
              icon="call-outline"
              label="Phone"
              value={
                phone
              }
            />

            <DetailSeparator />

            <DetailRow
              icon="school-outline"
              label="Institution"
              value={
                universityName
              }
            />

            <DetailSeparator />

            <DetailRow
              icon="location-outline"
              label="Campus"
              value={
                campusText
              }
            />

            <DetailSeparator />

            <DetailRow
              icon="layers-outline"
              label="NSTP Component"
              value={
                componentLabel
              }
            />
          </View>


          {/*
          |--------------------------------------------------------------------------
          | SETTINGS
          |--------------------------------------------------------------------------
          */}

          <ProfileSectionTitle
            title="Profile settings"
            subtitle="Manage your photo and account security"
          />


          <View
            style={
              styles.settingsGroup
            }
          >
            <SettingRow
              icon="images-outline"
              title={
                rawProfilePhoto
                  ? 'Change profile picture'
                  : 'Add profile picture'
              }
              description="Choose a picture from your phone gallery"
              onPress={
                handlePhotoAction
              }
              loading={
                uploadingPhoto
              }
              disabled={
                uploadingPhoto
              }
            />


            <View
              style={
                styles.settingsSeparator
              }
            />


            <SettingRow
              icon="lock-closed-outline"
              title="Change password"
              description="Update your NSTP HUB account password"
              onPress={
                handleChangePassword
              }
            />
          </View>


          {/*
          |--------------------------------------------------------------------------
          | SIGN OUT
          |--------------------------------------------------------------------------
          */}

          <Pressable
            disabled={
              loggingOut
            }
            onPress={
              confirmLogout
            }
            style={({
              pressed,
            }) => [
              styles.logoutButton,

              pressed &&
                styles.logoutButtonPressed,

              loggingOut &&
                styles.disabled,
            ]}
          >
            {
              loggingOut
                ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      COLORS.maroon
                    }
                  />
                )
                :
                (
                  <>
                    <View
                      style={
                        styles.logoutIcon
                      }
                    >
                      <Ionicons
                        name="log-out-outline"
                        size={20}
                        color={
                          COLORS.maroon
                        }
                      />
                    </View>

                    <View
                      style={
                        styles.logoutCopy
                      }
                    >
                      <Text
                        style={
                          styles.logoutTitle
                        }
                      >
                        Sign out
                      </Text>

                      <Text
                        style={
                          styles.logoutDescription
                        }
                      >
                        Save this account on the device and end the session
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={19}
                      color={
                        COLORS.maroon
                      }
                    />
                  </>
                )
            }
          </Pressable>


          <View
            style={
              styles.footer
            }
          >
            <View
              style={
                styles.footerLine
              }
            />

            <Text
              style={
                styles.footerText
              }
            >
              NSTP HUB ADMINISTRATION
            </Text>

            <View
              style={
                styles.footerLine
              }
            />
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


/*
|--------------------------------------------------------------------------
| PROFILE SECTION TITLE
|--------------------------------------------------------------------------
*/

function ProfileSectionTitle({
  title,
  subtitle,
}) {
  return (
    <View
      style={
        styles.sectionTitleWrap
      }
    >
      <View
        style={
          styles.sectionTitleAccent
        }
      />

      <View>
        <Text
          style={
            styles.sectionTitle
          }
        >
          {
            title
          }
        </Text>

        <Text
          style={
            styles.sectionSubtitle
          }
        >
          {
            subtitle
          }
        </Text>
      </View>
    </View>
  );
}


/*
|--------------------------------------------------------------------------
| DETAIL ROW
|--------------------------------------------------------------------------
*/

function DetailRow({
  icon,
  label,
  value,
}) {
  return (
    <View
      style={
        styles.detailRow
      }
    >
      <View
        style={
          styles.detailIcon
        }
      >
        <Ionicons
          name={
            icon
          }
          size={19}
          color={
            COLORS.teal
          }
        />
      </View>


      <View
        style={
          styles.detailText
        }
      >
        <Text
          style={
            styles.detailLabel
          }
        >
          {
            label
          }
        </Text>

        <Text
          style={
            styles.detailValue
          }
          numberOfLines={2}
        >
          {
            value
          }
        </Text>
      </View>
    </View>
  );
}


/*
|--------------------------------------------------------------------------
| DETAIL SEPARATOR
|--------------------------------------------------------------------------
*/

function DetailSeparator() {
  return (
    <View
      style={
        styles.detailSeparator
      }
    />
  );
}


/*
|--------------------------------------------------------------------------
| SETTING ROW
|--------------------------------------------------------------------------
*/

function SettingRow({
  icon,
  title,
  description,
  onPress,
  loading = false,
  disabled = false,
}) {
  return (
    <Pressable
      disabled={
        disabled
      }
      onPress={
        onPress
      }
      style={({
        pressed,
      }) => [
        styles.settingRow,

        pressed &&
          styles.settingRowPressed,

        disabled &&
          styles.disabled,
      ]}
    >
      <View
        style={
          styles.settingIcon
        }
      >
        {
          loading
            ? (
              <ActivityIndicator
                size="small"
                color={
                  COLORS.maroon
                }
              />
            )
            :
            (
              <Ionicons
                name={
                  icon
                }
                size={21}
                color={
                  COLORS.maroon
                }
              />
            )
        }
      </View>


      <View
        style={
          styles.settingCopy
        }
      >
        <Text
          style={
            styles.settingTitle
          }
        >
          {
            title
          }
        </Text>

        <Text
          style={
            styles.settingDescription
          }
        >
          {
            description
          }
        </Text>
      </View>


      <Ionicons
        name="chevron-forward"
        size={18}
        color={
          COLORS.lightMuted
        }
      />
    </Pressable>
  );
}


/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

const styles =
  StyleSheet.create({

    safeArea: {
      flex: 1,
      backgroundColor:
        COLORS.page,
    },


    scrollView: {
      flex: 1,
      backgroundColor:
        COLORS.page,
    },


    content: {
      paddingHorizontal: 18,
    },


    /*
    |--------------------------------------------------------------------------
    | LOADING
    |--------------------------------------------------------------------------
    */

    loadingScreen: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.page,
    },


    loadingMark: {
      width: 62,
      height: 62,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },


    loadingTitle: {
      marginTop: 14,
      color:
        COLORS.dark,
      fontSize: 18,
      fontWeight: '900',
    },


    loadingText: {
      marginTop: 4,
      color:
        COLORS.muted,
      fontSize: 11,
    },


    /*
    |--------------------------------------------------------------------------
    | PROFILE HEADER
    |--------------------------------------------------------------------------
    */

    profileHeader: {
      paddingTop: 18,
      paddingHorizontal: 20,
      paddingBottom: 26,
      backgroundColor:
        COLORS.cream,
      borderBottomWidth: 1,
      borderBottomColor:
        COLORS.border,
    },


    profileHeaderTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },


    profileHeaderEyebrow: {
      color:
        COLORS.maroon,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.6,
    },


    profileHeaderTitle: {
      marginTop: 3,
      color:
        COLORS.dark,
      fontSize: 30,
      fontWeight: '900',
      letterSpacing: -0.9,
    },


    profileHeaderMark: {
      width: 47,
      height: 47,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.softYellow,
      borderWidth: 1,
      borderColor:
        'rgba(84,16,15,0.08)',
    },


    profileHeaderSubtitle: {
      marginTop: 6,
      color:
        COLORS.muted,
      fontSize: 12,
      lineHeight: 17,
    },


    /*
    |--------------------------------------------------------------------------
    | PHOTO AREA
    |--------------------------------------------------------------------------
    */

    photoArea: {
      marginTop: 24,
      alignItems: 'center',
    },


    photoOuterRing: {
      position: 'relative',
      width: 132,
      height: 132,
      borderRadius: 66,
      padding: 5,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.yellow,
    },


    photoInnerRing: {
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      borderRadius: 61,
      backgroundColor:
        COLORS.white,
      borderWidth: 4,
      borderColor:
        COLORS.cream,
    },


    profilePhoto: {
      width: '100%',
      height: '100%',
    },


    profilePhotoFallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.maroon,
    },


    profileInitials: {
      color:
        COLORS.white,
      fontSize: 35,
      fontWeight: '900',
      letterSpacing: 1,
    },


    editPhotoButton: {
      position: 'absolute',
      right: -2,
      bottom: 4,
      width: 42,
      height: 42,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.white,
      borderWidth: 2,
      borderColor:
        COLORS.maroon,

      elevation: 4,

      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 5,
      shadowOffset: {
        width: 0,
        height: 3,
      },
    },


    editPhotoButtonPressed: {
      transform: [
        {
          scale: 0.94,
        },
      ],
    },


    profileName: {
      marginTop: 16,
      color:
        COLORS.dark,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '900',
      textAlign: 'center',
      letterSpacing: -0.4,
    },


    username: {
      marginTop: 3,
      color:
        COLORS.muted,
      fontSize: 12,
      fontWeight: '700',
    },


    rolePill: {
      marginTop: 10,
      minHeight: 32,
      paddingHorizontal: 11,
      borderRadius: 999,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        COLORS.softMaroon,
    },


    rolePillText: {
      marginLeft: 6,
      color:
        COLORS.maroon,
      fontSize: 10.5,
      fontWeight: '900',
    },


    syncIndicator: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
    },


    syncDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor:
        COLORS.green,
    },


    syncText: {
      marginLeft: 6,
      color:
        COLORS.muted,
      fontSize: 9.5,
    },


    /*
    |--------------------------------------------------------------------------
    | ERROR
    |--------------------------------------------------------------------------
    */

    errorBox: {
      marginTop: 18,
      padding: 12,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        COLORS.softMaroon,
      borderWidth: 1,
      borderColor:
        'rgba(84,16,15,0.12)',
    },


    errorText: {
      flex: 1,
      marginHorizontal: 9,
      color:
        COLORS.maroon,
      fontSize: 11,
      lineHeight: 16,
    },


    retryButton: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.white,
    },


    /*
    |--------------------------------------------------------------------------
    | ASSIGNMENT
    |--------------------------------------------------------------------------
    */

    assignmentStrip: {
      position: 'relative',
      overflow: 'hidden',
      marginTop: 18,
      minHeight: 91,
      padding: 15,
      paddingLeft: 19,
      borderRadius: 20,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        COLORS.teal,
    },


    assignmentAccent: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 5,
      backgroundColor:
        COLORS.yellow,
    },


    assignmentIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        'rgba(255,189,54,0.12)',
    },


    assignmentCopy: {
      flex: 1,
      marginLeft: 12,
    },


    assignmentLabel: {
      color:
        COLORS.yellow,
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1,
    },


    assignmentRole: {
      marginTop: 3,
      color:
        COLORS.white,
      fontSize: 14,
      fontWeight: '900',
    },


    assignmentMeta: {
      marginTop: 4,
      color:
        'rgba(255,255,255,0.60)',
      fontSize: 10.5,
      lineHeight: 15,
    },


    /*
    |--------------------------------------------------------------------------
    | SECTION TITLE
    |--------------------------------------------------------------------------
    */

    sectionTitleWrap: {
      marginTop: 29,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
    },


    sectionTitleAccent: {
      width: 5,
      height: 37,
      marginRight: 10,
      borderRadius: 3,
      backgroundColor:
        COLORS.maroon,
    },


    sectionTitle: {
      color:
        COLORS.dark,
      fontSize: 18,
      fontWeight: '900',
      letterSpacing: -0.25,
    },


    sectionSubtitle: {
      marginTop: 3,
      color:
        COLORS.muted,
      fontSize: 10.5,
    },


    /*
    |--------------------------------------------------------------------------
    | DETAILS
    |--------------------------------------------------------------------------
    */

    detailsBlock: {
      paddingHorizontal: 15,
      borderRadius: 20,
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },


    detailRow: {
      minHeight: 73,
      flexDirection: 'row',
      alignItems: 'center',
    },


    detailIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.softTeal,
    },


    detailText: {
      flex: 1,
      minWidth: 0,
      marginLeft: 11,
    },


    detailLabel: {
      color:
        COLORS.muted,
      fontSize: 9.5,
      fontWeight: '700',
    },


    detailValue: {
      marginTop: 4,
      color:
        COLORS.dark,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '800',
    },


    detailSeparator: {
      height: 1,
      marginLeft: 51,
      backgroundColor:
        COLORS.border,
    },


    /*
    |--------------------------------------------------------------------------
    | SETTINGS
    |--------------------------------------------------------------------------
    */

    settingsGroup: {
      paddingHorizontal: 15,
      borderRadius: 20,
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },


    settingRow: {
      minHeight: 78,
      flexDirection: 'row',
      alignItems: 'center',
    },


    settingRowPressed: {
      opacity: 0.68,
    },


    settingIcon: {
      width: 43,
      height: 43,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.softYellow,
    },


    settingCopy: {
      flex: 1,
      minWidth: 0,
      marginLeft: 11,
      paddingRight: 8,
    },


    settingTitle: {
      color:
        COLORS.dark,
      fontSize: 13,
      fontWeight: '900',
    },


    settingDescription: {
      marginTop: 4,
      color:
        COLORS.muted,
      fontSize: 10.5,
      lineHeight: 15,
    },


    settingsSeparator: {
      height: 1,
      marginLeft: 54,
      backgroundColor:
        COLORS.border,
    },


    /*
    |--------------------------------------------------------------------------
    | LOGOUT
    |--------------------------------------------------------------------------
    */

    logoutButton: {
      minHeight: 69,
      marginTop: 26,
      paddingHorizontal: 14,
      borderRadius: 19,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        COLORS.softMaroon,
      borderWidth: 1,
      borderColor:
        'rgba(84,16,15,0.14)',
    },


    logoutButtonPressed: {
      opacity: 0.72,
    },


    logoutIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.white,
    },


    logoutCopy: {
      flex: 1,
      marginLeft: 10,
    },


    logoutTitle: {
      color:
        COLORS.maroon,
      fontSize: 13,
      fontWeight: '900',
    },


    logoutDescription: {
      marginTop: 3,
      color:
        COLORS.muted,
      fontSize: 10,
    },


    /*
    |--------------------------------------------------------------------------
    | FOOTER
    |--------------------------------------------------------------------------
    */

    footer: {
      marginTop: 26,
      marginBottom: 5,
      flexDirection: 'row',
      alignItems: 'center',
    },


    footerLine: {
      flex: 1,
      height: 1,
      backgroundColor:
        COLORS.border,
    },


    footerText: {
      marginHorizontal: 10,
      color:
        COLORS.lightMuted,
      fontSize: 8.5,
      fontWeight: '800',
      letterSpacing: 1,
    },


    /*
    |--------------------------------------------------------------------------
    | COMMON
    |--------------------------------------------------------------------------
    */

    disabled: {
      opacity: 0.5,
    },
  });