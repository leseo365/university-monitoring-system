import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Card, Title, Paragraph } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// API URL based on platform
const API_URL = Platform.select({
  android: 'http://10.0.2.2:3000/api',
  ios: 'http://localhost:3000/api',
  default: 'http://localhost:3000/api'
});

const PLDashboard = ({ navigation }) => {
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [courses, setCourses] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [reports, setReports] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [selectedStream, setSelectedStream] = useState('all');
  const [activeTab, setActiveTab] = useState('courses');
  
  // Course Ratings
  const [courseRatings, setCourseRatings] = useState({});
  const [lecturerRatings, setLecturerRatings] = useState({});
  
  // Add Course Modal
  const [addCourseModalVisible, setAddCourseModalVisible] = useState(false);
  const [addingCourse, setAddingCourse] = useState(false);
  const [newCourse, setNewCourse] = useState({
    name: '',
    code: '',
    description: '',
    stream: '',
    credits: '',
    semester: ''
  });
  
  // Add Lecturer Modal
  const [addLecturerModalVisible, setAddLecturerModalVisible] = useState(false);
  const [addingLecturer, setAddingLecturer] = useState(false);
  const [newLecturer, setNewLecturer] = useState({
    name: '',
    email: '',
    department: '',
    specialization: ''
  });
  
  // Add Lecture Modal
  const [addLectureModalVisible, setAddLectureModalVisible] = useState(false);
  const [addingLecture, setAddingLecture] = useState(false);
  const [newLecture, setNewLecture] = useState({
    title: '',
    courseId: '',
    date: '',
    time: '',
    venue: '',
    lecturerId: '',
    totalStudents: ''
  });
  
  // Assign Lecturer Modal
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assignCourseId, setAssignCourseId] = useState('');
  const [selectedLecturerId, setSelectedLecturerId] = useState('');
  
  // Report Feedback Modal
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  
  // Rating Modals
  const [courseRatingModalVisible, setCourseRatingModalVisible] = useState(false);
  const [selectedCourseRating, setSelectedCourseRating] = useState(null);
  const [courseRatingValue, setCourseRatingValue] = useState(5);
  const [courseRatingReview, setCourseRatingReview] = useState('');
  const [submittingCourseRating, setSubmittingCourseRating] = useState(false);
  
  const [lecturerRatingModalVisible, setLecturerRatingModalVisible] = useState(false);
  const [selectedLecturerRating, setSelectedLecturerRating] = useState(null);
  const [lecturerRatingValue, setLecturerRatingValue] = useState(5);
  const [lecturerRatingReview, setLecturerRatingReview] = useState('');
  const [submittingLecturerRating, setSubmittingLecturerRating] = useState(false);
  
  // Detail Modals
  const [reportDetailVisible, setReportDetailVisible] = useState(false);
  const [lectureDetailVisible, setLectureDetailVisible] = useState(false);
  const [selectedLectureDetail, setSelectedLectureDetail] = useState(null);

  const streams = ['all', 'Computing', 'Creative Arts', 'Business', 'Engineering', 'Design'];

  useEffect(() => {
    loadUserData();
    loadAllData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setUserName(user.name || 'PL');
        setUserEmail(user.email || '');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadCourses(),
      loadLecturers(),
      loadLectures(),
      loadReports(),
      loadRatings()
    ]);
    setLoading(false);
  };

  const loadCourses = async () => {
    try {
      const response = await axios.get(`${API_URL}/courses`);
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error('Error loading courses:', error);
      Alert.alert('Error', 'Failed to load courses');
    }
  };

  const loadLecturers = async () => {
    try {
      const response = await axios.get(`${API_URL}/lecturers`);
      setLecturers(response.data.lecturers || []);
    } catch (error) {
      console.error('Error loading lecturers:', error);
    }
  };

  const loadLectures = async () => {
    try {
      const response = await axios.get(`${API_URL}/lectures`);
      setLectures(response.data.lectures || []);
    } catch (error) {
      console.error('Error loading lectures:', error);
    }
  };

  const loadReports = async () => {
    try {
      const response = await axios.get(`${API_URL}/reports`);
      setReports(response.data.reports || []);
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  const loadRatings = async () => {
    try {
      for (const course of courses) {
        const response = await axios.get(`${API_URL}/course-ratings/${course.id}`);
        setCourseRatings(prev => ({
          ...prev,
          [course.id]: response.data
        }));
      }
      
      for (const lecturer of lecturers) {
        const response = await axios.get(`${API_URL}/lecturer-ratings/${lecturer.id}`);
        setLecturerRatings(prev => ({
          ...prev,
          [lecturer.id]: response.data
        }));
      }
    } catch (error) {
      console.error('Error loading ratings:', error);
    }
  };

  const getCourseAverageRating = (courseId) => {
    const ratingData = courseRatings[courseId];
    if (!ratingData || ratingData.avgRating === 0) return '0';
    return ratingData.avgRating.toFixed(1);
  };

  const getLecturerAverageRating = (lecturerId) => {
    const ratingData = lecturerRatings[lecturerId];
    if (!ratingData || ratingData.avgRating === 0) return '0';
    return ratingData.avgRating.toFixed(1);
  };

  const getFilteredCourses = () => {
    if (selectedStream === 'all') return courses;
    return courses.filter(c => c.stream === selectedStream);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.clear();
          navigation.replace('Login');
        }
      }
    ]);
  };

  const addCourse = async () => {
    if (!newCourse.name || !newCourse.code || !newCourse.stream) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setAddingCourse(true);
    try {
      const response = await axios.post(`${API_URL}/courses`, newCourse);
      if (response.data.success) {
        await loadCourses();
        Alert.alert('Success', `Course "${newCourse.name}" added successfully!`);
        setAddCourseModalVisible(false);
        setNewCourse({ name: '', code: '', description: '', stream: '', credits: '', semester: '' });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add course');
    } finally {
      setAddingCourse(false);
    }
  };

  const deleteCourse = async (courseId, courseName) => {
    Alert.alert(
      'Delete Course',
      `Delete "${courseName}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_URL}/courses/${courseId}`);
              await loadCourses();
              Alert.alert('Success', 'Course deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete course');
            }
          }
        }
      ]
    );
  };

  const addLecturer = async () => {
    if (!newLecturer.name || !newLecturer.email) {
      Alert.alert('Error', 'Name and email are required');
      return;
    }

    setAddingLecturer(true);
    try {
      const response = await axios.post(`${API_URL}/lecturers`, newLecturer);
      if (response.data.success) {
        await loadLecturers();
        Alert.alert('Success', `Lecturer "${newLecturer.name}" added successfully!`);
        setAddLecturerModalVisible(false);
        setNewLecturer({ name: '', email: '', department: '', specialization: '' });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add lecturer');
    } finally {
      setAddingLecturer(false);
    }
  };

  const addLecture = async () => {
    if (!newLecture.title || !newLecture.courseId || !newLecture.date || !newLecture.time || !newLecture.venue) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setAddingLecture(true);
    try {
      const response = await axios.post(`${API_URL}/lectures`, newLecture);
      if (response.data.success) {
        await loadLectures();
        Alert.alert('Success', `Lecture "${newLecture.title}" added successfully!`);
        setAddLectureModalVisible(false);
        setNewLecture({ title: '', courseId: '', date: '', time: '', venue: '', lecturerId: '', totalStudents: '' });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add lecture');
    } finally {
      setAddingLecture(false);
    }
  };

  const openAssignModal = () => {
    setAssignCourseId('');
    setSelectedLecturerId('');
    setAssignModalVisible(true);
  };

  const assignLecturerToCourse = async () => {
    if (!assignCourseId || !selectedLecturerId) {
      Alert.alert('Error', 'Please select a course and a lecturer');
      return;
    }

    setAssigning(true);
    try {
      const response = await axios.put(`${API_URL}/courses/${assignCourseId}/assign`, {
        lecturerId: selectedLecturerId
      });
      if (response.data.success) {
        await loadCourses();
        Alert.alert('Success', 'Lecturer assigned successfully!');
        setAssignModalVisible(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to assign lecturer');
    } finally {
      setAssigning(false);
    }
  };

  const unassignLecturer = async (courseId, courseName, lecturerName) => {
    Alert.alert(
      'Unassign Lecturer',
      `Unassign ${lecturerName} from "${courseName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unassign',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.put(`${API_URL}/courses/${courseId}/unassign`);
              await loadCourses();
              Alert.alert('Success', 'Lecturer unassigned successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to unassign lecturer');
            }
          }
        }
      ]
    );
  };

  const submitFeedback = async () => {
    if (!feedbackText.trim()) {
      Alert.alert('Error', 'Please enter feedback');
      return;
    }

    setSubmittingFeedback(true);
    try {
      await axios.post(`${API_URL}/reports/${selectedReport.id}/feedback`, {
        feedback: feedbackText,
        reviewerName: userName
      });
      await loadReports();
      Alert.alert('Success', 'Feedback submitted successfully');
      setFeedbackModalVisible(false);
      setFeedbackText('');
      setSelectedReport(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const submitCourseRating = async () => {
    if (!selectedCourseRating) return;
    
    setSubmittingCourseRating(true);
    try {
      await axios.post(`${API_URL}/rate-course`, {
        courseId: selectedCourseRating.id,
        rating: courseRatingValue,
        review: courseRatingReview,
        raterName: userName,
        raterRole: 'pl'
      });
      
      await loadRatings();
      Alert.alert('Success', `Thank you for rating "${selectedCourseRating.name}"!`);
      
      setCourseRatingModalVisible(false);
      setCourseRatingValue(5);
      setCourseRatingReview('');
      setSelectedCourseRating(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit rating');
    } finally {
      setSubmittingCourseRating(false);
    }
  };

  const submitLecturerRating = async () => {
    if (!selectedLecturerRating) return;
    
    setSubmittingLecturerRating(true);
    try {
      await axios.post(`${API_URL}/rate-lecturer`, {
        lecturerId: selectedLecturerRating.id,
        rating: lecturerRatingValue,
        review: lecturerRatingReview,
        raterName: userName,
        raterRole: 'pl'
      });
      
      await loadRatings();
      Alert.alert('Success', `Thank you for rating ${selectedLecturerRating.name}!`);
      
      setLecturerRatingModalVisible(false);
      setLecturerRatingValue(5);
      setLecturerRatingReview('');
      setSelectedLecturerRating(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit rating');
    } finally {
      setSubmittingLecturerRating(false);
    }
  };

  const renderRatingStars = (currentRating, onRatingChange, size = 40) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity key={star} onPress={() => onRatingChange(star)}>
            <Text style={[styles.ratingStar, { fontSize: size }, currentRating >= star && styles.ratingStarSelected]}>
              {currentRating >= star ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getRatingStars = (rating) => {
    const numRating = parseFloat(rating) || 0;
    return '★'.repeat(Math.round(numRating)) + '☆'.repeat(5 - Math.round(numRating));
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const filteredCourses = getFilteredCourses();
  const unassignedCourses = filteredCourses.filter(c => !c.lecturerId);
  const assignedCourses = filteredCourses.filter(c => c.lecturerId);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.userName}>{userName}</Text>
              <Text style={styles.userRole}>Program Leader (PL)</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Text style={styles.logoutText}>🚪 Logout</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>Manage Courses, Assign Lecturers & Monitor Progress</Text>
        </View>

        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Card.Content>
              <Title style={styles.statNumber}>{courses.length}</Title>
              <Paragraph>Total Courses</Paragraph>
            </Card.Content>
          </Card>
          <Card style={styles.statCard}>
            <Card.Content>
              <Title style={styles.statNumber}>{lecturers.length}</Title>
              <Paragraph>Lecturers</Paragraph>
            </Card.Content>
          </Card>
          <Card style={styles.statCard}>
            <Card.Content>
              <Title style={styles.statNumber}>{unassignedCourses.length}</Title>
              <Paragraph>Unassigned</Paragraph>
            </Card.Content>
          </Card>
          <Card style={styles.statCard}>
            <Card.Content>
              <Title style={styles.statNumber}>{lectures.length}</Title>
              <Paragraph>Lectures</Paragraph>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.tabContainer}>
          {['courses', 'lectures', 'reports', 'rating'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab === 'courses' && '📚 Courses'}
                {tab === 'lectures' && '📖 Lectures'}
                {tab === 'reports' && '📋 Reports'}
                {tab === 'rating' && '⭐ Rating'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'courses' && (
          <>
            <View style={styles.filterContainer}>
              <Text style={styles.filterLabel}>Filter by Stream:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                {streams.map(stream => (
                  <TouchableOpacity
                    key={stream}
                    style={[styles.filterChip, selectedStream === stream && styles.filterChipActive]}
                    onPress={() => setSelectedStream(stream)}
                  >
                    <Text style={[styles.filterChipText, selectedStream === stream && styles.filterChipTextActive]}>
                      {stream === 'all' ? 'All Streams' : stream}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#4CAF50' }]} onPress={() => setAddCourseModalVisible(true)}>
                <Text style={styles.actionButtonText}>➕ Add New Course</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#2196F3', marginTop: 10 }]} onPress={() => setAddLecturerModalVisible(true)}>
                <Text style={styles.actionButtonText}>👨‍🏫 Add New Lecturer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#FF9800', marginTop: 10 }]} onPress={openAssignModal}>
                <Text style={styles.actionButtonText}>📋 Assign Lecturer to Course</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Title style={styles.sectionTitle}>📋 Unassigned Courses</Title>
              {unassignedCourses.length === 0 ? (
                <Card style={styles.emptyCard}><Card.Content><Paragraph style={styles.emptyText}>No unassigned courses</Paragraph></Card.Content></Card>
              ) : (
                unassignedCourses.map(course => (
                  <Card key={course.id} style={styles.courseCard}>
                    <Card.Content>
                      <View style={styles.cardHeader}>
                        <Title>{course.name}</Title>
                        <TouchableOpacity onPress={() => deleteCourse(course.id, course.name)}>
                          <Text style={styles.deleteText}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                      <Paragraph>📚 Code: {course.code}</Paragraph>
                      <Paragraph>🎯 Stream: {course.stream}</Paragraph>
                      <Paragraph>📖 Credits: {course.credits}</Paragraph>
                      <Paragraph>📅 Semester: {course.semester}</Paragraph>
                    </Card.Content>
                  </Card>
                ))
              )}
            </View>

            <View style={styles.section}>
              <Title style={styles.sectionTitle}>✅ Assigned Courses</Title>
              {assignedCourses.length === 0 ? (
                <Card style={styles.emptyCard}><Card.Content><Paragraph style={styles.emptyText}>No assigned courses yet</Paragraph></Card.Content></Card>
              ) : (
                assignedCourses.map(course => {
                  const lecturer = lecturers.find(l => l.id === course.lecturerId);
                  return (
                    <Card key={course.id} style={styles.courseCard}>
                      <Card.Content>
                        <View style={styles.cardHeader}>
                          <Title>{course.name}</Title>
                          <TouchableOpacity onPress={() => unassignLecturer(course.id, course.name, course.lecturerName)}>
                            <Text style={styles.unassignText}>🔄</Text>
                          </TouchableOpacity>
                        </View>
                        <Paragraph>📚 Code: {course.code}</Paragraph>
                        <Paragraph>🎯 Stream: {course.stream}</Paragraph>
                        <View style={styles.assignedInfo}>
                          <Text style={styles.assignedLabel}>👨‍🏫 Lecturer:</Text>
                          <Text style={styles.assignedValue}>{lecturer?.name || course.lecturerName}</Text>
                        </View>
                      </Card.Content>
                    </Card>
                  );
                })
              )}
            </View>
          </>
        )}

        {activeTab === 'lectures' && (
          <View style={styles.section}>
            <View style={styles.actionButtons}>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#4CAF50' }]} onPress={() => setAddLectureModalVisible(true)}>
                <Text style={styles.actionButtonText}>📖 Add New Lecture/Module</Text>
              </TouchableOpacity>
            </View>
            <Title style={styles.sectionTitle}>📖 All Lectures & Modules</Title>
            {lectures.length === 0 ? (
              <Card style={styles.emptyCard}><Card.Content><Paragraph style={styles.emptyText}>No lectures added yet</Paragraph></Card.Content></Card>
            ) : (
              lectures.map(lecture => (
                <Card key={lecture.id} style={styles.lectureCard}>
                  <Card.Content>
                    <Title>{lecture.title}</Title>
                    <Paragraph>👨‍🏫 Lecturer: {lecture.lecturerName || 'Not assigned'}</Paragraph>
                    <Paragraph>📅 Date: {lecture.date}</Paragraph>
                    <Paragraph>⏰ Time: {lecture.time}</Paragraph>
                    <Paragraph>📍 Venue: {lecture.venue}</Paragraph>
                    <TouchableOpacity style={styles.viewDetailsButton} onPress={() => { setSelectedLectureDetail(lecture); setLectureDetailVisible(true); }}>
                      <Text style={styles.viewDetailsButtonText}>🔍 View Details</Text>
                    </TouchableOpacity>
                  </Card.Content>
                </Card>
              ))
            )}
          </View>
        )}

        {activeTab === 'reports' && (
          <View style={styles.section}>
            <Title style={styles.sectionTitle}>📋 PRL Reports</Title>
            {reports.length === 0 ? (
              <Card style={styles.emptyCard}><Card.Content><Paragraph style={styles.emptyText}>No reports available</Paragraph></Card.Content></Card>
            ) : (
              reports.map(report => (
                <Card key={report.id} style={styles.reportCard}>
                  <Card.Content>
                    <View style={styles.reportHeader}>
                      <Title style={styles.reportTitle}>{report.title}</Title>
                      <View style={[styles.statusBadge, { backgroundColor: report.status === 'reviewed' ? '#4CAF50' : '#FF9800' }]}>
                        <Text style={styles.statusText}>{report.status?.toUpperCase() || 'PENDING'}</Text>
                      </View>
                    </View>
                    <Paragraph>👤 Submitted by: {report.submittedBy}</Paragraph>
                    <Paragraph>📅 Date: {new Date(report.submittedAt).toLocaleDateString()}</Paragraph>
                    <Paragraph numberOfLines={2}>{report.content}</Paragraph>
                    {report.feedback ? (
                      <View style={styles.feedbackContainer}>
                        <Text style={styles.feedbackLabel}>Your Feedback:</Text>
                        <Text style={styles.feedbackText}>{report.feedback}</Text>
                      </View>
                    ) : report.status !== 'reviewed' && (
                      <TouchableOpacity style={styles.feedbackButton} onPress={() => { setSelectedReport(report); setFeedbackModalVisible(true); }}>
                        <Text style={styles.feedbackButtonText}>💬 Add Feedback</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.viewReportButton} onPress={() => { setSelectedReport(report); setReportDetailVisible(true); }}>
                      <Text style={styles.viewReportButtonText}>📄 View Full Report</Text>
                    </TouchableOpacity>
                  </Card.Content>
                </Card>
              ))
            )}
          </View>
        )}

        {activeTab === 'rating' && (
          <>
            <View style={styles.section}>
              <Title style={styles.sectionTitle}>⭐ Rate Courses</Title>
              {courses.map(course => {
                const avgRating = getCourseAverageRating(course.id);
                return (
                  <Card key={course.id} style={styles.courseCard}>
                    <Card.Content>
                      <View style={styles.cardHeader}>
                        <Title>{course.name}</Title>
                        <View style={styles.ratingContainer}>
                          <Text style={styles.avgRating}>{getRatingStars(avgRating)}</Text>
                          <Text style={styles.avgRatingText}> ({avgRating})</Text>
                        </View>
                      </View>
                      <Paragraph>Code: {course.code}</Paragraph>
                      <TouchableOpacity style={styles.rateButton} onPress={() => { setSelectedCourseRating(course); setCourseRatingModalVisible(true); }}>
                        <Text style={styles.rateButtonText}>⭐ Rate This Course</Text>
                      </TouchableOpacity>
                    </Card.Content>
                  </Card>
                );
              })}
            </View>

            <View style={styles.section}>
              <Title style={styles.sectionTitle}>⭐ Rate Lecturers</Title>
              {lecturers.map(lecturer => {
                const avgRating = getLecturerAverageRating(lecturer.id);
                return (
                  <Card key={lecturer.id} style={styles.lecturerCard}>
                    <Card.Content>
                      <View style={styles.cardHeader}>
                        <Title>{lecturer.name}</Title>
                        <View style={styles.ratingContainer}>
                          <Text style={styles.avgRating}>{getRatingStars(avgRating)}</Text>
                          <Text style={styles.avgRatingText}> ({avgRating})</Text>
                        </View>
                      </View>
                      <Paragraph>📚 Department: {lecturer.department || 'Not specified'}</Paragraph>
                      <TouchableOpacity style={styles.rateButton} onPress={() => { setSelectedLecturerRating(lecturer); setLecturerRatingModalVisible(true); }}>
                        <Text style={styles.rateButtonText}>⭐ Rate This Lecturer</Text>
                      </TouchableOpacity>
                    </Card.Content>
                  </Card>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* Add Course Modal */}
      <Modal visible={addCourseModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalWrapper}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Course</Text>
              <TouchableOpacity onPress={() => setAddCourseModalVisible(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollContent}>
              <TextInput style={styles.modalInput} placeholder="Course Name *" value={newCourse.name} onChangeText={(text) => setNewCourse({...newCourse, name: text})} />
              <TextInput style={styles.modalInput} placeholder="Course Code *" value={newCourse.code} onChangeText={(text) => setNewCourse({...newCourse, code: text})} />
              <TextInput style={[styles.modalInput, styles.textArea]} placeholder="Description" value={newCourse.description} onChangeText={(text) => setNewCourse({...newCourse, description: text})} multiline />
              <Text style={styles.modalLabel}>Stream *</Text>
              <View style={styles.streamContainer}>
                {['Computing', 'Creative Arts', 'Business', 'Engineering', 'Design'].map(stream => (
                  <TouchableOpacity key={stream} style={[styles.streamChip, newCourse.stream === stream && styles.streamChipActive]} onPress={() => setNewCourse({...newCourse, stream})}>
                    <Text style={[styles.streamChipText, newCourse.stream === stream && styles.streamChipTextActive]}>{stream}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={styles.modalInput} placeholder="Credits" value={newCourse.credits} onChangeText={(text) => setNewCourse({...newCourse, credits: text})} keyboardType="numeric" />
              <TextInput style={styles.modalInput} placeholder="Semester" value={newCourse.semester} onChangeText={(text) => setNewCourse({...newCourse, semester: text})} keyboardType="numeric" />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setAddCourseModalVisible(false)}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.submitButton]} onPress={addCourse} disabled={addingCourse}>{addingCourse ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitButtonText}>Add Course</Text>}</TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Lecturer Modal */}
      <Modal visible={addLecturerModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalWrapper}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Lecturer</Text>
              <TouchableOpacity onPress={() => setAddLecturerModalVisible(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollContent}>
              <TextInput style={styles.modalInput} placeholder="Full Name *" value={newLecturer.name} onChangeText={(text) => setNewLecturer({...newLecturer, name: text})} />
              <TextInput style={styles.modalInput} placeholder="Email *" value={newLecturer.email} onChangeText={(text) => setNewLecturer({...newLecturer, email: text})} keyboardType="email-address" />
              <TextInput style={styles.modalInput} placeholder="Department" value={newLecturer.department} onChangeText={(text) => setNewLecturer({...newLecturer, department: text})} />
              <TextInput style={styles.modalInput} placeholder="Specialization" value={newLecturer.specialization} onChangeText={(text) => setNewLecturer({...newLecturer, specialization: text})} />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setAddLecturerModalVisible(false)}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.submitButton]} onPress={addLecturer} disabled={addingLecturer}>{addingLecturer ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitButtonText}>Add Lecturer</Text>}</TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Lecture Modal */}
      <Modal visible={addLectureModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalWrapper}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Lecture/Module</Text>
              <TouchableOpacity onPress={() => setAddLectureModalVisible(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollContent}>
              <TextInput style={styles.modalInput} placeholder="Lecture Title *" value={newLecture.title} onChangeText={(text) => setNewLecture({...newLecture, title: text})} />
              <Text style={styles.modalLabel}>Select Course *</Text>
              <View style={styles.selectContainer}>
                {courses.map(course => (
                  <TouchableOpacity key={course.id} style={[styles.selectOption, newLecture.courseId === course.id && styles.selectOptionActive]} onPress={() => setNewLecture({...newLecture, courseId: course.id})}>
                    <Text style={[styles.selectOptionText, newLecture.courseId === course.id && styles.selectOptionTextActive]}>{course.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={styles.modalInput} placeholder="Date (YYYY-MM-DD) *" value={newLecture.date} onChangeText={(text) => setNewLecture({...newLecture, date: text})} />
              <TextInput style={styles.modalInput} placeholder="Time *" value={newLecture.time} onChangeText={(text) => setNewLecture({...newLecture, time: text})} />
              <TextInput style={styles.modalInput} placeholder="Venue *" value={newLecture.venue} onChangeText={(text) => setNewLecture({...newLecture, venue: text})} />
              <Text style={styles.modalLabel}>Select Lecturer (Optional)</Text>
              <View style={styles.selectContainer}>
                {lecturers.map(lecturer => (
                  <TouchableOpacity key={lecturer.id} style={[styles.selectOption, newLecture.lecturerId === lecturer.id && styles.selectOptionActive]} onPress={() => setNewLecture({...newLecture, lecturerId: lecturer.id})}>
                    <Text style={[styles.selectOptionText, newLecture.lecturerId === lecturer.id && styles.selectOptionTextActive]}>{lecturer.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={styles.modalInput} placeholder="Total Students" value={newLecture.totalStudents} onChangeText={(text) => setNewLecture({...newLecture, totalStudents: text})} keyboardType="numeric" />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setAddLectureModalVisible(false)}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.submitButton]} onPress={addLecture} disabled={addingLecture}>{addingLecture ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitButtonText}>Add Lecture</Text>}</TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Assign Lecturer Modal */}
      <Modal visible={assignModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalWrapper}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Lecturer to Course</Text>
              <TouchableOpacity onPress={() => setAssignModalVisible(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollContent}>
              <Text style={styles.modalLabel}>Select Course:</Text>
              {unassignedCourses.map(course => (
                <TouchableOpacity key={course.id} style={[styles.selectOption, assignCourseId === course.id && styles.selectOptionActive]} onPress={() => setAssignCourseId(course.id)}>
                  <Text style={[styles.selectOptionText, assignCourseId === course.id && styles.selectOptionTextActive]}>{course.name} ({course.code})</Text>
                </TouchableOpacity>
              ))}
              <Text style={styles.modalLabel}>Select Lecturer:</Text>
              {lecturers.map(lecturer => (
                <TouchableOpacity key={lecturer.id} style={[styles.selectOption, selectedLecturerId === lecturer.id && styles.selectOptionActive]} onPress={() => setSelectedLecturerId(lecturer.id)}>
                  <Text style={[styles.selectOptionText, selectedLecturerId === lecturer.id && styles.selectOptionTextActive]}>{lecturer.name}</Text>
                  <Text style={styles.selectSubText}>{lecturer.department}</Text>
                </TouchableOpacity>
              ))}
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setAssignModalVisible(false)}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.submitButton]} onPress={assignLecturerToCourse} disabled={assigning}>{assigning ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitButtonText}>Assign</Text>}</TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Feedback Modal */}
      <Modal visible={feedbackModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalWrapper}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Feedback</Text>
              <TouchableOpacity onPress={() => setFeedbackModalVisible(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollContent}>
              <Text style={styles.modalLabel}>Report: {selectedReport?.title}</Text>
              <TextInput style={[styles.modalInput, styles.textArea]} placeholder="Enter your feedback..." value={feedbackText} onChangeText={setFeedbackText} multiline numberOfLines={5} />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setFeedbackModalVisible(false)}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.submitButton]} onPress={submitFeedback} disabled={submittingFeedback}>{submittingFeedback ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitButtonText}>Submit Feedback</Text>}</TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Course Rating Modal */}
      <Modal visible={courseRatingModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rate Course</Text>
            <Text style={styles.modalCourse}>{selectedCourseRating?.name}</Text>
            {renderRatingStars(courseRatingValue, setCourseRatingValue, 40)}
            <TextInput style={styles.modalInput} placeholder="Write your review (optional)" value={courseRatingReview} onChangeText={setCourseRatingReview} multiline />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setCourseRatingModalVisible(false)}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.submitButton]} onPress={submitCourseRating} disabled={submittingCourseRating}>{submittingCourseRating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitButtonText}>Submit Rating</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Lecturer Rating Modal */}
      <Modal visible={lecturerRatingModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rate Lecturer</Text>
            <Text style={styles.modalLecturer}>{selectedLecturerRating?.name}</Text>
            {renderRatingStars(lecturerRatingValue, setLecturerRatingValue, 40)}
            <TextInput style={styles.modalInput} placeholder="Write your review (optional)" value={lecturerRatingReview} onChangeText={setLecturerRatingReview} multiline />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setLecturerRatingModalVisible(false)}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.submitButton]} onPress={submitLecturerRating} disabled={submittingLecturerRating}>{submittingLecturerRating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitButtonText}>Submit Rating</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Report Detail Modal */}
      <Modal visible={reportDetailVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report Details</Text>
            <Text style={styles.modalReportTitle}>{selectedReport?.title}</Text>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Submitted by:</Text><Text style={styles.detailValue}>{selectedReport?.submittedBy}</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Date:</Text><Text style={styles.detailValue}>{new Date(selectedReport?.submittedAt).toLocaleString()}</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Status:</Text><Text style={[styles.detailValue, { color: selectedReport?.status === 'reviewed' ? '#4CAF50' : '#FF9800' }]}>{selectedReport?.status?.toUpperCase()}</Text></View>
            <Text style={styles.detailLabel}>Content:</Text>
            <Text style={styles.reportContentText}>{selectedReport?.content}</Text>
            {selectedReport?.feedback && (<><Text style={styles.detailLabel}>Feedback:</Text><Text style={styles.feedbackText}>{selectedReport?.feedback}</Text></>)}
            <TouchableOpacity style={styles.closeModalButton} onPress={() => setReportDetailVisible(false)}><Text style={styles.closeModalButtonText}>Close</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Lecture Detail Modal */}
      <Modal visible={lectureDetailVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Lecture Details</Text>
            <Text style={styles.modalLectureTitle}>{selectedLectureDetail?.title}</Text>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Course:</Text><Text style={styles.detailValue}>{selectedLectureDetail?.courseName}</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Lecturer:</Text><Text style={styles.detailValue}>{selectedLectureDetail?.lecturerName || 'Not assigned'}</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Date:</Text><Text style={styles.detailValue}>{selectedLectureDetail?.date}</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Time:</Text><Text style={styles.detailValue}>{selectedLectureDetail?.time}</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Venue:</Text><Text style={styles.detailValue}>{selectedLectureDetail?.venue}</Text></View>
            <TouchableOpacity style={styles.closeModalButton} onPress={() => setLectureDetailVisible(false)}><Text style={styles.closeModalButtonText}>Close</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  header: { backgroundColor: '#6200ee', padding: 20, paddingTop: 20, paddingBottom: 25 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  greeting: { fontSize: 14, color: '#fff', opacity: 0.9 },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 2 },
  userRole: { fontSize: 12, color: '#fff', opacity: 0.7, marginTop: 2 },
  logoutButton: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  logoutText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  subtitle: { fontSize: 12, color: '#fff', opacity: 0.8, marginTop: 5 },
  statsContainer: { flexDirection: 'row', flexWrap: 'wrap', padding: 15, marginTop: 10 },
  statCard: { flex: 1, minWidth: '45%', margin: 5, elevation: 3, borderRadius: 10 },
  statNumber: { fontSize: 24, textAlign: 'center', color: '#6200ee', fontWeight: 'bold' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 15, marginBottom: 10, borderRadius: 10, elevation: 2 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#6200ee' },
  tabText: { fontSize: 12, color: '#666', fontWeight: '500' },
  activeTabText: { color: '#fff' },
  filterContainer: { padding: 15, backgroundColor: '#fff', marginHorizontal: 15, marginBottom: 10, borderRadius: 10, elevation: 2 },
  filterLabel: { fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  filterScroll: { flexDirection: 'row' },
  filterChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0', marginRight: 10 },
  filterChipActive: { backgroundColor: '#6200ee' },
  filterChipText: { color: '#666', fontSize: 12 },
  filterChipTextActive: { color: '#fff' },
  actionButtons: { padding: 15 },
  actionButton: { padding: 15, borderRadius: 10, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  section: { padding: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  emptyCard: { marginBottom: 10, backgroundColor: '#f0f0f0' },
  emptyText: { textAlign: 'center', color: '#999' },
  courseCard: { marginBottom: 10, elevation: 2, borderRadius: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deleteText: { fontSize: 20, marginLeft: 10, color: '#F44336' },
  unassignText: { fontSize: 18, marginRight: 10, color: '#FF9800' },
  assignedInfo: { marginTop: 10, padding: 10, backgroundColor: '#e8f5e9', borderRadius: 8 },
  assignedLabel: { fontWeight: 'bold', fontSize: 12, color: '#4CAF50' },
  assignedValue: { fontSize: 14, marginTop: 3, fontWeight: '500', color: '#333' },
  lecturerCard: { marginBottom: 10, elevation: 2, borderRadius: 8 },
  lectureCard: { marginBottom: 10, elevation: 2, borderRadius: 8 },
  viewDetailsButton: { backgroundColor: '#2196F3', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  viewDetailsButtonText: { color: '#fff', fontWeight: 'bold' },
  reportCard: { marginBottom: 15, elevation: 2, borderRadius: 8 },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  reportTitle: { fontSize: 16, flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  feedbackContainer: { marginTop: 10, padding: 10, backgroundColor: '#e3f2fd', borderRadius: 8 },
  feedbackLabel: { fontWeight: 'bold', fontSize: 12, marginBottom: 5, color: '#1976D2' },
  feedbackText: { fontSize: 13 },
  feedbackButton: { backgroundColor: '#2196F3', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  feedbackButtonText: { color: '#fff', fontWeight: 'bold' },
  viewReportButton: { backgroundColor: '#9C27B0', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  viewReportButtonText: { color: '#fff', fontWeight: 'bold' },
  ratingContainer: { flexDirection: 'row', alignItems: 'center' },
  avgRating: { fontSize: 14, color: '#FFD700' },
  avgRatingText: { fontSize: 12, color: '#666' },
  rateButton: { backgroundColor: '#FF9800', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  rateButtonText: { color: '#fff', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalWrapper: { backgroundColor: '#fff', borderRadius: 10, width: '90%', maxWidth: 400, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#6200ee' },
  modalClose: { fontSize: 24, color: '#666', padding: 5 },
  modalScrollContent: { padding: 20 },
  modalLabel: { fontWeight: 'bold', marginTop: 10, marginBottom: 5 },
  modalInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 14 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  streamContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
  streamChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, backgroundColor: '#f0f0f0', marginRight: 8, marginBottom: 8 },
  streamChipActive: { backgroundColor: '#6200ee' },
  streamChipText: { color: '#666', fontSize: 12 },
  streamChipTextActive: { color: '#fff' },
  selectContainer: { marginBottom: 15 },
  selectOption: { padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 8 },
  selectOptionActive: { backgroundColor: '#6200ee', borderColor: '#6200ee' },
  selectOptionText: { color: '#333' },
  selectOptionTextActive: { color: '#fff' },
  selectSubText: { fontSize: 11, color: '#666', marginTop: 2 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  modalButton: { flex: 1, padding: 12, borderRadius: 8, marginHorizontal: 5, alignItems: 'center' },
  cancelButton: { backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ddd' },
  cancelButtonText: { color: '#666' },
  submitButton: { backgroundColor: '#6200ee' },
  submitButtonText: { color: '#fff', fontWeight: 'bold' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', borderRadius: 10, padding: 20, width: '90%', maxWidth: 400 },
  starsContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 15 },
  ratingStar: { marginHorizontal: 5, color: '#ddd' },
  ratingStarSelected: { color: '#FFD700' },
  modalCourse: { textAlign: 'center', fontSize: 16, marginBottom: 15, fontWeight: 'bold' },
  modalLecturer: { textAlign: 'center', fontSize: 16, marginBottom: 15, fontWeight: 'bold' },
  modalReportTitle: { textAlign: 'center', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  modalLectureTitle: { textAlign: 'center', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  detailRow: { flexDirection: 'row', marginBottom: 10 },
  detailLabel: { width: 100, fontWeight: 'bold', color: '#333' },
  detailValue: { flex: 1, color: '#666' },
  reportContentText: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 15 },
  closeModalButton: { backgroundColor: '#6200ee', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  closeModalButtonText: { color: '#fff', fontWeight: 'bold' },
});

export default PLDashboard;