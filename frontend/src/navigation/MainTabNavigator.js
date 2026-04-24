import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';

import StudentDashboard from '../screens/StudentDashboard';
import CoursesScreen from '../screens/CoursesScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import RatingScreen from '../screens/RatingScreen';
import SearchScreen from '../screens/SearchScreen';

const Tab = createBottomTabNavigator();

const MainTabNavigator = ({ userRole }) => {
  let screens = [];

  switch(userRole) {
    case 'student':
      screens = [
        { name: 'Dashboard', component: StudentDashboard, icon: 'dashboard' },
        { name: 'Attendance', component: AttendanceScreen, icon: 'check-circle' },
        { name: 'Rating', component: RatingScreen, icon: 'star' },
        { name: 'Search', component: SearchScreen, icon: 'search' }
      ];
      break;
    case 'lecturer':
      screens = [
        { name: 'Dashboard', component: StudentDashboard, icon: 'dashboard' },
        { name: 'Courses', component: CoursesScreen, icon: 'book' },
        { name: 'Search', component: SearchScreen, icon: 'search' }
      ];
      break;
    default:
      screens = [
        { name: 'Dashboard', component: StudentDashboard, icon: 'dashboard' },
        { name: 'Search', component: SearchScreen, icon: 'search' }
      ];
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const screen = screens.find(s => s.name === route.name);
          return <Icon name={screen?.icon || 'circle'} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6200ee',
        tabBarInactiveTintColor: 'gray',
        headerStyle: { backgroundColor: '#6200ee' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' }
      })}
    >
      {screens.map(screen => (
        <Tab.Screen key={screen.name} name={screen.name} component={screen.component} />
      ))}
    </Tab.Navigator>
  );
};

export default MainTabNavigator;