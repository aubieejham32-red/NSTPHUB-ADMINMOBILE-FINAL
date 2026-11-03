import Ionicons from '@expo/vector-icons/Ionicons';

import {
  router,
  Stack,
} from 'expo-router';

import {
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
  changeAdministratorPassword,
  getAdminDashboard,
} from '../services/api';


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

  muted: '#766F6A',
  lightMuted: '#9B948F',

  border: '#DCD5CC',

  softMaroon: '#F5E8E6',
  softGreen: '#ECF1E3',
  softYellow: '#FFF3D2',
  softTeal: '#E7ECEE',

  danger: '#A53531',
};


/*
|--------------------------------------------------------------------------
| EMPTY ERRORS
|--------------------------------------------------------------------------
*/

const EMPTY_ERRORS = {
  current_password: '',
  password: '',
  password_confirmation: '',
};


/*
|--------------------------------------------------------------------------
| CHANGE PASSWORD SCREEN
|--------------------------------------------------------------------------
*/

export default function AdminChangePasswordScreen() {
  const insets =
    useSafeAreaInsets();


  /*
  |--------------------------------------------------------------------------
  | PASSWORD VALUES
  |--------------------------------------------------------------------------
  */

  const [
    currentPassword,
    setCurrentPassword,
  ] = useState('');

  const [
    newPassword,
    setNewPassword,
  ] = useState('');

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('');


  /*
  |--------------------------------------------------------------------------
  | PASSWORD VISIBILITY
  |--------------------------------------------------------------------------
  */

  const [
    showCurrentPassword,
    setShowCurrentPassword,
  ] = useState(false);

  const [
    showNewPassword,
    setShowNewPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);


  /*
  |--------------------------------------------------------------------------
  | FORM STATE
  |--------------------------------------------------------------------------
  */

  const [
    errors,
    setErrors,
  ] = useState(
    EMPTY_ERRORS
  );

  const [
    focusedField,
    setFocusedField,
  ] = useState('');

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    accountLabel,
    setAccountLabel,
  ] = useState(
    'NSTP Staff'
  );


  /*
  |--------------------------------------------------------------------------
  | RESOLVE ACCOUNT TYPE
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      let active = true;

      const loadAccount =
        async () => {
          try {
            const result =
              await getAdminDashboard();

            if (!active) {
              return;
            }

            const account =
              result?.account ??
              result?.administrator ??
              {};

            const role =
              String(
                result?.role ??
                account?.role ??
                ''
              )
                .trim()
                .toLowerCase();


            /*
            |--------------------------------------------------------------------------
            | ACCOUNT LABEL
            |--------------------------------------------------------------------------
            */

            if (
              role ===
              'instructor'
            ) {
              setAccountLabel(
                'Instructor'
              );

              return;
            }


            if (
              role ===
              'coordinator-attendance'
            ) {
              setAccountLabel(
                'Attendance Coordinator'
              );

              return;
            }


            if (
              role ===
              'coordinator-announcement'
            ) {
              setAccountLabel(
                'Announcement Coordinator'
              );

              return;
            }


            if (
              role ===
              'coordinator-schedule'
            ) {
              setAccountLabel(
                'Schedule Coordinator'
              );

              return;
            }


            if (
              role.startsWith(
                'coordinator-'
              )
            ) {
              setAccountLabel(
                'Coordinator'
              );

              return;
            }


            setAccountLabel(
              'University Administrator'
            );

          } catch (error) {
            /*
            |--------------------------------------------------------------------------
            | Account label is only visual.
            |
            | The page can still be used even if dashboard information
            | cannot be loaded here.
            |--------------------------------------------------------------------------
            */

            console.log(
              'Unable to resolve account label:',
              error
            );
          }
        };

      loadAccount();

      return () => {
        active = false;
      };
    },
    []
  );


  /*
  |--------------------------------------------------------------------------
  | CLEAR FIELD ERROR
  |--------------------------------------------------------------------------
  */

  const clearFieldError =
    field => {
      setErrors(
        previous => ({
          ...previous,

          [field]: '',
        })
      );
    };


  /*
  |--------------------------------------------------------------------------
  | RESET FORM
  |--------------------------------------------------------------------------
  */

  const resetForm =
    () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setShowCurrentPassword(
        false
      );

      setShowNewPassword(
        false
      );

      setShowConfirmPassword(
        false
      );

      setFocusedField('');

      setErrors(
        EMPTY_ERRORS
      );
    };


  /*
  |--------------------------------------------------------------------------
  | VALIDATE FORM
  |--------------------------------------------------------------------------
  */

  const validateForm =
    () => {
      const nextErrors = {
        ...EMPTY_ERRORS,
      };

      let valid =
        true;


      /*
      |--------------------------------------------------------------------------
      | CURRENT PASSWORD
      |--------------------------------------------------------------------------
      |
      | Do not trim passwords.
      |--------------------------------------------------------------------------
      */

      if (!currentPassword) {
        nextErrors
          .current_password =
          'Please enter your current password.';

        valid = false;
      }


      /*
      |--------------------------------------------------------------------------
      | NEW PASSWORD
      |--------------------------------------------------------------------------
      */

      if (!newPassword) {
        nextErrors.password =
          'Please enter your new password.';

        valid = false;

      } else if (
        newPassword.length < 8
      ) {
        nextErrors.password =
          'New password must contain at least 8 characters.';

        valid = false;
      }


      /*
      |--------------------------------------------------------------------------
      | CONFIRM PASSWORD
      |--------------------------------------------------------------------------
      */

      if (!confirmPassword) {
        nextErrors
          .password_confirmation =
          'Please confirm your new password.';

        valid = false;

      } else if (
        newPassword !==
        confirmPassword
      ) {
        nextErrors
          .password_confirmation =
          'The password confirmation does not match.';

        valid = false;
      }


      /*
      |--------------------------------------------------------------------------
      | DO NOT REUSE CURRENT PASSWORD
      |--------------------------------------------------------------------------
      */

      if (
        currentPassword &&
        newPassword &&
        currentPassword ===
          newPassword
      ) {
        nextErrors.password =
          'Your new password must be different from your current password.';

        valid = false;
      }


      setErrors(
        nextErrors
      );

      return valid;
    };


  /*
  |--------------------------------------------------------------------------
  | CLOSE PAGE
  |--------------------------------------------------------------------------
  */

  const closePage =
    () => {
      if (saving) {
        return;
      }

      resetForm();

      router.replace(
        '/(tabs)/ProfileScreen'
      );
    };


  /*
  |--------------------------------------------------------------------------
  | SUBMIT
  |--------------------------------------------------------------------------
  |
  | IMPORTANT:
  |
  | The Vue/Inertia version posts to:
  |
  | POST /instructor-coordinator/change-password
  |
  | That is the WEB session route.
  |
  | Your React Native application authenticates through services/api.js.
  | Therefore we should not call the Inertia route directly from the mobile
  | app until the mobile password API is confirmed.
  |--------------------------------------------------------------------------
  */

  const handleSubmit =
    async () => {
      if (saving) {
        return;
      }


      /*
      |--------------------------------------------------------------------------
      | LOCAL VALIDATION
      |--------------------------------------------------------------------------
      */

      if (!validateForm()) {
        return;
      }


      /*
      |--------------------------------------------------------------------------
      | MOBILE API
      |--------------------------------------------------------------------------
      |
      | When your services/api.js password method is added, this section
      | becomes:
      |
      | const result = await changeAdministratorPassword({
      |   current_password: currentPassword,
      |   password: newPassword,
      |   password_confirmation: confirmPassword,
      | });
      |
      |--------------------------------------------------------------------------
      */

      try {
        setSaving(true);

        const result = await changeAdministratorPassword({
          current_password: currentPassword,
          password: newPassword,
          password_confirmation: confirmPassword,
        });

        Alert.alert(
          'Password changed',
          result?.message || 'Password changed successfully.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(tabs)/ProfileScreen'),
            },
          ]
        );
      } catch (err) {
        Alert.alert(
          'Unable to change password',
          err instanceof Error ? err.message : 'Please try again.'
        );
      } finally {
        setSaving(false);
      }
    };


  /*
  |--------------------------------------------------------------------------
  | PASSWORD REQUIREMENTS
  |--------------------------------------------------------------------------
  */

  const hasMinimumLength =
    newPassword.length >= 8;

  const passwordsMatch =
    Boolean(
      newPassword &&
      confirmPassword &&
      newPassword ===
        confirmPassword
    );

  const passwordIsDifferent =
    Boolean(
      currentPassword &&
      newPassword &&
      currentPassword !==
        newPassword
    );


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
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />


      <StatusBar
        barStyle="dark-content"

        backgroundColor={
          COLORS.cream
        }
      />


      <KeyboardAvoidingView
        style={
          styles.flex
        }

        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          style={
            styles.scrollView
          }

          contentContainerStyle={[
            styles.scrollContent,

            {
              paddingBottom:
                30 +
                insets.bottom,
            },
          ]}

          keyboardShouldPersistTaps="handled"

          showsVerticalScrollIndicator={
            false
          }
        >

          {/*
          |--------------------------------------------------------------------------
          | TOP BAR
          |--------------------------------------------------------------------------
          */}

          <View
            style={
              styles.topBar
            }
          >
            <TouchableOpacity
              activeOpacity={0.7}

              disabled={
                saving
              }

              style={
                styles.backButton
              }

              onPress={
                closePage
              }
            >
              <Ionicons
                name="arrow-back"
                size={22}
                color={
                  COLORS.maroon
                }
              />
            </TouchableOpacity>


            <Text
              style={
                styles.topBarTitle
              }
            >
              Security
            </Text>


            <TouchableOpacity
              activeOpacity={0.7}

              disabled={
                saving
              }

              style={
                styles.closeButton
              }

              onPress={
                closePage
              }
            >
              <Ionicons
                name="close"
                size={23}
                color={
                  COLORS.maroon
                }
              />
            </TouchableOpacity>
          </View>


          {/*
          |--------------------------------------------------------------------------
          | INTRODUCTION
          |--------------------------------------------------------------------------
          */}

          <View
            style={
              styles.intro
            }
          >
            <View
              style={
                styles.securityIconOuter
              }
            >
              <View
                style={
                  styles.securityIcon
                }
              >
                <Ionicons
                  name="lock-closed"
                  size={27}
                  color={
                    COLORS.white
                  }
                />
              </View>

              <View
                style={
                  styles.securityAccent
                }
              />
            </View>


            <Text
              style={
                styles.eyebrow
              }
            >
              ACCOUNT SECURITY
            </Text>


            <Text
              style={
                styles.title
              }
            >
              Change Password
            </Text>


            <Text
              style={
                styles.description
              }
            >
              Update your password to keep your{' '}
              <Text
                style={
                  styles.descriptionStrong
                }
              >
                {accountLabel}
              </Text>
              {' '}account secure.
            </Text>
          </View>


          {/*
          |--------------------------------------------------------------------------
          | FORM CARD
          |--------------------------------------------------------------------------
          */}

          <View
            style={
              styles.formCard
            }
          >

            {/*
            |--------------------------------------------------------------------------
            | CURRENT PASSWORD
            |--------------------------------------------------------------------------
            */}

            <PasswordField
              label="Current Password"

              placeholder="Enter current password"

              value={
                currentPassword
              }

              onChangeText={
                value => {
                  setCurrentPassword(
                    value
                  );

                  clearFieldError(
                    'current_password'
                  );
                }
              }

              visible={
                showCurrentPassword
              }

              onToggleVisibility={() =>
                setShowCurrentPassword(
                  previous =>
                    !previous
                )
              }

              error={
                errors
                  .current_password
              }

              focused={
                focusedField ===
                'current_password'
              }

              onFocus={() =>
                setFocusedField(
                  'current_password'
                )
              }

              onBlur={() =>
                setFocusedField('')
              }

              returnKeyType="next"
            />


            {/*
            |--------------------------------------------------------------------------
            | DIVIDER
            |--------------------------------------------------------------------------
            */}

            <View
              style={
                styles.sectionDivider
              }
            />


            {/*
            |--------------------------------------------------------------------------
            | NEW PASSWORD
            |--------------------------------------------------------------------------
            */}

            <PasswordField
              label="New Password"

              placeholder="Enter new password"

              value={
                newPassword
              }

              onChangeText={
                value => {
                  setNewPassword(
                    value
                  );

                  clearFieldError(
                    'password'
                  );

                  clearFieldError(
                    'password_confirmation'
                  );
                }
              }

              visible={
                showNewPassword
              }

              onToggleVisibility={() =>
                setShowNewPassword(
                  previous =>
                    !previous
                )
              }

              error={
                errors.password
              }

              focused={
                focusedField ===
                'password'
              }

              onFocus={() =>
                setFocusedField(
                  'password'
                )
              }

              onBlur={() =>
                setFocusedField('')
              }

              returnKeyType="next"
            />


            {/*
            |--------------------------------------------------------------------------
            | CONFIRM PASSWORD
            |--------------------------------------------------------------------------
            */}

            <PasswordField
              label="Confirm Password"

              placeholder="Confirm new password"

              value={
                confirmPassword
              }

              onChangeText={
                value => {
                  setConfirmPassword(
                    value
                  );

                  clearFieldError(
                    'password_confirmation'
                  );
                }
              }

              visible={
                showConfirmPassword
              }

              onToggleVisibility={() =>
                setShowConfirmPassword(
                  previous =>
                    !previous
                )
              }

              error={
                errors
                  .password_confirmation
              }

              focused={
                focusedField ===
                'password_confirmation'
              }

              onFocus={() =>
                setFocusedField(
                  'password_confirmation'
                )
              }

              onBlur={() =>
                setFocusedField('')
              }

              returnKeyType="done"

              onSubmitEditing={
                handleSubmit
              }
            />

          </View>


          {/*
          |--------------------------------------------------------------------------
          | PASSWORD REQUIREMENTS
          |--------------------------------------------------------------------------
          */}

          <View
            style={
              styles.requirementsCard
            }
          >
            <View
              style={
                styles.requirementsHeader
              }
            >
              <View
                style={
                  styles.requirementShield
                }
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={19}
                  color={
                    COLORS.green
                  }
                />
              </View>


              <View
                style={
                  styles.requirementsHeaderText
                }
              >
                <Text
                  style={
                    styles.requirementsTitle
                  }
                >
                  Password requirements
                </Text>

                <Text
                  style={
                    styles.requirementsDescription
                  }
                >
                  Make sure your new password meets these conditions.
                </Text>
              </View>
            </View>


            <View
              style={
                styles.requirementsList
              }
            >
              <RequirementItem
                complete={
                  hasMinimumLength
                }

                label="At least 8 characters"
              />


              <RequirementItem
                complete={
                  passwordsMatch
                }

                label="New passwords match"
              />


              <RequirementItem
                complete={
                  passwordIsDifferent
                }

                label="Different from current password"
              />
            </View>
          </View>


          {/*
          |--------------------------------------------------------------------------
          | SECURITY NOTICE
          |--------------------------------------------------------------------------
          */}

          <View
            style={
              styles.securityNotice
            }
          >
            <Ionicons
              name="information-circle-outline"
              size={19}
              color={
                COLORS.teal
              }
            />

            <Text
              style={
                styles.securityNoticeText
              }
            >
              For your security, your current password is required before
              a new password can be saved.
            </Text>
          </View>


          {/*
          |--------------------------------------------------------------------------
          | SAVE BUTTON
          |--------------------------------------------------------------------------
          */}

          <TouchableOpacity
            activeOpacity={0.82}

            disabled={
              saving
            }

            style={[
              styles.saveButton,

              saving &&
                styles.saveButtonDisabled,
            ]}

            onPress={
              handleSubmit
            }
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
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={20}
                      color={
                        COLORS.white
                      }
                    />

                    <Text
                      style={
                        styles.saveButtonText
                      }
                    >
                      Save Changes
                    </Text>
                  </>
                )
            }
          </TouchableOpacity>


          {/*
          |--------------------------------------------------------------------------
          | CANCEL
          |--------------------------------------------------------------------------
          */}

          <Pressable
            disabled={
              saving
            }

            onPress={
              closePage
            }

            style={({
              pressed,
            }) => [
              styles.cancelButton,

              pressed &&
                styles.cancelButtonPressed,
            ]}
          >
            <Text
              style={
                styles.cancelButtonText
              }
            >
              Cancel
            </Text>
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


/*
|--------------------------------------------------------------------------
| PASSWORD FIELD
|--------------------------------------------------------------------------
*/

function PasswordField({
  label,
  placeholder,
  value,
  onChangeText,
  visible,
  onToggleVisibility,
  error,
  focused,
  onFocus,
  onBlur,
  returnKeyType,
  onSubmitEditing,
}) {
  const hasError =
    Boolean(error);

  return (
    <View
      style={
        styles.fieldGroup
      }
    >
      <Text
        style={
          styles.fieldLabel
        }
      >
        {label}
      </Text>


      <View
        style={[
          styles.inputWrapper,

          focused &&
            styles.inputWrapperFocused,

          hasError &&
            styles.inputWrapperError,
        ]}
      >
        <View
          style={
            styles.inputLeadingIcon
          }
        >
          <Ionicons
            name="lock-closed-outline"
            size={18}
            color={
              hasError
                ? COLORS.maroon
                : focused
                  ? COLORS.green
                  : COLORS.teal
            }
          />
        </View>


        <TextInput
          value={
            value
          }

          onChangeText={
            onChangeText
          }

          placeholder={
            placeholder
          }

          placeholderTextColor={
            COLORS.lightMuted
          }

          secureTextEntry={
            !visible
          }

          autoCapitalize="none"

          autoCorrect={
            false
          }

          autoComplete="off"

          textContentType={
            'password'
          }

          returnKeyType={
            returnKeyType
          }

          onSubmitEditing={
            onSubmitEditing
          }

          onFocus={
            onFocus
          }

          onBlur={
            onBlur
          }

          style={
            styles.textInput
          }

          selectionColor={
            COLORS.green
          }
        />


        <TouchableOpacity
          activeOpacity={0.65}

          style={
            styles.eyeButton
          }

          onPress={
            onToggleVisibility
          }
        >
          <Ionicons
            name={
              visible
                ? 'eye-outline'
                : 'eye-off-outline'
            }

            size={21}

            color={
              focused
                ? COLORS.maroon
                : COLORS.teal
            }
          />
        </TouchableOpacity>
      </View>


      {
        hasError
          ? (
            <View
              style={
                styles.errorRow
              }
            >
              <Ionicons
                name="alert-circle-outline"
                size={14}
                color={
                  COLORS.danger
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
    </View>
  );
}


/*
|--------------------------------------------------------------------------
| REQUIREMENT
|--------------------------------------------------------------------------
*/

function RequirementItem({
  complete,
  label,
}) {
  return (
    <View
      style={
        styles.requirementItem
      }
    >
      <View
        style={[
          styles.requirementIcon,

          complete &&
            styles.requirementIconComplete,
        ]}
      >
        <Ionicons
          name={
            complete
              ? 'checkmark'
              : 'remove'
          }

          size={13}

          color={
            complete
              ? COLORS.white
              : COLORS.lightMuted
          }
        />
      </View>


      <Text
        style={[
          styles.requirementText,

          complete &&
            styles.requirementTextComplete,
        ]}
      >
        {label}
      </Text>
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

    flex: {
      flex: 1,
    },

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
      paddingHorizontal: 18,

      paddingTop: 5,
    },


    /*
    |--------------------------------------------------------------------------
    | TOP BAR
    |--------------------------------------------------------------------------
    */

    topBar: {
      height: 60,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',
    },

    backButton: {
      width: 42,

      height: 42,

      borderRadius: 14,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        COLORS.white,

      borderWidth: 1,

      borderColor:
        COLORS.border,
    },

    closeButton: {
      width: 42,

      height: 42,

      borderRadius: 14,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        COLORS.white,

      borderWidth: 1,

      borderColor:
        COLORS.border,
    },

    topBarTitle: {
      color:
        COLORS.dark,

      fontSize: 14,

      fontWeight: '800',
    },


    /*
    |--------------------------------------------------------------------------
    | INTRO
    |--------------------------------------------------------------------------
    */

    intro: {
      alignItems: 'center',

      paddingTop: 24,

      paddingHorizontal: 16,

      paddingBottom: 27,
    },

    securityIconOuter: {
      width: 82,

      height: 82,

      position: 'relative',

      alignItems: 'center',

      justifyContent: 'center',
    },

    securityIcon: {
      width: 68,

      height: 68,

      borderRadius: 24,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        COLORS.maroon,

      shadowColor:
        COLORS.maroon,

      shadowOffset: {
        width: 0,
        height: 5,
      },

      shadowOpacity: 0.15,

      shadowRadius: 10,

      elevation: 4,
    },

    securityAccent: {
      position: 'absolute',

      right: 1,

      top: 1,

      width: 21,

      height: 21,

      borderRadius: 11,

      backgroundColor:
        COLORS.yellow,

      borderWidth: 4,

      borderColor:
        COLORS.cream,
    },

    eyebrow: {
      marginTop: 17,

      color:
        COLORS.orange,

      fontSize: 7,

      fontWeight: '900',

      letterSpacing: 1.5,
    },

    title: {
      marginTop: 5,

      color:
        COLORS.black,

      fontSize: 27,

      lineHeight: 33,

      fontWeight: '900',

      letterSpacing: -0.7,

      textAlign: 'center',
    },

    description: {
      maxWidth: 315,

      marginTop: 9,

      color:
        COLORS.teal,

      fontSize: 10,

      lineHeight: 16,

      textAlign: 'center',
    },

    descriptionStrong: {
      color:
        COLORS.maroon,

      fontWeight: '800',
    },


    /*
    |--------------------------------------------------------------------------
    | FORM CARD
    |--------------------------------------------------------------------------
    */

    formCard: {
      paddingHorizontal: 16,

      paddingTop: 20,

      paddingBottom: 5,

      borderRadius: 23,

      backgroundColor:
        COLORS.white,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      shadowColor:
        COLORS.black,

      shadowOffset: {
        width: 0,
        height: 4,
      },

      shadowOpacity: 0.05,

      shadowRadius: 10,

      elevation: 2,
    },

    sectionDivider: {
      height: 1,

      marginTop: 3,

      marginBottom: 20,

      backgroundColor:
        COLORS.border,
    },


    /*
    |--------------------------------------------------------------------------
    | FIELD
    |--------------------------------------------------------------------------
    */

    fieldGroup: {
      marginBottom: 20,
    },

    fieldLabel: {
      marginBottom: 8,

      marginLeft: 4,

      color:
        COLORS.maroon,

      fontSize: 10,

      fontWeight: '800',
    },

    inputWrapper: {
      height: 53,

      flexDirection: 'row',

      alignItems: 'center',

      overflow: 'hidden',

      borderWidth: 1.5,

      borderColor:
        COLORS.teal,

      borderRadius: 18,

      backgroundColor:
        COLORS.white,
    },

    inputWrapperFocused: {
      borderColor:
        COLORS.green,

      shadowColor:
        COLORS.green,

      shadowOffset: {
        width: 0,
        height: 0,
      },

      shadowOpacity: 0.13,

      shadowRadius: 5,

      elevation: 1,
    },

    inputWrapperError: {
      borderColor:
        COLORS.maroon,
    },

    inputLeadingIcon: {
      width: 45,

      alignItems: 'flex-end',

      paddingRight: 8,
    },

    textInput: {
      flex: 1,

      height: '100%',

      paddingHorizontal: 4,

      color:
        COLORS.black,

      fontSize: 11,
    },

    eyeButton: {
      width: 51,

      height: '100%',

      alignItems: 'center',

      justifyContent: 'center',
    },


    /*
    |--------------------------------------------------------------------------
    | FIELD ERROR
    |--------------------------------------------------------------------------
    */

    errorRow: {
      marginTop: 7,

      marginLeft: 5,

      flexDirection: 'row',

      alignItems: 'center',
    },

    errorText: {
      flex: 1,

      marginLeft: 5,

      color:
        COLORS.danger,

      fontSize: 8,

      lineHeight: 12,

      fontWeight: '700',
    },


    /*
    |--------------------------------------------------------------------------
    | REQUIREMENTS
    |--------------------------------------------------------------------------
    */

    requirementsCard: {
      marginTop: 14,

      padding: 15,

      borderRadius: 20,

      backgroundColor:
        COLORS.softGreen,

      borderWidth: 1,

      borderColor:
        'rgba(88,118,28,0.14)',
    },

    requirementsHeader: {
      flexDirection: 'row',

      alignItems: 'center',
    },

    requirementShield: {
      width: 39,

      height: 39,

      borderRadius: 13,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        COLORS.white,
    },

    requirementsHeaderText: {
      flex: 1,

      marginLeft: 10,
    },

    requirementsTitle: {
      color:
        COLORS.dark,

      fontSize: 9.5,

      fontWeight: '900',
    },

    requirementsDescription: {
      marginTop: 2,

      color:
        COLORS.muted,

      fontSize: 7.5,

      lineHeight: 11,
    },

    requirementsList: {
      marginTop: 13,

      paddingTop: 10,

      borderTopWidth: 1,

      borderTopColor:
        'rgba(88,118,28,0.15)',
    },

    requirementItem: {
      minHeight: 29,

      flexDirection: 'row',

      alignItems: 'center',
    },

    requirementIcon: {
      width: 21,

      height: 21,

      borderRadius: 11,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        COLORS.white,

      borderWidth: 1,

      borderColor:
        COLORS.border,
    },

    requirementIconComplete: {
      backgroundColor:
        COLORS.green,

      borderColor:
        COLORS.green,
    },

    requirementText: {
      marginLeft: 8,

      color:
        COLORS.muted,

      fontSize: 8.5,

      fontWeight: '600',
    },

    requirementTextComplete: {
      color:
        COLORS.green,

      fontWeight: '800',
    },


    /*
    |--------------------------------------------------------------------------
    | SECURITY NOTICE
    |--------------------------------------------------------------------------
    */

    securityNotice: {
      marginTop: 13,

      paddingHorizontal: 14,

      paddingVertical: 12,

      borderRadius: 17,

      flexDirection: 'row',

      alignItems: 'flex-start',

      backgroundColor:
        COLORS.softTeal,
    },

    securityNoticeText: {
      flex: 1,

      marginLeft: 8,

      color:
        COLORS.teal,

      fontSize: 8,

      lineHeight: 13,
    },


    /*
    |--------------------------------------------------------------------------
    | SAVE
    |--------------------------------------------------------------------------
    */

    saveButton: {
      height: 52,

      marginTop: 24,

      borderRadius: 17,

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

      shadowOpacity: 0.18,

      shadowRadius: 8,

      elevation: 3,
    },

    saveButtonDisabled: {
      opacity: 0.6,
    },

    saveButtonText: {
      marginLeft: 8,

      color:
        COLORS.white,

      fontSize: 10,

      fontWeight: '900',

      letterSpacing: 0.3,
    },


    /*
    |--------------------------------------------------------------------------
    | CANCEL
    |--------------------------------------------------------------------------
    */

    cancelButton: {
      height: 45,

      marginTop: 8,

      alignItems: 'center',

      justifyContent: 'center',
    },

    cancelButtonPressed: {
      opacity: 0.55,
    },

    cancelButtonText: {
      color:
        COLORS.maroon,

      fontSize: 9,

      fontWeight: '800',
    },

  });