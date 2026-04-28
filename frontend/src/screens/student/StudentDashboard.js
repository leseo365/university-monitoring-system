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

const StudentDashboard = ({ navigation }) => {
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userId, setUserId] = useState('');
  const [courses, setCourses] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [myAttendance, setMyAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('courses');

  // Rating states
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingReview, setRatingReview] = useState('');
  const [ratingType, setRatingType] = useState('course');
  const [submitting, setSubmitting] = useState(false);
  const [courseRatings, setCourseRatings] = useState({});
  const [lecturerRatings, setLecturerRatings] = useState({});

  // Attendance marking modal
  const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [attendanceStatus, setAttendanceStatus] = useState('present');
  const [markingAttendance, setMarkingAttendance] = useState(false);

  useEffect(() => {
    loadUserData();
    loadDashboardData();
  }, []);

  const loadUserData = async () => {
    try {
      const name = await AsyncStorage.getItem('userName');
      const role = await AsyncStorage.getItem('userRole');
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setUserId(user.uid || '');
      }
      setUserName(name || 'Student');
      setUserRole(role || 'student');
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load courses
      const coursesRes = await axios.get(`${API_URL}/courses`);
      setCourses(coursesRes.data.courses || []);
      
      // Load lecturers
      const lecturersRes = await axios.get(`${API_URL}/lecturers`);
      setLecturers(lecturersRes.data.lecturers || []);
      
      // Load lectures
      const lecturesRes = await axios.get(`${API_URL}/lectures`);
      setLectures(lecturesRes.data.lectures || []);
      
      // Load student attendance
      await loadStudentAttendance();
      
      // Load ratings
      await loadRatings();
      
    } catch (error) {
      console.error('Error loading dashboard:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadStudentAttendance = async () => {
    try {
      // Get attendance records for this student
      const attendanceRes = await axios.get(`${API_URL}/student-attendance/${userId}`);
      const attendanceData = attendanceRes.data.attendance || [];
      const attendanceMap = {};
      attendanceData.forEach(record => {
        attendanceMap[record.lectureId] = record.status;
      });
      setMyAttendance(attendanceMap);
    } catch (error) {
      console.error('Error loading attendance:', error);
      // Initialize empty attendance map
      setMyAttendance({});
    }
  };

  const loadRatings = async () => {
    try {
      // Load course ratings
      for (const course of courses) {
        try {
          const res = await axios.get(`${API_URL}/course-ratings/${course.id}`);
          setCourseRatings(prev => ({
            ...prev,
            [course.id]: res.data
          }));
        } catch (err) {
          console.log(`No ratings for course ${course.id}`);
        }
      }
      
      // Load lecturer ratings
      for (const lecturer of lecturers) {
        try {
          const res = await axios.get(`${API_URL}/lecturer-ratings/${lecturer.id}`);
          setLecturerRatings(prev => ({
            ...prev,
            [lecturer.id]: res.data
          }));
        } catch (err) {
          console.log(`No ratings for lecturer ${lecturer.id}`);
        }
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

  const openRatingModal = (item, type) => {
    setSelectedItem(item);
    setRatingType(type);
    setRatingValue(5);
    setRatingReview('');
    setRatingModalVisible(true);
  };

  const submitRating = async () => {
    if (!selectedItem) return;
    
    setSubmitting(true);
    try {
      const endpoint = ratingType === 'course' ? '/rate-course' : '/rate-lecturer';
      const payload = ratingType === 'course' 
        ? { courseId: selectedItem.id, rating: ratingValue, review: ratingReview, raterName: userName, raterRole: 'student' }
        : { lecturerId: selectedItem.id, rating: ratingValue, review: ratingReview, raterName: userName, raterRole: 'student' };
      
      await axios.post(`${API_URL}${endpoint}`, payload);
      
      Alert.alert('Success', `Thank you for rating this ${ratingType}!`);
      setRatingModalVisible(false);
      
      // Reload ratings
      await loadRatings();
      
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const openAttendanceModal = (lecture) => {
    setSelectedLecture(lecture);
    setAttendanceStatus(myAttendance[lecture.id] === 'present' ? 'present' : 'absent');
    setAttendanceModalVisible(true);
  };

  const markAttendance = async () => {
    if (!selectedLecture) return;
    
    setMarkingAttendance(true);
    try {
      await axios.post(`${API_URL}/student-attendance/mark`, {
        studentId: userId,
        studentName: userName,
        lectureId: selectedLecture.id,
        lectureTitle: selectedLecture.title,
        status: attendanceStatus,
        date: new Date().toISOString()
      });
      
      Alert.alert('Success', `Attendance marked as ${attendanceStatus.toUpperCase()} for ${selectedLecture.title}!`);
      setAttendanceModalVisible(false);
      setSelectedLecture(null);
      await loadStudentAttendance();
      
    } catch (error) {
      console.error('Error marking attendance:', error);
      Alert.alert('Error', 'Failed to mark attendance. Please try again.');
    } finally {
      setMarkingAttendance(false);
    }
  };

  const renderRatingStars = (rating, size = 14) => {
    const numRating = parseFloat(rating) || 0;
    const fullStars = Math.floor(numRating);
    const hasHalfStar = numRating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return (
      <View style={{ flexDirection: 'row' }}>
        {[...Array(fullStars)].map((_, i) => (
          <Text key={`full-${i}`} style={[styles.starIcon, { fontSize: size }]}>★</Text>
        ))}
        {hasHalfStar && <Text style={[styles.starIcon, { fontSize: size }]}>½</Text>}
        {[...Array(emptyStars)].map((_, i) => (
          <Text key={`empty-${i}`} style={[styles.starIcon, { fontSize: size, color: '#ccc' }]}>★</Text>
        ))}
      </View>
    );
  };

  const renderModalRatingStars = (currentRating, onRatingChange) => {
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Get upcoming lectures (future dates)
  const getUpcomingLectures = () => {
    const today = new Date().toISOString().split('T')[0];
    return lectures.filter(lecture => lecture.date >= today);
  };

  // Get past lectures
  const getPastLectures = () => {
    const today = new Date().toISOString().split('T')[0];
    return lectures.filter(lecture => lecture.date < today);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const upcomingLectures = getUpcomingLectures();
  const pastLectures = getPastLectures();

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
              <Text style={styles.userRole}>Student Dashboard</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>Welcome to Limkokwing University Monitoring System</Text>
        </View>

        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Card.Content>
              <Title style={styles.statNumber}>{courses.length}</Title>
              <Paragraph>Courses</Paragraph>
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
              <Title style={styles.statNumber}>{upcomingLectures.length}</Title>
              <Paragraph>Upcoming Lectures</Paragraph>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'courses' && styles.activeTab]}
            onPress={() => setActiveTab('courses')}
          >
            <Text style={[styles.tabText, activeTab === 'courses' && styles.activeTabText]}>My Courses</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'lecturers' && styles.activeTab]}
            onPress={() => setActiveTab('lecturers')}
          >
            <Text style={[styles.tabText, activeTab === 'lecturers' && styles.activeTabText]}>Lecturers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'attendance' && styles.activeTab]}
            onPress={() => setActiveTab('attendance')}
          >
            <Text style={[styles.tabText, activeTab === 'attendance' && styles.activeTabText]}>Attendance</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'courses' && (
          <View style={styles.section}>
            <Title style={styles.sectionTitle}>Enrolled Courses</Title>
            {courses.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content>
                  <Paragraph style={styles.emptyText}>No courses available</Paragraph>
                </Card.Content>
              </Card>
            ) : (
              courses.map(course => {
                const avgRating = getCourseAverageRating(course.id);
                return (
                  <Card key={course.id} style={styles.courseCard}>
                    <Card.Content>
                      <Title>{course.name}</Title>
                      <Paragraph>Code: {course.code}</Paragraph>
                      <Paragraph>Stream: {course.stream}</Paragraph>
                      <Paragraph>Credits: {course.credits}</Paragraph>
                      <Paragraph>Semester: {course.semester}</Paragraph>
                      {course.lecturerName && (
                        <Paragraph>Lecturer: {course.lecturerName}</Paragraph>
                      )}
                      <View style={styles.ratingSection}>
                        <Text style={styles.ratingLabel}>Course Rating:</Text>
                        {renderRatingStars(avgRating)}
                        <Text style={styles.ratingValue}>({avgRating}/5)</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.rateButton}
                        onPress={() => openRatingModal(course, 'course')}
                      >
                        <Text style={styles.rateButtonText}>Rate This Course</Text>
                      </TouchableOpacity>
                    </Card.Content>
                  </Card>
                );
              })
            )}
          </View>
        )}

        {activeTab === 'lecturers' && (
          <View style={styles.section}>
            <Title style={styles.sectionTitle}>Our Lecturers</Title>
            {lecturers.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content>
                  <Paragraph style={styles.emptyText}>No lecturers available</Paragraph>
                </Card.Content>
              </Card>
            ) : (
              lecturers.map(lecturer => {
                const avgRating = getLecturerAverageRating(lecturer.id);
                return (
                  <Card key={lecturer.id} style={styles.lecturerCard}>
                    <Card.Content>
                      <Title>{lecturer.name}</Title>
                      <Paragraph>Email: {lecturer.email}</Paragraph>
                      <Paragraph>Department: {lecturer.department || 'Not specified'}</Paragraph>
                      <Paragraph>Specialization: {lecturer.specialization || 'Not specified'}</Paragraph>
                      <View style={styles.ratingSection}>
                        <Text style={styles.ratingLabel}>Lecturer Rating:</Text>
                        {renderRatingStars(avgRating)}
                        <Text style={styles.ratingValue}>({avgRating}/5)</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.rateButton}
                        onPress={() => openRatingModal(lecturer, 'lecturer')}
                      >
                        <Text style={styles.rateButtonText}>Rate This Lecturer</Text>
                      </TouchableOpacity>
                    </Card.Content>
                  </Card>
                );
              })
            )}
          </View>
        )}

        {activeTab === 'attendance' && (
          <View style={styles.section}>
            <Title style={styles.sectionTitle}>Upcoming Lectures</Title>
            {upcomingLectures.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content>
                  <Paragraph style={styles.emptyText}>No upcoming lectures</Paragraph>
                </Card.Content>
              </Card>
            ) : (
              upcomingLectures.map(lecture => {
                const attendanceStatus = myAttendance[lecture.id];
                return (
                  <Card key={lecture.id} style={styles.lectureCard}>
                    <Card.Content>
                      <Title>{lecture.title}</Title>
                      <Paragraph>Date: {lecture.date}</Paragraph>
                      <Paragraph>Time: {lecture.time}</Paragraph>
                      <Paragraph>Venue: {lecture.venue}</Paragraph>
                      <Paragraph>Lecturer: {lecture.lecturerName || 'Not assigned'}</Paragraph>
                      {attendanceStatus ? (
                        <View style={[styles.attendanceStatus, { backgroundColor: attendanceStatus === 'present' ? '#4CAF50' : '#F44336' }]}>
                          <Text style={styles.attendanceStatusText}>
                            {attendanceStatus.toUpperCase()}
                          </Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.attendanceButton}
                          onPress={() => openAttendanceModal(lecture)}
                        >
                          <Text style={styles.attendanceButtonText}>Mark Attendance</Text>
                        </TouchableOpacity>
                      )}
                    </Card.Content>
                  </Card>
                );
              })
            )}

            <Title style={[styles.sectionTitle, { marginTop: 20 }]}>Past Lectures</Title>
            {pastLectures.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content>
                  <Paragraph style={styles.emptyText}>No past lectures</Paragraph>
                </Card.Content>
              </Card>
            ) : (
              pastLectures.map(lecture => {
                const attendanceStatus = myAttendance[lecture.id];
                return (
                  <Card key={lecture.id} style={[styles.lectureCard, attendanceStatus === 'present' && styles.presentCard]}>
                    <Card.Content>
                      <Title>{lecture.title}</Title>
                      <Paragraph>Date: {lecture.date}</Paragraph>
                      <Paragraph>Time: {lecture.time}</Paragraph>
                      <Paragraph>Venue: {lecture.venue}</Paragraph>
                      <Paragraph>Lecturer: {lecture.lecturerName || 'Not assigned'}</Paragraph>
                      <View style={[styles.attendanceStatus, { backgroundColor: attendanceStatus === 'present' ? '#4CAF50' : '#F44336' }]}>
                        <Text style={styles.attendanceStatusText}>
                          {attendanceStatus === 'present' ? 'PRESENT' : 'ABSENT'}
                        </Text>
                      </View>
                    </Card.Content>
                  </Card>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Rating Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={ratingModalVisible}
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Rate {ratingType === 'course' ? 'Course' : 'Lecturer'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {selectedItem?.name || selectedItem?.title}
            </Text>
            
            {renderModalRatingStars(ratingValue, setRatingValue)}
            
            <TextInput
              style={styles.modalInput}
              placeholder="Write your review (optional)"
              value={ratingReview}
              onChangeText={setRatingReview}
              multiline
              numberOfLines={3}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setRatingModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={submitRating}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitButtonText}>Submit Rating</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Attendance Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={attendanceModalVisible}
        onRequestClose={() => setAttendanceModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Mark Attendance</Text>
            <Text style={styles.modalSubtitle}>{selectedLecture?.title}</Text>
            <Text style={styles.modalInfo}>Date: {selectedLecture?.date}</Text>
            <Text style={styles.modalInfo}>Time: {selectedLecture?.time}</Text>
            <Text style={styles.modalInfo}>Venue: {selectedLecture?.venue}</Text>
            
            <Text style={styles.modalLabel}>Attendance Status:</Text>
            <View style={styles.statusButtons}>
              <TouchableOpacity
                style={[styles.statusButton, attendanceStatus === 'present' && styles.statusButtonActive]}
                onPress={() => setAttendanceStatus('present')}
              >
                <Text style={[styles.statusButtonText, attendanceStatus === 'present' && styles.statusButtonTextActive]}>Present</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusButton, attendanceStatus === 'absent' && styles.statusButtonActive]}
                onPress={() => setAttendanceStatus('absent')}
              >
                <Text style={[styles.statusButtonText, attendanceStatus === 'absent' && styles.statusButtonTextActive]}>Absent</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setAttendanceModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={markAttendance}
                disabled={markingAttendance}
              >
                {markingAttendance ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitButtonText}>Save Attendance</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  statCard: { flex: 1, minWidth: '30%', margin: 5, elevation: 3, borderRadius: 10 },
  statNumber: { fontSize: 24, textAlign: 'center', color: '#6200ee', fontWeight: 'bold' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 15, marginBottom: 10, borderRadius: 10, elevation: 2 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#6200ee' },
  tabText: { fontSize: 14, color: '#666', fontWeight: '500' },
  activeTabText: { color: '#fff' },
  section: { padding: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  emptyCard: { marginBottom: 10, backgroundColor: '#f0f0f0' },
  emptyText: { textAlign: 'center', color: '#999' },
  courseCard: { marginBottom: 10, elevation: 2, borderRadius: 8 },
  lecturerCard: { marginBottom: 10, elevation: 2, borderRadius: 8 },
  lectureCard: { marginBottom: 10, elevation: 2, borderRadius: 8 },
  presentCard: { backgroundColor: '#e8f5e9' },
  ratingSection: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  ratingLabel: { fontSize: 12, color: '#666', marginRight: 8 },
  ratingValue: { fontSize: 12, color: '#666', marginLeft: 5 },
  starIcon: { color: '#FFD700', marginRight: 2 },
  rateButton: { backgroundColor: '#FF9800', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  rateButtonText: { color: '#fff', fontWeight: 'bold' },
  attendanceButton: { backgroundColor: '#4CAF50', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  attendanceButtonText: { color: '#fff', fontWeight: 'bold' },
  attendanceStatus: { padding: 8, borderRadius: 8, alignItems: 'center', marginTop: 10, width: 100 },
  attendanceStatusText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', borderRadius: 10, padding: 20, width: '90%', maxWidth: 400 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', color: '#6200ee', marginBottom: 10 },
  modalSubtitle: { textAlign: 'center', fontSize: 14, color: '#666', marginBottom: 10 },
  modalInfo: { textAlign: 'center', fontSize: 12, color: '#999', marginBottom: 5 },
  modalLabel: { fontWeight: 'bold', marginTop: 10, marginBottom: 5 },
  starsContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  ratingStar: { fontSize: 40, marginHorizontal: 5, color: '#ddd' },
  ratingStarSelected: { color: '#FFD700' },
  modalInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modalButton: { flex: 1, padding: 12, borderRadius: 8, marginHorizontal: 5, alignItems: 'center' },
  cancelButton: { backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ddd' },
  cancelButtonText: { color: '#666' },
  submitButton: { backgroundColor: '#6200ee' },
  submitButtonText: { color: '#fff', fontWeight: 'bold' },
  statusButtons: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
  statusButton: { flex: 1, padding: 12, borderRadius: 8, marginHorizontal: 5, alignItems: 'center', borderWidth: 1, borderColor: '#ddd', backgroundColor: '#f5f5f5' },
  statusButtonActive: { backgroundColor: '#6200ee', borderColor: '#6200ee' },
  statusButtonText: { color: '#666', fontWeight: 'bold' },
  statusButtonTextActive: { color: '#fff' },
});

export default StudentDashboard;