import Ionicons from '@expo/vector-icons/Ionicons';

import {
  router,
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
  Pressable,
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
  getAdminDashboard,
  getAttendance,
} from '../../services/api';


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

  page: '#F4F1EA',
  surface: '#FFFFFF',
  surfaceSoft: '#F9F7F2',

  muted: '#736E69',
  mutedLight: '#A8A19B',

  border: '#E4DED6',

  softMaroon: '#F6E9E7',
  softGreen: '#EDF2E5',
  softOrange: '#FCEFD5',
  softTeal: '#E8EEF0',
  softYellow: '#FFF5DB',
};


/*
|--------------------------------------------------------------------------
| FILTER OPTIONS
|--------------------------------------------------------------------------
*/

const REMARK_FILTERS = [
  'ALL',
  'PRESENT',
  'LATE',
  'ABSENT',
  'EXCUSED',
  'NOT YET',
];

const STANDING_FILTERS = [
  'ALL',
  'ACTIVE',
  'WARNING FOR DROPOUT',
  'DROPOUT',
];


/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function normalizeComponent(value) {
  return String(
    value ?? ''
  )
    .trim()
    .toUpperCase();
}


function normalizeRemark(value) {
  const remark =
    String(
      value ?? ''
    )
      .trim()
      .toUpperCase()
      .replace(/_/g, ' ')
      .replace(/-/g, ' ');

  if (
    [
      'PRESENT',
      'LATE',
      'ABSENT',
      'EXCUSED',
    ].includes(remark)
  ) {
    return remark;
  }

  if (
    remark === 'EXCUSE'
  ) {
    return 'EXCUSED';
  }

  return 'NOT YET';
}


function normalizeStanding(value) {
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
      'AT RISK',
      'AT RISK FOR DROPOUT',
      'WARNING FOR DROPOUT',
    ].includes(status)
  ) {
    return 'WARNING FOR DROPOUT';
  }

  if (
    [
      'DROPPED',
      'DROP OUT',
      'DROPOUT',
    ].includes(status)
  ) {
    return 'DROPOUT';
  }

  return 'ACTIVE';
}


function normalizeEditRole(value) {
  const role =
    String(
      value ?? ''
    )
      .trim()
      .toLowerCase()
      .replace(/_/g, '-')
      .replace(/\s+/g, '-');

  if (
    [
      'universityadministrator',
      'university-administrator',
      'university-admin',
      'administrator',
      'admin',
    ].includes(role)
  ) {
    return 'university-admin';
  }

  if (
    role === 'instructor' ||
    role.includes('instructor')
  ) {
    return 'instructor';
  }

  if (
    [
      'coordinator-attendance',
      'attendance-coordinator',
    ].includes(role)
  ) {
    return 'coordinator-attendance';
  }

  return role;
}


function buildStudentName(record) {
  const existing =
    String(
      record?.full_name ??
      record?.student?.full_name ??
      record?.student?.name ??
      record?.name ??
      ''
    ).trim();

  if (existing) {
    return existing;
  }

  const student =
    record?.student ??
    record ??
    {};

  const surname =
    String(
      student?.surname ??
      student?.last_name ??
      ''
    ).trim();

  const firstName =
    String(
      student?.first_name ??
      ''
    ).trim();

  const middleName =
    String(
      student?.middle_name ??
      ''
    ).trim();

  const middleInitial =
    middleName
      ? `${middleName.charAt(0).toUpperCase()}.`
      : '';

  if (
    surname &&
    firstName
  ) {
    return [
      `${surname},`,
      firstName,
      middleInitial,
    ]
      .filter(Boolean)
      .join(' ');
  }

  return [
    firstName,
    middleInitial,
    surname,
  ]
    .filter(Boolean)
    .join(' ') ||
    'Student';
}


function formatTime(value) {
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
    /\b(AM|PM)\b/i.test(raw)
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


function formatDate(value) {
  if (!value) {
    return 'Today';
  }

  const match =
    String(value)
      .match(
        /^(\d{4})-(\d{2})-(\d{2})/
      );

  if (!match) {
    return value;
  }

  const date =
    new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    );

  return date.toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  );
}


function extractAttendance(result) {
  const options = [
    result?.attendances,
    result?.attendance,
    result?.attendance_records,
    result?.attendanceRecords,
    result?.students,
    result?.data?.attendances,
    result?.data?.attendance_records,
    result?.data?.students,
  ];

  for (
    const option
    of options
  ) {
    if (
      Array.isArray(option)
    ) {
      return option;
    }

    if (
      Array.isArray(
        option?.data
      )
    ) {
      return option.data;
    }
  }

  return [];
}


function normalizeAttendanceRow(
  record,
  index,
  fallbackComponent
) {
  const student =
    record?.student ??
    record ??
    {};

  return {
    ...record,

    id:
      record?.id ??
      index,

    student_db_id:
      record?.user_id ??
      record?.student_id ??
      student?.id ??
      null,

    id_number:
      String(
        record?.id_number ??
        record?.student_id_number ??
        student?.student_id_number ??
        student?.id_number ??
        student?.student_id ??
        student?.school_id ??
        '—'
      ).trim(),

    full_name:
      buildStudentName(
        record
      ),

    course:
      String(
        record?.course ??
        student?.course ??
        student?.program ??
        student?.degree_program ??
        '—'
      ).trim(),

    component:
      normalizeComponent(
        record?.component ??
        student?.component ??
        student?.nstp_component ??
        fallbackComponent
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

    status:
      normalizeStanding(
        record?.nstp_status ??
        student?.nstp_status ??
        student?.status ??
        record?.student_status ??
        'ACTIVE'
      ),

    profile_photo:
      record?.profile_photo ??
      student?.profile_photo ??
      student?.photo ??
      '',

    profile_photo_url:
      record?.profile_photo_url ??
      student?.profile_photo_url ??
      student?.photo_url ??
      student?.avatar ??
      '',
  };
}


function buildStudentPayload(row) {
  const student =
    row?.student ??
    {};

  return {
    ...student,

    id:
      row?.student_db_id ??
      student?.id ??
      row?.user_id ??
      row?.student_id ??
      null,

    student_id_number:
      student?.student_id_number ??
      student?.id_number ??
      row?.id_number ??
      '',

    id_number:
      student?.id_number ??
      student?.student_id_number ??
      row?.id_number ??
      '',

    first_name:
      student?.first_name ??
      row?.first_name ??
      '',

    middle_name:
      student?.middle_name ??
      row?.middle_name ??
      '',

    last_name:
      student?.last_name ??
      row?.last_name ??
      '',

    surname:
      student?.surname ??
      student?.last_name ??
      row?.surname ??
      row?.last_name ??
      '',

    full_name:
      student?.full_name ??
      student?.name ??
      row?.full_name ??
      '',

    name:
      student?.name ??
      student?.full_name ??
      row?.full_name ??
      '',

    course:
      student?.course ??
      student?.program ??
      row?.course ??
      '',

    program:
      student?.program ??
      student?.course ??
      row?.course ??
      '',

    degree_program:
      student?.degree_program ??
      row?.course ??
      '',

    year_level:
      student?.year_level ??
      student?.year ??
      row?.year_level ??
      '',

    year:
      student?.year ??
      student?.year_level ??
      row?.year ??
      '',

    section:
      student?.section ??
      row?.section ??
      '',

    component:
      student?.component ??
      student?.nstp_component ??
      row?.component ??
      '',

    nstp_component:
      student?.nstp_component ??
      student?.component ??
      row?.component ??
      '',

    nstp_status:
      normalizeStanding(
        student?.nstp_status ??
        student?.status ??
        row?.status
      ),

    status:
      normalizeStanding(
        student?.nstp_status ??
        student?.status ??
        row?.status
      ),

    profile_photo:
      student?.profile_photo ??
      student?.photo ??
      row?.profile_photo ??
      '',

    profile_photo_url:
      student?.profile_photo_url ??
      student?.photo_url ??
      student?.avatar ??
      row?.profile_photo_url ??
      '',

    photo_url:
      student?.photo_url ??
      student?.profile_photo_url ??
      row?.profile_photo_url ??
      '',
  };
}


function getStudentAttendanceHistory(
  row,
  selectedDate = ''
) {
  const options = [
    row?.attendance_records,
    row?.attendanceRecords,
    row?.attendance_history,
    row?.attendanceHistory,
    row?.history,
    row?.student?.attendance_records,
    row?.student?.attendanceRecords,
    row?.student?.attendance_history,
    row?.student?.attendanceHistory,
  ];

  for (
    const records
    of options
  ) {
    if (
      Array.isArray(records)
    ) {
      return records;
    }

    if (
      Array.isArray(
        records?.data
      )
    ) {
      return records.data;
    }
  }

  return [
    {
      id:
        row?.id,

      attendance_date:
        row?.attendance_date ??
        row?.date ??
        selectedDate ??
        '',

      date:
        row?.attendance_date ??
        row?.date ??
        selectedDate ??
        '',

      time_in:
        row?.time_in ??
        null,

      time_out:
        row?.time_out ??
        null,

      remark:
        row?.remark ??
        'NOT YET',
    },
  ];
}


function buildAttendanceSummary(records) {
  const summary = {
    present: 0,
    late: 0,
    absent: 0,
    excused: 0,
  };

  records.forEach(
    record => {
      const remark =
        normalizeRemark(
          record?.remark ??
          record?.remarks ??
          record?.attendance_status
        );

      if (
        remark === 'PRESENT'
      ) {
        summary.present += 1;
      }

      if (
        remark === 'LATE'
      ) {
        summary.late += 1;
      }

      if (
        remark === 'ABSENT'
      ) {
        summary.absent += 1;
      }

      if (
        remark === 'EXCUSED'
      ) {
        summary.excused += 1;
      }
    }
  );

  return summary;
}


function getRemarkMeta(value) {
  const remark =
    normalizeRemark(
      value
    );

  if (
    remark === 'PRESENT'
  ) {
    return {
      label: 'Present',
      icon: 'checkmark',
      color: COLORS.green,
      background: COLORS.softGreen,
    };
  }

  if (
    remark === 'LATE'
  ) {
    return {
      label: 'Late',
      icon: 'time-outline',
      color: COLORS.orange,
      background: COLORS.softOrange,
    };
  }

  if (
    remark === 'ABSENT'
  ) {
    return {
      label: 'Absent',
      icon: 'close',
      color: COLORS.maroon,
      background: COLORS.softMaroon,
    };
  }

  if (
    remark === 'EXCUSED'
  ) {
    return {
      label: 'Excused',
      icon: 'document-text-outline',
      color: COLORS.teal,
      background: COLORS.softTeal,
    };
  }

  return {
    label: 'Not yet',
    icon: 'remove',
    color: COLORS.muted,
    background: '#EFEDE9',
  };
}


function getStandingMeta(value) {
  const standing =
    normalizeStanding(
      value
    );

  if (
    standing ===
    'WARNING FOR DROPOUT'
  ) {
    return {
      label: 'Warning',
      icon: 'warning-outline',
      color: COLORS.orange,
    };
  }

  if (
    standing ===
    'DROPOUT'
  ) {
    return {
      label: 'Dropout',
      icon: 'close-circle-outline',
      color: COLORS.maroon,
    };
  }

  return {
    label: 'Active',
    icon: 'checkmark-circle-outline',
    color: COLORS.green,
  };
}


/*
|--------------------------------------------------------------------------
| MAIN SCREEN
|--------------------------------------------------------------------------
*/

export default function StudentListScreen() {
  const insets =
    useSafeAreaInsets();

  const params =
    useLocalSearchParams();

  const requestedDate =
    String(
      params?.date ??
      ''
    );

  const requestedComponent =
    normalizeComponent(
      params?.component
    );


  /*
  |--------------------------------------------------------------------------
  | STATE
  |--------------------------------------------------------------------------
  */

  const [
    dashboard,
    setDashboard,
  ] =
    useState(null);

  const [
    selectedComponent,
    setSelectedComponent,
  ] =
    useState(
      requestedComponent
    );

  const [
    attendance,
    setAttendance,
  ] =
    useState([]);

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
    switching,
    setSwitching,
  ] =
    useState('');

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    remarkFilter,
    setRemarkFilter,
  ] =
    useState('ALL');

  const [
    standingFilter,
    setStandingFilter,
  ] =
    useState('ALL');


  /*
  |--------------------------------------------------------------------------
  | LOAD
  |--------------------------------------------------------------------------
  */

  const loadStudentAttendance =
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

          const dashboardResult =
            await getAdminDashboard();

          const allowed =
            Array.isArray(
              dashboardResult
                ?.component_context
                ?.options
            )
              ? dashboardResult
                  .component_context
                  .options
                  .map(
                    normalizeComponent
                  )
                  .filter(Boolean)
              : [];

          const dashboardDefault =
            normalizeComponent(
              dashboardResult
                ?.component_context
                ?.selected
            );

          const requestedAllowed =
            requestedComponent &&
            allowed.includes(
              requestedComponent
            );

          const selectedAllowed =
            selectedComponent &&
            allowed.includes(
              selectedComponent
            );

          const resolved =
            selectedAllowed
              ? selectedComponent
              : requestedAllowed
                ? requestedComponent
                : dashboardDefault ||
                  allowed[0] ||
                  '';

          if (!resolved) {
            throw new Error(
              'Your account is not assigned to an NSTP component.'
            );
          }

          const attendanceResult =
            await getAttendance({
              date:
                requestedDate ||
                undefined,

              component:
                resolved,
            });

          setDashboard(
            dashboardResult
          );

          setSelectedComponent(
            resolved
          );

          setAttendance(
            extractAttendance(
              attendanceResult
            )
          );

          setError('');

        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : 'Unable to load attendance records.';

          setError(
            message
          );

          const normalized =
            String(message)
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
      [
        requestedDate,
        requestedComponent,
        selectedComponent,
      ]
    );


  useFocusEffect(
    useCallback(
      () => {
        loadStudentAttendance();
      },
      [
        loadStudentAttendance,
      ]
    )
  );


  /*
  |--------------------------------------------------------------------------
  | COMPONENTS
  |--------------------------------------------------------------------------
  */

  const componentOptions =
    useMemo(
      () => {
        const options =
          dashboard
            ?.component_context
            ?.options;

        if (
          !Array.isArray(
            options
          )
        ) {
          return [];
        }

        return options
          .map(
            normalizeComponent
          )
          .filter(Boolean);
      },
      [
        dashboard,
      ]
    );


  const component =
    selectedComponent ||
    requestedComponent ||
    normalizeComponent(
      dashboard
        ?.component_context
        ?.selected
    ) ||
    componentOptions[0] ||
    '';


  const switchComponent =
    async value => {
      const next =
        normalizeComponent(
          value
        );

      if (
        !next ||
        next === component ||
        !componentOptions.includes(
          next
        )
      ) {
        return;
      }

      try {
        setSwitching(
          next
        );

        setError('');

        const result =
          await getAttendance({
            date:
              requestedDate ||
              undefined,

            component:
              next,
          });

        setSelectedComponent(
          next
        );

        setAttendance(
          extractAttendance(
            result
          )
        );

        setSearch('');
        setRemarkFilter('ALL');
        setStandingFilter('ALL');

      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to switch component.'
        );

      } finally {
        setSwitching('');
      }
    };


  /*
  |--------------------------------------------------------------------------
  | ROLE
  |--------------------------------------------------------------------------
  */

  const editRole =
    normalizeEditRole(
      dashboard?.role ??
      dashboard?.auth_role ??
      dashboard?.account?.role ??
      ''
    );


  /*
  |--------------------------------------------------------------------------
  | NORMALIZED DATA
  |--------------------------------------------------------------------------
  */

  const rows =
    useMemo(
      () =>
        attendance.map(
          (
            record,
            index
          ) =>
            normalizeAttendanceRow(
              record,
              index,
              component
            )
        ),
      [
        attendance,
        component,
      ]
    );


  const filteredRows =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();

        return rows.filter(
          row => {
            if (
              component &&
              row.component &&
              row.component !==
                component
            ) {
              return false;
            }

            if (
              remarkFilter !==
                'ALL' &&
              row.remark !==
                remarkFilter
            ) {
              return false;
            }

            if (
              standingFilter !==
                'ALL' &&
              row.status !==
                standingFilter
            ) {
              return false;
            }

            if (!query) {
              return true;
            }

            const text =
              [
                row.id_number,
                row.full_name,
                row.course,
                row.component,
                row.remark,
                row.status,
              ]
                .join(' ')
                .toLowerCase();

            return text.includes(
              query
            );
          }
        );
      },
      [
        rows,
        component,
        remarkFilter,
        standingFilter,
        search,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | COUNTS
  |--------------------------------------------------------------------------
  */

  const counts =
    useMemo(
      () => ({
        all:
          rows.length,

        present:
          rows.filter(
            item =>
              item.remark ===
              'PRESENT'
          ).length,

        late:
          rows.filter(
            item =>
              item.remark ===
              'LATE'
          ).length,

        absent:
          rows.filter(
            item =>
              item.remark ===
              'ABSENT'
          ).length,

        excused:
          rows.filter(
            item =>
              item.remark ===
              'EXCUSED'
          ).length,
      }),
      [
        rows,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | ROUTING
  |--------------------------------------------------------------------------
  */

  const openStudentAttendance =
    row => {
      const student =
        buildStudentPayload(
          row
        );

      const history =
        getStudentAttendanceHistory(
          row,
          requestedDate
        );

      const summary =
        buildAttendanceSummary(
          history
        );

      router.push({
        pathname:
          '/(tabs)/StudentAttendanceScreen',

        params: {
          student:
            JSON.stringify(
              student
            ),

          attendanceRecords:
            JSON.stringify(
              history
            ),

          summary:
            JSON.stringify(
              summary
            ),
        },
      });
    };


  const openEditStanding =
    row => {
      const student =
        buildStudentPayload(
          row
        );

      router.push({
        pathname:
          '/(tabs)/EditStudentAttendanceScreen',

        params: {
          student:
            JSON.stringify(
              student
            ),

          role:
            editRole,
        },
      });
    };


  /*
  |--------------------------------------------------------------------------
  | CLEAR FILTERS
  |--------------------------------------------------------------------------
  */

  const clearFilters =
    () => {
      setSearch('');
      setRemarkFilter('ALL');
      setStandingFilter('ALL');
    };


  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <SafeAreaView
        style={
          styles.loading
        }
        edges={[
          'top',
          'left',
          'right',
        ]}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor={
            COLORS.page
          }
        />

        <View
          style={
            styles.loadingMark
          }
        >
          <Ionicons
            name="people-outline"
            size={30}
            color={
              COLORS.maroon
            }
          />
        </View>

        <ActivityIndicator
          color={
            COLORS.maroon
          }
          style={{
            marginTop: 18,
          }}
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading students
        </Text>
      </SafeAreaView>
    );
  }


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
        'left',
        'right',
      ]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={
          COLORS.maroon
        }
      />

      <ScrollView
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
            tintColor={
              COLORS.white
            }
            colors={[
              COLORS.maroon,
            ]}
          />
        }
        contentContainerStyle={{
          paddingBottom:
            125 +
            insets.bottom,
        }}
      >

        {/*
        |--------------------------------------------------------------------------
        | HERO
        |--------------------------------------------------------------------------
        */}

        <View
          style={
            styles.hero
          }
        >
          <View
            style={
              styles.heroOrbOne
            }
          />

          <View
            style={
              styles.heroOrbTwo
            }
          />

          <View
            style={
              styles.heroTop
            }
          >
            <View>
              <Text
                style={
                  styles.heroEyebrow
                }
              >
                ATTENDANCE
              </Text>

              <Text
                style={
                  styles.heroTitle
                }
              >
                Student List
              </Text>
            </View>

            <View
              style={
                styles.heroIcon
              }
            >
              <Ionicons
                name="people-outline"
                size={24}
                color={
                  COLORS.maroon
                }
              />
            </View>
          </View>

          <Text
            style={
              styles.heroDescription
            }
          >
            View attendance, monitor status, and manage student standing.
          </Text>


          <View
            style={
              styles.heroMeta
            }
          >
            <View
              style={
                styles.heroMetaItem
              }
            >
              <Ionicons
                name="layers-outline"
                size={16}
                color={
                  COLORS.yellow
                }
              />

              <View
                style={
                  styles.heroMetaCopy
                }
              >
                <Text
                  style={
                    styles.heroMetaLabel
                  }
                >
                  COMPONENT
                </Text>

                <Text
                  style={
                    styles.heroMetaValue
                  }
                >
                  {
                    component ||
                    '—'
                  }
                </Text>
              </View>
            </View>


            <View
              style={
                styles.heroMetaLine
              }
            />


            <View
              style={
                styles.heroMetaItem
              }
            >
              <Ionicons
                name="calendar-outline"
                size={16}
                color={
                  COLORS.yellow
                }
              />

              <View
                style={
                  styles.heroMetaCopy
                }
              >
                <Text
                  style={
                    styles.heroMetaLabel
                  }
                >
                  DATE
                </Text>

                <Text
                  style={
                    styles.heroMetaValue
                  }
                >
                  {
                    formatDate(
                      requestedDate
                    )
                  }
                </Text>
              </View>
            </View>
          </View>
        </View>


        {/*
        |--------------------------------------------------------------------------
        | FLOATING SEARCH
        |--------------------------------------------------------------------------
        */}

        <View
          style={
            styles.searchWrap
          }
        >
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
              placeholder="Search students"
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
                    onPress={() =>
                      setSearch('')
                    }
                    style={
                      styles.clearButton
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
        </View>


        <View
          style={
            styles.body
          }
        >

          {/*
          |--------------------------------------------------------------------------
          | COMPONENT SELECTOR
          |--------------------------------------------------------------------------
          */}

          {
            componentOptions.length > 1
              ? (
                <View
                  style={
                    styles.block
                  }
                >
                  <View
                    style={
                      styles.blockHeader
                    }
                  >
                    <View>
                      <Text
                        style={
                          styles.blockTitle
                        }
                      >
                        Components
                      </Text>

                      <Text
                        style={
                          styles.blockSubtitle
                        }
                      >
                        Select an assigned component
                      </Text>
                    </View>
                  </View>


                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={
                      false
                    }
                    contentContainerStyle={
                      styles.componentList
                    }
                  >
                    {
                      componentOptions.map(
                        item => {
                          const active =
                            item ===
                            component;

                          return (
                            <Pressable
                              key={
                                item
                              }
                              disabled={
                                Boolean(
                                  switching
                                )
                              }
                              onPress={() =>
                                switchComponent(
                                  item
                                )
                              }
                              style={[
                                styles.componentPill,

                                active &&
                                  styles.componentPillActive,
                              ]}
                            >
                              {
                                switching ===
                                item
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
                                      name={
                                        active
                                          ? 'checkmark'
                                          : 'layers-outline'
                                      }
                                      size={15}
                                      color={
                                        active
                                          ? COLORS.white
                                          : COLORS.teal
                                      }
                                    />
                                  )
                              }

                              <Text
                                style={[
                                  styles.componentPillText,

                                  active &&
                                    styles.componentPillTextActive,
                                ]}
                              >
                                {item}
                              </Text>
                            </Pressable>
                          );
                        }
                      )
                    }
                  </ScrollView>
                </View>
              )
              : null
          }


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
                    styles.error
                  }
                >
                  <View
                    style={
                      styles.errorIcon
                    }
                  >
                    <Ionicons
                      name="alert-circle-outline"
                      size={19}
                      color={
                        COLORS.maroon
                      }
                    />
                  </View>

                  <Text
                    style={
                      styles.errorText
                    }
                  >
                    {error}
                  </Text>

                  <TouchableOpacity
                    onPress={() =>
                      loadStudentAttendance(
                        true
                      )
                    }
                    style={
                      styles.errorRetry
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
              : null
          }


          {/*
          |--------------------------------------------------------------------------
          | SUMMARY
          |--------------------------------------------------------------------------
          */}

          <View
            style={
              styles.summary
            }
          >
            <SummaryItem
              label="Students"
              value={
                counts.all
              }
              color={
                COLORS.teal
              }
            />

            <View
              style={
                styles.summaryLine
              }
            />

            <SummaryItem
              label="Present"
              value={
                counts.present
              }
              color={
                COLORS.green
              }
            />

            <View
              style={
                styles.summaryLine
              }
            />

            <SummaryItem
              label="Late"
              value={
                counts.late
              }
              color={
                COLORS.orange
              }
            />

            <View
              style={
                styles.summaryLine
              }
            />

            <SummaryItem
              label="Absent"
              value={
                counts.absent
              }
              color={
                COLORS.maroon
              }
            />
          </View>


          {/*
          |--------------------------------------------------------------------------
          | FILTER
          |--------------------------------------------------------------------------
          */}

          <View
            style={
              styles.filterSection
            }
          >
            <View
              style={
                styles.filterHeading
              }
            >
              <View>
                <Text
                  style={
                    styles.blockTitle
                  }
                >
                  Filter students
                </Text>

                <Text
                  style={
                    styles.blockSubtitle
                  }
                >
                  Attendance and NSTP standing
                </Text>
              </View>

              {
                search ||
                remarkFilter !== 'ALL' ||
                standingFilter !== 'ALL'
                  ? (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={
                        clearFilters
                      }
                      style={
                        styles.resetButton
                      }
                    >
                      <Ionicons
                        name="refresh"
                        size={14}
                        color={
                          COLORS.maroon
                        }
                      />

                      <Text
                        style={
                          styles.resetText
                        }
                      >
                        Reset
                      </Text>
                    </TouchableOpacity>
                  )
                  : null
              }
            </View>


            <Text
              style={
                styles.filterLabel
              }
            >
              Attendance
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.filterList
              }
            >
              {
                REMARK_FILTERS.map(
                  item => (
                    <FilterButton
                      key={
                        item
                      }
                      label={
                        item === 'NOT YET'
                          ? 'Not yet'
                          : item.charAt(0) +
                            item
                              .slice(1)
                              .toLowerCase()
                      }
                      active={
                        remarkFilter ===
                        item
                      }
                      onPress={() =>
                        setRemarkFilter(
                          item
                        )
                      }
                    />
                  )
                )
              }
            </ScrollView>


            <Text
              style={[
                styles.filterLabel,
                {
                  marginTop: 15,
                },
              ]}
            >
              Standing
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.filterList
              }
            >
              {
                STANDING_FILTERS.map(
                  item => (
                    <FilterButton
                      key={
                        item
                      }
                      label={
                        item ===
                        'WARNING FOR DROPOUT'
                          ? 'Warning'
                          : item.charAt(0) +
                            item
                              .slice(1)
                              .toLowerCase()
                      }
                      active={
                        standingFilter ===
                        item
                      }
                      onPress={() =>
                        setStandingFilter(
                          item
                        )
                      }
                    />
                  )
                )
              }
            </ScrollView>
          </View>


          {/*
          |--------------------------------------------------------------------------
          | LIST HEADER
          |--------------------------------------------------------------------------
          */}

          <View
            style={
              styles.listHeader
            }
          >
            <View>
              <Text
                style={
                  styles.blockTitle
                }
              >
                Students
              </Text>

              <Text
                style={
                  styles.blockSubtitle
                }
              >
                {
                  `${filteredRows.length} result${
                    filteredRows.length === 1
                      ? ''
                      : 's'
                  }`
                }
              </Text>
            </View>

            <View
              style={
                styles.countBadge
              }
            >
              <Text
                style={
                  styles.countBadgeText
                }
              >
                {
                  filteredRows.length
                }
              </Text>
            </View>
          </View>


          {/*
          |--------------------------------------------------------------------------
          | LIST
          |--------------------------------------------------------------------------
          */}

          <View
            style={
              styles.listContainer
            }
          >
            {
              filteredRows.length
                ? (
                  filteredRows.map(
                    (
                      row,
                      index
                    ) => (
                      <StudentRow
                        key={
                          String(
                            row.id ??
                            index
                          )
                        }
                        row={
                          row
                        }
                        isLast={
                          index ===
                          filteredRows.length - 1
                        }
                        onOpen={() =>
                          openStudentAttendance(
                            row
                          )
                        }
                        onEdit={() =>
                          openEditStanding(
                            row
                          )
                        }
                      />
                    )
                  )
                )
                : (
                  <View
                    style={
                      styles.empty
                    }
                  >
                    <View
                      style={
                        styles.emptyIcon
                      }
                    >
                      <Ionicons
                        name="people-outline"
                        size={26}
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
                      No students found
                    </Text>

                    <Text
                      style={
                        styles.emptyText
                      }
                    >
                      {
                        search ||
                        remarkFilter !== 'ALL' ||
                        standingFilter !== 'ALL'
                          ? 'Try changing your search or filters.'
                          : 'Attendance records will appear here once available.'
                      }
                    </Text>
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
| SUMMARY
|--------------------------------------------------------------------------
*/

function SummaryItem({
  label,
  value,
  color,
}) {
  return (
    <View
      style={
        styles.summaryItem
      }
    >
      <Text
        style={[
          styles.summaryValue,
          {
            color,
          },
        ]}
      >
        {value}
      </Text>

      <Text
        style={
          styles.summaryLabel
        }
      >
        {label}
      </Text>
    </View>
  );
}


/*
|--------------------------------------------------------------------------
| FILTER
|--------------------------------------------------------------------------
*/

function FilterButton({
  label,
  active,
  onPress,
}) {
  return (
    <Pressable
      onPress={
        onPress
      }
      style={[
        styles.filterButton,

        active &&
          styles.filterButtonActive,
      ]}
    >
      <Text
        style={[
          styles.filterButtonText,

          active &&
            styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}


/*
|--------------------------------------------------------------------------
| STUDENT ROW
|--------------------------------------------------------------------------
*/

function StudentRow({
  row,
  isLast,
  onOpen,
  onEdit,
}) {
  const attendance =
    getRemarkMeta(
      row.remark
    );

  const standing =
    getStandingMeta(
      row.status
    );

  const [
    photoFailed,
    setPhotoFailed,
  ] = useState(false);

  const profilePhotoUrl =
    resolvePhotoUrl(
      row?.profile_photo_url ??
      row?.profile_photo ??
      row?.student?.profile_photo_url ??
      row?.student?.profile_photo ??
      row?.student?.photo_url ??
      row?.student?.avatar
    );

  const showProfilePhoto =
    Boolean(profilePhotoUrl) &&
    !photoFailed;

  const initials =
    String(
      row.full_name ??
      ''
    )
      .replace(',', ' ')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(
        word =>
          word
            .charAt(0)
            .toUpperCase()
      )
      .join('') ||
    'ST';

  return (
    <View
      style={[
        styles.studentRow,
        !isLast &&
          styles.studentRowBorder,
      ]}
    >

      <TouchableOpacity
        activeOpacity={0.74}
        onPress={
          onOpen
        }
        style={
          styles.studentMain
        }
      >
        <View
          style={
            styles.avatar
          }
        >
          {
            showProfilePhoto
              ? (
                <Image
                  key={profilePhotoUrl}
                  source={{
                    uri: profilePhotoUrl,
                  }}
                  resizeMode="cover"
                  style={
                    styles.avatarImage
                  }
                  onError={() =>
                    setPhotoFailed(true)
                  }
                />
              )
              : (
                <Text
                  style={
                    styles.avatarText
                  }
                >
                  {initials}
                </Text>
              )
          }
        </View>


        <View
          style={
            styles.studentCopy
          }
        >
          <Text
            numberOfLines={1}
            style={
              styles.studentName
            }
          >
            {row.full_name}
          </Text>

          <Text
            numberOfLines={1}
            style={
              styles.studentSecondary
            }
          >
            {row.id_number}
            {'  ·  '}
            {row.course}
          </Text>
        </View>


        <Ionicons
          name="chevron-forward"
          size={18}
          color={
            COLORS.mutedLight
          }
        />
      </TouchableOpacity>


      <View
        style={
          styles.studentInfo
        }
      >

        <View
          style={[
            styles.attendanceBadge,
            {
              backgroundColor:
                attendance.background,
            },
          ]}
        >
          <Ionicons
            name={
              attendance.icon
            }
            size={13}
            color={
              attendance.color
            }
          />

          <Text
            style={[
              styles.attendanceBadgeText,
              {
                color:
                  attendance.color,
              },
            ]}
          >
            {
              attendance.label
            }
          </Text>
        </View>


        <View
          style={
            styles.standingInfo
          }
        >
          <Ionicons
            name={
              standing.icon
            }
            size={14}
            color={
              standing.color
            }
          />

          <Text
            style={[
              styles.standingText,
              {
                color:
                  standing.color,
              },
            ]}
          >
            {
              standing.label
            }
          </Text>
        </View>

      </View>


      <View
        style={
          styles.timeStrip
        }
      >
        <View
          style={
            styles.timeStripItem
          }
        >
          <Ionicons
            name="log-in-outline"
            size={15}
            color={
              COLORS.green
            }
          />

          <Text
            style={
              styles.timeStripLabel
            }
          >
            In
          </Text>

          <Text
            style={
              styles.timeStripValue
            }
          >
            {
              row.time_in
            }
          </Text>
        </View>


        <View
          style={
            styles.timeStripLine
          }
        />


        <View
          style={
            styles.timeStripItem
          }
        >
          <Ionicons
            name="log-out-outline"
            size={15}
            color={
              COLORS.teal
            }
          />

          <Text
            style={
              styles.timeStripLabel
            }
          >
            Out
          </Text>

          <Text
            style={
              styles.timeStripValue
            }
          >
            {
              row.time_out
            }
          </Text>
        </View>
      </View>


      <View
        style={
          styles.rowActions
        }
      >
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={
            onOpen
          }
          style={
            styles.rowActionSecondary
          }
        >
          <Ionicons
            name="calendar-outline"
            size={16}
            color={
              COLORS.maroon
            }
          />

          <Text
            style={
              styles.rowActionSecondaryText
            }
          >
            History
          </Text>
        </TouchableOpacity>


        <TouchableOpacity
          activeOpacity={0.8}
          onPress={
            onEdit
          }
          style={
            styles.rowActionPrimary
          }
        >
          <Ionicons
            name="create-outline"
            size={16}
            color={
              COLORS.white
            }
          />

          <Text
            style={
              styles.rowActionPrimaryText
            }
          >
            Edit standing
          </Text>
        </TouchableOpacity>
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

    safeArea: {
      flex: 1,
      backgroundColor:
        COLORS.page,
    },


    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.page,
    },

    loadingMark: {
      width: 68,
      height: 68,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.softMaroon,
    },

    loadingText: {
      marginTop: 11,
      color:
        COLORS.dark,
      fontSize: 16,
      fontWeight: '800',
    },


    /*
    |--------------------------------------------------------------------------
    | HERO
    |--------------------------------------------------------------------------
    */

    hero: {
      position: 'relative',
      overflow: 'hidden',
      minHeight: 250,
      paddingTop: 22,
      paddingHorizontal: 20,
      paddingBottom: 52,
      backgroundColor:
        COLORS.maroon,
      borderBottomLeftRadius: 34,
      borderBottomRightRadius: 34,
    },

    heroOrbOne: {
      position: 'absolute',
      width: 180,
      height: 180,
      borderRadius: 90,
      top: -80,
      right: -50,
      backgroundColor:
        'rgba(255,189,54,0.08)',
    },

    heroOrbTwo: {
      position: 'absolute',
      width: 110,
      height: 110,
      borderRadius: 55,
      bottom: -40,
      left: -25,
      borderWidth: 18,
      borderColor:
        'rgba(255,255,255,0.035)',
    },

    heroTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    heroEyebrow: {
      color:
        COLORS.yellow,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1.4,
    },

    heroTitle: {
      marginTop: 5,
      color:
        COLORS.white,
      fontSize: 31,
      lineHeight: 37,
      fontWeight: '900',
      letterSpacing: -0.8,
    },

    heroDescription: {
      maxWidth: 310,
      marginTop: 10,
      color:
        'rgba(255,255,255,0.68)',
      fontSize: 14,
      lineHeight: 20,
    },

    heroIcon: {
      width: 50,
      height: 50,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.yellow,
    },

    heroMeta: {
      marginTop: 24,
      minHeight: 65,
      paddingHorizontal: 14,
      borderRadius: 18,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        'rgba(0,13,18,0.18)',
    },

    heroMetaItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },

    heroMetaCopy: {
      flex: 1,
      marginLeft: 8,
    },

    heroMetaLabel: {
      color:
        'rgba(255,255,255,0.50)',
      fontSize: 10,
      fontWeight: '700',
    },

    heroMetaValue: {
      marginTop: 2,
      color:
        COLORS.white,
      fontSize: 13,
      fontWeight: '800',
    },

    heroMetaLine: {
      width: 1,
      height: 32,
      marginHorizontal: 12,
      backgroundColor:
        'rgba(255,255,255,0.14)',
    },


    /*
    |--------------------------------------------------------------------------
    | SEARCH
    |--------------------------------------------------------------------------
    */

    searchWrap: {
      marginTop: -27,
      paddingHorizontal: 18,
    },

    searchBox: {
      height: 57,
      paddingHorizontal: 15,
      borderRadius: 19,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        COLORS.white,

      elevation: 5,

      shadowColor:
        COLORS.black,
      shadowOffset: {
        width: 0,
        height: 6,
      },
      shadowOpacity: 0.08,
      shadowRadius: 14,
    },

    searchInput: {
      flex: 1,
      height: '100%',
      marginLeft: 10,
      color:
        COLORS.dark,
      fontSize: 14,
    },

    clearButton: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
    },


    /*
    |--------------------------------------------------------------------------
    | BODY
    |--------------------------------------------------------------------------
    */

    body: {
      paddingHorizontal: 18,
      paddingTop: 25,
    },

    block: {
      marginBottom: 25,
    },

    blockHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    blockTitle: {
      color:
        COLORS.dark,
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: -0.2,
    },

    blockSubtitle: {
      marginTop: 3,
      color:
        COLORS.muted,
      fontSize: 12,
      lineHeight: 17,
    },


    /*
    |--------------------------------------------------------------------------
    | COMPONENT
    |--------------------------------------------------------------------------
    */

    componentList: {
      paddingTop: 12,
      paddingRight: 18,
      gap: 8,
    },

    componentPill: {
      minHeight: 42,
      paddingHorizontal: 15,
      borderRadius: 21,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    componentPillActive: {
      backgroundColor:
        COLORS.teal,
      borderColor:
        COLORS.teal,
    },

    componentPillText: {
      marginLeft: 6,
      color:
        COLORS.teal,
      fontSize: 13,
      fontWeight: '700',
    },

    componentPillTextActive: {
      color:
        COLORS.white,
    },


    /*
    |--------------------------------------------------------------------------
    | ERROR
    |--------------------------------------------------------------------------
    */

    error: {
      marginBottom: 20,
      minHeight: 62,
      padding: 11,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        COLORS.softMaroon,
    },

    errorIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.white,
    },

    errorText: {
      flex: 1,
      marginHorizontal: 9,
      color:
        COLORS.maroon,
      fontSize: 12,
      lineHeight: 17,
    },

    errorRetry: {
      width: 36,
      height: 36,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },


    /*
    |--------------------------------------------------------------------------
    | SUMMARY
    |--------------------------------------------------------------------------
    */

    summary: {
      minHeight: 90,
      paddingVertical: 13,
      borderRadius: 21,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    summaryItem: {
      flex: 1,
      alignItems: 'center',
    },

    summaryValue: {
      fontSize: 22,
      fontWeight: '900',
    },

    summaryLabel: {
      marginTop: 4,
      color:
        COLORS.muted,
      fontSize: 11,
      fontWeight: '600',
    },

    summaryLine: {
      width: 1,
      height: 42,
      backgroundColor:
        COLORS.border,
    },


    /*
    |--------------------------------------------------------------------------
    | FILTER
    |--------------------------------------------------------------------------
    */

    filterSection: {
      marginTop: 27,
    },

    filterHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    resetButton: {
      minHeight: 35,
      paddingHorizontal: 11,
      borderRadius: 11,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        COLORS.softMaroon,
    },

    resetText: {
      marginLeft: 4,
      color:
        COLORS.maroon,
      fontSize: 11,
      fontWeight: '800',
    },

    filterLabel: {
      marginTop: 17,
      marginBottom: 8,
      color:
        COLORS.muted,
      fontSize: 12,
      fontWeight: '700',
    },

    filterList: {
      paddingRight: 18,
      gap: 7,
    },

    filterButton: {
      minHeight: 39,
      paddingHorizontal: 14,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    filterButtonActive: {
      backgroundColor:
        COLORS.maroon,
      borderColor:
        COLORS.maroon,
    },

    filterButtonText: {
      color:
        COLORS.teal,
      fontSize: 12,
      fontWeight: '700',
    },

    filterButtonTextActive: {
      color:
        COLORS.white,
    },


    /*
    |--------------------------------------------------------------------------
    | LIST
    |--------------------------------------------------------------------------
    */

    listHeader: {
      marginTop: 30,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    countBadge: {
      minWidth: 40,
      height: 40,
      paddingHorizontal: 10,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.teal,
    },

    countBadgeText: {
      color:
        COLORS.white,
      fontSize: 14,
      fontWeight: '900',
    },

    listContainer: {
      overflow: 'hidden',
      borderRadius: 22,
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },


    /*
    |--------------------------------------------------------------------------
    | STUDENT ROW
    |--------------------------------------------------------------------------
    */

    studentRow: {
      padding: 15,
    },

    studentRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor:
        COLORS.border,
    },

    studentMain: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    avatar: {
      width: 48,
      height: 48,
      borderRadius: 17,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.teal,
    },

    avatarImage: {
      width: '100%',
      height: '100%',
    },

    avatarText: {
      color:
        COLORS.white,
      fontSize: 14,
      fontWeight: '900',
    },

    studentCopy: {
      flex: 1,
      minWidth: 0,
      marginLeft: 11,
      marginRight: 7,
    },

    studentName: {
      color:
        COLORS.dark,
      fontSize: 15,
      lineHeight: 19,
      fontWeight: '800',
    },

    studentSecondary: {
      marginTop: 4,
      color:
        COLORS.muted,
      fontSize: 11,
    },

    studentInfo: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    attendanceBadge: {
      minHeight: 31,
      paddingHorizontal: 9,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
    },

    attendanceBadgeText: {
      marginLeft: 5,
      fontSize: 11,
      fontWeight: '800',
    },

    standingInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    standingText: {
      marginLeft: 5,
      fontSize: 11,
      fontWeight: '800',
    },


    /*
    |--------------------------------------------------------------------------
    | TIME STRIP
    |--------------------------------------------------------------------------
    */

    timeStrip: {
      marginTop: 11,
      minHeight: 49,
      paddingHorizontal: 10,
      borderRadius: 13,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        COLORS.surfaceSoft,
    },

    timeStripItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },

    timeStripLabel: {
      marginLeft: 5,
      color:
        COLORS.muted,
      fontSize: 11,
      fontWeight: '600',
    },

    timeStripValue: {
      marginLeft: 7,
      color:
        COLORS.dark,
      fontSize: 12,
      fontWeight: '800',
    },

    timeStripLine: {
      width: 1,
      height: 27,
      marginHorizontal: 9,
      backgroundColor:
        COLORS.border,
    },


    /*
    |--------------------------------------------------------------------------
    | ACTIONS
    |--------------------------------------------------------------------------
    */

    rowActions: {
      marginTop: 11,
      flexDirection: 'row',
      gap: 8,
    },

    rowActionSecondary: {
      flex: 1,
      minHeight: 43,
      borderRadius: 13,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.softMaroon,
    },

    rowActionSecondaryText: {
      marginLeft: 5,
      color:
        COLORS.maroon,
      fontSize: 12,
      fontWeight: '800',
    },

    rowActionPrimary: {
      flex: 1.25,
      minHeight: 43,
      borderRadius: 13,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.teal,
    },

    rowActionPrimaryText: {
      marginLeft: 5,
      color:
        COLORS.white,
      fontSize: 12,
      fontWeight: '800',
    },


    /*
    |--------------------------------------------------------------------------
    | EMPTY
    |--------------------------------------------------------------------------
    */

    empty: {
      minHeight: 260,
      paddingHorizontal: 26,
      alignItems: 'center',
      justifyContent: 'center',
    },

    emptyIcon: {
      width: 60,
      height: 60,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.softMaroon,
    },

    emptyTitle: {
      marginTop: 14,
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

  });