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
import LecturerReportForm from './LecturerReportForm';

// API URL based on platform
const API_URL = Platform.select({
  android: 'http://10.0.2.2:3000/api',
  ios: 'http://localhost:3000/api',
  default: 'http://localhost:3000/api'
});

const LecturerDashboard = ({ navigation }) => {
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [courses, setCourses] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('myCourses');
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalLectures: 0,
    averageAttendance: 0,
    totalReports: 0
  });

  // Report form modal
  const [reportFormVisible, setReportFormVisible] = useState(false);
  
  // Report detail modal
  const [reportDetailVisible, setReportDetailVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // Add lecture modal
  const [addLectureModalVisible, setAddLectureModalVisible] = useState(false);
  const [newLecture, setNewLecture] = useState({
    title: '',
    courseId: '',
    date: '',
    time: '',
    venue: '',
    totalStudents: ''
  });

  // Lecture rating modal
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedLectureForRating, setSelectedLectureForRating] = useState(null);
  const [lectureRating, setLectureRating] = useState(5);
  const [lectureReview, setLectureReview] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [lectureRatings, setLectureRatings] = useState({});

  // Manual attendance modal
  const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
  const [selectedLectureForAttendance, setSelectedLectureForAttendance] = useState(null);
  const [attendanceCount, setAttendanceCount] = useState('');
  const [submittingAttendance, setSubmittingAttendance] = useState(false);

  useEffect(() => {
    loadUserData();
    loadDashboardData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setUserName(user.name || 'Lecturer');
        setUserId(user.uid || '');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load courses
      const coursesRes = await axios.get(`${API_URL}/courses`);
      const coursesData = coursesRes.data.courses || [];
      setCourses(coursesData);
      
      // Load lectures
      const lecturesRes = await axios.get(`${API_URL}/lectures`);
      const lecturesData = lecturesRes.data.lectures || [];
      setLectures(lecturesData);
      
      // Load lecturer reports from backend
      const reportsRes = await axios.get(`${API_URL}/lecturer-reports`);
      const allReports = reportsRes.data.reports || [];
      const myReports = allReports.filter(report => report.lecturerName === userName);
      setReports(myReports);
      
      // Load lecture ratings
      await loadLectureRatings(lecturesData);
      
      // Update stats
      setStats({
        totalCourses: coursesData.length,
        totalLectures: lecturesData.length,
        averageAttendance: calculateAverageAttendance(lecturesData),
        totalReports: myReports.length
      });
      
    } catch (error) {
      console.error('Error loading dashboard:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
      setCourses([]);
      setLectures([]);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const loadLectureRatings = async (lecturesList) => {
    try {
      const ratingsMap = {};
      for (const lecture of lecturesList) {
        try {
          const response = await axios.get(`${API_URL}/lecture-ratings/${lecture.id}`);
          ratingsMap[lecture.id] = response.data;
        } catch (err) {
          ratingsMap[lecture.id] = { avgRating: 0, ratings: [] };
        }
      }
      setLectureRatings(ratingsMap);
    } catch (error) {
      console.error('Error loading lecture ratings:', error);
    }
  };

  const getLectureAverageRating = (lectureId) => {
    const ratingData = lectureRatings[lectureId];
    if (!ratingData || ratingData.avgRating === 0) return '0';
    return ratingData.avgRating.toFixed(1);
  };

  const renderRatingStarsDisplay = (rating, size = 14) => {
    const numRating = parseFloat(rating) || 0;
    const fullStars = Math.floor(numRating);
    const hasHalfStar = numRating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return (
      <View style={{ flexDirection: 'row' }}>
        {[...Array(fullStars)].map((_, i) => (
          <Text key={`full-${i}`} style={{ color: '#FFD700', fontSize: size, marginRight: 2 }}>★</Text>
        ))}
        {hasHalfStar && <Text style={{ color: '#FFD700', fontSize: size, marginRight: 2 }}>½</Text>}
        {[...Array(emptyStars)].map((_, i) => (
          <Text key={`empty-${i}`} style={{ color: '#ccc', fontSize: size, marginRight: 2 }}>★</Text>
        ))}
      </View>
    );
  };

  const renderRatingStarsModal = (currentRating, onRatingChange) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity key={star} onPress={() => onRatingChange(star)}>
            <Text style={[styles.ratingStar, currentRating >= star && styles.ratingStarSelected]}>
              {currentRating >= star ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const calculateAverageAttendance = (lecturesData) => {
    if (!lecturesData || lecturesData.length === 0) return 0;
    const total = lecturesData.reduce((sum, lecture) => sum + (lecture.attendance || 0), 0);
    const maxPossible = lecturesData.reduce((sum, lecture) => sum + (lecture.totalStudents || 0), 0);
    if (maxPossible === 0) return 0;
    return Math.round((total / maxPossible) * 100);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
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

  const addLecture = async () => {
    if (!newLecture.title || !newLecture.courseId || !newLecture.date || !newLecture.time || !newLecture.venue) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      const lectureData = {
        ...newLecture,
        lecturerName: userName,
        attendance: 0
      };
      await axios.post(`${API_URL}/lectures`, lectureData);
      Alert.alert('Success', 'Lecture added successfully!');
      setAddLectureModalVisible(false);
      setNewLecture({ title: '', courseId: '', date: '', time: '', venue: '', totalStudents: '' });
      await loadDashboardData();
    } catch (error) {
      console.error('Error adding lecture:', error);
      Alert.alert('Error', 'Failed to add lecture');
    }
  };

  const updateAttendance = async (lectureId, currentAttendance, totalStudents) => {
    const newAttendance = currentAttendance + 1;
    if (newAttendance > totalStudents) {
      Alert.alert('Error', 'Attendance cannot exceed total students');
      return;
    }
    
    try {
      await axios.put(`${API_URL}/lectures/${lectureId}`, { attendance: newAttendance });
      await loadDashboardData();
      Alert.alert('Success', 'Attendance updated!');
    } catch (error) {
      console.error('Error updating attendance:', error);
      Alert.alert('Error', 'Failed to update attendance');
    }
  };

  const submitManualAttendance = async () => {
    if (!attendanceCount || parseInt(attendanceCount) < 0) {
      Alert.alert('Error', 'Please enter a valid attendance count');
      return;
    }
    
    const totalStudents = selectedLectureForAttendance?.totalStudents || 0;
    const newAttendance = parseInt(attendanceCount);
    
    if (newAttendance > totalStudents) {
      Alert.alert('Error', `Attendance cannot exceed total students (${totalStudents})`);
      return;
    }
    
    setSubmittingAttendance(true);
    try {
      await axios.put(`${API_URL}/lectures/${selectedLectureForAttendance.id}`, { 
        attendance: newAttendance 
      });
      Alert.alert('Success', `Attendance set to ${newAttendance} students!`);
      setAttendanceModalVisible(false);
      setAttendanceCount('');
      setSelectedLectureForAttendance(null);
      await loadDashboardData();
    } catch (error) {
      console.error('Error updating attendance:', error);
      Alert.alert('Error', 'Failed to update attendance');
    } finally {
      setSubmittingAttendance(false);
    }
  };

  const submitLectureRating = async () => {
    if (!selectedLectureForRating) return;
    
    setSubmittingRating(true);
    try {
      const response = await axios.post(`${API_URL}/rate-lecture`, {
        lectureId: selectedLectureForRating.id,
        lectureTitle: selectedLectureForRating.title,
        rating: lectureRating,
        review: lectureReview,
        raterName: userName,
        raterRole: 'lecturer'
      });
      
      if (response.data.success) {
        Alert.alert('Success', `Thank you for rating "${selectedLectureForRating.title}"!`);
        setRatingModalVisible(false);
        setLectureRating(5);
        setLectureReview('');
        setSelectedLectureForRating(null);
        await loadLectureRatings(lectures);
        await loadDashboardData();
      } else {
        Alert.alert('Error', response.data.error || 'Failed to submit rating');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getStatusBadgeStyle = (status) => {
    switch(status) {
      case 'reviewed':
        return { backgroundColor: '#4CAF50' };
      case 'pending':
        return { backgroundColor: '#FF9800' };
      default:
        return { backgroundColor: '#FF9800' };
    }
  };

  const handleReportSubmitted = () => {
    setReportFormVisible(false);
    loadDashboardData();
  };

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
              <Text style={styles.userRole}>Lecturer Dashboard</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>Manage your courses and lectures</Text>
        </View>

        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Card.Content>
              <Title style={styles.statNumber}>{stats.totalCourses}</Title>
              <Paragraph>My Courses</Paragraph>
            </Card.Content>
          </Card>
          <Card style={styles.statCard}>
            <Card.Content>
              <Title style={styles.statNumber}>{stats.totalLectures}</Title>
              <Paragraph>Total Lectures</Paragraph>
            </Card.Content>
          </Card>
          <Card style={styles.statCard}>
            <Card.Content>
              <Title style={styles.statNumber}>{stats.averageAttendance}%</Title>
              <Paragraph>Avg Attendance</Paragraph>
            </Card.Content>
          </Card>
          <Card style={styles.statCard}>
            <Card.Content>
              <Title style={styles.statNumber}>{stats.totalReports}</Title>
              <Paragraph>My Reports</Paragraph>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'myCourses' && styles.activeTab]}
            onPress={() => setActiveTab('myCourses')}
          >
            <Text style={[styles.tabText, activeTab === 'myCourses' && styles.activeTabText]}>My Courses</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'myLectures' && styles.activeTab]}
            onPress={() => setActiveTab('myLectures')}
          >
            <Text style={[styles.tabText, activeTab === 'myLectures' && styles.activeTabText]}>My Lectures</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'reports' && styles.activeTab]}
            onPress={() => setActiveTab('reports')}
          >
            <Text style={[styles.tabText, activeTab === 'reports' && styles.activeTabText]}>My Reports</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'myCourses' && (
          <View style={styles.section}>
            <Title style={styles.sectionTitle}>My Courses</Title>
            {courses.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content>
                  <Paragraph style={styles.emptyText}>No courses assigned yet</Paragraph>
                </Card.Content>
              </Card>
            ) : (
              courses.map(course => (
                <Card key={course.id} style={styles.courseCard}>
                  <Card.Content>
                    <Title>{course.name}</Title>
                    <Paragraph>Code: {course.code}</Paragraph>
                    <Paragraph>Stream: {course.stream}</Paragraph>
                    <Paragraph>Credits: {course.credits}</Paragraph>
                    <Paragraph>Semester: {course.semester}</Paragraph>
                  </Card.Content>
                </Card>
              ))
            )}
          </View>
        )}

        {activeTab === 'myLectures' && (
          <View style={styles.section}>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
                onPress={() => setAddLectureModalVisible(true)}
              >
                <Text style={styles.actionButtonText}>Add New Lecture</Text>
              </TouchableOpacity>
            </View>
            <Title style={styles.sectionTitle}>My Lectures</Title>
            {lectures.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content>
                  <Paragraph style={styles.emptyText}>No lectures scheduled</Paragraph>
                </Card.Content>
              </Card>
            ) : (
              lectures.map(lecture => {
                const attendanceRate = lecture.totalStudents > 0 
                  ? ((lecture.attendance || 0) / lecture.totalStudents * 100).toFixed(1)
                  : 0;
                const avgRating = getLectureAverageRating(lecture.id);
                return (
                  <Card key={lecture.id} style={styles.lectureCard}>
                    <Card.Content>
                      <Title>{lecture.title}</Title>
                      <Paragraph>Date: {lecture.date}</Paragraph>
                      <Paragraph>Time: {lecture.time}</Paragraph>
                      <Paragraph>Venue: {lecture.venue}</Paragraph>
                      <View style={styles.attendanceInfo}>
                        <Text style={styles.attendanceLabel}>Attendance:</Text>
                        <Text style={styles.attendanceCount}>{lecture.attendance || 0} / {lecture.totalStudents || 0}</Text>
                        <Text style={styles.attendancePercent}>({attendanceRate}%)</Text>
                      </View>
                      
                      <View style={styles.ratingInfo}>
                        <Text style={styles.ratingLabel}>Lecture Rating:</Text>
                        {renderRatingStarsDisplay(avgRating)}
                        <Text style={styles.ratingValue}>({avgRating})</Text>
                      </View>
                      
                      <View style={styles.buttonRow}>
                        <TouchableOpacity
                          style={[styles.actionSmallButton, { backgroundColor: '#2196F3' }]}
                          onPress={() => {
                            setSelectedLectureForAttendance(lecture);
                            setAttendanceCount(String(lecture.attendance || 0));
                            setAttendanceModalVisible(true);
                          }}
                        >
                          <Text style={styles.actionSmallButtonText}>Set Attendance</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionSmallButton, { backgroundColor: '#FF9800' }]}
                          onPress={() => {
                            setSelectedLectureForRating(lecture);
                            setLectureRating(5);
                            setLectureReview('');
                            setRatingModalVisible(true);
                          }}
                        >
                          <Text style={styles.actionSmallButtonText}>Rate Lecture</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionSmallButton, { backgroundColor: '#4CAF50' }]}
                          onPress={() => updateAttendance(lecture.id, lecture.attendance || 0, lecture.totalStudents || 0)}
                        >
                          <Text style={styles.actionSmallButtonText}>Mark +1</Text>
                        </TouchableOpacity>
                      </View>
                    </Card.Content>
                  </Card>
                );
              })
            )}
          </View>
        )}

        {activeTab === 'reports' && (
          <View style={styles.section}>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
                onPress={() => setReportFormVisible(true)}
              >
                <Text style={styles.actionButtonText}>New Report Form</Text>
              </TouchableOpacity>
            </View>
            <Title style={styles.sectionTitle}>My Submitted Reports</Title>
            {reports.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content>
                  <Paragraph style={styles.emptyText}>No reports submitted yet</Paragraph>
                  <Paragraph style={styles.emptySubText}>Tap "New Report Form" to submit your first report</Paragraph>
                </Card.Content>
              </Card>
            ) : (
              reports.map(report => (
                <Card key={report.id} style={styles.reportCard}>
                  <Card.Content>
                    <View style={styles.reportHeader}>
                      <Title style={styles.reportTitle}>{report.courseName} ({report.courseCode})</Title>
                      <View style={[styles.statusBadge, getStatusBadgeStyle(report.status)]}>
                        <Text style={styles.statusText}>{report.status?.toUpperCase() || 'PENDING'}</Text>
                      </View>
                    </View>
                    <Paragraph>Week: {report.weekOfReporting}</Paragraph>
                    <Paragraph>Date: {new Date(report.dateOfLecture).toLocaleDateString()}</Paragraph>
                    <Paragraph>Venue: {report.venue}</Paragraph>
                    <Paragraph numberOfLines={2}>Topic: {report.topicTaught}</Paragraph>
                    <View style={styles.attendanceInfo}>
                      <Text style={styles.attendanceLabel}>Attendance:</Text>
                      <Text style={styles.attendanceCount}>{report.actualStudentsPresent} / {report.totalRegisteredStudents || 0}</Text>
                    </View>
                    {report.feedback && (
                      <View style={styles.feedbackContainer}>
                        <Text style={styles.feedbackLabel}>Feedback from PRL:</Text>
                        <Text style={styles.feedbackText}>{report.feedback}</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.viewDetailsButton}
                      onPress={() => {
                        setSelectedReport(report);
                        setReportDetailVisible(true);
                      }}
                    >
                      <Text style={styles.viewDetailsButtonText}>View Full Report</Text>
                    </TouchableOpacity>
                  </Card.Content>
                </Card>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Report Form Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={reportFormVisible}
        onRequestClose={() => setReportFormVisible(false)}
      >
        <LecturerReportForm 
          onClose={() => setReportFormVisible(false)}
          onSubmitSuccess={handleReportSubmitted}
        />
      </Modal>

      {/* Add Lecture Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addLectureModalVisible}
        onRequestClose={() => setAddLectureModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalWrapper}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Lecture</Text>
              <TouchableOpacity onPress={() => setAddLectureModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollContent}>
              <TextInput
                style={styles.modalInput}
                placeholder="Lecture Title *"
                value={newLecture.title}
                onChangeText={(text) => setNewLecture({...newLecture, title: text})}
              />
              <Text style={styles.modalLabel}>Select Course *</Text>
              <View style={styles.selectContainer}>
                {courses.map(course => (
                  <TouchableOpacity
                    key={course.id}
                    style={[styles.selectOption, newLecture.courseId === course.id && styles.selectOptionActive]}
                    onPress={() => setNewLecture({...newLecture, courseId: course.id})}
                  >
                    <Text style={[styles.selectOptionText, newLecture.courseId === course.id && styles.selectOptionTextActive]}>
                      {course.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.modalInput}
                placeholder="Date (YYYY-MM-DD) *"
                value={newLecture.date}
                onChangeText={(text) => setNewLecture({...newLecture, date: text})}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Time *"
                value={newLecture.time}
                onChangeText={(text) => setNewLecture({...newLecture, time: text})}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Venue *"
                value={newLecture.venue}
                onChangeText={(text) => setNewLecture({...newLecture, venue: text})}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Total Students"
                value={newLecture.totalStudents}
                onChangeText={(text) => setNewLecture({...newLecture, totalStudents: text})}
                keyboardType="numeric"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setAddLectureModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={addLecture}
                >
                  <Text style={styles.submitButtonText}>Add Lecture</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Manual Attendance Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={attendanceModalVisible}
        onRequestClose={() => setAttendanceModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Attendance</Text>
            <Text style={styles.modalSubtitle}>{selectedLectureForAttendance?.title}</Text>
            <Text style={styles.modalInfo}>Total Students: {selectedLectureForAttendance?.totalStudents || 0}</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Number of students present"
              value={attendanceCount}
              onChangeText={setAttendanceCount}
              keyboardType="numeric"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setAttendanceModalVisible(false);
                  setAttendanceCount('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={submitManualAttendance}
                disabled={submittingAttendance}
              >
                {submittingAttendance ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitButtonText}>Save Attendance</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rate Lecture Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={ratingModalVisible}
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rate Lecture</Text>
            <Text style={styles.modalSubtitle}>{selectedLectureForRating?.title}</Text>
            
            <Text style={styles.modalLabel}>Your Rating:</Text>
            {renderRatingStarsModal(lectureRating, setLectureRating)}
            
            <TextInput
              style={[styles.modalInput, styles.textArea]}
              placeholder="Write your review (optional)"
              value={lectureReview}
              onChangeText={setLectureReview}
              multiline
              numberOfLines={3}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setRatingModalVisible(false);
                  setLectureRating(5);
                  setLectureReview('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={submitLectureRating}
                disabled={submittingRating}
              >
                {submittingRating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitButtonText}>Submit Rating</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Report Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={reportDetailVisible}
        onRequestClose={() => setReportDetailVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.detailModalHeader}>
              <Text style={styles.modalTitle}>Report Details</Text>
              <TouchableOpacity onPress={() => setReportDetailVisible(false)}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.detailScrollContent}>
              <View style={styles.statusBadgeContainer}>
                <View style={[styles.statusBadgeLarge, getStatusBadgeStyle(selectedReport?.status)]}>
                  <Text style={styles.statusTextLarge}>{selectedReport?.status?.toUpperCase() || 'PENDING'}</Text>
                </View>
              </View>
              
              <Text style={styles.detailSectionTitle}>Basic Information</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Faculty:</Text>
                <Text style={styles.detailValue}>{selectedReport?.facultyName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Class Name:</Text>
                <Text style={styles.detailValue}>{selectedReport?.className}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Week of Reporting:</Text>
                <Text style={styles.detailValue}>{selectedReport?.weekOfReporting}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date of Lecture:</Text>
                <Text style={styles.detailValue}>{selectedReport?.dateOfLecture}</Text>
              </View>
              
              <Text style={styles.detailSectionTitle}>Course Information</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Course Name:</Text>
                <Text style={styles.detailValue}>{selectedReport?.courseName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Course Code:</Text>
                <Text style={styles.detailValue}>{selectedReport?.courseCode}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Lecturer:</Text>
                <Text style={styles.detailValue}>{selectedReport?.lecturerName}</Text>
              </View>
              
              <Text style={styles.detailSectionTitle}>Lecture Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Venue:</Text>
                <Text style={styles.detailValue}>{selectedReport?.venue}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Scheduled Time:</Text>
                <Text style={styles.detailValue}>{selectedReport?.scheduledTime}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Students Present:</Text>
                <Text style={styles.detailValue}>{selectedReport?.actualStudentsPresent}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Registered:</Text>
                <Text style={styles.detailValue}>{selectedReport?.totalRegisteredStudents || 0}</Text>
              </View>
              
              <Text style={styles.detailSectionTitle}>Academic Content</Text>
              <View style={styles.detailBlock}>
                <Text style={styles.detailBlockLabel}>Topic Taught:</Text>
                <Text style={styles.detailBlockText}>{selectedReport?.topicTaught}</Text>
              </View>
              <View style={styles.detailBlock}>
                <Text style={styles.detailBlockLabel}>Learning Outcomes:</Text>
                <Text style={styles.detailBlockText}>{selectedReport?.learningOutcomes}</Text>
              </View>
              
              {selectedReport?.recommendations && (
                <View style={styles.detailBlock}>
                  <Text style={styles.detailBlockLabel}>Recommendations:</Text>
                  <Text style={styles.detailBlockText}>{selectedReport?.recommendations}</Text>
                </View>
              )}
              
              {selectedReport?.feedback && (
                <>
                  <Text style={styles.detailSectionTitle}>Feedback</Text>
                  <View style={styles.feedbackDetailContainer}>
                    <Text style={styles.feedbackDetailText}>{selectedReport?.feedback}</Text>
                    <Text style={styles.feedbackDetailDate}>
                      Reviewed: {new Date(selectedReport?.reviewedAt).toLocaleString()}
                    </Text>
                  </View>
                </>
              )}
              
              <View style={styles.detailBlock}>
                <Text style={styles.detailBlockLabel}>Submitted:</Text>
                <Text style={styles.detailBlockText}>{new Date(selectedReport?.createdAt).toLocaleString()}</Text>
              </View>
            </ScrollView>
            
            <TouchableOpacity
              style={styles.closeDetailButton}
              onPress={() => setReportDetailVisible(false)}
            >
              <Text style={styles.closeDetailButtonText}>Close</Text>
            </TouchableOpacity>
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
  statCard: { flex: 1, minWidth: '23%', margin: 5, elevation: 3, borderRadius: 10 },
  statNumber: { fontSize: 20, textAlign: 'center', color: '#6200ee', fontWeight: 'bold' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 15, marginBottom: 10, borderRadius: 10, elevation: 2 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#6200ee' },
  tabText: { fontSize: 14, color: '#666', fontWeight: '500' },
  activeTabText: { color: '#fff' },
  section: { padding: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  emptyCard: { marginBottom: 10, backgroundColor: '#f0f0f0', padding: 20 },
  emptyText: { textAlign: 'center', color: '#999' },
  emptySubText: { textAlign: 'center', color: '#999', fontSize: 12, marginTop: 5 },
  courseCard: { marginBottom: 10, elevation: 2, borderRadius: 8 },
  lectureCard: { marginBottom: 10, elevation: 2, borderRadius: 8 },
  reportCard: { marginBottom: 10, elevation: 2, borderRadius: 8 },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' },
  reportTitle: { fontSize: 14, flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 10 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  actionButtons: { marginBottom: 15 },
  actionButton: { padding: 15, borderRadius: 10, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, gap: 8 },
  actionSmallButton: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center' },
  actionSmallButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  ratingInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  ratingLabel: { fontSize: 12, fontWeight: 'bold', color: '#333', marginRight: 8 },
  ratingValue: { fontSize: 12, color: '#666', marginLeft: 5 },
  attendanceInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#eee' },
  attendanceLabel: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  attendanceCount: { fontSize: 12, color: '#4CAF50', marginLeft: 5 },
  attendancePercent: { fontSize: 12, color: '#666', marginLeft: 5 },
  feedbackContainer: { marginTop: 10, padding: 10, backgroundColor: '#e3f2fd', borderRadius: 8 },
  feedbackLabel: { fontWeight: 'bold', fontSize: 12, marginBottom: 5, color: '#1976D2' },
  feedbackText: { fontSize: 13 },
  viewDetailsButton: { backgroundColor: '#2196F3', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  viewDetailsButtonText: { color: '#fff', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalWrapper: { backgroundColor: '#fff', borderRadius: 10, width: '90%', maxWidth: 400, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#6200ee' },
  modalClose: { fontSize: 24, color: '#666', padding: 5 },
  modalScrollContent: { padding: 20 },
  modalLabel: { fontWeight: 'bold', marginTop: 10, marginBottom: 5 },
  modalInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 14 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  selectContainer: { marginBottom: 15 },
  selectOption: { padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 8 },
  selectOptionActive: { backgroundColor: '#6200ee', borderColor: '#6200ee' },
  selectOptionText: { color: '#333' },
  selectOptionTextActive: { color: '#fff' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  modalButton: { flex: 1, padding: 12, borderRadius: 8, marginHorizontal: 5, alignItems: 'center' },
  cancelButton: { backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ddd' },
  cancelButtonText: { color: '#666' },
  submitButton: { backgroundColor: '#6200ee' },
  submitButtonText: { color: '#fff', fontWeight: 'bold' },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 10, width: '90%', maxWidth: 400, maxHeight: '85%', overflow: 'hidden' },
  modalSubtitle: { textAlign: 'center', fontSize: 14, color: '#666', marginBottom: 10 },
  modalInfo: { textAlign: 'center', fontSize: 12, color: '#4CAF50', marginBottom: 15 },
  starsContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 15 },
  ratingStar: { fontSize: 40, marginHorizontal: 5, color: '#ddd' },
  ratingStarSelected: { color: '#FFD700' },
  detailModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  closeButtonText: { color: '#6200ee', fontSize: 14, fontWeight: 'bold' },
  detailScrollContent: { padding: 20 },
  statusBadgeContainer: { alignItems: 'center', marginBottom: 15 },
  statusBadgeLarge: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  statusTextLarge: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  detailSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#6200ee', marginTop: 15, marginBottom: 10, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: '#eee' },
  detailRow: { flexDirection: 'row', marginBottom: 8 },
  detailLabel: { width: 120, fontWeight: 'bold', color: '#555', fontSize: 13 },
  detailValue: { flex: 1, color: '#333', fontSize: 13 },
  detailBlock: { marginBottom: 12 },
  detailBlockLabel: { fontWeight: 'bold', color: '#555', fontSize: 13, marginBottom: 5 },
  detailBlockText: { color: '#333', fontSize: 13, lineHeight: 18 },
  feedbackDetailContainer: { backgroundColor: '#e3f2fd', padding: 12, borderRadius: 8, marginBottom: 15 },
  feedbackDetailText: { color: '#333', fontSize: 13, lineHeight: 18 },
  feedbackDetailDate: { color: '#666', fontSize: 11, marginTop: 8 },
  closeDetailButton: { backgroundColor: '#6200ee', padding: 15, margin: 15, borderRadius: 8, alignItems: 'center' },
  closeDetailButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default LecturerDashboard;