import {
  router,
  Stack,
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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import Ionicons from '@expo/vector-icons/Ionicons';

import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import {
  loginAdministrator,
  loginAdministratorWithGoogle,
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

const NSTP_LOGO = require(
  '../assets/images/nstphub_logo.png'
);

const GOOGLE_LOGO = require(
  '../assets/images/google-logo.png'
);


/*
|--------------------------------------------------------------------------
| GOOGLE WEB CLIENT ID
|--------------------------------------------------------------------------
*/

const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;


/*
|--------------------------------------------------------------------------
| LOGIN SCREEN
|--------------------------------------------------------------------------
*/

export default function LoginScreen() {
  const {
    width,
    height,
  } = useWindowDimensions();

  const insets =
    useSafeAreaInsets();

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [isLoggingIn, setIsLoggingIn] =
    useState(false);

  const [isGoogleSigningIn, setIsGoogleSigningIn] =
    useState(false);


  /*
  |--------------------------------------------------------------------------
  | RESPONSIVE
  |--------------------------------------------------------------------------
  */

  const canvasWidth = Math.min(
    width,
    430
  );

  const usableHeight = Math.max(
    height - insets.top - insets.bottom,
    600
  );

  const sx =
    canvasWidth / DESIGN_WIDTH;

  const sy =
    usableHeight / DESIGN_HEIGHT;

  const scale = Math.min(
    sx,
    sy
  );

  const styles = useMemo(
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
  | GOOGLE CONFIGURATION
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      if (!GOOGLE_WEB_CLIENT_ID) {
        console.warn(
          'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is missing from .env.'
        );

        return;
      }

      GoogleSignin.configure({
        webClientId:
          GOOGLE_WEB_CLIENT_ID,
        offlineAccess:
          false,
      });
    },
    []
  );


  const interactionDisabled =
    isLoggingIn || isGoogleSigningIn;


  /*
  |--------------------------------------------------------------------------
  | PASSWORD LOGIN
  |--------------------------------------------------------------------------
  */

  const handleLogin =
    async () => {
      if (interactionDisabled) {
        return;
      }

      const cleanEmail =
        email
          .trim()
          .toLowerCase();

      if (!cleanEmail) {
        Alert.alert(
          'Email required',
          'Please enter your NSTP HUB staff email.'
        );

        return;
      }

      const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(cleanEmail)) {
        Alert.alert(
          'Invalid email',
          'Please enter a valid email address.'
        );

        return;
      }

      if (!password) {
        Alert.alert(
          'Password required',
          'Please enter your password.'
        );

        return;
      }

      if (password.length < 8) {
        Alert.alert(
          'Invalid password',
          'Your password must contain at least 8 characters.'
        );

        return;
      }

      try {
        setIsLoggingIn(true);

        await loginAdministrator({
          email:
            cleanEmail,
          password,
        });

        router.replace('/(tabs)');
      } catch (error) {
        Alert.alert(
          'Login failed',
          error instanceof Error
            ? error.message
            : 'Unable to sign in.'
        );
      } finally {
        setIsLoggingIn(false);
      }
    };


  /*
  |--------------------------------------------------------------------------
  | FORGOT PASSWORD
  |--------------------------------------------------------------------------
  */

  const handleForgotPassword =
    () => {
      if (interactionDisabled) {
        return;
      }

      router.push(
        '/AdminForgotPasswordScreen'
      );
    };


  /*
  |--------------------------------------------------------------------------
  | GOOGLE LOGIN
  |--------------------------------------------------------------------------
  */

  const handleGoogleSignIn =
    async () => {
      if (interactionDisabled) {
        return;
      }

      if (!GOOGLE_WEB_CLIENT_ID) {
        Alert.alert(
          'Google configuration missing',
          'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is missing from the mobile .env file.'
        );

        return;
      }

      try {
        setIsGoogleSigningIn(true);

        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog:
            true,
        });

        try {
          await GoogleSignin.signOut();
        } catch {
          // No previous Google session is also valid.
        }

        const googleResponse =
          await GoogleSignin.signIn();

        if (
          !isSuccessResponse(
            googleResponse
          )
        ) {
          return;
        }

        const googleTokens =
          await GoogleSignin.getTokens();

        const googleAccessToken =
          googleTokens?.accessToken;

        if (!googleAccessToken) {
          throw new Error(
            'Google did not return an access token.'
          );
        }

        await loginAdministratorWithGoogle(
          googleAccessToken
        );

        router.replace('/(tabs)');
      } catch (error) {
        if (isErrorWithCode(error)) {
          if (
            error.code ===
            statusCodes.IN_PROGRESS
          ) {
            return;
          }

          if (
            error.code ===
            statusCodes.PLAY_SERVICES_NOT_AVAILABLE
          ) {
            Alert.alert(
              'Google Play Services',
              'Google Play Services is unavailable or needs to be updated on this device.'
            );

            return;
          }

        }

        console.error(
          'Admin mobile Google Sign-In error:',
          error
        );

        Alert.alert(
          'Google Sign-In failed',
          error instanceof Error
            ? error.message
            : 'Unable to sign in with Google.'
        );
      } finally {
        setIsGoogleSigningIn(false);
      }
    };


  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={[
        'top',
        'bottom',
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
        backgroundColor={COLORS.cream}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <View
          style={styles.screen}
        >
          <View
            style={styles.sideAccent}
          />

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={
              styles.scrollContent
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View
              style={styles.content}
            >
              <View
                style={styles.brand}
              >
                <Image
                  source={NSTP_LOGO}
                  resizeMode="contain"
                  style={styles.logo}
                />

                <Text
                  style={styles.brandName}
                >
                  NSTP HUB
                </Text>

                <Text
                  style={styles.brandCaption}
                >
                  ADMINISTRATION
                </Text>
              </View>

              <View
                style={styles.intro}
              >
                <Text
                  style={styles.title}
                >
                  Administration Portal
                </Text>

                <Text
                  style={styles.description}
                >
                  Sign in as a University Administrator, Attendance Coordinator, or Instructor.
                </Text>
              </View>

              <View
                style={styles.form}
              >
                <View
                  style={styles.fieldGroup}
                >
                  <Text
                    style={styles.label}
                  >
                    Email address
                  </Text>

                  <View
                    style={[
                      styles.inputContainer,
                      email.length > 0 &&
                        styles.inputContainerActive,
                    ]}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={19 * scale}
                      color={COLORS.maroon}
                      style={styles.leftIcon}
                    />

                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Enter your NSTP HUB email"
                      placeholderTextColor={
                        COLORS.placeholder
                      }
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      textContentType="emailAddress"
                      editable={!interactionDisabled}
                      selectionColor={COLORS.maroon}
                      cursorColor={COLORS.maroon}
                      returnKeyType="next"
                      style={styles.input}
                    />
                  </View>
                </View>

                <View
                  style={styles.fieldGroup}
                >
                  <Text
                    style={styles.label}
                  >
                    Password
                  </Text>

                  <View
                    style={[
                      styles.inputContainer,
                      password.length > 0 &&
                        styles.inputContainerActive,
                    ]}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={19 * scale}
                      color={COLORS.maroon}
                      style={styles.leftIcon}
                    />

                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Enter your password"
                      placeholderTextColor={
                        COLORS.placeholder
                      }
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="password"
                      textContentType="password"
                      editable={!interactionDisabled}
                      selectionColor={COLORS.maroon}
                      cursorColor={COLORS.maroon}
                      returnKeyType="done"
                      onSubmitEditing={handleLogin}
                      style={styles.input}
                    />

                    <TouchableOpacity
                      style={styles.eyeButton}
                      activeOpacity={0.65}
                      disabled={interactionDisabled}
                      onPress={() =>
                        setShowPassword(
                          previous =>
                            !previous
                        )
                      }
                    >
                      <Ionicons
                        name={
                          showPassword
                            ? 'eye-off-outline'
                            : 'eye-outline'
                        }
                        size={21 * scale}
                        color={COLORS.maroon}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.forgotButton}
                  activeOpacity={0.65}
                  disabled={interactionDisabled}
                  onPress={handleForgotPassword}
                >
                  <Text
                    style={styles.forgotText}
                  >
                    Forgot your password?
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.loginButton,
                    interactionDisabled &&
                      styles.disabledButton,
                  ]}
                  activeOpacity={0.86}
                  disabled={interactionDisabled}
                  onPress={handleLogin}
                >
                  {isLoggingIn ? (
                    <ActivityIndicator
                      size="small"
                      color={COLORS.white}
                    />
                  ) : (
                    <View
                      style={styles.buttonContent}
                    >
                      <Text
                        style={styles.buttonText}
                      >
                        Log in
                      </Text>

                      <Ionicons
                        name="arrow-forward"
                        size={19 * scale}
                        color={COLORS.white}
                      />
                    </View>
                  )}
                </TouchableOpacity>

                <View
                  style={styles.divider}
                >
                  <View
                    style={styles.dividerLine}
                  />

                  <Text
                    style={styles.dividerText}
                  >
                    Or sign in with
                  </Text>

                  <View
                    style={styles.dividerLine}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.googleButton,
                    interactionDisabled &&
                      styles.disabledButton,
                  ]}
                  activeOpacity={0.82}
                  disabled={interactionDisabled}
                  onPress={handleGoogleSignIn}
                >
                  <View
                    style={styles.googleContent}
                  >
                    {isGoogleSigningIn ? (
                      <ActivityIndicator
                        size="small"
                        color={COLORS.maroon}
                      />
                    ) : (
                      <Image
                        source={GOOGLE_LOGO}
                        resizeMode="contain"
                        style={styles.googleLogo}
                      />
                    )}

                    <Text
                      style={styles.googleText}
                    >
                      {isGoogleSigningIn
                        ? 'Signing in...'
                        : 'Continue with Google'}
                    </Text>
                  </View>

                  {!isGoogleSigningIn && (
                    <Ionicons
                      name="arrow-forward"
                      size={18 * scale}
                      color={COLORS.maroon}
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    safeArea: {
      flex: 1,
      backgroundColor: COLORS.cream,
    },

    keyboardView: {
      flex: 1,
    },

    screen: {
      flex: 1,
      width: canvasWidth,
      alignSelf: 'center',
      position: 'relative',
      backgroundColor: COLORS.cream,
    },

    sideAccent: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      width: 9 * sx,
      backgroundColor: COLORS.maroon,
      zIndex: 5,
    },

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      flexGrow: 1,
      paddingBottom: 32 * sy,
    },

    content: {
      flexGrow: 1,
      paddingLeft: 34 * sx,
      paddingRight: 28 * sx,
      paddingTop: 24 * sy,
      paddingBottom: 30 * sy,
    },

    brand: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },

    logo: {
      width: 150 * sx,
      height: 180 * sy,
    },

    brandName: {
      marginTop: 15 * sy,
      color: COLORS.maroon,
      fontSize: 26 * scale,
      lineHeight: 30 * scale,
      fontWeight: '800',
      letterSpacing: 2,
      textAlign: 'center',
      includeFontPadding: false,
    },

    brandCaption: {
      marginTop: 7 * sy,
      color: COLORS.muted,
      fontSize: 12 * scale,
      lineHeight: 15 * scale,
      fontWeight: '700',
      letterSpacing: 1.7,
      textAlign: 'center',
      includeFontPadding: false,
    },

    intro: {
      width: '100%',
      marginTop: 44 * sy,
      alignItems: 'center',
    },

    title: {
      width: '100%',
      color: COLORS.dark,
      fontSize: 30 * scale,
      lineHeight: 37 * scale,
      fontWeight: '700',
      letterSpacing: -0.5,
      textAlign: 'center',
      includeFontPadding: false,
    },

    description: {
      width: '94%',
      marginTop: 11 * sy,
      color: COLORS.muted,
      fontSize: 13 * scale,
      lineHeight: 20 * scale,
      fontWeight: '400',
      textAlign: 'center',
      alignSelf: 'center',
      includeFontPadding: false,
    },

    form: {
      width: '100%',
      marginTop: 38 * sy,
    },

    fieldGroup: {
      width: '100%',
      marginBottom: 18 * sy,
    },

    label: {
      marginBottom: 10 * sy,
      color: COLORS.dark,
      fontSize: 11.5 * scale,
      lineHeight: 15 * scale,
      fontWeight: '700',
      includeFontPadding: false,
    },

    inputContainer: {
      width: '100%',
      height: 59 * sy,
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 16 * sx,
      paddingRight: 6 * sx,
      backgroundColor: COLORS.white,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 8 * scale,
    },

    inputContainerActive: {
      borderWidth: 1.5,
      borderColor: COLORS.maroon,
    },

    leftIcon: {
      marginRight: 10 * sx,
    },

    input: {
      flex: 1,
      height: '100%',
      paddingVertical: 0,
      paddingRight: 4 * sx,
      color: COLORS.dark,
      fontSize: 14 * scale,
      fontWeight: '600',
      includeFontPadding: false,
    },

    eyeButton: {
      width: 45 * scale,
      height: 45 * scale,
      alignItems: 'center',
      justifyContent: 'center',
    },

    forgotButton: {
      alignSelf: 'flex-end',
      marginTop: -5 * sy,
      marginBottom: 8 * sy,
      paddingHorizontal: 2 * sx,
      paddingVertical: 5 * sy,
    },

    forgotText: {
      color: COLORS.maroon,
      fontSize: 11.5 * scale,
      lineHeight: 16 * scale,
      fontWeight: '700',
      includeFontPadding: false,
    },

    loginButton: {
      width: '100%',
      height: 57 * sy,
      marginTop: 6 * sy,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.maroon,
      borderRadius: 8 * scale,
    },

    buttonContent: {
      width: '100%',
      paddingHorizontal: 19 * sx,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    buttonText: {
      color: COLORS.white,
      fontSize: 13.5 * scale,
      lineHeight: 18 * scale,
      fontWeight: '700',
      letterSpacing: 0.2,
      includeFontPadding: false,
    },

    disabledButton: {
      opacity: 0.6,
    },

    divider: {
      width: '100%',
      marginTop: 25 * sy,
      marginBottom: 20 * sy,
      flexDirection: 'row',
      alignItems: 'center',
    },

    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: COLORS.border,
    },

    dividerText: {
      marginHorizontal: 13 * sx,
      color: COLORS.muted,
      fontSize: 10.5 * scale,
      lineHeight: 14 * scale,
      fontWeight: '500',
      textAlign: 'center',
      includeFontPadding: false,
    },

    googleButton: {
      width: '100%',
      height: 57 * sy,
      paddingHorizontal: 18 * sx,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: COLORS.white,
      borderWidth: 1,
      borderColor: COLORS.maroon,
      borderRadius: 8 * scale,
    },

    googleContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    googleLogo: {
      width: 20 * scale,
      height: 20 * scale,
    },

    googleText: {
      marginLeft: 11 * sx,
      color: COLORS.maroon,
      fontSize: 13 * scale,
      lineHeight: 18 * scale,
      fontWeight: '700',
      includeFontPadding: false,
    },
  });
}
