import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Change this based on your platform
// For Android Emulator: http://10.0.2.2:3000/api
// For iOS Simulator: http://localhost:3000/api
// For Web: http://localhost:3000/api
// For Physical Device: http://YOUR_IP:3000/api
const API_URL = Platform.select({
  android: 'http://10.0.2.2:3000/api',
  ios: 'http://localhost:3000/api',
  default: 'http://localhost:3000/api'
});

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleRegister = async () => {
    // Validation checks
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!password) {
      Alert.alert('Error', 'Please enter a password');
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
      console.log('Attempting registration with:', { name, email, role });
      console.log('API URL:', `${API_URL}/auth/register`);
      
      const response = await axios.post(`${API_URL}/auth/register`, {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        role
      });
      
      console.log('Registration response:', response.data);
      
      if (response.data.success) {
        Alert.alert(
          'Registration Successful!',
          `Welcome ${name}! Your account has been created as ${role.toUpperCase()}. Please login to continue.`,
          [
            { 
              text: 'Go to Login', 
              onPress: () => {
                // Clear form
                setName('');
                setEmail('');
                setPassword('');
                setConfirmPassword('');
                setRole('student');
                // Navigate to login
                navigation.replace('Login');
              }
            }
          ]
        );
      } else {
        Alert.alert('Registration Failed', response.data.error || 'Could not create account');
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.code === 'ECONNREFUSED') {
        Alert.alert(
          'Connection Error', 
          'Cannot connect to server. Please make sure:\n\n' +
          '1. Backend is running: cd backend && node server.js\n' +
          '2. Server is running on port 3000\n' +
          '3. For Android emulator, API_URL should be http://10.0.2.2:3000/api\n' +
          '4. Check your firewall settings'
        );
      } else if (error.response?.status === 400 && error.response?.data?.error === 'User already exists') {
        Alert.alert(
          'Registration Failed', 
          'An account with this email already exists. Please login instead.',
          [
            { text: 'Go to Login', onPress: () => navigation.replace('Login') },
            { text: 'Try Again', style: 'cancel' }
          ]
        );
      } else if (error.response?.data?.error) {
        Alert.alert('Registration Failed', error.response.data.error);
      } else if (error.response?.status === 500) {
        Alert.alert('Error', 'Server error. Please try again later.');
      } else {
        Alert.alert('Error', 'Network error. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const demoRegister = async (demoRole) => {
    const demoName = demoRole === 'student' ? 'John Student' :
                     demoRole === 'lecturer' ? 'Jane Lecturer' :
                     demoRole === 'prl' ? 'Robert PRL' : 'Sarah PL';
    const demoEmail = `${demoRole}${Date.now()}@luct.com`; // Unique email each time
    const demoPassword = 'luct';
    
    // Auto-fill the form
    setName(demoName);
    setEmail(demoEmail);
    setPassword(demoPassword);
    setConfirmPassword(demoPassword);
    setRole(demoRole);
    
    // Automatically register
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        name: demoName,
        email: demoEmail,
        password: demoPassword,
        role: demoRole
      });
      
      if (response.data.success) {
        Alert.alert(
          'Demo Account Created!',
          `Email: ${demoEmail}\nPassword: ${demoPassword}\nRole: ${demoRole.toUpperCase()}`,
          [
            { 
              text: 'Go to Login', 
              onPress: () => navigation.replace('Login')
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Demo Registration Failed', 'Please try again');
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
      >
        <View style={styles.card}>
          <Text style={styles.title}>🎓 University Monitoring System</Text>
          <Text style={styles.subtitle}>Create Account</Text>
          
          {/* Full Name Input */}
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          
          {/* Role Selection */}
          <Text style={styles.label}>Select Role:</Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[styles.roleButton, role === 'student' && styles.roleButtonActive]}
              onPress={() => setRole('student')}
            >
              <Text style={role === 'student' ? styles.roleTextActive : styles.roleText}>
                📚 Student
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleButton, role === 'lecturer' && styles.roleButtonActive]}
              onPress={() => setRole('lecturer')}
            >
              <Text style={role === 'lecturer' ? styles.roleTextActive : styles.roleText}>
                👨‍🏫 Lecturer
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleButton, role === 'prl' && styles.roleButtonActive]}
              onPress={() => setRole('prl')}
            >
              <Text style={role === 'prl' ? styles.roleTextActive : styles.roleText}>
                📊 PRL
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleButton, role === 'pl' && styles.roleButtonActive]}
              onPress={() => setRole('pl')}
            >
              <Text style={role === 'pl' ? styles.roleTextActive : styles.roleText}>
                📋 Program Leader
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Email Input */}
          <TextInput
            style={styles.input}
            placeholder="Email Address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          {/* Password Input */}
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Password (min 4 characters)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity 
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.eyeText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
            </TouchableOpacity>
          </View>
          
          {/* Confirm Password Input */}
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity 
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Text style={styles.eyeText}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
            </TouchableOpacity>
          </View>
          
          {/* Register Button */}
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleRegister} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>
          
          {/* Login Link */}
          <TouchableOpacity onPress={() => navigation.replace('Login')}>
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.linkHighlight}>Sign In</Text>
            </Text>
          </TouchableOpacity>
          
          {/* Demo Registration Buttons */}
          <View style={styles.demoContainer}>
            <Text style={styles.demoTitle}>Quick Demo Registration:</Text>
            <View style={styles.demoButtonsContainer}>
              <TouchableOpacity 
                style={[styles.demoButton, { backgroundColor: '#4CAF50' }]}
                onPress={() => demoRegister('student')}
              >
                <Text style={styles.demoButtonText}>Register as Student</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.demoButton, { backgroundColor: '#FF9800' }]}
                onPress={() => demoRegister('lecturer')}
              >
                <Text style={styles.demoButtonText}>Register as Lecturer</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.demoButtonsContainer}>
              <TouchableOpacity 
                style={[styles.demoButton, { backgroundColor: '#9C27B0' }]}
                onPress={() => demoRegister('prl')}
              >
                <Text style={styles.demoButtonText}>Register as PRL</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.demoButton, { backgroundColor: '#F44336' }]}
                onPress={() => demoRegister('pl')}
              >
                <Text style={styles.demoButtonText}>Register as Program Leader</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Server Status */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              🔧 Server: {API_URL}
            </Text>
            <Text style={styles.infoText}>
              💡 Demo accounts use password: "luct"
            </Text>
            <Text style={styles.infoText}>
              ⚡ Make sure backend server is running on port 3000
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 30,
    width: '100%',
    maxWidth: 450,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#6200ee',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  passwordInput: {
    flex: 1,
    paddingRight: 45,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  eyeText: {
    fontSize: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  roleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
    gap: 8,
  },
  roleButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#6200ee',
    backgroundColor: '#fff',
  },
  roleButtonActive: {
    backgroundColor: '#6200ee',
  },
  roleText: {
    color: '#6200ee',
    fontSize: 14,
  },
  roleTextActive: {
    color: '#fff',
  },
  button: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
    fontSize: 14,
  },
  linkHighlight: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  demoContainer: {
    marginTop: 25,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#666',
    textAlign: 'center',
  },
  demoButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  demoButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  demoButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoContainer: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  infoText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginBottom: 4,
  },
});

export default RegisterScreen;