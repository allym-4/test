import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Text } from 'react-native'

import DashboardScreen from '../screens/student/DashboardScreen'
import BookScreen from '../screens/student/BookScreen'
import MyClassesScreen from '../screens/student/MyClassesScreen'
import CommunityScreen from '../screens/student/CommunityScreen'
import AccountScreen from '../screens/student/AccountScreen'

import NotificationsScreen from '../screens/student/NotificationsScreen'
import BillingScreen from '../screens/student/BillingScreen'
import FormsScreen from '../screens/student/FormsScreen'
import StudioInfoScreen from '../screens/student/StudioInfoScreen'
import ProgressScreen from '../screens/student/ProgressScreen'
import HomeworkScreen from '../screens/student/HomeworkScreen'
import ChatScreen from '../screens/student/ChatScreen'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

const ICONS = { Home: '🏠', Book: '📅', Classes: '📋', Community: '💬', Account: '👤' }

function Icon({ name, focused }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{ICONS[name]}</Text>
}

const headerStyle = {
  headerStyle: { backgroundColor: '#fff' },
  headerTitleStyle: { fontWeight: '700', color: '#111827' },
  headerTintColor: '#6366f1',
}

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={headerStyle}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Home' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="StudioInfo" component={StudioInfoScreen} options={{ title: 'Studio Info' }} />
    </Stack.Navigator>
  )
}

function BookStack() {
  return (
    <Stack.Navigator screenOptions={headerStyle}>
      <Stack.Screen name="Book" component={BookScreen} options={{ title: 'Book a Class' }} />
    </Stack.Navigator>
  )
}

function ClassesStack() {
  return (
    <Stack.Navigator screenOptions={headerStyle}>
      <Stack.Screen name="MyClasses" component={MyClassesScreen} options={{ title: 'My Classes' }} />
      <Stack.Screen name="Progress" component={ProgressScreen} options={{ title: 'My Progress' }} />
      <Stack.Screen name="Homework" component={HomeworkScreen} options={{ title: 'Homework' }} />
    </Stack.Navigator>
  )
}

function CommunityStack() {
  return (
    <Stack.Navigator screenOptions={headerStyle}>
      <Stack.Screen name="Community" component={CommunityScreen} options={{ title: 'Community' }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
    </Stack.Navigator>
  )
}

function AccountStack() {
  return (
    <Stack.Navigator screenOptions={headerStyle}>
      <Stack.Screen name="Account" component={AccountScreen} options={{ title: 'Account' }} />
      <Stack.Screen name="Billing" component={BillingScreen} options={{ title: 'Billing' }} />
      <Stack.Screen name="Forms" component={FormsScreen} options={{ title: 'Forms' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="StudioInfo" component={StudioInfoScreen} options={{ title: 'Studio Info' }} />
    </Stack.Navigator>
  )
}

export default function StudentTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <Icon name={route.name} focused={focused} />,
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#9ca3af',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Book" component={BookStack} />
      <Tab.Screen name="Classes" component={ClassesStack} options={{ title: 'My Classes' }} />
      <Tab.Screen name="Community" component={CommunityStack} />
      <Tab.Screen name="Account" component={AccountStack} />
    </Tab.Navigator>
  )
}
