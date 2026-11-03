import Ionicons from '@expo/vector-icons/Ionicons';

import {
  router,
  Stack,
} from 'expo-router';

import {
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  resendAdminForgotPasswordCode,
  resetAdminForgotPassword,
  sendAdminForgotPasswordCode,
  verifyAdminForgotPasswordCode,
} from '../services/api';


/*
|--------------------------------------------------------------------------
| COLORS
|--------------------------------------------------------------------------
*/

const COLORS = {
  maroon: '#54100F',
  cream: '#F4EFE7',
  white: '#FFFFFF',
  dark: '#201918',
  muted: '#807571',
  border: '#D5CAC4',
  placeholder: '#9D938E',
  gold: '#D19A3A',
  green: '#58761C',

  errorBackground: '#F8ECEA',
  successBackground: '#EDF3E6',
};


/*
|--------------------------------------------------------------------------
| DESIGN
|--------------------------------------------------------------------------
*/

const DESIGN_WIDTH = 390;
const DESIGN_HEIGHT = 844;


/*
|--------------------------------------------------------------------------
| LOGO
|--------------------------------------------------------------------------
*/

const NSTP_LOGO =
  require(
    '../assets/images/nstphub_logo.png'
  );


/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function isValidEmail(
  value
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    .test(
      String(value)
    );
}


function normalizeAccountType(
  value
) {
  const type =
    String(
      value ?? ''
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
    type === 'university_administrator'
    ||
    type === 'university-administrator'
    ||
    type === 'university admin'
    ||
    type === 'administrator'
  ) {
    return 'university_administrator';
  }


  return '';
}


function getAccountLabel(
  value
) {
  if (
    value === 'instructor'
  ) {
    return 'Instructor';
  }


  if (
    value === 'coordinator'
  ) {
    return 'Coordinator';
  }


  if (
    value === 'university_administrator'
  ) {
    return 'University Administrator';
  }


  return '';
}


function getRequestError(
  error,
  fallback
) {
  const errors =
    error?.data?.errors;


  if (
    errors &&
    typeof errors === 'object'
  ) {
    const messages =
      Object.values(
        errors
      )
        .flat()
        .filter(Boolean);


    if (
      messages.length
    ) {
      return messages.join(' ');
    }
  }


  if (
    error?.data?.message
  ) {
    return String(
      error.data.message
    );
  }


  if (
    error?.message
  ) {
    return String(
      error.message
    );
  }


  return fallback;
}


/*
|--------------------------------------------------------------------------
| SCREEN
|--------------------------------------------------------------------------
*/

export default function AdminForgotPasswordScreen() {
  const {
    width,
    height,
  } =
    useWindowDimensions();


  const insets =
    useSafeAreaInsets();


  /*
  |--------------------------------------------------------------------------
  | RESPONSIVE
  |--------------------------------------------------------------------------
  */

  const canvasWidth =
    Math.min(
      width,
      430
    );


  const usableHeight =
    Math.max(
      height
      -
      insets.top
      -
      insets.bottom,
      600
    );


  const sx =
    canvasWidth
    /
    DESIGN_WIDTH;


  const sy =
    usableHeight
    /
    DESIGN_HEIGHT;


  const scale =
    Math.min(
      sx,
      sy
    );


  const styles =
    useMemo(
      () =>
        createStyles(
          canvasWidth,
          sx,
          sy,
          scale
        ),
      [
        canvasWidth,
        sx,
        sy,
        scale,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | STEP
  |--------------------------------------------------------------------------
  */

  const [
    step,
    setStep,
  ] =
    useState('email');


  /*
  |--------------------------------------------------------------------------
  | EMAIL
  |--------------------------------------------------------------------------
  */

  const [
    email,
    setEmail,
  ] =
    useState('');


  /*
  |--------------------------------------------------------------------------
  | ACCOUNT
  |--------------------------------------------------------------------------
  */

  const [
    accountType,
    setAccountType,
  ] =
    useState('');


  /*
  |--------------------------------------------------------------------------
  | TOKENS
  |--------------------------------------------------------------------------
  */

  const [
    challengeToken,
    setChallengeToken,
  ] =
    useState('');


  const [
    resetToken,
    setResetToken,
  ] =
    useState('');


  /*
  |--------------------------------------------------------------------------
  | OTP
  |--------------------------------------------------------------------------
  */

  const [
    digits,
    setDigits,
  ] =
    useState([
      '',
      '',
      '',
      '',
      '',
      '',
    ]);


  const otpRefs =
    useRef([]);


  /*
  |--------------------------------------------------------------------------
  | PASSWORD
  |--------------------------------------------------------------------------
  */

  const [
    newPassword,
    setNewPassword,
  ] =
    useState('');


  const [
    confirmPassword,
    setConfirmPassword,
  ] =
    useState('');


  const [
    showNewPassword,
    setShowNewPassword,
  ] =
    useState(false);


  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] =
    useState(false);


  /*
  |--------------------------------------------------------------------------
  | REQUEST STATE
  |--------------------------------------------------------------------------
  */

  const [
    loading,
    setLoading,
  ] =
    useState(false);


  const [
    resendLoading,
    setResendLoading,
  ] =
    useState(false);


  /*
  |--------------------------------------------------------------------------
  | MESSAGES
  |--------------------------------------------------------------------------
  */

  const [
    error,
    setError,
  ] =
    useState('');


  const [
    success,
    setSuccess,
  ] =
    useState('');


  /*
  |--------------------------------------------------------------------------
  | COMPUTED
  |--------------------------------------------------------------------------
  */

  const verificationCode =
    digits.join('');


  const isCodeComplete =
    digits.every(
      digit =>
        String(digit).length === 1
    );


  const passwordLongEnough =
    newPassword.length >= 8;


  const passwordsMatch =
    Boolean(
      confirmPassword
      &&
      newPassword ===
        confirmPassword
    );


  const accountLabel =
    getAccountLabel(
      accountType
    );


  /*
  |--------------------------------------------------------------------------
  | CLEAR MESSAGE
  |--------------------------------------------------------------------------
  */

  const clearMessages =
    () => {
      setError('');
      setSuccess('');
    };


  /*
  |--------------------------------------------------------------------------
  | EMAIL
  |--------------------------------------------------------------------------
  */

  const changeEmail =
    value => {
      setEmail(value);
      clearMessages();
    };


  /*
  |--------------------------------------------------------------------------
  | PASSWORD
  |--------------------------------------------------------------------------
  */

  const changeNewPassword =
    value => {
      setNewPassword(value);
      clearMessages();
    };


  const changeConfirmPassword =
    value => {
      setConfirmPassword(value);
      clearMessages();
    };


  /*
  |--------------------------------------------------------------------------
  | SEND CODE
  |--------------------------------------------------------------------------
  */

  const handleSendCode =
    async () => {
      if (
        loading
      ) {
        return;
      }


      clearMessages();


      const normalizedEmail =
        email
          .trim()
          .toLowerCase();


      if (
        !normalizedEmail
      ) {
        setError(
          'Please enter your email address.'
        );

        return;
      }


      if (
        !isValidEmail(
          normalizedEmail
        )
      ) {
        setError(
          'Please enter a valid email address.'
        );

        return;
      }


      try {
        setLoading(true);


        const response =
          await sendAdminForgotPasswordCode(
            normalizedEmail
          );


        setChallengeToken(
          response?.challenge_token
          ||
          ''
        );


        setResetToken('');


        setEmail(
          normalizedEmail
        );


        const returnedType =
          normalizeAccountType(
            response?.account_type
          );


        if (
          returnedType
        ) {
          setAccountType(
            returnedType
          );
        }


        setDigits([
          '',
          '',
          '',
          '',
          '',
          '',
        ]);


        setStep(
          'verify'
        );


        setSuccess(
          response?.message
          ||
          'Verification code sent.'
        );


        setTimeout(
          () => {
            otpRefs
              .current[0]
              ?.focus();
          },
          300
        );

      } catch (
        requestError
      ) {
        setError(
          getRequestError(
            requestError,
            'Unable to send the verification code.'
          )
        );

      } finally {
        setLoading(false);
      }
    };


  /*
  |--------------------------------------------------------------------------
  | OTP CHANGE
  |--------------------------------------------------------------------------
  */

  const handleOtpChange =
    (
      index,
      inputValue
    ) => {
      if (
        loading
        ||
        resendLoading
      ) {
        return;
      }


      clearMessages();


      const numeric =
        String(
          inputValue ?? ''
        )
          .replace(
            /\D/g,
            ''
          )
          .slice(
            0,
            6
          );


      /*
      |--------------------------------------------------------------------------
      | PASTE / AUTO FILL
      |--------------------------------------------------------------------------
      */

      if (
        numeric.length > 1
      ) {
        const nextDigits =
          [
            ...digits,
          ];


        numeric
          .split('')
          .forEach(
            (
              digit,
              offset
            ) => {
              const position =
                index +
                offset;


              if (
                position < 6
              ) {
                nextDigits[
                  position
                ] =
                  digit;
              }
            }
          );


        setDigits(
          nextDigits
        );


        const focusIndex =
          Math.min(
            index +
            numeric.length,
            5
          );


        setTimeout(
          () => {
            otpRefs
              .current[
                focusIndex
              ]
              ?.focus();
          },
          20
        );


        return;
      }


      const nextDigits =
        [
          ...digits,
        ];


      nextDigits[
        index
      ] =
        numeric;


      setDigits(
        nextDigits
      );


      if (
        numeric
        &&
        index < 5
      ) {
        otpRefs
          .current[
            index + 1
          ]
          ?.focus();
      }
    };


  /*
  |--------------------------------------------------------------------------
  | OTP BACKSPACE
  |--------------------------------------------------------------------------
  */

  const handleOtpKeyPress =
    (
      index,
      event
    ) => {
      if (
        event
          ?.nativeEvent
          ?.key !==
        'Backspace'
      ) {
        return;
      }


      if (
        digits[index]
      ) {
        const nextDigits =
          [
            ...digits,
          ];


        nextDigits[
          index
        ] =
          '';


        setDigits(
          nextDigits
        );


        return;
      }


      if (
        index > 0
      ) {
        const nextDigits =
          [
            ...digits,
          ];


        nextDigits[
          index - 1
        ] =
          '';


        setDigits(
          nextDigits
        );


        otpRefs
          .current[
            index - 1
          ]
          ?.focus();
      }
    };


  /*
  |--------------------------------------------------------------------------
  | VERIFY CODE
  |--------------------------------------------------------------------------
  */

  const handleVerifyCode =
    async () => {
      if (
        loading
      ) {
        return;
      }


      clearMessages();


      if (
        !isCodeComplete
      ) {
        setError(
          'Enter the complete 6-digit code.'
        );

        return;
      }


      try {
        setLoading(true);


        const response =
          await verifyAdminForgotPasswordCode({
            email,
            code:
              verificationCode,
            challengeToken,
          });


        setResetToken(
          response?.reset_token
          ||
          ''
        );


        const returnedType =
          normalizeAccountType(
            response?.account_type
            ||
            accountType
          );


        if (
          returnedType
        ) {
          setAccountType(
            returnedType
          );
        }


        setStep(
          'reset'
        );


        setSuccess('');

      } catch (
        requestError
      ) {
        setError(
          getRequestError(
            requestError,
            'Invalid or expired verification code.'
          )
        );

      } finally {
        setLoading(false);
      }
    };


  /*
  |--------------------------------------------------------------------------
  | RESEND
  |--------------------------------------------------------------------------
  */

  const handleResend =
    async () => {
      if (
        resendLoading
        ||
        loading
      ) {
        return;
      }


      clearMessages();


      try {
        setResendLoading(true);


        const response =
          await resendAdminForgotPasswordCode({
            email,
            challengeToken,
          });


        setChallengeToken(
          response?.challenge_token
          ||
          challengeToken
        );


        setDigits([
          '',
          '',
          '',
          '',
          '',
          '',
        ]);


        setSuccess(
          response?.message
          ||
          'A new code has been sent.'
        );


        setTimeout(
          () => {
            otpRefs
              .current[0]
              ?.focus();
          },
          100
        );

      } catch (
        requestError
      ) {
        setError(
          getRequestError(
            requestError,
            'Unable to resend the verification code.'
          )
        );

      } finally {
        setResendLoading(false);
      }
    };


  /*
  |--------------------------------------------------------------------------
  | RESET PASSWORD
  |--------------------------------------------------------------------------
  */

  const handleResetPassword =
    async () => {
      if (
        loading
      ) {
        return;
      }


      clearMessages();


      if (
        !newPassword
      ) {
        setError(
          'Enter your new password.'
        );

        return;
      }


      if (
        newPassword.length < 8
      ) {
        setError(
          'Password must contain at least 8 characters.'
        );

        return;
      }


      if (
        !confirmPassword
      ) {
        setError(
          'Confirm your new password.'
        );

        return;
      }


      if (
        newPassword !==
        confirmPassword
      ) {
        setError(
          'Passwords do not match.'
        );

        return;
      }


      try {
        setLoading(true);


        const response =
          await resetAdminForgotPassword({
            email,
            resetToken,

            password:
              newPassword,

            passwordConfirmation:
              confirmPassword,
          });


        const returnedType =
          normalizeAccountType(
            response?.account_type
            ||
            accountType
          );


        if (
          returnedType
        ) {
          setAccountType(
            returnedType
          );
        }


        setNewPassword('');
        setConfirmPassword('');


        setSuccess('');


        setStep(
          'success'
        );

      } catch (
        requestError
      ) {
        setError(
          getRequestError(
            requestError,
            'Unable to reset your password.'
          )
        );

      } finally {
        setLoading(false);
      }
    };


  /*
  |--------------------------------------------------------------------------
  | GO BACK
  |--------------------------------------------------------------------------
  */

  const handlePrevious =
    () => {
      if (
        loading
        ||
        resendLoading
      ) {
        return;
      }


      clearMessages();


      if (
        step === 'verify'
      ) {
        setDigits([
          '',
          '',
          '',
          '',
          '',
          '',
        ]);

        setChallengeToken('');
        setResetToken('');

        setStep(
          'email'
        );

        return;
      }


      if (
        step === 'reset'
      ) {
        setResetToken('');

        setStep(
          'verify'
        );

        return;
      }


      router.replace(
        '/LoginScreen'
      );
    };


  /*
  |--------------------------------------------------------------------------
  | LOGIN
  |--------------------------------------------------------------------------
  */

  const goToLogin =
    () => {
      router.replace(
        '/LoginScreen'
      );
    };


  /*
  |--------------------------------------------------------------------------
  | SCREEN CONTENT
  |--------------------------------------------------------------------------
  */

  const screenTitle =
    step === 'email'
      ? 'Forgot Password'
      : step === 'verify'
        ? 'Verify Your Email'
        : step === 'reset'
          ? 'Create New Password'
          : 'Password Updated';


  const screenDescription =
    step === 'email'
      ? 'Enter your account email to receive a verification code.'
      : step === 'verify'
        ? 'Enter the 6-digit code sent to your email.'
        : step === 'reset'
          ? 'Create a new password for your NSTP HUB account.'
          : 'Your password has been reset successfully.';


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
          COLORS.cream
        }
      />


      <KeyboardAvoidingView
        style={
          styles.keyboardView
        }
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,

            {
              paddingBottom:
                28 +
                insets.bottom,
            },
          ]}
        >
          <View
            style={
              styles.screen
            }
          >

            {/*
            |--------------------------------------------------------------------------
            | LEFT MAROON ACCENT
            |--------------------------------------------------------------------------
            */}

            <View
              style={
                styles.sideAccent
              }
            />


            {/*
            |--------------------------------------------------------------------------
            | CONTENT
            |--------------------------------------------------------------------------
            */}

            <View
              style={
                styles.content
              }
            >

              {/*
              |--------------------------------------------------------------------------
              | BRAND
              |--------------------------------------------------------------------------
              */}

              <View
                style={
                  styles.brand
                }
              >
                <Image
                  source={
                    NSTP_LOGO
                  }
                  resizeMode="contain"
                  style={
                    styles.logo
                  }
                />


                <Text
                  style={
                    styles.brandName
                  }
                >
                  NSTP HUB
                </Text>


                <Text
                  style={
                    styles.brandCaption
                  }
                >
                  ADMINISTRATION
                </Text>
              </View>


              {/*
              |--------------------------------------------------------------------------
              | INTRO
              |--------------------------------------------------------------------------
              */}

              <View
                style={
                  styles.intro
                }
              >
                <Text
                  style={
                    styles.title
                  }
                >
                  {
                    screenTitle
                  }
                </Text>


                <Text
                  style={
                    styles.description
                  }
                >
                  {
                    screenDescription
                  }
                </Text>
              </View>


              {/*
              |--------------------------------------------------------------------------
              | EMAIL STEP
              |--------------------------------------------------------------------------
              */}

              {
                step === 'email'
                  ? (
                    <View
                      style={
                        styles.form
                      }
                    >
                      <Text
                        style={
                          styles.label
                        }
                      >
                        Email address
                      </Text>


                      <View
                        style={[
                          styles.inputContainer,

                          email.length > 0
                          &&
                          styles.inputContainerActive,

                          error
                          &&
                          styles.inputContainerError,
                        ]}
                      >
                        <TextInput
                          value={
                            email
                          }

                          onChangeText={
                            changeEmail
                          }

                          placeholder="Enter your email address"

                          placeholderTextColor={
                            COLORS.placeholder
                          }

                          keyboardType="email-address"

                          autoCapitalize="none"

                          autoCorrect={
                            false
                          }

                          autoComplete="email"

                          textContentType="emailAddress"

                          editable={
                            !loading
                          }

                          selectionColor={
                            COLORS.maroon
                          }

                          cursorColor={
                            COLORS.maroon
                          }

                          returnKeyType="send"

                          onSubmitEditing={
                            handleSendCode
                          }

                          style={
                            styles.input
                          }
                        />
                      </View>


                      <InlineMessage
                        error={
                          error
                        }
                        success={
                          success
                        }
                        styles={
                          styles
                        }
                      />


                      <MainButton
                        title="Send Verification Code"

                        loading={
                          loading
                        }

                        disabled={
                          loading
                        }

                        onPress={
                          handleSendCode
                        }

                        icon="arrow-forward"
                        styles={
                          styles
                        }
                      />


                      <TouchableOpacity
                        activeOpacity={0.7}
                        disabled={
                          loading
                        }
                        onPress={
                          goToLogin
                        }
                        style={
                          styles.simpleLinkButton
                        }
                      >
                        <Ionicons
                          name="arrow-back"
                          size={
                            16 *
                            scale
                          }
                          color={
                            COLORS.maroon
                          }
                        />


                        <Text
                          style={
                            styles.simpleLinkText
                          }
                        >
                          Back to sign in
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )
                  :
                  null
              }


              {/*
              |--------------------------------------------------------------------------
              | VERIFY STEP
              |--------------------------------------------------------------------------
              */}

              {
                step === 'verify'
                  ? (
                    <View
                      style={
                        styles.form
                      }
                    >
                      <Text
                        style={
                          styles.sentToLabel
                        }
                      >
                        Code sent to
                      </Text>


                      <Text
                        numberOfLines={1}
                        style={
                          styles.sentToEmail
                        }
                      >
                        {
                          email
                        }
                      </Text>


                      {
                        accountLabel
                          ? (
                            <Text
                              style={
                                styles.accountType
                              }
                            >
                              {
                                accountLabel
                              }
                            </Text>
                          )
                          :
                          null
                      }


                      <Text
                        style={
                          styles.otpLabel
                        }
                      >
                        Verification code
                      </Text>


                      <View
                        style={
                          styles.otpRow
                        }
                      >
                        {
                          digits.map(
                            (
                              digit,
                              index
                            ) => (
                              <TextInput
                                key={
                                  index
                                }

                                ref={
                                  element => {
                                    otpRefs
                                      .current[
                                        index
                                      ] =
                                        element;
                                  }
                                }

                                value={
                                  digit
                                }

                                editable={
                                  !loading
                                  &&
                                  !resendLoading
                                }

                                onChangeText={
                                  value =>
                                    handleOtpChange(
                                      index,
                                      value
                                    )
                                }

                                onKeyPress={
                                  event =>
                                    handleOtpKeyPress(
                                      index,
                                      event
                                    )
                                }

                                keyboardType="number-pad"

                                maxLength={
                                  6
                                }

                                selectTextOnFocus

                                selectionColor={
                                  COLORS.maroon
                                }

                                textContentType={
                                  index === 0
                                    ? 'oneTimeCode'
                                    : 'none'
                                }

                                style={[
                                  styles.otpInput,

                                  digit
                                  &&
                                  styles.otpInputFilled,
                                ]}
                              />
                            )
                          )
                        }
                      </View>


                      <InlineMessage
                        error={
                          error
                        }
                        success={
                          success
                        }
                        styles={
                          styles
                        }
                      />


                      <View
                        style={
                          styles.resendRow
                        }
                      >
                        <Text
                          style={
                            styles.resendText
                          }
                        >
                          Didn't receive a code?
                        </Text>


                        <TouchableOpacity
                          activeOpacity={0.7}
                          disabled={
                            loading
                            ||
                            resendLoading
                          }
                          onPress={
                            handleResend
                          }
                        >
                          <Text
                            style={[
                              styles.resendLink,

                              (
                                loading
                                ||
                                resendLoading
                              )
                              &&
                              styles.disabledText,
                            ]}
                          >
                            {
                              resendLoading
                                ? 'Sending...'
                                : 'Resend Code'
                            }
                          </Text>
                        </TouchableOpacity>
                      </View>


                      <MainButton
                        title="Verify Code"

                        loading={
                          loading
                        }

                        disabled={
                          loading
                          ||
                          !isCodeComplete
                        }

                        onPress={
                          handleVerifyCode
                        }

                        icon="arrow-forward"

                        styles={
                          styles
                        }
                      />


                      <TouchableOpacity
                        activeOpacity={0.7}
                        disabled={
                          loading
                          ||
                          resendLoading
                        }
                        onPress={
                          handlePrevious
                        }
                        style={
                          styles.simpleLinkButton
                        }
                      >
                        <Ionicons
                          name="arrow-back"
                          size={
                            16 *
                            scale
                          }
                          color={
                            COLORS.maroon
                          }
                        />


                        <Text
                          style={
                            styles.simpleLinkText
                          }
                        >
                          Change email
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )
                  :
                  null
              }


              {/*
              |--------------------------------------------------------------------------
              | RESET PASSWORD STEP
              |--------------------------------------------------------------------------
              */}

              {
                step === 'reset'
                  ? (
                    <View
                      style={
                        styles.form
                      }
                    >
                      {
                        accountLabel
                          ? (
                            <Text
                              style={
                                styles.accountType
                              }
                            >
                              {
                                accountLabel
                              }
                            </Text>
                          )
                          :
                          null
                      }


                      <PasswordField
                        label="New password"

                        value={
                          newPassword
                        }

                        onChangeText={
                          changeNewPassword
                        }

                        visible={
                          showNewPassword
                        }

                        onToggle={() =>
                          setShowNewPassword(
                            previous =>
                              !previous
                          )
                        }

                        placeholder="Enter new password"

                        disabled={
                          loading
                        }

                        active={
                          newPassword.length > 0
                        }

                        hasError={
                          Boolean(error)
                        }

                        styles={
                          styles
                        }

                        scale={
                          scale
                        }
                      />


                      <PasswordField
                        label="Confirm password"

                        value={
                          confirmPassword
                        }

                        onChangeText={
                          changeConfirmPassword
                        }

                        visible={
                          showConfirmPassword
                        }

                        onToggle={() =>
                          setShowConfirmPassword(
                            previous =>
                              !previous
                          )
                        }

                        placeholder="Confirm new password"

                        disabled={
                          loading
                        }

                        active={
                          confirmPassword.length > 0
                        }

                        hasError={
                          Boolean(error)
                        }

                        styles={
                          styles
                        }

                        scale={
                          scale
                        }
                      />


                      <View
                        style={
                          styles.passwordRules
                        }
                      >
                        <Rule
                          valid={
                            passwordLongEnough
                          }
                          text="At least 8 characters"
                          styles={
                            styles
                          }
                          scale={
                            scale
                          }
                        />


                        <Rule
                          valid={
                            passwordsMatch
                          }
                          text="Passwords match"
                          styles={
                            styles
                          }
                          scale={
                            scale
                          }
                        />
                      </View>


                      <InlineMessage
                        error={
                          error
                        }
                        success={
                          success
                        }
                        styles={
                          styles
                        }
                      />


                      <MainButton
                        title="Reset Password"

                        loading={
                          loading
                        }

                        disabled={
                          loading
                          ||
                          !passwordLongEnough
                          ||
                          !confirmPassword
                        }

                        onPress={
                          handleResetPassword
                        }

                        icon="arrow-forward"

                        styles={
                          styles
                        }
                      />


                      <TouchableOpacity
                        activeOpacity={0.7}
                        disabled={
                          loading
                        }
                        onPress={
                          handlePrevious
                        }
                        style={
                          styles.simpleLinkButton
                        }
                      >
                        <Ionicons
                          name="arrow-back"
                          size={
                            16 *
                            scale
                          }
                          color={
                            COLORS.maroon
                          }
                        />


                        <Text
                          style={
                            styles.simpleLinkText
                          }
                        >
                          Back
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )
                  :
                  null
              }


              {/*
              |--------------------------------------------------------------------------
              | SUCCESS STEP
              |--------------------------------------------------------------------------
              */}

              {
                step === 'success'
                  ? (
                    <View
                      style={[
                        styles.form,
                        styles.successForm,
                      ]}
                    >
                      <View
                        style={
                          styles.successIcon
                        }
                      >
                        <Ionicons
                          name="checkmark"
                          size={
                            31 *
                            scale
                          }
                          color={
                            COLORS.white
                          }
                        />
                      </View>


                      {
                        accountLabel
                          ? (
                            <Text
                              style={
                                styles.successAccount
                              }
                            >
                              {
                                accountLabel
                              }
                            </Text>
                          )
                          :
                          null
                      }


                      <MainButton
                        title="Back to Sign In"

                        loading={
                          false
                        }

                        disabled={
                          false
                        }

                        onPress={
                          goToLogin
                        }

                        icon="arrow-forward"

                        styles={
                          styles
                        }
                      />
                    </View>
                  )
                  :
                  null
              }

            </View>

          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


/*
|--------------------------------------------------------------------------
| BUTTON
|--------------------------------------------------------------------------
*/

function MainButton({
  title,
  loading,
  disabled,
  onPress,
  icon,
  styles,
}) {
  return (
    <TouchableOpacity
      style={[
        styles.continueButton,

        disabled
        &&
        styles.disabledButton,
      ]}
      activeOpacity={0.86}
      disabled={
        disabled
      }
      onPress={
        onPress
      }
    >
      {
        loading
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
            <View
              style={
                styles.buttonContent
              }
            >
              <Text
                style={
                  styles.buttonText
                }
              >
                {
                  title
                }
              </Text>


              <Ionicons
                name={
                  icon
                }
                size={19}
                color={
                  COLORS.white
                }
              />
            </View>
          )
      }
    </TouchableOpacity>
  );
}


/*
|--------------------------------------------------------------------------
| INLINE MESSAGE
|--------------------------------------------------------------------------
*/

function InlineMessage({
  error,
  success,
  styles,
}) {
  if (
    !error
    &&
    !success
  ) {
    return null;
  }


  const isError =
    Boolean(error);


  return (
    <View
      style={[
        styles.message,

        isError
          ? styles.messageError
          : styles.messageSuccess,
      ]}
    >
      <Ionicons
        name={
          isError
            ? 'alert-circle-outline'
            : 'checkmark-circle-outline'
        }
        size={17}
        color={
          isError
            ? COLORS.maroon
            : COLORS.green
        }
      />


      <Text
        style={[
          styles.messageText,

          {
            color:
              isError
                ? COLORS.maroon
                : COLORS.green,
          },
        ]}
      >
        {
          error ||
          success
        }
      </Text>
    </View>
  );
}


/*
|--------------------------------------------------------------------------
| PASSWORD FIELD
|--------------------------------------------------------------------------
*/

function PasswordField({
  label,
  value,
  onChangeText,
  visible,
  onToggle,
  placeholder,
  disabled,
  active,
  hasError,
  styles,
  scale,
}) {
  return (
    <View
      style={
        styles.passwordGroup
      }
    >
      <Text
        style={
          styles.label
        }
      >
        {
          label
        }
      </Text>


      <View
        style={[
          styles.inputContainer,

          active
          &&
          styles.inputContainerActive,

          hasError
          &&
          styles.inputContainerError,
        ]}
      >
        <TextInput
          value={
            value
          }

          onChangeText={
            onChangeText
          }

          editable={
            !disabled
          }

          secureTextEntry={
            !visible
          }

          placeholder={
            placeholder
          }

          placeholderTextColor={
            COLORS.placeholder
          }

          autoCapitalize="none"

          autoCorrect={
            false
          }

          textContentType="newPassword"

          selectionColor={
            COLORS.maroon
          }

          cursorColor={
            COLORS.maroon
          }

          style={
            styles.input
          }
        />


        <TouchableOpacity
          activeOpacity={0.65}
          disabled={
            disabled
          }
          onPress={
            onToggle
          }
          style={
            styles.eyeButton
          }
        >
          <Ionicons
            name={
              visible
                ? 'eye-off-outline'
                : 'eye-outline'
            }
            size={
              21 *
              scale
            }
            color={
              COLORS.maroon
            }
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}


/*
|--------------------------------------------------------------------------
| PASSWORD RULE
|--------------------------------------------------------------------------
*/

function Rule({
  valid,
  text,
  styles,
  scale,
}) {
  return (
    <View
      style={
        styles.ruleRow
      }
    >
      <Ionicons
        name={
          valid
            ? 'checkmark-circle'
            : 'ellipse-outline'
        }
        size={
          15 *
          scale
        }
        color={
          valid
            ? COLORS.green
            : COLORS.muted
        }
      />


      <Text
        style={[
          styles.ruleText,

          valid
          &&
          styles.ruleTextValid,
        ]}
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
| STYLES
|--------------------------------------------------------------------------
*/

function createStyles(
  canvasWidth,
  sx,
  sy,
  scale
) {
  return StyleSheet.create({

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


    keyboardView: {
      flex: 1,
    },


    scrollContent: {
      flexGrow: 1,
    },


    screen: {
      flexGrow: 1,

      width:
        canvasWidth,

      minHeight:
        760 *
        sy,

      alignSelf:
        'center',

      position:
        'relative',

      backgroundColor:
        COLORS.cream,
    },


    /*
    |--------------------------------------------------------------------------
    | SIDE ACCENT
    |--------------------------------------------------------------------------
    */

    sideAccent: {
      position:
        'absolute',

      top: 0,

      bottom: 0,

      left: 0,

      width:
        9 *
        sx,

      backgroundColor:
        COLORS.maroon,
    },


    /*
    |--------------------------------------------------------------------------
    | CONTENT
    |--------------------------------------------------------------------------
    */

    content: {
      flex: 1,

      paddingLeft:
        34 *
        sx,

      paddingRight:
        28 *
        sx,

      paddingTop:
        24 *
        sy,

      paddingBottom:
        30 *
        sy,
    },


    /*
    |--------------------------------------------------------------------------
    | BRAND
    |--------------------------------------------------------------------------
    */

    brand: {
      width:
        '100%',

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    logo: {
      width:
        126 *
        sx,

      height:
        145 *
        sy,
    },


    brandName: {
      marginTop:
        10 *
        sy,

      color:
        COLORS.maroon,

      fontSize:
        25 *
        scale,

      lineHeight:
        29 *
        scale,

      fontWeight:
        '800',

      letterSpacing:
        2,

      textAlign:
        'center',

      includeFontPadding:
        false,
    },


    brandCaption: {
      marginTop:
        5 *
        sy,

      color:
        COLORS.muted,

      fontSize:
        11 *
        scale,

      lineHeight:
        14 *
        scale,

      fontWeight:
        '700',

      letterSpacing:
        1.7,

      textAlign:
        'center',

      includeFontPadding:
        false,
    },


    /*
    |--------------------------------------------------------------------------
    | INTRO
    |--------------------------------------------------------------------------
    */

    intro: {
      width:
        '100%',

      marginTop:
        45 *
        sy,

      alignItems:
        'center',
    },


    title: {
      width:
        '100%',

      color:
        COLORS.dark,

      fontSize:
        29 *
        scale,

      lineHeight:
        36 *
        scale,

      fontWeight:
        '700',

      letterSpacing:
        -0.5,

      textAlign:
        'center',

      includeFontPadding:
        false,
    },


    description: {
      width:
        '92%',

      marginTop:
        10 *
        sy,

      alignSelf:
        'center',

      color:
        COLORS.muted,

      fontSize:
        12.5 *
        scale,

      lineHeight:
        19 *
        scale,

      fontWeight:
        '400',

      textAlign:
        'center',

      includeFontPadding:
        false,
    },


    /*
    |--------------------------------------------------------------------------
    | FORM
    |--------------------------------------------------------------------------
    */

    form: {
      width:
        '100%',

      marginTop:
        36 *
        sy,
    },


    label: {
      marginBottom:
        9 *
        sy,

      color:
        COLORS.dark,

      fontSize:
        11.5 *
        scale,

      lineHeight:
        15 *
        scale,

      fontWeight:
        '700',

      includeFontPadding:
        false,
    },


    passwordGroup: {
      width:
        '100%',

      marginBottom:
        17 *
        sy,
    },


    /*
    |--------------------------------------------------------------------------
    | INPUT
    |--------------------------------------------------------------------------
    */

    inputContainer: {
      width:
        '100%',

      height:
        59 *
        sy,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingLeft:
        18 *
        sx,

      paddingRight:
        6 *
        sx,

      backgroundColor:
        COLORS.white,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius:
        8 *
        scale,
    },


    inputContainerActive: {
      borderWidth:
        1.5,

      borderColor:
        COLORS.maroon,
    },


    inputContainerError: {
      borderColor:
        COLORS.maroon,
    },


    input: {
      flex: 1,

      minWidth: 0,

      height:
        '100%',

      paddingVertical: 0,

      color:
        COLORS.dark,

      fontSize:
        14 *
        scale,

      fontWeight:
        '600',

      includeFontPadding:
        false,
    },


    eyeButton: {
      width:
        45 *
        scale,

      height:
        45 *
        scale,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    /*
    |--------------------------------------------------------------------------
    | MESSAGE
    |--------------------------------------------------------------------------
    */

    message: {
      width:
        '100%',

      minHeight:
        44 *
        sy,

      marginTop:
        12 *
        sy,

      paddingHorizontal:
        12 *
        sx,

      paddingVertical:
        9 *
        sy,

      borderRadius:
        8 *
        scale,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderWidth: 1,
    },


    messageError: {
      backgroundColor:
        COLORS.errorBackground,

      borderColor:
        'rgba(84,16,15,0.20)',
    },


    messageSuccess: {
      backgroundColor:
        COLORS.successBackground,

      borderColor:
        'rgba(88,118,28,0.22)',
    },


    messageText: {
      flex: 1,

      marginLeft:
        8 *
        sx,

      fontSize:
        10 *
        scale,

      lineHeight:
        15 *
        scale,

      fontWeight:
        '600',
    },


    /*
    |--------------------------------------------------------------------------
    | MAIN BUTTON
    |--------------------------------------------------------------------------
    */

    continueButton: {
      width:
        '100%',

      height:
        57 *
        sy,

      marginTop:
        16 *
        sy,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.maroon,

      borderRadius:
        8 *
        scale,
    },


    buttonContent: {
      width:
        '100%',

      paddingHorizontal:
        19 *
        sx,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },


    buttonText: {
      color:
        COLORS.white,

      fontSize:
        13.5 *
        scale,

      lineHeight:
        18 *
        scale,

      fontWeight:
        '700',

      letterSpacing:
        0.2,

      includeFontPadding:
        false,
    },


    disabledButton: {
      opacity:
        0.5,
    },


    /*
    |--------------------------------------------------------------------------
    | SIMPLE LINK
    |--------------------------------------------------------------------------
    */

    simpleLinkButton: {
      minHeight:
        42 *
        sy,

      marginTop:
        12 *
        sy,

      alignSelf:
        'center',

      paddingHorizontal:
        10 *
        sx,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    simpleLinkText: {
      marginLeft:
        5 *
        sx,

      color:
        COLORS.maroon,

      fontSize:
        10.5 *
        scale,

      fontWeight:
        '700',
    },


    /*
    |--------------------------------------------------------------------------
    | EMAIL / ACCOUNT META
    |--------------------------------------------------------------------------
    */

    sentToLabel: {
      color:
        COLORS.muted,

      fontSize:
        10 *
        scale,

      fontWeight:
        '600',

      textAlign:
        'center',
    },


    sentToEmail: {
      marginTop:
        4 *
        sy,

      color:
        COLORS.dark,

      fontSize:
        13 *
        scale,

      fontWeight:
        '700',

      textAlign:
        'center',
    },


    accountType: {
      alignSelf:
        'center',

      marginTop:
        8 *
        sy,

      color:
        COLORS.maroon,

      fontSize:
        9.5 *
        scale,

      fontWeight:
        '700',

      textAlign:
        'center',
    },


    /*
    |--------------------------------------------------------------------------
    | OTP
    |--------------------------------------------------------------------------
    */

    otpLabel: {
      marginTop:
        28 *
        sy,

      marginBottom:
        10 *
        sy,

      color:
        COLORS.dark,

      fontSize:
        11.5 *
        scale,

      fontWeight:
        '700',

      includeFontPadding:
        false,
    },


    otpRow: {
      width:
        '100%',

      flexDirection:
        'row',

      justifyContent:
        'space-between',

      gap:
        6 *
        sx,
    },


    otpInput: {
      flex: 1,

      minWidth: 0,

      height:
        55 *
        sy,

      padding: 0,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius:
        8 *
        scale,

      backgroundColor:
        COLORS.white,

      color:
        COLORS.dark,

      fontSize:
        18 *
        scale,

      fontWeight:
        '700',

      textAlign:
        'center',

      includeFontPadding:
        false,
    },


    otpInputFilled: {
      borderWidth:
        1.5,

      borderColor:
        COLORS.maroon,
    },


    /*
    |--------------------------------------------------------------------------
    | RESEND
    |--------------------------------------------------------------------------
    */

    resendRow: {
      marginTop:
        15 *
        sy,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      flexWrap:
        'wrap',

      gap:
        5 *
        sx,
    },


    resendText: {
      color:
        COLORS.muted,

      fontSize:
        10 *
        scale,
    },


    resendLink: {
      color:
        COLORS.maroon,

      fontSize:
        10 *
        scale,

      fontWeight:
        '800',
    },


    disabledText: {
      opacity:
        0.4,
    },


    /*
    |--------------------------------------------------------------------------
    | PASSWORD RULES
    |--------------------------------------------------------------------------
    */

    passwordRules: {
      marginTop:
        -2 *
        sy,

      gap:
        7 *
        sy,
    },


    ruleRow: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },


    ruleText: {
      marginLeft:
        7 *
        sx,

      color:
        COLORS.muted,

      fontSize:
        10 *
        scale,

      fontWeight:
        '500',
    },


    ruleTextValid: {
      color:
        COLORS.green,

      fontWeight:
        '700',
    },


    /*
    |--------------------------------------------------------------------------
    | SUCCESS
    |--------------------------------------------------------------------------
    */

    successForm: {
      alignItems:
        'center',
    },


    successIcon: {
      width:
        66 *
        scale,

      height:
        66 *
        scale,

      marginBottom:
        10 *
        sy,

      borderRadius:
        33 *
        scale,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.green,
    },


    successAccount: {
      marginTop:
        5 *
        sy,

      marginBottom:
        6 *
        sy,

      color:
        COLORS.muted,

      fontSize:
        10 *
        scale,

      fontWeight:
        '600',

      textAlign:
        'center',
    },

  });
}