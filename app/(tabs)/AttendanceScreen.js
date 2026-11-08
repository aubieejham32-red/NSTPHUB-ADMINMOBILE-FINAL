import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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

import {
  deleteAttendanceSchedule,
  getAdminDashboard,
  getAttendance,
  saveAttendanceSchedule,
  scanAttendance,
} from '../../services/api';

const COLORS = {
  cream: '#EFEBE2',
  maroon: '#68110F',
  maroonDark: '#4E0D0C',
  green: '#58761C',
  yellow: '#FFBD36',
  orange: '#D99202',
  teal: '#233E47',
  black: '#000D12',
  white: '#FFFFFF',

  page: '#F4F1EA',
  surface: '#FFFFFF',
  muted: '#756F69',
  border: '#DDD7CE',

  softMaroon: '#F5E9E7',
  softGreen: '#EAF0DF',
  softYellow: '#FFF3D2',
  softTeal: '#E5ECEE',
};

const VALID_COMPONENTS = [
  'CWTS',
  'LTS',
  'ROTC',
];

const STANDARD_MINUTES = [
  '00',
  '05',
  '10',
  '15',
  '20',
  '25',
  '30',
  '35',
  '40',
  '45',
  '50',
  '55',
];


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function normalizeComponent(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase();
}


function getDeviceDateString(
  value = new Date()
) {
  const year =
    value.getFullYear();

  const month =
    String(
      value.getMonth() + 1
    ).padStart(
      2,
      '0'
    );

  const day =
    String(
      value.getDate()
    ).padStart(
      2,
      '0'
    );

  return `${year}-${month}-${day}`;
}


function formatShortDate(value) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      String(
        value ?? ''
      )
    )
  ) {
    return 'Today';
  }

  const [
    year,
    month,
    day,
  ] =
    String(value)
      .split('-')
      .map(Number);

  return new Date(
    year,
    month - 1,
    day
  ).toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  );
}


function timeToMinutes(value) {
  const match =
    String(
      value ?? ''
    )
      .trim()
      .match(
        /^(\d{2}):(\d{2})$/
      );

  if (!match) {
    return null;
  }

  const hour =
    Number(
      match[1]
    );

  const minute =
    Number(
      match[2]
    );

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return (
    hour * 60 +
    minute
  );
}


function minutesToTime(value) {
  if (
    !Number.isFinite(
      value
    )
  ) {
    return '';
  }

  const normalized =
    (
      (
        value % 1440
      ) +
      1440
    ) %
    1440;

  const hour =
    Math.floor(
      normalized / 60
    );

  const minute =
    normalized % 60;

  return (
    `${String(hour).padStart(
      2,
      '0'
    )}:` +
    `${String(minute).padStart(
      2,
      '0'
    )}`
  );
}


function addMinutesToTime(
  value,
  amount
) {
  const base =
    timeToMinutes(
      value
    );

  if (
    base === null
  ) {
    return '';
  }

  return minutesToTime(
    base +
    Number(
      amount || 0
    )
  );
}


function formatTime(value) {
  const total =
    timeToMinutes(
      value
    );

  if (
    total === null
  ) {
    return 'Not set';
  }

  let hour =
    Math.floor(
      total / 60
    );

  const minute =
    total % 60;

  const period =
    hour >= 12
      ? 'PM'
      : 'AM';

  hour =
    hour % 12 || 12;

  return (
    `${hour}:` +
    `${String(minute).padStart(
      2,
      '0'
    )} ` +
    period
  );
}


function parsePickerValue(value) {
  const total =
    timeToMinutes(
      value
    );

  if (
    total === null
  ) {
    return {
      hour: 8,
      minute: '00',
      period: 'AM',
    };
  }

  const hour24 =
    Math.floor(
      total / 60
    );

  const minute =
    String(
      total % 60
    ).padStart(
      2,
      '0'
    );

  return {
    hour:
      hour24 % 12 || 12,

    minute,

    period:
      hour24 >= 12
        ? 'PM'
        : 'AM',
  };
}


function pickerTo24Hour(
  hour,
  minute,
  period
) {
  let hour24 =
    Number(hour) % 12;

  if (
    period === 'PM'
  ) {
    hour24 += 12;
  }

  return (
    `${String(hour24).padStart(
      2,
      '0'
    )}:` +
    `${String(minute).padStart(
      2,
      '0'
    )}`
  );
}


function stripAttendancePrefix(value) {
  const raw =
    String(
      value ?? ''
    ).trim();

  const prefix =
    'NSTPHUB:ATTENDANCE:';

  if (
    raw
      .toUpperCase()
      .startsWith(
        prefix
      )
  ) {
    return raw
      .slice(
        prefix.length
      )
      .trim();
  }

  return raw;
}


function extractQrToken(value) {
  const raw =
    String(
      value ?? ''
    ).trim();

  if (!raw) {
    return '';
  }

  const direct =
    stripAttendancePrefix(
      raw
    );

  if (
    direct !== raw
  ) {
    return direct;
  }

  try {
    const parsed =
      JSON.parse(
        raw
      );

    return stripAttendancePrefix(
      parsed?.qr_token ??
      parsed?.token ??
      parsed?.student_token ??
      ''
    );

  } catch {
    return direct;
  }
}


function getSchedule(
  result,
  component
) {
  return (
    result
      ?.attendanceSchedules
      ?.[component]
    ??
    result
      ?.attendance_schedules
      ?.[component]
    ??
    result?.schedule
    ??
    null
  );
}


/*
|--------------------------------------------------------------------------
| Main Attendance Screen
|--------------------------------------------------------------------------
*/

export default function AttendanceScreen() {
  // Native camera callbacks can arrive before React's state is updated.
  const scanInFlightRef = useRef(false);

  const insets =
    useSafeAreaInsets();

  const [
    permission,
    requestPermission,
  ] =
    useCameraPermissions();


  const [
    dashboard,
    setDashboard,
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
    error,
    setError,
  ] =
    useState('');


  const [
    attendanceDate,
    setAttendanceDate,
  ] =
    useState(
      () =>
        getDeviceDateString()
    );


  const [
    selectedComponent,
    setSelectedComponent,
  ] =
    useState('');


  const [
    timeModalVisible,
    setTimeModalVisible,
  ] =
    useState(false);


  const [
    timePickerVisible,
    setTimePickerVisible,
  ] =
    useState(false);


  const [
    timePickerField,
    setTimePickerField,
  ] =
    useState('');


  const [
    timePickerLabel,
    setTimePickerLabel,
  ] =
    useState('');


  const [
    pickerHour,
    setPickerHour,
  ] =
    useState(8);


  const [
    pickerMinute,
    setPickerMinute,
  ] =
    useState('00');


  const [
    pickerPeriod,
    setPickerPeriod,
  ] =
    useState('AM');


  const [
    checkInOpens,
    setCheckInOpens,
  ] =
    useState('');


  const [
    presentUntil,
    setPresentUntil,
  ] =
    useState('');


  const [
    lateUntil,
    setLateUntil,
  ] =
    useState('');


  const [
    checkOutOpens,
    setCheckOutOpens,
  ] =
    useState('');


  const [
    checkOutCloses,
    setCheckOutCloses,
  ] =
    useState('');


  const [
    scheduleSaved,
    setScheduleSaved,
  ] =
    useState(false);


  const [
    savingSchedule,
    setSavingSchedule,
  ] =
    useState(false);


  const [
    scannerExpanded,
    setScannerExpanded,
  ] =
    useState(false);


  const [
    scannerActive,
    setScannerActive,
  ] =
    useState(false);


  const [
    processingScan,
    setProcessingScan,
  ] =
    useState(false);


  const [
    scanMessage,
    setScanMessage,
  ] =
    useState('');


  const [
    scanType,
    setScanType,
  ] =
    useState('');


  const [
    lastQrToken,
    setLastQrToken,
  ] =
    useState('');


  /*
  |--------------------------------------------------------------------------
  | Component Options
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

        return [
          ...new Set(
            options
              .map(
                normalizeComponent
              )
              .filter(
                item =>
                  VALID_COMPONENTS
                    .includes(
                      item
                    )
              )
          ),
        ];
      },
      [
        dashboard,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | Reset Scanner
  |--------------------------------------------------------------------------
  */

  const resetScannerFeedback =
    useCallback(
      () => {
        setScannerExpanded(
          false
        );

        setScannerActive(
          false
        );

        setProcessingScan(
          false
        );

        setScanMessage('');
        setScanType('');
        setLastQrToken('');
      },
      []
    );


  /*
  |--------------------------------------------------------------------------
  | Apply Attendance Schedule
  |--------------------------------------------------------------------------
  */

  const applySchedule =
    useCallback(
      (
        result,
        component
      ) => {
        const schedule =
          getSchedule(
            result,
            component
          );

        const startIn =
          schedule
            ?.start_time_in
          ??
          '';

        const endIn =
          schedule
            ?.end_time_in
          ??
          '';

        const inExtension =
          Number(
            schedule
              ?.time_in_extension_minutes
            ??
            0
          );

        const startOut =
          schedule
            ?.start_time_out
          ??
          '';

        const endOut =
          schedule
            ?.end_time_out
          ??
          '';

        const outExtension =
          Number(
            schedule
              ?.time_out_extension_minutes
            ??
            0
          );

        const finalIn =
          schedule
            ?.final_time_in_cutoff
          ??
          addMinutesToTime(
            endIn,
            inExtension
          );

        const finalOut =
          schedule
            ?.final_time_out_cutoff
          ??
          addMinutesToTime(
            endOut,
            outExtension
          );

        setCheckInOpens(
          startIn
        );

        setPresentUntil(
          endIn
        );

        setLateUntil(
          finalIn ||
          endIn
        );

        setCheckOutOpens(
          startOut
        );

        setCheckOutCloses(
          finalOut ||
          endOut
        );

        setScheduleSaved(
          Boolean(
            schedule
              ?.configured
            ??
            schedule
              ?.is_configured
            ??
            schedule?.id
          )
        );
      },
      []
    );


  /*
  |--------------------------------------------------------------------------
  | Device Date Sync
  |--------------------------------------------------------------------------
  */

  const syncBackendDate =
    useCallback(
      result => {
        const deviceDate =
          getDeviceDateString();

        const backendDate =
          result
            ?.attendanceDate
          ??
          result
            ?.attendance_date
          ??
          result?.date
          ??
          '';

        setAttendanceDate(
          deviceDate
        );

        if (
          /^\d{4}-\d{2}-\d{2}$/
            .test(
              String(
                backendDate
              )
            )
          &&
          String(
            backendDate
          ) !==
            deviceDate
        ) {
          console.warn(
            'NSTP HUB date sync corrected a server/client date mismatch:',
            {
              backendDate:
                String(
                  backendDate
                ),

              deviceDate,
            }
          );
        }
      },
      []
    );


  /*
  |--------------------------------------------------------------------------
  | Load Selected Component
  |--------------------------------------------------------------------------
  */

  const loadForComponent =
    useCallback(
      async (
        component,
        showRefresh = false
      ) => {
        if (
          !component
        ) {
          return;
        }

        try {
          if (
            showRefresh
          ) {
            setRefreshing(
              true
            );
          }

          setError('');

          const result =
            await getAttendance({
              component,
            });

          syncBackendDate(
            result
          );

          applySchedule(
            result,
            component
          );

        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load today\'s attendance.'
          );

        } finally {
          if (
            showRefresh
          ) {
            setRefreshing(
              false
            );
          }
        }
      },
      [
        applySchedule,
        syncBackendDate,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | Load Screen
  |--------------------------------------------------------------------------
  */

  const loadScreen =
    useCallback(
      async (
        manual = false
      ) => {
        try {
          if (
            manual
          ) {
            setRefreshing(
              true
            );
          }

          const dashboardResult =
            await getAdminDashboard();

          setDashboard(
            dashboardResult
          );

          setError('');

          const options =
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
                  .filter(
                    item =>
                      VALID_COMPONENTS
                        .includes(
                          item
                        )
                  )
              : [];

          const preferred =
            normalizeComponent(
              dashboardResult
                ?.component_context
                ?.selected
              ??
              options[0]
              ??
              ''
            );

          const component =
            options.includes(
              preferred
            )
              ? preferred
              : options[0]
                ??
                preferred;

          if (
            !component
          ) {
            throw new Error(
              'Your account is not assigned to an NSTP component.'
            );
          }

          const attendanceResult =
            await getAttendance({
              component,
            });

          setSelectedComponent(
            component
          );

          syncBackendDate(
            attendanceResult
          );

          applySchedule(
            attendanceResult,
            component
          );

        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : 'Unable to load attendance.';

          setError(
            message
          );

          const lowered =
            message
              .toLowerCase();

          if (
            lowered.includes(
              'unauthenticated'
            )
            ||
            lowered.includes(
              'unauthorized'
            )
            ||
            lowered.includes(
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
        applySchedule,
        syncBackendDate,
      ]
    );


  useFocusEffect(
    useCallback(
      () => {
        loadScreen();
      },
      [
        loadScreen,
      ]
    )
  );


  /*
  |--------------------------------------------------------------------------
  | Select Component
  |--------------------------------------------------------------------------
  */

  const selectComponent =
    async value => {
      const component =
        normalizeComponent(
          value
        );

      if (
        !component ||
        component ===
          selectedComponent ||
        !componentOptions
          .includes(
            component
          )
      ) {
        return;
      }

      resetScannerFeedback();

      setSelectedComponent(
        component
      );

      await loadForComponent(
        component,
        true
      );
    };


  /*
  |--------------------------------------------------------------------------
  | Open Time Picker
  |--------------------------------------------------------------------------
  */

  const openTimePicker =
    (
      field,
      label,
      value
    ) => {
      const parsed =
        parsePickerValue(
          value
        );

      setTimePickerField(
        field
      );

      setTimePickerLabel(
        label
      );

      setPickerHour(
        parsed.hour
      );

      setPickerMinute(
        parsed.minute
      );

      setPickerPeriod(
        parsed.period
      );

      setTimePickerVisible(
        true
      );
    };


  /*
  |--------------------------------------------------------------------------
  | Apply Time Picker
  |--------------------------------------------------------------------------
  */

  const applyPickedTime =
    () => {
      const value =
        pickerTo24Hour(
          pickerHour,
          pickerMinute,
          pickerPeriod
        );

      switch (
        timePickerField
      ) {
        case 'checkInOpens':
          setCheckInOpens(
            value
          );
          break;

        case 'presentUntil':
          setPresentUntil(
            value
          );
          break;

        case 'lateUntil':
          setLateUntil(
            value
          );
          break;

        case 'checkOutOpens':
          setCheckOutOpens(
            value
          );
          break;

        case 'checkOutCloses':
          setCheckOutCloses(
            value
          );
          break;

        default:
          break;
      }

      setTimePickerVisible(
        false
      );
    };


  /*
  |--------------------------------------------------------------------------
  | Validate Schedule
  |--------------------------------------------------------------------------
  */

  const validateSchedule =
    () => {
      const checkInStart =
        timeToMinutes(
          checkInOpens
        );

      const onTimeEnd =
        timeToMinutes(
          presentUntil
        );

      const lateEnd =
        timeToMinutes(
          lateUntil
        );

      const checkOutStart =
        timeToMinutes(
          checkOutOpens
        );

      const checkOutEnd =
        timeToMinutes(
          checkOutCloses
        );

      if (
        [
          checkInStart,
          onTimeEnd,
          lateEnd,
          checkOutStart,
          checkOutEnd,
        ].some(
          item =>
            item === null
        )
      ) {
        Alert.alert(
          'Complete the schedule',
          'Please set all attendance times before saving.'
        );

        return false;
      }

      if (
        onTimeEnd <=
        checkInStart
      ) {
        Alert.alert(
          'Check-in time needs adjustment',
          '“On-time until” must be later than “Check-in opens”.'
        );

        return false;
      }

      if (
        lateEnd <
        onTimeEnd
      ) {
        Alert.alert(
          'Late period needs adjustment',
          '“Late until” cannot be earlier than “On-time until”.'
        );

        return false;
      }

      if (
        checkOutStart <=
        lateEnd
      ) {
        Alert.alert(
          'Check-out time needs adjustment',
          '“Check-out opens” must be later than the end of the late check-in period.'
        );

        return false;
      }

      if (
        checkOutEnd <=
        checkOutStart
      ) {
        Alert.alert(
          'Check-out time needs adjustment',
          '“Check-out closes” must be later than “Check-out opens”.'
        );

        return false;
      }

      return true;
    };


  /*
  |--------------------------------------------------------------------------
  | Save Schedule
  |--------------------------------------------------------------------------
  */

  const saveSchedule =
    async () => {
      if (
        !validateSchedule()
      ) {
        return;
      }

      try {
        setSavingSchedule(
          true
        );

        const onTimeEnd =
          timeToMinutes(
            presentUntil
          );

        const lateEnd =
          timeToMinutes(
            lateUntil
          );

        const lateMinutes =
          Math.max(
            0,
            lateEnd -
            onTimeEnd
          );

        const result =
          await saveAttendanceSchedule({
            component:
              selectedComponent,

            start_time_in:
              checkInOpens,

            end_time_in:
              presentUntil,

            time_in_extension_minutes:
              lateMinutes,

            start_time_out:
              checkOutOpens,

            end_time_out:
              checkOutCloses,

            time_out_extension_minutes:
              0,
          });

        setScheduleSaved(
          true
        );

        setTimeModalVisible(
          false
        );

        Alert.alert(
          'Attendance time saved',

          result?.message
          ??
          'Today\'s attendance schedule was saved successfully.'
        );

        await loadForComponent(
          selectedComponent,
          false
        );

      } catch (err) {
        Alert.alert(
          'Unable to save attendance time',

          err instanceof Error
            ? err.message
            : 'Please try again.'
        );

      } finally {
        setSavingSchedule(
          false
        );
      }
    };


  /*
  |--------------------------------------------------------------------------
  | Remove Schedule
  |--------------------------------------------------------------------------
  */

  const removeSchedule =
    () => {
      Alert.alert(
        'Remove today\'s attendance time?',

        'QR scanning will be disabled until a new schedule is saved.',

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
                try {
                  const result =
                    await deleteAttendanceSchedule(
                      selectedComponent
                    );

                  setScheduleSaved(
                    false
                  );

                  setCheckInOpens('');
                  setPresentUntil('');
                  setLateUntil('');
                  setCheckOutOpens('');
                  setCheckOutCloses('');

                  resetScannerFeedback();

                  Alert.alert(
                    'Schedule removed',

                    result?.message
                    ??
                    'Today\'s attendance time was removed.'
                  );

                } catch (err) {
                  Alert.alert(
                    'Unable to remove schedule',

                    err instanceof Error
                      ? err.message
                      : 'Please try again.'
                  );
                }
              },
          },
        ]
      );
    };


  /*
  |--------------------------------------------------------------------------
  | Start Scanner
  |--------------------------------------------------------------------------
  */

  const startScanner =
    async () => {
      let latestScheduleReady =
        scheduleSaved;

      if (
        selectedComponent
      ) {
        try {
          const latestResult =
            await getAttendance({
              component:
                selectedComponent,
            });

          syncBackendDate(
            latestResult
          );

          applySchedule(
            latestResult,
            selectedComponent
          );

          const latestSchedule =
            getSchedule(
              latestResult,
              selectedComponent
            );

          latestScheduleReady =
            Boolean(
              latestSchedule
                ?.configured
              ??
              latestSchedule
                ?.is_configured
              ??
              latestSchedule?.id
            );

        } catch (err) {
          if (
            !latestScheduleReady
          ) {
            Alert.alert(
              'Unable to refresh attendance time',

              err instanceof Error
                ? err.message
                : 'Please check your connection and try again.'
            );

            return;
          }
        }
      }

      if (
        !latestScheduleReady
      ) {
        Alert.alert(
          'Set today\'s attendance time first',

          'Save today\'s check-in and check-out schedule before scanning student QR codes.'
        );

        return;
      }

      if (
        !permission?.granted
      ) {
        const result =
          await requestPermission();

        if (
          !result.granted
        ) {
          Alert.alert(
            'Camera permission required',

            'NSTP HUB needs camera access to scan student QR codes.'
          );

          return;
        }
      }

      setScanMessage('');
      setScanType('');
      setLastQrToken('');

      scanInFlightRef.current = false;

      setScannerExpanded(
        true
      );

      setScannerActive(
        true
      );
    };


  const stopScanner =
    () => {
      setScannerActive(
        false
      );

      setProcessingScan(
        false
      );
    };


  const collapseScanner =
    () => {
      setScannerActive(
        false
      );

      setProcessingScan(
        false
      );

      setScannerExpanded(
        false
      );
    };


  /*
  |--------------------------------------------------------------------------
  | QR Scanned
  |--------------------------------------------------------------------------
  */

  const handleBarcodeScanned =
    async ({
      data,
    }) => {
      if (
        scanInFlightRef.current ||
        processingScan ||
        !scannerActive
      ) {
        return;
      }

      const raw =
        String(
          data ?? ''
        ).trim();

      const token =
        extractQrToken(
          raw
        );

      if (
        !token
      ) {
        scanInFlightRef.current = true;
        setScannerActive(
          false
        );

        setScanType(
          'error'
        );

        setScanMessage(
          'This QR code does not contain a valid NSTP HUB attendance token.'
        );

        return;
      }

      scanInFlightRef.current = true;
      setProcessingScan(
        true
      );

      setScannerActive(
        false
      );

      setLastQrToken('');

      try {
        const result =
          await scanAttendance({
            qr_token:
              token,

            qr_value:
              raw,

            component:
              selectedComponent,

            client_scanned_at:
              new Date()
                .toISOString(),
          });

        setScanType(
          'success'
        );

        setLastQrToken(
          token
        );

        setScanMessage(
          result
            ?.scan
            ?.message
          ??
          result?.message
          ??
          'Attendance recorded successfully.'
        );

      } catch (err) {
        setLastQrToken('');

        setScanType(
          'error'
        );

        setScanMessage(
          err instanceof Error
            ? err.message
            : 'Unable to record attendance.'
        );

      } finally {
        setProcessingScan(
          false
        );
      }
    };


  /*
  |--------------------------------------------------------------------------
  | Open Attendance List
  |--------------------------------------------------------------------------
  */

  const openAttendanceList =
    () => {
      router.push({
        pathname:
          '/(tabs)/StudentListScreen',

        params: {
          component:
            selectedComponent,
        },
      });
    };


  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

  if (
    loading
  ) {
    return (
      <SafeAreaView
        style={
          styles.loadingPage
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


        <ActivityIndicator
          size="large"

          color={
            COLORS.maroon
          }
        />


        <Text
          style={
            styles.loadingTitle
          }
        >
          Loading Attendance
        </Text>
      </SafeAreaView>
    );
  }


  /*
  |--------------------------------------------------------------------------
  | Page
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

        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }

            onRefresh={() =>
              loadScreen(
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
            120 +
            insets.bottom,
        }}
      >
        {/* ================================================================
            HEADER
        ================================================================= */}

        <View
          style={
            styles.hero
          }
        >
          <View
            style={
              styles.heroTopRow
            }
          >
            <View
              style={
                styles.heroCopy
              }
            >
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
                Attendance
              </Text>


              <Text
                style={
                  styles.heroText
                }
              >
                Set today's schedule and scan student QR codes.
              </Text>
            </View>


            <View
              style={
                styles.heroIcon
              }
            >
              <Ionicons
                name="scan-outline"

                size={
                  25
                }

                color={
                  COLORS.maroon
                }
              />
            </View>
          </View>


          <View
            style={
              styles.heroInfoRow
            }
          >
            <InfoPill
              icon="layers-outline"

              label="Component"

              value={
                selectedComponent ||
                '—'
              }
            />


            <InfoPill
              icon="today-outline"

              label="Today"

              value={
                formatShortDate(
                  attendanceDate
                )
              }
            />
          </View>
        </View>


        <View
          style={
            styles.content
          }
        >
          {/* ================================================================
              ERROR
          ================================================================= */}

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

                      size={
                        19
                      }

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
                  </View>
                )
              : null
          }


          {/* ================================================================
              COMPONENT
          ================================================================= */}

          <Text
            style={
              styles.label
            }
          >
            NSTP COMPONENT
          </Text>


          <View
            style={
              styles.componentRow
            }
          >
            {
              componentOptions.map(
                component => {
                  const active =
                    component ===
                    selectedComponent;

                  return (
                    <TouchableOpacity
                      key={
                        component
                      }

                      activeOpacity={
                        0.8
                      }

                      onPress={() =>
                        selectComponent(
                          component
                        )
                      }

                      style={[
                        styles.componentButton,

                        active &&
                          styles.componentButtonActive,
                      ]}
                    >
                      <Ionicons
                        name={
                          active
                            ? 'checkmark-circle'
                            : 'layers-outline'
                        }

                        size={
                          18
                        }

                        color={
                          active
                            ? COLORS.white
                            : COLORS.teal
                        }
                      />


                      <Text
                        style={[
                          styles.componentButtonText,

                          active &&
                            styles.componentButtonTextActive,
                        ]}
                      >
                        {component}
                      </Text>
                    </TouchableOpacity>
                  );
                }
              )
            }
          </View>


          {/* ================================================================
              SCHEDULE
          ================================================================= */}

          <SectionTitle
            eyebrow="TODAY'S SCHEDULE"

            title="Attendance Time"
          />


          {
            scheduleSaved
              ? (
                  <ScheduleCard
                    checkInOpens={
                      checkInOpens
                    }

                    presentUntil={
                      presentUntil
                    }

                    lateUntil={
                      lateUntil
                    }

                    checkOutOpens={
                      checkOutOpens
                    }

                    checkOutCloses={
                      checkOutCloses
                    }

                    onEdit={() =>
                      setTimeModalVisible(
                        true
                      )
                    }

                    onRemove={
                      removeSchedule
                    }
                  />
                )
              : (
                  <View
                    style={
                      styles.emptyCard
                    }
                  >
                    <View
                      style={
                        styles.emptyIcon
                      }
                    >
                      <Ionicons
                        name="time-outline"

                        size={
                          28
                        }

                        color={
                          COLORS.orange
                        }
                      />
                    </View>


                    <Text
                      style={
                        styles.emptyTitle
                      }
                    >
                      No attendance time set
                    </Text>


                    <Text
                      style={
                        styles.emptyText
                      }
                    >
                      Set the check-in and check-out time before scanning students.
                    </Text>


                    <TouchableOpacity
                      activeOpacity={
                        0.82
                      }

                      onPress={() =>
                        setTimeModalVisible(
                          true
                        )
                      }

                      style={
                        styles.primaryButton
                      }
                    >
                      <Ionicons
                        name="time-outline"

                        size={
                          19
                        }

                        color={
                          COLORS.white
                        }
                      />


                      <Text
                        style={
                          styles.primaryButtonText
                        }
                      >
                        Set Attendance Time
                      </Text>
                    </TouchableOpacity>
                  </View>
                )
          }


          {/* ================================================================
              SCANNER
          ================================================================= */}

          <SectionTitle
            eyebrow="QR ATTENDANCE"

            title="Scan Student QR"
          />


          <View
            style={
              styles.scannerCard
            }
          >
            <View
              style={
                styles.scannerHeader
              }
            >
              <View
                style={
                  styles.scannerHeaderLeft
                }
              >
                <View
                  style={
                    styles.scannerHeaderIcon
                  }
                >
                  <Ionicons
                    name="qr-code-outline"

                    size={
                      22
                    }

                    color={
                      COLORS.maroon
                    }
                  />
                </View>


                <View
                  style={
                    styles.scannerHeaderCopy
                  }
                >
                  <Text
                    style={
                      styles.scannerTitle
                    }
                  >
                    Student QR Scanner
                  </Text>


                  <Text
                    style={
                      styles.scannerSubtitle
                    }
                  >
                    {
                      scheduleSaved
                        ? 'Ready to record attendance.'
                        : 'Set attendance time first.'
                    }
                  </Text>
                </View>
              </View>


              <View
                style={[
                  styles.statusBadge,

                  scheduleSaved
                    ? styles.statusBadgeReady
                    : styles.statusBadgeLocked,
                ]}
              >
                <View
                  style={[
                    styles.statusDot,

                    {
                      backgroundColor:
                        scheduleSaved
                          ? COLORS.green
                          : COLORS.orange,
                    },
                  ]}
                />


                <Text
                  style={[
                    styles.statusBadgeText,

                    {
                      color:
                        scheduleSaved
                          ? COLORS.green
                          : COLORS.orange,
                    },
                  ]}
                >
                  {
                    scheduleSaved
                      ? 'READY'
                      : 'LOCKED'
                  }
                </Text>
              </View>
            </View>


            {
              !scannerExpanded
                ? (
                    <View
                      style={
                        styles.scannerClosed
                      }
                    >
                      <Ionicons
                        name="scan-outline"

                        size={
                          48
                        }

                        color={
                          scheduleSaved
                            ? COLORS.yellow
                            : COLORS.muted
                        }
                      />


                      <Text
                        style={
                          styles.scannerClosedTitle
                        }
                      >
                        Open Scanner
                      </Text>


                      <Text
                        style={
                          styles.scannerClosedText
                        }
                      >
                        Scan the student QR code for time in or time out.
                      </Text>


                      <TouchableOpacity
                        activeOpacity={
                          0.82
                        }

                        disabled={
                          !scheduleSaved
                        }

                        onPress={
                          startScanner
                        }

                        style={[
                          styles.scanButton,

                          !scheduleSaved &&
                            styles.disabledButton,
                        ]}
                      >
                        <Ionicons
                          name="scan-outline"

                          size={
                            19
                          }

                          color={
                            COLORS.white
                          }
                        />


                        <Text
                          style={
                            styles.scanButtonText
                          }
                        >
                          {
                            scheduleSaved
                              ? 'Start Scanner'
                              : 'Set Attendance Time First'
                          }
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )
                : (
                    <>
                      <View
                        style={
                          styles.cameraShell
                        }
                      >
                        <View
                          style={
                            styles.cameraWindow
                          }
                        >
                          {
                            scannerActive &&
                            permission?.granted
                              ? (
                                  <CameraView
                                    style={
                                      StyleSheet
                                        .absoluteFillObject
                                    }

                                    facing="back"

                                    barcodeScannerSettings={{
                                      barcodeTypes: [
                                        'qr',
                                      ],
                                    }}

                                    onBarcodeScanned={
                                      handleBarcodeScanned
                                    }
                                  />
                                )
                              : (
                                  <View
                                    style={
                                      styles.cameraPlaceholder
                                    }
                                  >
                                    <Ionicons
                                      name={
                                        scanType ===
                                        'error'
                                          ? 'alert-circle-outline'
                                          : lastQrToken
                                            ? 'checkmark-circle-outline'
                                            : 'scan-outline'
                                      }

                                      size={
                                        58
                                      }

                                      color={
                                        scanType ===
                                        'error'
                                          ? COLORS.maroon
                                          : lastQrToken
                                            ? COLORS.green
                                            : COLORS.yellow
                                      }
                                    />


                                    <Text
                                      style={
                                        styles.cameraPlaceholderTitle
                                      }
                                    >
                                      {
                                        scanType ===
                                        'error'
                                          ? 'Scan not recorded'
                                          : lastQrToken
                                            ? 'Attendance recorded'
                                            : 'Scanner ready'
                                      }
                                    </Text>


                                    <Text
                                      style={
                                        styles.cameraPlaceholderText
                                      }
                                    >
                                      {
                                        scanType ===
                                        'error'
                                          ? 'Check the message below, then retry.'
                                          : lastQrToken
                                            ? 'Scan the next student when ready.'
                                            : 'Tap Start Camera to scan.'
                                      }
                                    </Text>
                                  </View>
                                )
                          }


                          <View
                            pointerEvents="none"

                            style={
                              styles.scanFrame
                            }
                          >
                            <View
                              style={[
                                styles.scanCorner,
                                styles.scanCornerTopLeft,
                              ]}
                            />

                            <View
                              style={[
                                styles.scanCorner,
                                styles.scanCornerTopRight,
                              ]}
                            />

                            <View
                              style={[
                                styles.scanCorner,
                                styles.scanCornerBottomLeft,
                              ]}
                            />

                            <View
                              style={[
                                styles.scanCorner,
                                styles.scanCornerBottomRight,
                              ]}
                            />
                          </View>
                        </View>
                      </View>


                      {
                        scanMessage
                          ? (
                              <View
                                style={[
                                  styles.scanMessage,

                                  scanType ===
                                  'error'
                                    ? styles.scanMessageError
                                    : styles.scanMessageSuccess,
                                ]}
                              >
                                <Ionicons
                                  name={
                                    scanType ===
                                    'error'
                                      ? 'alert-circle-outline'
                                      : 'checkmark-circle-outline'
                                  }

                                  size={
                                    21
                                  }

                                  color={
                                    scanType ===
                                    'error'
                                      ? COLORS.maroon
                                      : COLORS.green
                                  }
                                />


                                <Text
                                  style={[
                                    styles.scanMessageText,

                                    {
                                      color:
                                        scanType ===
                                        'error'
                                          ? COLORS.maroon
                                          : COLORS.green,
                                    },
                                  ]}
                                >
                                  {scanMessage}
                                </Text>
                              </View>
                            )
                          : null
                      }


                      <View
                        style={
                          styles.scannerActions
                        }
                      >
                        <TouchableOpacity
                          activeOpacity={
                            0.78
                          }

                          onPress={
                            collapseScanner
                          }

                          style={
                            styles.secondaryButton
                          }
                        >
                          <Ionicons
                            name="chevron-up"

                            size={
                              18
                            }

                            color={
                              COLORS.teal
                            }
                          />


                          <Text
                            style={
                              styles.secondaryButtonText
                            }
                          >
                            Collapse
                          </Text>
                        </TouchableOpacity>


                        {
                          scannerActive
                            ? (
                                <TouchableOpacity
                                  activeOpacity={
                                    0.82
                                  }

                                  onPress={
                                    stopScanner
                                  }

                                  style={
                                    styles.stopButton
                                  }
                                >
                                  <Ionicons
                                    name="stop-circle-outline"

                                    size={
                                      19
                                    }

                                    color={
                                      COLORS.white
                                    }
                                  />


                                  <Text
                                    style={
                                      styles.actionButtonText
                                    }
                                  >
                                    Stop Camera
                                  </Text>
                                </TouchableOpacity>
                              )
                            : (
                                <TouchableOpacity
                                  activeOpacity={
                                    0.82
                                  }

                                  disabled={
                                    processingScan ||
                                    !scheduleSaved
                                  }

                                  onPress={
                                    startScanner
                                  }

                                  style={[
                                    styles.startButton,

                                    (
                                      processingScan ||
                                      !scheduleSaved
                                    ) &&
                                      styles.disabledButton,
                                  ]}
                                >
                                  {
                                    processingScan
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
                                            name="scan-outline"

                                            size={
                                              19
                                            }

                                            color={
                                              COLORS.white
                                            }
                                          />
                                        )
                                  }


                                  <Text
                                    style={
                                      styles.actionButtonText
                                    }
                                  >
                                    {
                                      processingScan
                                        ? 'Processing...'
                                        : scanType ===
                                          'error'
                                          ? 'Retry Scan'
                                          : lastQrToken
                                            ? 'Scan Next Student'
                                            : 'Start Camera'
                                    }
                                  </Text>
                                </TouchableOpacity>
                              )
                        }
                      </View>
                    </>
                  )
            }
          </View>


          {/* ================================================================
              RECORDS
          ================================================================= */}

          <TouchableOpacity
            activeOpacity={
              0.8
            }

            onPress={
              openAttendanceList
            }

            style={
              styles.recordsButton
            }
          >
            <View
              style={
                styles.recordsIcon
              }
            >
              <Ionicons
                name="people-outline"

                size={
                  23
                }

                color={
                  COLORS.maroon
                }
              />
            </View>


            <View
              style={
                styles.recordsCopy
              }
            >
              <Text
                style={
                  styles.recordsEyebrow
                }
              >
                TODAY'S RECORDS
              </Text>


              <Text
                style={
                  styles.recordsTitle
                }
              >
                View Student Attendance List
              </Text>


              <Text
                style={
                  styles.recordsText
                }
              >
                Review attendance recorded for today.
              </Text>
            </View>


            <Ionicons
              name="arrow-forward"

              size={
                20
              }

              color={
                COLORS.maroon
              }
            />
          </TouchableOpacity>
        </View>
      </ScrollView>


      {/* ==================================================================
          ATTENDANCE SCHEDULE MODAL
      =================================================================== */}

      <ScheduleModal
        visible={
          timeModalVisible
        }

        component={
          selectedComponent
        }

        attendanceDate={
          attendanceDate
        }

        checkInOpens={
          checkInOpens
        }

        presentUntil={
          presentUntil
        }

        lateUntil={
          lateUntil
        }

        checkOutOpens={
          checkOutOpens
        }

        checkOutCloses={
          checkOutCloses
        }

        saving={
          savingSchedule
        }

        scheduleSaved={
          scheduleSaved
        }

        onClose={() =>
          setTimeModalVisible(
            false
          )
        }

        onOpenTime={
          openTimePicker
        }

        onSave={
          saveSchedule
        }

        bottomInset={
          insets.bottom
        }
      />


      {/* ==================================================================
          TIME PICKER
      =================================================================== */}

      <TimePickerModal
        visible={
          timePickerVisible
        }

        label={
          timePickerLabel
        }

        hour={
          pickerHour
        }

        minute={
          pickerMinute
        }

        period={
          pickerPeriod
        }

        onHourChange={
          setPickerHour
        }

        onMinuteChange={
          setPickerMinute
        }

        onPeriodChange={
          setPickerPeriod
        }

        onClose={() =>
          setTimePickerVisible(
            false
          )
        }

        onDone={
          applyPickedTime
        }
      />
    </SafeAreaView>
  );
}


/*
|--------------------------------------------------------------------------
| Info Pill
|--------------------------------------------------------------------------
*/

function InfoPill({
  icon,
  label,
  value,
}) {
  return (
    <View
      style={
        styles.infoPill
      }
    >
      <Ionicons
        name={
          icon
        }

        size={
          16
        }

        color={
          COLORS.yellow
        }
      />


      <View
        style={
          styles.infoPillCopy
        }
      >
        <Text
          style={
            styles.infoPillLabel
          }
        >
          {label}
        </Text>


        <Text
          numberOfLines={
            1
          }

          style={
            styles.infoPillValue
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
| Section Title
|--------------------------------------------------------------------------
*/

function SectionTitle({
  eyebrow,
  title,
}) {
  return (
    <View
      style={
        styles.sectionTitleWrap
      }
    >
      <Text
        style={
          styles.sectionEyebrow
        }
      >
        {eyebrow}
      </Text>


      <Text
        style={
          styles.sectionTitle
        }
      >
        {title}
      </Text>
    </View>
  );
}


/*
|--------------------------------------------------------------------------
| Schedule Card
|--------------------------------------------------------------------------
*/

function ScheduleCard({
  checkInOpens,
  presentUntil,
  lateUntil,
  checkOutOpens,
  checkOutCloses,
  onEdit,
  onRemove,
}) {
  return (
    <View
      style={
        styles.scheduleCard
      }
    >
      <View
        style={
          styles.scheduleStatusRow
        }
      >
        <View
          style={
            styles.scheduleStatusIcon
          }
        >
          <Ionicons
            name="checkmark"

            size={
              19
            }

            color={
              COLORS.white
            }
          />
        </View>


        <View
          style={
            styles.scheduleStatusCopy
          }
        >
          <Text
            style={
              styles.scheduleStatusTitle
            }
          >
            Today's schedule is ready
          </Text>


          <Text
            style={
              styles.scheduleStatusText
            }
          >
            QR attendance can now be used.
          </Text>
        </View>
      </View>


      <View
        style={
          styles.scheduleGroup
        }
      >
        <Text
          style={
            styles.scheduleGroupTitle
          }
        >
          TIME IN
        </Text>


        <ScheduleRow
          label="Check-in opens"

          value={
            formatTime(
              checkInOpens
            )
          }
        />


        <ScheduleRow
          label="On-time until"

          value={
            formatTime(
              presentUntil
            )
          }
        />


        <ScheduleRow
          label="Late until"

          value={
            formatTime(
              lateUntil
            )
          }
        />
      </View>


      <View
        style={
          styles.scheduleGroup
        }
      >
        <Text
          style={
            styles.scheduleGroupTitle
          }
        >
          TIME OUT
        </Text>


        <ScheduleRow
          label="Check-out opens"

          value={
            formatTime(
              checkOutOpens
            )
          }
        />


        <ScheduleRow
          label="Check-out closes"

          value={
            formatTime(
              checkOutCloses
            )
          }
        />
      </View>


      <View
        style={
          styles.scheduleActions
        }
      >
        <TouchableOpacity
          activeOpacity={
            0.8
          }

          onPress={
            onEdit
          }

          style={
            styles.editButton
          }
        >
          <Ionicons
            name="pencil-outline"

            size={
              17
            }

            color={
              COLORS.white
            }
          />


          <Text
            style={
              styles.editButtonText
            }
          >
            Edit Time
          </Text>
        </TouchableOpacity>


        <TouchableOpacity
          activeOpacity={
            0.75
          }

          onPress={
            onRemove
          }

          style={
            styles.removeButton
          }
        >
          <Ionicons
            name="trash-outline"

            size={
              17
            }

            color={
              COLORS.maroon
            }
          />


          <Text
            style={
              styles.removeButtonText
            }
          >
            Remove
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


function ScheduleRow({
  label,
  value,
}) {
  return (
    <View
      style={
        styles.scheduleRow
      }
    >
      <Text
        style={
          styles.scheduleRowLabel
        }
      >
        {label}
      </Text>


      <Text
        style={
          styles.scheduleRowValue
        }
      >
        {value}
      </Text>
    </View>
  );
}


/*
|--------------------------------------------------------------------------
| Schedule Modal
|--------------------------------------------------------------------------
*/

function ScheduleModal({
  visible,
  component,
  attendanceDate,
  checkInOpens,
  presentUntil,
  lateUntil,
  checkOutOpens,
  checkOutCloses,
  saving,
  scheduleSaved,
  onClose,
  onOpenTime,
  onSave,
  bottomInset,
}) {
  return (
    <Modal
      visible={
        visible
      }

      transparent

      animationType="slide"

      statusBarTranslucent

      onRequestClose={
        onClose
      }
    >
      <View
        style={
          styles.scheduleModalOverlay
        }
      >
        <Pressable
          style={
            styles.modalBackdrop
          }

          onPress={
            onClose
          }
        />


        <View
          style={[
            styles.scheduleModalSheet,

            {
              paddingBottom:
                Math.max(
                  bottomInset,
                  16
                ),
            },
          ]}
        >
          <View
            style={
              styles.modalHandle
            }
          />


          <View
            style={
              styles.scheduleModalHeader
            }
          >
            <View
              style={
                styles.scheduleModalHeaderCopy
              }
            >
              <Text
                style={
                  styles.scheduleModalEyebrow
                }
              >
                {component} • {formatShortDate(attendanceDate)}
              </Text>


              <Text
                style={
                  styles.scheduleModalTitle
                }
              >
                Attendance Time
              </Text>


              <Text
                style={
                  styles.scheduleModalText
                }
              >
                Tap a time to change it.
              </Text>
            </View>


            <TouchableOpacity
              activeOpacity={
                0.7
              }

              onPress={
                onClose
              }

              style={
                styles.modalCloseButton
              }
            >
              <Ionicons
                name="close"

                size={
                  22
                }

                color={
                  COLORS.maroon
                }
              />
            </TouchableOpacity>
          </View>


          <ScrollView
            showsVerticalScrollIndicator={
              false
            }

            contentContainerStyle={
              styles.scheduleModalContent
            }
          >
            <Text
              style={
                styles.scheduleModalGroupTitle
              }
            >
              TIME IN
            </Text>


            <TimeSelectRow
              label="Check-in opens"

              value={
                checkInOpens
              }

              onPress={() =>
                onOpenTime(
                  'checkInOpens',
                  'Check-in opens',
                  checkInOpens
                )
              }
            />


            <TimeSelectRow
              label="On-time until"

              value={
                presentUntil
              }

              onPress={() =>
                onOpenTime(
                  'presentUntil',
                  'On-time until',
                  presentUntil
                )
              }
            />


            <TimeSelectRow
              label="Late until"

              value={
                lateUntil
              }

              onPress={() =>
                onOpenTime(
                  'lateUntil',
                  'Late until',
                  lateUntil
                )
              }
            />


            <Text
              style={[
                styles.scheduleModalGroupTitle,
                styles.scheduleModalGroupSpacing,
              ]}
            >
              TIME OUT
            </Text>


            <TimeSelectRow
              label="Check-out opens"

              value={
                checkOutOpens
              }

              onPress={() =>
                onOpenTime(
                  'checkOutOpens',
                  'Check-out opens',
                  checkOutOpens
                )
              }
            />


            <TimeSelectRow
              label="Check-out closes"

              value={
                checkOutCloses
              }

              onPress={() =>
                onOpenTime(
                  'checkOutCloses',
                  'Check-out closes',
                  checkOutCloses
                )
              }
            />


            <TouchableOpacity
              activeOpacity={
                0.82
              }

              disabled={
                saving
              }

              onPress={
                onSave
              }

              style={[
                styles.saveScheduleButton,

                saving &&
                  styles.disabledButton,
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
                        name="checkmark-circle-outline"

                        size={
                          21
                        }

                        color={
                          COLORS.white
                        }
                      />
                    )
              }


              <Text
                style={
                  styles.saveScheduleButtonText
                }
              >
                {
                  saving
                    ? 'Saving...'
                    : scheduleSaved
                      ? 'Update Attendance Time'
                      : 'Save Attendance Time'
                }
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}


/*
|--------------------------------------------------------------------------
| Time Select Row
|--------------------------------------------------------------------------
*/

function TimeSelectRow({
  label,
  value,
  onPress,
}) {
  return (
    <TouchableOpacity
      activeOpacity={
        0.76
      }

      onPress={
        onPress
      }

      style={
        styles.timeSelectRow
      }
    >
      <View
        style={
          styles.timeSelectLeft
        }
      >
        <View
          style={
            styles.timeSelectIcon
          }
        >
          <Ionicons
            name="time-outline"

            size={
              18
            }

            color={
              COLORS.teal
            }
          />
        </View>


        <Text
          style={
            styles.timeSelectLabel
          }
        >
          {label}
        </Text>
      </View>


      <View
        style={
          styles.timeSelectValueBox
        }
      >
        <Text
          style={[
            styles.timeSelectValue,

            !value &&
              styles.timeSelectPlaceholder,
          ]}
        >
          {
            value
              ? formatTime(
                  value
                )
              : 'Select time'
          }
        </Text>


        <Ionicons
          name="chevron-down"

          size={
            17
          }

          color={
            COLORS.maroon
          }
        />
      </View>
    </TouchableOpacity>
  );
}


/*
|--------------------------------------------------------------------------
| Time Picker Modal
|--------------------------------------------------------------------------
|
| IMPORTANT FIX:
|
| The old dropdown was absolutely positioned inside a very small parent.
| Android displayed only part of the list and did not reliably send swipe
| gestures to the nested ScrollView.
|
| This version uses a real FlatList option panel occupying a fixed area.
|
*/

function TimePickerModal({
  visible,
  label,
  hour,
  minute,
  period,
  onHourChange,
  onMinuteChange,
  onPeriodChange,
  onClose,
  onDone,
}) {
  const [
    activeDropdown,
    setActiveDropdown,
  ] =
    useState('');


  /*
  |--------------------------------------------------------------------------
  | Hour Options
  |--------------------------------------------------------------------------
  */

  const hourOptions =
    useMemo(
      () =>
        Array.from(
          {
            length: 12,
          },

          (
            _,
            index
          ) =>
            index + 1
        ),

      []
    );


  /*
  |--------------------------------------------------------------------------
  | Minute Options
  |--------------------------------------------------------------------------
  */

  const minuteOptions =
    useMemo(
      () => {
        const values =
          new Set(
            STANDARD_MINUTES
          );

        values.add(
          String(
            minute
          ).padStart(
            2,
            '0'
          )
        );

        return [
          ...values,
        ].sort(
          (
            a,
            b
          ) =>
            Number(a) -
            Number(b)
        );
      },

      [
        minute,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | Close Picker
  |--------------------------------------------------------------------------
  */

  const closePicker =
    () => {
      setActiveDropdown(
        ''
      );

      onClose();
    };


  /*
  |--------------------------------------------------------------------------
  | Apply Time
  |--------------------------------------------------------------------------
  */

  const applyTime =
    () => {
      setActiveDropdown(
        ''
      );

      onDone();
    };


  /*
  |--------------------------------------------------------------------------
  | Dropdown Configuration
  |--------------------------------------------------------------------------
  */

  const dropdownConfig =
    useMemo(
      () => {
        switch (
          activeDropdown
        ) {
          case 'hour':
            return {
              title:
                'Select Hour',

              options:
                hourOptions,

              selectedValue:
                hour,

              formatter:
                value =>
                  String(
                    value
                  ),

              onSelect:
                value => {
                  onHourChange(
                    Number(
                      value
                    )
                  );

                  setActiveDropdown(
                    ''
                  );
                },
            };


          case 'minute':
            return {
              title:
                'Select Minute',

              options:
                minuteOptions,

              selectedValue:
                String(
                  minute
                ).padStart(
                  2,
                  '0'
                ),

              formatter:
                value =>
                  `:${String(
                    value
                  ).padStart(
                    2,
                    '0'
                  )}`,

              onSelect:
                value => {
                  onMinuteChange(
                    String(
                      value
                    ).padStart(
                      2,
                      '0'
                    )
                  );

                  setActiveDropdown(
                    ''
                  );
                },
            };


          case 'period':
            return {
              title:
                'Select Period',

              options: [
                'AM',
                'PM',
              ],

              selectedValue:
                period,

              formatter:
                value =>
                  String(
                    value
                  ),

              onSelect:
                value => {
                  onPeriodChange(
                    value
                  );

                  setActiveDropdown(
                    ''
                  );
                },
            };


          default:
            return null;
        }
      },

      [
        activeDropdown,
        hour,
        hourOptions,
        minute,
        minuteOptions,
        onHourChange,
        onMinuteChange,
        onPeriodChange,
        period,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <Modal
      visible={
        visible
      }

      transparent

      animationType="fade"

      statusBarTranslucent

      onRequestClose={
        closePicker
      }
    >
      <View
        style={
          styles.timePickerOverlay
        }
      >
        <Pressable
          style={
            styles.modalBackdrop
          }

          onPress={
            closePicker
          }
        />


        {
          dropdownConfig
            ? (
                <DropdownOptionPanel
                  key={
                    activeDropdown
                  }

                  title={
                    dropdownConfig
                      .title
                  }

                  options={
                    dropdownConfig
                      .options
                  }

                  selectedValue={
                    dropdownConfig
                      .selectedValue
                  }

                  formatter={
                    dropdownConfig
                      .formatter
                  }

                  onSelect={
                    dropdownConfig
                      .onSelect
                  }

                  onClose={() =>
                    setActiveDropdown(
                      ''
                    )
                  }
                />
              )
            : (
                <View
                  style={
                    styles.timePickerCard
                  }
                >
                  <View
                    style={
                      styles.timePickerHeader
                    }
                  >
                    <View
                      style={
                        styles.timePickerHeaderCopy
                      }
                    >
                      <Text
                        style={
                          styles.timePickerEyebrow
                        }
                      >
                        SELECT TIME
                      </Text>


                      <Text
                        style={
                          styles.timePickerTitle
                        }
                      >
                        {label}
                      </Text>
                    </View>


                    <TouchableOpacity
                      activeOpacity={
                        0.7
                      }

                      onPress={
                        closePicker
                      }

                      style={
                        styles.modalCloseButton
                      }
                    >
                      <Ionicons
                        name="close"

                        size={
                          21
                        }

                        color={
                          COLORS.maroon
                        }
                      />
                    </TouchableOpacity>
                  </View>


                  {/* ========================================================
                      TIME PREVIEW
                  ========================================================= */}

                  <View
                    style={
                      styles.timePreview
                    }
                  >
                    <Ionicons
                      name="time-outline"

                      size={
                        22
                      }

                      color={
                        COLORS.yellow
                      }
                    />


                    <Text
                      style={
                        styles.timePreviewText
                      }
                    >
                      {hour}:{String(minute).padStart(2, '0')} {period}
                    </Text>
                  </View>


                  {/* ========================================================
                      DROPDOWNS
                  ========================================================= */}

                  <View
                    style={
                      styles.timeFieldsRow
                    }
                  >
                    <TimeDropdownField
                      label="Hour"

                      value={
                        hour
                      }

                      onPress={() =>
                        setActiveDropdown(
                          'hour'
                        )
                      }
                    />


                    <TimeDropdownField
                      label="Minute"

                      value={
                        String(
                          minute
                        ).padStart(
                          2,
                          '0'
                        )
                      }

                      onPress={() =>
                        setActiveDropdown(
                          'minute'
                        )
                      }
                    />


                    <TimeDropdownField
                      label="Period"

                      value={
                        period
                      }

                      onPress={() =>
                        setActiveDropdown(
                          'period'
                        )
                      }
                    />
                  </View>


                  <Text
                    style={
                      styles.timePickerHelp
                    }
                  >
                    Tap Hour, Minute, or Period to choose a value.
                  </Text>


                  {/* ========================================================
                      BUTTONS
                  ========================================================= */}

                  <View
                    style={
                      styles.timePickerActions
                    }
                  >
                    <TouchableOpacity
                      activeOpacity={
                        0.75
                      }

                      onPress={
                        closePicker
                      }

                      style={
                        styles.cancelButton
                      }
                    >
                      <Text
                        style={
                          styles.cancelButtonText
                        }
                      >
                        Cancel
                      </Text>
                    </TouchableOpacity>


                    <TouchableOpacity
                      activeOpacity={
                        0.82
                      }

                      onPress={
                        applyTime
                      }

                      style={
                        styles.applyButton
                      }
                    >
                      <Ionicons
                        name="checkmark"

                        size={
                          20
                        }

                        color={
                          COLORS.white
                        }
                      />


                      <Text
                        style={
                          styles.applyButtonText
                        }
                      >
                        Apply
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )
        }
      </View>
    </Modal>
  );
}


/*
|--------------------------------------------------------------------------
| Dropdown Field
|--------------------------------------------------------------------------
*/

function TimeDropdownField({
  label,
  value,
  onPress,
}) {
  return (
    <View
      style={
        styles.timeFieldWrap
      }
    >
      <Text
        style={
          styles.timeFieldLabel
        }
      >
        {label}
      </Text>


      <TouchableOpacity
        activeOpacity={
          0.75
        }

        onPress={
          onPress
        }

        style={
          styles.timeField
        }
      >
        <Text
          style={
            styles.timeFieldText
          }
        >
          {value}
        </Text>


        <Ionicons
          name="chevron-down"

          size={
            17
          }

          color={
            COLORS.teal
          }
        />
      </TouchableOpacity>
    </View>
  );
}


/*
|--------------------------------------------------------------------------
| Real Scrollable Dropdown Panel
|--------------------------------------------------------------------------
|
| The list below has its OWN fixed viewport.
| It is no longer an absolutely positioned child of the Hour field.
|
| Therefore Android can scroll:
|
| 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
|
*/

function DropdownOptionPanel({
  title,
  options,
  selectedValue,
  formatter,
  onSelect,
  onClose,
}) {
  const selectedIndex =
    Math.max(
      options.findIndex(
        option =>
          String(
            option
          ) ===
          String(
            selectedValue
          )
      ),

      0
    );


  return (
    <View
      style={
        styles.optionPanel
      }
    >
      <View
        style={
          styles.optionPanelHandle
        }
      />


      <View
        style={
          styles.optionPanelHeader
        }
      >
        <View
          style={
            styles.optionPanelHeaderCopy
          }
        >
          <Text
            style={
              styles.optionPanelEyebrow
            }
          >
            ATTENDANCE TIME
          </Text>


          <Text
            style={
              styles.optionPanelTitle
            }
          >
            {title}
          </Text>
        </View>


        <TouchableOpacity
          activeOpacity={
            0.7
          }

          onPress={
            onClose
          }

          style={
            styles.modalCloseButton
          }
        >
          <Ionicons
            name="close"

            size={
              21
            }

            color={
              COLORS.maroon
            }
          />
        </TouchableOpacity>
      </View>


      {/* ==================================================================
          REAL SCROLLING LIST
      =================================================================== */}

      <FlatList
        key={
          title
        }

        data={
          options
        }

        keyExtractor={
          item =>
            String(
              item
            )
        }

        style={
          styles.optionList
        }

        contentContainerStyle={
          styles.optionListContent
        }

        showsVerticalScrollIndicator={
          true
        }

        persistentScrollbar={
          true
        }

        keyboardShouldPersistTaps="always"

        scrollEnabled={
          true
        }

        nestedScrollEnabled={
          true
        }

        bounces={
          false
        }

        overScrollMode="always"

        removeClippedSubviews={
          false
        }

        initialNumToRender={
          12
        }

        maxToRenderPerBatch={
          12
        }

        windowSize={
          15
        }

        getItemLayout={(
          _,
          index
        ) => ({
          length:
            60,

          offset:
            60 *
            index,

          index,
        })}

        initialScrollIndex={
          selectedIndex >
          4
            ? Math.max(
                selectedIndex -
                2,

                0
              )
            : 0
        }

        onScrollToIndexFailed={() => {}}

        renderItem={({
          item,
        }) => {
          const active =
            String(
              item
            ) ===
            String(
              selectedValue
            );

          return (
            <TouchableOpacity
              activeOpacity={
                0.7
              }

              onPress={() =>
                onSelect(
                  item
                )
              }

              style={[
                styles.optionItem,

                active &&
                  styles.optionItemActive,
              ]}
            >
              <Text
                style={[
                  styles.optionItemText,

                  active &&
                    styles.optionItemTextActive,
                ]}
              >
                {
                  formatter(
                    item
                  )
                }
              </Text>


              {
                active
                  ? (
                      <View
                        style={
                          styles.optionCheck
                        }
                      >
                        <Ionicons
                          name="checkmark"

                          size={
                            18
                          }

                          color={
                            COLORS.white
                          }
                        />
                      </View>
                    )
                  : null
              }
            </TouchableOpacity>
          );
        }}
      />


      <View
        style={
          styles.optionHint
        }
      >
        <Ionicons
          name="swap-vertical-outline"

          size={
            17
          }

          color={
            COLORS.teal
          }
        />


        <Text
          style={
            styles.optionHintText
          }
        >
          Swipe up or down to see all choices.
        </Text>
      </View>
    </View>
  );
}


/*
|--------------------------------------------------------------------------
| Styles
|--------------------------------------------------------------------------
*/

const styles =
  StyleSheet.create({

    safeArea: {
      flex: 1,

      backgroundColor:
        COLORS.page,
    },


    loadingPage: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.page,
    },


    loadingTitle: {
      marginTop:
        14,

      color:
        COLORS.maroon,

      fontSize:
        18,

      fontWeight:
        '900',
    },


    /*
    |--------------------------------------------------------------------------
    | Hero
    |--------------------------------------------------------------------------
    */

    hero: {
      paddingTop:
        22,

      paddingHorizontal:
        20,

      paddingBottom:
        22,

      backgroundColor:
        COLORS.maroon,

      borderBottomLeftRadius:
        28,

      borderBottomRightRadius:
        28,
    },


    heroTopRow: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      justifyContent:
        'space-between',
    },


    heroCopy: {
      flex:
        1,

      paddingRight:
        14,
    },


    heroEyebrow: {
      color:
        COLORS.yellow,

      fontSize:
        11,

      fontWeight:
        '900',

      letterSpacing:
        1.2,
    },


    heroTitle: {
      marginTop:
        4,

      color:
        COLORS.white,

      fontSize:
        30,

      lineHeight:
        36,

      fontWeight:
        '900',
    },


    heroText: {
      marginTop:
        7,

      color:
        'rgba(255,255,255,0.72)',

      fontSize:
        13,

      lineHeight:
        19,
    },


    heroIcon: {
      width:
        50,

      height:
        50,

      borderRadius:
        16,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.yellow,
    },


    heroInfoRow: {
      marginTop:
        18,

      flexDirection:
        'row',

      gap:
        9,
    },


    infoPill: {
      flex:
        1,

      minHeight:
        58,

      paddingHorizontal:
        11,

      borderRadius:
        15,

      flexDirection:
        'row',

      alignItems:
        'center',

      backgroundColor:
        'rgba(0,13,18,0.18)',
    },


    infoPillCopy: {
      flex:
        1,

      minWidth:
        0,

      marginLeft:
        8,
    },


    infoPillLabel: {
      color:
        'rgba(255,255,255,0.52)',

      fontSize:
        9.5,

      fontWeight:
        '700',
    },


    infoPillValue: {
      marginTop:
        2,

      color:
        COLORS.white,

      fontSize:
        11.5,

      fontWeight:
        '900',
    },


    /*
    |--------------------------------------------------------------------------
    | Main Content
    |--------------------------------------------------------------------------
    */

    content: {
      paddingHorizontal:
        16,
    },


    errorBox: {
      marginTop:
        16,

      padding:
        12,

      borderRadius:
        14,

      flexDirection:
        'row',

      alignItems:
        'center',

      backgroundColor:
        COLORS.softMaroon,

      borderWidth:
        1,

      borderColor:
        'rgba(104,17,15,0.16)',
    },


    errorText: {
      flex:
        1,

      marginLeft:
        8,

      color:
        COLORS.maroon,

      fontSize:
        12,

      lineHeight:
        17,
    },


    label: {
      marginTop:
        20,

      marginBottom:
        8,

      color:
        COLORS.maroon,

      fontSize:
        10.5,

      fontWeight:
        '900',

      letterSpacing:
        0.8,
    },


    /*
    |--------------------------------------------------------------------------
    | Component Selection
    |--------------------------------------------------------------------------
    */

    componentRow: {
      flexDirection:
        'row',

      gap:
        8,
    },


    componentButton: {
      flex:
        1,

      minHeight:
        46,

      borderRadius:
        14,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.white,

      borderWidth:
        1,

      borderColor:
        COLORS.border,
    },


    componentButtonActive: {
      backgroundColor:
        COLORS.maroon,

      borderColor:
        COLORS.maroon,
    },


    componentButtonText: {
      marginLeft:
        6,

      color:
        COLORS.teal,

      fontSize:
        12,

      fontWeight:
        '900',
    },


    componentButtonTextActive: {
      color:
        COLORS.white,
    },


    /*
    |--------------------------------------------------------------------------
    | Section Heading
    |--------------------------------------------------------------------------
    */

    sectionTitleWrap: {
      marginTop:
        26,

      marginBottom:
        10,
    },


    sectionEyebrow: {
      color:
        COLORS.orange,

      fontSize:
        10,

      fontWeight:
        '900',

      letterSpacing:
        1,
    },


    sectionTitle: {
      marginTop:
        2,

      color:
        COLORS.black,

      fontSize:
        21,

      fontWeight:
        '900',
    },


    /*
    |--------------------------------------------------------------------------
    | No Schedule Card
    |--------------------------------------------------------------------------
    */

    emptyCard: {
      padding:
        22,

      borderRadius:
        20,

      alignItems:
        'center',

      backgroundColor:
        COLORS.white,

      borderWidth:
        1,

      borderColor:
        COLORS.border,
    },


    emptyIcon: {
      width:
        58,

      height:
        58,

      borderRadius:
        18,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.softYellow,
    },


    emptyTitle: {
      marginTop:
        12,

      color:
        COLORS.black,

      fontSize:
        16,

      fontWeight:
        '900',
    },


    emptyText: {
      maxWidth:
        300,

      marginTop:
        6,

      color:
        COLORS.muted,

      fontSize:
        12,

      lineHeight:
        18,

      textAlign:
        'center',
    },


    primaryButton: {
      width:
        '100%',

      minHeight:
        50,

      marginTop:
        16,

      borderRadius:
        14,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.green,
    },


    primaryButtonText: {
      marginLeft:
        7,

      color:
        COLORS.white,

      fontSize:
        12.5,

      fontWeight:
        '900',
    },


    /*
    |--------------------------------------------------------------------------
    | Schedule Card
    |--------------------------------------------------------------------------
    */

    scheduleCard: {
      padding:
        15,

      borderRadius:
        20,

      backgroundColor:
        COLORS.white,

      borderWidth:
        1,

      borderColor:
        'rgba(88,118,28,0.20)',
    },


    scheduleStatusRow: {
      paddingBottom:
        13,

      marginBottom:
        12,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderBottomWidth:
        1,

      borderBottomColor:
        COLORS.border,
    },


    scheduleStatusIcon: {
      width:
        38,

      height:
        38,

      borderRadius:
        12,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.green,
    },


    scheduleStatusCopy: {
      flex:
        1,

      marginLeft:
        10,
    },


    scheduleStatusTitle: {
      color:
        COLORS.black,

      fontSize:
        13.5,

      fontWeight:
        '900',
    },


    scheduleStatusText: {
      marginTop:
        2,

      color:
        COLORS.muted,

      fontSize:
        11,
    },


    scheduleGroup: {
      marginTop:
        8,
    },


    scheduleGroupTitle: {
      marginBottom:
        7,

      color:
        COLORS.maroon,

      fontSize:
        10.5,

      fontWeight:
        '900',

      letterSpacing:
        0.8,
    },


    scheduleRow: {
      minHeight:
        44,

      paddingHorizontal:
        11,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      borderRadius:
        10,

      backgroundColor:
        COLORS.page,

      marginBottom:
        6,
    },


    scheduleRowLabel: {
      color:
        COLORS.muted,

      fontSize:
        11.5,

      fontWeight:
        '700',
    },


    scheduleRowValue: {
      color:
        COLORS.black,

      fontSize:
        12.5,

      fontWeight:
        '900',
    },


    scheduleActions: {
      marginTop:
        10,

      flexDirection:
        'row',

      gap:
        8,
    },


    editButton: {
      flex:
        1,

      minHeight:
        46,

      borderRadius:
        13,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.green,
    },


    editButtonText: {
      marginLeft:
        6,

      color:
        COLORS.white,

      fontSize:
        12,

      fontWeight:
        '900',
    },


    removeButton: {
      flex:
        1,

      minHeight:
        46,

      borderRadius:
        13,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.softMaroon,
    },


    removeButtonText: {
      marginLeft:
        6,

      color:
        COLORS.maroon,

      fontSize:
        12,

      fontWeight:
        '900',
    },


    /*
    |--------------------------------------------------------------------------
    | Scanner
    |--------------------------------------------------------------------------
    */

    scannerCard: {
      padding:
        14,

      borderRadius:
        20,

      backgroundColor:
        COLORS.white,

      borderWidth:
        1,

      borderColor:
        COLORS.border,
    },


    scannerHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },


    scannerHeaderLeft: {
      flex:
        1,

      minWidth:
        0,

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    scannerHeaderIcon: {
      width:
        44,

      height:
        44,

      borderRadius:
        14,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.softMaroon,
    },


    scannerHeaderCopy: {
      flex:
        1,

      minWidth:
        0,

      marginLeft:
        9,
    },


    scannerTitle: {
      color:
        COLORS.black,

      fontSize:
        14,

      fontWeight:
        '900',
    },


    scannerSubtitle: {
      marginTop:
        2,

      color:
        COLORS.muted,

      fontSize:
        10.5,

      lineHeight:
        14,
    },


    statusBadge: {
      minHeight:
        29,

      marginLeft:
        8,

      paddingHorizontal:
        8,

      borderRadius:
        10,

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    statusBadgeReady: {
      backgroundColor:
        COLORS.softGreen,
    },


    statusBadgeLocked: {
      backgroundColor:
        COLORS.softYellow,
    },


    statusDot: {
      width:
        7,

      height:
        7,

      marginRight:
        5,

      borderRadius:
        4,
    },


    statusBadgeText: {
      fontSize:
        9.5,

      fontWeight:
        '900',

      letterSpacing:
        0.3,
    },


    scannerClosed: {
      marginTop:
        13,

      paddingHorizontal:
        18,

      paddingTop:
        23,

      paddingBottom:
        17,

      borderRadius:
        18,

      alignItems:
        'center',

      backgroundColor:
        '#101B1F',
    },


    scannerClosedTitle: {
      marginTop:
        11,

      color:
        COLORS.white,

      fontSize:
        16,

      fontWeight:
        '900',
    },


    scannerClosedText: {
      maxWidth:
        285,

      marginTop:
        5,

      color:
        'rgba(255,255,255,0.62)',

      fontSize:
        11.5,

      lineHeight:
        17,

      textAlign:
        'center',
    },


    scanButton: {
      width:
        '100%',

      minHeight:
        51,

      marginTop:
        16,

      borderRadius:
        14,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.green,
    },


    scanButtonText: {
      marginLeft:
        7,

      color:
        COLORS.white,

      fontSize:
        12.5,

      fontWeight:
        '900',
    },


    disabledButton: {
      opacity:
        0.45,
    },


    cameraShell: {
      marginTop:
        13,

      padding:
        6,

      borderRadius:
        22,

      backgroundColor:
        COLORS.black,
    },


    cameraWindow: {
      position:
        'relative',

      height:
        420,

      overflow:
        'hidden',

      borderRadius:
        17,

      backgroundColor:
        '#101B1F',
    },


    cameraPlaceholder: {
      ...StyleSheet.absoluteFillObject,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        28,

      backgroundColor:
        '#101B1F',
    },


    cameraPlaceholderTitle: {
      marginTop:
        12,

      color:
        COLORS.white,

      fontSize:
        18,

      fontWeight:
        '900',
    },


    cameraPlaceholderText: {
      maxWidth:
        280,

      marginTop:
        5,

      color:
        'rgba(255,255,255,0.60)',

      fontSize:
        11.5,

      lineHeight:
        17,

      textAlign:
        'center',
    },


    scanFrame: {
      position:
        'absolute',

      width:
        240,

      height:
        240,

      top:
        '50%',

      left:
        '50%',

      marginTop:
        -120,

      marginLeft:
        -120,
    },


    scanCorner: {
      position:
        'absolute',

      width:
        48,

      height:
        48,

      borderColor:
        COLORS.yellow,
    },


    scanCornerTopLeft: {
      top:
        0,

      left:
        0,

      borderTopWidth:
        5,

      borderLeftWidth:
        5,

      borderTopLeftRadius:
        14,
    },


    scanCornerTopRight: {
      top:
        0,

      right:
        0,

      borderTopWidth:
        5,

      borderRightWidth:
        5,

      borderTopRightRadius:
        14,
    },


    scanCornerBottomLeft: {
      bottom:
        0,

      left:
        0,

      borderBottomWidth:
        5,

      borderLeftWidth:
        5,

      borderBottomLeftRadius:
        14,
    },


    scanCornerBottomRight: {
      right:
        0,

      bottom:
        0,

      borderBottomWidth:
        5,

      borderRightWidth:
        5,

      borderBottomRightRadius:
        14,
    },


    scanMessage: {
      minHeight:
        58,

      marginTop:
        10,

      padding:
        10,

      borderRadius:
        14,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderWidth:
        1,
    },


    scanMessageSuccess: {
      backgroundColor:
        '#F8FAF5',

      borderColor:
        'rgba(88,118,28,0.22)',
    },


    scanMessageError: {
      backgroundColor:
        '#FCF7F7',

      borderColor:
        'rgba(104,17,15,0.22)',
    },


    scanMessageText: {
      flex:
        1,

      marginLeft:
        8,

      fontSize:
        11.5,

      lineHeight:
        16,

      fontWeight:
        '700',
    },


    scannerActions: {
      marginTop:
        11,

      flexDirection:
        'row',

      gap:
        9,
    },


    secondaryButton: {
      flex:
        0.9,

      minHeight:
        50,

      borderRadius:
        14,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.softTeal,
    },


    secondaryButtonText: {
      marginLeft:
        6,

      color:
        COLORS.teal,

      fontSize:
        11.5,

      fontWeight:
        '900',
    },


    startButton: {
      flex:
        1.35,

      minHeight:
        50,

      borderRadius:
        14,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.green,
    },


    stopButton: {
      flex:
        1.35,

      minHeight:
        50,

      borderRadius:
        14,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.maroon,
    },


    actionButtonText: {
      marginLeft:
        7,

      color:
        COLORS.white,

      fontSize:
        11.5,

      fontWeight:
        '900',
    },


    /*
    |--------------------------------------------------------------------------
    | Records Button
    |--------------------------------------------------------------------------
    */

    recordsButton: {
      minHeight:
        84,

      marginTop:
        16,

      padding:
        13,

      borderRadius:
        19,

      flexDirection:
        'row',

      alignItems:
        'center',

      backgroundColor:
        COLORS.white,

      borderWidth:
        1,

      borderColor:
        COLORS.border,
    },


    recordsIcon: {
      width:
        48,

      height:
        48,

      borderRadius:
        15,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.softMaroon,
    },


    recordsCopy: {
      flex:
        1,

      marginHorizontal:
        11,
    },


    recordsEyebrow: {
      color:
        COLORS.orange,

      fontSize:
        10,

      fontWeight:
        '900',

      letterSpacing:
        0.7,
    },


    recordsTitle: {
      marginTop:
        3,

      color:
        COLORS.black,

      fontSize:
        13.5,

      fontWeight:
        '900',
    },


    recordsText: {
      marginTop:
        3,

      color:
        COLORS.muted,

      fontSize:
        10.5,
    },


    /*
    |--------------------------------------------------------------------------
    | Modals
    |--------------------------------------------------------------------------
    */

    scheduleModalOverlay: {
      flex:
        1,

      justifyContent:
        'flex-end',
    },


    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,

      backgroundColor:
        'rgba(0,13,18,0.62)',
    },


    scheduleModalSheet: {
      maxHeight:
        '88%',

      paddingTop:
        8,

      paddingHorizontal:
        17,

      borderTopLeftRadius:
        26,

      borderTopRightRadius:
        26,

      backgroundColor:
        COLORS.cream,
    },


    modalHandle: {
      width:
        42,

      height:
        4,

      alignSelf:
        'center',

      marginBottom:
        11,

      borderRadius:
        2,

      backgroundColor:
        COLORS.border,
    },


    scheduleModalHeader: {
      paddingBottom:
        13,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      borderBottomWidth:
        1,

      borderBottomColor:
        COLORS.border,
    },


    scheduleModalHeaderCopy: {
      flex:
        1,

      paddingRight:
        10,
    },


    scheduleModalEyebrow: {
      color:
        COLORS.orange,

      fontSize:
        10.5,

      fontWeight:
        '900',

      letterSpacing:
        0.8,
    },


    scheduleModalTitle: {
      marginTop:
        3,

      color:
        COLORS.maroon,

      fontSize:
        23,

      fontWeight:
        '900',
    },


    scheduleModalText: {
      marginTop:
        4,

      color:
        COLORS.muted,

      fontSize:
        12.5,
    },


    modalCloseButton: {
      width:
        42,

      height:
        42,

      borderRadius:
        13,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.white,

      borderWidth:
        1,

      borderColor:
        COLORS.border,
    },


    scheduleModalContent: {
      paddingTop:
        14,

      paddingBottom:
        10,
    },


    scheduleModalGroupTitle: {
      marginBottom:
        8,

      color:
        COLORS.maroon,

      fontSize:
        11,

      fontWeight:
        '900',

      letterSpacing:
        1,
    },


    scheduleModalGroupSpacing: {
      marginTop:
        18,
    },


    /*
    |--------------------------------------------------------------------------
    | Schedule Time Rows
    |--------------------------------------------------------------------------
    */

    timeSelectRow: {
      minHeight:
        60,

      marginBottom:
        8,

      paddingHorizontal:
        12,

      borderRadius:
        13,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      backgroundColor:
        COLORS.white,

      borderWidth:
        1,

      borderColor:
        COLORS.border,
    },


    timeSelectLeft: {
      flex:
        1,

      minWidth:
        0,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingRight:
        8,
    },


    timeSelectIcon: {
      width:
        34,

      height:
        34,

      borderRadius:
        10,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.softTeal,
    },


    timeSelectLabel: {
      flex:
        1,

      marginLeft:
        8,

      color:
        COLORS.teal,

      fontSize:
        13,

      fontWeight:
        '800',
    },


    timeSelectValueBox: {
      minWidth:
        118,

      height:
        40,

      paddingHorizontal:
        10,

      borderRadius:
        10,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      backgroundColor:
        COLORS.cream,

      borderWidth:
        1,

      borderColor:
        COLORS.border,
    },


    timeSelectValue: {
      color:
        COLORS.maroon,

      fontSize:
        13,

      fontWeight:
        '900',
    },


    timeSelectPlaceholder: {
      color:
        COLORS.muted,

      fontWeight:
        '700',
    },


    saveScheduleButton: {
      minHeight:
        52,

      marginTop:
        20,

      borderRadius:
        14,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.green,
    },


    saveScheduleButtonText: {
      marginLeft:
        8,

      color:
        COLORS.white,

      fontSize:
        13,

      fontWeight:
        '900',
    },


    /*
    |--------------------------------------------------------------------------
    | Main Time Picker
    |--------------------------------------------------------------------------
    */

    timePickerOverlay: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        18,
    },


    timePickerCard: {
      width:
        '100%',

      maxWidth:
        430,

      padding:
        18,

      borderRadius:
        21,

      backgroundColor:
        COLORS.cream,

      elevation:
        22,
    },


    timePickerHeader: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',
    },


    timePickerHeaderCopy: {
      flex:
        1,

      paddingRight:
        10,
    },


    timePickerEyebrow: {
      color:
        COLORS.orange,

      fontSize:
        10.5,

      fontWeight:
        '900',

      letterSpacing:
        0.9,
    },


    timePickerTitle: {
      marginTop:
        3,

      color:
        COLORS.maroon,

      fontSize:
        21,

      lineHeight:
        27,

      fontWeight:
        '900',
    },


    timePreview: {
      height:
        66,

      marginTop:
        16,

      marginBottom:
        17,

      borderRadius:
        14,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.maroon,
    },


    timePreviewText: {
      marginLeft:
        8,

      color:
        COLORS.white,

      fontSize:
        25,

      fontWeight:
        '900',
    },


    timeFieldsRow: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        8,
    },


    timeFieldWrap: {
      flex:
        1,
    },


    timeFieldLabel: {
      marginBottom:
        6,

      color:
        COLORS.muted,

      fontSize:
        10.5,

      fontWeight:
        '900',

      textTransform:
        'uppercase',

      letterSpacing:
        0.5,
    },


    timeField: {
      height:
        48,

      paddingHorizontal:
        11,

      borderRadius:
        11,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      backgroundColor:
        COLORS.white,

      borderWidth:
        1,

      borderColor:
        COLORS.border,
    },


    timeFieldText: {
      color:
        COLORS.teal,

      fontSize:
        15,

      fontWeight:
        '900',
    },


    timePickerHelp: {
      marginTop:
        14,

      color:
        COLORS.muted,

      fontSize:
        11.5,

      lineHeight:
        16,

      textAlign:
        'center',
    },


    timePickerActions: {
      marginTop:
        16,

      flexDirection:
        'row',

      gap:
        10,
    },


    cancelButton: {
      flex:
        1,

      height:
        48,

      borderRadius:
        12,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.white,

      borderWidth:
        1,

      borderColor:
        COLORS.border,
    },


    cancelButtonText: {
      color:
        COLORS.teal,

      fontSize:
        13,

      fontWeight:
        '900',
    },


    applyButton: {
      flex:
        1.35,

      height:
        48,

      borderRadius:
        12,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.green,
    },


    applyButtonText: {
      marginLeft:
        6,

      color:
        COLORS.white,

      fontSize:
        13,

      fontWeight:
        '900',
    },


    /*
    |--------------------------------------------------------------------------
    | REAL Android-Safe Scrollable Dropdown
    |--------------------------------------------------------------------------
    */

    optionPanel: {
      width:
        '100%',

      maxWidth:
        430,

      maxHeight:
        '74%',

      paddingTop:
        8,

      paddingHorizontal:
        18,

      paddingBottom:
        18,

      borderRadius:
        22,

      backgroundColor:
        COLORS.cream,

      elevation:
        24,
    },


    optionPanelHandle: {
      width:
        42,

      height:
        4,

      alignSelf:
        'center',

      marginBottom:
        10,

      borderRadius:
        2,

      backgroundColor:
        COLORS.border,
    },


    optionPanelHeader: {
      minHeight:
        66,

      paddingBottom:
        11,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderBottomWidth:
        1,

      borderBottomColor:
        COLORS.border,
    },


    optionPanelHeaderCopy: {
      flex:
        1,

      paddingRight:
        10,
    },


    optionPanelEyebrow: {
      color:
        COLORS.orange,

      fontSize:
        10.5,

      fontWeight:
        '900',

      letterSpacing:
        0.9,
    },


    optionPanelTitle: {
      marginTop:
        4,

      color:
        COLORS.maroon,

      fontSize:
        22,

      fontWeight:
        '900',
    },


    /*
    |--------------------------------------------------------------------------
    | IMPORTANT
    |--------------------------------------------------------------------------
    |
    | The FlatList has a REAL fixed scrolling viewport.
    |
    | This is what fixes the issue where only 1-5 appeared.
    |
    */

    optionList: {
      height:
        330,

      marginTop:
        12,
    },


    optionListContent: {
      paddingBottom:
        8,
    },


    optionItem: {
      height:
        54,

      marginBottom:
        6,

      paddingHorizontal:
        16,

      borderRadius:
        13,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      backgroundColor:
        COLORS.white,

      borderWidth:
        1,

      borderColor:
        COLORS.border,
    },


    optionItemActive: {
      backgroundColor:
        COLORS.softGreen,

      borderColor:
        'rgba(88,118,28,0.35)',
    },


    optionItemText: {
      color:
        COLORS.teal,

      fontSize:
        17,

      fontWeight:
        '800',
    },


    optionItemTextActive: {
      color:
        COLORS.green,

      fontWeight:
        '900',
    },


    optionCheck: {
      width:
        30,

      height:
        30,

      borderRadius:
        10,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.green,
    },


    optionHint: {
      minHeight:
        42,

      marginTop:
        4,

      paddingHorizontal:
        12,

      borderRadius:
        12,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.softTeal,
    },


    optionHintText: {
      marginLeft:
        7,

      color:
        COLORS.teal,

      fontSize:
        11.5,

      fontWeight:
        '700',
    },
  });
