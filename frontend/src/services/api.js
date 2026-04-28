import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Dynamically set API URL based on platform
const getApiUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/api';  // Android emulator
  } else if (Platform.OS === 'ios') {
    return 'http://localhost:3000/api';  // iOS simulator
  } else {
    return 'http://localhost:3000/api';  // Web
  }
};

const API_URL = getApiUrl();

console.log('========================================');
console.log('API Configuration:');
console.log(`Platform: ${Platform.OS}`);
console.log(`API URL: ${API_URL}`);
console.log('========================================');

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.config.url} - Status: ${response.status}`);
    return response;
  },
  async (error) => {
    console.error('API Error:', error.response?.status, error.response?.data);
    
    if (error.code === 'ECONNABORTED') {
      console.error('Connection timeout - server not responding');
      return Promise.reject({ error: 'Connection timeout. Please check if backend server is running.' });
    }
    
    if (error.code === 'ERR_NETWORK') {
      console.error('Network error - cannot reach server');
      return Promise.reject({ error: `Network error. Cannot connect to server at ${API_URL}. Make sure backend is running on port 3000.` });
    }
    
    if (error.response?.status === 401) {
      // Token expired or invalid
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userRole');
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('userEmail');
      await AsyncStorage.removeItem('userName');
      await AsyncStorage.removeItem('userUid');
    }
    
    return Promise.reject(error);
  }
);

// Auth services
export const authService = {
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },
  
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data.success) {
        // Store user data
        await AsyncStorage.setItem('userToken', response.data.token || 'temp-token');
        await AsyncStorage.setItem('userRole', response.data.user.role);
        await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));
        await AsyncStorage.setItem('userEmail', response.data.user.email);
        await AsyncStorage.setItem('userName', response.data.user.name);
        await AsyncStorage.setItem('userUid', response.data.user.uid);
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },
  
  logout: async () => {
    await AsyncStorage.multiRemove(['userToken', 'userRole', 'userData', 'userEmail', 'userName', 'userUid']);
  },
  
  getCurrentUser: async () => {
    const userData = await AsyncStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  },
  
  getUserRole: async () => {
    return await AsyncStorage.getItem('userRole');
  }
};

// Course services
export const courseService = {
  getAll: async () => {
    try {
      const response = await api.get('/courses');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },
  
  create: async (courseData) => {
    try {
      const response = await api.post('/courses', courseData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },
  
  delete: async (courseId) => {
    try {
      const response = await api.delete(`/courses/${courseId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },
  
  assignLecturer: async (courseId, lecturerId) => {
    try {
      const response = await api.put(`/courses/${courseId}/assign`, { lecturerId });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },
  
  unassignLecturer: async (courseId) => {
    try {
      const response = await api.put(`/courses/${courseId}/unassign`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  }
};

// Lecturer services
export const lecturerService = {
  getAll: async () => {
    try {
      const response = await api.get('/lecturers');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },
  
  create: async (lecturerData) => {
    try {
      const response = await api.post('/lecturers', lecturerData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  }
};

// Lecture services
export const lectureService = {
  getAll: async () => {
    try {
      const response = await api.get('/lectures');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },
  
  create: async (lectureData) => {
    try {
      const response = await api.post('/lectures', lectureData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },
  
  updateAttendance: async (lectureId, attendance) => {
    try {
      const response = await api.put(`/lectures/${lectureId}`, { attendance });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  }
};

// Lecturer report services
export const lecturerReportService = {
  getAll: async () => {
    try {
      const response = await api.get('/lecturer-reports');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },
  
  submit: async (reportData) => {
    try {
      const response = await api.post('/lecturer-reports', reportData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },
  
  addFeedback: async (reportId, feedback, reviewerName) => {
    try {
      const response = await api.post(`/lecturer-reports/${reportId}/feedback`, { feedback, reviewerName });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  }
};

// Report services
export const reportService = {
  getAll: async () => {
    try {
      const response = await api.get('/reports');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },
  
  addFeedback: async (reportId, feedback) => {
    try {
      const response = await api.post(`/reports/${reportId}/feedback`, { feedback });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  }
};

// Rating services
export const ratingService = {
  rateCourse: async (courseId, rating, review, raterName, raterRole) => {
    try {
      const response = await api.post('/rate-course', { courseId, rating, review, raterName, raterRole });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },
  
  getCourseRatings: async (courseId) => {
    try {
      const response = await api.get(`/course-ratings/${courseId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },
  
  rateLecturer: async (lecturerId, rating, review, raterName, raterRole) => {
    try {
      const response = await api.post('/rate-lecturer', { lecturerId, rating, review, raterName, raterRole });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },
  
  getLecturerRatings: async (lecturerId) => {
    try {
      const response = await api.get(`/lecturer-ratings/${lecturerId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },
  
  rateLecture: async (lectureId, lectureTitle, rating, review, raterName, raterRole) => {
    try {
      const response = await api.post('/rate-lecture', { lectureId, lectureTitle, rating, review, raterName, raterRole });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },
  
  getLectureRatings: async (lectureId) => {
    try {
      const response = await api.get(`/lecture-ratings/${lectureId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  }
};

// Student attendance services
export const attendanceService = {
  getStudentAttendance: async (studentId) => {
    try {
      const response = await api.get(`/student-attendance/${studentId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },
  
  markAttendance: async (studentId, studentName, lectureId, lectureTitle, status) => {
    try {
      const response = await api.post('/student-attendance/mark', {
        studentId,
        studentName,
        lectureId,
        lectureTitle,
        status,
        date: new Date().toISOString()
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  }
};

// Status services
export const statusService = {
  checkServer: async () => {
    try {
      const response = await api.get('/status');
      return response.data;
    } catch (error) {
      console.error('Server check failed:', error);
      return { firebaseConnected: false, error: error.message };
    }
  },
  
  testConnection: async () => {
    try {
      const response = await api.get('/test');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  }
};

export default api;