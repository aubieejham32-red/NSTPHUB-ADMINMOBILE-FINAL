import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
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
  getExcuseLetters,
  reviewExcuseLetter,
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

  page: '#F4F1EA',

  muted: '#756F69',
  lightMuted: '#9C9590',
  border: '#DDD7CE',

  softMaroon: '#F5E9E7',
  softGreen: '#EAF0DF',
  softYellow: '#FFF3D2',
  softOrange: '#FBEBCB',
  softTeal: '#E5ECEE',
};


const API_BASE_URL =
  process.env.EXPO_PUBLIC_NSTPHUB_SERVER_URL ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  '';


const FILTERS = [
  {
    key: 'PENDING',
    label: 'Pending',
    icon: 'time-outline',
    color: COLORS.orange,
    soft: COLORS.softOrange,
  },

  {
    key: 'APPROVED',
    label: 'Approved',
    icon: 'checkmark-circle-outline',
    color: COLORS.green,
    soft: COLORS.softGreen,
  },

  {
    key: 'REJECTED',
    label: 'Rejected',
    icon: 'close-circle-outline',
    color: COLORS.maroon,
    soft: COLORS.softMaroon,
  },

  {
    key: 'ALL',
    label: 'All',
    icon: 'layers-outline',
    color: COLORS.teal,
    soft: COLORS.softTeal,
  },
];


/*
|--------------------------------------------------------------------------
| NORMALIZE COMPONENT
|--------------------------------------------------------------------------
*/

function normalizeComponent(value) {
  const component =
    String(
      value ?? ''
    )
      .trim()
      .toUpperCase();

  return [
    'CWTS',
    'LTS',
    'ROTC',
  ].includes(
    component
  )
    ? component
    : '';
}


/*
|--------------------------------------------------------------------------
| NORMALIZE STATUS
|--------------------------------------------------------------------------
*/

function normalizeStatus(value) {
  const status =
    String(
      value ?? ''
    )
      .trim()
      .toUpperCase();

  if (
    status ===
    'APPROVED'
  ) {
    return 'APPROVED';
  }

  if (
    status ===
    'REJECTED'
  ) {
    return 'REJECTED';
  }

  return 'PENDING';
}


/*
|--------------------------------------------------------------------------
| FINAL STATUS
|--------------------------------------------------------------------------
*/

function isFinalStatus(value) {
  const status =
    normalizeStatus(
      value
    );

  return (
    status ===
      'APPROVED' ||
    status ===
      'REJECTED'
  );
}


/*
|--------------------------------------------------------------------------
| STATUS DETAILS
|--------------------------------------------------------------------------
*/

function getStatusDetails(
  value
) {
  const status =
    normalizeStatus(
      value
    );

  if (
    status ===
    'APPROVED'
  ) {
    return {
      label:
        'Approved',

      icon:
        'checkmark-circle',

      color:
        COLORS.green,

      background:
        COLORS.softGreen,
    };
  }

  if (
    status ===
    'REJECTED'
  ) {
    return {
      label:
        'Rejected',

      icon:
        'close-circle',

      color:
        COLORS.maroon,

      background:
        COLORS.softMaroon,
    };
  }

  return {
    label:
      'Pending',

    icon:
      'time',

    color:
      COLORS.orange,

    background:
      COLORS.softOrange,
  };
}


/*
|--------------------------------------------------------------------------
| FORMAT DATE
|--------------------------------------------------------------------------
*/

function formatDate(
  value,
  short = false
) {
  if (!value) {
    return '—';
  }

  const raw =
    String(value);

  const dateOnly =
    raw.slice(
      0,
      10
    );

  const parts =
    dateOnly.split(
      '-'
    );

  if (
    parts.length !==
    3
  ) {
    return raw;
  }

  const date =
    new Date(
      Number(
        parts[0]
      ),

      Number(
        parts[1]
      ) - 1,

      Number(
        parts[2]
      )
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return raw;
  }

  return date
    .toLocaleDateString(
      'en-US',
      {
        month:
          short
            ? 'short'
            : 'long',

        day:
          short
            ? 'numeric'
            : '2-digit',

        year:
          'numeric',
      }
    );
}


/*
|--------------------------------------------------------------------------
| STUDENT NAME
|--------------------------------------------------------------------------
*/

function studentName(
  letter
) {
  return (
    letter
      ?.student
      ?.name ||

    letter
      ?.student
      ?.full_name ||

    [
      letter
        ?.student
        ?.first_name,

      letter
        ?.student
        ?.middle_name,

      letter
        ?.student
        ?.last_name,

      letter
        ?.student
        ?.surname,
    ]
      .filter(
        Boolean
      )
      .join(
        ' '
      ) ||

    'Student'
  );
}


/*
|--------------------------------------------------------------------------
| STUDENT ID
|--------------------------------------------------------------------------
*/

function studentId(
  letter
) {
  return (
    letter
      ?.student
      ?.student_id_number ||

    letter
      ?.student
      ?.id_number ||

    letter
      ?.student
      ?.student_id ||

    letter
      ?.student
      ?.student_code ||

    letter
      ?.student
      ?.school_id ||

    letter
      ?.student
      ?.username ||

    '—'
  );
}


/*
|--------------------------------------------------------------------------
| STUDENT EMAIL
|--------------------------------------------------------------------------
*/

function studentEmail(
  letter
) {
  return (
    letter
      ?.student
      ?.email ||
    ''
  );
}


/*
|--------------------------------------------------------------------------
| STUDENT INITIALS
|--------------------------------------------------------------------------
*/

function studentInitials(
  letter
) {
  return (
    String(
      studentName(
        letter
      )
    )
      .split(
        /[\s,]+/
      )
      .filter(
        Boolean
      )
      .slice(
        0,
        2
      )
      .map(
        part =>
          part
            .charAt(
              0
            )
            .toUpperCase()
      )
      .join(
        ''
      ) ||

    'ST'
  );
}


/*
|--------------------------------------------------------------------------
| REMOTE URL
|--------------------------------------------------------------------------
*/

function resolveRemoteUrl(
  value
) {
  if (!value) {
    return null;
  }

  const raw =
    String(
      value
    )
      .trim();

  if (
    raw.startsWith(
      'http://'
    ) ||

    raw.startsWith(
      'https://'
    ) ||

    raw.startsWith(
      'file://'
    ) ||

    raw.startsWith(
      'data:'
    )
  ) {
    return raw;
  }

  if (
    !API_BASE_URL
  ) {
    return null;
  }

  const serverBase =
    API_BASE_URL
      .replace(
        /\/+$/,
        ''
      )
      .replace(
        /\/api$/,
        ''
      );

  const path =
    raw
      .replace(
        /^public\//,
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
    return (
      `${serverBase}/${path}`
    );
  }

  return (
    `${serverBase}/storage/${path}`
  );
}


/*
|--------------------------------------------------------------------------
| STUDENT PHOTO
|--------------------------------------------------------------------------
*/

function studentPhoto(
  letter
) {
  return resolveRemoteUrl(
    letter
      ?.student
      ?.profile_photo_url ||

    letter
      ?.student
      ?.profile_photo ||

    letter
      ?.student
      ?.photo_url ||

    letter
      ?.student
      ?.photo ||

    letter
      ?.student
      ?.avatar ||

    letter
      ?.student
      ?.image ||

    letter
      ?.student
      ?.profile_image ||

    letter
      ?.student
      ?.student_photo ||

    letter
      ?.student
      ?.profile_picture ||

    letter
      ?.student
      ?.user
      ?.profile_photo_url ||

    ''
  );
}


/*
|--------------------------------------------------------------------------
| EVIDENCE URL
|--------------------------------------------------------------------------
*/

function evidenceUrl(
  letter
) {
  return resolveRemoteUrl(
    letter
      ?.evidence_url ||

    letter
      ?.evidence ||

    letter
      ?.attachment_url ||

    letter
      ?.attachment ||

    ''
  );
}


/*
|--------------------------------------------------------------------------
| EVIDENCE TYPE
|--------------------------------------------------------------------------
*/

function evidenceIsImage(
  letter
) {
  const type =
    String(
      letter
        ?.evidence_type
      ??
      letter
        ?.evidence_mime_type
      ??
      letter
        ?.attachment_mime_type
      ??
      ''
    )
      .toLowerCase();

  if (
    type ===
      'image' ||

    type.startsWith(
      'image/'
    )
  ) {
    return true;
  }

  return /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i
    .test(
      String(
        letter
          ?.evidence_url
        ??
        letter
          ?.evidence
        ??
        letter
          ?.attachment_url
        ??
        letter
          ?.attachment
        ??
        ''
      )
    );
}


/*
|--------------------------------------------------------------------------
| EXTRACT LETTERS
|--------------------------------------------------------------------------
*/

function extractLetters(
  data
) {
  const candidates = [
    data
      ?.excuse_letters,

    data
      ?.excuseLetters,

    data
      ?.letters,

    data
      ?.data
      ?.excuse_letters,

    data
      ?.data
      ?.excuseLetters,

    data
      ?.data
      ?.letters,

    data
      ?.data,
  ];

  for (
    const candidate
    of candidates
  ) {
    if (
      Array.isArray(
        candidate
      )
    ) {
      return candidate;
    }

    if (
      Array.isArray(
        candidate
          ?.data
      )
    ) {
      return (
        candidate.data
      );
    }
  }

  return [];
}


/*
|--------------------------------------------------------------------------
| CAN MANAGE
|--------------------------------------------------------------------------
*/

function getCanManage(
  data
) {
  return Boolean(
    data
      ?.can_manage_excuse_letters
    ??
    data
      ?.canManage
    ??
    data
      ?.permissions
      ?.can_manage_excuse_letters
    ??
    data
      ?.permissions
      ?.manage_excuse_letters
    ??
    false
  );
}


/*
|--------------------------------------------------------------------------
| SCREEN
|--------------------------------------------------------------------------
*/

export default function ExcuseLetterScreen() {
  const insets =
    useSafeAreaInsets();


  /*
  |--------------------------------------------------------------------------
  | DATA
  |--------------------------------------------------------------------------
  */

  const [
    dashboard,
    setDashboard,
  ] =
    useState(
      null
    );

  const [
    selectedComponent,
    setSelectedComponent,
  ] =
    useState(
      ''
    );

  const [
    letters,
    setLetters,
  ] =
    useState(
      []
    );


  /*
  |--------------------------------------------------------------------------
  | PAGE STATE
  |--------------------------------------------------------------------------
  */

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState(
      ''
    );


  /*
  |--------------------------------------------------------------------------
  | FILTER
  |--------------------------------------------------------------------------
  */

  const [
    activeFilter,
    setActiveFilter,
  ] =
    useState(
      'PENDING'
    );

  const [
    searchQuery,
    setSearchQuery,
  ] =
    useState(
      ''
    );


  /*
  |--------------------------------------------------------------------------
  | SELECTED REQUEST
  |--------------------------------------------------------------------------
  */

  const [
    selectedLetter,
    setSelectedLetter,
  ] =
    useState(
      null
    );

  const [
    detailVisible,
    setDetailVisible,
  ] =
    useState(
      false
    );


  /*
  |--------------------------------------------------------------------------
  | REVIEW
  |--------------------------------------------------------------------------
  */

  const [
    feedback,
    setFeedback,
  ] =
    useState(
      ''
    );

  const [
    processingAction,
    setProcessingAction,
  ] =
    useState(
      ''
    );

  const [
    failedImages,
    setFailedImages,
  ] =
    useState(
      {}
    );


  /*
  |--------------------------------------------------------------------------
  | LOAD EXCUSE LETTERS
  |--------------------------------------------------------------------------
  */

  const loadExcuseLetters =
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
                    Boolean
                  )

              : Array.isArray(
                  dashboardResult
                    ?.componentOptions
                )
                ? dashboardResult
                    .componentOptions
                    .map(
                      normalizeComponent
                    )
                    .filter(
                      Boolean
                    )
                : [];

          const currentAllowed =
            selectedComponent &&
            options.includes(
              selectedComponent
            );

          const component =
            (
              currentAllowed
                ? selectedComponent
                : ''
            )
            ||

            normalizeComponent(
              dashboardResult
                ?.component_context
                ?.selected
              ||

              dashboardResult
                ?.activeComponent
              ||

              dashboardResult
                ?.active_component
            )
            ||

            options[0]
            ||

            '';

          if (
            !component
          ) {
            throw new Error(
              'Your account is not assigned to an NSTP component.'
            );
          }

          const letterResult =
            await getExcuseLetters(
              component
            );

          setSelectedComponent(
            component
          );

          setDashboard({
            ...dashboardResult,
            ...letterResult,

            component_context: {
              ...(
                dashboardResult
                  ?.component_context ||
                {}
              ),

              ...(
                letterResult
                  ?.component_context ||
                {}
              ),

              selected:
                component,

              options,
            },
          });

          setLetters(
            extractLetters(
              letterResult
            )
          );

          setError(
            ''
          );
        } catch (
          err
        ) {
          const message =
            err instanceof Error
              ? err.message
              : 'Unable to load excuse letters.';

          setError(
            message
          );

          const normalized =
            message
              .toLowerCase();

          if (
            normalized.includes(
              'unauthenticated'
            )
            ||

            normalized.includes(
              'unauthorized'
            )
            ||

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
        selectedComponent,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | REFRESH WHEN SCREEN OPENS
  |--------------------------------------------------------------------------
  */

  useFocusEffect(
    useCallback(
      () => {
        loadExcuseLetters(
          false
        );
      },
      [
        loadExcuseLetters,
      ]
    )
  );


  /*
  |--------------------------------------------------------------------------
  | COMPONENT OPTIONS
  |--------------------------------------------------------------------------
  */

  const componentOptions =
    useMemo(
      () => {
        const options =
          dashboard
            ?.component_context
            ?.options
          ||

          dashboard
            ?.componentOptions
          ||

          [];

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
                Boolean
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
  | ACTIVE COMPONENT
  |--------------------------------------------------------------------------
  */

  const componentLabel =
    selectedComponent
    ||

    normalizeComponent(
      dashboard
        ?.component_context
        ?.selected
      ||

      dashboard
        ?.activeComponent
      ||

      dashboard
        ?.active_component
    )
    ||

    componentOptions[0]
    ||

    'ALL';


  const canManage =
    getCanManage(
      dashboard
    );


  /*
  |--------------------------------------------------------------------------
  | SWITCH COMPONENT
  |--------------------------------------------------------------------------
  */

  const handleSelectComponent =
    async component => {
      const normalized =
        normalizeComponent(
          component
        );

      if (
        !normalized
        ||

        normalized ===
          componentLabel
        ||

        !componentOptions
          .includes(
            normalized
          )
      ) {
        return;
      }

      try {
        setRefreshing(
          true
        );

        setError(
          ''
        );

        setDetailVisible(
          false
        );

        setSelectedLetter(
          null
        );

        setFeedback(
          ''
        );

        const result =
          await getExcuseLetters(
            normalized
          );

        setSelectedComponent(
          normalized
        );

        setDashboard(
          current => ({
            ...(
              current ||
              {}
            ),

            ...result,

            component_context: {
              ...(
                current
                  ?.component_context ||
                {}
              ),

              ...(
                result
                  ?.component_context ||
                {}
              ),

              selected:
                normalized,

              options:
                componentOptions,
            },
          })
        );

        setLetters(
          extractLetters(
            result
          )
        );

        setActiveFilter(
          'PENDING'
        );

        setSearchQuery(
          ''
        );
      } catch (
        err
      ) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to switch NSTP component.'
        );
      } finally {
        setRefreshing(
          false
        );
      }
    };


  /*
  |--------------------------------------------------------------------------
  | COUNTS
  |--------------------------------------------------------------------------
  */

  const counts =
    useMemo(
      () => {
        const result = {
          PENDING:
            0,

          APPROVED:
            0,

          REJECTED:
            0,

          ALL:
            letters.length,
        };

        letters.forEach(
          letter => {
            result[
              normalizeStatus(
                letter
                  ?.status
              )
            ] += 1;
          }
        );

        return result;
      },
      [
        letters,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | FILTERED LETTERS
  |--------------------------------------------------------------------------
  */

  const filteredLetters =
    useMemo(
      () => {
        const search =
          searchQuery
            .trim()
            .toLowerCase();

        return letters.filter(
          letter => {
            if (
              activeFilter !==
                'ALL'
              &&

              normalizeStatus(
                letter
                  ?.status
              ) !==
                activeFilter
            ) {
              return false;
            }

            if (
              !search
            ) {
              return true;
            }

            const searchable = [
              studentName(
                letter
              ),

              studentId(
                letter
              ),

              studentEmail(
                letter
              ),

              letter
                ?.component,

              letter
                ?.reason,

              letter
                ?.explanation,

              letter
                ?.absence_date,

              letter
                ?.filed_date,

              letter
                ?.created_at,

              letter
                ?.status,
            ]
              .filter(
                Boolean
              )
              .join(
                ' '
              )
              .toLowerCase();

            return searchable
              .includes(
                search
              );
          }
        );
      },
      [
        letters,
        activeFilter,
        searchQuery,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | OPEN LETTER
  |--------------------------------------------------------------------------
  */

  const openLetter =
    letter => {
      setSelectedLetter(
        letter
      );

      setFeedback(
        letter
          ?.feedback
        ??
        ''
      );

      setDetailVisible(
        true
      );
    };


  /*
  |--------------------------------------------------------------------------
  | CLOSE LETTER
  |--------------------------------------------------------------------------
  */

  const closeLetter =
    () => {
      if (
        processingAction
      ) {
        return;
      }

      setDetailVisible(
        false
      );

      setSelectedLetter(
        null
      );

      setFeedback(
        ''
      );
    };


  /*
  |--------------------------------------------------------------------------
  | OPEN EVIDENCE
  |--------------------------------------------------------------------------
  */

  const openEvidence =
    async () => {
      const url =
        evidenceUrl(
          selectedLetter
        );

      if (
        !url
      ) {
        Alert.alert(
          'No attachment',
          'This excuse letter does not have a supporting document.'
        );

        return;
      }

      try {
        const supported =
          await Linking
            .canOpenURL(
              url
            );

        if (
          !supported
        ) {
          Alert.alert(
            'Unable to open',
            'This attachment cannot be opened on this device.'
          );

          return;
        }

        await Linking
          .openURL(
            url
          );
      } catch {
        Alert.alert(
          'Unable to open',
          'The supporting attachment could not be opened.'
        );
      }
    };


  /*
  |--------------------------------------------------------------------------
  | APPROVE / REJECT
  |--------------------------------------------------------------------------
  */

  const submitDecision =
    action => {
      if (
        !selectedLetter
        ||
        processingAction
      ) {
        return;
      }


      /*
      |--------------------------------------------------------------------------
      | PERMISSION
      |--------------------------------------------------------------------------
      */

      if (
        !canManage
      ) {
        Alert.alert(
          'View only',
          'Your account does not have permission to approve or reject excuse letters.'
        );

        return;
      }


      /*
      |--------------------------------------------------------------------------
      | FINAL STATUS GUARD
      |--------------------------------------------------------------------------
      |
      | APPROVED and REJECTED are final in the mobile application.
      |
      */

      const currentStatus =
        normalizeStatus(
          selectedLetter
            ?.status
        );

      if (
        isFinalStatus(
          currentStatus
        )
      ) {
        Alert.alert(
          'Decision already final',

          currentStatus ===
          'APPROVED'
            ? 'This excuse letter has already been approved. The decision can no longer be changed.'
            : 'This excuse letter has already been rejected. The decision can no longer be changed.'
        );

        return;
      }


      /*
      |--------------------------------------------------------------------------
      | FEEDBACK
      |--------------------------------------------------------------------------
      */

      if (
        feedback
          .trim()
          .length <
        2
      ) {
        Alert.alert(
          'Feedback required',
          'Please write feedback before approving or rejecting the excuse letter.'
        );

        return;
      }


      const approving =
        action ===
        'approve';


      /*
      |--------------------------------------------------------------------------
      | CONFIRM
      |--------------------------------------------------------------------------
      */

      Alert.alert(
        approving
          ? 'Approve request?'
          : 'Reject request?',

        approving
          ? 'Approve this excuse letter and mark the related attendance record as excused?'
          : 'Reject this student excuse-letter request?',

        [
          {
            text:
              'Cancel',

            style:
              'cancel',
          },

          {
            text:
              approving
                ? 'Approve'
                : 'Reject',

            style:
              approving
                ? 'default'
                : 'destructive',

            onPress:
              async () => {
                try {
                  setProcessingAction(
                    action
                  );

                  const result =
                    await reviewExcuseLetter({
                      id:
                        selectedLetter
                          .id,

                      action,

                      feedback:
                        feedback
                          .trim(),

                      component:
                        normalizeComponent(
                          selectedLetter
                            ?.component
                        )
                        ||

                        componentLabel,
                    });


                  /*
                  |--------------------------------------------------------------------------
                  | UPDATE THE REQUEST LOCALLY
                  |--------------------------------------------------------------------------
                  |
                  | We keep the review modal open so the admin immediately sees the
                  | locked APPROVED / REJECTED state.
                  |
                  */

                  if (
                    result
                      ?.letter
                  ) {
                    setLetters(
                      current =>
                        current.map(
                          letter =>
                            String(
                              letter
                                ?.id
                            ) ===
                            String(
                              result
                                .letter
                                ?.id
                            )
                              ? result
                                  .letter
                              : letter
                        )
                    );

                    setSelectedLetter(
                      result
                        .letter
                    );

                    setFeedback(
                      result
                        .letter
                        ?.feedback
                      ??
                      feedback
                        .trim()
                    );
                  } else {
                    await loadExcuseLetters(
                      true
                    );

                    setDetailVisible(
                      false
                    );
                  }


                  /*
                  |--------------------------------------------------------------------------
                  | SUCCESS
                  |--------------------------------------------------------------------------
                  */

                  Alert.alert(
                    approving
                      ? 'Approved'
                      : 'Rejected',

                    result
                      ?.message
                    ||

                    `Excuse letter ${
                      approving
                        ? 'approved'
                        : 'rejected'
                    } successfully.`
                  );
                } catch (
                  err
                ) {
                  Alert.alert(
                    approving
                      ? 'Unable to approve'
                      : 'Unable to reject',

                    err instanceof Error
                      ? err.message
                      : 'Please try again.'
                  );
                } finally {
                  setProcessingAction(
                    ''
                  );
                }
              },
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
          styles
            .loadingScreen
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
            styles
              .loadingTitle
          }
        >
          Loading Excuse Letters
        </Text>

        <Text
          style={
            styles
              .loadingDescription
          }
        >
          Preparing the review queue
        </Text>
      </SafeAreaView>
    );
  }


  /*
  |--------------------------------------------------------------------------
  | MAIN SCREEN
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
          styles.pageScroll
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
              loadExcuseLetters(
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
            125 +
            insets.bottom,
        }}
      >

        {/*
        |--------------------------------------------------------------------------
        | HEADER
        |--------------------------------------------------------------------------
        */}

        <ExcuseHero
          component={
            componentLabel
          }
          requestCount={
            letters.length
          }
        />


        <View
          style={
            styles.content
          }
        >

          {/*
          |--------------------------------------------------------------------------
          | COMPONENT SELECTOR
          |--------------------------------------------------------------------------
          */}

          {
            componentOptions
              .length >
            1
              ? (
                <View
                  style={
                    styles
                      .componentSelectorCard
                  }
                >
                  <Text
                    style={
                      styles
                        .componentSelectorLabel
                    }
                  >
                    MANAGED NSTP COMPONENTS
                  </Text>


                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={
                      false
                    }
                    contentContainerStyle={
                      styles
                        .componentSelectorRow
                    }
                  >
                    {
                      componentOptions
                        .map(
                          item => {
                            const active =
                              item ===
                              componentLabel;

                            return (
                              <TouchableOpacity
                                key={
                                  item
                                }
                                activeOpacity={
                                  0.75
                                }
                                onPress={() =>
                                  handleSelectComponent(
                                    item
                                  )
                                }
                                style={[
                                  styles
                                    .componentSelectorButton,

                                  active &&
                                    styles
                                      .componentSelectorButtonActive,
                                ]}
                              >
                                <Ionicons
                                  name={
                                    active
                                      ? 'checkmark-circle'
                                      : 'layers-outline'
                                  }
                                  size={
                                    17
                                  }
                                  color={
                                    active
                                      ? COLORS.white
                                      : COLORS.teal
                                  }
                                />

                                <Text
                                  style={[
                                    styles
                                      .componentSelectorText,

                                    active &&
                                      styles
                                        .componentSelectorTextActive,
                                  ]}
                                >
                                  {item}
                                </Text>
                              </TouchableOpacity>
                            );
                          }
                        )
                    }
                  </ScrollView>
                </View>
              )
              :
              null
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
                    styles
                      .errorBanner
                  }
                >
                  <Ionicons
                    name="alert-circle-outline"
                    size={
                      20
                    }
                    color={
                      COLORS.maroon
                    }
                  />

                  <Text
                    style={
                      styles
                        .errorBannerText
                    }
                  >
                    {error}
                  </Text>

                  <TouchableOpacity
                    activeOpacity={
                      0.72
                    }
                    onPress={() =>
                      loadExcuseLetters(
                        true
                      )
                    }
                  >
                    <Ionicons
                      name="refresh"
                      size={
                        20
                      }
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
          | FILTER HEADER
          |--------------------------------------------------------------------------
          */}

          <SectionHeading
            eyebrow="REVIEW QUEUE"
            title="Request Status"
            icon="filter-outline"
          />


          {/*
          |--------------------------------------------------------------------------
          | FILTERS
          |--------------------------------------------------------------------------
          */}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.filters
            }
          >
            {
              FILTERS.map(
                filter => {
                  const selected =
                    activeFilter ===
                    filter.key;

                  return (
                    <Pressable
                      key={
                        filter.key
                      }
                      onPress={() =>
                        setActiveFilter(
                          filter.key
                        )
                      }
                      style={({
                        pressed,
                      }) => [
                        styles
                          .filterCard,

                        {
                          backgroundColor:
                            selected
                              ? filter.color
                              : filter.soft,

                          borderColor:
                            selected
                              ? filter.color
                              : 'transparent',
                        },

                        pressed &&
                          styles.pressed,
                      ]}
                    >
                      <View
                        style={[
                          styles
                            .filterIcon,

                          {
                            backgroundColor:
                              selected
                                ? 'rgba(255,255,255,0.16)'
                                : COLORS.white,
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            filter.icon
                          }
                          size={
                            20
                          }
                          color={
                            selected
                              ? COLORS.white
                              : filter.color
                          }
                        />
                      </View>


                      <View>
                        <Text
                          style={[
                            styles
                              .filterLabel,

                            {
                              color:
                                selected
                                  ? COLORS.white
                                  : filter.color,
                            },
                          ]}
                        >
                          {
                            filter.label
                          }
                        </Text>

                        <Text
                          style={[
                            styles
                              .filterCount,

                            {
                              color:
                                selected
                                  ? COLORS.white
                                  : COLORS.dark,
                            },
                          ]}
                        >
                          {
                            String(
                              counts[
                                filter.key
                              ]
                              ??
                              0
                            )
                              .padStart(
                                2,
                                '0'
                              )
                          }
                        </Text>
                      </View>
                    </Pressable>
                  );
                }
              )
            }
          </ScrollView>


          {/*
          |--------------------------------------------------------------------------
          | REQUEST LIST TITLE
          |--------------------------------------------------------------------------
          */}

          <View
            style={
              styles
                .requestsHeader
            }
          >
            <View>
              <Text
                style={
                  styles
                    .sectionEyebrow
                }
              >
                SUBMISSION INDEX
              </Text>

              <Text
                style={
                  styles
                    .requestsTitle
                }
              >
                Student Requests
              </Text>
            </View>


            <View
              style={
                styles
                  .resultCount
              }
            >
              <Text
                style={
                  styles
                    .resultCountText
                }
              >
                {
                  filteredLetters
                    .length
                }
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
              size={
                20
              }
              color={
                COLORS.maroon
              }
            />

            <TextInput
              value={
                searchQuery
              }
              onChangeText={
                setSearchQuery
              }
              placeholder="Search student, reason, or date..."
              placeholderTextColor={
                COLORS.lightMuted
              }
              selectionColor={
                COLORS.maroon
              }
              style={
                styles.searchInput
              }
            />

            {
              searchQuery
                ? (
                  <TouchableOpacity
                    activeOpacity={
                      0.7
                    }
                    onPress={() =>
                      setSearchQuery(
                        ''
                      )
                    }
                    style={
                      styles.clearSearch
                    }
                  >
                    <Ionicons
                      name="close-circle"
                      size={
                        20
                      }
                      color={
                        COLORS.lightMuted
                      }
                    />
                  </TouchableOpacity>
                )
                :
                null
            }
          </View>


          {/*
          |--------------------------------------------------------------------------
          | REQUESTS
          |--------------------------------------------------------------------------
          */}

          {
            filteredLetters
              .length
              ? (
                <View
                  style={
                    styles
                      .requestList
                  }
                >
                  {
                    filteredLetters
                      .map(
                        (
                          letter,
                          index
                        ) => (
                          <LetterCard
                            key={
                              String(
                                letter
                                  ?.id
                                ??
                                index
                              )
                            }
                            index={
                              index
                            }
                            letter={
                              letter
                            }
                            imageFailed={
                              Boolean(
                                failedImages[
                                  letter
                                    ?.id
                                ]
                              )
                            }
                            onImageError={() =>
                              setFailedImages(
                                previous => ({
                                  ...previous,

                                  [letter?.id]:
                                    true,
                                })
                              )
                            }
                            onPress={() =>
                              openLetter(
                                letter
                              )
                            }
                          />
                        )
                      )
                  }
                </View>
              )
              :
              (
                <View
                  style={
                    styles
                      .emptyState
                  }
                >
                  <View
                    style={
                      styles
                        .emptyIcon
                    }
                  >
                    <Ionicons
                      name="file-tray-outline"
                      size={
                        31
                      }
                      color={
                        COLORS.white
                      }
                    />
                  </View>

                  <Text
                    style={
                      styles
                        .emptyEyebrow
                    }
                  >
                    NOTHING TO REVIEW
                  </Text>

                  <Text
                    style={
                      styles
                        .emptyTitle
                    }
                  >
                    No excuse letters found
                  </Text>

                  <Text
                    style={
                      styles
                        .emptyDescription
                    }
                  >
                    {
                      searchQuery
                        ? 'Try another search term or choose a different status.'
                        : 'Student excuse letters will appear here when requests are submitted.'
                    }
                  </Text>
                </View>
              )
          }
        </View>
      </ScrollView>


      {/*
      |--------------------------------------------------------------------------
      | REVIEW MODAL
      |--------------------------------------------------------------------------
      */}

      <Modal
        visible={
          detailVisible
        }
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={
          closeLetter
        }
      >
        <SafeAreaView
          style={
            styles
              .reviewSafeArea
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

          {
            selectedLetter
              ? (
                <LetterReview
                  letter={
                    selectedLetter
                  }
                  feedback={
                    feedback
                  }
                  setFeedback={
                    setFeedback
                  }
                  canManage={
                    canManage
                  }
                  processingAction={
                    processingAction
                  }
                  onApprove={() =>
                    submitDecision(
                      'approve'
                    )
                  }
                  onReject={() =>
                    submitDecision(
                      'reject'
                    )
                  }
                  onClose={
                    closeLetter
                  }
                  onOpenEvidence={
                    openEvidence
                  }
                  bottomInset={
                    insets.bottom
                  }
                />
              )
              :
              null
          }
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}


/*
|--------------------------------------------------------------------------
| HERO
|--------------------------------------------------------------------------
*/

function ExcuseHero({
  component,
  requestCount,
}) {
  return (
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
        <View
          style={
            styles
              .heroTitleCopy
          }
        >
          <Text
            style={
              styles.heroEyebrow
            }
          >
            EXCUSE LETTERS
          </Text>

          <Text
            style={
              styles.heroTitle
            }
          >
            Excuse Letters
          </Text>
        </View>


        <View
          style={
            styles.heroIcon
          }
        >
          <Ionicons
            name="document-text-outline"
            size={
              25
            }
            color={
              COLORS.maroon
            }
          />
        </View>
      </View>


      <Text
        style={
          styles
            .heroDescription
        }
      >
        Review student absence requests, supporting documents, and decisions.
      </Text>


      <View
        style={
          styles.heroMeta
        }
      >
        <View
          style={
            styles
              .heroMetaItem
          }
        >
          <Ionicons
            name="layers-outline"
            size={
              16
            }
            color={
              COLORS.yellow
            }
          />

          <View
            style={
              styles
                .heroMetaCopy
            }
          >
            <Text
              style={
                styles
                  .heroMetaLabel
              }
            >
              COMPONENT
            </Text>

            <Text
              style={
                styles
                  .heroMetaValue
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
            styles
              .heroMetaItem
          }
        >
          <Ionicons
            name="document-text-outline"
            size={
              16
            }
            color={
              COLORS.yellow
            }
          />

          <View
            style={
              styles
                .heroMetaCopy
            }
          >
            <Text
              style={
                styles
                  .heroMetaLabel
              }
            >
              REQUESTS
            </Text>

            <Text
              style={
                styles
                  .heroMetaValue
              }
            >
              {
                String(
                  requestCount
                  ??
                  0
                )
                  .padStart(
                    2,
                    '0'
                  )
              }
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}


/*
|--------------------------------------------------------------------------
| SECTION HEADING
|--------------------------------------------------------------------------
*/

function SectionHeading({
  eyebrow,
  title,
  icon,
}) {
  return (
    <View
      style={
        styles
          .sectionTitleRow
      }
    >
      <View
        style={
          styles.sectionIcon
        }
      >
        <Ionicons
          name={
            icon
          }
          size={
            18
          }
          color={
            COLORS.yellow
          }
        />
      </View>

      <View>
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
    </View>
  );
}


/*
|--------------------------------------------------------------------------
| LETTER CARD
|--------------------------------------------------------------------------
*/

function LetterCard({
  letter,
  index,
  onPress,
  imageFailed,
  onImageError,
}) {
  const status =
    getStatusDetails(
      letter
        ?.status
    );

  const photo =
    studentPhoto(
      letter
    );

  return (
    <Pressable
      onPress={
        onPress
      }
      style={({
        pressed,
      }) => [
        styles
          .letterCard,

        pressed &&
          styles.pressed,
      ]}
    >
      <View
        style={
          styles
            .letterNumber
        }
      >
        <Text
          style={
            styles
              .letterNumberText
          }
        >
          {
            String(
              index + 1
            )
              .padStart(
                2,
                '0'
              )
          }
        </Text>
      </View>


      <View
        style={
          styles.letterBody
        }
      >
        <View
          style={
            styles.identityRow
          }
        >
          <View
            style={
              styles.studentAvatar
            }
          >
            {
              photo &&
              !imageFailed
                ? (
                  <Image
                    source={{
                      uri:
                        photo,
                    }}
                    resizeMode="cover"
                    onError={
                      onImageError
                    }
                    style={
                      styles
                        .studentAvatarImage
                    }
                  />
                )
                :
                (
                  <Text
                    style={
                      styles
                        .studentAvatarInitials
                    }
                  >
                    {
                      studentInitials(
                        letter
                      )
                    }
                  </Text>
                )
            }
          </View>


          <View
            style={
              styles
                .studentSummary
            }
          >
            <Text
              numberOfLines={
                1
              }
              style={
                styles.studentName
              }
            >
              {
                studentName(
                  letter
                )
              }
            </Text>

            <Text
              style={
                styles.studentNumber
              }
            >
              {
                studentId(
                  letter
                )
              }
            </Text>
          </View>


          <View
            style={[
              styles.statusPill,

              {
                backgroundColor:
                  status.background,
              },
            ]}
          >
            <Text
              style={[
                styles
                  .statusPillText,

                {
                  color:
                    status.color,
                },
              ]}
            >
              {
                status
                  .label
                  .toUpperCase()
              }
            </Text>
          </View>
        </View>


        <View
          style={
            styles.cardMeta
          }
        >
          <View
            style={
              styles
                .cardMetaItem
            }
          >
            <Ionicons
              name="calendar-outline"
              size={
                15
              }
              color={
                COLORS.maroon
              }
            />

            <Text
              style={
                styles
                  .cardMetaText
              }
            >
              {
                formatDate(
                  letter
                    ?.absence_date,
                  true
                )
              }
            </Text>
          </View>


          <View
            style={
              styles
                .cardMetaItem
            }
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={
                15
              }
              color={
                COLORS.green
              }
            />

            <Text
              style={
                styles
                  .cardMetaText
              }
            >
              {
                letter
                  ?.component
                ||
                '—'
              }
            </Text>
          </View>
        </View>


        <View
          style={
            styles.reasonBox
          }
        >
          <Text
            style={
              styles.reasonLabel
            }
          >
            REASON
          </Text>

          <Text
            numberOfLines={
              2
            }
            style={
              styles.reasonText
            }
          >
            {
              letter
                ?.reason
              ||
              'No reason provided.'
            }
          </Text>
        </View>


        <View
          style={
            styles.reviewLink
          }
        >
          <Text
            style={
              styles
                .reviewLinkText
            }
          >
            {
              isFinalStatus(
                letter
                  ?.status
              )
                ? 'View decision'
                : 'Review request'
            }
          </Text>

          <Ionicons
            name="arrow-forward"
            size={
              16
            }
            color={
              COLORS.maroon
            }
          />
        </View>
      </View>
    </Pressable>
  );
}


/*
|--------------------------------------------------------------------------
| LETTER REVIEW
|--------------------------------------------------------------------------
*/

function LetterReview({
  letter,
  feedback,
  setFeedback,
  canManage,
  processingAction,
  onApprove,
  onReject,
  onClose,
  onOpenEvidence,
  bottomInset,
}) {

  /*
  |--------------------------------------------------------------------------
  | CURRENT STATUS
  |--------------------------------------------------------------------------
  */

  const normalizedStatus =
    normalizeStatus(
      letter
        ?.status
    );

  const status =
    getStatusDetails(
      normalizedStatus
    );


  /*
  |--------------------------------------------------------------------------
  | LOCK DECISION AFTER APPROVED / REJECTED
  |--------------------------------------------------------------------------
  */

  const decisionLocked =
    isFinalStatus(
      normalizedStatus
    );

  const canEditDecision =
    canManage &&
    !decisionLocked;

  const actionDisabled =
    decisionLocked
    ||
    Boolean(
      processingAction
    );


  /*
  |--------------------------------------------------------------------------
  | FILES / PROFILE
  |--------------------------------------------------------------------------
  */

  const attachment =
    evidenceUrl(
      letter
    );

  const imageEvidence =
    evidenceIsImage(
      letter
    );

  const photo =
    studentPhoto(
      letter
    );

  const [
    photoFailed,
    setPhotoFailed,
  ] =
    useState(
      false
    );

  const [
    evidenceFailed,
    setEvidenceFailed,
  ] =
    useState(
      false
    );


  return (
    <View
      style={
        styles.reviewRoot
      }
    >

      {/*
      |--------------------------------------------------------------------------
      | REVIEW HEADER
      |--------------------------------------------------------------------------
      */}

      <View
        style={
          styles.reviewHeader
        }
      >
        <TouchableOpacity
          activeOpacity={
            0.72
          }
          onPress={
            onClose
          }
          style={
            styles
              .reviewBackButton
          }
        >
          <Ionicons
            name="arrow-back"
            size={
              22
            }
            color={
              COLORS.white
            }
          />
        </TouchableOpacity>


        <View
          style={
            styles
              .reviewHeaderCopy
          }
        >
          <Text
            style={
              styles
                .reviewHeaderEyebrow
            }
          >
            EXCUSE LETTER REVIEW
          </Text>

          <Text
            style={
              styles
                .reviewHeaderTitle
            }
          >
            Request Details
          </Text>
        </View>


        <View
          style={
            styles
              .reviewReference
          }
        >
          <Text
            style={
              styles
                .reviewReferenceLabel
            }
          >
            FILE
          </Text>

          <Text
            style={
              styles
                .reviewReferenceValue
            }
          >
            #
            {
              String(
                letter
                  ?.id
                ??
                0
              )
                .padStart(
                  4,
                  '0'
                )
            }
          </Text>
        </View>
      </View>


      <ScrollView
        style={
          styles.reviewScroll
        }
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal:
            16,

          paddingTop:
            18,

          paddingBottom:
            30 +
            bottomInset,
        }}
      >

        {/*
        |--------------------------------------------------------------------------
        | STUDENT PROFILE
        |--------------------------------------------------------------------------
        */}

        <View
          style={
            styles.studentHero
          }
        >
          <View
            style={
              styles.largeAvatar
            }
          >
            {
              photo &&
              !photoFailed
                ? (
                  <Image
                    source={{
                      uri:
                        photo,
                    }}
                    resizeMode="cover"
                    onError={() =>
                      setPhotoFailed(
                        true
                      )
                    }
                    style={
                      styles
                        .largeAvatarImage
                    }
                  />
                )
                :
                (
                  <Text
                    style={
                      styles
                        .largeAvatarText
                    }
                  >
                    {
                      studentInitials(
                        letter
                      )
                    }
                  </Text>
                )
            }
          </View>


          <View
            style={
              styles
                .studentHeroCopy
            }
          >
            <Text
              style={
                styles
                  .studentHeroEyebrow
              }
            >
              STUDENT EXCUSE LETTER
            </Text>

            <Text
              style={
                styles
                  .studentHeroName
              }
            >
              {
                studentName(
                  letter
                )
              }
            </Text>

            <Text
              style={
                styles
                  .studentHeroMeta
              }
            >
              {
                studentId(
                  letter
                )
              }
            </Text>

            {
              studentEmail(
                letter
              )
                ? (
                  <Text
                    numberOfLines={
                      1
                    }
                    style={
                      styles
                        .studentHeroEmail
                    }
                  >
                    {
                      studentEmail(
                        letter
                      )
                    }
                  </Text>
                )
                :
                null
            }
          </View>
        </View>


        {/*
        |--------------------------------------------------------------------------
        | STATUS
        |--------------------------------------------------------------------------
        */}

        <View
          style={
            styles.statusStrip
          }
        >
          <View>
            <Text
              style={
                styles
                  .statusStripLabel
              }
            >
              CURRENT REVIEW STATUS
            </Text>

            <Text
              style={
                styles
                  .statusStripDescription
              }
            >
              Student request decision
            </Text>
          </View>


          <View
            style={[
              styles
                .largeStatusPill,

              {
                backgroundColor:
                  status.background,
              },
            ]}
          >
            <Ionicons
              name={
                status.icon
              }
              size={
                17
              }
              color={
                status.color
              }
            />

            <Text
              style={[
                styles
                  .largeStatusText,

                {
                  color:
                    status.color,
                },
              ]}
            >
              {
                status
                  .label
                  .toUpperCase()
              }
            </Text>
          </View>
        </View>


        {/*
        |--------------------------------------------------------------------------
        | REQUEST INFORMATION
        |--------------------------------------------------------------------------
        */}

        <View
          style={
            styles
              .informationGrid
          }
        >
          <InformationCard
            icon="calendar-outline"
            label="DATE OF ABSENCE"
            value={
              formatDate(
                letter
                  ?.absence_date
              )
            }
          />

          <InformationCard
            icon="shield-checkmark-outline"
            label="NSTP COMPONENT"
            value={
              letter
                ?.component
              ||
              '—'
            }
          />

          <InformationCard
            icon="alert-circle-outline"
            label="REASON"
            value={
              letter
                ?.reason
              ||
              '—'
            }
          />

          <InformationCard
            icon="time-outline"
            label="FILED DATE"
            value={
              formatDate(
                letter
                  ?.filed_date
                ||
                letter
                  ?.created_at
              )
            }
          />
        </View>


        {/*
        |--------------------------------------------------------------------------
        | EXPLANATION
        |--------------------------------------------------------------------------
        */}

        <ReviewSectionHeader
          number="01"
          eyebrow="STUDENT STATEMENT"
          title="Explanation"
          icon="document-text-outline"
        />


        <View
          style={
            styles
              .statementPaper
          }
        >
          <View
            style={
              styles
                .statementLine
            }
          />

          <Text
            style={
              styles
                .statementText
            }
          >
            {
              letter
                ?.explanation
              ||
              'No explanation was provided by the student.'
            }
          </Text>
        </View>


        {/*
        |--------------------------------------------------------------------------
        | EVIDENCE
        |--------------------------------------------------------------------------
        */}

        <ReviewSectionHeader
          number="02"
          eyebrow="ATTACHMENT"
          title="Supporting Evidence"
          icon="attach-outline"
        />


        {
          !attachment
            ? (
              <View
                style={
                  styles
                    .noEvidence
                }
              >
                <View
                  style={
                    styles
                      .noEvidenceIcon
                  }
                >
                  <Ionicons
                    name="images-outline"
                    size={
                      26
                    }
                    color={
                      COLORS.maroon
                    }
                  />
                </View>

                <View
                  style={
                    styles
                      .noEvidenceCopy
                  }
                >
                  <Text
                    style={
                      styles
                        .noEvidenceTitle
                    }
                  >
                    No supporting document attached
                  </Text>

                  <Text
                    style={
                      styles
                        .noEvidenceText
                    }
                  >
                    This request was submitted without an evidence attachment.
                  </Text>
                </View>
              </View>
            )
            :

            imageEvidence &&
            !evidenceFailed
              ? (
                <Pressable
                  onPress={
                    onOpenEvidence
                  }
                  style={({
                    pressed,
                  }) => [
                    styles
                      .evidenceImageCard,

                    pressed &&
                      styles.pressed,
                  ]}
                >
                  <Image
                    source={{
                      uri:
                        attachment,
                    }}
                    resizeMode="contain"
                    onError={() =>
                      setEvidenceFailed(
                        true
                      )
                    }
                    style={
                      styles
                        .evidenceImage
                    }
                  />

                  <View
                    style={
                      styles
                        .evidenceImageFooter
                    }
                  >
                    <Ionicons
                      name="expand-outline"
                      size={
                        19
                      }
                      color={
                        COLORS.white
                      }
                    />

                    <View
                      style={
                        styles
                          .evidenceFooterCopy
                      }
                    >
                      <Text
                        style={
                          styles
                            .evidenceImageTitle
                        }
                      >
                        Supporting Image
                      </Text>

                      <Text
                        style={
                          styles
                            .evidenceImageSubtitle
                        }
                      >
                        Tap to view full attachment
                      </Text>
                    </View>

                    <Ionicons
                      name="open-outline"
                      size={
                        18
                      }
                      color={
                        COLORS.white
                      }
                    />
                  </View>
                </Pressable>
              )
              :
              (
                <Pressable
                  onPress={
                    onOpenEvidence
                  }
                  style={({
                    pressed,
                  }) => [
                    styles
                      .documentCard,

                    pressed &&
                      styles.pressed,
                  ]}
                >
                  <View
                    style={
                      styles
                        .documentIcon
                    }
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={
                        27
                      }
                      color={
                        COLORS.white
                      }
                    />
                  </View>


                  <View
                    style={
                      styles
                        .documentCopy
                    }
                  >
                    <Text
                      style={
                        styles
                          .documentEyebrow
                      }
                    >
                      ATTACHED DOCUMENT
                    </Text>

                    <Text
                      numberOfLines={
                        2
                      }
                      style={
                        styles
                          .documentTitle
                      }
                    >
                      {
                        letter
                          ?.evidence_original_name
                        ||

                        letter
                          ?.attachment_original_name
                        ||

                        'Supporting Document'
                      }
                    </Text>

                    <Text
                      style={
                        styles
                          .documentSubtitle
                      }
                    >
                      Tap to open attachment
                    </Text>
                  </View>

                  <Ionicons
                    name="open-outline"
                    size={
                      20
                    }
                    color={
                      COLORS.maroon
                    }
                  />
                </Pressable>
              )
        }


        {/*
        |--------------------------------------------------------------------------
        | DECISION
        |--------------------------------------------------------------------------
        */}

        <View
          style={
            styles
              .decisionCard
          }
        >
          <View
            style={
              styles
                .decisionHeader
            }
          >
            <View
              style={
                styles
                  .decisionIcon
              }
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={
                  23
                }
                color={
                  COLORS.white
                }
              />
            </View>


            <View
              style={
                styles
                  .decisionHeaderCopy
              }
            >
              <Text
                style={
                  styles
                    .decisionEyebrow
                }
              >
                FINAL REVIEW
              </Text>

              <Text
                style={
                  styles
                    .decisionTitle
                }
              >
                Decision & Feedback
              </Text>

              <Text
                style={
                  styles
                    .decisionDescription
                }
              >
                {
                  decisionLocked
                    ? normalizedStatus ===
                      'APPROVED'
                      ? 'This request has already been approved. The final decision is locked and cannot be changed.'
                      : 'This request has already been rejected. The final decision is locked and cannot be changed.'

                    : canManage
                      ? 'Leave a clear note for the student, then approve or reject the request.'
                      : 'Your account currently has view-only access to this request.'
                }
              </Text>
            </View>
          </View>


          {/*
          |--------------------------------------------------------------------------
          | FINAL DECISION LOCKED NOTICE
          |--------------------------------------------------------------------------
          */}

          {
            decisionLocked
              ? (
                <View
                  style={[
                    styles
                      .finalDecisionNotice,

                    normalizedStatus ===
                      'APPROVED'
                      ? styles
                          .finalDecisionApproved
                      : styles
                          .finalDecisionRejected,
                  ]}
                >
                  <View
                    style={[
                      styles
                        .finalDecisionIcon,

                      {
                        backgroundColor:
                          normalizedStatus ===
                            'APPROVED'
                            ? COLORS.green
                            : COLORS.maroon,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        normalizedStatus ===
                          'APPROVED'
                          ? 'checkmark-circle-outline'
                          : 'close-circle-outline'
                      }
                      size={
                        22
                      }
                      color={
                        COLORS.white
                      }
                    />
                  </View>


                  <View
                    style={
                      styles
                        .finalDecisionCopy
                    }
                  >
                    <Text
                      style={[
                        styles
                          .finalDecisionTitle,

                        {
                          color:
                            normalizedStatus ===
                              'APPROVED'
                              ? COLORS.green
                              : COLORS.maroon,
                        },
                      ]}
                    >
                      {
                        normalizedStatus ===
                          'APPROVED'
                          ? 'Approved — Decision Locked'
                          : 'Rejected — Decision Locked'
                      }
                    </Text>

                    <Text
                      style={
                        styles
                          .finalDecisionText
                      }
                    >
                      This request already has a final decision. The action buttons and feedback field are now locked.
                    </Text>
                  </View>


                  <Ionicons
                    name="lock-closed-outline"
                    size={
                      19
                    }
                    color={
                      normalizedStatus ===
                        'APPROVED'
                        ? COLORS.green
                        : COLORS.maroon
                    }
                  />
                </View>
              )
              :
              null
          }


          {/*
          |--------------------------------------------------------------------------
          | FEEDBACK
          |--------------------------------------------------------------------------
          */}

          <Text
            style={
              styles.feedbackLabel
            }
          >
            FEEDBACK TO STUDENT
          </Text>


          <View
            style={[
              styles.feedbackBox,

              !canEditDecision &&
                styles
                  .feedbackBoxReadonly,
            ]}
          >
            <TextInput
              value={
                feedback
              }
              onChangeText={
                setFeedback
              }
              editable={
                canEditDecision &&
                !processingAction
              }
              multiline
              maxLength={
                3000
              }
              placeholder={
                decisionLocked
                  ? 'Final decision is locked'

                  : canManage
                    ? 'Write a clear response for the student...'
                    : 'No editing permission'
              }
              placeholderTextColor={
                COLORS.lightMuted
              }
              selectionColor={
                COLORS.maroon
              }
              textAlignVertical="top"
              style={
                styles.feedbackInput
              }
            />


            <Text
              style={
                styles.feedbackCount
              }
            >
              {
                feedback.length
              }
              /3000
            </Text>
          </View>


          {/*
          |--------------------------------------------------------------------------
          | ACTION BUTTONS
          |--------------------------------------------------------------------------
          |
          | Both buttons stay visible for clarity, but once the request becomes
          | APPROVED or REJECTED, BOTH buttons are disabled.
          |
          */}

          {
            canManage
              ? (
                <View
                  style={
                    styles
                      .decisionActions
                  }
                >

                  {/*
                  |--------------------------------------------------------------------------
                  | REJECT
                  |--------------------------------------------------------------------------
                  */}

                  <TouchableOpacity
                    activeOpacity={
                      0.82
                    }
                    disabled={
                      actionDisabled
                    }
                    accessibilityState={{
                      disabled:
                        actionDisabled,
                    }}
                    onPress={
                      onReject
                    }
                    style={[
                      styles
                        .rejectButton,

                      actionDisabled &&
                        styles
                          .disabledButton,
                    ]}
                  >
                    {
                      processingAction ===
                      'reject'
                        ? (
                          <ActivityIndicator
                            size="small"
                            color={
                              COLORS.white
                            }
                          />
                        )
                        :
                        (
                          <Ionicons
                            name={
                              decisionLocked &&
                              normalizedStatus ===
                                'REJECTED'
                                ? 'close-circle'
                                : 'close-circle-outline'
                            }
                            size={
                              20
                            }
                            color={
                              COLORS.white
                            }
                          />
                        )
                    }

                    <Text
                      style={
                        styles
                          .decisionButtonText
                      }
                    >
                      {
                        processingAction ===
                          'reject'
                          ? 'Rejecting...'

                          : decisionLocked &&
                            normalizedStatus ===
                              'REJECTED'
                            ? 'Rejected'

                            : 'Reject'
                      }
                    </Text>
                  </TouchableOpacity>


                  {/*
                  |--------------------------------------------------------------------------
                  | APPROVE
                  |--------------------------------------------------------------------------
                  */}

                  <TouchableOpacity
                    activeOpacity={
                      0.82
                    }
                    disabled={
                      actionDisabled
                    }
                    accessibilityState={{
                      disabled:
                        actionDisabled,
                    }}
                    onPress={
                      onApprove
                    }
                    style={[
                      styles
                        .approveButton,

                      actionDisabled &&
                        styles
                          .disabledButton,
                    ]}
                  >
                    {
                      processingAction ===
                      'approve'
                        ? (
                          <ActivityIndicator
                            size="small"
                            color={
                              COLORS.white
                            }
                          />
                        )
                        :
                        (
                          <Ionicons
                            name={
                              decisionLocked &&
                              normalizedStatus ===
                                'APPROVED'
                                ? 'checkmark-circle'
                                : 'checkmark-circle-outline'
                            }
                            size={
                              20
                            }
                            color={
                              COLORS.white
                            }
                          />
                        )
                    }

                    <Text
                      style={
                        styles
                          .decisionButtonText
                      }
                    >
                      {
                        processingAction ===
                          'approve'
                          ? 'Approving...'

                          : decisionLocked &&
                            normalizedStatus ===
                              'APPROVED'
                            ? 'Approved'

                            : 'Approve'
                      }
                    </Text>
                  </TouchableOpacity>
                </View>
              )
              :
              null
          }
        </View>
      </ScrollView>
    </View>
  );
}


/*
|--------------------------------------------------------------------------
| INFORMATION CARD
|--------------------------------------------------------------------------
*/

function InformationCard({
  icon,
  label,
  value,
}) {
  return (
    <View
      style={
        styles
          .informationCard
      }
    >
      <View
        style={
          styles
            .informationIcon
        }
      >
        <Ionicons
          name={
            icon
          }
          size={
            19
          }
          color={
            COLORS.maroon
          }
        />
      </View>

      <View
        style={
          styles
            .informationCopy
        }
      >
        <Text
          style={
            styles
              .informationLabel
          }
        >
          {label}
        </Text>

        <Text
          style={
            styles
              .informationValue
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
| REVIEW SECTION HEADER
|--------------------------------------------------------------------------
*/

function ReviewSectionHeader({
  number,
  eyebrow,
  title,
  icon,
}) {
  return (
    <View
      style={
        styles
          .reviewSectionHeader
      }
    >
      <View
        style={
          styles
            .reviewSectionNumber
        }
      >
        <Text
          style={
            styles
              .reviewSectionNumberText
          }
        >
          {number}
        </Text>
      </View>

      <View
        style={
          styles
            .reviewSectionCopy
        }
      >
        <Text
          style={
            styles
              .reviewSectionEyebrow
          }
        >
          {eyebrow}
        </Text>

        <Text
          style={
            styles
              .reviewSectionTitle
          }
        >
          {title}
        </Text>
      </View>

      <Ionicons
        name={
          icon
        }
        size={
          21
        }
        color={
          COLORS.maroon
        }
      />
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
      flex:
        1,

      backgroundColor:
        COLORS.page,
    },


    pageScroll: {
      flex:
        1,

      backgroundColor:
        COLORS.page,
    },


    content: {
      paddingHorizontal:
        16,
    },


    /*
    |--------------------------------------------------------------------------
    | LOADING
    |--------------------------------------------------------------------------
    */

    loadingScreen: {
      flex:
        1,

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


    loadingDescription: {
      marginTop:
        5,

      color:
        COLORS.muted,

      fontSize:
        13,
    },


    pressed: {
      opacity:
        0.72,
    },


    /*
    |--------------------------------------------------------------------------
    | ATTENDANCE-STYLE HERO
    |--------------------------------------------------------------------------
    */

    hero: {
      position:
        'relative',

      overflow:
        'hidden',

      minHeight:
        250,

      paddingTop:
        22,

      paddingHorizontal:
        20,

      paddingBottom:
        52,

      backgroundColor:
        COLORS.maroon,

      borderBottomLeftRadius:
        34,

      borderBottomRightRadius:
        34,
    },


    heroOrbOne: {
      position:
        'absolute',

      width:
        180,

      height:
        180,

      borderRadius:
        90,

      top:
        -80,

      right:
        -50,

      backgroundColor:
        'rgba(255,189,54,0.08)',
    },


    heroOrbTwo: {
      position:
        'absolute',

      width:
        110,

      height:
        110,

      borderRadius:
        55,

      bottom:
        -40,

      left:
        -25,

      borderWidth:
        18,

      borderColor:
        'rgba(255,255,255,0.035)',
    },


    heroTop: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },


    heroTitleCopy: {
      flex:
        1,

      minWidth:
        0,

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
        1.4,
    },


    heroTitle: {
      marginTop:
        5,

      color:
        COLORS.white,

      fontSize:
        31,

      lineHeight:
        37,

      fontWeight:
        '900',

      letterSpacing:
        -0.8,
    },


    heroDescription: {
      maxWidth:
        325,

      marginTop:
        10,

      color:
        'rgba(255,255,255,0.70)',

      fontSize:
        14,

      lineHeight:
        20,
    },


    heroIcon: {
      width:
        50,

      height:
        50,

      borderRadius:
        17,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.yellow,
    },


    heroMeta: {
      marginTop:
        24,

      minHeight:
        65,

      paddingHorizontal:
        14,

      borderRadius:
        18,

      flexDirection:
        'row',

      alignItems:
        'center',

      backgroundColor:
        'rgba(0,13,18,0.18)',
    },


    heroMetaItem: {
      flex:
        1,

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    heroMetaCopy: {
      flex:
        1,

      minWidth:
        0,

      marginLeft:
        8,
    },


    heroMetaLabel: {
      color:
        'rgba(255,255,255,0.50)',

      fontSize:
        10,

      fontWeight:
        '700',
    },


    heroMetaValue: {
      marginTop:
        2,

      color:
        COLORS.white,

      fontSize:
        13,

      fontWeight:
        '800',
    },


    heroMetaLine: {
      width:
        1,

      height:
        32,

      marginHorizontal:
        12,

      backgroundColor:
        'rgba(255,255,255,0.14)',
    },


    /*
    |--------------------------------------------------------------------------
    | COMPONENT SELECTOR
    |--------------------------------------------------------------------------
    */

    componentSelectorCard: {
      marginTop:
        18,

      paddingTop:
        12,

      paddingBottom:
        11,

      borderRadius:
        18,

      backgroundColor:
        COLORS.white,

      borderWidth:
        1,

      borderColor:
        COLORS.border,
    },


    componentSelectorLabel: {
      paddingHorizontal:
        13,

      marginBottom:
        9,

      color:
        COLORS.orange,

      fontSize:
        10,

      fontWeight:
        '900',

      letterSpacing:
        0.8,
    },


    componentSelectorRow: {
      paddingHorizontal:
        10,

      gap:
        8,
    },


    componentSelectorButton: {
      minWidth:
        92,

      height:
        42,

      paddingHorizontal:
        13,

      borderRadius:
        13,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.cream,

      borderWidth:
        1,

      borderColor:
        COLORS.border,
    },


    componentSelectorButtonActive: {
      backgroundColor:
        COLORS.maroon,

      borderColor:
        COLORS.maroon,
    },


    componentSelectorText: {
      marginLeft:
        6,

      color:
        COLORS.teal,

      fontSize:
        12,

      fontWeight:
        '900',
    },


    componentSelectorTextActive: {
      color:
        COLORS.white,
    },


    /*
    |--------------------------------------------------------------------------
    | ERROR
    |--------------------------------------------------------------------------
    */

    errorBanner: {
      marginTop:
        14,

      padding:
        13,

      borderRadius:
        15,

      flexDirection:
        'row',

      alignItems:
        'center',

      backgroundColor:
        COLORS.softMaroon,

      borderWidth:
        1,

      borderColor:
        'rgba(84,16,15,0.12)',
    },


    errorBannerText: {
      flex:
        1,

      marginHorizontal:
        9,

      color:
        COLORS.maroon,

      fontSize:
        12,

      lineHeight:
        17,

      fontWeight:
        '600',
    },


    /*
    |--------------------------------------------------------------------------
    | SECTION
    |--------------------------------------------------------------------------
    */

    sectionTitleRow: {
      marginTop:
        26,

      marginBottom:
        12,

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    sectionIcon: {
      width:
        42,

      height:
        42,

      marginRight:
        10,

      borderRadius:
        14,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.dark,
    },


    sectionEyebrow: {
      color:
        COLORS.orange,

      fontSize:
        10,

      fontWeight:
        '900',

      letterSpacing:
        1.1,
    },


    sectionTitle: {
      marginTop:
        2,

      color:
        COLORS.dark,

      fontSize:
        19,

      fontWeight:
        '900',
    },


    /*
    |--------------------------------------------------------------------------
    | FILTERS
    |--------------------------------------------------------------------------
    */

    filters: {
      paddingRight:
        16,
    },


    filterCard: {
      width:
        132,

      minHeight:
        78,

      marginRight:
        9,

      paddingHorizontal:
        11,

      paddingVertical:
        11,

      borderRadius:
        18,

      borderWidth:
        1,

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    filterIcon: {
      width:
        39,

      height:
        39,

      marginRight:
        10,

      borderRadius:
        13,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    filterLabel: {
      fontSize:
        11,

      fontWeight:
        '800',
    },


    filterCount: {
      marginTop:
        2,

      fontSize:
        19,

      fontWeight:
        '900',
    },


    /*
    |--------------------------------------------------------------------------
    | REQUEST HEADER
    |--------------------------------------------------------------------------
    */

    requestsHeader: {
      marginTop:
        28,

      marginBottom:
        12,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },


    requestsTitle: {
      marginTop:
        3,

      color:
        COLORS.dark,

      fontSize:
        22,

      fontWeight:
        '900',
    },


    resultCount: {
      minWidth:
        42,

      height:
        42,

      paddingHorizontal:
        8,

      borderRadius:
        14,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.maroon,
    },


    resultCountText: {
      color:
        COLORS.white,

      fontSize:
        13,

      fontWeight:
        '900',
    },


    /*
    |--------------------------------------------------------------------------
    | SEARCH
    |--------------------------------------------------------------------------
    */

    searchBox: {
      height:
        54,

      paddingHorizontal:
        14,

      borderRadius:
        17,

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


    searchInput: {
      flex:
        1,

      height:
        '100%',

      marginLeft:
        9,

      color:
        COLORS.dark,

      fontSize:
        14,
    },


    clearSearch: {
      width:
        36,

      height:
        36,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    /*
    |--------------------------------------------------------------------------
    | REQUEST CARD
    |--------------------------------------------------------------------------
    */

    requestList: {
      marginTop:
        14,
    },


    letterCard: {
      marginBottom:
        12,

      overflow:
        'hidden',

      borderRadius:
        20,

      flexDirection:
        'row',

      backgroundColor:
        COLORS.white,

      borderWidth:
        1,

      borderColor:
        COLORS.border,
    },


    letterNumber: {
      width:
        42,

      paddingTop:
        18,

      alignItems:
        'center',

      backgroundColor:
        COLORS.softMaroon,

      borderRightWidth:
        1,

      borderRightColor:
        COLORS.border,
    },


    letterNumberText: {
      color:
        COLORS.maroon,

      fontSize:
        11,

      fontWeight:
        '900',
    },


    letterBody: {
      flex:
        1,

      minWidth:
        0,

      padding:
        14,
    },


    identityRow: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },


    studentAvatar: {
      width:
        48,

      height:
        48,

      overflow:
        'hidden',

      borderRadius:
        24,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.maroon,
    },


    studentAvatarImage: {
      width:
        '100%',

      height:
        '100%',
    },


    studentAvatarInitials: {
      color:
        COLORS.white,

      fontSize:
        14,

      fontWeight:
        '900',
    },


    studentSummary: {
      flex:
        1,

      minWidth:
        0,

      marginLeft:
        10,
    },


    studentName: {
      color:
        COLORS.dark,

      fontSize:
        15,

      fontWeight:
        '900',
    },


    studentNumber: {
      marginTop:
        3,

      color:
        COLORS.muted,

      fontSize:
        12,

      fontWeight:
        '600',
    },


    statusPill: {
      marginLeft:
        8,

      paddingHorizontal:
        9,

      paddingVertical:
        6,

      borderRadius:
        999,
    },


    statusPillText: {
      fontSize:
        9,

      fontWeight:
        '900',

      letterSpacing:
        0.4,
    },


    cardMeta: {
      marginTop:
        12,

      flexDirection:
        'row',

      flexWrap:
        'wrap',

      gap:
        12,
    },


    cardMetaItem: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },


    cardMetaText: {
      marginLeft:
        5,

      color:
        COLORS.teal,

      fontSize:
        12,

      fontWeight:
        '700',
    },


    reasonBox: {
      marginTop:
        12,

      padding:
        11,

      borderRadius:
        13,

      backgroundColor:
        COLORS.page,
    },


    reasonLabel: {
      color:
        COLORS.orange,

      fontSize:
        9,

      fontWeight:
        '900',

      letterSpacing:
        0.8,
    },


    reasonText: {
      marginTop:
        4,

      color:
        COLORS.dark,

      fontSize:
        13,

      lineHeight:
        18,

      fontWeight:
        '600',
    },


    reviewLink: {
      marginTop:
        12,

      paddingTop:
        11,

      borderTopWidth:
        1,

      borderTopColor:
        COLORS.border,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'flex-end',
    },


    reviewLinkText: {
      marginRight:
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
    | EMPTY
    |--------------------------------------------------------------------------
    */

    emptyState: {
      marginTop:
        15,

      paddingHorizontal:
        24,

      paddingVertical:
        36,

      borderRadius:
        22,

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
        19,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.maroon,
    },


    emptyEyebrow: {
      marginTop:
        17,

      color:
        COLORS.orange,

      fontSize:
        10,

      fontWeight:
        '900',

      letterSpacing:
        1,
    },


    emptyTitle: {
      marginTop:
        5,

      color:
        COLORS.dark,

      fontSize:
        19,

      fontWeight:
        '900',
    },


    emptyDescription: {
      marginTop:
        8,

      color:
        COLORS.muted,

      fontSize:
        13,

      lineHeight:
        19,

      textAlign:
        'center',
    },


    /*
    |--------------------------------------------------------------------------
    | REVIEW SCREEN
    |--------------------------------------------------------------------------
    */

    reviewSafeArea: {
      flex:
        1,

      backgroundColor:
        COLORS.page,
    },


    reviewRoot: {
      flex:
        1,

      backgroundColor:
        COLORS.page,
    },


    reviewHeader: {
      minHeight:
        86,

      paddingHorizontal:
        16,

      flexDirection:
        'row',

      alignItems:
        'center',

      backgroundColor:
        COLORS.maroon,
    },


    reviewBackButton: {
      width:
        42,

      height:
        42,

      borderRadius:
        14,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        'rgba(255,255,255,0.10)',
    },


    reviewHeaderCopy: {
      flex:
        1,

      minWidth:
        0,

      marginLeft:
        12,
    },


    reviewHeaderEyebrow: {
      color:
        COLORS.yellow,

      fontSize:
        9,

      fontWeight:
        '900',

      letterSpacing:
        1.1,
    },


    reviewHeaderTitle: {
      marginTop:
        3,

      color:
        COLORS.white,

      fontSize:
        20,

      fontWeight:
        '900',
    },


    reviewReference: {
      alignItems:
        'flex-end',
    },


    reviewReferenceLabel: {
      color:
        'rgba(255,255,255,0.54)',

      fontSize:
        9,

      fontWeight:
        '700',
    },


    reviewReferenceValue: {
      marginTop:
        2,

      color:
        COLORS.white,

      fontSize:
        13,

      fontWeight:
        '900',
    },


    reviewScroll: {
      flex:
        1,
    },


    /*
    |--------------------------------------------------------------------------
    | STUDENT PROFILE
    |--------------------------------------------------------------------------
    */

    studentHero: {
      padding:
        16,

      borderRadius:
        20,

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


    largeAvatar: {
      width:
        70,

      height:
        70,

      overflow:
        'hidden',

      borderRadius:
        35,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.maroon,
    },


    largeAvatarImage: {
      width:
        '100%',

      height:
        '100%',
    },


    largeAvatarText: {
      color:
        COLORS.white,

      fontSize:
        20,

      fontWeight:
        '900',
    },


    studentHeroCopy: {
      flex:
        1,

      minWidth:
        0,

      marginLeft:
        14,
    },


    studentHeroEyebrow: {
      color:
        COLORS.orange,

      fontSize:
        9,

      fontWeight:
        '900',

      letterSpacing:
        0.9,
    },


    studentHeroName: {
      marginTop:
        4,

      color:
        COLORS.dark,

      fontSize:
        19,

      fontWeight:
        '900',
    },


    studentHeroMeta: {
      marginTop:
        4,

      color:
        COLORS.teal,

      fontSize:
        12,

      fontWeight:
        '700',
    },


    studentHeroEmail: {
      marginTop:
        3,

      color:
        COLORS.muted,

      fontSize:
        12,
    },


    /*
    |--------------------------------------------------------------------------
    | STATUS
    |--------------------------------------------------------------------------
    */

    statusStrip: {
      marginTop:
        12,

      padding:
        14,

      borderRadius:
        17,

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


    statusStripLabel: {
      color:
        COLORS.muted,

      fontSize:
        9,

      fontWeight:
        '900',

      letterSpacing:
        0.7,
    },


    statusStripDescription: {
      marginTop:
        3,

      color:
        COLORS.dark,

      fontSize:
        13,

      fontWeight:
        '800',
    },


    largeStatusPill: {
      marginLeft:
        12,

      paddingHorizontal:
        11,

      paddingVertical:
        8,

      borderRadius:
        999,

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    largeStatusText: {
      marginLeft:
        5,

      fontSize:
        10,

      fontWeight:
        '900',
    },


    /*
    |--------------------------------------------------------------------------
    | INFORMATION
    |--------------------------------------------------------------------------
    */

    informationGrid: {
      marginTop:
        12,

      gap:
        9,
    },


    informationCard: {
      minHeight:
        64,

      padding:
        12,

      borderRadius:
        16,

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


    informationIcon: {
      width:
        40,

      height:
        40,

      borderRadius:
        13,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.softMaroon,
    },


    informationCopy: {
      flex:
        1,

      minWidth:
        0,

      marginLeft:
        11,
    },


    informationLabel: {
      color:
        COLORS.muted,

      fontSize:
        9,

      fontWeight:
        '900',

      letterSpacing:
        0.6,
    },


    informationValue: {
      marginTop:
        4,

      color:
        COLORS.dark,

      fontSize:
        14,

      lineHeight:
        18,

      fontWeight:
        '800',
    },


    /*
    |--------------------------------------------------------------------------
    | REVIEW SECTION HEADER
    |--------------------------------------------------------------------------
    */

    reviewSectionHeader: {
      marginTop:
        26,

      marginBottom:
        11,

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    reviewSectionNumber: {
      width:
        42,

      height:
        42,

      marginRight:
        10,

      borderRadius:
        6,

      borderTopRightRadius:
        14,

      borderBottomLeftRadius:
        14,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.maroon,
    },


    reviewSectionNumberText: {
      color:
        COLORS.white,

      fontSize:
        12,

      fontWeight:
        '900',
    },


    reviewSectionCopy: {
      flex:
        1,

      minWidth:
        0,
    },


    reviewSectionEyebrow: {
      color:
        COLORS.orange,

      fontSize:
        9,

      fontWeight:
        '900',

      letterSpacing:
        0.9,
    },


    reviewSectionTitle: {
      marginTop:
        2,

      color:
        COLORS.dark,

      fontSize:
        18,

      fontWeight:
        '900',
    },


    /*
    |--------------------------------------------------------------------------
    | EXPLANATION
    |--------------------------------------------------------------------------
    */

    statementPaper: {
      position:
        'relative',

      overflow:
        'hidden',

      padding:
        16,

      paddingLeft:
        21,

      borderRadius:
        18,

      backgroundColor:
        COLORS.white,

      borderWidth:
        1,

      borderColor:
        COLORS.border,
    },


    statementLine: {
      position:
        'absolute',

      left:
        0,

      top:
        0,

      bottom:
        0,

      width:
        5,

      backgroundColor:
        COLORS.orange,
    },


    statementText: {
      color:
        COLORS.dark,

      fontSize:
        14,

      lineHeight:
        22,
    },


    /*
    |--------------------------------------------------------------------------
    | NO EVIDENCE
    |--------------------------------------------------------------------------
    */

    noEvidence: {
      padding:
        15,

      borderRadius:
        18,

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


    noEvidenceIcon: {
      width:
        47,

      height:
        47,

      borderRadius:
        15,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.softMaroon,
    },


    noEvidenceCopy: {
      flex:
        1,

      marginLeft:
        12,
    },


    noEvidenceTitle: {
      color:
        COLORS.dark,

      fontSize:
        14,

      fontWeight:
        '900',
    },


    noEvidenceText: {
      marginTop:
        4,

      color:
        COLORS.muted,

      fontSize:
        12,

      lineHeight:
        17,
    },


    /*
    |--------------------------------------------------------------------------
    | EVIDENCE IMAGE
    |--------------------------------------------------------------------------
    */

    evidenceImageCard: {
      overflow:
        'hidden',

      borderRadius:
        18,

      backgroundColor:
        COLORS.white,

      borderWidth:
        1,

      borderColor:
        COLORS.border,
    },


    evidenceImage: {
      width:
        '100%',

      height:
        260,

      backgroundColor:
        COLORS.white,
    },


    evidenceImageFooter: {
      minHeight:
        62,

      paddingHorizontal:
        14,

      flexDirection:
        'row',

      alignItems:
        'center',

      backgroundColor:
        COLORS.maroon,
    },


    evidenceFooterCopy: {
      flex:
        1,

      marginHorizontal:
        10,
    },


    evidenceImageTitle: {
      color:
        COLORS.white,

      fontSize:
        13,

      fontWeight:
        '900',
    },


    evidenceImageSubtitle: {
      marginTop:
        2,

      color:
        'rgba(255,255,255,0.66)',

      fontSize:
        11,
    },


    /*
    |--------------------------------------------------------------------------
    | DOCUMENT
    |--------------------------------------------------------------------------
    */

    documentCard: {
      padding:
        14,

      borderRadius:
        18,

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


    documentIcon: {
      width:
        52,

      height:
        52,

      borderRadius:
        16,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.maroon,
    },


    documentCopy: {
      flex:
        1,

      minWidth:
        0,

      marginHorizontal:
        12,
    },


    documentEyebrow: {
      color:
        COLORS.orange,

      fontSize:
        9,

      fontWeight:
        '900',

      letterSpacing:
        0.7,
    },


    documentTitle: {
      marginTop:
        3,

      color:
        COLORS.dark,

      fontSize:
        14,

      fontWeight:
        '900',
    },


    documentSubtitle: {
      marginTop:
        3,

      color:
        COLORS.muted,

      fontSize:
        11,
    },


    /*
    |--------------------------------------------------------------------------
    | DECISION
    |--------------------------------------------------------------------------
    */

    decisionCard: {
      marginTop:
        28,

      padding:
        16,

      borderRadius:
        22,

      backgroundColor:
        COLORS.white,

      borderWidth:
        1,

      borderColor:
        COLORS.border,
    },


    decisionHeader: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',
    },


    decisionIcon: {
      width:
        47,

      height:
        47,

      borderRadius:
        15,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.maroon,
    },


    decisionHeaderCopy: {
      flex:
        1,

      minWidth:
        0,

      marginLeft:
        12,
    },


    decisionEyebrow: {
      color:
        COLORS.orange,

      fontSize:
        9,

      fontWeight:
        '900',

      letterSpacing:
        0.9,
    },


    decisionTitle: {
      marginTop:
        3,

      color:
        COLORS.dark,

      fontSize:
        18,

      fontWeight:
        '900',
    },


    decisionDescription: {
      marginTop:
        5,

      color:
        COLORS.muted,

      fontSize:
        12,

      lineHeight:
        17,
    },


    /*
    |--------------------------------------------------------------------------
    | FINAL DECISION NOTICE
    |--------------------------------------------------------------------------
    */

    finalDecisionNotice: {
      marginTop:
        14,

      padding:
        12,

      borderRadius:
        16,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderWidth:
        1,
    },


    finalDecisionApproved: {
      backgroundColor:
        COLORS.softGreen,

      borderColor:
        'rgba(88,118,28,0.22)',
    },


    finalDecisionRejected: {
      backgroundColor:
        COLORS.softMaroon,

      borderColor:
        'rgba(84,16,15,0.18)',
    },


    finalDecisionIcon: {
      width:
        42,

      height:
        42,

      borderRadius:
        14,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    finalDecisionCopy: {
      flex:
        1,

      minWidth:
        0,

      marginHorizontal:
        10,
    },


    finalDecisionTitle: {
      fontSize:
        13,

      fontWeight:
        '900',
    },


    finalDecisionText: {
      marginTop:
        3,

      color:
        COLORS.muted,

      fontSize:
        11,

      lineHeight:
        16,
    },


    /*
    |--------------------------------------------------------------------------
    | FEEDBACK
    |--------------------------------------------------------------------------
    */

    feedbackLabel: {
      marginTop:
        18,

      marginBottom:
        7,

      color:
        COLORS.teal,

      fontSize:
        10,

      fontWeight:
        '900',

      letterSpacing:
        0.8,
    },


    feedbackBox: {
      minHeight:
        135,

      padding:
        12,

      borderRadius:
        16,

      backgroundColor:
        COLORS.page,

      borderWidth:
        1,

      borderColor:
        COLORS.border,
    },


    feedbackBoxReadonly: {
      opacity:
        0.72,
    },


    feedbackInput: {
      minHeight:
        95,

      color:
        COLORS.dark,

      fontSize:
        14,

      lineHeight:
        20,
    },


    feedbackCount: {
      marginTop:
        5,

      color:
        COLORS.lightMuted,

      fontSize:
        10,

      textAlign:
        'right',
    },


    /*
    |--------------------------------------------------------------------------
    | DECISION BUTTONS
    |--------------------------------------------------------------------------
    */

    decisionActions: {
      marginTop:
        14,

      flexDirection:
        'row',

      gap:
        10,
    },


    rejectButton: {
      flex:
        1,

      height:
        50,

      borderRadius:
        15,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.maroon,
    },


    approveButton: {
      flex:
        1,

      height:
        50,

      borderRadius:
        15,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.green,
    },


    decisionButtonText: {
      marginLeft:
        7,

      color:
        COLORS.white,

      fontSize:
        13,

      fontWeight:
        '900',
    },


    disabledButton: {
      opacity:
        0.38,
    },
  });