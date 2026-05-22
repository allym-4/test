import { createContext, useContext } from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Text } from 'react-native'
import DashboardScreen from '../screens/instructor/DashboardScreen'
import AttendanceScreen from '../screens/instructor/AttendanceScreen'
import EnrolmentsScreen from '../screens/instructor/EnrolmentsScreen'
import StudentsScreen from '../screens/instructor/StudentsScreen'
import ProgressScreen from '../screens/instructor/ProgressScreen'
import MessagesScreen from '../screens/instructor/MessagesScreen'
import InstructorAccountScreen from '../screens/instructor/InstructorAccountScreen'
import InstructorProfileScreen from '../screens/instructor/ProfileScreen'
import AvailabilityScreen from '../screens/instructor/AvailabilityScreen'
import SkillsApprovalScreen from '../screens/instructor/SkillsApprovalScreen'
import PayScreen from '../screens/instructor/PayScreen'
import NotificationsScreen from '../screens/instructor/NotificationsScreen'
import StudentDetailScreen from '../screens/instructor/StudentDetailScreen'
import ClassDetailScreen from '../screens/instructor/ClassDetailScreen'
import AssistantScreen from '../screens/instructor/AssistantScreen'
import LeadsScreen from '../screens/instructor/LeadsScreen'

const Tab = createBottomTabNavigator()
const HomeStackNav = createNativeStackNavigator()
const MyClassesStackNav = createNativeStackNavigator()
const StudentsStackNav = createNativeStackNavigator()
const ProgressStackNav = createNativeStackNavigator()
const MessagesStackNav = createNativeStackNavigator()

const InstructorSwitchContext = createContext(null)

const ICONS = {
  HomeTab: '🏠',
  MyClassesTab: '📅',
  StudentsTab: '👥',
  LeadsTab: '📋',
  AssistantTab: '🤖',
  MessagesTab: '💬',
}

const stackScreenOptions = {
  headerStyle: { backgroundColor: '#000' },
  headerTitleStyle: { fontWeight: '700', color: '#fff' },
  headerTintColor: '#ccff00',
}

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

function HomeStack() {
  return (
    <HomeStackNav.Navigator screenOptions={stackScreenOptions}>
      <HomeStackNav.Screen name="DashboardHome" component={DashboardScreen} options={{ title: 'Home' }} />
      <HomeStackNav.Screen name="AccountHome" component={InstructorAccountHome} options={{ title: 'Account' }} />
      <HomeStackNav.Screen name="InstructorProfile" component={InstructorProfileScreen} options={{ title: 'Edit Profile' }} />
      <HomeStackNav.Screen name="Availability" component={AvailabilityScreen} options={{ title: 'My Availability' }} />
      <HomeStackNav.Screen name="SkillsApproval" component={SkillsApprovalScreen} options={{ title: 'Skills Approval' }} />
      <HomeStackNav.Screen name="Pay" component={PayScreen} options={{ title: 'Pay Records' }} />
      <HomeStackNav.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <HomeStackNav.Screen name="AttendanceHome" component={AttendanceScreen} options={{ title: 'Attendance' }} />
      <HomeStackNav.Screen name="StudentDetail" component={StudentDetailScreen} options={({ route }) => ({ title: route.params?.studentName ?? 'Student' })} />
    </HomeStackNav.Navigator>
  )
}

function MyClassesStack() {
  return (
    <MyClassesStackNav.Navigator screenOptions={stackScreenOptions}>
      <MyClassesStackNav.Screen name="EnrolmentsHome" component={EnrolmentsScreen} options={{ title: 'My Classes' }} />
      <MyClassesStackNav.Screen name="ClassDetail" component={ClassDetailScreen} options={({ route }) => ({ title: route.params?.occurrence?.session_name ?? route.params?.occurrence?.name ?? 'Class' })} />
      <MyClassesStackNav.Screen name="StudentDetail" component={StudentDetailScreen} options={({ route }) => ({ title: route.params?.studentName ?? 'Student' })} />
    </MyClassesStackNav.Navigator>
  )
}

function StudentsStack() {
  return (
    <StudentsStackNav.Navigator screenOptions={stackScreenOptions}>
      <StudentsStackNav.Screen name="StudentsHome" component={StudentsScreen} options={{ title: 'Students' }} />
      <StudentsStackNav.Screen name="StudentDetail" component={StudentDetailScreen} options={({ route }) => ({ title: route.params?.studentName ?? 'Student' })} />
    </StudentsStackNav.Navigator>
  )
}

function ProgressStack() {
  return (
    <ProgressStackNav.Navigator screenOptions={stackScreenOptions}>
      <ProgressStackNav.Screen name="ProgressHome" component={ProgressScreen} options={{ title: 'Progress' }} />
      <ProgressStackNav.Screen name="StudentDetail" component={StudentDetailScreen} options={({ route }) => ({ title: route.params?.studentName ?? 'Student' })} />
    </ProgressStackNav.Navigator>
  )
}

function MessagesStack() {
  return (
    <MessagesStackNav.Navigator screenOptions={stackScreenOptions}>
      <MessagesStackNav.Screen name="MessagesHome" component={MessagesScreen} options={{ title: 'Messages' }} />
      <MessagesStackNav.Screen name="StudentDetail" component={StudentDetailScreen} options={({ route }) => ({ title: route.params?.studentName ?? 'Student' })} />
    </MessagesStackNav.Navigator>
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
          headerShown: false,
        })}
      >
        <Tab.Screen name="HomeTab" component={HomeStack} options={{ title: 'Home' }} />
        <Tab.Screen name="MyClassesTab" component={MyClassesStack} options={{ title: 'My Classes' }} />
        <Tab.Screen name="StudentsTab" component={StudentsStack} options={{ title: 'Students' }} />
        <Tab.Screen name="LeadsTab" component={LeadsScreen} options={{ title: 'Leads', headerShown: true, headerStyle: { backgroundColor: '#000' }, headerTitleStyle: { color: '#fff', fontWeight: '700' } }} />
        <Tab.Screen name="AssistantTab" component={AssistantScreen} options={{ title: 'Assistant', headerShown: false }} />
        <Tab.Screen name="MessagesTab" component={MessagesStack} options={{ title: 'Messages' }} />
      </Tab.Navigator>
    </InstructorSwitchContext.Provider>
  )
}
