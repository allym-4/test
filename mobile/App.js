import { useState, useEffect, useRef } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { View, ActivityIndicator } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { StripeProvider } from '@stripe/stripe-react-native'
import { AuthProvider, useAuth } from './src/contexts/AuthContext'
import { usePushNotifications } from './src/hooks/usePushNotifications'
import LoginScreen from './src/screens/auth/LoginScreen'
import OnboardingScreen from './src/screens/auth/OnboardingScreen'
import StudentTabs from './src/navigation/StudentTabs'
import InstructorTabs from './src/navigation/InstructorTabs'

// Publishable key — safe to expose in client code
const STRIPE_PK = 'pk_live_REPLACE_WITH_YOUR_PUBLISHABLE_KEY'

const Stack = createNativeStackNavigator()

function RootNavigator() {
  const { user, loading } = useAuth()
  const [onboardingDone, setOnboardingDone] = useState(null) // null = checking
  const navigationRef = useRef(null)

  useEffect(() => {
    if (!user || user.role !== 'student') { setOnboardingDone(true); return }
    AsyncStorage.getItem(`onboarding_done_${user.id}`).then(val => {
      setOnboardingDone(!!val)
    })
  }, [user])

  usePushNotifications({
    user,
    onNotificationTap: (data) => {
      // Deep-link based on notification data type
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

  if (loading || (user && onboardingDone === null)) {
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

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : user.role === 'instructor' ? (
          <Stack.Screen name="InstructorApp" component={InstructorTabs} />
        ) : (
          <Stack.Screen name="StudentApp" component={StudentTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
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
