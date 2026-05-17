import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Text } from 'react-native'
import AttendanceScreen from '../screens/instructor/AttendanceScreen'
import EnrolmentsScreen from '../screens/instructor/EnrolmentsScreen'
import InstructorAccountScreen from '../screens/instructor/InstructorAccountScreen'
import InstructorProfileScreen from '../screens/instructor/ProfileScreen'
import AvailabilityScreen from '../screens/instructor/AvailabilityScreen'
import MessagesScreen from '../screens/instructor/MessagesScreen'
import SkillsApprovalScreen from '../screens/instructor/SkillsApprovalScreen'
import PayScreen from '../screens/instructor/PayScreen'

const Tab = createBottomTabNavigator()
const AccountStack = createNativeStackNavigator()

const ICONS = { Attendance: '✅', Enrolments: '👥', Account: '👤' }

function Icon({ name, focused }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{ICONS[name]}</Text>
}

function AccountStackNav() {
  return (
    <AccountStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '700', color: '#111827' },
        headerTintColor: '#6366f1',
      }}
    >
      <AccountStack.Screen name="AccountHome" component={InstructorAccountScreen} options={{ title: 'Account' }} />
      <AccountStack.Screen name="InstructorProfile" component={InstructorProfileScreen} options={{ title: 'Edit Profile' }} />
      <AccountStack.Screen name="Availability" component={AvailabilityScreen} options={{ title: 'My Availability' }} />
      <AccountStack.Screen name="Messages" component={MessagesScreen} options={{ title: 'Messages' }} />
      <AccountStack.Screen name="SkillsApproval" component={SkillsApprovalScreen} options={{ title: 'Skills Approval' }} />
      <AccountStack.Screen name="Pay" component={PayScreen} options={{ title: 'Pay Records' }} />
    </AccountStack.Navigator>
  )
}

export default function InstructorTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <Icon name={route.name} focused={focused} />,
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#9ca3af',
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '700', color: '#111827' },
      })}
    >
      <Tab.Screen name="Attendance" component={AttendanceScreen} options={{ title: 'Attendance' }} />
      <Tab.Screen name="Enrolments" component={EnrolmentsScreen} options={{ title: 'My Classes' }} />
      <Tab.Screen name="Account" component={AccountStackNav} options={{ headerShown: false, title: 'Account' }} />
    </Tab.Navigator>
  )
}
