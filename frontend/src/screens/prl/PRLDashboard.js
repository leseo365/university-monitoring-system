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
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { Card, Title, Paragraph } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const PRLDashboard = ({ navigation }) => {
  const [userName, setUserName] = useState('');
  const [prlId, setPrlId] = useState('');
  const [courses, setCourses] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [reports, setReports] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('courses');
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Store ratings
  const [courseRatings, setCourseRatings] = useState({});
  const [lecturerRatings, setLecturerRatings] = useState({});
  
  // Report review modal
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  
  // Course rating modal
  const [courseRatingModalVisible, setCourseRatingModalVisible] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseRating, setCourseRating] = useState(5);
  const [courseReview, setCourseReview] = useState('');
  const [courseRatingSubmitted, setCourseRatingSubmitted] = useState(false);
  
  // Lecturer rating modal
  const [lecturerRatingModalVisible, setLecturerRatingModalVisible] = useState(false);
  const [selectedLecturer, setSelectedLecturer] = useState(null);
  const [lecturerRating, setLecturerRating] = useState(5);
  const [lecturerReview, setLecturerReview] = useState('');
  const [lecturerRatingSubmitted, setLecturerRatingSubmitted] = useState(false);
  
  // Lecture monitoring modal
  const [lectureModalVisible, setLectureModalVisible] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState(null);

  // Helper to get auth headers
  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('userToken');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    loadAllData();
    getUserInfo();
    loadRatings();
  }, []);

  const getUserInfo = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setUserName(user.name || 'PRL');
        setPrlId(user.uid || user.id || 'prl1');
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
      
      // Fetch lecturers from backend
      const lecturersRes = await axios.get(`${API_URL}/lecturers`, headers);
      setLecturers(lecturersRes.data || []);
      
      // Fetch lectures from backend
      const lecturesRes = await axios.get(`${API_URL}/lectures`, headers);
      setLectures(lecturesRes.data || []);
      
      // Fetch lecturer reports from backend
      const reportsRes = await axios.get(`${API_URL}/reports`, headers);
      setReports(reportsRes.data || []);
      
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const loadRatings = async () => {
    try {
      const headers = await getAuthHeaders();
      
      // Load course ratings
      const courseRatingsRes = await axios.get(`${API_URL}/ratings/courses`, headers);
      setCourseRatings(courseRatingsRes.data || {});
      
      // Load lecturer ratings
      const lecturerRatingsRes = await axios.get(`${API_URL}/ratings/lecturers`, headers);
      setLecturerRatings(lecturerRatingsRes.data || {});
      
    } catch (error) {
      console.log('No ratings found');
    }
  };

  const getCourseAverageRating = (courseId) => {
    const ratings = courseRatings[courseId] || [];
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return (sum / ratings.length).toFixed(1);
  };

  const getLecturerAverageRating = (lecturerId) => {
    const ratings = lecturerRatings[lecturerId] || [];
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return (sum / ratings.length).toFixed(1);
  };

  const getFilteredReports = () => {
    if (selectedFilter === 'all') {
      return reports;
    }
    if (selectedFilter === 'pending') {
      return reports.filter(r => !r.feedback);
    }
    if (selectedFilter === 'reviewed') {
      return reports.filter(r => r.feedback);
    }
    return reports;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    await loadRatings();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure?', [
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

  const submitFeedback = async () => {
    if (!feedback.trim()) {
      Alert.alert('Error', 'Please enter feedback');
      return;
    }

    setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      await axios.put(`${API_URL}/reports/${selectedReport.id}/feedback`, {
        feedback: feedback
      }, headers);
      
      setSuccessMessage(`Feedback submitted for ${selectedReport.lecturerName}'s report`);
      setShowSuccessModal(true);
      setFeedbackSubmitted(true);
      
      setTimeout(() => {
        setReportModalVisible(false);
        setFeedback('');
        setFeedbackSubmitted(false);
        setSelectedReport(null);
        setShowSuccessModal(false);
        loadAllData();
      }, 2000);
      
    } catch (error) {
      Alert.alert('Error', 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const submitCourseRating = async () => {
    setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      await axios.post(`${API_URL}/ratings/courses`, {
        courseId: selectedCourse.id,
        courseName: selectedCourse.name,
        rating: courseRating,
        review: courseReview,
        raterName: userName
      }, headers);
      
      setSuccessMessage(`Thank you for rating "${selectedCourse.name}"!`);
      setShowSuccessModal(true);
      setCourseRatingSubmitted(true);
      
      setTimeout(() => {
        setCourseRatingModalVisible(false);
        setCourseRating(5);
        setCourseReview('');
        setCourseRatingSubmitted(false);
        setSelectedCourse(null);
        setShowSuccessModal(false);
        loadRatings();
      }, 2000);
      
    } catch (error) {
      Alert.alert('Error', 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  const submitLecturerRating = async () => {
    setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      await axios.post(`${API_URL}/ratings/lecturers`, {
        lecturerId: selectedLecturer.id,
        lecturerName: selectedLecturer.name,
        rating: lecturerRating,
        review: lecturerReview,
        raterName: userName
      }, headers);
      
      setSuccessMessage(`Thank you for rating ${selectedLecturer.name}!`);
      setShowSuccessModal(true);
      setLecturerRatingSubmitted(true);
      
      setTimeout(() => {
        setLecturerRatingModalVisible(false);
        setLecturerRating(5);
        setLecturerReview('');
        setLecturerRatingSubmitted(false);
        setSelectedLecturer(null);
        setShowSuccessModal(false);
        loadRatings();
      }, 2000);
      
    } catch (error) {
      Alert.alert('Error', 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingStars = (rating) => {
    const numRating = parseFloat(rating) || 0;
    return '★'.repeat(Math.round(numRating)) + '☆'.repeat(5 - Math.round(numRating));
  };

  const renderRatingStars = (currentRating, onRatingChange) => {
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

  const filteredReports = getFilteredReports();
  const pendingCount = reports.filter(r => !r.feedback).length;
  const reviewedCount = reports.filter(r => r.feedback).length;

  const getAttendanceRate = (attendance, total) => {
    if (total && attendance) {
      return ((attendance / total) * 100).toFixed(1);
    }
    return 0;
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.userName}>Prof. {userName}</Text>
              <Text style={styles.userRole}>Principal Lecturer</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Text style={styles.logoutText}>🚪 Logout</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>Review Reports, Rate Courses & Lecturers, Monitor Classes</Text>
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
              <Title style={styles.statNumber}>{pendingCount}</Title>
              <Paragraph>Pending Reports</Paragraph>
            </Card.Content>
          </Card>
          <Card style={styles.statCard}>
            <Card.Content>
              <Title style={styles.statNumber}>{lectures.length}</Title>
              <Paragraph>Lectures</Paragraph>
            </Card.Content>
          </Card>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'courses' && styles.activeTab]}
            onPress={() => setActiveTab('courses')}
          >
            <Text style={[styles.tabText, activeTab === 'courses' && styles.activeTabText]}>
              📚 Courses
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'reports' && styles.activeTab]}
            onPress={() => setActiveTab('reports')}
          >
            <Text style={[styles.tabText, activeTab === 'reports' && styles.activeTabText]}>
              📋 Reports
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'lectures' && styles.activeTab]}
            onPress={() => setActiveTab('lectures')}
          >
            <Text style={[styles.tabText, activeTab === 'lectures' && styles.activeTabText]}>
              👁️ Monitor
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'rating' && styles.activeTab]}
            onPress={() => setActiveTab('rating')}
          >
            <Text style={[styles.tabText, activeTab === 'rating' && styles.activeTabText]}>
              ⭐ Rating
            </Text>
          </TouchableOpacity>
        </View>

        {/* Courses Tab */}
        {activeTab === 'courses' && (
          <View style={styles.section}>
            <Title style={styles.sectionTitle}>📚 Courses</Title>
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
                    <Paragraph>Stream: {course.stream}</Paragraph>
                    <Paragraph>Credits: {course.credits}</Paragraph>
                    <Paragraph>👨‍🏫 Lecturer: {course.lecturerName || 'Not Assigned'}</Paragraph>
                  </Card.Content>
                </Card>
              );
            })}
          </View>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <>
            <View style={styles.filterContainer}>
              <Text style={styles.filterLabel}>Filter Reports:</Text>
              <View style={styles.filterButtons}>
                <TouchableOpacity
                  style={[styles.filterChip, selectedFilter === 'all' && styles.filterChipActive]}
                  onPress={() => setSelectedFilter('all')}
                >
                  <Text style={[styles.filterChipText, selectedFilter === 'all' && styles.filterChipTextActive]}>
                    All ({reports.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterChip, selectedFilter === 'pending' && styles.filterChipActive]}
                  onPress={() => setSelectedFilter('pending')}
                >
                  <Text style={[styles.filterChipText, selectedFilter === 'pending' && styles.filterChipTextActive]}>
                    Pending ({pendingCount})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterChip, selectedFilter === 'reviewed' && styles.filterChipActive]}
                  onPress={() => setSelectedFilter('reviewed')}
                >
                  <Text style={[styles.filterChipText, selectedFilter === 'reviewed' && styles.filterChipTextActive]}>
                    Reviewed ({reviewedCount})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Title style={styles.sectionTitle}>📋 Lecturer Reports</Title>
              {filteredReports.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <Card.Content>
                    <Paragraph style={styles.emptyText}>No reports in this category</Paragraph>
                  </Card.Content>
                </Card>
              ) : (
                filteredReports.map(report => {
                  const lecture = lectures.find(l => l.id === report.lectureId);
                  return (
                    <Card key={report.id} style={[styles.reportCard, report.feedback && styles.reviewedCard]}>
                      <Card.Content>
                        <View style={styles.reportHeader}>
                          <View>
                            <Text style={styles.reportLecturer}>👨‍🏫 {report.lecturerName}</Text>
                            <Text style={styles.reportLecture}>📖 {lecture?.title || 'Unknown Lecture'}</Text>
                          </View>
                          <Text style={styles.reportRating}>{getRatingStars(report.rating)}</Text>
                        </View>
                        <Text style={styles.reportDate}>
                          Submitted: {new Date(report.createdAt).toLocaleDateString()}
                        </Text>
                        <Paragraph style={styles.reportContent}>{report.content}</Paragraph>
                        {report.feedback ? (
                          <View style={styles.feedbackContainer}>
                            <Text style={styles.feedbackLabel}>✓ Your Feedback:</Text>
                            <Text style={styles.feedbackText}>{report.feedback}</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.reviewButton}
                            onPress={() => {
                              setSelectedReport(report);
                              setReportModalVisible(true);
                            }}
                          >
                            <Text style={styles.reviewButtonText}>✏️ Add Feedback</Text>
                          </TouchableOpacity>
                        )}
                      </Card.Content>
                    </Card>
                  );
                })
              )}
            </View>
          </>
        )}

        {/* Monitor Lectures Tab */}
        {activeTab === 'lectures' && (
          <View style={styles.section}>
            <Title style={styles.sectionTitle}>👁️ Monitor Lectures</Title>
            {lectures.map(lecture => {
              const attendanceRate = getAttendanceRate(lecture.attendance || 0, lecture.totalStudents || 0);
              return (
                <Card key={lecture.id} style={styles.lectureCard}>
                  <Card.Content>
                    <Title>{lecture.title}</Title>
                    <Paragraph>{lecture.description || 'No description'}</Paragraph>
                    <Paragraph>👨‍🏫 Lecturer: {lecture.lecturerName || 'TBA'}</Paragraph>
                    <Paragraph>📅 Date: {lecture.date}</Paragraph>
                    <Paragraph>⏰ Time: {lecture.time}</Paragraph>
                    <Paragraph>⏱️ Duration: {lecture.duration} mins</Paragraph>
                    <Paragraph>📍 Venue: {lecture.venue}</Paragraph>
                    <View style={styles.attendanceInfo}>
                      <Text style={styles.attendanceLabel}>👥 Attendance:</Text>
                      <Text style={styles.attendanceCount}>{lecture.attendance || 0} / {lecture.totalStudents || 0} students</Text>
                      <Text style={styles.attendancePercent}>({attendanceRate}%)</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.monitorButton}
                      onPress={() => {
                        setSelectedLecture(lecture);
                        setLectureModalVisible(true);
                      }}
                    >
                      <Text style={styles.monitorButtonText}>🔍 View Details</Text>
                    </TouchableOpacity>
                  </Card.Content>
                </Card>
              );
            })}
          </View>
        )}

        {/* Rating Tab */}
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
                      <Paragraph>Stream: {course.stream}</Paragraph>
                      <Paragraph>Credits: {course.credits}</Paragraph>
                      <Paragraph>👨‍🏫 Lecturer: {course.lecturerName || 'Not Assigned'}</Paragraph>
                      <TouchableOpacity
                        style={styles.rateButton}
                        onPress={() => {
                          setSelectedCourse(course);
                          setCourseRatingModalVisible(true);
                        }}
                      >
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
                      <Paragraph>📧 {lecturer.email}</Paragraph>
                      <Paragraph>📚 Department: {lecturer.department}</Paragraph>
                      <TouchableOpacity
                        style={styles.rateButton}
                        onPress={() => {
                          setSelectedLecturer(lecturer);
                          setLecturerRatingModalVisible(true);
                        }}
                      >
                        <Text style={styles.rateButtonText}>⭐ Rate This Lecturer</Text>
                      </TouchableOpacity>
                    </Card.Content>
                  </Card>
                );
              })}
            </View>
          </>
        )}

        {/* Feedback Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={reportModalVisible}
          onRequestClose={() => {
            if (!feedbackSubmitted) {
              setReportModalVisible(false);
              setFeedback('');
              setSelectedReport(null);
            }
          }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {feedbackSubmitted ? (
                <View style={styles.successContainer}>
                  <Text style={styles.successIcon}>✅</Text>
                  <Text style={styles.successTitle}>Feedback Submitted!</Text>
                  <Text style={styles.successMessage}>
                    Your feedback has been sent to {selectedReport?.lecturerName}
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.modalTitle}>Add Feedback</Text>
                  
                  <Text style={styles.modalLabel}>Report from:</Text>
                  <Text style={styles.modalLecturer}>{selectedReport?.lecturerName}</Text>
                  
                  <Text style={styles.modalLabel}>Report Content:</Text>
                  <View style={styles.reportPreview}>
                    <Text style={styles.reportPreviewText}>{selectedReport?.content}</Text>
                    <Text style={styles.reportPreviewRating}>
                      Rating: {getRatingStars(selectedReport?.rating || 0)}
                    </Text>
                  </View>
                  
                  <Text style={styles.modalLabel}>Your Feedback:</Text>
                  <TextInput
                    style={styles.feedbackInput}
                    placeholder="Enter your feedback for the lecturer..."
                    value={feedback}
                    onChangeText={setFeedback}
                    multiline
                  />
                  
                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => {
                        setReportModalVisible(false);
                        setFeedback('');
                      }}
                      disabled={submitting}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.submitButton]}
                      onPress={submitFeedback}
                      disabled={submitting || !feedback.trim()}
                    >
                      {submitting ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.submitButtonText}>Submit Feedback</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Course Rating Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={courseRatingModalVisible}
          onRequestClose={() => {
            if (!courseRatingSubmitted) {
              setCourseRatingModalVisible(false);
              setCourseRating(5);
              setCourseReview('');
              setSelectedCourse(null);
            }
          }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {courseRatingSubmitted ? (
                <View style={styles.successContainer}>
                  <Text style={styles.successIcon}>⭐</Text>
                  <Text style={styles.successTitle}>Rating Submitted!</Text>
                  <Text style={styles.successMessage}>
                    Thank you for rating "{selectedCourse?.name}"
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.modalTitle}>Rate Course</Text>
                  <Text style={styles.modalCourse}>{selectedCourse?.name}</Text>
                  <Text style={styles.modalSubtitle}>Code: {selectedCourse?.code}</Text>
                  
                  <Text style={styles.modalLabel}>Your Rating:</Text>
                  {renderRatingStars(courseRating, setCourseRating)}
                  
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Write your review (optional)"
                    value={courseReview}
                    onChangeText={setCourseReview}
                    multiline
                  />
                  
                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => {
                        setCourseRatingModalVisible(false);
                        setCourseRating(5);
                        setCourseReview('');
                      }}
                      disabled={submitting}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.submitButton]}
                      onPress={submitCourseRating}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.submitButtonText}>Submit Rating</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Lecturer Rating Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={lecturerRatingModalVisible}
          onRequestClose={() => {
            if (!lecturerRatingSubmitted) {
              setLecturerRatingModalVisible(false);
              setLecturerRating(5);
              setLecturerReview('');
              setSelectedLecturer(null);
            }
          }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {lecturerRatingSubmitted ? (
                <View style={styles.successContainer}>
                  <Text style={styles.successIcon}>👨‍🏫</Text>
                  <Text style={styles.successTitle}>Rating Submitted!</Text>
                  <Text style={styles.successMessage}>
                    Thank you for rating {selectedLecturer?.name}
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.modalTitle}>Rate Lecturer</Text>
                  <Text style={styles.modalLecturer}>{selectedLecturer?.name}</Text>
                  <Text style={styles.modalSubtitle}>{selectedLecturer?.department}</Text>
                  
                  <Text style={styles.modalLabel}>Your Rating:</Text>
                  {renderRatingStars(lecturerRating, setLecturerRating)}
                  
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Write your review (optional)"
                    value={lecturerReview}
                    onChangeText={setLecturerReview}
                    multiline
                  />
                  
                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => {
                        setLecturerRatingModalVisible(false);
                        setLecturerRating(5);
                        setLecturerReview('');
                      }}
                      disabled={submitting}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.submitButton]}
                      onPress={submitLecturerRating}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.submitButtonText}>Submit Rating</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Lecture Details Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={lectureModalVisible}
          onRequestClose={() => setLectureModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Lecture Details</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Title:</Text>
                <Text style={styles.detailValue}>{selectedLecture?.title}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Description:</Text>
                <Text style={styles.detailValue}>{selectedLecture?.description || 'No description'}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Lecturer:</Text>
                <Text style={styles.detailValue}>{selectedLecture?.lecturerName || 'TBA'}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date:</Text>
                <Text style={styles.detailValue}>{selectedLecture?.date}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Time:</Text>
                <Text style={styles.detailValue}>{selectedLecture?.time}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Duration:</Text>
                <Text style={styles.detailValue}>{selectedLecture?.duration} minutes</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Venue:</Text>
                <Text style={styles.detailValue}>{selectedLecture?.venue || 'Not specified'}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Attendance:</Text>
                <Text style={styles.detailValue}>{selectedLecture?.attendance || 0} / {selectedLecture?.totalStudents || 0} students</Text>
              </View>
              
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setLectureModalVisible(false)}
              >
                <Text style={styles.closeModalButtonText}>Close</Text>
              </TouchableOpacity>
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
      </ScrollView>
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
  section: { padding: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  courseCard: { marginBottom: 10, elevation: 2, borderRadius: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' },
  ratingContainer: { flexDirection: 'row', alignItems: 'center' },
  avgRating: { fontSize: 14, color: '#FFD700' },
  avgRatingText: { fontSize: 12, color: '#666' },
  filterContainer: { padding: 15, backgroundColor: '#fff', marginHorizontal: 15, marginBottom: 10, borderRadius: 10, elevation: 2 },
  filterLabel: { fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  filterButtons: { flexDirection: 'row', justifyContent: 'space-around' },
  filterChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0', marginHorizontal: 5 },
  filterChipActive: { backgroundColor: '#6200ee' },
  filterChipText: { color: '#666', fontSize: 12 },
  filterChipTextActive: { color: '#fff' },
  reportCard: { marginBottom: 15, elevation: 2, borderRadius: 8 },
  reviewedCard: { backgroundColor: '#e8f5e9' },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 },
  reportLecturer: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  reportLecture: { fontSize: 12, color: '#666', marginTop: 2 },
  reportRating: { fontSize: 14, color: '#FFD700' },
  reportDate: { fontSize: 11, color: '#999', marginBottom: 8 },
  reportContent: { marginBottom: 10, fontSize: 14 },
  feedbackContainer: { marginTop: 10, padding: 10, backgroundColor: '#e3f2fd', borderRadius: 8 },
  feedbackLabel: { fontWeight: 'bold', fontSize: 12, marginBottom: 5, color: '#1976D2' },
  feedbackText: { fontSize: 13 },
  reviewButton: { backgroundColor: '#4CAF50', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  reviewButtonText: { color: '#fff', fontWeight: 'bold' },
  lectureCard: { marginBottom: 10, elevation: 2, borderRadius: 8 },
  attendanceInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#eee' },
  attendanceLabel: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  attendanceCount: { fontSize: 12, color: '#4CAF50', marginLeft: 5 },
  attendancePercent: { fontSize: 12, color: '#666', marginLeft: 5 },
  monitorButton: { backgroundColor: '#2196F3', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  monitorButtonText: { color: '#fff', fontWeight: 'bold' },
  rateButton: { backgroundColor: '#FF9800', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  rateButtonText: { color: '#fff', fontWeight: 'bold' },
  lecturerCard: { marginBottom: 10, elevation: 2, borderRadius: 8 },
  emptyCard: { marginBottom: 10, backgroundColor: '#f0f0f0', padding: 20, alignItems: 'center' },
  emptyText: { textAlign: 'center', color: '#999' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', borderRadius: 10, padding: 20, width: '90%', maxWidth: 400 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 10, color: '#6200ee' },
  modalCourse: { textAlign: 'center', fontSize: 16, fontWeight: 'bold', color: '#333' },
  modalLecturer: { textAlign: 'center', fontSize: 16, fontWeight: 'bold', color: '#333' },
  modalSubtitle: { textAlign: 'center', fontSize: 12, color: '#666', marginBottom: 20 },
  modalLabel: { fontWeight: 'bold', marginTop: 10, marginBottom: 5 },
  starsContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 15 },
  ratingStar: { fontSize: 40, marginHorizontal: 5, color: '#ddd' },
  ratingStarSelected: { color: '#FFD700' },
  modalInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, minHeight: 80, textAlignVertical: 'top', marginBottom: 15 },
  reportPreview: { backgroundColor: '#f5f5f5', padding: 10, borderRadius: 8, marginBottom: 10 },
  reportPreviewText: { fontSize: 14, marginBottom: 5 },
  reportPreviewRating: { fontSize: 12, color: '#FFD700' },
  feedbackInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, minHeight: 100, textAlignVertical: 'top', marginBottom: 15 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modalButton: { flex: 1, padding: 12, borderRadius: 8, marginHorizontal: 5, alignItems: 'center' },
  cancelButton: { backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ddd' },
  cancelButtonText: { color: '#666' },
  submitButton: { backgroundColor: '#6200ee' },
  submitButtonText: { color: '#fff', fontWeight: 'bold' },
  successContainer: { alignItems: 'center', padding: 20 },
  successIcon: { fontSize: 60, marginBottom: 15 },
  successTitle: { fontSize: 22, fontWeight: 'bold', color: '#4CAF50', marginBottom: 10 },
  successMessage: { fontSize: 14, color: '#666', textAlign: 'center' },
  detailRow: { flexDirection: 'row', marginBottom: 12 },
  detailLabel: { width: 100, fontWeight: 'bold', color: '#333' },
  detailValue: { flex: 1, color: '#666' },
  closeModalButton: { backgroundColor: '#6200ee', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  closeModalButtonText: { color: '#fff', fontWeight: 'bold' },
  successModalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  successModalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 25, alignItems: 'center', minWidth: 250 },
  successIcon: { fontSize: 48, marginBottom: 15 },
  successModalText: { fontSize: 16, color: '#333', textAlign: 'center', fontWeight: '500' },
});

export default PRLDashboard;