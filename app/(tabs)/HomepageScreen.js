import Ionicons from '@expo/vector-icons/Ionicons';
import {
  CameraView,
  useCameraPermissions,
} from 'expo-camera';

import { router } from 'expo-router';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
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
  getAdminDashboard,
  getAttendance,
  scanAttendance,
} from '../../services/api';


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

  creamLight: '#F8F5EF',
  maroonSoft: '#F4E7E5',
  greenSoft: '#ECF0E3',
  yellowSoft: '#FFF3D2',
  orangeSoft: '#F9ECD1',
  tealSoft: '#E6ECEE',

  border: '#DDD6CC',
  muted: '#776F69',
};


const NSTP_LOGO = require(
  '../../assets/images/nstphub_logo.png'
);


const QR_PREFIX =
  'NSTPHUB:ATTENDANCE:';


function normalizeComponent(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase();
}


function extractQrToken(value) {
  const raw =
    String(value ?? '')
      .trim();

  if (!raw) {
    return '';
  }


  if (
    raw
      .toUpperCase()
      .startsWith(QR_PREFIX)
  ) {
    return raw
      .slice(QR_PREFIX.length)
      .trim();
  }


  try {
    const parsed =
      JSON.parse(raw);

    const candidate =
      String(
        parsed?.qr_token ??
        parsed?.token ??
        parsed?.student_token ??
        ''
      ).trim();


    if (
      candidate
        .toUpperCase()
        .startsWith(QR_PREFIX)
    ) {
      return candidate
        .slice(QR_PREFIX.length)
        .trim();
    }


    return candidate;

  } catch {
    return raw;
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


function scheduleIsReady(schedule) {
  return Boolean(
    schedule?.configured
    ??
    schedule?.is_configured
    ??
    schedule?.id
  );
}


function formatBackendDate(value) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/
      .test(
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


function formatDeviceTodayLabel(value = new Date()) {
  return value.toLocaleDateString(
    'en-US',
    {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }
  );
}


function formatScheduleTime(value) {
  const match =
    String(
      value ?? ''
    ).match(
      /^(\d{2}):(\d{2})/
    );


  if (!match) {
    return 'Not set';
  }


  let hour =
    Number(
      match[1]
    );

  const minute =
    match[2];


  if (
    hour < 0 ||
    hour > 23
  ) {
    return 'Not set';
  }


  const period =
    hour >= 12
      ? 'PM'
      : 'AM';


  hour =
    hour % 12 ||
    12;


  return (
    `${hour}:${minute} ${period}`
  );
}


export default function HomepageScreen() {
  const scanInFlightRef = useRef(false);

  const insets =
    useSafeAreaInsets();


  const [
    permission,
    requestPermission,
  ] =
    useCameraPermissions();


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
    error,
    setError,
  ] =
    useState('');


  const [
    selectedComponent,
    setSelectedComponent,
  ] =
    useState('');


  const [
    failedUniversityLogoUrl,
    setFailedUniversityLogoUrl,
  ] =
    useState('');


  /*
  |--------------------------------------------------------------------------
  | HOME SCANNER STATE
  |--------------------------------------------------------------------------
  */

  const [
    scannerVisible,
    setScannerVisible,
  ] =
    useState(false);


  const [
    scannerLoading,
    setScannerLoading,
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
    scannerComponent,
    setScannerComponent,
  ] =
    useState('');


  const [
    scannerDate,
    setScannerDate,
  ] =
    useState('');


  const [
    scannerSchedule,
    setScannerSchedule,
  ] =
    useState(null);


  const [
    scannerReady,
    setScannerReady,
  ] =
    useState(false);


  const [
    scannerError,
    setScannerError,
  ] =
    useState('');


  const [
    scanType,
    setScanType,
  ] =
    useState('');


  const [
    scanMessage,
    setScanMessage,
  ] =
    useState('');


  const [
    scanResult,
    setScanResult,
  ] =
    useState(null);


  /*
  |--------------------------------------------------------------------------
  | DEVICE CLOCK
  |--------------------------------------------------------------------------
  |
  | The TODAY card and greeting must reflect the phone's actual local date,
  | not a stale or incorrectly configured development-server clock.
  |
  */

  const [
    deviceNow,
    setDeviceNow,
  ] =
    useState(() => new Date());


  useEffect(() => {
    const timer = setInterval(
      () => {
        setDeviceNow(
          new Date()
        );
      },
      30 * 1000
    );

    return () =>
      clearInterval(timer);
  }, []);


  /*
  |--------------------------------------------------------------------------
  | LOAD DASHBOARD
  |--------------------------------------------------------------------------
  */

  const loadDashboard =
    useCallback(
      async (
        manual = false
      ) => {
        try {
          if (manual) {
            setRefreshing(true);
          }


          const result =
            await getAdminDashboard();


          setData(result);
          setError('');


          const options =
            Array.isArray(
              result
                ?.component_context
                ?.options
            )
              ? result
                  .component_context
                  .options
                  .map(
                    normalizeComponent
                  )
                  .filter(Boolean)
              : [];


          const preferred =
            normalizeComponent(
              result
                ?.component_context
                ?.selected
              ??
              options[0]
              ??
              ''
            );


          setSelectedComponent(
            current => {
              const normalizedCurrent =
                normalizeComponent(
                  current
                );


              return options.includes(
                normalizedCurrent
              )
                ? normalizedCurrent
                : preferred;
            }
          );

        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : 'Unable to load dashboard data.';


          setError(message);


          const lowered =
            message.toLowerCase();


          if (
            lowered.includes(
              'logged in'
            )
            ||
            lowered.includes(
              'unauthenticated'
            )
            ||
            lowered.includes(
              'unauthorized'
            )
          ) {
            router.replace(
              '/LoginScreen'
            );
          }

        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );


  /*
  |--------------------------------------------------------------------------
  | AUTO REFRESH
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      loadDashboard();


      const interval =
        setInterval(
          () => {
            loadDashboard(false);
          },
          15000
        );


      return () =>
        clearInterval(
          interval
        );
    },
    [
      loadDashboard,
    ]
  );


  /*
  |--------------------------------------------------------------------------
  | COMPONENTS
  |--------------------------------------------------------------------------
  */

  const componentContext =
    data
      ?.component_context
    ??
    {};


  const componentOptions =
    useMemo(
      () => {
        const options =
          Array.isArray(
            componentContext
              ?.options
          )
            ? componentContext.options
            : [];


        return [
          ...new Set(
            options
              .map(
                normalizeComponent
              )
              .filter(Boolean)
          ),
        ];
      },
      [
        componentContext
          ?.options,
      ]
    );


  const activeComponent =
    normalizeComponent(
      selectedComponent
    )
    ||
    normalizeComponent(
      componentContext
        ?.selected
    )
    ||
    componentOptions[0]
    ||
    '';


  const canSwitchComponent =
    componentOptions.length >
    1;


  /*
  |--------------------------------------------------------------------------
  | DASHBOARD DATA
  |--------------------------------------------------------------------------
  */

  const componentDashboards =
    data
      ?.component_dashboards
    ??
    {};


  const stats =
    (
      activeComponent &&
      componentDashboards
        ?.[activeComponent]
    )
      ? componentDashboards[
          activeComponent
        ]
      : data?.stats ?? {};


  const students =
    Number(
      stats?.students ??
      0
    );


  const present =
    Number(
      stats?.present ??
      0
    );


  const late =
    Number(
      stats?.late ??
      0
    );


  const absent =
    Number(
      stats?.absent ??
      0
    );


  const excused =
    Number(
      stats?.excused ??
      0
    );


  const attendanceRecorded =
    Number(
      stats
        ?.attendance_recorded
      ??
      (
        present +
        late +
        absent +
        excused
      )
    );


  const calculatedRate =
    attendanceRecorded > 0
      ? Math.round(
          (
            (
              present +
              late
            )
            /
            attendanceRecorded
          )
          *
          100
        )
      : 0;


  const safeAttendanceRate =
    Math.min(
      100,
      Math.max(
        0,
        Number(
          stats
            ?.attendance_rate
          ??
          calculatedRate
        )
      )
    );


  const totalExcuseLetters =
    Number(
      stats
        ?.total_excuse_letters
      ??
      0
    );


  const pendingExcuseLetters =
    Number(
      stats
        ?.pending_excuse_letters
      ??
      0
    );


  const approvedExcuseLetters =
    Number(
      stats
        ?.approved_excuse_letters
      ??
      0
    );


  const rejectedExcuseLetters =
    Number(
      stats
        ?.rejected_excuse_letters
      ??
      0
    );


  /*
  |--------------------------------------------------------------------------
  | ACCOUNT
  |--------------------------------------------------------------------------
  */

  const signedInAccount =
    data?.account
    ??
    data?.administrator
    ??
    {};


  const signedInRole =
    String(
      data?.role
      ??
      signedInAccount?.role
      ??
      ''
    )
      .trim()
      .toLowerCase();


  const roleLabel =
    signedInRole ===
    'coordinator-attendance'
      ? 'Attendance Coordinator'
      : signedInRole ===
        'instructor'
        ? 'NSTP Instructor'
        : 'University Administrator';


  const roleIcon =
    signedInRole ===
    'coordinator-attendance'
      ? 'calendar-clear-outline'
      : signedInRole ===
        'instructor'
        ? 'school-outline'
        : 'shield-checkmark-outline';


  const signedInName =
    signedInAccount?.name
    ||
    roleLabel;


  const firstName =
    String(
      signedInName
    )
      .trim()
      .split(/\s+/)[0]
    ||
    'Admin';


  /*
  |--------------------------------------------------------------------------
  | GREETING
  |--------------------------------------------------------------------------
  */

  const greetingHour =
    deviceNow.getHours();


  const greeting =
    greetingHour < 12
      ? 'Good morning'
      : greetingHour < 18
        ? 'Good afternoon'
        : 'Good evening';


  /*
  |--------------------------------------------------------------------------
  | UNIVERSITY
  |--------------------------------------------------------------------------
  */

  const university =
    data?.university
    ??
    {};


  const universityName =
    university?.name
    ||
    'NSTP Institution';


  const universityAcronym =
    university?.acronym
    ||
    'NSTP';


  const universityLogoUrl =
    university?.logo_url
    ||
    null;


  const showUniversityLogo =
    Boolean(
      universityLogoUrl
    )
    &&
    failedUniversityLogoUrl !==
    universityLogoUrl;


  /*
  |--------------------------------------------------------------------------
  | PERIOD
  |--------------------------------------------------------------------------
  */

  const period =
    data?.period
    ??
    {};


  const currentDateLabel =
    formatDeviceTodayLabel(
      deviceNow
    );


  const academicYear =
    period?.academic_year
    ||
    university
      ?.academic_year
    ||
    'Academic Year';


  const semester =
    period?.semester
    ||
    university?.semester
    ||
    'Semester';


  /*
  |--------------------------------------------------------------------------
  | ATTENDANCE DISPLAY
  |--------------------------------------------------------------------------
  */

  const attendanceItems = [
    {
      id:
        'present',

      label:
        'Present',

      value:
        present,

      icon:
        'checkmark-circle',

      color:
        COLORS.green,

      background:
        COLORS.greenSoft,
    },

    {
      id:
        'late',

      label:
        'Late',

      value:
        late,

      icon:
        'time',

      color:
        COLORS.orange,

      background:
        COLORS.orangeSoft,
    },

    {
      id:
        'absent',

      label:
        'Absent',

      value:
        absent,

      icon:
        'close-circle',

      color:
        COLORS.maroon,

      background:
        COLORS.maroonSoft,
    },

    {
      id:
        'excused',

      label:
        'Excused',

      value:
        excused,

      icon:
        'document-text',

      color:
        COLORS.teal,

      background:
        COLORS.tealSoft,
    },
  ];


  const attendanceMessage =
    attendanceRecorded ===
    0
      ? 'Attendance has not been recorded yet.'
      : safeAttendanceRate >=
        90
        ? 'Excellent attendance performance today.'
        : safeAttendanceRate >=
          75
          ? 'Attendance is within a healthy range.'
          : safeAttendanceRate >=
            50
            ? 'Attendance requires some attention.'
            : 'Student attendance is currently low.';


  /*
  |--------------------------------------------------------------------------
  | CLOSE SCANNER
  |--------------------------------------------------------------------------
  */

  const closeScanner =
    useCallback(
      () => {
        setScannerActive(
          false
        );

        setProcessingScan(
          false
        );

        setScannerVisible(
          false
        );
      },
      []
    );


  /*
  |--------------------------------------------------------------------------
  | START CAMERA
  |--------------------------------------------------------------------------
  */

  const startScanner =
    useCallback(
      async () => {
        let latestReady =
          scannerReady;

        /*
        | Refresh the server schedule before every retry so an old "opens at"
        | message cannot keep the Home scanner looking locked after the time.
        */
        if (
          scannerComponent
        ) {
          try {
            const latestResult =
              await getAttendance({
                component:
                  scannerComponent,
              });

            const latestSchedule =
              getSchedule(
                latestResult,
                scannerComponent
              );

            latestReady =
              scheduleIsReady(
                latestSchedule
              );

            setScannerSchedule(
              latestSchedule
            );

            setScannerReady(
              latestReady
            );

            const latestDate =
              latestResult
                ?.attendanceDate
              ??
              latestResult
                ?.attendance_date
              ??
              latestResult?.date
              ??
              '';

            if (latestDate) {
              setScannerDate(
                String(
                  latestDate
                )
              );
            }
          } catch (err) {
            if (
              !latestReady
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
          !latestReady
        ) {
          Alert.alert(
            'Attendance time is not ready',
            'Set and save today\'s attendance schedule before scanning student QR codes.'
          );

          return;
        }


        if (
          !permission
            ?.granted
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
        setScanResult(null);
        setScannerError('');

        scanInFlightRef.current = false;


        setScannerActive(
          true
        );
      },
      [
        permission
          ?.granted,

        requestPermission,

        scannerReady,
        scannerComponent,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | OPEN HOME SCANNER
  |--------------------------------------------------------------------------
  */

  const openScanner =
    async () => {
      const component =
        activeComponent;


      if (
        !component
      ) {
        Alert.alert(
          'No NSTP component',
          'Your account does not have an NSTP component available for attendance scanning.'
        );

        return;
      }


      setScannerVisible(
        true
      );

      setScannerLoading(
        true
      );

      setScannerActive(
        false
      );

      setProcessingScan(
        false
      );

      setScannerComponent(
        component
      );

      setScannerDate('');

      setScannerSchedule(
        null
      );

      setScannerReady(
        false
      );

      setScannerError('');
      setScanType('');
      setScanMessage('');
      setScanResult(null);


      try {
        /*
        |--------------------------------------------------------------------------
        | SAME ATTENDANCE BACKEND USED BY AttendanceScreen.js
        |--------------------------------------------------------------------------
        |
        | No date is sent from the phone.
        |
        | AttendanceController determines the actual Philippine attendance date.
        |
        */

        const result =
          await getAttendance({
            component,
          });


        const schedule =
          getSchedule(
            result,
            component
          );


        const ready =
          scheduleIsReady(
            schedule
          );


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


        setScannerSchedule(
          schedule
        );


        setScannerReady(
          ready
        );


        setScannerDate(
          String(
            backendDate
          )
        );


        if (
          !ready
        ) {
          return;
        }


        /*
        |--------------------------------------------------------------------------
        | REQUEST CAMERA
        |--------------------------------------------------------------------------
        */

        if (
          !permission
            ?.granted
        ) {
          const permissionResult =
            await requestPermission();


          if (
            !permissionResult
              .granted
          ) {
            setScanType(
              'error'
            );

            setScanMessage(
              'Camera permission is required. Tap Start Camera to request access again.'
            );

            return;
          }
        }


        setScannerActive(
          true
        );

      } catch (err) {
        setScannerError(
          err instanceof Error
            ? err.message
            : 'Unable to prepare the attendance scanner.'
        );

      } finally {
        setScannerLoading(
          false
        );
      }
    };


  /*
  |--------------------------------------------------------------------------
  | SCAN STUDENT
  |--------------------------------------------------------------------------
  */

  const handleBarcodeScanned =
    async ({
      data: qrValue,
    }) => {
      if (
        scanInFlightRef.current ||
        processingScan
        ||
        !scannerActive
      ) {
        return;
      }


      const raw =
        String(
          qrValue
          ??
          ''
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

        setScanResult(
          null
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

      setScanMessage('');
      setScanType('');
      setScanResult(null);


      try {
        /*
        |--------------------------------------------------------------------------
        | ATTENDANCECONTROLLER -> scan()
        |--------------------------------------------------------------------------
        |
        | qr_token = student attendance QR token
        | qr_value = original scanned QR data
        | component = currently selected NSTP component
        |
        | attendance_date is NOT sent.
        |
        */

        const result =
          await scanAttendance({
            qr_token:
              token,

            qr_value:
              raw,

            component:
              scannerComponent,
          });


        const resultScan =
          result?.scan
          ??
          null;


        setScanType(
          'success'
        );


        setScanResult(
          resultScan
        );


        setScanMessage(
          resultScan
            ?.message
          ??
          result?.message
          ??
          'Attendance recorded successfully.'
        );


        /*
        |--------------------------------------------------------------------------
        | UPDATE HOME NUMBERS AFTER SUCCESSFUL SCAN
        |--------------------------------------------------------------------------
        */

        await loadDashboard(
          false
        );

      } catch (err) {
        setScanType(
          'error'
        );

        setScanResult(
          null
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
  | OPEN ATTENDANCE SETUP
  |--------------------------------------------------------------------------
  */

  const openAttendanceSetup =
    () => {
      const component =
        scannerComponent
        ||
        activeComponent;


      closeScanner();


      router.push({
        pathname:
          '/(tabs)/AttendanceScreen',

        params: {
          component,
        },
      });
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
          'bottom',
          'left',
          'right',
        ]}
      >
        <StatusBar
          backgroundColor={
            COLORS.cream
          }
          barStyle="dark-content"
        />


        <View
          style={
            styles.loadingSeal
          }
        >
          <Image
            source={
              NSTP_LOGO
            }
            resizeMode="contain"
            style={
              styles.loadingLogo
            }
          />
        </View>


        <Text
          style={
            styles.loadingTitle
          }
        >
          NSTP HUB
        </Text>


        <Text
          style={
            styles.loadingSubtitle
          }
        >
          Administration Portal
        </Text>


        <ActivityIndicator
          size="small"
          color={
            COLORS.maroon
          }
          style={{
            marginTop: 24,
          }}
        />
      </SafeAreaView>
    );
  }


  /*
  |--------------------------------------------------------------------------
  | MAIN PAGE
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
          COLORS.cream
        }
        barStyle="dark-content"
      />


      <ScrollView
        style={
          styles.scroll
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
              loadDashboard(
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
            44 +
            insets.bottom,
        }}
      >

        {/*
        |--------------------------------------------------------------------------
        | INSTITUTION HEADER
        |--------------------------------------------------------------------------
        */}

        <View
          style={
            styles.masthead
          }
        >
          <View
            style={
              styles.identityRow
            }
          >
            <View
              style={
                styles.universityIdentity
              }
            >
              <View
                style={
                  styles.universityLogoFrame
                }
              >
                {
                  showUniversityLogo
                    ? (
                      <Image
                        source={{
                          uri:
                            universityLogoUrl,
                        }}
                        resizeMode="contain"
                        style={
                          styles.universityLogo
                        }
                        onError={() =>
                          setFailedUniversityLogoUrl(
                            universityLogoUrl
                          )
                        }
                      />
                    )
                    : (
                      <Ionicons
                        name="school-outline"
                        size={28}
                        color={
                          COLORS.maroon
                        }
                      />
                    )
                }
              </View>


              <View
                style={
                  styles.universityText
                }
              >
                <Text
                  style={
                    styles.institutionLabel
                  }
                >
                  {
                    universityAcronym
                  }
                </Text>


                <Text
                  numberOfLines={2}
                  style={
                    styles.universityName
                  }
                >
                  {
                    universityName
                  }
                </Text>
              </View>
            </View>


            <View
              style={
                styles.nstpIdentity
              }
            >
              <Image
                source={
                  NSTP_LOGO
                }
                resizeMode="contain"
                style={
                  styles.nstpLogo
                }
              />
            </View>
          </View>


          <View
            style={
              styles.goldRule
            }
          />


          <View
            style={
              styles.mastheadCaptionRow
            }
          >
            <Text
              style={
                styles.mastheadCaption
              }
            >
              NATIONAL SERVICE TRAINING PROGRAM
            </Text>


            <Text
              style={
                styles.mastheadAdmin
              }
            >
              ADMINISTRATION
            </Text>
          </View>
        </View>


        {/*
        |--------------------------------------------------------------------------
        | WELCOME
        |--------------------------------------------------------------------------
        */}

        <View
          style={
            styles.welcomePanel
          }
        >
          <View
            style={
              styles.welcomeDecorationOne
            }
          />

          <View
            style={
              styles.welcomeDecorationTwo
            }
          />


          <View
            style={
              styles.welcomeTop
            }
          >
            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                style={
                  styles.greeting
                }
              >
                {
                  greeting
                },
              </Text>


              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={
                  0.7
                }
                style={
                  styles.adminName
                }
              >
                {
                  firstName
                }
              </Text>
            </View>


            {/*
            |--------------------------------------------------------------------------
            | FUNCTIONAL HOME QR SCANNER BUTTON
            |--------------------------------------------------------------------------
            */}

            <TouchableOpacity
              activeOpacity={
                0.8
              }
              style={
                styles.qrButton
              }
              onPress={
                openScanner
              }
            >
              <Ionicons
                name="qr-code-outline"
                size={26}
                color={
                  COLORS.maroon
                }
              />


              <Text
                style={
                  styles.qrButtonText
                }
              >
                SCAN
              </Text>
            </TouchableOpacity>
          </View>


          <View
            style={
              styles.roleBadge
            }
          >
            <Ionicons
              name={
                roleIcon
              }
              size={14}
              color={
                COLORS.yellow
              }
            />


            <Text
              style={
                styles.roleText
              }
            >
              {
                roleLabel
              }
            </Text>
          </View>


          <Text
            style={
              styles.welcomeMessage
            }
          >
            Review today's NSTP activity and scan student attendance directly from Home.
          </Text>
        </View>


        {/*
        |--------------------------------------------------------------------------
        | DATE / ACADEMIC CONTEXT
        |--------------------------------------------------------------------------
        */}

        <View
          style={
            styles.contextWrap
          }
        >
          <View
            style={
              styles.contextCard
            }
          >
            <View
              style={
                styles.dateColumn
              }
            >
              <View
                style={
                  styles.dateIcon
                }
              >
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={
                    COLORS.maroon
                  }
                />
              </View>


              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={
                    styles.contextLabel
                  }
                >
                  TODAY
                </Text>


                <Text
                  numberOfLines={2}
                  style={
                    styles.contextDate
                  }
                >
                  {
                    currentDateLabel
                  }
                </Text>
              </View>
            </View>


            <View
              style={
                styles.contextDivider
              }
            />


            <View
              style={
                styles.academicContext
              }
            >
              <AcademicItem
                label="Academic Year"
                value={
                  academicYear
                }
              />


              <View
                style={
                  styles.academicMiniDivider
                }
              />


              <AcademicItem
                label="Semester"
                value={
                  semester
                }
              />
            </View>
          </View>
        </View>


        <View
          style={
            styles.body
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
                    styles.errorCard
                  }
                >
                  <Ionicons
                    name="warning-outline"
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
                </View>
              )
              : null
          }


          {/*
          |--------------------------------------------------------------------------
          | COMPONENT SELECTOR
          |--------------------------------------------------------------------------
          */}

          {
            componentOptions.length >
            0
              ? (
                <View
                  style={
                    styles.componentSection
                  }
                >
                  <SectionTitle
                    eyebrow="PROGRAM"
                    title={
                      canSwitchComponent
                        ? 'Select component'
                        : 'Your component'
                    }
                    icon="layers-outline"
                  />


                  <View
                    style={
                      styles.componentTabs
                    }
                  >
                    {
                      componentOptions.map(
                        component => {
                          const selected =
                            component ===
                            activeComponent;


                          return (
                            <TouchableOpacity
                              key={
                                component
                              }
                              activeOpacity={
                                0.75
                              }
                              disabled={
                                !canSwitchComponent
                              }
                              onPress={() =>
                                setSelectedComponent(
                                  component
                                )
                              }
                              style={[
                                styles.componentTab,

                                selected
                                &&
                                styles.componentTabActive,
                              ]}
                            >
                              <Ionicons
                                name={
                                  selected
                                    ? 'checkmark-circle'
                                    : 'layers-outline'
                                }
                                size={16}
                                color={
                                  selected
                                    ? COLORS.white
                                    : COLORS.teal
                                }
                              />


                              <Text
                                style={[
                                  styles.componentTabText,

                                  selected
                                  &&
                                  styles.componentTabTextActive,
                                ]}
                              >
                                {
                                  component
                                }
                              </Text>
                            </TouchableOpacity>
                          );
                        }
                      )
                    }
                  </View>
                </View>
              )
              : null
          }


          {/*
          |--------------------------------------------------------------------------
          | SUMMARY TITLE
          |--------------------------------------------------------------------------
          */}

          <View
            style={
              styles.dashboardTitleRow
            }
          >
            <View>
              <Text
                style={
                  styles.eyebrow
                }
              >
                {
                  activeComponent
                    ? `${activeComponent} OVERVIEW`
                    : 'NSTP OVERVIEW'
                }
              </Text>


              <Text
                style={
                  styles.dashboardTitle
                }
              >
                Today's summary
              </Text>
            </View>


            <TouchableOpacity
              style={
                styles.refreshButton
              }
              activeOpacity={
                0.75
              }
              onPress={() =>
                loadDashboard(
                  true
                )
              }
            >
              {
                refreshing
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


          {/*
          |--------------------------------------------------------------------------
          | ATTENDANCE RATE
          |--------------------------------------------------------------------------
          */}

          <View
            style={
              styles.attendanceFeature
            }
          >
            <View
              style={
                styles.attendanceFeatureTop
              }
            >
              <View>
                <Text
                  style={
                    styles.featureLabel
                  }
                >
                  ATTENDANCE RATE
                </Text>


                <View
                  style={
                    styles.rateRow
                  }
                >
                  <Text
                    style={
                      styles.rate
                    }
                  >
                    {
                      safeAttendanceRate
                    }
                  </Text>


                  <Text
                    style={
                      styles.percent
                    }
                  >
                    %
                  </Text>
                </View>


                <Text
                  style={
                    styles.rateDescription
                  }
                >
                  {
                    attendanceRecorded
                      .toLocaleString()
                  } records today
                </Text>
              </View>


              <View
                style={
                  styles.featureSymbol
                }
              >
                <Ionicons
                  name="analytics-outline"
                  size={29}
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
                      `${safeAttendanceRate}%`,
                  },
                ]}
              />
            </View>


            <View
              style={
                styles.attendanceMessageRow
              }
            >
              <Ionicons
                name={
                  safeAttendanceRate >=
                  75
                    ? 'checkmark-circle-outline'
                    : 'information-circle-outline'
                }
                size={17}
                color={
                  safeAttendanceRate >=
                  75
                    ? COLORS.green
                    : COLORS.orange
                }
              />


              <Text
                style={
                  styles.attendanceMessage
                }
              >
                {
                  attendanceMessage
                }
              </Text>
            </View>
          </View>


          {/*
          |--------------------------------------------------------------------------
          | STATUS
          |--------------------------------------------------------------------------
          */}

          <View
            style={
              styles.attendanceStatusBar
            }
          >
            {
              attendanceItems.map(
                (
                  item,
                  index
                ) => (
                  <AttendanceStatus
                    key={
                      item.id
                    }
                    label={
                      item.label
                    }
                    value={
                      item.value
                    }
                    icon={
                      item.icon
                    }
                    color={
                      item.color
                    }
                    background={
                      item.background
                    }
                    showDivider={
                      index
                      <
                      attendanceItems.length -
                      1
                    }
                  />
                )
              )
            }
          </View>


          {/*
          |--------------------------------------------------------------------------
          | KEY FIGURES
          |--------------------------------------------------------------------------
          */}

          <View
            style={
              styles.sectionSpacing
            }
          >
            <SectionTitle
              eyebrow="KEY FIGURES"
              title="At a glance"
              icon="bar-chart-outline"
            />
          </View>


          <View
            style={
              styles.figuresList
            }
          >
            <FigureRow
              icon="people-outline"
              label="Enrolled students"
              description={
                activeComponent
                  ? `${activeComponent} program`
                  : 'NSTP program'
              }
              value={
                students
              }
              color={
                COLORS.maroon
              }
              background={
                COLORS.maroonSoft
              }
            />


            <Divider />


            <FigureRow
              icon="clipboard-outline"
              label="Attendance records"
              description="Recorded for today"
              value={
                attendanceRecorded
              }
              color={
                COLORS.teal
              }
              background={
                COLORS.tealSoft
              }
            />


            <Divider />


            <FigureRow
              icon="time-outline"
              label="Pending requests"
              description="Excuse letters awaiting review"
              value={
                pendingExcuseLetters
              }
              color={
                COLORS.orange
              }
              background={
                COLORS.orangeSoft
              }
            />
          </View>


          {/*
          |--------------------------------------------------------------------------
          | EXCUSE LETTER
          |--------------------------------------------------------------------------
          */}

          <View
            style={
              styles.sectionSpacing
            }
          >
            <SectionTitle
              eyebrow="REQUEST CENTER"
              title="Excuse letters"
              icon="document-text-outline"
            />
          </View>


          <View
            style={
              styles.requestPanel
            }
          >
            <View
              style={
                styles.requestMain
              }
            >
              <View>
                <Text
                  style={
                    styles.requestLabel
                  }
                >
                  SUBMITTED TODAY
                </Text>


                <Text
                  style={
                    styles.requestTotal
                  }
                >
                  {
                    totalExcuseLetters
                      .toLocaleString()
                  }
                </Text>
              </View>


              <View
                style={
                  styles.pendingRequest
                }
              >
                <Ionicons
                  name="hourglass-outline"
                  size={19}
                  color={
                    COLORS.orange
                  }
                />


                <View
                  style={{
                    marginLeft: 8,
                  }}
                >
                  <Text
                    style={
                      styles.pendingNumber
                    }
                  >
                    {
                      pendingExcuseLetters
                        .toLocaleString()
                    }
                  </Text>


                  <Text
                    style={
                      styles.pendingText
                    }
                  >
                    Pending
                  </Text>
                </View>
              </View>
            </View>


            <View
              style={
                styles.requestRule
              }
            />


            <View
              style={
                styles.requestResults
              }
            >
              <RequestResult
                icon="checkmark"
                label="Approved"
                value={
                  approvedExcuseLetters
                }
                color={
                  COLORS.green
                }
              />


              <View
                style={
                  styles.requestVerticalRule
                }
              />


              <RequestResult
                icon="close"
                label="Rejected"
                value={
                  rejectedExcuseLetters
                }
                color={
                  COLORS.maroon
                }
              />
            </View>
          </View>


          {/*
          |--------------------------------------------------------------------------
          | ACTIVE WORKSPACE
          |--------------------------------------------------------------------------
          */}

          <View
            style={
              styles.workspaceFooter
            }
          >
            <View
              style={
                styles.workspaceIcon
              }
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={
                  COLORS.yellow
                }
              />
            </View>


            <View
              style={
                styles.workspaceCopy
              }
            >
              <Text
                style={
                  styles.workspaceLabel
                }
              >
                ACTIVE WORKSPACE
              </Text>


              <Text
                numberOfLines={1}
                style={
                  styles.workspaceTitle
                }
              >
                {
                  activeComponent
                  ||
                  'NSTP'
                } · {
                  academicYear
                }
              </Text>


              <Text
                style={
                  styles.workspaceSemester
                }
              >
                {
                  semester
                }
              </Text>
            </View>


            <Ionicons
              name="checkmark-circle"
              size={19}
              color={
                COLORS.yellow
              }
            />
          </View>


          <View
            style={
              styles.syncRow
            }
          >
            <Ionicons
              name="cloud-done-outline"
              size={14}
              color={
                COLORS.muted
              }
            />


            <Text
              style={
                styles.syncText
              }
            >
              {
                data?.refreshed_at
                  ? `Updated ${new Date(
                      data.refreshed_at
                    ).toLocaleTimeString(
                      [],
                      {
                        hour:
                          '2-digit',

                        minute:
                          '2-digit',
                      }
                    )}`
                  : 'Dashboard synchronized'
              }
            </Text>
          </View>
        </View>
      </ScrollView>


      {/*
      |--------------------------------------------------------------------------
      | HOME QR SCANNER
      |--------------------------------------------------------------------------
      */}

      <HomeAttendanceScanner
        visible={
          scannerVisible
        }
        loading={
          scannerLoading
        }
        active={
          scannerActive
        }
        processing={
          processingScan
        }
        permissionGranted={
          Boolean(
            permission
              ?.granted
          )
        }
        component={
          scannerComponent
        }
        attendanceDate={
          scannerDate
        }
        schedule={
          scannerSchedule
        }
        scheduleReady={
          scannerReady
        }
        error={
          scannerError
        }
        scanType={
          scanType
        }
        scanMessage={
          scanMessage
        }
        scanResult={
          scanResult
        }
        bottomInset={
          insets.bottom
        }
        onClose={
          closeScanner
        }
        onStart={
          startScanner
        }
        onStop={() =>
          setScannerActive(
            false
          )
        }
        onBarcodeScanned={
          handleBarcodeScanned
        }
        onOpenAttendanceSetup={
          openAttendanceSetup
        }
      />
    </SafeAreaView>
  );
}


/*
|--------------------------------------------------------------------------
| HOME SCANNER
|--------------------------------------------------------------------------
*/

function HomeAttendanceScanner({
  visible,
  loading,
  active,
  processing,
  permissionGranted,
  component,
  attendanceDate,
  schedule,
  scheduleReady,
  error,
  scanType,
  scanMessage,
  scanResult,
  bottomInset,
  onClose,
  onStart,
  onStop,
  onBarcodeScanned,
  onOpenAttendanceSetup,
}) {
  if (
    !visible
  ) {
    return null;
  }


  const success =
    scanType ===
    'success';


  return (
    <Modal
      visible={
        visible
      }
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={
        onClose
      }
    >
      <SafeAreaView
        style={
          styles.scannerPage
        }
        edges={[
          'top',
          'left',
          'right',
        ]}
      >
        <StatusBar
          backgroundColor={
            COLORS.maroon
          }
          barStyle="light-content"
        />


        {/*
        |--------------------------------------------------------------------------
        | SCANNER HEADER
        |--------------------------------------------------------------------------
        */}

        <View
          style={
            styles.scannerHeader
          }
        >
          <TouchableOpacity
            activeOpacity={
              0.75
            }
            onPress={
              onClose
            }
            style={
              styles.scannerCloseButton
            }
          >
            <Ionicons
              name="close"
              size={22}
              color={
                COLORS.white
              }
            />
          </TouchableOpacity>


          <View
            style={
              styles.scannerHeaderCopy
            }
          >
            <Text
              style={
                styles.scannerEyebrow
              }
            >
              SMART CHECK-IN
            </Text>


            <Text
              style={
                styles.scannerTitle
              }
            >
              QR Code Scanner
            </Text>
          </View>


          <View
            style={[
              styles.readyBadge,

              scheduleReady
                ? styles.readyBadgeOn
                : styles.readyBadgeOff,
            ]}
          >
            <View
              style={[
                styles.readyDot,

                {
                  backgroundColor:
                    scheduleReady
                      ? COLORS.green
                      : COLORS.orange,
                },
              ]}
            />


            <Text
              style={[
                styles.readyText,

                {
                  color:
                    scheduleReady
                      ? COLORS.green
                      : COLORS.orange,
                },
              ]}
            >
              {
                scheduleReady
                  ? 'READY'
                  : 'LOCKED'
              }
            </Text>
          </View>
        </View>


        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={{
            paddingBottom:
              Math.max(
                bottomInset,
                18
              )
              +
              20,
          }}
        >
          <View
            style={
              styles.scannerBody
            }
          >

            {/*
            |--------------------------------------------------------------------------
            | COMPONENT + BACKEND DATE
            |--------------------------------------------------------------------------
            */}

            <View
              style={
                styles.scannerContextRow
              }
            >
              <ScannerContextTile
                icon="layers-outline"
                label="Component"
                value={
                  component
                  ||
                  '—'
                }
              />


              <ScannerContextTile
                icon="today-outline"
                label="Today"
                value={
                  formatBackendDate(
                    attendanceDate
                  )
                }
              />
            </View>


            {/*
            |--------------------------------------------------------------------------
            | LOADING
            |--------------------------------------------------------------------------
            */}

            {
              loading
                ? (
                  <View
                    style={
                      styles.scannerStatePanel
                    }
                  >
                    <ActivityIndicator
                      size="large"
                      color={
                        COLORS.maroon
                      }
                    />


                    <Text
                      style={
                        styles.scannerStateTitle
                      }
                    >
                      Preparing scanner
                    </Text>


                    <Text
                      style={
                        styles.scannerStateText
                      }
                    >
                      Checking today's attendance schedule from the NSTP HUB backend.
                    </Text>
                  </View>
                )
                : null
            }


            {/*
            |--------------------------------------------------------------------------
            | BACKEND ERROR
            |--------------------------------------------------------------------------
            */}

            {
              !loading
              &&
              error
                ? (
                  <View
                    style={[
                      styles.scannerStatePanel,
                      styles.scannerErrorPanel,
                    ]}
                  >
                    <View
                      style={
                        styles.scannerStateIcon
                      }
                    >
                      <Ionicons
                        name="alert-circle-outline"
                        size={30}
                        color={
                          COLORS.maroon
                        }
                      />
                    </View>


                    <Text
                      style={[
                        styles.scannerStateTitle,

                        {
                          color:
                            COLORS.maroon,
                        },
                      ]}
                    >
                      Scanner unavailable
                    </Text>


                    <Text
                      style={
                        styles.scannerStateText
                      }
                    >
                      {
                        error
                      }
                    </Text>
                  </View>
                )
                : null
            }


            {/*
            |--------------------------------------------------------------------------
            | NO SCHEDULE
            |--------------------------------------------------------------------------
            */}

            {
              !loading
              &&
              !error
              &&
              !scheduleReady
                ? (
                  <View
                    style={
                      styles.scannerStatePanel
                    }
                  >
                    <View
                      style={[
                        styles.scannerStateIcon,

                        {
                          backgroundColor:
                            COLORS.orangeSoft,
                        },
                      ]}
                    >
                      <Ionicons
                        name="time-outline"
                        size={31}
                        color={
                          COLORS.orange
                        }
                      />
                    </View>


                    <Text
                      style={
                        styles.scannerStateTitle
                      }
                    >
                      Today's attendance time is not set
                    </Text>


                    <Text
                      style={
                        styles.scannerStateText
                      }
                    >
                      Set and save the complete Time In and Time Out schedule before scanning students.
                    </Text>


                    <TouchableOpacity
                      activeOpacity={
                        0.82
                      }
                      onPress={
                        onOpenAttendanceSetup
                      }
                      style={
                        styles.setupButton
                      }
                    >
                      <Ionicons
                        name="time-outline"
                        size={19}
                        color={
                          COLORS.white
                        }
                      />


                      <Text
                        style={
                          styles.setupButtonText
                        }
                      >
                        Open Attendance Setup
                      </Text>
                    </TouchableOpacity>
                  </View>
                )
                : null
            }


            {/*
            |--------------------------------------------------------------------------
            | READY SCANNER
            |--------------------------------------------------------------------------
            */}

            {
              !loading
              &&
              !error
              &&
              scheduleReady
                ? (
                  <>

                    {/*
                    |--------------------------------------------------------------------------
                    | SCHEDULE
                    |--------------------------------------------------------------------------
                    */}

                    <View
                      style={
                        styles.scheduleStrip
                      }
                    >
                      <ScannerScheduleItem
                        icon="log-in-outline"
                        label="Arrival"
                        value={
                          `${formatScheduleTime(
                            schedule
                              ?.start_time_in
                          )} - ${formatScheduleTime(
                            schedule
                              ?.final_time_in_cutoff
                            ??
                            schedule
                              ?.end_time_in
                          )}`
                        }
                        color={
                          COLORS.green
                        }
                      />


                      <View
                        style={
                          styles.scheduleDivider
                        }
                      />


                      <ScannerScheduleItem
                        icon="log-out-outline"
                        label="Dismissal"
                        value={
                          `${formatScheduleTime(
                            schedule
                              ?.start_time_out
                          )} - ${formatScheduleTime(
                            schedule
                              ?.final_time_out_cutoff
                            ??
                            schedule
                              ?.end_time_out
                          )}`
                        }
                        color={
                          COLORS.teal
                        }
                      />
                    </View>


                    {/*
                    |--------------------------------------------------------------------------
                    | CAMERA
                    |--------------------------------------------------------------------------
                    */}

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
                          active
                          &&
                          permissionGranted
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
                                  onBarcodeScanned
                                }
                              />
                            )
                            : (
                              <View
                                style={
                                  styles.cameraPlaceholder
                                }
                              >
                                <View
                                  style={
                                    styles.cameraPlaceholderIcon
                                  }
                                >
                                  <Ionicons
                                    name={
                                      scanType ===
                                      'error'
                                        ? 'alert-circle-outline'
                                        : success
                                          ? 'checkmark-circle-outline'
                                          : 'scan-outline'
                                    }
                                    size={54}
                                    color={
                                      scanType ===
                                      'error'
                                        ? COLORS.maroon
                                        : success
                                          ? COLORS.green
                                          : COLORS.yellow
                                    }
                                  />
                                </View>


                                <Text
                                  style={
                                    styles.cameraPlaceholderTitle
                                  }
                                >
                                  {
                                    scanType ===
                                    'error'
                                      ? 'Scan not recorded'
                                      : success
                                        ? 'Attendance recorded'
                                        : 'Scanner paused'
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
                                      ? 'Nothing was saved. Review the message below, then tap Retry Scan.'
                                      : success
                                        ? 'Review the result below, then scan the next student.'
                                        : 'Tap Start Camera when you are ready.'
                                  }
                                </Text>
                              </View>
                            )
                        }


                        {/*
                        |--------------------------------------------------------------------------
                        | SCAN FRAME
                        |--------------------------------------------------------------------------
                        */}

                        <View
                          pointerEvents="none"
                          style={
                            styles.scanTarget
                          }
                        >
                          <View
                            style={[
                              styles.scanCorner,
                              styles.topLeft,
                            ]}
                          />


                          <View
                            style={[
                              styles.scanCorner,
                              styles.topRight,
                            ]}
                          />


                          <View
                            style={[
                              styles.scanCorner,
                              styles.bottomLeft,
                            ]}
                          />


                          <View
                            style={[
                              styles.scanCorner,
                              styles.bottomRight,
                            ]}
                          />


                          {
                            active
                              ? (
                                <View
                                  style={
                                    styles.scanLine
                                  }
                                />
                              )
                              : null
                          }
                        </View>


                        {/*
                        |--------------------------------------------------------------------------
                        | TOP OVERLAY
                        |--------------------------------------------------------------------------
                        */}

                        <View
                          style={
                            styles.cameraTopOverlay
                          }
                        >
                          <View
                            style={
                              styles.liveBadge
                            }
                          >
                            <View
                              style={[
                                styles.liveDot,

                                {
                                  backgroundColor:
                                    active
                                      ? COLORS.green
                                      : COLORS.orange,
                                },
                              ]}
                            />


                            <Text
                              style={
                                styles.liveText
                              }
                            >
                              {
                                active
                                  ? 'LIVE'
                                  : 'PAUSED'
                              }
                            </Text>
                          </View>


                          <View
                            style={
                              styles.cameraComponentBadge
                            }
                          >
                            <Ionicons
                              name="layers-outline"
                              size={14}
                              color={
                                COLORS.yellow
                              }
                            />


                            <Text
                              style={
                                styles.cameraComponentText
                              }
                            >
                              {
                                component
                                ||
                                '—'
                              }
                            </Text>
                          </View>
                        </View>


                        {/*
                        |--------------------------------------------------------------------------
                        | HINT
                        |--------------------------------------------------------------------------
                        */}

                        <View
                          pointerEvents="none"
                          style={
                            styles.cameraHint
                          }
                        >
                          <Ionicons
                            name="qr-code-outline"
                            size={16}
                            color={
                              COLORS.yellow
                            }
                          />


                          <Text
                            style={
                              styles.cameraHintText
                            }
                          >
                            Align the whole student QR code inside the frame
                          </Text>
                        </View>
                      </View>
                    </View>


                    {/*
                    |--------------------------------------------------------------------------
                    | SCAN RESULT
                    |--------------------------------------------------------------------------
                    */}

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
                            <View
                              style={[
                                styles.scanMessageIcon,

                                {
                                  backgroundColor:
                                    scanType ===
                                    'error'
                                      ? COLORS.maroonSoft
                                      : COLORS.greenSoft,
                                },
                              ]}
                            >
                              <Ionicons
                                name={
                                  scanType ===
                                  'error'
                                    ? 'alert-circle-outline'
                                    : 'checkmark-circle-outline'
                                }
                                size={23}
                                color={
                                  scanType ===
                                  'error'
                                    ? COLORS.maroon
                                    : COLORS.green
                                }
                              />
                            </View>


                            <View
                              style={
                                styles.scanMessageCopy
                              }
                            >
                              <Text
                                style={[
                                  styles.scanMessageTitle,

                                  {
                                    color:
                                      scanType ===
                                      'error'
                                        ? COLORS.maroon
                                        : COLORS.green,
                                  },
                                ]}
                              >
                                {
                                  scanType ===
                                  'error'
                                    ? 'Scan not recorded'
                                    : scanResult
                                        ?.type ===
                                      'time_out'
                                      ? 'Time Out recorded'
                                      : 'Time In recorded'
                                }
                              </Text>


                              {
                                scanResult
                                  ?.student_name
                                  ? (
                                    <Text
                                      style={
                                        styles.scanStudentName
                                      }
                                    >
                                      {
                                        scanResult
                                          .student_name
                                      }
                                    </Text>
                                  )
                                  : null
                              }


                              <Text
                                style={
                                  styles.scanMessageText
                                }
                              >
                                {
                                  scanMessage
                                }
                              </Text>


                              {
                                scanResult?.remark
                                ||
                                scanResult?.time
                                  ? (
                                    <View
                                      style={
                                        styles.scanMetaRow
                                      }
                                    >
                                      {
                                        scanResult
                                          ?.remark
                                          ? (
                                            <ResultPill
                                              icon="checkmark-circle-outline"
                                              text={
                                                scanResult
                                                  .remark
                                              }
                                            />
                                          )
                                          : null
                                      }


                                      {
                                        scanResult
                                          ?.time
                                          ? (
                                            <ResultPill
                                              icon="time-outline"
                                              text={
                                                scanResult
                                                  .time
                                              }
                                            />
                                          )
                                          : null
                                      }
                                    </View>
                                  )
                                  : null
                              }
                            </View>
                          </View>
                        )
                        : null
                    }


                    {/*
                    |--------------------------------------------------------------------------
                    | ACTIONS
                    |--------------------------------------------------------------------------
                    */}

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
                          onClose
                        }
                        style={
                          styles.secondaryScannerButton
                        }
                      >
                        <Ionicons
                          name="close-outline"
                          size={19}
                          color={
                            COLORS.teal
                          }
                        />


                        <Text
                          style={
                            styles.secondaryScannerText
                          }
                        >
                          Close
                        </Text>
                      </TouchableOpacity>


                      {
                        active
                          ? (
                            <TouchableOpacity
                              activeOpacity={
                                0.82
                              }
                              onPress={
                                onStop
                              }
                              style={
                                styles.stopScannerButton
                              }
                            >
                              <Ionicons
                                name="stop-circle-outline"
                                size={20}
                                color={
                                  COLORS.white
                                }
                              />


                              <Text
                                style={
                                  styles.primaryScannerText
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
                                processing
                              }
                              onPress={
                                onStart
                              }
                              style={[
                                styles.startScannerButton,

                                processing
                                &&
                                {
                                  opacity:
                                    0.5,
                                },
                              ]}
                            >
                              {
                                processing
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
                                      size={20}
                                      color={
                                        COLORS.white
                                      }
                                    />
                                  )
                              }


                              <Text
                                style={
                                  styles.primaryScannerText
                                }
                              >
                                {
                                  processing
                                    ? 'Processing...'
                                    : scanType ===
                                      'error'
                                      ? 'Retry Scan'
                                      : scanMessage
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
                : null
            }
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}


/*
|--------------------------------------------------------------------------
| SCANNER CONTEXT
|--------------------------------------------------------------------------
*/

function ScannerContextTile({
  icon,
  label,
  value,
}) {
  return (
    <View
      style={
        styles.scannerContextTile
      }
    >
      <View
        style={
          styles.scannerContextIcon
        }
      >
        <Ionicons
          name={
            icon
          }
          size={17}
          color={
            COLORS.teal
          }
        />
      </View>


      <View
        style={{
          flex: 1,
          minWidth: 0,
          marginLeft: 9,
        }}
      >
        <Text
          style={
            styles.scannerContextLabel
          }
        >
          {
            label
          }
        </Text>


        <Text
          numberOfLines={1}
          style={
            styles.scannerContextValue
          }
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
| SCHEDULE ITEM
|--------------------------------------------------------------------------
*/

function ScannerScheduleItem({
  icon,
  label,
  value,
  color,
}) {
  return (
    <View
      style={
        styles.scheduleItem
      }
    >
      <View
        style={[
          styles.scheduleItemIcon,

          {
            backgroundColor:
              `${color}16`,
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
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        <Text
          style={
            styles.scheduleItemLabel
          }
        >
          {
            label
          }
        </Text>


        <Text
          numberOfLines={1}
          style={
            styles.scheduleItemValue
          }
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
| RESULT PILL
|--------------------------------------------------------------------------
*/

function ResultPill({
  icon,
  text,
}) {
  return (
    <View
      style={
        styles.resultPill
      }
    >
      <Ionicons
        name={
          icon
        }
        size={13}
        color={
          COLORS.teal
        }
      />


      <Text
        style={
          styles.resultPillText
        }
      >
        {
          text
        }
      </Text>
    </View>
  );
}


/*
|--------------------------------------------------------------------------
| ACADEMIC ITEM
|--------------------------------------------------------------------------
*/

function AcademicItem({
  label,
  value,
}) {
  return (
    <View
      style={
        styles.academicItem
      }
    >
      <Text
        style={
          styles.academicLabel
        }
      >
        {
          label
        }
      </Text>


      <Text
        numberOfLines={1}
        style={
          styles.academicValue
        }
      >
        {
          value
        }
      </Text>
    </View>
  );
}


/*
|--------------------------------------------------------------------------
| SECTION TITLE
|--------------------------------------------------------------------------
*/

function SectionTitle({
  eyebrow,
  title,
  icon,
}) {
  return (
    <View
      style={
        styles.sectionHeader
      }
    >
      <View>
        <Text
          style={
            styles.eyebrow
          }
        >
          {
            eyebrow
          }
        </Text>


        <Text
          style={
            styles.sectionTitle
          }
        >
          {
            title
          }
        </Text>
      </View>


      <Ionicons
        name={
          icon
        }
        size={20}
        color={
          COLORS.maroon
        }
      />
    </View>
  );
}


/*
|--------------------------------------------------------------------------
| ATTENDANCE STATUS
|--------------------------------------------------------------------------
*/

function AttendanceStatus({
  label,
  value,
  icon,
  color,
  background,
  showDivider,
}) {
  return (
    <>
      <View
        style={
          styles.attendanceStatusItem
        }
      >
        <View
          style={[
            styles.attendanceStatusIcon,

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
            size={16}
            color={
              color
            }
          />
        </View>


        <Text
          style={[
            styles.attendanceStatusValue,

            {
              color,
            },
          ]}
        >
          {
            Number(
              value ?? 0
            ).toLocaleString()
          }
        </Text>


        <Text
          numberOfLines={1}
          style={
            styles.attendanceStatusLabel
          }
        >
          {
            label
          }
        </Text>
      </View>


      {
        showDivider
          ? (
            <View
              style={
                styles.attendanceStatusDivider
              }
            />
          )
          : null
      }
    </>
  );
}


/*
|--------------------------------------------------------------------------
| FIGURE ROW
|--------------------------------------------------------------------------
*/

function FigureRow({
  icon,
  label,
  description,
  value,
  color,
  background,
}) {
  return (
    <View
      style={
        styles.figureRow
      }
    >
      <View
        style={[
          styles.figureIcon,

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
          styles.figureCopy
        }
      >
        <Text
          style={
            styles.figureLabel
          }
        >
          {
            label
          }
        </Text>


        <Text
          style={
            styles.figureDescription
          }
        >
          {
            description
          }
        </Text>
      </View>


      <Text
        style={
          styles.figureValue
        }
      >
        {
          Number(
            value ?? 0
          ).toLocaleString()
        }
      </Text>
    </View>
  );
}


function Divider() {
  return (
    <View
      style={
        styles.figureDivider
      }
    />
  );
}


/*
|--------------------------------------------------------------------------
| REQUEST RESULT
|--------------------------------------------------------------------------
*/

function RequestResult({
  icon,
  label,
  value,
  color,
}) {
  return (
    <View
      style={
        styles.requestResult
      }
    >
      <View
        style={[
          styles.requestResultIcon,

          {
            borderColor:
              color,
          },
        ]}
      >
        <Ionicons
          name={
            icon
          }
          size={15}
          color={
            color
          }
        />
      </View>


      <View>
        <Text
          style={[
            styles.requestResultValue,

            {
              color,
            },
          ]}
        >
          {
            Number(
              value ?? 0
            ).toLocaleString()
          }
        </Text>


        <Text
          style={
            styles.requestResultLabel
          }
        >
          {
            label
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

    safeArea: {
      flex: 1,
      backgroundColor:
        COLORS.cream,
    },


    scroll: {
      flex: 1,
      backgroundColor:
        COLORS.cream,
    },


    body: {
      paddingHorizontal: 20,
    },


    /*
    |--------------------------------------------------------------------------
    | LOADING
    |--------------------------------------------------------------------------
    */

    loadingScreen: {
      flex: 1,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        COLORS.cream,
    },


    loadingSeal: {
      width: 92,
      height: 92,
      borderRadius: 46,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },


    loadingLogo: {
      width: 73,
      height: 73,
    },


    loadingTitle: {
      marginTop: 18,
      color:
        COLORS.maroon,
      fontSize: 20,
      fontWeight:
        '900',
      letterSpacing: 1.4,
    },


    loadingSubtitle: {
      marginTop: 4,
      color:
        COLORS.muted,
      fontSize: 11,
    },


    /*
    |--------------------------------------------------------------------------
    | MASTHEAD
    |--------------------------------------------------------------------------
    */

    masthead: {
      paddingTop: 9,
      paddingHorizontal: 20,
      paddingBottom: 17,
      backgroundColor:
        COLORS.cream,
    },


    identityRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
    },


    universityIdentity: {
      flex: 1,
      minWidth: 0,
      paddingRight: 15,
      flexDirection:
        'row',
      alignItems:
        'center',
    },


    universityLogoFrame: {
      width: 57,
      height: 57,
      borderRadius: 29,
      overflow:
        'hidden',
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        COLORS.white,
      borderWidth: 1.5,
      borderColor:
        COLORS.maroon,
    },


    universityLogo: {
      width: 48,
      height: 48,
    },


    universityText: {
      flex: 1,
      marginLeft: 12,
    },


    institutionLabel: {
      color:
        COLORS.maroon,
      fontSize: 10,
      fontWeight:
        '900',
      letterSpacing: 1.2,
    },


    universityName: {
      marginTop: 3,
      color:
        COLORS.dark,
      fontSize: 12,
      lineHeight: 16,
      fontWeight:
        '700',
    },


    nstpIdentity: {
      width: 57,
      height: 57,
      borderRadius: 18,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },


    nstpLogo: {
      width: 49,
      height: 49,
    },


    goldRule: {
      height: 2,
      marginTop: 15,
      backgroundColor:
        COLORS.yellow,
    },


    mastheadCaptionRow: {
      marginTop: 7,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
    },


    mastheadCaption: {
      flex: 1,
      color:
        COLORS.muted,
      fontSize: 8,
      fontWeight:
        '800',
      letterSpacing: 0.8,
    },


    mastheadAdmin: {
      marginLeft: 10,
      color:
        COLORS.maroon,
      fontSize: 8,
      fontWeight:
        '900',
      letterSpacing: 0.9,
    },


    /*
    |--------------------------------------------------------------------------
    | WELCOME
    |--------------------------------------------------------------------------
    */

    welcomePanel: {
      position:
        'relative',
      overflow:
        'hidden',
      minHeight: 215,
      paddingTop: 24,
      paddingHorizontal: 21,
      paddingBottom: 54,
      backgroundColor:
        COLORS.maroon,
      borderBottomLeftRadius:
        34,
      borderBottomRightRadius:
        34,
    },


    welcomeDecorationOne: {
      position:
        'absolute',
      width: 180,
      height: 180,
      right: -85,
      top: -75,
      borderRadius: 90,
      borderWidth: 28,
      borderColor:
        'rgba(255,189,54,0.055)',
    },


    welcomeDecorationTwo: {
      position:
        'absolute',
      width: 90,
      height: 90,
      right: 25,
      bottom: -45,
      borderRadius: 45,
      backgroundColor:
        'rgba(255,255,255,0.035)',
    },


    welcomeTop: {
      flexDirection:
        'row',
      alignItems:
        'flex-start',
    },


    greeting: {
      color:
        'rgba(255,255,255,0.68)',
      fontSize: 13,
      fontWeight:
        '600',
    },


    adminName: {
      marginTop: 2,
      color:
        COLORS.white,
      fontSize: 33,
      lineHeight: 39,
      fontWeight:
        '900',
      letterSpacing: -1,
    },


    roleBadge: {
      alignSelf:
        'flex-start',
      marginTop: 9,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 20,
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        'rgba(0,13,18,0.20)',
    },


    roleText: {
      marginLeft: 6,
      color:
        COLORS.white,
      fontSize: 10,
      fontWeight:
        '700',
    },


    welcomeMessage: {
      maxWidth: 285,
      marginTop: 14,
      color:
        'rgba(255,255,255,0.58)',
      fontSize: 11,
      lineHeight: 16,
    },


    qrButton: {
      width: 60,
      height: 66,
      marginLeft: 10,
      borderRadius: 19,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        COLORS.yellow,
    },


    qrButtonText: {
      marginTop: 4,
      color:
        COLORS.maroon,
      fontSize: 8,
      fontWeight:
        '900',
      letterSpacing: 1,
    },


    /*
    |--------------------------------------------------------------------------
    | CONTEXT
    |--------------------------------------------------------------------------
    */

    contextWrap: {
      paddingHorizontal: 20,
      marginTop: -31,
    },


    contextCard: {
      padding: 14,
      borderRadius: 22,
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,

      elevation: 5,

      shadowColor:
        '#000000',

      shadowOffset: {
        width: 0,
        height: 5,
      },

      shadowOpacity: 0.09,
      shadowRadius: 10,
    },


    dateColumn: {
      flexDirection:
        'row',
      alignItems:
        'center',
    },


    dateIcon: {
      width: 41,
      height: 41,
      marginRight: 10,
      borderRadius: 13,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        COLORS.yellowSoft,
    },


    contextLabel: {
      color:
        COLORS.orange,
      fontSize: 9,
      fontWeight:
        '900',
      letterSpacing: 1,
    },


    contextDate: {
      marginTop: 2,
      color:
        COLORS.dark,
      fontSize: 12,
      lineHeight: 16,
      fontWeight:
        '800',
    },


    contextDivider: {
      height: 1,
      marginVertical: 13,
      backgroundColor:
        COLORS.border,
    },


    academicContext: {
      flexDirection:
        'row',
      alignItems:
        'center',
    },


    academicItem: {
      flex: 1,
    },


    academicLabel: {
      color:
        COLORS.muted,
      fontSize: 9,
      fontWeight:
        '700',
      textTransform:
        'uppercase',
      letterSpacing: 0.6,
    },


    academicValue: {
      marginTop: 3,
      color:
        COLORS.maroon,
      fontSize: 11,
      fontWeight:
        '900',
    },


    academicMiniDivider: {
      width: 1,
      height: 29,
      marginHorizontal: 15,
      backgroundColor:
        COLORS.border,
    },


    /*
    |--------------------------------------------------------------------------
    | ERROR
    |--------------------------------------------------------------------------
    */

    errorCard: {
      marginTop: 23,
      padding: 13,
      borderRadius: 17,
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        COLORS.maroonSoft,
    },


    errorText: {
      flex: 1,
      marginLeft: 10,
      color:
        COLORS.maroon,
      fontSize: 11,
      lineHeight: 16,
    },


    /*
    |--------------------------------------------------------------------------
    | SECTION HEADERS
    |--------------------------------------------------------------------------
    */

    componentSection: {
      marginTop: 29,
    },


    sectionSpacing: {
      marginTop: 34,
    },


    sectionHeader: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
    },


    eyebrow: {
      color:
        COLORS.orange,
      fontSize: 9,
      fontWeight:
        '900',
      letterSpacing: 1.2,
    },


    sectionTitle: {
      marginTop: 3,
      color:
        COLORS.black,
      fontSize: 20,
      lineHeight: 24,
      fontWeight:
        '900',
      letterSpacing: -0.35,
    },


    /*
    |--------------------------------------------------------------------------
    | COMPONENT
    |--------------------------------------------------------------------------
    */

    componentTabs: {
      marginTop: 15,
      flexDirection:
        'row',
      gap: 8,
    },


    componentTab: {
      flex: 1,
      minHeight: 46,
      borderRadius: 14,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },


    componentTabActive: {
      backgroundColor:
        COLORS.maroon,
      borderColor:
        COLORS.maroon,
    },


    componentTabText: {
      marginLeft: 6,
      color:
        COLORS.teal,
      fontSize: 11,
      fontWeight:
        '900',
    },


    componentTabTextActive: {
      color:
        COLORS.white,
    },


    /*
    |--------------------------------------------------------------------------
    | DASHBOARD TITLE
    |--------------------------------------------------------------------------
    */

    dashboardTitleRow: {
      marginTop: 35,
      marginBottom: 14,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
    },


    dashboardTitle: {
      marginTop: 3,
      color:
        COLORS.black,
      fontSize: 24,
      fontWeight:
        '900',
      letterSpacing: -0.6,
    },


    refreshButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },


    /*
    |--------------------------------------------------------------------------
    | ATTENDANCE RATE
    |--------------------------------------------------------------------------
    */

    attendanceFeature: {
      padding: 19,
      borderRadius: 25,
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },


    attendanceFeatureTop: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
    },


    featureLabel: {
      color:
        COLORS.muted,
      fontSize: 9,
      fontWeight:
        '900',
      letterSpacing: 1,
    },


    rateRow: {
      marginTop: 2,
      flexDirection:
        'row',
      alignItems:
        'flex-start',
    },


    rate: {
      color:
        COLORS.green,
      fontSize: 48,
      lineHeight: 53,
      fontWeight:
        '900',
      letterSpacing: -1.7,
    },


    percent: {
      marginTop: 4,
      marginLeft: 2,
      color:
        COLORS.green,
      fontSize: 18,
      fontWeight:
        '900',
    },


    rateDescription: {
      marginTop: 1,
      color:
        COLORS.muted,
      fontSize: 10,
    },


    featureSymbol: {
      width: 61,
      height: 61,
      borderRadius: 31,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        COLORS.greenSoft,
    },


    progressTrack: {
      height: 6,
      marginTop: 18,
      overflow:
        'hidden',
      borderRadius: 999,
      backgroundColor:
        COLORS.greenSoft,
    },


    progressFill: {
      height: '100%',
      borderRadius: 999,
      backgroundColor:
        COLORS.green,
    },


    attendanceMessageRow: {
      marginTop: 12,
      flexDirection:
        'row',
      alignItems:
        'center',
    },


    attendanceMessage: {
      flex: 1,
      marginLeft: 7,
      color:
        COLORS.muted,
      fontSize: 11,
      lineHeight: 16,
    },


    /*
    |--------------------------------------------------------------------------
    | ATTENDANCE STATUS
    |--------------------------------------------------------------------------
    */

    attendanceStatusBar: {
      marginTop: 12,
      paddingVertical: 14,
      borderRadius: 20,
      flexDirection:
        'row',
      alignItems:
        'stretch',
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },


    attendanceStatusItem: {
      flex: 1,
      alignItems:
        'center',
    },


    attendanceStatusIcon: {
      width: 30,
      height: 30,
      borderRadius: 10,
      alignItems:
        'center',
      justifyContent:
        'center',
    },


    attendanceStatusValue: {
      marginTop: 6,
      fontSize: 15,
      fontWeight:
        '900',
    },


    attendanceStatusLabel: {
      marginTop: 2,
      color:
        COLORS.muted,
      fontSize: 9,
      fontWeight:
        '700',
    },


    attendanceStatusDivider: {
      width: 1,
      marginVertical: 8,
      backgroundColor:
        COLORS.border,
    },


    /*
    |--------------------------------------------------------------------------
    | FIGURES
    |--------------------------------------------------------------------------
    */

    figuresList: {
      marginTop: 14,
      paddingHorizontal: 16,
      borderRadius: 22,
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },


    figureRow: {
      minHeight: 78,
      flexDirection:
        'row',
      alignItems:
        'center',
    },


    figureIcon: {
      width: 43,
      height: 43,
      borderRadius: 14,
      alignItems:
        'center',
      justifyContent:
        'center',
    },


    figureCopy: {
      flex: 1,
      marginLeft: 11,
    },


    figureLabel: {
      color:
        COLORS.dark,
      fontSize: 13,
      fontWeight:
        '900',
    },


    figureDescription: {
      marginTop: 3,
      color:
        COLORS.muted,
      fontSize: 10,
    },


    figureValue: {
      color:
        COLORS.maroon,
      fontSize: 20,
      fontWeight:
        '900',
    },


    figureDivider: {
      height: 1,
      backgroundColor:
        COLORS.border,
    },


    /*
    |--------------------------------------------------------------------------
    | REQUEST
    |--------------------------------------------------------------------------
    */

    requestPanel: {
      marginTop: 14,
      padding: 17,
      borderRadius: 24,
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },


    requestMain: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
    },


    requestLabel: {
      color:
        COLORS.muted,
      fontSize: 9,
      fontWeight:
        '900',
      letterSpacing: 0.8,
    },


    requestTotal: {
      marginTop: 4,
      color:
        COLORS.dark,
      fontSize: 30,
      fontWeight:
        '900',
    },


    pendingRequest: {
      minWidth: 110,
      paddingHorizontal: 13,
      paddingVertical: 11,
      borderRadius: 16,
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        COLORS.orangeSoft,
    },


    pendingNumber: {
      color:
        COLORS.orange,
      fontSize: 16,
      fontWeight:
        '900',
    },


    pendingText: {
      marginTop: 1,
      color:
        COLORS.muted,
      fontSize: 9,
      fontWeight:
        '700',
    },


    requestRule: {
      height: 1,
      marginVertical: 15,
      backgroundColor:
        COLORS.border,
    },


    requestResults: {
      flexDirection:
        'row',
      alignItems:
        'center',
    },


    requestResult: {
      flex: 1,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
    },


    requestResultIcon: {
      width: 32,
      height: 32,
      marginRight: 8,
      borderRadius: 10,
      alignItems:
        'center',
      justifyContent:
        'center',
      borderWidth: 1.5,
    },


    requestResultValue: {
      fontSize: 15,
      fontWeight:
        '900',
    },


    requestResultLabel: {
      marginTop: 2,
      color:
        COLORS.muted,
      fontSize: 9,
    },


    requestVerticalRule: {
      width: 1,
      height: 35,
      backgroundColor:
        COLORS.border,
    },


    /*
    |--------------------------------------------------------------------------
    | WORKSPACE
    |--------------------------------------------------------------------------
    */

    workspaceFooter: {
      marginTop: 30,
      padding: 15,
      borderRadius: 22,
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        COLORS.teal,
    },


    workspaceIcon: {
      width: 41,
      height: 41,
      borderRadius: 14,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        'rgba(255,189,54,0.12)',
    },


    workspaceCopy: {
      flex: 1,
      marginHorizontal: 10,
    },


    workspaceLabel: {
      color:
        COLORS.yellow,
      fontSize: 9,
      fontWeight:
        '900',
      letterSpacing: 1,
    },


    workspaceTitle: {
      marginTop: 2,
      color:
        COLORS.white,
      fontSize: 11,
      fontWeight:
        '800',
    },


    workspaceSemester: {
      marginTop: 2,
      color:
        'rgba(255,255,255,0.55)',
      fontSize: 9,
    },


    syncRow: {
      marginTop: 14,
      marginBottom: 4,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
    },


    syncText: {
      marginLeft: 5,
      color:
        COLORS.muted,
      fontSize: 9,
    },


    /*
    |--------------------------------------------------------------------------
    | HOME SCANNER
    |--------------------------------------------------------------------------
    */

    scannerPage: {
      flex: 1,
      backgroundColor:
        '#F4F1EA',
    },


    scannerHeader: {
      minHeight: 82,
      paddingHorizontal: 16,
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        COLORS.maroon,
    },


    scannerCloseButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        'rgba(255,255,255,0.10)',
      borderWidth: 1,
      borderColor:
        'rgba(255,255,255,0.12)',
    },


    scannerHeaderCopy: {
      flex: 1,
      minWidth: 0,
      marginHorizontal: 12,
    },


    scannerEyebrow: {
      color:
        COLORS.yellow,
      fontSize: 10,
      fontWeight:
        '900',
      letterSpacing: 1.2,
    },


    scannerTitle: {
      marginTop: 3,
      color:
        COLORS.white,
      fontSize: 22,
      fontWeight:
        '900',
      letterSpacing: -0.35,
    },


    readyBadge: {
      minHeight: 32,
      paddingHorizontal: 9,
      borderRadius: 11,
      flexDirection:
        'row',
      alignItems:
        'center',
    },


    readyBadgeOn: {
      backgroundColor:
        COLORS.greenSoft,
    },


    readyBadgeOff: {
      backgroundColor:
        COLORS.orangeSoft,
    },


    readyDot: {
      width: 7,
      height: 7,
      marginRight: 5,
      borderRadius: 4,
    },


    readyText: {
      fontSize: 9.5,
      fontWeight:
        '900',
      letterSpacing: 0.5,
    },


    scannerBody: {
      paddingHorizontal: 16,
      paddingTop: 16,
    },


    scannerContextRow: {
      flexDirection:
        'row',
      gap: 9,
    },


    scannerContextTile: {
      flex: 1,
      minHeight: 61,
      paddingHorizontal: 11,
      borderRadius: 16,
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },


    scannerContextIcon: {
      width: 35,
      height: 35,
      borderRadius: 11,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        COLORS.tealSoft,
    },


    scannerContextLabel: {
      color:
        COLORS.muted,
      fontSize: 10,
      fontWeight:
        '700',
    },


    scannerContextValue: {
      marginTop: 3,
      color:
        COLORS.dark,
      fontSize: 12,
      fontWeight:
        '900',
    },


    scannerStatePanel: {
      minHeight: 250,
      marginTop: 15,
      padding: 24,
      borderRadius: 24,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },


    scannerErrorPanel: {
      backgroundColor:
        COLORS.maroonSoft,
      borderColor:
        'rgba(84,16,15,0.15)',
    },


    scannerStateIcon: {
      width: 64,
      height: 64,
      borderRadius: 20,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        COLORS.white,
    },


    scannerStateTitle: {
      marginTop: 13,
      color:
        COLORS.dark,
      fontSize: 17,
      fontWeight:
        '900',
      textAlign:
        'center',
    },


    scannerStateText: {
      maxWidth: 315,
      marginTop: 7,
      color:
        COLORS.muted,
      fontSize: 12,
      lineHeight: 18,
      textAlign:
        'center',
    },


    setupButton: {
      width: '100%',
      minHeight: 52,
      marginTop: 18,
      borderRadius: 16,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        COLORS.green,
    },


    setupButtonText: {
      marginLeft: 7,
      color:
        COLORS.white,
      fontSize: 12.5,
      fontWeight:
        '900',
    },


    /*
    |--------------------------------------------------------------------------
    | SCANNER SCHEDULE
    |--------------------------------------------------------------------------
    */

    scheduleStrip: {
      marginTop: 13,
      padding: 11,
      borderRadius: 17,
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },


    scheduleItem: {
      flex: 1,
      minWidth: 0,
      flexDirection:
        'row',
      alignItems:
        'center',
    },


    scheduleItemIcon: {
      width: 36,
      height: 36,
      marginRight: 8,
      borderRadius: 11,
      alignItems:
        'center',
      justifyContent:
        'center',
    },


    scheduleItemLabel: {
      color:
        COLORS.muted,
      fontSize: 10,
      fontWeight:
        '700',
    },


    scheduleItemValue: {
      marginTop: 2,
      color:
        COLORS.dark,
      fontSize: 10.5,
      fontWeight:
        '900',
    },


    scheduleDivider: {
      width: 1,
      height: 35,
      marginHorizontal: 9,
      backgroundColor:
        COLORS.border,
    },


    /*
    |--------------------------------------------------------------------------
    | CAMERA
    |--------------------------------------------------------------------------
    */

    cameraShell: {
      marginTop: 13,
      padding: 6,
      borderRadius: 26,
      backgroundColor:
        COLORS.black,

      elevation: 5,

      shadowColor:
        COLORS.black,

      shadowOffset: {
        width: 0,
        height: 8,
      },

      shadowOpacity: 0.15,
      shadowRadius: 15,
    },


    cameraWindow: {
      position:
        'relative',
      height: 440,
      overflow:
        'hidden',
      borderRadius: 21,
      backgroundColor:
        '#101B1F',
    },


    cameraPlaceholder: {
      ...StyleSheet
        .absoluteFillObject,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal: 30,

      backgroundColor:
        '#101B1F',
    },


    cameraPlaceholderIcon: {
      width: 90,
      height: 90,
      borderRadius: 29,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        'rgba(255,255,255,0.06)',
      borderWidth: 1,
      borderColor:
        'rgba(255,255,255,0.09)',
    },


    cameraPlaceholderTitle: {
      marginTop: 15,
      color:
        COLORS.white,
      fontSize: 18,
      fontWeight:
        '900',
    },


    cameraPlaceholderText: {
      maxWidth: 285,
      marginTop: 6,
      color:
        'rgba(255,255,255,0.58)',
      fontSize: 12,
      lineHeight: 18,
      textAlign:
        'center',
    },


    /*
    |--------------------------------------------------------------------------
    | SCAN FRAME
    |--------------------------------------------------------------------------
    */

    scanTarget: {
      position:
        'absolute',

      width: 260,
      height: 260,

      top: '50%',
      left: '50%',

      marginTop:
        -130,

      marginLeft:
        -130,
    },


    scanCorner: {
      position:
        'absolute',

      width: 54,
      height: 54,

      borderColor:
        COLORS.yellow,
    },


    topLeft: {
      top: 0,
      left: 0,

      borderTopWidth:
        5,

      borderLeftWidth:
        5,

      borderTopLeftRadius:
        16,
    },


    topRight: {
      top: 0,
      right: 0,

      borderTopWidth:
        5,

      borderRightWidth:
        5,

      borderTopRightRadius:
        16,
    },


    bottomLeft: {
      bottom: 0,
      left: 0,

      borderBottomWidth:
        5,

      borderLeftWidth:
        5,

      borderBottomLeftRadius:
        16,
    },


    bottomRight: {
      right: 0,
      bottom: 0,

      borderBottomWidth:
        5,

      borderRightWidth:
        5,

      borderBottomRightRadius:
        16,
    },


    scanLine: {
      position:
        'absolute',

      left: 18,
      right: 18,

      top: '50%',

      height: 2,
      borderRadius: 2,

      backgroundColor:
        COLORS.yellow,
    },


    /*
    |--------------------------------------------------------------------------
    | CAMERA OVERLAY
    |--------------------------------------------------------------------------
    */

    cameraTopOverlay: {
      position:
        'absolute',

      top: 12,
      left: 12,
      right: 12,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },


    liveBadge: {
      minHeight: 32,
      paddingHorizontal: 10,
      borderRadius: 11,
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        'rgba(0,13,18,0.80)',
    },


    liveDot: {
      width: 7,
      height: 7,
      marginRight: 6,
      borderRadius: 4,
    },


    liveText: {
      color:
        COLORS.white,
      fontSize: 10,
      fontWeight:
        '900',
      letterSpacing: 0.7,
    },


    cameraComponentBadge: {
      minHeight: 32,
      paddingHorizontal: 10,
      borderRadius: 11,
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        'rgba(0,13,18,0.80)',
    },


    cameraComponentText: {
      marginLeft: 5,
      color:
        COLORS.white,
      fontSize: 10.5,
      fontWeight:
        '900',
    },


    cameraHint: {
      position:
        'absolute',

      left: 18,
      right: 18,
      bottom: 15,

      minHeight: 39,

      paddingHorizontal: 11,

      borderRadius: 13,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        'rgba(0,13,18,0.80)',
    },


    cameraHintText: {
      marginLeft: 6,
      color:
        COLORS.white,
      fontSize: 10.5,
      fontWeight:
        '700',
    },


    /*
    |--------------------------------------------------------------------------
    | SCAN RESULT
    |--------------------------------------------------------------------------
    */

    scanMessage: {
      marginTop: 12,
      padding: 12,
      borderRadius: 17,
      flexDirection:
        'row',
      alignItems:
        'flex-start',
      borderWidth: 1,
    },


    scanMessageSuccess: {
      backgroundColor:
        '#F8FAF5',
      borderColor:
        'rgba(88,118,28,0.20)',
    },


    scanMessageError: {
      backgroundColor:
        '#FCF7F7',
      borderColor:
        'rgba(84,16,15,0.20)',
    },


    scanMessageIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      alignItems:
        'center',
      justifyContent:
        'center',
    },


    scanMessageCopy: {
      flex: 1,
      minWidth: 0,
      marginLeft: 10,
    },


    scanMessageTitle: {
      fontSize: 12.5,
      fontWeight:
        '900',
    },


    scanStudentName: {
      marginTop: 3,
      color:
        COLORS.dark,
      fontSize: 13.5,
      fontWeight:
        '900',
    },


    scanMessageText: {
      marginTop: 4,
      color:
        COLORS.muted,
      fontSize: 11,
      lineHeight: 16,
    },


    scanMetaRow: {
      marginTop: 8,
      flexDirection:
        'row',
      flexWrap:
        'wrap',
      gap: 6,
    },


    resultPill: {
      minHeight: 28,
      paddingHorizontal: 8,
      borderRadius: 9,
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        COLORS.tealSoft,
    },


    resultPillText: {
      marginLeft: 4,
      color:
        COLORS.teal,
      fontSize: 9.5,
      fontWeight:
        '800',
    },


    /*
    |--------------------------------------------------------------------------
    | SCANNER ACTIONS
    |--------------------------------------------------------------------------
    */

    scannerActions: {
      marginTop: 12,
      flexDirection:
        'row',
      gap: 9,
    },


    secondaryScannerButton: {
      flex: 0.9,
      minHeight: 53,
      borderRadius: 16,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        COLORS.tealSoft,
      borderWidth: 1,
      borderColor:
        'rgba(35,62,71,0.12)',
    },


    secondaryScannerText: {
      marginLeft: 6,
      color:
        COLORS.teal,
      fontSize: 11.5,
      fontWeight:
        '900',
    },


    startScannerButton: {
      flex: 1.35,
      minHeight: 53,
      borderRadius: 16,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        COLORS.green,
    },


    stopScannerButton: {
      flex: 1.35,
      minHeight: 53,
      borderRadius: 16,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        COLORS.maroon,
    },


    primaryScannerText: {
      marginLeft: 7,
      color:
        COLORS.white,
      fontSize: 11.5,
      fontWeight:
        '900',
    },

  });
