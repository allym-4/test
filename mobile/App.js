import './src/suppress-stripe-warning'
import { useState, useEffect, useRef, createContext, useContext } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { View, ActivityIndicator } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { StripeProvider } from '@stripe/stripe-react-native'
import { AuthProvider, useAuth } from './src/contexts/AuthContext'
import { usePushNotifications } from './src/hooks/usePushNotifications'
import LoginScreen from './src/screens/auth/LoginScreen'
import RegisterScreen from './src/screens/auth/RegisterScreen'
import OnboardingScreen from './src/screens/auth/OnboardingScreen'
import StudentTabs from './src/navigation/StudentTabs'
import InstructorTabs from './src/navigation/InstructorTabs'

const AppContext = createContext({})

function InstructorApp() {
  const { onSwitchToStudent } = useContext(AppContext)
  return <InstructorTabs onSwitchToStudent={onSwitchToStudent} />
}

function StudentApp() {
  const { isInstructor, onSwitchToInstructor } = useContext(AppContext)
  return <StudentTabs isInstructor={isInstructor} onSwitchToInstructor={onSwitchToInstructor} />
}

// Publishable key — safe to expose in client code
const STRIPE_PK = 'pk_live_REPLACE_WITH_YOUR_PUBLISHABLE_KEY'

const Stack = createNativeStackNavigator()

function viewModeKey(userId) {
  return `view_mode_${userId}`
}

export function useViewMode(user) {
  const [viewMode, setViewModeState] = useState(null) // null = loading

  useEffect(() => {
    if (!user) { setViewModeState('default'); return }
    AsyncStorage.getItem(viewModeKey(user.id)).then(val => {
      setViewModeState(val === 'student' ? 'student' : 'default')
    })
  }, [user?.id])

  async function setViewMode(mode) {
    setViewModeState(mode)
    if (mode === 'student') {
      await AsyncStorage.setItem(viewModeKey(user.id), 'student')
    } else {
      await AsyncStorage.removeItem(viewModeKey(user.id))
    }
  }

  return { viewMode, setViewMode }
}

function RootNavigator() {
  const { user, loading } = useAuth()
  const [onboardingDone, setOnboardingDone] = useState(null)
  const navigationRef = useRef(null)
  const { viewMode, setViewMode } = useViewMode(user)

  useEffect(() => {
    if (!user || user.role !== 'student') { setOnboardingDone(true); return }
    AsyncStorage.getItem(`onboarding_done_${user.id}`).then(val => {
      setOnboardingDone(!!val)
    })
  }, [user])

  usePushNotifications({
    user,
    onNotificationTap: (data) => {
      if (!navigationRef.current) return
      if (data?.type === 'announcement' || data?.type === 'notification') {
        navigationRef.current.navigate('Notifications')
      } else if (data?.type === 'message') {
        navigationRef.current.navigate('Chat')
      } else if (data?.type === 'homework') {
        navigationRef.current.navigate('Homework')
      }
    },
  })

  if (loading || (user && (onboardingDone === null || viewMode === null))) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    )
  }

  if (user && user.role === 'student' && !onboardingDone) {
    return (
      <OnboardingScreen
        userId={user.id}
        onDone={() => setOnboardingDone(true)}
      />
    )
  }

  const isInstructorViewingAsStudent = user?.role === 'instructor' && viewMode === 'student'
  const showInstructorView = user?.role === 'instructor' && !isInstructorViewingAsStudent

  const appCtx = {
    onSwitchToStudent: () => setViewMode('student'),
    isInstructor: user?.role === 'instructor',
    onSwitchToInstructor: user?.role === 'instructor' ? () => setViewMode('default') : undefined,
  }

  return (
    <AppContext.Provider value={appCtx}>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          ) : showInstructorView ? (
            <Stack.Screen name="InstructorApp" component={InstructorApp} />
          ) : (
            <Stack.Screen name="StudentApp" component={StudentApp} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AppContext.Provider>
  )
}

export default function App() {
  return (
    <StripeProvider
      publishableKey={STRIPE_PK}
      merchantIdentifier="merchant.com.yourstudio.app"
      urlScheme="yourstudio"
    >
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </StripeProvider>
  )
}
