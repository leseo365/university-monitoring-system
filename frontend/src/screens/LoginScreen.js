import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
  KeyboardAvoidingView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, statusService } from '../services/api';

const LoginScreen = ({ navigation }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('student');
  const [loading, setLoading] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Check backend connection on mount
  React.useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      console.log('Checking server connection...');
      const status = await statusService.checkServer();
      console.log('Server status:', status);
      if (status.firebaseConnected === false) {
        Alert.alert('Warning', 'Backend is running but Firebase not connected. Some features may not work.');
      } else {
        console.log('Server connection successful!');
      }
    } catch (error) {
      console.error('Server connection failed:', error);
      Alert.alert(
        'Connection Error',
        'Cannot connect to server.\n\nMake sure:\n1. Backend is running\n2. Check your internet connection'
      );
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      console.log('Login attempt:', { email: email.toLowerCase() });
      
      const response = await authService.login(email.toLowerCase().trim(), password);
      
      console.log('Login response:', response);
      
      if (response.success) {
        Alert.alert('Success', `Welcome back, ${response.user.name}!`);
        
        const userRole = response.user.role;
        console.log('Navigating to dashboard for role:', userRole);
        
        // Navigate based on role
        if (userRole === 'student') {
          navigation.replace('StudentDashboard');
        } else if (userRole === 'lecturer') {
          navigation.replace('LecturerDashboard');
        } else if (userRole === 'prl') {
          navigation.replace('PRLDashboard');
        } else if (userRole === 'pl') {
          navigation.replace('PLDashboard');
        } else {
          console.log('Unknown role, defaulting to StudentDashboard');
          navigation.replace('StudentDashboard');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.error === 'User not found') {
        Alert.alert(
          'Account Not Found',
          'No account found with this email. Would you like to register?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Register Now', 
              onPress: () => {
                setIsLogin(false);
                setEmail(email);
              }
            }
          ]
        );
      } else if (error.error === 'Invalid password') {
        Alert.alert('Login Failed', 'Invalid password. Please try again.');
      } else if (error.error && error.error.includes('timeout')) {
        Alert.alert('Connection Error', 'Request timed out. Please check your internet connection.');
      } else if (error.error && error.error.includes('Network error')) {
        Alert.alert('Network Error', 'Cannot connect to server. Please check your network.');
      } else {
        Alert.alert('Login Failed', error.error || 'Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (password.length < 4) {
      Alert.alert('Error', 'Password must be at least 4 characters');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      console.log('Registration attempt:', { name, email: email.toLowerCase(), role: selectedRole });
      
      const response = await authService.register({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        role: selectedRole
      });
      
      console.log('Registration response:', response);
      
      if (response.success) {
        Alert.alert(
          'Registration Successful!',
          `Welcome ${name}! Your ${selectedRole.toUpperCase()} account has been created.\n\nPlease login with your credentials.`,
          [
            { 
              text: 'Go to Login', 
              onPress: () => {
                setIsLogin(true);
                setName('');
                setEmail('');
                setPassword('');
                setConfirmPassword('');
                setSelectedRole('student');
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.error === 'User already exists') {
        Alert.alert(
          'Registration Failed',
          'An account with this email already exists. Please login instead.',
          [
            { text: 'Go to Login', onPress: () => setIsLogin(true) },
            { text: 'Try Again', style: 'cancel' }
          ]
        );
      } else if (error.error && error.error.includes('timeout')) {
        Alert.alert('Connection Error', 'Request timed out. Please check your internet connection.');
      } else if (error.error && error.error.includes('Network error')) {
        Alert.alert('Network Error', 'Cannot connect to server. Please check your network.');
      } else {
        Alert.alert('Registration Failed', error.error || 'Could not create account');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>...</Text>
            <Text style={styles.title}>Limkokwing University</Text>
            <Text style={styles.subtitle}>Monitoring System</Text>
          </View>

          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, isLogin && styles.activeToggle]}
              onPress={() => setIsLogin(true)}
            >
              <Text style={[styles.toggleText, isLogin && styles.activeToggleText]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, !isLogin && styles.activeToggle]}
              onPress={() => setIsLogin(false)}
            >
              <Text style={[styles.toggleText, !isLogin && styles.activeToggleText]}>Create Account</Text>
            </TouchableOpacity>
          </View>

          {!isLogin ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={name}
                onChangeText={setName}
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Select Role:</Text>
              <View style={styles.roleButtonsContainer}>
                {[
                  { role: 'student', label: 'Student' },
                  { role: 'lecturer', label: 'Lecturer' },
                  { role: 'prl', label: 'PRL' },
                  { role: 'pl', label: 'Program Leader' }
                ].map((item) => (
                  <TouchableOpacity
                    key={item.role}
                    style={[
                      styles.roleSelectButton,
                      selectedRole === item.role && styles.roleSelectActive
                    ]}
                    onPress={() => setSelectedRole(item.role)}
                  >
                    <Text style={[
                      styles.roleSelectText,
                      selectedRole === item.role && styles.roleSelectTextActive
                    ]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.input}
                placeholder="Email Address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor="#999"
              />
              
              <TextInput
                style={styles.input}
                placeholder="Password (min 4 characters)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor="#999"
              />
              
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholderTextColor="#999"
              />
              
              <TouchableOpacity 
                style={styles.registerButton} 
                onPress={handleRegister} 
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.registerButtonText}>Create Account</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.switchLink} onPress={() => setIsLogin(true)}>
                <Text style={styles.switchText}>Already have an account? <Text style={styles.switchHighlight}>Sign In</Text></Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor="#999"
              />
              
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor="#999"
              />
              
              <TouchableOpacity 
                style={styles.loginButton} 
                onPress={handleLogin} 
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginButtonText}>Sign In</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.switchLink} onPress={() => setIsLogin(false)}>
                <Text style={styles.switchText}>Don't have an account? <Text style={styles.switchHighlight}>Create Account</Text></Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              {isLogin 
                ? "Enter your email and password to access your account" 
                : "Create a new account to access the University Monitoring System"}
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 25, width: '100%', maxWidth: 450, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 },
  logoContainer: { alignItems: 'center', marginBottom: 25 },
  logoText: { fontSize: 18, fontWeight: 'bold', color: '#6200ee', marginBottom: 5 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', color: '#6200ee' },
  subtitle: { fontSize: 13, textAlign: 'center', color: '#666', marginTop: 3 },
  toggleContainer: { flexDirection: 'row', backgroundColor: '#f0f0f0', borderRadius: 30, marginBottom: 25, padding: 4 },
  toggleButton: { flex: 1, paddingVertical: 12, borderRadius: 25, alignItems: 'center' },
  activeToggle: { backgroundColor: '#6200ee' },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#666' },
  activeToggleText: { color: '#fff' },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 10, marginTop: 5 },
  roleButtonsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  roleSelectButton: { width: '48%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, marginBottom: 10, backgroundColor: '#f9f9f9' },
  roleSelectActive: { borderColor: '#6200ee', backgroundColor: '#f3e5f5' },
  roleSelectText: { fontSize: 13, fontWeight: '500', color: '#666' },
  roleSelectTextActive: { color: '#6200ee' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, marginBottom: 15, fontSize: 15, backgroundColor: '#fff' },
  loginButton: { backgroundColor: '#6200ee', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 10 },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  registerButton: { backgroundColor: '#4CAF50', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 10 },
  registerButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  switchLink: { marginTop: 20, alignItems: 'center' },
  switchText: { fontSize: 14, color: '#666' },
  switchHighlight: { color: '#6200ee', fontWeight: 'bold' },
  infoContainer: { marginTop: 25, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#eee' },
  infoText: { fontSize: 12, color: '#999', textAlign: 'center' },
});

export default LoginScreen;