import Ionicons from '@expo/vector-icons/Ionicons';

import {
  router,
  Stack,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';

import {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  getStudentAttendance,
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

  text: '#172126',
  muted: '#716B66',
  mutedLight: '#A29B94',

  border: '#E3DDD4',
  borderStrong: '#D7D0C8',

  softMaroon: '#F5E8E6',
  softGreen: '#EDF2E5',
  softOrange: '#FBECD0',
  softTeal: '#E8EFF0',
  softYellow: '#FFF4D7',
};


/*
|--------------------------------------------------------------------------
| API / MEDIA BASE URL
|--------------------------------------------------------------------------
|
| The API may be configured as either:
|
| http://192.168.x.x:8000
| http://192.168.x.x:8000/api
|
| Student photos are public Laravel storage files, so images must always be
| resolved against the Laravel SERVER ORIGIN, never against /api.
|
*/

const API_BASE_URL =
  process.env.EXPO_PUBLIC_NSTPHUB_SERVER_URL ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  '';


function getLaravelServerOrigin() {
  const raw =
    String(API_BASE_URL ?? '')
      .trim()
      .replace(/\/+$/, '');

  if (!raw) {
    return '';
  }

  try {
    const parsed =
      new URL(raw);

    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return raw
      .replace(/\/api(?:\/.*)?$/i, '')
      .replace(/\/+$/, '');
  }
}


const LARAVEL_SERVER_ORIGIN =
  getLaravelServerOrigin();


function resolvePhotoUrl(value) {
  const photo =
    String(value ?? '')
      .trim();

  if (!photo) {
    return '';
  }

  if (
    photo.startsWith('file://') ||
    photo.startsWith('data:')
  ) {
    return photo;
  }

  /*
  |--------------------------------------------------------------------------
  | Absolute URL
  |--------------------------------------------------------------------------
  |
  | Laravel often generates Storage::url() with APP_URL. During local mobile
  | development APP_URL is commonly localhost, which points to the PHONE when
  | React Native loads it. Rewrite localhost URLs to the same LAN server used
  | by the API.
  |
  */

  if (
    photo.startsWith('http://') ||
    photo.startsWith('https://')
  ) {
    try {
      const parsed =
        new URL(photo);

      const localHosts = [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
      ];

      if (
        LARAVEL_SERVER_ORIGIN &&
        localHosts.includes(
          parsed.hostname.toLowerCase()
        )
      ) {
        return (
          `${LARAVEL_SERVER_ORIGIN}` +
          `${parsed.pathname}` +
          `${parsed.search}`
        );
      }

      return photo;
    } catch {
      return photo;
    }
  }

  if (!LARAVEL_SERVER_ORIGIN) {
    return '';
  }

  let path =
    photo
      .replace(/^\/+/, '')
      .replace(/^public\//i, '')
      .replace(/^app\/public\//i, '');

  if (
    path.startsWith('storage/')
  ) {
    return `${LARAVEL_SERVER_ORIGIN}/${path}`;
  }

  return `${LARAVEL_SERVER_ORIGIN}/storage/${path}`;
}


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
| STATUS
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
      .replace(/_/g, ' ')
      .replace(/-/g, ' ');

  if (
    [
      'WARNING',
      'WARNING FOR DROPOUT',
      'AT RISK',
      'AT RISK FOR DROPOUT',
    ].includes(status)
  ) {
    return 'WARNING FOR DROPOUT';
  }

  if (
    [
      'DROPOUT',
      'DROPPED',
      'DROP OUT',
    ].includes(status)
  ) {
    return 'DROPOUT';
  }

  return 'ACTIVE';
}


/*
|--------------------------------------------------------------------------
| REMARK
|--------------------------------------------------------------------------
*/

function normalizeRemark(
  value
) {
  const remark =
    String(
      value ?? ''
    )
      .trim()
      .toUpperCase()
      .replace(/_/g, ' ')
      .replace(/-/g, ' ');

  if (
    remark === 'PRESENT'
  ) {
    return 'PRESENT';
  }

  if (
    remark === 'LATE'
  ) {
    return 'LATE';
  }

  if (
    remark === 'ABSENT'
  ) {
    return 'ABSENT';
  }

  if (
    [
      'EXCUSE',
      'EXCUSED',
    ].includes(remark)
  ) {
    return 'EXCUSED';
  }

  return 'NOT YET';
}


/*
|--------------------------------------------------------------------------
| DATE
|--------------------------------------------------------------------------
*/

function formatDate(
  value
) {
  if (!value) {
    return '—';
  }

  const raw =
    String(value)
      .trim();

  const match =
    raw.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

  if (match) {
    const date =
      new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
      );

    return date.toLocaleDateString(
      'en-US',
      {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }
    );
  }

  const parsed =
    new Date(raw);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return raw;
  }

  return parsed.toLocaleDateString(
    'en-US',
    {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  );
}


/*
|--------------------------------------------------------------------------
| TIME
|--------------------------------------------------------------------------
*/

function formatTime(
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '—';
  }

  const raw =
    String(value)
      .trim();

  if (
    /\b(AM|PM)\b/i.test(
      raw
    )
  ) {
    return raw.toUpperCase();
  }

  const match =
    raw.match(
      /^(\d{1,2}):(\d{2})(?::\d{2})?$/
    );

  if (!match) {
    return raw;
  }

  let hour =
    Number(
      match[1]
    );

  const minute =
    match[2];

  const suffix =
    hour >= 12
      ? 'PM'
      : 'AM';

  hour =
    hour % 12 || 12;

  return `${hour}:${minute} ${suffix}`;
}


/*
|--------------------------------------------------------------------------
| STANDING META
|--------------------------------------------------------------------------
*/

function getStandingMeta(
  value
) {
  const status =
    normalizeStatus(
      value
    );

  if (
    status ===
    'WARNING FOR DROPOUT'
  ) {
    return {
      label:
        'Warning for Dropout',

      shortLabel:
        'Warning',

      icon:
        'warning-outline',

      color:
        COLORS.orange,

      background:
        COLORS.softOrange,
    };
  }

  if (
    status === 'DROPOUT'
  ) {
    return {
      label:
        'Dropout',

      shortLabel:
        'Dropout',

      icon:
        'close-circle-outline',

      color:
        COLORS.maroon,

      background:
        COLORS.softMaroon,
    };
  }

  return {
    label:
      'Active',

    shortLabel:
      'Active',

    icon:
      'checkmark-circle-outline',

    color:
      COLORS.green,

    background:
      COLORS.softGreen,
  };
}


/*
|--------------------------------------------------------------------------
| REMARK META
|--------------------------------------------------------------------------
*/

function getRemarkMeta(
  value
) {
  const remark =
    normalizeRemark(
      value
    );

  if (
    remark === 'PRESENT'
  ) {
    return {
      label:
        'Present',

      icon:
        'checkmark',

      color:
        COLORS.green,

      background:
        COLORS.softGreen,
    };
  }

  if (
    remark === 'LATE'
  ) {
    return {
      label:
        'Late',

      icon:
        'time-outline',

      color:
        COLORS.orange,

      background:
        COLORS.softOrange,
    };
  }

  if (
    remark === 'ABSENT'
  ) {
    return {
      label:
        'Absent',

      icon:
        'close',

      color:
        COLORS.maroon,

      background:
        COLORS.softMaroon,
    };
  }

  if (
    remark === 'EXCUSED'
  ) {
    return {
      label:
        'Excused',

      icon:
        'document-text-outline',

      color:
        COLORS.teal,

      background:
        COLORS.softTeal,
    };
  }

  return {
    label:
      'Not Yet',

    icon:
      'remove',

    color:
      COLORS.muted,

    background:
      '#EFECE7',
  };
}


/*
|--------------------------------------------------------------------------
| SCREEN
|--------------------------------------------------------------------------
*/

export default function StudentAttendanceScreen() {
  const insets =
    useSafeAreaInsets();

  const params =
    useLocalSearchParams();


  /*
  |--------------------------------------------------------------------------
  | ROUTE DATA
  |--------------------------------------------------------------------------
  */

  const initialStudent =
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

  const initialAttendanceRecords =
    useMemo(
      () => {
        const parsed =
          safeJsonParse(
            params?.attendanceRecords,
            []
          );

        if (
          Array.isArray(
            parsed
          )
        ) {
          return parsed;
        }

        if (
          Array.isArray(
            parsed?.data
          )
        ) {
          return parsed.data;
        }

        return [];
      },
      [
        params?.attendanceRecords,
      ]
    );

  const initialSummary =
    useMemo(
      () =>
        safeJsonParse(
          params?.summary,
          {}
        ),
      [
        params?.summary,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | STATE
  |--------------------------------------------------------------------------
  */

  const [
    student,
    setStudent,
  ] =
    useState(
      initialStudent
    );

  const [
    attendanceRecords,
    setAttendanceRecords,
  ] =
    useState(
      initialAttendanceRecords
    );

  const [
    incomingSummary,
    setIncomingSummary,
  ] =
    useState(
      initialSummary
    );

  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    loadingLiveData,
    setLoadingLiveData,
  ] =
    useState(false);

  const [
    photoFailed,
    setPhotoFailed,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState('');


  /*
  |--------------------------------------------------------------------------
  | STUDENT NAME
  |--------------------------------------------------------------------------
  */

  const studentName =
    useMemo(
      () => {
        const direct =
          String(
            student?.full_name ??
            student?.name ??
            ''
          ).trim();

        if (direct) {
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

        return [
          first,
          middle,
          last,
        ]
          .filter(Boolean)
          .join(' ') ||
          'Student';
      },
      [
        student,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | STUDENT INFO
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

  const course =
    String(
      student?.course ??
      student?.program ??
      student?.degree_program ??
      '—'
    ).trim();

  const year =
    String(
      student?.year_level ??
      student?.year ??
      ''
    ).trim();

  const section =
    String(
      student?.section ??
      ''
    ).trim();

  const yearSection =
    year &&
    section
      ? `${year} • ${section}`
      : year ||
        section ||
        '—';

  const component =
    String(
      student?.component ??
      student?.nstp_component ??
      '—'
    )
      .trim()
      .toUpperCase();

  const status =
    normalizeStatus(
      student?.nstp_status ??
      student?.status ??
      student?.student_status ??
      'ACTIVE'
    );

  const standingMeta =
    getStandingMeta(
      status
    );


  /*
  |--------------------------------------------------------------------------
  | INITIALS
  |--------------------------------------------------------------------------
  */

  const initials =
    useMemo(
      () => {
        const pieces =
          studentName
            .replace(
              ',',
              ' '
            )
            .split(/\s+/)
            .filter(Boolean);

        if (
          pieces.length === 0
        ) {
          return 'ST';
        }

        if (
          pieces.length === 1
        ) {
          return pieces[0]
            .charAt(0)
            .toUpperCase();
        }

        return (
          pieces[0]
            .charAt(0) +
          pieces[
            pieces.length - 1
          ].charAt(0)
        ).toUpperCase();
      },
      [
        studentName,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | PHOTO
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
  | RECORDS
  |--------------------------------------------------------------------------
  */

  const records =
    useMemo(
      () =>
        attendanceRecords.map(
          (
            record,
            index
          ) => ({
            ...record,

            id:
              record?.id ??
              index,

            attendance_date:
              formatDate(
                record?.attendance_date ??
                record?.date
              ),

            time_in:
              formatTime(
                record?.time_in
              ),

            time_out:
              formatTime(
                record?.time_out
              ),

            remark:
              normalizeRemark(
                record?.remark ??
                record?.remarks ??
                record?.attendance_status
              ),
          })
        ),
      [
        attendanceRecords,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | LOCAL SUMMARY
  |--------------------------------------------------------------------------
  */

  const localSummary =
    useMemo(
      () => {
        const result = {
          present: 0,
          late: 0,
          absent: 0,
          excused: 0,
        };

        records.forEach(
          record => {
            if (
              record.remark ===
              'PRESENT'
            ) {
              result.present += 1;
            }

            if (
              record.remark ===
              'LATE'
            ) {
              result.late += 1;
            }

            if (
              record.remark ===
              'ABSENT'
            ) {
              result.absent += 1;
            }

            if (
              record.remark ===
              'EXCUSED'
            ) {
              result.excused += 1;
            }
          }
        );

        return result;
      },
      [
        records,
      ]
    );


  const presentCount =
    incomingSummary?.present !==
    undefined
      ? Number(
          incomingSummary.present
        ) || 0
      : localSummary.present;

  const lateCount =
    incomingSummary?.late !==
    undefined
      ? Number(
          incomingSummary.late
        ) || 0
      : localSummary.late;

  const absentCount =
    incomingSummary?.absent !==
    undefined
      ? Number(
          incomingSummary.absent
        ) || 0
      : localSummary.absent;

  const excusedCount =
    incomingSummary?.excused !==
    undefined
      ? Number(
          incomingSummary.excused
        ) || 0
      : incomingSummary?.excuse !==
        undefined
        ? Number(
            incomingSummary.excuse
          ) || 0
        : localSummary.excused;


  /*
  |--------------------------------------------------------------------------
  | ATTENDANCE RATE
  |--------------------------------------------------------------------------
  */

  const attendedDays =
    presentCount +
    lateCount;

  const totalEvaluated =
    presentCount +
    lateCount +
    absentCount +
    excusedCount;

  const attendanceRate =
    totalEvaluated > 0
      ? Math.round(
          (
            attendedDays /
            totalEvaluated
          ) *
          100
        )
      : 0;


  /*
  |--------------------------------------------------------------------------
  | SEARCH
  |--------------------------------------------------------------------------
  */

  const filteredRecords =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();

        if (!query) {
          return records;
        }

        return records.filter(
          record => {
            const searchable =
              [
                record.attendance_date,
                record.time_in,
                record.time_out,
                record.remark,
              ]
                .join(' ')
                .toLowerCase();

            return searchable.includes(
              query
            );
          }
        );
      },
      [
        search,
        records,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | LOAD LIVE DATA
  |--------------------------------------------------------------------------
  */

  const loadStudentAttendance =
    useCallback(
      async (
        manual = false
      ) => {
        const studentDbId =
          student?.id ||
          initialStudent?.id;

        if (!studentDbId) {
          return;
        }

        try {
          if (manual) {
            setRefreshing(
              true
            );
          } else {
            setLoadingLiveData(
              true
            );
          }

          setError('');

          const result =
            await getStudentAttendance(
              studentDbId
            );

          if (
            result?.student
          ) {
            setStudent(
              result.student
            );

            setPhotoFailed(
              false
            );
          }

          if (
            Array.isArray(
              result?.attendanceRecords
            )
          ) {
            setAttendanceRecords(
              result.attendanceRecords
            );
          } else if (
            Array.isArray(
              result?.attendance_records
            )
          ) {
            setAttendanceRecords(
              result.attendance_records
            );
          }

          if (
            result?.summary
          ) {
            setIncomingSummary(
              result.summary
            );
          }

        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to refresh this student.'
          );

        } finally {
          setRefreshing(
            false
          );

          setLoadingLiveData(
            false
          );
        }
      },
      [
        student?.id,
        initialStudent?.id,
      ]
    );


  useFocusEffect(
    useCallback(
      () => {
        loadStudentAttendance(
          false
        );
      },
      [
        loadStudentAttendance,
      ]
    )
  );


  /*
  |--------------------------------------------------------------------------
  | BACK TO STUDENT LIST
  |--------------------------------------------------------------------------
  |
  | This deliberately does NOT use router.back().
  | It always goes directly to StudentListScreen.js.
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
      | FIXED APP BAR
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
            Attendance details
          </Text>
        </View>


        <TouchableOpacity
          activeOpacity={0.72}
          onPress={() =>
            loadStudentAttendance(
              true
            )
          }
          style={
            styles.refreshButton
          }
        >
          {
            refreshing ||
            loadingLiveData
              ? (
                <ActivityIndicator
                  size="small"
                  color={
                    COLORS.maroon
                  }
                />
              )
              : (
                <Ionicons
                  name="refresh-outline"
                  size={20}
                  color={
                    COLORS.maroon
                  }
                />
              )
          }
        </TouchableOpacity>
      </View>


      <ScrollView
        style={
          styles.scroll
        }
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={() =>
              loadStudentAttendance(
                true
              )
            }
            colors={[
              COLORS.maroon,
            ]}
            tintColor={
              COLORS.maroon
            }
          />
        }
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


            <View
              style={
                styles.profileHeader
              }
            >
              {/*
              |--------------------------------------------------------------------------
              | PROFILE PHOTO
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
                        key={photoUrl}
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
                          {initials}
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
              | PROFILE IDENTITY
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
                    {component}
                  </Text>
                </View>


                <Text
                  numberOfLines={2}
                  style={
                    styles.studentName
                  }
                >
                  {studentName}
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
                    {studentId}
                  </Text>
                </View>
              </View>
            </View>


            {/*
            |--------------------------------------------------------------------------
            | STUDENT DETAILS
            |--------------------------------------------------------------------------
            */}

            <View
              style={
                styles.profileDivider
              }
            />


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
            | STANDING
            |--------------------------------------------------------------------------
            */}

            <View
              style={[
                styles.standingBanner,

                {
                  backgroundColor:
                    standingMeta.background,
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
                    standingMeta.icon
                  }
                  size={19}
                  color={
                    standingMeta.color
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
                          standingMeta.color,
                      },
                    ]}
                  >
                    {
                      standingMeta.label
                    }
                  </Text>
                </View>
              </View>

              <Ionicons
                name="shield-checkmark-outline"
                size={21}
                color={
                  standingMeta.color
                }
              />
            </View>
          </View>
        </View>


        {/*
        |--------------------------------------------------------------------------
        | ATTENDANCE HEALTH
        |--------------------------------------------------------------------------
        */}

        <View
          style={
            styles.body
          }
        >

          <View
            style={
              styles.sectionHeading
            }
          >
            <View>
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Attendance overview
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Current attendance performance
              </Text>
            </View>

            <View
              style={
                styles.recordCountBadge
              }
            >
              <Text
                style={
                  styles.recordCountValue
                }
              >
                {records.length}
              </Text>

              <Text
                style={
                  styles.recordCountLabel
                }
              >
                days
              </Text>
            </View>
          </View>


          {/*
          |--------------------------------------------------------------------------
          | RATE
          |--------------------------------------------------------------------------
          */}

          <View
            style={
              styles.rateCard
            }
          >
            <View
              style={
                styles.rateTop
              }
            >
              <View>
                <Text
                  style={
                    styles.rateLabel
                  }
                >
                  ATTENDANCE RATE
                </Text>

                <View
                  style={
                    styles.rateNumberRow
                  }
                >
                  <Text
                    style={
                      styles.rateNumber
                    }
                  >
                    {
                      attendanceRate
                    }
                  </Text>

                  <Text
                    style={
                      styles.ratePercent
                    }
                  >
                    %
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.rateIcon
                }
              >
                <Ionicons
                  name="analytics-outline"
                  size={26}
                  color={
                    COLORS.green
                  }
                />
              </View>
            </View>


            <View
              style={
                styles.progressTrack
              }
            >
              <View
                style={[
                  styles.progressFill,

                  {
                    width:
                      `${Math.min(
                        100,
                        Math.max(
                          0,
                          attendanceRate
                        )
                      )}%`,
                  },
                ]}
              />
            </View>
          </View>


          {/*
          |--------------------------------------------------------------------------
          | METRICS
          |--------------------------------------------------------------------------
          */}

          <View
            style={
              styles.metricGrid
            }
          >
            <AttendanceMetric
              label="Present"
              value={
                presentCount
              }
              icon="checkmark-circle-outline"
              color={
                COLORS.green
              }
              background={
                COLORS.softGreen
              }
            />

            <AttendanceMetric
              label="Late"
              value={
                lateCount
              }
              icon="time-outline"
              color={
                COLORS.orange
              }
              background={
                COLORS.softOrange
              }
            />

            <AttendanceMetric
              label="Excused"
              value={
                excusedCount
              }
              icon="document-text-outline"
              color={
                COLORS.teal
              }
              background={
                COLORS.softTeal
              }
            />

            <AttendanceMetric
              label="Absent"
              value={
                absentCount
              }
              icon="close-circle-outline"
              color={
                COLORS.maroon
              }
              background={
                COLORS.softMaroon
              }
            />
          </View>


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
                    styles.errorCard
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
                    {error}
                  </Text>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() =>
                      loadStudentAttendance(
                        true
                      )
                    }
                  >
                    <Ionicons
                      name="refresh-outline"
                      size={19}
                      color={
                        COLORS.maroon
                      }
                    />
                  </TouchableOpacity>
                </View>
              )
              : null
          }


          {/*
          |--------------------------------------------------------------------------
          | HISTORY HEADER
          |--------------------------------------------------------------------------
          */}

          <View
            style={
              styles.historyHeader
            }
          >
            <View>
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Attendance history
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Daily time-in and time-out records
              </Text>
            </View>
          </View>


          {/*
          |--------------------------------------------------------------------------
          | SEARCH
          |--------------------------------------------------------------------------
          */}

          <View
            style={
              styles.searchBox
            }
          >
            <Ionicons
              name="search-outline"
              size={20}
              color={
                COLORS.muted
              }
            />

            <TextInput
              value={
                search
              }
              onChangeText={
                setSearch
              }
              placeholder="Search attendance history"
              placeholderTextColor={
                COLORS.mutedLight
              }
              selectionColor={
                COLORS.maroon
              }
              style={
                styles.searchInput
              }
            />

            {
              search
                ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() =>
                      setSearch('')
                    }
                    style={
                      styles.searchClear
                    }
                  >
                    <Ionicons
                      name="close-circle"
                      size={19}
                      color={
                        COLORS.mutedLight
                      }
                    />
                  </TouchableOpacity>
                )
                : null
            }
          </View>


          {/*
          |--------------------------------------------------------------------------
          | RECORDS
          |--------------------------------------------------------------------------
          */}

          <View
            style={
              styles.historyList
            }
          >
            {
              filteredRecords.length > 0
                ? (
                  filteredRecords.map(
                    (
                      record,
                      index
                    ) => (
                      <AttendanceRecord
                        key={
                          String(
                            record.id ??
                            index
                          )
                        }
                        record={
                          record
                        }
                        isLast={
                          index ===
                          filteredRecords.length - 1
                        }
                      />
                    )
                  )
                )
                : (
                  <View
                    style={
                      styles.emptyState
                    }
                  >
                    <View
                      style={
                        styles.emptyIcon
                      }
                    >
                      <Ionicons
                        name={
                          search
                            ? 'search-outline'
                            : 'calendar-outline'
                        }
                        size={27}
                        color={
                          COLORS.maroon
                        }
                      />
                    </View>

                    <Text
                      style={
                        styles.emptyTitle
                      }
                    >
                      {
                        search
                          ? 'No matching records'
                          : 'No attendance records'
                      }
                    </Text>

                    <Text
                      style={
                        styles.emptyText
                      }
                    >
                      {
                        search
                          ? 'Try another date, time, or attendance status.'
                          : 'Attendance records for this student will appear here.'
                      }
                    </Text>

                    {
                      search
                        ? (
                          <TouchableOpacity
                            activeOpacity={0.75}
                            onPress={() =>
                              setSearch('')
                            }
                            style={
                              styles.emptyButton
                            }
                          >
                            <Text
                              style={
                                styles.emptyButtonText
                              }
                            >
                              Clear search
                            </Text>
                          </TouchableOpacity>
                        )
                        : null
                    }
                  </View>
                )
            }
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
| ATTENDANCE METRIC
|--------------------------------------------------------------------------
*/

function AttendanceMetric({
  label,
  value,
  icon,
  color,
  background,
}) {
  return (
    <View
      style={
        styles.metricCard
      }
    >
      <View
        style={[
          styles.metricIcon,

          {
            backgroundColor:
              background,
          },
        ]}
      >
        <Ionicons
          name={
            icon
          }
          size={19}
          color={
            color
          }
        />
      </View>

      <View
        style={
          styles.metricCopy
        }
      >
        <Text
          style={[
            styles.metricValue,
            {
              color,
            },
          ]}
        >
          {value}
        </Text>

        <Text
          style={
            styles.metricLabel
          }
        >
          {label}
        </Text>
      </View>
    </View>
  );
}


/*
|--------------------------------------------------------------------------
| ATTENDANCE RECORD
|--------------------------------------------------------------------------
*/

function AttendanceRecord({
  record,
  isLast,
}) {
  const remark =
    getRemarkMeta(
      record.remark
    );

  return (
    <View
      style={[
        styles.historyItem,

        !isLast &&
          styles.historyItemBorder,
      ]}
    >

      {/*
      |--------------------------------------------------------------------------
      | DATE
      |--------------------------------------------------------------------------
      */}

      <View
        style={
          styles.historyItemTop
        }
      >
        <View
          style={
            styles.historyDateArea
          }
        >
          <View
            style={[
              styles.historyStatusMark,

              {
                backgroundColor:
                  remark.color,
              },
            ]}
          />

          <View
            style={
              styles.historyDateCopy
            }
          >
            <Text
              style={
                styles.historyDate
              }
            >
              {
                record.attendance_date
              }
            </Text>

            <Text
              style={
                styles.historyDateCaption
              }
            >
              Attendance record
            </Text>
          </View>
        </View>


        <View
          style={[
            styles.remarkBadge,

            {
              backgroundColor:
                remark.background,
            },
          ]}
        >
          <Ionicons
            name={
              remark.icon
            }
            size={13}
            color={
              remark.color
            }
          />

          <Text
            style={[
              styles.remarkText,

              {
                color:
                  remark.color,
              },
            ]}
          >
            {
              remark.label
            }
          </Text>
        </View>
      </View>


      {/*
      |--------------------------------------------------------------------------
      | TIME
      |--------------------------------------------------------------------------
      */}

      <View
        style={
          styles.timeRow
        }
      >
        <TimeValue
          icon="log-in-outline"
          label="Time in"
          value={
            record.time_in
          }
          color={
            COLORS.green
          }
          background={
            COLORS.softGreen
          }
        />


        <View
          style={
            styles.timeArrow
          }
        >
          <Ionicons
            name="arrow-forward"
            size={17}
            color={
              COLORS.mutedLight
            }
          />
        </View>


        <TimeValue
          icon="log-out-outline"
          label="Time out"
          value={
            record.time_out
          }
          color={
            COLORS.teal
          }
          background={
            COLORS.softTeal
          }
        />
      </View>
    </View>
  );
}


/*
|--------------------------------------------------------------------------
| TIME VALUE
|--------------------------------------------------------------------------
*/

function TimeValue({
  icon,
  label,
  value,
  color,
  background,
}) {
  return (
    <View
      style={
        styles.timeValueContainer
      }
    >
      <View
        style={[
          styles.timeIcon,

          {
            backgroundColor:
              background,
          },
        ]}
      >
        <Ionicons
          name={
            icon
          }
          size={17}
          color={
            color
          }
        />
      </View>

      <View
        style={
          styles.timeCopy
        }
      >
        <Text
          style={
            styles.timeLabel
          }
        >
          {label}
        </Text>

        <Text
          style={
            styles.timeText
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

    body: {
      paddingHorizontal: 18,
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

    refreshButton: {
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
    | PROFILE
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

    profileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },

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

    profileIdentity: {
      flex: 1,
      minWidth: 0,
    },

    componentChip: {
      alignSelf: 'flex-start',
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

    standingBanner: {
      minHeight: 61,
      marginTop: 15,
      paddingHorizontal: 12,
      borderRadius: 15,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
    | SECTIONS
    |--------------------------------------------------------------------------
    */

    sectionHeading: {
      marginTop: 26,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    sectionTitle: {
      color:
        COLORS.dark,
      fontSize: 19,
      fontWeight: '900',
      letterSpacing: -0.3,
    },

    sectionSubtitle: {
      marginTop: 3,
      color:
        COLORS.muted,
      fontSize: 12,
      lineHeight: 17,
    },

    recordCountBadge: {
      minWidth: 48,
      minHeight: 48,
      paddingHorizontal: 9,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.softTeal,
    },

    recordCountValue: {
      color:
        COLORS.teal,
      fontSize: 17,
      lineHeight: 19,
      fontWeight: '900',
    },

    recordCountLabel: {
      marginTop: 1,
      color:
        COLORS.muted,
      fontSize: 9,
      fontWeight: '600',
    },


    /*
    |--------------------------------------------------------------------------
    | RATE
    |--------------------------------------------------------------------------
    */

    rateCard: {
      padding: 16,
      borderRadius: 21,
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    rateTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    rateLabel: {
      color:
        COLORS.muted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
    },

    rateNumberRow: {
      marginTop: 3,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },

    rateNumber: {
      color:
        COLORS.green,
      fontSize: 38,
      lineHeight: 43,
      fontWeight: '900',
      letterSpacing: -1.2,
    },

    ratePercent: {
      marginTop: 3,
      marginLeft: 2,
      color:
        COLORS.green,
      fontSize: 16,
      fontWeight: '900',
    },

    rateIcon: {
      width: 54,
      height: 54,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.softGreen,
    },

    progressTrack: {
      height: 7,
      marginTop: 15,
      overflow: 'hidden',
      borderRadius: 99,
      backgroundColor:
        COLORS.softGreen,
    },

    progressFill: {
      height: '100%',
      borderRadius: 99,
      backgroundColor:
        COLORS.green,
    },


    /*
    |--------------------------------------------------------------------------
    | METRICS
    |--------------------------------------------------------------------------
    */

    metricGrid: {
      marginTop: 10,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },

    metricCard: {
      width: '48.5%',
      minHeight: 76,
      marginBottom: 10,
      paddingHorizontal: 12,
      borderRadius: 17,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    metricIcon: {
      width: 39,
      height: 39,
      marginRight: 10,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },

    metricCopy: {
      flex: 1,
    },

    metricValue: {
      fontSize: 19,
      lineHeight: 22,
      fontWeight: '900',
    },

    metricLabel: {
      marginTop: 2,
      color:
        COLORS.muted,
      fontSize: 11,
      fontWeight: '600',
    },


    /*
    |--------------------------------------------------------------------------
    | ERROR
    |--------------------------------------------------------------------------
    */

    errorCard: {
      minHeight: 58,
      marginTop: 4,
      paddingHorizontal: 12,
      borderRadius: 15,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        COLORS.softMaroon,
    },

    errorText: {
      flex: 1,
      marginHorizontal: 9,
      color:
        COLORS.maroon,
      fontSize: 11.5,
      lineHeight: 16,
    },


    /*
    |--------------------------------------------------------------------------
    | HISTORY
    |--------------------------------------------------------------------------
    */

    historyHeader: {
      marginTop: 24,
    },

    searchBox: {
      height: 53,
      marginTop: 13,
      paddingHorizontal: 14,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    searchInput: {
      flex: 1,
      height: '100%',
      marginLeft: 9,
      color:
        COLORS.dark,
      fontSize: 13.5,
    },

    searchClear: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
    },

    historyList: {
      marginTop: 14,
      overflow: 'hidden',
      borderRadius: 21,
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    historyItem: {
      padding: 15,
    },

    historyItemBorder: {
      borderBottomWidth: 1,
      borderBottomColor:
        COLORS.border,
    },

    historyItemTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    historyDateArea: {
      flex: 1,
      minWidth: 0,
      marginRight: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },

    historyStatusMark: {
      width: 8,
      height: 35,
      marginRight: 10,
      borderRadius: 4,
    },

    historyDateCopy: {
      flex: 1,
      minWidth: 0,
    },

    historyDate: {
      color:
        COLORS.dark,
      fontSize: 13.5,
      fontWeight: '800',
    },

    historyDateCaption: {
      marginTop: 2,
      color:
        COLORS.muted,
      fontSize: 10.5,
    },

    remarkBadge: {
      minHeight: 30,
      paddingHorizontal: 9,
      borderRadius: 9,
      flexDirection: 'row',
      alignItems: 'center',
    },

    remarkText: {
      marginLeft: 4,
      fontSize: 10.5,
      fontWeight: '800',
    },


    /*
    |--------------------------------------------------------------------------
    | TIME
    |--------------------------------------------------------------------------
    */

    timeRow: {
      minHeight: 63,
      marginTop: 12,
      paddingHorizontal: 10,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        COLORS.surfaceSoft,
    },

    timeValueContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },

    timeIcon: {
      width: 36,
      height: 36,
      marginRight: 8,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },

    timeCopy: {
      flex: 1,
      minWidth: 0,
    },

    timeLabel: {
      color:
        COLORS.muted,
      fontSize: 10,
      fontWeight: '600',
    },

    timeText: {
      marginTop: 3,
      color:
        COLORS.dark,
      fontSize: 12,
      fontWeight: '800',
    },

    timeArrow: {
      width: 30,
      alignItems: 'center',
      justifyContent: 'center',
    },


    /*
    |--------------------------------------------------------------------------
    | EMPTY
    |--------------------------------------------------------------------------
    */

    emptyState: {
      minHeight: 250,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },

    emptyIcon: {
      width: 58,
      height: 58,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.softMaroon,
    },

    emptyTitle: {
      marginTop: 13,
      color:
        COLORS.dark,
      fontSize: 16,
      fontWeight: '800',
    },

    emptyText: {
      maxWidth: 250,
      marginTop: 5,
      color:
        COLORS.muted,
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'center',
    },

    emptyButton: {
      minHeight: 40,
      marginTop: 14,
      paddingHorizontal: 15,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.maroon,
    },

    emptyButtonText: {
      color:
        COLORS.white,
      fontSize: 12,
      fontWeight: '800',
    },

  });