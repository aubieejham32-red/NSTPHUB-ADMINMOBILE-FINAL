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
} from 'react-native-safe-area-context';

import {
    getAdminDashboard,
    logoutAdministrator,
} from '../../services/api';


/*
|--------------------------------------------------------------------------
| COLORS
|--------------------------------------------------------------------------
*/

const COLORS = {
  maroon: '#54100F',
  maroonDark: '#3E0B0A',

  cream: '#F4EFE8',
  card: '#FFFDF9',

  white: '#FFFFFF',

  dark: '#211918',
  muted: '#7D716D',

  border: '#E7DED5',

  gold: '#D99B32',
  goldLight: '#F5E6C7',

  green: '#58761C',
  greenLight: '#E8EEDB',

  orange: '#D99202',
  orangeLight: '#F9ECD2',

  teal: '#233E47',
  tealLight: '#E3EAEC',

  redLight: '#F2E2E0',
};


/*
|--------------------------------------------------------------------------
| ADMIN HOME SCREEN
|--------------------------------------------------------------------------
|
| Focus:
|
| 1. Total Students
| 2. Today's Attendance
| 3. Excuse Letters
|
| Dashboard automatically refreshes from Laravel.
|
*/

export default function AdminHomeScreen() {

  /*
  |--------------------------------------------------------------------------
  | State
  |--------------------------------------------------------------------------
  */

  const [
    data,
    setData,
  ] = useState(null);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    refreshing,
    setRefreshing,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState('');


  /*
  |--------------------------------------------------------------------------
  | Load Dashboard
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

        } catch (err) {

          const message =
            err instanceof Error
              ? err.message
              : 'Unable to load dashboard data.';


          setError(message);


          const normalizedMessage =
            String(message)
              .toLowerCase();


          /*
          |--------------------------------------------------------------------------
          | Redirect expired / invalid sessions
          |--------------------------------------------------------------------------
          */

          if (
            normalizedMessage.includes(
              'logged in'
            )
            ||
            normalizedMessage.includes(
              'unauthenticated'
            )
            ||
            normalizedMessage.includes(
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
  | Initial Load + Automatic Refresh
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {

      loadDashboard();


      /*
      |--------------------------------------------------------------------------
      | Refresh from backend every 15 seconds
      |--------------------------------------------------------------------------
      */

      const interval =
        setInterval(
          () => {

            loadDashboard(false);

          },
          15000
        );


      return () => {
        clearInterval(interval);
      };

    },
    [
      loadDashboard,
    ]
  );


  /*
  |--------------------------------------------------------------------------
  | Logout
  |--------------------------------------------------------------------------
  */

  const handleLogout =
    async () => {

      try {

        await logoutAdministrator();

      } catch (err) {

        console.log(
          'Logout error:',
          err
        );

      } finally {

        router.replace(
          '/AccessCodeScreen'
        );

      }

    };


  const confirmLogout =
    () => {

      Alert.alert(
        'Sign out',
        'Are you sure you want to sign out?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },

          {
            text: 'Sign out',
            style: 'destructive',
            onPress: handleLogout,
          },
        ]
      );

    };


  /*
  |--------------------------------------------------------------------------
  | Dashboard Values
  |--------------------------------------------------------------------------
  */

  const stats =
    data?.stats ?? {};


  /*
  |--------------------------------------------------------------------------
  | Signed-in Account
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
      ? 'ATTENDANCE COORDINATOR'
      : signedInRole ===
        'instructor'
        ? 'INSTRUCTOR'
        : 'UNIVERSITY ADMINISTRATOR';


  const signedInName =
    signedInAccount?.name
    ||
    roleLabel;


  /*
  |--------------------------------------------------------------------------
  | Students
  |--------------------------------------------------------------------------
  */

  const students =
    Number(
      stats.students ?? 0
    );


  /*
  |--------------------------------------------------------------------------
  | Attendance
  |--------------------------------------------------------------------------
  */

  const present =
    Number(
      stats.present ?? 0
    );


  const late =
    Number(
      stats.late ?? 0
    );


  const absent =
    Number(
      stats.absent ?? 0
    );


  const excused =
    Number(
      stats.excused ?? 0
    );


  const attendanceRecorded =
    Number(
      stats.attendance_recorded
      ??
      (
        present
        +
        late
        +
        absent
        +
        excused
      )
    );


  /*
  |--------------------------------------------------------------------------
  | Attendance Rate
  |--------------------------------------------------------------------------
  */

  const participationRate =
    Number(
      stats.attendance_rate
      ??
      (
        attendanceRecorded > 0
          ? Math.round(
              (
                (
                  present
                  +
                  late
                )
                /
                attendanceRecorded
              )
              *
              100
            )
          : 0
      )
    );


  /*
  |--------------------------------------------------------------------------
  | Excuse Letters
  |--------------------------------------------------------------------------
  */

  const totalExcuseLetters =
    Number(
      stats.total_excuse_letters
      ??
      0
    );


  const pendingExcuseLetters =
    Number(
      stats.pending_excuse_letters
      ??
      0
    );


  const approvedExcuseLetters =
    Number(
      stats.approved_excuse_letters
      ??
      0
    );


  const rejectedExcuseLetters =
    Number(
      stats.rejected_excuse_letters
      ??
      0
    );


  /*
  |--------------------------------------------------------------------------
  | Attendance Cards
  |--------------------------------------------------------------------------
  */

  const attendanceItems =
    useMemo(
      () => [
        {
          key: 'present',

          label: 'Present',

          value: present,

          icon:
            'checkmark-circle-outline',

          color:
            COLORS.green,

          background:
            COLORS.greenLight,
        },

        {
          key: 'late',

          label: 'Late',

          value: late,

          icon:
            'time-outline',

          color:
            COLORS.orange,

          background:
            COLORS.orangeLight,
        },

        {
          key: 'absent',

          label: 'Absent',

          value: absent,

          icon:
            'close-circle-outline',

          color:
            COLORS.maroon,

          background:
            COLORS.redLight,
        },

        {
          key: 'excused',

          label: 'Excused',

          value: excused,

          icon:
            'document-text-outline',

          color:
            COLORS.teal,

          background:
            COLORS.tealLight,
        },
      ],
      [
        present,
        late,
        absent,
        excused,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | Participation Label
  |--------------------------------------------------------------------------
  */

  const participationLabel =
    attendanceRecorded === 0
      ? 'No records yet'
      : participationRate >= 90
        ? 'Excellent'
        : participationRate >= 75
          ? 'Good'
          : participationRate >= 50
            ? 'Needs attention'
            : 'Low';


  /*
  |--------------------------------------------------------------------------
  | Loading State
  |--------------------------------------------------------------------------
  */

  if (loading) {

    return (
      <SafeAreaView
        style={
          styles.loadingScreen
        }
      >

        <StatusBar
          barStyle="light-content"
          backgroundColor={
            COLORS.maroon
          }
        />


        <ActivityIndicator
          size="large"
          color={
            COLORS.gold
          }
        />


        <Text
          style={
            styles.loadingText
          }
        >
          Loading dashboard...
        </Text>

      </SafeAreaView>
    );

  }


  /*
  |--------------------------------------------------------------------------
  | Main UI
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
        style={
          styles.scrollView
        }
        contentContainerStyle={
          styles.contentContainer
        }
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={

          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              () =>
                loadDashboard(true)
            }
            tintColor={
              COLORS.maroon
            }
            colors={[
              COLORS.maroon,
            ]}
          />

        }
      >


        {/*
        |--------------------------------------------------------------------------
        | HEADER
        |--------------------------------------------------------------------------
        */}

        <View
          style={
            styles.header
          }
        >

          <View
            style={
              styles.headerTop
            }
          >

            <View
              style={
                styles.headerTitleWrapper
              }
            >

              <Text
                style={
                  styles.adminLabel
                }
              >
                {roleLabel}
              </Text>


              <Text
                style={
                  styles.headerTitle
                }
              >
                Overview
              </Text>

            </View>


            <TouchableOpacity
              style={
                styles.logoutButton
              }
              activeOpacity={
                0.75
              }
              onPress={
                confirmLogout
              }
            >

              <Ionicons
                name="log-out-outline"
                size={21}
                color={
                  COLORS.white
                }
              />

            </TouchableOpacity>

          </View>


          {/*
          |--------------------------------------------------------------------------
          | Administrator
          |--------------------------------------------------------------------------
          */}

          <Text
            style={
              styles.adminName
            }
          >
            {
              signedInName
            }
          </Text>


          <Text
            style={
              styles.universityName
            }
          >
            {
              data
                ?.university
                ?.name
              ||
              'NSTP Institution'
            }
          </Text>


          {/*
          |--------------------------------------------------------------------------
          | Live Connection
          |--------------------------------------------------------------------------
          */}

          <View
            style={
              styles.liveRow
            }
          >

            <View
              style={
                styles.liveDot
              }
            />


            <Text
              style={
                styles.liveText
              }
            >
              LIVE DATA
            </Text>


            <View
              style={
                styles.liveDivider
              }
            />


            <Text
              numberOfLines={1}
              style={
                styles.periodText
              }
            >
              {
                data
                  ?.university
                  ?.academic_year
                ||
                'Academic Year'
              }
            </Text>


            <Text
              style={
                styles.periodSeparator
              }
            >
              •
            </Text>


            <Text
              numberOfLines={1}
              style={
                styles.periodText
              }
            >
              {
                data
                  ?.university
                  ?.semester
                ||
                'Semester'
              }
            </Text>

          </View>

        </View>


        {/*
        |--------------------------------------------------------------------------
        | API ERROR
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
                  size={18}
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
                  onPress={
                    () =>
                      loadDashboard(true)
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
        | TOTAL STUDENTS
        |--------------------------------------------------------------------------
        */}

        <View
          style={
            styles.studentCard
          }
        >

          <View
            style={
              styles.studentIcon
            }
          >

            <Ionicons
              name="people"
              size={29}
              color={
                COLORS.white
              }
            />

          </View>


          <View
            style={
              styles.studentContent
            }
          >

            <Text
              style={
                styles.studentLabel
              }
            >
              ENROLLED STUDENTS
            </Text>


            <Text
              style={
                styles.studentNumber
              }
            >
              {
                students
                  .toLocaleString()
              }
            </Text>


            <Text
              style={
                styles.studentCaption
              }
            >
              Total students registered under your institution
            </Text>

          </View>


          <View
            style={
              styles.studentAccent
            }
          />

        </View>


        {/*
        |--------------------------------------------------------------------------
        | ATTENDANCE HEADING
        |--------------------------------------------------------------------------
        */}

        <View
          style={
            styles.sectionHeading
          }
        >

          <View>

            <Text
              style={
                styles.sectionEyebrow
              }
            >
              TODAY
            </Text>


            <Text
              style={
                styles.sectionTitle
              }
            >
              Attendance
            </Text>

          </View>


          <View
            style={
              styles.recordedBadge
            }
          >

            <Text
              style={
                styles.recordedNumber
              }
            >
              {
                attendanceRecorded
                  .toLocaleString()
              }
            </Text>


            <Text
              style={
                styles.recordedText
              }
            >
              RECORDED
            </Text>

          </View>

        </View>


        {/*
        |--------------------------------------------------------------------------
        | ATTENDANCE PARTICIPATION
        |--------------------------------------------------------------------------
        */}

        <View
          style={
            styles.attendanceMainCard
          }
        >

          <View
            style={
              styles.rateLeft
            }
          >

            <Text
              style={
                styles.rateLabel
              }
            >
              PARTICIPATION
            </Text>


            <View
              style={
                styles.rateRow
              }
            >

              <Text
                style={
                  styles.rateValue
                }
              >
                {participationRate}
              </Text>


              <Text
                style={
                  styles.ratePercent
                }
              >
                %
              </Text>

            </View>


            <Text
              style={
                styles.rateCaption
              }
            >
              Present and late students
            </Text>

          </View>


          <View
            style={
              styles.rateDivider
            }
          />


          <View
            style={
              styles.rateRight
            }
          >

            <View
              style={
                styles.rateIcon
              }
            >

              <Ionicons
                name="analytics-outline"
                size={28}
                color={
                  COLORS.green
                }
              />

            </View>


            <Text
              style={
                styles.rateStatus
              }
            >
              {participationLabel}
            </Text>

          </View>

        </View>


        {/*
        |--------------------------------------------------------------------------
        | ATTENDANCE BREAKDOWN
        |--------------------------------------------------------------------------
        */}

        <View
          style={
            styles.attendanceGrid
          }
        >

          {
            attendanceItems.map(
              item => (

                <View
                  key={
                    item.key
                  }
                  style={
                    styles.attendanceCard
                  }
                >

                  <View
                    style={[
                      styles.attendanceIcon,

                      {
                        backgroundColor:
                          item.background,
                      },
                    ]}
                  >

                    <Ionicons
                      name={
                        item.icon
                      }
                      size={21}
                      color={
                        item.color
                      }
                    />

                  </View>


                  <Text
                    style={[
                      styles.attendanceValue,

                      {
                        color:
                          item.color,
                      },
                    ]}
                  >
                    {
                      item.value
                        .toLocaleString()
                    }
                  </Text>


                  <Text
                    style={
                      styles.attendanceLabel
                    }
                  >
                    {item.label}
                  </Text>

                </View>

              )
            )
          }

        </View>


        {/*
        |--------------------------------------------------------------------------
        | EXCUSE LETTERS HEADING
        |--------------------------------------------------------------------------
        */}

        <View
          style={[
            styles.sectionHeading,
            styles.excuseHeading,
          ]}
        >

          <View>

            <Text
              style={
                styles.sectionEyebrow
              }
            >
              STUDENT REQUESTS
            </Text>


            <Text
              style={
                styles.sectionTitle
              }
            >
              Excuse Letters
            </Text>

          </View>


          <View
            style={
              styles.documentIcon
            }
          >

            <Ionicons
              name="document-text-outline"
              size={22}
              color={
                COLORS.maroon
              }
            />

          </View>

        </View>


        {/*
        |--------------------------------------------------------------------------
        | EXCUSE LETTER SUMMARY
        |--------------------------------------------------------------------------
        */}

        <View
          style={
            styles.excuseMainCard
          }
        >

          <View
            style={
              styles.excuseMainTop
            }
          >

            <View>

              <Text
                style={
                  styles.excuseTotalLabel
                }
              >
                TOTAL SUBMISSIONS
              </Text>


              <Text
                style={
                  styles.excuseTotal
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
                styles.pendingBox
              }
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
                  styles.pendingLabel
                }
              >
                PENDING
              </Text>

            </View>

          </View>


          <View
            style={
              styles.excuseDivider
            }
          />


          {/*
          |--------------------------------------------------------------------------
          | Approved / Rejected
          |--------------------------------------------------------------------------
          */}

          <View
            style={
              styles.excuseStatusRow
            }
          >

            <ExcuseStatus
              icon="checkmark"
              label="Approved"
              value={
                approvedExcuseLetters
              }
              color={
                COLORS.green
              }
              background={
                COLORS.greenLight
              }
            />


            <View
              style={
                styles.statusDivider
              }
            />


            <ExcuseStatus
              icon="close"
              label="Rejected"
              value={
                rejectedExcuseLetters
              }
              color={
                COLORS.maroon
              }
              background={
                COLORS.redLight
              }
            />

          </View>

        </View>


        {/*
        |--------------------------------------------------------------------------
        | LAST UPDATED
        |--------------------------------------------------------------------------
        */}

        <TouchableOpacity
          activeOpacity={0.7}
          style={
            styles.syncRow
          }
          onPress={
            () =>
              loadDashboard(true)
          }
        >

          <Ionicons
            name="sync-outline"
            size={15}
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
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  )}`
                : 'Connected to NSTP HUB'
            }
          </Text>

        </TouchableOpacity>

      </ScrollView>

    </SafeAreaView>
  );
}


/*
|--------------------------------------------------------------------------
| EXCUSE STATUS
|--------------------------------------------------------------------------
*/

function ExcuseStatus({
  icon,
  label,
  value,
  color,
  background,
}) {

  return (
    <View
      style={
        styles.excuseStatus
      }
    >

      <View
        style={[
          styles.excuseStatusIcon,

          {
            backgroundColor:
              background,
          },
        ]}
      >

        <Ionicons
          name={icon}
          size={17}
          color={color}
        />

      </View>


      <View>

        <Text
          style={[
            styles.excuseStatusValue,

            {
              color:
                color,
            },
          ]}
        >
          {
            Number(
              value ?? 0
            )
              .toLocaleString()
          }
        </Text>


        <Text
          style={
            styles.excuseStatusLabel
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
| STYLES
|--------------------------------------------------------------------------
*/

const styles =
  StyleSheet.create({

    /*
    |--------------------------------------------------------------------------
    | Root
    |--------------------------------------------------------------------------
    */

    safeArea: {
      flex: 1,

      backgroundColor:
        COLORS.maroon,
    },


    scrollView: {
      flex: 1,

      backgroundColor:
        COLORS.cream,
    },


    contentContainer: {
      paddingBottom: 38,
    },


    /*
    |--------------------------------------------------------------------------
    | Loading
    |--------------------------------------------------------------------------
    */

    loadingScreen: {
      flex: 1,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        COLORS.maroon,

      gap: 14,
    },


    loadingText: {
      color:
        COLORS.white,

      fontSize: 12,

      fontWeight: '600',

      letterSpacing: 0.5,
    },


    /*
    |--------------------------------------------------------------------------
    | Header
    |--------------------------------------------------------------------------
    */

    header: {
      paddingTop: 16,

      paddingHorizontal: 22,

      paddingBottom: 27,

      backgroundColor:
        COLORS.maroon,

      borderBottomLeftRadius: 30,

      borderBottomRightRadius: 30,
    },


    headerTop: {
      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',
    },


    headerTitleWrapper: {
      flex: 1,
    },


    adminLabel: {
      color:
        COLORS.gold,

      fontSize: 9,

      fontWeight: '800',

      letterSpacing: 2.1,
    },


    headerTitle: {
      marginTop: 2,

      color:
        COLORS.white,

      fontSize: 28,

      lineHeight: 34,

      fontWeight: '700',
    },


    logoutButton: {
      width: 43,

      height: 43,

      borderRadius: 15,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        'rgba(255,255,255,0.08)',

      borderWidth: 1,

      borderColor:
        'rgba(255,255,255,0.10)',
    },


    adminName: {
      marginTop: 21,

      color:
        COLORS.white,

      fontSize: 15,

      fontWeight: '600',
    },


    universityName: {
      marginTop: 3,

      color:
        'rgba(255,255,255,0.68)',

      fontSize: 11.5,

      lineHeight: 17,
    },


    /*
    |--------------------------------------------------------------------------
    | Live Data
    |--------------------------------------------------------------------------
    */

    liveRow: {
      marginTop: 18,

      flexDirection: 'row',

      alignItems: 'center',

      flexWrap: 'wrap',
    },


    liveDot: {
      width: 7,

      height: 7,

      borderRadius: 3.5,

      backgroundColor:
        '#9CC15B',
    },


    liveText: {
      marginLeft: 6,

      color:
        '#D9E6C0',

      fontSize: 8,

      fontWeight: '800',

      letterSpacing: 1.3,
    },


    liveDivider: {
      width: 1,

      height: 12,

      marginHorizontal: 10,

      backgroundColor:
        'rgba(255,255,255,0.16)',
    },


    periodText: {
      color:
        'rgba(255,255,255,0.63)',

      fontSize: 9.5,

      fontWeight: '500',
    },


    periodSeparator: {
      marginHorizontal: 6,

      color:
        COLORS.gold,

      fontSize: 9,
    },


    /*
    |--------------------------------------------------------------------------
    | Error
    |--------------------------------------------------------------------------
    */

    errorCard: {
      marginTop: 17,

      marginHorizontal: 20,

      padding: 13,

      borderRadius: 13,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 9,

      backgroundColor:
        COLORS.redLight,

      borderWidth: 1,

      borderColor:
        '#E7CBC8',
    },


    errorText: {
      flex: 1,

      color:
        COLORS.maroon,

      fontSize: 11,

      lineHeight: 16,
    },


    /*
    |--------------------------------------------------------------------------
    | Students
    |--------------------------------------------------------------------------
    */

    studentCard: {
      position: 'relative',

      marginTop: 20,

      marginHorizontal: 20,

      padding: 20,

      borderRadius: 22,

      flexDirection: 'row',

      alignItems: 'center',

      overflow: 'hidden',

      backgroundColor:
        COLORS.card,

      borderWidth: 1,

      borderColor:
        COLORS.border,
    },


    studentIcon: {
      width: 58,

      height: 58,

      borderRadius: 18,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        COLORS.maroon,
    },


    studentContent: {
      flex: 1,

      marginLeft: 16,
    },


    studentLabel: {
      color:
        COLORS.muted,

      fontSize: 8.5,

      fontWeight: '800',

      letterSpacing: 1.3,
    },


    studentNumber: {
      marginTop: 1,

      color:
        COLORS.maroon,

      fontSize: 31,

      lineHeight: 36,

      fontWeight: '800',
    },


    studentCaption: {
      marginTop: 3,

      color:
        COLORS.muted,

      fontSize: 10,

      lineHeight: 15,
    },


    studentAccent: {
      position: 'absolute',

      top: 0,

      right: 0,

      width: 5,

      height: '100%',

      backgroundColor:
        COLORS.gold,
    },


    /*
    |--------------------------------------------------------------------------
    | Section Heading
    |--------------------------------------------------------------------------
    */

    sectionHeading: {
      marginTop: 28,

      marginHorizontal: 20,

      marginBottom: 13,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',
    },


    excuseHeading: {
      marginTop: 30,
    },


    sectionEyebrow: {
      color:
        COLORS.orange,

      fontSize: 8,

      fontWeight: '800',

      letterSpacing: 1.6,
    },


    sectionTitle: {
      marginTop: 2,

      color:
        COLORS.dark,

      fontSize: 21,

      lineHeight: 27,

      fontWeight: '700',
    },


    /*
    |--------------------------------------------------------------------------
    | Recorded Badge
    |--------------------------------------------------------------------------
    */

    recordedBadge: {
      flexDirection: 'row',

      alignItems: 'baseline',

      paddingHorizontal: 10,

      paddingVertical: 7,

      borderRadius: 10,

      backgroundColor:
        COLORS.card,

      borderWidth: 1,

      borderColor:
        COLORS.border,
    },


    recordedNumber: {
      color:
        COLORS.maroon,

      fontSize: 15,

      fontWeight: '800',
    },


    recordedText: {
      marginLeft: 4,

      color:
        COLORS.muted,

      fontSize: 7,

      fontWeight: '800',

      letterSpacing: 0.7,
    },


    /*
    |--------------------------------------------------------------------------
    | Participation
    |--------------------------------------------------------------------------
    */

    attendanceMainCard: {
      marginHorizontal: 20,

      padding: 18,

      minHeight: 126,

      flexDirection: 'row',

      alignItems: 'center',

      borderRadius: 21,

      backgroundColor:
        COLORS.card,

      borderWidth: 1,

      borderColor:
        COLORS.border,
    },


    rateLeft: {
      flex: 1,
    },


    rateLabel: {
      color:
        COLORS.muted,

      fontSize: 8,

      fontWeight: '800',

      letterSpacing: 1.3,
    },


    rateRow: {
      flexDirection: 'row',

      alignItems:
        'flex-start',

      marginTop: 5,
    },


    rateValue: {
      color:
        COLORS.green,

      fontSize: 39,

      lineHeight: 43,

      fontWeight: '800',
    },


    ratePercent: {
      marginTop: 4,

      marginLeft: 2,

      color:
        COLORS.green,

      fontSize: 17,

      fontWeight: '700',
    },


    rateCaption: {
      marginTop: 2,

      color:
        COLORS.muted,

      fontSize: 9.5,
    },


    rateDivider: {
      width: 1,

      height: 67,

      marginHorizontal: 17,

      backgroundColor:
        COLORS.border,
    },


    rateRight: {
      width: 90,

      alignItems: 'center',

      justifyContent:
        'center',
    },


    rateIcon: {
      width: 48,

      height: 48,

      borderRadius: 15,

      alignItems: 'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.greenLight,
    },


    rateStatus: {
      marginTop: 7,

      color:
        COLORS.green,

      fontSize: 9,

      fontWeight: '700',

      textAlign: 'center',
    },


    /*
    |--------------------------------------------------------------------------
    | Attendance Grid
    |--------------------------------------------------------------------------
    */

    attendanceGrid: {
      marginTop: 11,

      marginHorizontal: 20,

      flexDirection: 'row',

      flexWrap: 'wrap',

      justifyContent:
        'space-between',

      gap: 10,
    },


    attendanceCard: {
      width: '48.5%',

      padding: 15,

      borderRadius: 18,

      backgroundColor:
        COLORS.card,

      borderWidth: 1,

      borderColor:
        COLORS.border,
    },


    attendanceIcon: {
      width: 38,

      height: 38,

      borderRadius: 12,

      alignItems: 'center',

      justifyContent:
        'center',
    },


    attendanceValue: {
      marginTop: 13,

      fontSize: 24,

      lineHeight: 28,

      fontWeight: '800',
    },


    attendanceLabel: {
      marginTop: 2,

      color:
        COLORS.muted,

      fontSize: 10.5,

      fontWeight: '600',
    },


    /*
    |--------------------------------------------------------------------------
    | Excuse Header
    |--------------------------------------------------------------------------
    */

    documentIcon: {
      width: 42,

      height: 42,

      borderRadius: 13,

      alignItems: 'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.redLight,
    },


    /*
    |--------------------------------------------------------------------------
    | Excuse Main Card
    |--------------------------------------------------------------------------
    */

    excuseMainCard: {
      marginHorizontal: 20,

      padding: 19,

      borderRadius: 21,

      backgroundColor:
        COLORS.card,

      borderWidth: 1,

      borderColor:
        COLORS.border,
    },


    excuseMainTop: {
      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',
    },


    excuseTotalLabel: {
      color:
        COLORS.muted,

      fontSize: 8,

      fontWeight: '800',

      letterSpacing: 1.25,
    },


    excuseTotal: {
      marginTop: 3,

      color:
        COLORS.maroon,

      fontSize: 33,

      lineHeight: 38,

      fontWeight: '800',
    },


    pendingBox: {
      minWidth: 84,

      paddingVertical: 10,

      paddingHorizontal: 13,

      borderRadius: 14,

      alignItems: 'center',

      backgroundColor:
        COLORS.goldLight,
    },


    pendingNumber: {
      color:
        '#8C5C00',

      fontSize: 21,

      lineHeight: 25,

      fontWeight: '800',
    },


    pendingLabel: {
      marginTop: 1,

      color:
        '#8C5C00',

      fontSize: 7,

      fontWeight: '800',

      letterSpacing: 1,
    },


    excuseDivider: {
      width: '100%',

      height: 1,

      marginVertical: 17,

      backgroundColor:
        COLORS.border,
    },


    excuseStatusRow: {
      flexDirection: 'row',

      alignItems: 'center',
    },


    excuseStatus: {
      flex: 1,

      flexDirection: 'row',

      alignItems: 'center',
    },


    excuseStatusIcon: {
      width: 36,

      height: 36,

      borderRadius: 11,

      alignItems: 'center',

      justifyContent:
        'center',

      marginRight: 9,
    },


    excuseStatusValue: {
      fontSize: 18,

      lineHeight: 21,

      fontWeight: '800',
    },


    excuseStatusLabel: {
      marginTop: 1,

      color:
        COLORS.muted,

      fontSize: 9.5,

      fontWeight: '600',
    },


    statusDivider: {
      width: 1,

      height: 40,

      marginHorizontal: 12,

      backgroundColor:
        COLORS.border,
    },


    /*
    |--------------------------------------------------------------------------
    | Sync
    |--------------------------------------------------------------------------
    */

    syncRow: {
      alignSelf: 'center',

      marginTop: 22,

      flexDirection: 'row',

      alignItems: 'center',

      paddingVertical: 7,

      paddingHorizontal: 10,
    },


    syncText: {
      marginLeft: 6,

      color:
        COLORS.muted,

      fontSize: 9,
    },

  });