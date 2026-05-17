import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text } from 'react-native'
import DashboardScreen from '../screens/student/DashboardScreen'
import BookScreen from '../screens/student/BookScreen'
import MyClassesScreen from '../screens/student/MyClassesScreen'
import SupportScreen from '../screens/student/SupportScreen'
import AccountScreen from '../screens/student/AccountScreen'

const Tab = createBottomTabNavigator()

const ICONS = {
  Dashboard: '🏠', Book: '📅', MyClasses: '📋', Support: '💬', Account: '👤',
}

function Icon({ name, focused }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{ICONS[name]}</Text>
}

export default function StudentTabs() {
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
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Book" component={BookScreen} options={{ title: 'Book' }} />
      <Tab.Screen name="MyClasses" component={MyClassesScreen} options={{ title: 'My Classes' }} />
      <Tab.Screen name="Support" component={SupportScreen} options={{ title: 'Support' }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: 'Account' }} />
    </Tab.Navigator>
  )
}
