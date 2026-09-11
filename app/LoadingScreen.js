import {
  router,
  Stack,
} from 'expo-router';

import {
  useEffect,
  useRef,
} from 'react';

import {
  Animated,
  Easing,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';


/*
|--------------------------------------------------------------------------
| NSTP HUB ADMIN LOADING SCREEN
|--------------------------------------------------------------------------
|
| Simple Admin splash animation:
|
| 1. Logo rises and fades in
| 2. Gold divider expands
| 3. NSTP HUB appears
| 4. ADMINISTRATIVE PORTAL appears
| 5. University name appears
| 6. Loading dots pulse
| 7. Screen softly exits
| 8. Navigate to AccessCodeScreen
|
*/


/*
|--------------------------------------------------------------------------
| Colors
|--------------------------------------------------------------------------
*/

const COLORS = {
  maroon: '#54100F',
  cream: '#F4EEE6',
  creamMuted: '#D8CBC2',
  gold: '#D99B32',
  goldSoft: '#E7BB6B',
  white: '#FFFFFF',
};


/*
|--------------------------------------------------------------------------
| NSTP HUB Logo
|--------------------------------------------------------------------------
*/

const NSTP_LOGO = require(
  '../assets/images/nstphub_logo.png'
);


/*
|--------------------------------------------------------------------------
| White Logo Outline Positions
|--------------------------------------------------------------------------
|
| Multiple white silhouettes are positioned slightly behind
| the original logo to create a clean white border.
|
*/

const LOGO_OUTLINE_OFFSETS = [
  {
    x: -2.2,
    y: 0,
  },
  {
    x: 2.2,
    y: 0,
  },
  {
    x: 0,
    y: -2.2,
  },
  {
    x: 0,
    y: 2.2,
  },
  {
    x: -1.7,
    y: -1.7,
  },
  {
    x: 1.7,
    y: -1.7,
  },
  {
    x: -1.7,
    y: 1.7,
  },
  {
    x: 1.7,
    y: 1.7,
  },
];


/*
|--------------------------------------------------------------------------
| Loading Screen
|--------------------------------------------------------------------------
*/

export default function LoadingScreen() {
  const {
    width,
  } = useWindowDimensions();


  /*
  |--------------------------------------------------------------------------
  | Fonts
  |--------------------------------------------------------------------------
  */

  const [
    fontsLoaded,
  ] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });


  /*
  |--------------------------------------------------------------------------
  | Responsive Scale
  |--------------------------------------------------------------------------
  */

  const scale =
    Math.min(
      width / 390,
      1.12
    );


  /*
  |--------------------------------------------------------------------------
  | Screen Animation
  |--------------------------------------------------------------------------
  */

  const screenOpacity =
    useRef(
      new Animated.Value(1)
    ).current;


  const contentTranslateY =
    useRef(
      new Animated.Value(0)
    ).current;


  /*
  |--------------------------------------------------------------------------
  | Logo Animation
  |--------------------------------------------------------------------------
  */

  const logoOpacity =
    useRef(
      new Animated.Value(0)
    ).current;


  const logoTranslateY =
    useRef(
      new Animated.Value(20)
    ).current;


  const logoScale =
    useRef(
      new Animated.Value(0.92)
    ).current;


  /*
  |--------------------------------------------------------------------------
  | Divider Animation
  |--------------------------------------------------------------------------
  */

  const dividerOpacity =
    useRef(
      new Animated.Value(0)
    ).current;


  const dividerScaleX =
    useRef(
      new Animated.Value(0)
    ).current;


  /*
  |--------------------------------------------------------------------------
  | Brand Animation
  |--------------------------------------------------------------------------
  */

  const brandOpacity =
    useRef(
      new Animated.Value(0)
    ).current;


  const brandTranslateY =
    useRef(
      new Animated.Value(12)
    ).current;


  /*
  |--------------------------------------------------------------------------
  | Admin Animation
  |--------------------------------------------------------------------------
  */

  const adminOpacity =
    useRef(
      new Animated.Value(0)
    ).current;


  const adminTranslateY =
    useRef(
      new Animated.Value(8)
    ).current;


  /*
  |--------------------------------------------------------------------------
  | University Animation
  |--------------------------------------------------------------------------
  */

  const subtitleOpacity =
    useRef(
      new Animated.Value(0)
    ).current;


  /*
  |--------------------------------------------------------------------------
  | Loading Dots
  |--------------------------------------------------------------------------
  */

  const dotOne =
    useRef(
      new Animated.Value(0.3)
    ).current;


  const dotTwo =
    useRef(
      new Animated.Value(0.3)
    ).current;


  const dotThree =
    useRef(
      new Animated.Value(0.3)
    ).current;


  /*
  |--------------------------------------------------------------------------
  | Main Animation
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      if (
        !fontsLoaded
      ) {
        return undefined;
      }


      let exitTimer =
        null;


      let navigationTimer =
        null;


      /*
      |--------------------------------------------------------------------------
      | Logo Entrance
      |--------------------------------------------------------------------------
      */

      const logoAnimation =
        Animated.parallel([

          Animated.timing(
            logoOpacity,
            {
              toValue:
                1,

              duration:
                700,

              easing:
                Easing.out(
                  Easing.cubic
                ),

              useNativeDriver:
                true,
            }
          ),


          Animated.timing(
            logoTranslateY,
            {
              toValue:
                0,

              duration:
                700,

              easing:
                Easing.out(
                  Easing.cubic
                ),

              useNativeDriver:
                true,
            }
          ),


          Animated.spring(
            logoScale,
            {
              toValue:
                1,

              friction:
                8,

              tension:
                42,

              useNativeDriver:
                true,
            }
          ),

        ]);


      logoAnimation.start();


      /*
      |--------------------------------------------------------------------------
      | Gold Divider
      |--------------------------------------------------------------------------
      */

      const dividerAnimation =
        Animated.sequence([

          Animated.delay(
            480
          ),


          Animated.parallel([

            Animated.timing(
              dividerOpacity,
              {
                toValue:
                  1,

                duration:
                  300,

                useNativeDriver:
                  true,
              }
            ),


            Animated.timing(
              dividerScaleX,
              {
                toValue:
                  1,

                duration:
                  520,

                easing:
                  Easing.out(
                    Easing.cubic
                  ),

                useNativeDriver:
                  true,
              }
            ),

          ]),

        ]);


      dividerAnimation.start();


      /*
      |--------------------------------------------------------------------------
      | NSTP HUB Reveal
      |--------------------------------------------------------------------------
      */

      const brandAnimation =
        Animated.sequence([

          Animated.delay(
            720
          ),


          Animated.parallel([

            Animated.timing(
              brandOpacity,
              {
                toValue:
                  1,

                duration:
                  500,

                easing:
                  Easing.out(
                    Easing.cubic
                  ),

                useNativeDriver:
                  true,
              }
            ),


            Animated.timing(
              brandTranslateY,
              {
                toValue:
                  0,

                duration:
                  500,

                easing:
                  Easing.out(
                    Easing.cubic
                  ),

                useNativeDriver:
                  true,
              }
            ),

          ]),

        ]);


      brandAnimation.start();


      /*
      |--------------------------------------------------------------------------
      | Administrative Portal Reveal
      |--------------------------------------------------------------------------
      */

      const adminAnimation =
        Animated.sequence([

          Animated.delay(
            1020
          ),


          Animated.parallel([

            Animated.timing(
              adminOpacity,
              {
                toValue:
                  1,

                duration:
                  420,

                easing:
                  Easing.out(
                    Easing.ease
                  ),

                useNativeDriver:
                  true,
              }
            ),


            Animated.timing(
              adminTranslateY,
              {
                toValue:
                  0,

                duration:
                  420,

                easing:
                  Easing.out(
                    Easing.cubic
                  ),

                useNativeDriver:
                  true,
              }
            ),

          ]),

        ]);


      adminAnimation.start();


      /*
      |--------------------------------------------------------------------------
      | University Reveal
      |--------------------------------------------------------------------------
      */

      const subtitleAnimation =
        Animated.sequence([

          Animated.delay(
            1280
          ),


          Animated.timing(
            subtitleOpacity,
            {
              toValue:
                1,

              duration:
                450,

              easing:
                Easing.out(
                  Easing.ease
                ),

              useNativeDriver:
                true,
            }
          ),

        ]);


      subtitleAnimation.start();


      /*
      |--------------------------------------------------------------------------
      | Loading Dot Animation
      |--------------------------------------------------------------------------
      */

      const createDotAnimation =
        (
          animatedValue,
          delay
        ) =>
          Animated.loop(
            Animated.sequence([

              Animated.delay(
                delay
              ),


              Animated.timing(
                animatedValue,
                {
                  toValue:
                    1,

                  duration:
                    340,

                  easing:
                    Easing.inOut(
                      Easing.ease
                    ),

                  useNativeDriver:
                    true,
                }
              ),


              Animated.timing(
                animatedValue,
                {
                  toValue:
                    0.3,

                  duration:
                    340,

                  easing:
                    Easing.inOut(
                      Easing.ease
                    ),

                  useNativeDriver:
                    true,
                }
              ),


              Animated.delay(
                360
              ),

            ])
          );


      const dotAnimationOne =
        createDotAnimation(
          dotOne,
          0
        );


      const dotAnimationTwo =
        createDotAnimation(
          dotTwo,
          150
        );


      const dotAnimationThree =
        createDotAnimation(
          dotThree,
          300
        );


      dotAnimationOne.start();

      dotAnimationTwo.start();

      dotAnimationThree.start();


      /*
      |--------------------------------------------------------------------------
      | Exit
      |--------------------------------------------------------------------------
      */

      exitTimer =
        setTimeout(
          () => {

            dotAnimationOne.stop();

            dotAnimationTwo.stop();

            dotAnimationThree.stop();


            Animated.parallel([

              Animated.timing(
                screenOpacity,
                {
                  toValue:
                    0,

                  duration:
                    500,

                  easing:
                    Easing.inOut(
                      Easing.ease
                    ),

                  useNativeDriver:
                    true,
                }
              ),


              Animated.timing(
                contentTranslateY,
                {
                  toValue:
                    -8,

                  duration:
                    500,

                  easing:
                    Easing.inOut(
                      Easing.cubic
                    ),

                  useNativeDriver:
                    true,
                }
              ),

            ]).start();

          },
          3400
        );


      /*
      |--------------------------------------------------------------------------
      | Navigate
      |--------------------------------------------------------------------------
      */

      navigationTimer =
        setTimeout(
          () => {

            router.replace(
              '/AccessCodeScreen'
            );

          },
          3900
        );


      /*
      |--------------------------------------------------------------------------
      | Cleanup
      |--------------------------------------------------------------------------
      */

      return () => {

        if (
          exitTimer
        ) {
          clearTimeout(
            exitTimer
          );
        }


        if (
          navigationTimer
        ) {
          clearTimeout(
            navigationTimer
          );
        }


        logoAnimation.stop();

        dividerAnimation.stop();

        brandAnimation.stop();

        adminAnimation.stop();

        subtitleAnimation.stop();


        dotAnimationOne.stop();

        dotAnimationTwo.stop();

        dotAnimationThree.stop();

      };

    },
    [
      fontsLoaded,
    ]
  );


  /*
  |--------------------------------------------------------------------------
  | Wait For Fonts
  |--------------------------------------------------------------------------
  */

  if (
    !fontsLoaded
  ) {
    return (
      <SafeAreaView
        style={
          styles.safeArea
        }
        edges={[
          'top',
          'bottom',
        ]}
      >

        <Stack.Screen
          options={{
            headerShown:
              false,
          }}
        />


        <StatusBar
          barStyle="light-content"
          backgroundColor={
            COLORS.maroon
          }
        />


        <View
          style={
            styles.fullScreen
          }
        />

      </SafeAreaView>
    );
  }


  /*
  |--------------------------------------------------------------------------
  | Screen
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
      ]}
    >

      <Stack.Screen
        options={{
          headerShown:
            false,
        }}
      />


      <StatusBar
        barStyle="light-content"
        backgroundColor={
          COLORS.maroon
        }
      />


      <Animated.View
        style={[
          styles.fullScreen,

          {
            opacity:
              screenOpacity,

            transform: [
              {
                translateY:
                  contentTranslateY,
              },
            ],
          },
        ]}
      >


        <View
          style={
            styles.content
          }
        >


          {/*
          |--------------------------------------------------------------------------
          | Logo
          |--------------------------------------------------------------------------
          */}

          <Animated.View
            style={[
              styles.logoContainer,

              {
                opacity:
                  logoOpacity,

                transform: [

                  {
                    translateY:
                      logoTranslateY,
                  },

                  {
                    scale:
                      logoScale,
                  },

                ],
              },
            ]}
          >


            {/*
            |--------------------------------------------------------------------------
            | White Logo Outline
            |--------------------------------------------------------------------------
            */}

            <View
              style={[
                styles.logoLayer,
                {
                  width:
                    112 *
                    scale,

                  height:
                    145 *
                    scale,
                },
              ]}
            >

              {
                LOGO_OUTLINE_OFFSETS.map(
                  (
                    offset,
                    index
                  ) => (

                    <Image
                      key={
                        index
                      }
                      source={
                        NSTP_LOGO
                      }
                      resizeMode="contain"
                      tintColor={
                        COLORS.white
                      }
                      style={[
                        styles.logoOutline,

                        {
                          width:
                            112 *
                            scale,

                          height:
                            145 *
                            scale,

                          transform: [
                            {
                              translateX:
                                offset.x *
                                scale,
                            },

                            {
                              translateY:
                                offset.y *
                                scale,
                            },
                          ],
                        },
                      ]}
                    />

                  )
                )
              }


              {/*
              |--------------------------------------------------------------------------
              | Original Logo
              |--------------------------------------------------------------------------
              */}

              <Image
                source={
                  NSTP_LOGO
                }
                resizeMode="contain"
                style={[
                  styles.logo,

                  {
                    width:
                      112 *
                      scale,

                    height:
                      145 *
                      scale,
                  },
                ]}
              />

            </View>

          </Animated.View>


          {/*
          |--------------------------------------------------------------------------
          | Gold Divider
          |--------------------------------------------------------------------------
          */}

          <Animated.View
            style={[
              styles.divider,

              {
                opacity:
                  dividerOpacity,

                transform: [
                  {
                    scaleX:
                      dividerScaleX,
                  },
                ],
              },
            ]}
          />


          {/*
          |--------------------------------------------------------------------------
          | NSTP HUB
          |--------------------------------------------------------------------------
          */}

          <Animated.View
            style={[
              styles.brandContainer,

              {
                opacity:
                  brandOpacity,

                transform: [
                  {
                    translateY:
                      brandTranslateY,
                  },
                ],
              },
            ]}
          >

            <Text
              style={[
                styles.brandText,

                {
                  fontSize:
                    27 *
                    scale,

                  lineHeight:
                    34 *
                    scale,
                },
              ]}
            >
              NSTP HUB
            </Text>

          </Animated.View>


          {/*
          |--------------------------------------------------------------------------
          | Administrative Portal
          |--------------------------------------------------------------------------
          */}

          <Animated.Text
            style={[
              styles.adminText,

              {
                fontSize:
                  10 *
                  scale,

                lineHeight:
                  15 *
                  scale,

                opacity:
                  adminOpacity,

                transform: [
                  {
                    translateY:
                      adminTranslateY,
                  },
                ],
              },
            ]}
          >
            ADMINISTRATIVE PORTAL
          </Animated.Text>


          {/*
          |--------------------------------------------------------------------------
          | University
          |--------------------------------------------------------------------------
          */}

          <Animated.Text
            style={[
              styles.subtitle,

              {
                fontSize:
                  10.5 *
                  scale,

                lineHeight:
                  16 *
                  scale,

                opacity:
                  subtitleOpacity,
              },
            ]}
          >
            Surigao del Norte State University
          </Animated.Text>


          {/*
          |--------------------------------------------------------------------------
          | Loading Dots
          |--------------------------------------------------------------------------
          */}

          <Animated.View
            style={[
              styles.loadingContainer,

              {
                opacity:
                  subtitleOpacity,
              },
            ]}
          >

            <Animated.View
              style={[
                styles.dot,

                {
                  opacity:
                    dotOne,

                  transform: [
                    {
                      scale:
                        dotOne.interpolate({
                          inputRange: [
                            0.3,
                            1,
                          ],

                          outputRange: [
                            0.72,
                            1,
                          ],
                        }),
                    },
                  ],
                },
              ]}
            />


            <Animated.View
              style={[
                styles.dot,

                {
                  opacity:
                    dotTwo,

                  transform: [
                    {
                      scale:
                        dotTwo.interpolate({
                          inputRange: [
                            0.3,
                            1,
                          ],

                          outputRange: [
                            0.72,
                            1,
                          ],
                        }),
                    },
                  ],
                },
              ]}
            />


            <Animated.View
              style={[
                styles.dot,

                {
                  opacity:
                    dotThree,

                  transform: [
                    {
                      scale:
                        dotThree.interpolate({
                          inputRange: [
                            0.3,
                            1,
                          ],

                          outputRange: [
                            0.72,
                            1,
                          ],
                        }),
                    },
                  ],
                },
              ]}
            />

          </Animated.View>

        </View>

      </Animated.View>

    </SafeAreaView>
  );
}


/*
|--------------------------------------------------------------------------
| Styles
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
      flex:
        1,

      backgroundColor:
        COLORS.maroon,
    },


    fullScreen: {
      flex:
        1,

      width:
        '100%',

      backgroundColor:
        COLORS.maroon,

      alignItems:
        'center',

      justifyContent:
        'center',

      position:
        'relative',
    },


    /*
    |--------------------------------------------------------------------------
    | Main Content
    |--------------------------------------------------------------------------
    */

    content: {
      width:
        '100%',

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        28,
    },


    /*
    |--------------------------------------------------------------------------
    | Logo
    |--------------------------------------------------------------------------
    */

    logoContainer: {
      alignItems:
        'center',

      justifyContent:
        'center',

      marginBottom:
        18,


      ...Platform.select({

        ios: {
          shadowColor:
            '#000000',

          shadowOffset: {
            width:
              0,

            height:
              6,
          },

          shadowOpacity:
            0.18,

          shadowRadius:
            9,
        },


        android: {
          elevation:
            5,
        },


        default: {
          shadowColor:
            '#000000',

          shadowOffset: {
            width:
              0,

            height:
              6,
          },

          shadowOpacity:
            0.18,

          shadowRadius:
            9,
        },

      }),
    },


    /*
    |--------------------------------------------------------------------------
    | Logo Layer
    |--------------------------------------------------------------------------
    */

    logoLayer: {
      position:
        'relative',

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    /*
    |--------------------------------------------------------------------------
    | White Logo Outline
    |--------------------------------------------------------------------------
    */

    logoOutline: {
      position:
        'absolute',

      top:
        0,

      left:
        0,

      opacity:
        1,
    },


    /*
    |--------------------------------------------------------------------------
    | Original Logo
    |--------------------------------------------------------------------------
    */

    logo: {
      position:
        'absolute',

      top:
        0,

      left:
        0,
    },


    /*
    |--------------------------------------------------------------------------
    | Gold Divider
    |--------------------------------------------------------------------------
    */

    divider: {
      width:
        56,

      height:
        2,

      borderRadius:
        1,

      backgroundColor:
        COLORS.gold,

      marginBottom:
        18,
    },


    /*
    |--------------------------------------------------------------------------
    | Brand
    |--------------------------------------------------------------------------
    */

    brandContainer: {
      alignItems:
        'center',

      justifyContent:
        'center',
    },


    brandText: {
      color:
        COLORS.cream,

      fontFamily:
        'Poppins_600SemiBold',

      letterSpacing:
        2.6,

      textAlign:
        'center',

      includeFontPadding:
        false,
    },


    /*
    |--------------------------------------------------------------------------
    | Admin
    |--------------------------------------------------------------------------
    */

    adminText: {
      marginTop:
        5,

      color:
        COLORS.goldSoft,

      fontFamily:
        'Poppins_600SemiBold',

      letterSpacing:
        3.1,

      textAlign:
        'center',

      includeFontPadding:
        false,
    },


    /*
    |--------------------------------------------------------------------------
    | University
    |--------------------------------------------------------------------------
    */

    subtitle: {
      marginTop:
        15,

      color:
        COLORS.creamMuted,

      fontFamily:
        'Poppins_400Regular',

      letterSpacing:
        0.15,

      textAlign:
        'center',

      includeFontPadding:
        false,
    },


    /*
    |--------------------------------------------------------------------------
    | Loading Dots
    |--------------------------------------------------------------------------
    */

    loadingContainer: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginTop:
        24,
    },


    dot: {
      width:
        5,

      height:
        5,

      borderRadius:
        2.5,

      backgroundColor:
        COLORS.gold,

      marginHorizontal:
        4,
    },

  });