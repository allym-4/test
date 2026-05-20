import { createContext, useContext } from 'react'
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

const InstructorSwitchContext = createContext(null)

const ICONS = { Attendance: '✅', Enrolments: '👥', Account: '👤' }

function Icon({ name, focused }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{ICONS[name]}</Text>
}

function InstructorAccountHome(props) {
  const onSwitchToStudent = useContext(InstructorSwitchContext)
  return (
    <InstructorAccountScreen
      {...props}
      route={{ ...props.route, params: { ...props.route.params, onSwitchToStudent } }}
    />
  )
}

function AccountStackNav() {
  return (
    <AccountStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#000' },
        headerTitleStyle: { fontWeight: '700', color: '#fff' },
        headerTintColor: '#ccff00',
      }}
    >
      <AccountStack.Screen name="AccountHome" component={InstructorAccountHome} options={{ title: 'Account' }} />
      <AccountStack.Screen name="InstructorProfile" component={InstructorProfileScreen} options={{ title: 'Edit Profile' }} />
      <AccountStack.Screen name="Availability" component={AvailabilityScreen} options={{ title: 'My Availability' }} />
      <AccountStack.Screen name="Messages" component={MessagesScreen} options={{ title: 'Messages' }} />
      <AccountStack.Screen name="SkillsApproval" component={SkillsApprovalScreen} options={{ title: 'Skills Approval' }} />
      <AccountStack.Screen name="Pay" component={PayScreen} options={{ title: 'Pay Records' }} />
    </AccountStack.Navigator>
  )
}

export default function InstructorTabs({ onSwitchToStudent }) {
  return (
    <InstructorSwitchContext.Provider value={onSwitchToStudent}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused }) => <Icon name={route.name} focused={focused} />,
          tabBarActiveTintColor: '#ccff00',
          tabBarInactiveTintColor: '#555',
          tabBarStyle: { backgroundColor: '#000', borderTopColor: '#222' },
          headerStyle: { backgroundColor: '#000' },
          headerTitleStyle: { fontWeight: '700', color: '#fff' },
          headerTintColor: '#ccff00',
        })}
      >
        <Tab.Screen name="Attendance" component={AttendanceScreen} options={{ title: 'Attendance' }} />
        <Tab.Screen name="Enrolments" component={EnrolmentsScreen} options={{ title: 'My Classes' }} />
        <Tab.Screen name="Account" component={AccountStackNav} options={{ headerShown: false, title: 'Account' }} />
      </Tab.Navigator>
    </InstructorSwitchContext.Provider>
  )
}
