import {
  router,
  Stack,
} from 'expo-router';

import {
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
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
  verifyUniversityAccessCode,
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

const NSTP_LOGO =
  require(
    '../assets/images/nstphub_logo.png'
  );


/*
|--------------------------------------------------------------------------
| SCREEN
|--------------------------------------------------------------------------
*/

export default function AccessCodeScreen() {

  const {
    width,
    height,
  } = useWindowDimensions();


  const insets =
    useSafeAreaInsets();


  /*
  |--------------------------------------------------------------------------
  | STATE
  |--------------------------------------------------------------------------
  */

  const [
    accessCode,
    setAccessCode,
  ] = useState('');


  const [
    showAccessCode,
    setShowAccessCode,
  ] = useState(true);


  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);


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
  | VERIFY CODE
  |--------------------------------------------------------------------------
  */

  const handleContinue =
    async () => {

      if (isSubmitting) {
        return;
      }


      const cleanCode =
        accessCode
          .trim()
          .toUpperCase();


      if (!cleanCode) {

        Alert.alert(
          'Access code required',
          'Please enter your university access code.'
        );

        return;
      }


      if (
        cleanCode.length < 3
      ) {

        Alert.alert(
          'Invalid access code',
          'Please enter a valid university access code.'
        );

        return;
      }


      try {

        setIsSubmitting(true);


        const result =
          await verifyUniversityAccessCode(
            cleanCode
          );


        if (
          result?.success === true
        ) {

          router.replace(
            '/LoginScreen'
          );

          return;
        }


        throw new Error(
          'Unable to verify the university access code.'
        );

      } catch (error) {

        Alert.alert(
          'Access denied',

          error instanceof Error
            ? error.message
            : 'Unable to verify the university access code.'
        );

      } finally {

        setIsSubmitting(false);

      }

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
          styles.keyboardView
        }
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >

        <View
          style={
            styles.screen
          }
        >


          {/*
          |--------------------------------------------------------------------------
          | LEFT ACCENT
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
            | CENTERED BRAND
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
            | CENTERED INTRODUCTION
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
                Administration Portal
              </Text>


              <Text
                style={
                  styles.description
                }
              >
                Enter your university access code to continue.
              </Text>

            </View>


            {/*
            |--------------------------------------------------------------------------
            | FORM
            |--------------------------------------------------------------------------
            */}

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
                University access code
              </Text>


              <View
                style={[
                  styles.inputContainer,

                  accessCode.length > 0
                  &&
                  styles.inputContainerActive,
                ]}
              >

                <TextInput
                  value={
                    accessCode
                  }
                  onChangeText={
                    value =>
                      setAccessCode(
                        value.toUpperCase()
                      )
                  }
                  placeholder="Enter university access code"
                  placeholderTextColor={
                    COLORS.placeholder
                  }
                  secureTextEntry={
                    !showAccessCode
                  }
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={
                    !isSubmitting
                  }
                  selectionColor={
                    COLORS.maroon
                  }
                  cursorColor={
                    COLORS.maroon
                  }
                  maxLength={100}
                  returnKeyType="done"
                  onSubmitEditing={
                    handleContinue
                  }
                  style={
                    styles.input
                  }
                />


                <TouchableOpacity
                  style={
                    styles.eyeButton
                  }
                  activeOpacity={0.65}
                  disabled={
                    isSubmitting
                  }
                  onPress={
                    () =>
                      setShowAccessCode(
                        previous =>
                          !previous
                      )
                  }
                >

                  <Ionicons
                    name={
                      showAccessCode
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


              {/*
              |--------------------------------------------------------------------------
              | BUTTON
              |--------------------------------------------------------------------------
              */}

              <TouchableOpacity
                style={[
                  styles.continueButton,

                  isSubmitting
                  &&
                  styles.disabledButton,
                ]}
                activeOpacity={0.86}
                disabled={
                  isSubmitting
                }
                onPress={
                  handleContinue
                }
              >

                {
                  isSubmitting
                    ? (

                      <ActivityIndicator
                        size="small"
                        color={
                          COLORS.white
                        }
                      />

                    )
                    : (

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
                          Continue
                        </Text>


                        <Ionicons
                          name="arrow-forward"
                          size={
                            19 *
                            scale
                          }
                          color={
                            COLORS.white
                          }
                        />

                      </View>

                    )
                }

              </TouchableOpacity>

            </View>

          </View>

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


    screen: {
      flex: 1,

      width:
        canvasWidth,

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
        28 *
        sy,

      paddingBottom:
        30 *
        sy,
    },


    /*
    |--------------------------------------------------------------------------
    | CENTERED BRAND
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


    /*
    |--------------------------------------------------------------------------
    | BIGGER CENTERED LOGO
    |--------------------------------------------------------------------------
    */

    logo: {
      width:
        150 *
        sx,

      height:
        180 *
        sy,
    },


    brandName: {
      marginTop:
        15 *
        sy,

      color:
        COLORS.maroon,

      fontSize:
        26 *
        scale,

      lineHeight:
        23 *
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
        7 *
        sy,

      color:
        COLORS.muted,

      fontSize:
        12 *
        scale,

      lineHeight:
        13 *
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
    | CENTERED INTRO
    |--------------------------------------------------------------------------
    */

    intro: {
      width:
        '100%',

      marginTop:
        68 *
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
        32 *
        scale,

      lineHeight:
        39 *
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
        '90%',

      marginTop:
        12 *
        sy,

      color:
        COLORS.muted,

      fontSize:
        13 *
        scale,

      lineHeight:
        20 *
        scale,

      fontWeight:
        '400',

      textAlign:
        'center',

      alignSelf:
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
        48 *
        sy,
    },


    label: {
      marginBottom:
        10 *
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

      borderWidth:
        1,

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


    input: {
      flex: 1,

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

      letterSpacing:
        0.8,

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
    | BUTTON
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
        0.6,
    },

  });

}