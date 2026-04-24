import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { Card, Title, Paragraph } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const LecturerDashboard = ({ navigation }) => {
  const [courses, setCourses] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [reports, setReports] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('lectures');
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [lecturerId, setLecturerId] = useState('');
  
  // Rate Course Modal - Now using backend API
  const [rateCourseModalVisible, setRateCourseModalVisible] = useState(false);
  const [selectedCourseForRating, setSelectedCourseForRating] = useState(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  
  // Attendance modal
  const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [attendanceCount, setAttendanceCount] = useState('');
  const [submittingAttendance, setSubmittingAttendance] = useState(false);
  
  // Create lecture modal
  const [modalVisible, setModalVisible] = useState(false);
  const [newLecture, setNewLecture] = useState({
    title: '',
    description: '',
    courseId: '',
    date: '',
    time: '',
    duration: '60',
    venue: '',
    totalStudents: ''
  });

  // Helper to get auth headers
  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('userToken');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    loadAllData();
    getUserInfo();
  }, []);

  const getUserInfo = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setUserName(user.name || 'Lecturer');
        setUserEmail(user.email || '');
        setLecturerId(user.uid || user.id || '');
      }
    } catch (error) {
      console.error('Error getting user info:', error);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      
      // Fetch courses from backend
      const coursesRes = await axios.get(`${API_URL}/courses`, headers);
      setCourses(coursesRes.data || []);
      
      // Fetch lectures from backend
      const lecturesRes = await axios.get(`${API_URL}/lectures`, headers);
      setLectures(lecturesRes.data || []);
      
      // Fetch lecturer's reports from backend
      const reportsRes = await axios.get(`${API_URL}/lecturer-reports`, headers);
      setReports(reportsRes.data || []);
      
      // Fetch attendance records from backend
      const attendanceRes = await axios.get(`${API_URL}/attendance`, headers);
      setAttendanceRecords(attendanceRes.data || []);
      
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredLectures = () => {
    if (selectedFilter === 'all') {
      return lectures;
    }
    return lectures.filter(l => l.courseId === selectedFilter);
  };

  const getCourseName = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    return course ? course.name : courseId;
  };

  const getAttendanceForLecture = (lectureId) => {
    const record = attendanceRecords.find(a => a.lectureId === lectureId);
    return record;
  };

  const getCourseAverageRating = (courseId) => {
    // This would come from backend - for now return 0
    return 0;
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

  const createLecture = async () => {
    if (!newLecture.title || !newLecture.courseId || !newLecture.date || !newLecture.time) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setCreating(true);
    try {
      const headers = await getAuthHeaders();
      const lectureData = {
        title: newLecture.title,
        description: newLecture.description || '',
        courseId: newLecture.courseId,
        date: newLecture.date,
        time: newLecture.time,
        duration: parseInt(newLecture.duration),
        venue: newLecture.venue,
        totalStudents: parseInt(newLecture.totalStudents) || 0,
        lecturerName: userName,
        createdAt: new Date().toISOString()
      };
      
      await axios.post(`${API_URL}/lectures`, lectureData, headers);
      
      setSuccessMessage(`Lecture "${newLecture.title}" created successfully!`);
      setShowSuccessModal(true);
      
      setModalVisible(false);
      setNewLecture({
        title: '',
        description: '',
        courseId: '',
        date: '',
        time: '',
        duration: '60',
        venue: '',
        totalStudents: ''
      });
      await loadAllData();
      
      setTimeout(() => setShowSuccessModal(false), 2000);
    } catch (error) {
      Alert.alert('Error', 'Failed to create lecture');
    } finally {
      setCreating(false);
    }
  };

  const deleteLecture = async (lectureId, lectureTitle) => {
    Alert.alert(
      'Delete Lecture',
      `Are you sure you want to delete "${lectureTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              await axios.delete(`${API_URL}/lectures/${lectureId}`, headers);
              setSuccessMessage(`Lecture "${lectureTitle}" deleted successfully!`);
              setShowSuccessModal(true);
              await loadAllData();
              setTimeout(() => setShowSuccessModal(false), 2000);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete lecture');
            }
          }
        }
      ]
    );
  };

  const submitCourseRating = async () => {
    if (!selectedCourseForRating) return;
    
    setSubmittingRating(true);
    try {
      const headers = await getAuthHeaders();
      await axios.post(`${API_URL}/ratings/courses`, {
        courseId: selectedCourseForRating.id,
        courseName: selectedCourseForRating.name,
        rating: ratingValue,
        review: ratingComment,
        raterName: userName
      }, headers);
      
      setSuccessMessage(`You rated "${selectedCourseForRating.name}" ${ratingValue} stars!`);
      setShowSuccessModal(true);
      setRateCourseModalVisible(false);
      setRatingValue(5);
      setRatingComment('');
      setSelectedCourseForRating(null);
      setTimeout(() => setShowSuccessModal(false), 2000);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  const markAttendance = async () => {
    if (!selectedLecture || !attendanceCount) {
      Alert.alert('Error', 'Please enter number of students present');
      return;
    }

    const presentCount = parseInt(attendanceCount);
    if (presentCount > selectedLecture.totalStudents) {
      Alert.alert('Error', 'Present count cannot exceed total students');
      return;
    }

    setSubmittingAttendance(true);
    try {
      const headers = await getAuthHeaders();
      await axios.post(`${API_URL}/attendance/bulk`, {
        lectureId: selectedLecture.id,
        lectureTitle: selectedLecture.title,
        courseId: selectedLecture.courseId,
        students: [
          {
            studentId: `student_${Date.now()}`,
            studentName: 'Student',
            status: 'present'
          }
        ]
      }, headers);
      
      // Also update the lecture's attendance count
      await axios.post(`${API_URL}/lectures/${selectedLecture.id}/attendance`, {
        presentCount: presentCount,
        totalStudents: selectedLecture.totalStudents
      }, headers);
      
      setSuccessMessage(`Attendance marked: ${presentCount}/${selectedLecture.totalStudents} students present`);
      setShowSuccessModal(true);
      setAttendanceModalVisible(false);
      setSelectedLecture(null);
      setAttendanceCount('');
      await loadAllData();
      setTimeout(() => setShowSuccessModal(false), 2000);
    } catch (error) {
      Alert.alert('Error', 'Failed to mark attendance');
    } finally {
      setSubmittingAttendance(false);
    }
  };

  const viewAttendanceList = async (lectureId, lectureTitle) => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(`${API_URL}/attendance/lecture/${lectureId}`, headers);
      const records = response.data || [];
      
      if (records.length === 0) {
        Alert.alert('Attendance', 'No attendance records for this lecture yet');
        return;
      }
      
      const presentCount = records.filter(r => r.status === 'present').length;
      const absentCount = records.filter(r => r.status === 'absent').length;
      const lateCount = records.filter(r => r.status === 'late').length;
      
      const attendanceList = records.map(r => 
        `• ${r.studentName || 'Student'}: ${r.status?.toUpperCase() || 'PRESENT'} at ${new Date(r.timestamp).toLocaleTimeString()}`
      ).join('\n');
      
      Alert.alert(
        `Attendance - ${lectureTitle}`,
        `📊 Summary:\n✅ Present: ${presentCount}\n❌ Absent: ${absentCount}\n⏰ Late: ${lateCount}\n👥 Total: ${records.length}\n\n📋 Details:\n${attendanceList}`,
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to load attendance records');
    }
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

  const filteredLectures = getFilteredLectures();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.userName}>{userName || 'Lecturer'}</Text>
              <Text style={styles.userRole}>Lecturer - Limkokwing University</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Text style={styles.logoutText}>🚪 Logout</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>Manage your courses, lectures, and monitor students</Text>
        </View>

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Card.Content>
              <Title style={styles.statNumber}>{courses.length}</Title>
              <Paragraph>My Courses</Paragraph>
            </Card.Content>
          </Card>
          <Card style={styles.statCard}>
            <Card.Content>
              <Title style={styles.statNumber}>{lectures.length}</Title>
              <Paragraph>My Lectures</Paragraph>
            </Card.Content>
          </Card>
          <Card style={styles.statCard}>
            <Card.Content>
              <Title style={styles.statNumber}>{reports.length}</Title>
              <Paragraph>My Reports</Paragraph>
            </Card.Content>
          </Card>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#4CAF50', marginRight: 8 }]}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.actionButtonText}>+ Create Lecture</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#9C27B0', marginLeft: 8 }]}
            onPress={() => navigation.navigate('LecturerReportForm')}
          >
            <Text style={styles.actionButtonText}>📝 Write Report</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'lectures' && styles.activeTab]}
            onPress={() => setActiveTab('lectures')}
          >
            <Text style={[styles.tabText, activeTab === 'lectures' && styles.activeTabText]}>
              📖 Lectures & Classes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'reports' && styles.activeTab]}
            onPress={() => setActiveTab('reports')}
          >
            <Text style={[styles.tabText, activeTab === 'reports' && styles.activeTabText]}>
              📋 My Reports
            </Text>
          </TouchableOpacity>
        </View>

        {/* Lectures Tab */}
        {activeTab === 'lectures' && (
          <>
            <View style={styles.filterContainer}>
              <Text style={styles.filterLabel}>Filter by Course:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                <TouchableOpacity
                  style={[styles.filterChip, selectedFilter === 'all' && styles.filterChipActive]}
                  onPress={() => setSelectedFilter('all')}
                >
                  <Text style={[styles.filterChipText, selectedFilter === 'all' && styles.filterChipTextActive]}>
                    All Courses
                  </Text>
                </TouchableOpacity>
                {courses.map(course => (
                  <TouchableOpacity
                    key={course.id}
                    style={[styles.filterChip, selectedFilter === course.id && styles.filterChipActive]}
                    onPress={() => setSelectedFilter(course.id)}
                  >
                    <Text style={[styles.filterChipText, selectedFilter === course.id && styles.filterChipTextActive]}>
                      {course.code}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <Title style={styles.sectionTitle}>📚 My Courses</Title>
              {courses.map(course => {
                const avgRating = getCourseAverageRating(course.id);
                return (
                  <Card key={course.id} style={styles.courseCard}>
                    <Card.Content>
                      <View style={styles.cardHeader}>
                        <Title>{course.name}</Title>
                        <View style={styles.ratingContainer}>
                          <Text style={styles.avgRatingStars}>{getRatingStars(avgRating)}</Text>
                          <Text style={styles.avgRatingText}> ({avgRating})</Text>
                        </View>
                      </View>
                      <Paragraph>📚 Code: {course.code}</Paragraph>
                      <Paragraph>🎯 Stream: {course.stream}</Paragraph>
                      <Paragraph>📖 Credits: {course.credits}</Paragraph>
                      <TouchableOpacity
                        style={styles.rateCourseButton}
                        onPress={() => {
                          setSelectedCourseForRating(course);
                          setRateCourseModalVisible(true);
                        }}
                      >
                        <Text style={styles.rateCourseButtonText}>⭐ Rate This Course</Text>
                      </TouchableOpacity>
                    </Card.Content>
                  </Card>
                );
              })}
            </View>

            <View style={styles.section}>
              <Title style={styles.sectionTitle}>📖 My Lectures</Title>
              {filteredLectures.map(lecture => {
                const attendance = getAttendanceForLecture(lecture.id);
                return (
                  <Card key={lecture.id} style={styles.lectureCard}>
                    <Card.Content>
                      <View style={styles.cardHeader}>
                        <Title>{lecture.title}</Title>
                        <TouchableOpacity onPress={() => deleteLecture(lecture.id, lecture.title)}>
                          <Text style={styles.deleteText}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                      <Paragraph>{lecture.description}</Paragraph>
                      <Paragraph>🎓 Course: {getCourseName(lecture.courseId)}</Paragraph>
                      <Paragraph>📅 Date: {lecture.date}</Paragraph>
                      <Paragraph>⏰ Time: {lecture.time}</Paragraph>
                      <Paragraph>⏱️ Duration: {lecture.duration} minutes</Paragraph>
                      <Paragraph>📍 Venue: {lecture.venue || 'TBA'}</Paragraph>
                      <View style={styles.attendanceInfo}>
                        <Text style={styles.attendanceLabel}>👥 Total Students: {lecture.totalStudents || 0}</Text>
                        {attendance ? (
                          <>
                            <Text style={styles.attendanceCount}>✅ Present: {attendance.presentCount}</Text>
                            <Text style={styles.attendancePercent}>
                              Attendance: {((attendance.presentCount / lecture.totalStudents) * 100).toFixed(1)}%
                            </Text>
                            <TouchableOpacity
                              style={styles.viewAttendanceButton}
                              onPress={() => viewAttendanceList(lecture.id, lecture.title)}
                            >
                              <Text style={styles.viewAttendanceButtonText}>📊 View Attendance List</Text>
                            </TouchableOpacity>
                          </>
                        ) : (
                          <TouchableOpacity
                            style={styles.markAttendanceButton}
                            onPress={() => {
                              setSelectedLecture(lecture);
                              setAttendanceModalVisible(true);
                            }}
                          >
                            <Text style={styles.markAttendanceButtonText}>📝 Mark Attendance</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </Card.Content>
                  </Card>
                );
              })}
            </View>
          </>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <View style={styles.section}>
            <Title style={styles.sectionTitle}>📋 My Submitted Reports</Title>
            {reports.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content>
                  <Paragraph style={styles.emptyText}>No reports submitted yet</Paragraph>
                  <TouchableOpacity
                    style={styles.writeReportButton}
                    onPress={() => navigation.navigate('LecturerReportForm')}
                  >
                    <Text style={styles.writeReportButtonText}>+ Write Your First Report</Text>
                  </TouchableOpacity>
                </Card.Content>
              </Card>
            ) : (
              reports.map((report, index) => (
                <Card key={report.id || index} style={styles.reportCard}>
                  <Card.Content>
                    <View style={styles.reportHeader}>
                      <Title style={styles.reportTitle}>{report.courseName || 'Untitled Report'}</Title>
                      <View style={[styles.statusBadge, { backgroundColor: report.status === 'approved' ? '#4CAF50' : '#FF9800' }]}>
                        <Text style={styles.statusText}>{report.status?.toUpperCase() || 'PENDING'}</Text>
                      </View>
                    </View>
                    <Paragraph>📅 Date of Lecture: {report.dateOfLecture || 'N/A'}</Paragraph>
                    <Paragraph>📚 Course Code: {report.courseCode || 'N/A'}</Paragraph>
                    <Paragraph>🏛️ Faculty: {report.facultyName || 'N/A'}</Paragraph>
                    <Paragraph>📖 Class: {report.className || 'N/A'}</Paragraph>
                    <Paragraph>📆 Week: {report.weekOfReporting || 'N/A'}</Paragraph>
                    <Paragraph>📍 Venue: {report.venue || 'N/A'}</Paragraph>
                    <Paragraph>⏰ Scheduled Time: {report.scheduledTime || 'N/A'}</Paragraph>
                    <Paragraph>👥 Students Present: {report.actualStudentsPresent || 0} / {report.totalRegisteredStudents || 0}</Paragraph>
                    <View style={styles.outcomesContainer}>
                      <Text style={styles.outcomesLabel}>📖 Topic Taught:</Text>
                      <Text style={styles.outcomesText}>{report.topicTaught || 'N/A'}</Text>
                    </View>
                    <View style={styles.outcomesContainer}>
                      <Text style={styles.outcomesLabel}>🎯 Learning Outcomes:</Text>
                      <Text style={styles.outcomesText}>{report.learningOutcomes || 'N/A'}</Text>
                    </View>
                    {report.recommendations && (
                      <View style={styles.recommendationsContainer}>
                        <Text style={styles.recommendationsLabel}>💡 Recommendations:</Text>
                        <Text style={styles.recommendationsText}>{report.recommendations}</Text>
                      </View>
                    )}
                    {report.feedback && (
                      <View style={styles.feedbackContainer}>
                        <Text style={styles.feedbackLabel}>📝 PRL Feedback:</Text>
                        <Text style={styles.feedbackText}>{report.feedback}</Text>
                      </View>
                    )}
                    <Text style={styles.submittedDate}>
                      Submitted: {report.submittedAt ? new Date(report.submittedAt).toLocaleString() : new Date().toLocaleString()}
                    </Text>
                  </Card.Content>
                </Card>
              ))
            )}
          </View>
        )}

        {/* Profile Section */}
        <View style={styles.section}>
          <Title style={styles.sectionTitle}>👨‍🏫 My Profile</Title>
          <Card style={styles.profileCard}>
            <Card.Content>
              <Title>{userName}</Title>
              <Paragraph>📧 {userEmail || 'lecturer@limkokwing.ac.ls'}</Paragraph>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>

      {/* Create Lecture Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Lecture</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Lecture Title *"
              value={newLecture.title}
              onChangeText={(text) => setNewLecture({...newLecture, title: text})}
            />
            
            <TextInput
              style={[styles.modalInput, styles.textArea]}
              placeholder="Description"
              value={newLecture.description}
              onChangeText={(text) => setNewLecture({...newLecture, description: text})}
              multiline
            />
            
            <Text style={styles.modalLabel}>Select Course:</Text>
            {courses.map(course => (
              <TouchableOpacity
                key={course.id}
                style={[
                  styles.courseOption,
                  newLecture.courseId === course.id && styles.courseOptionSelected
                ]}
                onPress={() => setNewLecture({...newLecture, courseId: course.id})}
              >
                <Text style={newLecture.courseId === course.id ? styles.courseOptionTextSelected : styles.courseOptionText}>
                  {course.name} ({course.code})
                </Text>
              </TouchableOpacity>
            ))}
            
            <TextInput
              style={styles.modalInput}
              placeholder="Date (YYYY-MM-DD) *"
              value={newLecture.date}
              onChangeText={(text) => setNewLecture({...newLecture, date: text})}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Time (HH:MM AM/PM) *"
              value={newLecture.time}
              onChangeText={(text) => setNewLecture({...newLecture, time: text})}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Duration (minutes)"
              value={newLecture.duration}
              onChangeText={(text) => setNewLecture({...newLecture, duration: text})}
              keyboardType="numeric"
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Venue"
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
                onPress={() => setModalVisible(false)}
                disabled={creating}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={createLecture}
                disabled={creating}
              >
                {creating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitButtonText}>Create Lecture</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Rate Course Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={rateCourseModalVisible}
        onRequestClose={() => setRateCourseModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rate Course</Text>
            <Text style={styles.modalCourse}>{selectedCourseForRating?.name}</Text>
            <Text style={styles.modalSubtitle}>Code: {selectedCourseForRating?.code}</Text>
            
            <Text style={styles.modalLabel}>Your Rating:</Text>
            <View style={styles.ratingStarsContainer}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setRatingValue(star)}>
                  <Text style={[styles.ratingStar, ratingValue >= star && styles.ratingStarSelected]}>
                    {ratingValue >= star ? '★' : '☆'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Write your review (optional)"
              value={ratingComment}
              onChangeText={setRatingComment}
              multiline
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setRateCourseModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={submitCourseRating}
                disabled={submittingRating}
              >
                {submittingRating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitButtonText}>Submit Rating</Text>}
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
            <Text style={styles.modalLecture}>{selectedLecture?.title}</Text>
            
            <Text style={styles.modalLabel}>Total Students: {selectedLecture?.totalStudents}</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Number of Students Present *"
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
                disabled={submittingAttendance}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={markAttendance}
                disabled={submittingAttendance || !attendanceCount}
              >
                {submittingAttendance ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitButtonText}>Submit Attendance</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSuccessModal}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successModalText}>{successMessage}</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  header: { backgroundColor: '#6200ee', padding: 20, paddingTop: 20, paddingBottom: 25 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  greeting: { fontSize: 14, color: '#fff', opacity: 0.9 },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginTop: 2 },
  userRole: { fontSize: 12, color: '#fff', opacity: 0.7, marginTop: 2 },
  logoutButton: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  logoutText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  subtitle: { fontSize: 12, color: '#fff', opacity: 0.8, marginTop: 5 },
  statsContainer: { flexDirection: 'row', flexWrap: 'wrap', padding: 15, marginTop: 10 },
  statCard: { flex: 1, minWidth: '30%', margin: 5, elevation: 3, borderRadius: 10 },
  statNumber: { fontSize: 20, textAlign: 'center', color: '#6200ee', fontWeight: 'bold' },
  actionButtonsRow: { flexDirection: 'row', paddingHorizontal: 15, marginBottom: 10 },
  actionButton: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
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
  section: { padding: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  courseCard: { marginBottom: 10, elevation: 2, borderRadius: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ratingContainer: { flexDirection: 'row', alignItems: 'center' },
  avgRatingStars: { fontSize: 14, color: '#FFD700' },
  avgRatingText: { fontSize: 12, color: '#666', marginLeft: 5 },
  rateCourseButton: { backgroundColor: '#FF9800', padding: 8, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  rateCourseButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  lectureCard: { marginBottom: 10, elevation: 2, borderRadius: 8 },
  deleteText: { fontSize: 20 },
  attendanceInfo: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  attendanceLabel: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  attendanceCount: { fontSize: 12, color: '#4CAF50', marginTop: 4 },
  attendancePercent: { fontSize: 12, color: '#2196F3', marginTop: 4 },
  markAttendanceButton: { backgroundColor: '#2196F3', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  markAttendanceButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  viewAttendanceButton: { backgroundColor: '#4CAF50', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  viewAttendanceButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  profileCard: { marginBottom: 10, elevation: 2, borderRadius: 8, backgroundColor: '#e3f2fd' },
  emptyCard: { marginBottom: 10, backgroundColor: '#f0f0f0', padding: 20, alignItems: 'center' },
  emptyText: { textAlign: 'center', color: '#999', marginBottom: 15 },
  writeReportButton: { backgroundColor: '#9C27B0', padding: 12, borderRadius: 8, alignItems: 'center' },
  writeReportButtonText: { color: '#fff', fontWeight: 'bold' },
  reportCard: { marginBottom: 15, elevation: 2, borderRadius: 8 },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  reportTitle: { fontSize: 16, flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  outcomesContainer: { marginTop: 10, padding: 10, backgroundColor: '#f5f5f5', borderRadius: 8 },
  outcomesLabel: { fontWeight: 'bold', fontSize: 12, color: '#333' },
  outcomesText: { fontSize: 12, color: '#666', marginTop: 4 },
  recommendationsContainer: { marginTop: 10, padding: 10, backgroundColor: '#FFF3E0', borderRadius: 8 },
  recommendationsLabel: { fontWeight: 'bold', fontSize: 12, color: '#FF9800' },
  recommendationsText: { fontSize: 12, color: '#666', marginTop: 4 },
  feedbackContainer: { marginTop: 10, padding: 10, backgroundColor: '#E8F5E9', borderRadius: 8 },
  feedbackLabel: { fontWeight: 'bold', fontSize: 12, color: '#4CAF50' },
  feedbackText: { fontSize: 12, color: '#666', marginTop: 4 },
  submittedDate: { fontSize: 10, color: '#999', marginTop: 10 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
  modalContent: { backgroundColor: '#fff', margin: 20, borderRadius: 10, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 10, color: '#6200ee' },
  modalSubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 20, color: '#666' },
  modalCourse: { textAlign: 'center', fontSize: 16, fontWeight: 'bold', marginBottom: 5, color: '#333' },
  modalLecture: { textAlign: 'center', fontSize: 16, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  modalLabel: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, marginTop: 10 },
  modalInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 14 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  courseOption: { padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 8 },
  courseOptionSelected: { backgroundColor: '#6200ee', borderColor: '#6200ee' },
  courseOptionText: { color: '#333' },
  courseOptionTextSelected: { color: '#fff', fontWeight: 'bold' },
  ratingStarsContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 15 },
  ratingStar: { fontSize: 40, marginHorizontal: 5, color: '#ddd' },
  ratingStarSelected: { color: '#FFD700' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modalButton: { flex: 1, padding: 12, borderRadius: 8, marginHorizontal: 5, alignItems: 'center' },
  cancelButton: { backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ddd' },
  cancelButtonText: { color: '#666' },
  submitButton: { backgroundColor: '#6200ee' },
  submitButtonText: { color: '#fff', fontWeight: 'bold' },
  successModalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  successModalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 25, alignItems: 'center', minWidth: 250 },
  successIcon: { fontSize: 48, marginBottom: 15 },
  successModalText: { fontSize: 16, color: '#333', textAlign: 'center', fontWeight: '500' },
});

export default LecturerDashboard;