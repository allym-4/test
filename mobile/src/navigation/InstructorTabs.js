import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text } from 'react-native'
import AttendanceScreen from '../screens/instructor/AttendanceScreen'
import EnrolmentsScreen from '../screens/instructor/EnrolmentsScreen'
import AccountScreen from '../screens/student/AccountScreen'

const Tab = createBottomTabNavigator()

const ICONS = { Attendance: '✅', Enrolments: '👥', Account: '👤' }

function Icon({ name, focused }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{ICONS[name]}</Text>
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
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: 'Account' }} />
    </Tab.Navigator>
  )
}
