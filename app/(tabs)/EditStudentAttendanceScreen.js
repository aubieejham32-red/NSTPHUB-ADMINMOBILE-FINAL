import Ionicons from '@expo/vector-icons/Ionicons';
import {
  router,
  Stack,
  useLocalSearchParams,
} from 'expo-router';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
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

import {
  updateStudentNstpStatus,
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

  page: '#F5F2EB',
  surface: '#FFFFFF',
  surfaceSoft: '#FAF8F4',

  muted: '#716B66',
  mutedLight: '#A29B94',
  border: '#E3DDD4',

  softMaroon: '#F5E8E6',
  softGreen: '#EDF2E5',
  softOrange: '#FBECD0',
  softTeal: '#E8EFF0',
  softYellow: '#FFF4D7',
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
| STATUS OPTIONS
|--------------------------------------------------------------------------
*/

const STATUS_OPTIONS = [
  {
    value: 'ACTIVE',
    title: 'Active',
    description:
      'Student remains active and in good NSTP standing.',
    icon:
      'checkmark-circle-outline',
    color:
      COLORS.green,
    background:
      COLORS.softGreen,
  },

  {
    value:
      'WARNING FOR DROPOUT',
    title:
      'Warning for Dropout',
    description:
      'Student requires attention because of attendance concerns.',
    icon:
      'warning-outline',
    color:
      COLORS.orange,
    background:
      COLORS.softOrange,
  },

  {
    value: 'DROPOUT',
    title: 'Dropout',
    description:
      'Student is officially marked as an NSTP dropout.',
    icon:
      'person-remove-outline',
    color:
      COLORS.maroon,
    background:
      COLORS.softMaroon,
  },
];


/*
|--------------------------------------------------------------------------
| SAFE JSON
|--------------------------------------------------------------------------
*/

function safeJsonParse(
  value,
  fallback
) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return fallback;
  }

  if (
    typeof value === 'object'
  ) {
    return value;
  }

  try {
    return JSON.parse(
      String(value)
    );
  } catch {
    return fallback;
  }
}


/*
|--------------------------------------------------------------------------
| NORMALIZE STATUS
|--------------------------------------------------------------------------
*/

function normalizeStatus(
  value
) {
  const status =
    String(
      value ?? ''
    )
      .trim()
      .toUpperCase()
      .replace(
        /_/g,
        ' '
      )
      .replace(
        /-/g,
        ' '
      )
      .replace(
        /\s+/g,
        ' '
      );

  if (
    [
      'WARNING',
      'AT RISK',
      'AT RISK FOR DROPOUT',
      'WARNING FOR DROPOUT',
    ].includes(
      status
    )
  ) {
    return 'WARNING FOR DROPOUT';
  }

  if (
    [
      'DROPPED',
      'DROP OUT',
      'DROPOUT',
    ].includes(
      status
    )
  ) {
    return 'DROPOUT';
  }

  return 'ACTIVE';
}


/*
|--------------------------------------------------------------------------
| NORMALIZE ROLE
|--------------------------------------------------------------------------
*/

function normalizeRole(
  value
) {
  const role =
    String(
      value ?? ''
    )
      .trim()
      .toLowerCase()
      .replace(
        /_/g,
        '-'
      )
      .replace(
        /\s+/g,
        '-'
      );

  if (
    [
      'universityadministrator',
      'university-administrator',
      'university-admin',
      'administrator',
      'admin',
    ].includes(
      role
    )
  ) {
    return 'university-admin';
  }

  if (
    role.includes(
      'instructor'
    )
  ) {
    return 'instructor';
  }

  if (
    [
      'coordinator-attendance',
      'attendance-coordinator',
      'coordinator',
    ].includes(
      role
    )
  ) {
    return 'coordinator-attendance';
  }

  return role;
}


/*
|--------------------------------------------------------------------------
| SERVER ORIGIN
|--------------------------------------------------------------------------
*/

function getServerOrigin() {
  const raw =
    String(
      API_BASE_URL ?? ''
    )
      .trim()
      .replace(
        /\/+$/,
        ''
      );

  if (!raw) {
    return '';
  }

  const match =
    raw.match(
      /^(https?:\/\/[^/]+)/i
    );

  if (
    match?.[1]
  ) {
    return match[1];
  }

  return raw
    .replace(
      /\/api(?:\/.*)?$/i,
      ''
    )
    .replace(
      /\/+$/,
      ''
    );
}


const SERVER_ORIGIN =
  getServerOrigin();


/*
|--------------------------------------------------------------------------
| PROFILE PHOTO URL
|--------------------------------------------------------------------------
*/

function resolvePhotoUrl(
  value
) {
  const photo =
    String(
      value ?? ''
    ).trim();

  if (!photo) {
    return '';
  }

  if (
    photo.startsWith(
      'file://'
    ) ||
    photo.startsWith(
      'data:'
    )
  ) {
    return photo;
  }

  /*
  |--------------------------------------------------------------------------
  | ABSOLUTE URL
  |--------------------------------------------------------------------------
  */

  if (
    /^https?:\/\//i.test(
      photo
    )
  ) {
    if (
      !SERVER_ORIGIN
    ) {
      return photo;
    }

    /*
    |--------------------------------------------------------------------------
    | FIX LOCALHOST FOR PHYSICAL PHONE
    |--------------------------------------------------------------------------
    */

    return photo.replace(
      /^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?/i,
      SERVER_ORIGIN
    );
  }

  if (
    !SERVER_ORIGIN
  ) {
    return '';
  }

  /*
  |--------------------------------------------------------------------------
  | NORMALIZE LARAVEL STORAGE PATH
  |--------------------------------------------------------------------------
  */

  let path =
    photo
      .replace(
        /^\/+/,
        ''
      )
      .replace(
        /^public\//i,
        ''
      )
      .replace(
        /^app\/public\//i,
        ''
      );

  if (
    path.startsWith(
      'storage/'
    )
  ) {
    return (
      `${SERVER_ORIGIN}/${path}`
    );
  }

  return (
    `${SERVER_ORIGIN}/storage/${path}`
  );
}


/*
|--------------------------------------------------------------------------
| GET STATUS OPTION
|--------------------------------------------------------------------------
*/

function getStatusOption(
  value
) {
  const normalized =
    normalizeStatus(
      value
    );

  return (
    STATUS_OPTIONS.find(
      item =>
        item.value ===
        normalized
    ) ||
    STATUS_OPTIONS[0]
  );
}


/*
|--------------------------------------------------------------------------
| BUILD STUDENT NAME
|--------------------------------------------------------------------------
*/

function buildStudentName(
  student
) {
  const direct =
    String(
      student?.full_name ??
      student?.name ??
      ''
    ).trim();

  if (
    direct
  ) {
    return direct;
  }

  const first =
    String(
      student?.first_name ??
      ''
    ).trim();

  const middle =
    String(
      student?.middle_name ??
      ''
    ).trim();

  const last =
    String(
      student?.surname ??
      student?.last_name ??
      ''
    ).trim();

  return (
    [
      first,
      middle,
      last,
    ]
      .filter(Boolean)
      .join(' ')
    ||
    'Student'
  );
}


/*
|--------------------------------------------------------------------------
| INITIALS
|--------------------------------------------------------------------------
*/

function getInitials(
  name
) {
  const parts =
    String(
      name ?? ''
    )
      .replace(
        ',',
        ' '
      )
      .split(
        /\s+/
      )
      .filter(
        Boolean
      );

  if (
    parts.length === 0
  ) {
    return 'ST';
  }

  if (
    parts.length === 1
  ) {
    return parts[0]
      .charAt(0)
      .toUpperCase();
  }

  return (
    parts[0]
      .charAt(0) +
    parts[
      parts.length - 1
    ]
      .charAt(0)
  ).toUpperCase();
}


/*
|--------------------------------------------------------------------------
| SCREEN
|--------------------------------------------------------------------------
*/

export default function EditStudentAttendanceScreen() {
  const insets =
    useSafeAreaInsets();

  const params =
    useLocalSearchParams();


  /*
  |--------------------------------------------------------------------------
  | STUDENT
  |--------------------------------------------------------------------------
  */

  const student =
    useMemo(
      () =>
        safeJsonParse(
          params?.student,
          {}
        ),
      [
        params?.student,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | ROLE
  |--------------------------------------------------------------------------
  */

  const role =
    normalizeRole(
      params?.role ??
      params?.authRole ??
      ''
    );


  /*
  |--------------------------------------------------------------------------
  | PERMISSION
  |--------------------------------------------------------------------------
  */

  const canEdit =
    [
      'university-admin',
      'instructor',
      'coordinator-attendance',
    ].includes(
      role
    );


  /*
  |--------------------------------------------------------------------------
  | ORIGINAL STATUS
  |--------------------------------------------------------------------------
  */

  const originalStatus =
    useMemo(
      () =>
        normalizeStatus(
          student?.nstp_status ??
          student?.status ??
          student?.student_status ??
          'ACTIVE'
        ),
      [
        student,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | STATE
  |--------------------------------------------------------------------------
  */

  const [
    selectedStatus,
    setSelectedStatus,
  ] =
    useState(
      originalStatus
    );

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    photoFailed,
    setPhotoFailed,
  ] =
    useState(false);


  /*
  |--------------------------------------------------------------------------
  | SYNC STUDENT
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      setSelectedStatus(
        originalStatus
      );

      setPhotoFailed(
        false
      );
    },
    [
      originalStatus,
      student?.id,
    ]
  );


  /*
  |--------------------------------------------------------------------------
  | CHANGED
  |--------------------------------------------------------------------------
  */

  const statusChanged =
    selectedStatus !==
    originalStatus;


  /*
  |--------------------------------------------------------------------------
  | STUDENT NAME
  |--------------------------------------------------------------------------
  */

  const studentName =
    useMemo(
      () =>
        buildStudentName(
          student
        ),
      [
        student,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | STUDENT ID
  |--------------------------------------------------------------------------
  */

  const studentId =
    String(
      student?.student_id_number ??
      student?.id_number ??
      student?.student_id ??
      student?.school_id ??
      '—'
    ).trim();


  /*
  |--------------------------------------------------------------------------
  | COURSE
  |--------------------------------------------------------------------------
  */

  const course =
    String(
      student?.course ??
      student?.program ??
      student?.degree_program ??
      '—'
    ).trim();


  /*
  |--------------------------------------------------------------------------
  | YEAR
  |--------------------------------------------------------------------------
  */

  const year =
    String(
      student?.year_level ??
      student?.year ??
      ''
    ).trim();


  /*
  |--------------------------------------------------------------------------
  | SECTION
  |--------------------------------------------------------------------------
  */

  const section =
    String(
      student?.section ??
      ''
    ).trim();


  /*
  |--------------------------------------------------------------------------
  | YEAR / SECTION
  |--------------------------------------------------------------------------
  */

  const yearSection =
    year &&
    section
      ? `${year} • ${section}`
      : year ||
        section ||
        '—';


  /*
  |--------------------------------------------------------------------------
  | COMPONENT
  |--------------------------------------------------------------------------
  */

  const component =
    String(
      student?.component ??
      student?.nstp_component ??
      '—'
    )
      .trim()
      .toUpperCase();


  /*
  |--------------------------------------------------------------------------
  | PROFILE PHOTO
  |--------------------------------------------------------------------------
  */

  const photoUrl =
    resolvePhotoUrl(
      student?.profile_photo_url ??
      student?.profile_photo ??
      student?.photo_url ??
      student?.photo ??
      student?.avatar
    );

  const showPhoto =
    Boolean(
      photoUrl
    ) &&
    !photoFailed;


  /*
  |--------------------------------------------------------------------------
  | INITIALS
  |--------------------------------------------------------------------------
  */

  const initials =
    useMemo(
      () =>
        getInitials(
          studentName
        ),
      [
        studentName,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | STATUS META
  |--------------------------------------------------------------------------
  */

  const currentStatusOption =
    getStatusOption(
      originalStatus
    );

  const selectedOption =
    getStatusOption(
      selectedStatus
    );


  /*
  |--------------------------------------------------------------------------
  | BACK
  |--------------------------------------------------------------------------
  |
  | Always return directly to StudentListScreen.
  |--------------------------------------------------------------------------
  */

  const goBackToStudentList =
    () => {
      router.replace({
        pathname:
          '/(tabs)/StudentListScreen',

        params: {
          component:
            component !== '—'
              ? component
              : '',
        },
      });
    };


  /*
  |--------------------------------------------------------------------------
  | SELECT STATUS
  |--------------------------------------------------------------------------
  */

  const selectStatus =
    value => {
      if (
        !canEdit ||
        saving
      ) {
        return;
      }

      setSelectedStatus(
        normalizeStatus(
          value
        )
      );
    };


  /*
  |--------------------------------------------------------------------------
  | CANCEL
  |--------------------------------------------------------------------------
  */

  const cancelEdit =
    () => {
      if (
        saving
      ) {
        return;
      }

      if (
        !statusChanged
      ) {
        goBackToStudentList();

        return;
      }

      Alert.alert(
        'Discard changes?',
        'The selected student standing has not been saved.',
        [
          {
            text:
              'Keep Editing',

            style:
              'cancel',
          },

          {
            text:
              'Discard',

            style:
              'destructive',

            onPress:
              goBackToStudentList,
          },
        ]
      );
    };


  /*
  |--------------------------------------------------------------------------
  | SAVE
  |--------------------------------------------------------------------------
  */

  const saveStatus =
    () => {
      if (
        !canEdit ||
        !statusChanged ||
        saving
      ) {
        return;
      }

      if (
        !student?.id
      ) {
        Alert.alert(
          'Unable to save',
          'The selected student does not have a valid database ID.'
        );

        return;
      }

      Alert.alert(
        'Confirm status change',
        `Change ${studentName} from ${originalStatus} to ${selectedStatus}?`,
        [
          {
            text:
              'Cancel',

            style:
              'cancel',
          },

          {
            text:
              'Save',

            onPress:
              async () => {
                try {
                  setSaving(
                    true
                  );

                  const result =
                    await updateStudentNstpStatus(
                      student.id,
                      selectedStatus
                    );

                  Alert.alert(
                    'Status updated',
                    result?.message ||
                    'Student NSTP standing updated successfully.',
                    [
                      {
                        text:
                          'OK',

                        onPress:
                          goBackToStudentList,
                      },
                    ]
                  );

                } catch (
                  error
                ) {
                  Alert.alert(
                    'Unable to save',
                    error instanceof Error
                      ? error.message
                      : 'Unable to update the student standing.'
                  );

                } finally {
                  setSaving(
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
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <SafeAreaView
      style={
        styles.safeArea
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
          COLORS.page
        }
      />


      {/*
      |--------------------------------------------------------------------------
      | APP BAR
      |--------------------------------------------------------------------------
      */}

      <View
        style={
          styles.appBar
        }
      >
        <TouchableOpacity
          activeOpacity={0.72}
          onPress={
            goBackToStudentList
          }
          style={
            styles.backButton
          }
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={
              COLORS.dark
            }
          />
        </TouchableOpacity>


        <View
          style={
            styles.appBarCopy
          }
        >
          <Text
            style={
              styles.appBarTitle
            }
          >
            Student Profile
          </Text>

          <Text
            style={
              styles.appBarSubtitle
            }
          >
            Edit NSTP standing
          </Text>
        </View>


        <View
          style={
            styles.headerAction
          }
        >
          <Ionicons
            name={
              canEdit
                ? 'create-outline'
                : 'lock-closed-outline'
            }
            size={20}
            color={
              COLORS.maroon
            }
          />
        </View>
      </View>


      <ScrollView
        style={
          styles.scroll
        }
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom:
            24 +
            insets.bottom,
        }}
      >

        {/*
        |--------------------------------------------------------------------------
        | STUDENT PROFILE
        |--------------------------------------------------------------------------
        */}

        <View
          style={
            styles.profileSection
          }
        >
          <View
            style={
              styles.profileCard
            }
          >
            <View
              style={
                styles.profileAccent
              }
            />


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

              {/*
              |--------------------------------------------------------------------------
              | PHOTO
              |--------------------------------------------------------------------------
              */}

              <View
                style={
                  styles.photoContainer
                }
              >
                {
                  showPhoto
                    ? (
                      <Image
                        key={
                          photoUrl
                        }
                        source={{
                          uri:
                            photoUrl,
                        }}
                        resizeMode="cover"
                        style={
                          styles.profilePhoto
                        }
                        onError={() =>
                          setPhotoFailed(
                            true
                          )
                        }
                      />
                    )
                    : (
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


                <View
                  style={
                    styles.photoStatusBadge
                  }
                >
                  <Ionicons
                    name="school"
                    size={13}
                    color={
                      COLORS.white
                    }
                  />
                </View>
              </View>


              {/*
              |--------------------------------------------------------------------------
              | IDENTITY
              |--------------------------------------------------------------------------
              */}

              <View
                style={
                  styles.profileIdentity
                }
              >
                <View
                  style={
                    styles.componentChip
                  }
                >
                  <Ionicons
                    name="layers-outline"
                    size={13}
                    color={
                      COLORS.maroon
                    }
                  />

                  <Text
                    style={
                      styles.componentChipText
                    }
                  >
                    {
                      component
                    }
                  </Text>
                </View>


                <Text
                  numberOfLines={2}
                  style={
                    styles.studentName
                  }
                >
                  {
                    studentName
                  }
                </Text>


                <View
                  style={
                    styles.studentIdRow
                  }
                >
                  <Ionicons
                    name="card-outline"
                    size={15}
                    color={
                      COLORS.muted
                    }
                  />

                  <Text
                    style={
                      styles.studentId
                    }
                  >
                    {
                      studentId
                    }
                  </Text>
                </View>
              </View>
            </View>


            {/*
            |--------------------------------------------------------------------------
            | DIVIDER
            |--------------------------------------------------------------------------
            */}

            <View
              style={
                styles.profileDivider
              }
            />


            {/*
            |--------------------------------------------------------------------------
            | COURSE / YEAR SECTION
            |--------------------------------------------------------------------------
            */}

            <View
              style={
                styles.profileDetails
              }
            >
              <ProfileInfo
                icon="school-outline"
                label="Course"
                value={
                  course
                }
              />


              <View
                style={
                  styles.profileInfoDivider
                }
              />


              <ProfileInfo
                icon="book-outline"
                label="Year / Section"
                value={
                  yearSection
                }
              />
            </View>


            {/*
            |--------------------------------------------------------------------------
            | CURRENT STANDING
            |--------------------------------------------------------------------------
            */}

            <View
              style={[
                styles.standingBanner,

                {
                  backgroundColor:
                    currentStatusOption
                      .background,
                },
              ]}
            >
              <View
                style={
                  styles.standingBannerLeft
                }
              >
                <Ionicons
                  name={
                    currentStatusOption
                      .icon
                  }
                  size={19}
                  color={
                    currentStatusOption
                      .color
                  }
                />


                <View
                  style={
                    styles.standingBannerCopy
                  }
                >
                  <Text
                    style={
                      styles.standingBannerLabel
                    }
                  >
                    NSTP Standing
                  </Text>

                  <Text
                    style={[
                      styles.standingBannerValue,

                      {
                        color:
                          currentStatusOption
                            .color,
                      },
                    ]}
                  >
                    {
                      currentStatusOption
                        .title
                    }
                  </Text>
                </View>
              </View>


              <Ionicons
                name="shield-checkmark-outline"
                size={21}
                color={
                  currentStatusOption
                    .color
                }
              />
            </View>
          </View>
        </View>


        {/*
        |--------------------------------------------------------------------------
        | PERMISSION
        |--------------------------------------------------------------------------
        */}

        <View
          style={
            styles.permissionRow
          }
        >
          <View
            style={[
              styles.permissionBadge,

              {
                backgroundColor:
                  canEdit
                    ? COLORS.softGreen
                    : COLORS.softMaroon,
              },
            ]}
          >
            <Ionicons
              name={
                canEdit
                  ? 'shield-checkmark-outline'
                  : 'lock-closed-outline'
              }
              size={16}
              color={
                canEdit
                  ? COLORS.green
                  : COLORS.maroon
              }
            />


            <Text
              style={[
                styles.permissionText,

                {
                  color:
                    canEdit
                      ? COLORS.green
                      : COLORS.maroon,
                },
              ]}
            >
              {
                canEdit
                  ? 'Authorized to edit'
                  : 'View only'
              }
            </Text>
          </View>
        </View>


        {/*
        |--------------------------------------------------------------------------
        | EDITOR
        |--------------------------------------------------------------------------
        */}

        <View
          style={
            styles.body
          }
        >

          {/*
          |--------------------------------------------------------------------------
          | EDITOR HEADER
          |--------------------------------------------------------------------------
          */}

          <View
            style={
              styles.editorHeader
            }
          >
            <View
              style={
                styles.editorIcon
              }
            >
              <Ionicons
                name="options-outline"
                size={21}
                color={
                  COLORS.maroon
                }
              />
            </View>


            <View
              style={
                styles.editorHeaderCopy
              }
            >
              <Text
                style={
                  styles.editorTitle
                }
              >
                Change NSTP standing
              </Text>

              <Text
                style={
                  styles.editorDescription
                }
              >
                Select the official standing that should be saved for this student.
              </Text>
            </View>
          </View>


          {/*
          |--------------------------------------------------------------------------
          | VIEW ONLY WARNING
          |--------------------------------------------------------------------------
          */}

          {
            !canEdit
              ? (
                <View
                  style={
                    styles.warningBox
                  }
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={
                      COLORS.maroon
                    }
                  />

                  <Text
                    style={
                      styles.warningText
                    }
                  >
                    Your account can view this standing but cannot edit it.
                  </Text>
                </View>
              )
              : null
          }


          {/*
          |--------------------------------------------------------------------------
          | STATUS OPTIONS
          |--------------------------------------------------------------------------
          */}

          <View
            style={
              styles.statusList
            }
          >
            {
              STATUS_OPTIONS.map(
                option => {
                  const selected =
                    selectedStatus ===
                    option.value;

                  return (
                    <StatusChoice
                      key={
                        option.value
                      }
                      option={
                        option
                      }
                      selected={
                        selected
                      }
                      disabled={
                        !canEdit ||
                        saving
                      }
                      onPress={() =>
                        selectStatus(
                          option.value
                        )
                      }
                    />
                  );
                }
              )
            }
          </View>


          {/*
          |--------------------------------------------------------------------------
          | STATUS PREVIEW
          |--------------------------------------------------------------------------
          */}

          <View
            style={
              styles.previewCard
            }
          >
            <Text
              style={
                styles.previewLabel
              }
            >
              STATUS CHANGE
            </Text>


            <View
              style={
                styles.previewFlow
              }
            >
              <PreviewStatus
                label="Current"
                option={
                  currentStatusOption
                }
              />


              <View
                style={
                  styles.previewArrow
                }
              >
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={
                    COLORS.mutedLight
                  }
                />
              </View>


              <PreviewStatus
                label="Selected"
                option={
                  selectedOption
                }
              />
            </View>


            <View
              style={
                styles.previewMessageRow
              }
            >
              <Ionicons
                name={
                  statusChanged
                    ? 'checkmark-circle-outline'
                    : 'information-circle-outline'
                }
                size={16}
                color={
                  statusChanged
                    ? COLORS.green
                    : COLORS.muted
                }
              />


              <Text
                style={[
                  styles.previewMessage,

                  statusChanged &&
                    styles.previewMessageChanged,
                ]}
              >
                {
                  statusChanged
                    ? 'The new standing is ready to save.'
                    : 'No changes selected.'
                }
              </Text>
            </View>
          </View>


          {/*
          |--------------------------------------------------------------------------
          | ACTIONS
          |--------------------------------------------------------------------------
          */}

          <View
            style={
              styles.actions
            }
          >
            <TouchableOpacity
              activeOpacity={0.78}
              disabled={
                saving
              }
              onPress={
                cancelEdit
              }
              style={[
                styles.cancelButton,

                saving &&
                  styles.disabledButton,
              ]}
            >
              <Ionicons
                name="close-outline"
                size={18}
                color={
                  COLORS.teal
                }
              />

              <Text
                style={
                  styles.cancelButtonText
                }
              >
                Cancel
              </Text>
            </TouchableOpacity>


            <TouchableOpacity
              activeOpacity={0.82}
              disabled={
                !canEdit ||
                !statusChanged ||
                saving
              }
              onPress={
                saveStatus
              }
              style={[
                styles.saveButton,

                (
                  !canEdit ||
                  !statusChanged ||
                  saving
                ) &&
                  styles.saveButtonDisabled,
              ]}
            >
              {
                saving
                  ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        COLORS.white
                      }
                    />
                  )
                  : (
                    <Ionicons
                      name="save-outline"
                      size={18}
                      color={
                        COLORS.white
                      }
                    />
                  )
              }


              <Text
                style={
                  styles.saveButtonText
                }
              >
                {
                  saving
                    ? 'Saving...'
                    : 'Save standing'
                }
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


/*
|--------------------------------------------------------------------------
| PROFILE INFO
|--------------------------------------------------------------------------
*/

function ProfileInfo({
  icon,
  label,
  value,
}) {
  return (
    <View
      style={
        styles.profileInfo
      }
    >
      <View
        style={
          styles.profileInfoIcon
        }
      >
        <Ionicons
          name={
            icon
          }
          size={18}
          color={
            COLORS.teal
          }
        />
      </View>


      <View
        style={
          styles.profileInfoCopy
        }
      >
        <Text
          style={
            styles.profileInfoLabel
          }
        >
          {label}
        </Text>

        <Text
          numberOfLines={2}
          style={
            styles.profileInfoValue
          }
        >
          {value}
        </Text>
      </View>
    </View>
  );
}


/*
|--------------------------------------------------------------------------
| STATUS CHOICE
|--------------------------------------------------------------------------
*/

function StatusChoice({
  option,
  selected,
  disabled,
  onPress,
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
        styles.statusChoice,

        selected &&
          styles.statusChoiceSelected,

        {
          borderColor:
            selected
              ? option.color
              : COLORS.border,

          backgroundColor:
            selected
              ? option.background
              : COLORS.white,

          opacity:
            disabled
              ? 0.58
              : pressed
                ? 0.78
                : 1,
        },
      ]}
    >
      <View
        style={[
          styles.statusChoiceIcon,

          {
            backgroundColor:
              option.background,
          },
        ]}
      >
        <Ionicons
          name={
            option.icon
          }
          size={22}
          color={
            option.color
          }
        />
      </View>


      <View
        style={
          styles.statusChoiceCopy
        }
      >
        <Text
          style={[
            styles.statusChoiceTitle,

            {
              color:
                option.color,
            },
          ]}
        >
          {
            option.title
          }
        </Text>

        <Text
          style={
            styles.statusChoiceDescription
          }
        >
          {
            option.description
          }
        </Text>
      </View>


      <View
        style={[
          styles.selectionCircle,

          selected && {
            borderColor:
              option.color,

            backgroundColor:
              option.color,
          },
        ]}
      >
        {
          selected
            ? (
              <Ionicons
                name="checkmark"
                size={16}
                color={
                  COLORS.white
                }
              />
            )
            : null
        }
      </View>
    </Pressable>
  );
}


/*
|--------------------------------------------------------------------------
| PREVIEW STATUS
|--------------------------------------------------------------------------
*/

function PreviewStatus({
  label,
  option,
}) {
  return (
    <View
      style={
        styles.previewStatus
      }
    >
      <Text
        style={
          styles.previewStatusLabel
        }
      >
        {label}
      </Text>


      <View
        style={[
          styles.previewStatusBadge,

          {
            backgroundColor:
              option.background,
          },
        ]}
      >
        <Ionicons
          name={
            option.icon
          }
          size={14}
          color={
            option.color
          }
        />


        <Text
          numberOfLines={2}
          style={[
            styles.previewStatusText,

            {
              color:
                option.color,
            },
          ]}
        >
          {
            option.title
          }
        </Text>
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
    | ROOT
    |--------------------------------------------------------------------------
    */

    safeArea: {
      flex: 1,

      backgroundColor:
        COLORS.page,
    },

    scroll: {
      flex: 1,

      backgroundColor:
        COLORS.page,
    },


    /*
    |--------------------------------------------------------------------------
    | APP BAR
    |--------------------------------------------------------------------------
    */

    appBar: {
      minHeight: 68,

      paddingHorizontal: 18,

      flexDirection: 'row',

      alignItems: 'center',

      backgroundColor:
        COLORS.page,
    },

    backButton: {
      width: 43,

      height: 43,

      borderRadius: 14,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        COLORS.white,

      borderWidth: 1,

      borderColor:
        COLORS.border,
    },

    appBarCopy: {
      flex: 1,

      minWidth: 0,

      marginHorizontal: 12,
    },

    appBarTitle: {
      color:
        COLORS.dark,

      fontSize: 17,

      fontWeight: '800',
    },

    appBarSubtitle: {
      marginTop: 2,

      color:
        COLORS.muted,

      fontSize: 11.5,
    },

    headerAction: {
      width: 43,

      height: 43,

      borderRadius: 14,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        COLORS.softMaroon,
    },


    /*
    |--------------------------------------------------------------------------
    | PROFILE SECTION
    |--------------------------------------------------------------------------
    */

    profileSection: {
      paddingHorizontal: 18,

      paddingTop: 7,
    },

    profileCard: {
      position: 'relative',

      overflow: 'hidden',

      padding: 17,

      borderRadius: 25,

      backgroundColor:
        COLORS.white,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      shadowColor:
        COLORS.black,

      shadowOffset: {
        width: 0,
        height: 5,
      },

      shadowOpacity: 0.05,

      shadowRadius: 14,

      elevation: 2,
    },

    profileAccent: {
      position: 'absolute',

      top: 0,

      left: 0,

      bottom: 0,

      width: 5,

      backgroundColor:
        COLORS.maroon,
    },


    /*
    |--------------------------------------------------------------------------
    | PROFILE HEADER
    |--------------------------------------------------------------------------
    */

    profileHeader: {
      flexDirection: 'row',

      alignItems: 'center',
    },


    /*
    |--------------------------------------------------------------------------
    | PHOTO
    |--------------------------------------------------------------------------
    */

    photoContainer: {
      position: 'relative',

      width: 88,

      height: 88,

      marginRight: 15,
    },

    profilePhoto: {
      width: 88,

      height: 88,

      borderRadius: 27,

      backgroundColor:
        COLORS.softTeal,
    },

    profilePhotoFallback: {
      width: 88,

      height: 88,

      borderRadius: 27,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        COLORS.teal,
    },

    profileInitials: {
      color:
        COLORS.white,

      fontSize: 27,

      fontWeight: '900',
    },

    photoStatusBadge: {
      position: 'absolute',

      right: -4,

      bottom: -4,

      width: 31,

      height: 31,

      borderRadius: 11,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        COLORS.maroon,

      borderWidth: 3,

      borderColor:
        COLORS.white,
    },


    /*
    |--------------------------------------------------------------------------
    | PROFILE IDENTITY
    |--------------------------------------------------------------------------
    */

    profileIdentity: {
      flex: 1,

      minWidth: 0,
    },

    componentChip: {
      alignSelf:
        'flex-start',

      minHeight: 27,

      marginBottom: 7,

      paddingHorizontal: 9,

      borderRadius: 8,

      flexDirection: 'row',

      alignItems: 'center',

      backgroundColor:
        COLORS.softMaroon,
    },

    componentChipText: {
      marginLeft: 5,

      color:
        COLORS.maroon,

      fontSize: 10.5,

      fontWeight: '900',
    },

    studentName: {
      color:
        COLORS.dark,

      fontSize: 20,

      lineHeight: 25,

      fontWeight: '900',

      letterSpacing: -0.35,
    },

    studentIdRow: {
      marginTop: 7,

      flexDirection: 'row',

      alignItems: 'center',
    },

    studentId: {
      marginLeft: 6,

      color:
        COLORS.muted,

      fontSize: 12.5,

      fontWeight: '700',
    },


    /*
    |--------------------------------------------------------------------------
    | PROFILE DETAILS
    |--------------------------------------------------------------------------
    */

    profileDivider: {
      height: 1,

      marginVertical: 16,

      backgroundColor:
        COLORS.border,
    },

    profileDetails: {
      flexDirection: 'row',

      alignItems: 'stretch',
    },

    profileInfo: {
      flex: 1,

      flexDirection: 'row',

      alignItems: 'center',
    },

    profileInfoIcon: {
      width: 38,

      height: 38,

      borderRadius: 12,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        COLORS.softTeal,
    },

    profileInfoCopy: {
      flex: 1,

      minWidth: 0,

      marginLeft: 9,
    },

    profileInfoLabel: {
      color:
        COLORS.muted,

      fontSize: 10.5,

      fontWeight: '600',
    },

    profileInfoValue: {
      marginTop: 3,

      color:
        COLORS.dark,

      fontSize: 12,

      lineHeight: 16,

      fontWeight: '800',
    },

    profileInfoDivider: {
      width: 1,

      marginHorizontal: 11,

      backgroundColor:
        COLORS.border,
    },


    /*
    |--------------------------------------------------------------------------
    | STANDING
    |--------------------------------------------------------------------------
    */

    standingBanner: {
      minHeight: 61,

      marginTop: 15,

      paddingHorizontal: 12,

      borderRadius: 15,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',
    },

    standingBannerLeft: {
      flex: 1,

      flexDirection: 'row',

      alignItems: 'center',
    },

    standingBannerCopy: {
      flex: 1,

      marginLeft: 9,
    },

    standingBannerLabel: {
      color:
        COLORS.muted,

      fontSize: 10.5,

      fontWeight: '600',
    },

    standingBannerValue: {
      marginTop: 2,

      fontSize: 13,

      fontWeight: '900',
    },


    /*
    |--------------------------------------------------------------------------
    | PERMISSION
    |--------------------------------------------------------------------------
    */

    permissionRow: {
      paddingHorizontal: 18,

      paddingTop: 12,
    },

    permissionBadge: {
      alignSelf:
        'flex-start',

      minHeight: 36,

      paddingHorizontal: 11,

      borderRadius: 11,

      flexDirection: 'row',

      alignItems: 'center',
    },

    permissionText: {
      marginLeft: 6,

      fontSize: 11,

      fontWeight: '800',
    },


    /*
    |--------------------------------------------------------------------------
    | BODY
    |--------------------------------------------------------------------------
    */

    body: {
      paddingHorizontal: 18,

      paddingTop: 22,
    },


    /*
    |--------------------------------------------------------------------------
    | EDITOR HEADER
    |--------------------------------------------------------------------------
    */

    editorHeader: {
      flexDirection: 'row',

      alignItems: 'center',
    },

    editorIcon: {
      width: 44,

      height: 44,

      marginRight: 11,

      borderRadius: 14,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        COLORS.softMaroon,
    },

    editorHeaderCopy: {
      flex: 1,

      minWidth: 0,
    },

    editorTitle: {
      color:
        COLORS.dark,

      fontSize: 18,

      fontWeight: '900',

      letterSpacing: -0.25,
    },

    editorDescription: {
      marginTop: 3,

      color:
        COLORS.muted,

      fontSize: 12,

      lineHeight: 17,
    },


    /*
    |--------------------------------------------------------------------------
    | WARNING
    |--------------------------------------------------------------------------
    */

    warningBox: {
      marginTop: 14,

      padding: 12,

      borderRadius: 14,

      flexDirection: 'row',

      alignItems: 'center',

      backgroundColor:
        COLORS.softMaroon,
    },

    warningText: {
      flex: 1,

      marginLeft: 8,

      color:
        COLORS.maroon,

      fontSize: 11.5,

      lineHeight: 16,

      fontWeight: '700',
    },


    /*
    |--------------------------------------------------------------------------
    | STATUS OPTIONS
    |--------------------------------------------------------------------------
    */

    statusList: {
      marginTop: 16,

      gap: 10,
    },

    statusChoice: {
      minHeight: 84,

      padding: 13,

      borderRadius: 18,

      borderWidth: 1.5,

      flexDirection: 'row',

      alignItems: 'center',
    },

    statusChoiceSelected: {
      shadowColor:
        COLORS.black,

      shadowOffset: {
        width: 0,
        height: 4,
      },

      shadowOpacity: 0.06,

      shadowRadius: 10,

      elevation: 2,
    },

    statusChoiceIcon: {
      width: 44,

      height: 44,

      marginRight: 11,

      borderRadius: 14,

      alignItems: 'center',

      justifyContent: 'center',
    },

    statusChoiceCopy: {
      flex: 1,

      minWidth: 0,
    },

    statusChoiceTitle: {
      fontSize: 14,

      fontWeight: '900',
    },

    statusChoiceDescription: {
      marginTop: 4,

      color:
        COLORS.muted,

      fontSize: 11,

      lineHeight: 15,
    },

    selectionCircle: {
      width: 27,

      height: 27,

      marginLeft: 10,

      borderRadius: 14,

      borderWidth: 1.5,

      borderColor:
        COLORS.border,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        COLORS.white,
    },


    /*
    |--------------------------------------------------------------------------
    | PREVIEW
    |--------------------------------------------------------------------------
    */

    previewCard: {
      marginTop: 18,

      padding: 14,

      borderRadius: 18,

      backgroundColor:
        COLORS.white,

      borderWidth: 1,

      borderColor:
        COLORS.border,
    },

    previewLabel: {
      color:
        COLORS.muted,

      fontSize: 10,

      fontWeight: '900',

      letterSpacing: 0.7,
    },

    previewFlow: {
      marginTop: 11,

      flexDirection: 'row',

      alignItems: 'center',
    },

    previewStatus: {
      flex: 1,
    },

    previewStatusLabel: {
      marginBottom: 6,

      color:
        COLORS.muted,

      fontSize: 10,

      fontWeight: '600',
    },

    previewStatusBadge: {
      minHeight: 48,

      paddingHorizontal: 9,

      borderRadius: 12,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'center',
    },

    previewStatusText: {
      flexShrink: 1,

      marginLeft: 5,

      fontSize: 10.5,

      lineHeight: 14,

      fontWeight: '900',

      textAlign: 'center',
    },

    previewArrow: {
      width: 34,

      alignItems: 'center',

      justifyContent: 'center',
    },

    previewMessageRow: {
      marginTop: 11,

      paddingTop: 11,

      borderTopWidth: 1,

      borderTopColor:
        COLORS.border,

      flexDirection: 'row',

      alignItems: 'center',
    },

    previewMessage: {
      flex: 1,

      marginLeft: 6,

      color:
        COLORS.muted,

      fontSize: 11,

      lineHeight: 15,
    },

    previewMessageChanged: {
      color:
        COLORS.green,

      fontWeight: '800',
    },


    /*
    |--------------------------------------------------------------------------
    | ACTIONS
    |--------------------------------------------------------------------------
    */

    actions: {
      marginTop: 18,

      flexDirection: 'row',

      gap: 9,
    },

    cancelButton: {
      flex: 1,

      minHeight: 50,

      borderRadius: 15,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        COLORS.white,

      borderWidth: 1,

      borderColor:
        COLORS.border,
    },

    cancelButtonText: {
      marginLeft: 6,

      color:
        COLORS.teal,

      fontSize: 12.5,

      fontWeight: '800',
    },

    saveButton: {
      flex: 1.25,

      minHeight: 50,

      borderRadius: 15,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        COLORS.green,

      shadowColor:
        COLORS.green,

      shadowOffset: {
        width: 0,
        height: 4,
      },

      shadowOpacity: 0.15,

      shadowRadius: 8,

      elevation: 2,
    },

    saveButtonDisabled: {
      opacity: 0.42,

      shadowOpacity: 0,

      elevation: 0,
    },

    saveButtonText: {
      marginLeft: 7,

      color:
        COLORS.white,

      fontSize: 12.5,

      fontWeight: '900',
    },

    disabledButton: {
      opacity: 0.5,
    },

  });