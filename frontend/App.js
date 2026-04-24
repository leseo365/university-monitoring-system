import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import StudentDashboard from './src/screens/student/StudentDashboard';
import LecturerDashboard from './src/screens/lecturer/LecturerDashboard';
import LecturerReportForm from './src/screens/lecturer/LecturerReportForm';
import PRLDashboard from './src/screens/prl/PRLDashboard';
import PLDashboard from './src/screens/pl/PLDashboard';

const Stack = createStackNavigator();

export default function App() {
  return (
    <PaperProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {/* Auth Screens */}
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          
          {/* Student Screens */}
          <Stack.Screen name="StudentDashboard" component={StudentDashboard} />
          
          {/* Lecturer Screens */}
          <Stack.Screen name="LecturerDashboard" component={LecturerDashboard} />
          <Stack.Screen name="LecturerReportForm" component={LecturerReportForm} />
          
          {/* PRL Screens */}
          <Stack.Screen name="PRLDashboard" component={PRLDashboard} />
          
          {/* PL Screens */}
          <Stack.Screen name="PLDashboard" component={PLDashboard} />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}