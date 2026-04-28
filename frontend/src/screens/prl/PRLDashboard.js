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
  SafeAreaView,
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

const PRLDashboard = ({ navigation }) => {
  const [userName, setUserName] = useState('');
  const [courses, setCourses] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [reports, setReports] = useState([]);
  const [lecturerReports, setLecturerReports] = useState([]); // Added for lecturer reports
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

  useEffect(() => {
    loadAllData();
    getUserInfo();
  }, []);

  const getUserInfo = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setUserName(user.name || 'PRL');
      }
    } catch (error) {
      console.error('Error getting user info:', error);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Fetch courses
      const coursesRes = await axios.get(`${API_URL}/courses`);
      setCourses(coursesRes.data.courses || []);
      
      // Fetch lecturers
      const lecturersRes = await axios.get(`${API_URL}/lecturers`);
      setLecturers(lecturersRes.data.lecturers || []);
      
      // Fetch lectures
      const lecturesRes = await axios.get(`${API_URL}/lectures`);
      setLectures(lecturesRes.data.lectures || []);
      
      // Fetch legacy reports
      const reportsRes = await axios.get(`${API_URL}/reports`);
      setReports(reportsRes.data.reports || []);
      
      // Fetch lecturer reports from backend
      const lecturerReportsRes = await axios.get(`${API_URL}/lecturer-reports`);
      setLecturerReports(lecturerReportsRes.data.reports || []);
      
      // Load ratings
      await loadRatings();
      
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data. Please refresh.');
      setCourses([]);
      setLecturers([]);
      setLectures([]);
      setReports([]);
      setLecturerReports([]);
    } finally {
      setLoading(false);
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
          // No ratings yet
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
          // No ratings yet
        }
      }
    } catch (error) {
      console.log('Error loading ratings:', error);
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

  const getFilteredLecturerReports = () => {
    if (selectedFilter === 'all') return lecturerReports;
    if (selectedFilter === 'pending') return lecturerReports.filter(r => r.status === 'pending' || !r.feedback);
    if (selectedFilter === 'reviewed') return lecturerReports.filter(r => r.status === 'reviewed' || r.feedback);
    return lecturerReports;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
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
      await axios.post(`${API_URL}/lecturer-reports/${selectedReport.id}/feedback`, {
        feedback: feedback,
        reviewerName: userName
      });
      
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
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const submitCourseRating = async () => {
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/rate-course`, {
        courseId: selectedCourse.id,
        rating: courseRating,
        review: courseReview,
        raterName: userName,
        raterRole: 'prl'
      });
      
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
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  const submitLecturerRating = async () => {
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/rate-lecturer`, {
        lecturerId: selectedLecturer.id,
        rating: lecturerRating,
        review: lecturerReview,
        raterName: userName,
        raterRole: 'prl'
      });
      
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
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingStars = (rating) => {
    const numRating = parseFloat(rating) || 0;
    const fullStars = Math.floor(numRating);
    const hasHalfStar = numRating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return (
      <View style={{ flexDirection: 'row' }}>
        {[...Array(fullStars)].map((_, i) => (
          <Text key={`full-${i}`} style={{ color: '#FFD700', fontSize: 14 }}>★</Text>
        ))}
        {hasHalfStar && <Text style={{ color: '#FFD700', fontSize: 14 }}>½</Text>}
        {[...Array(emptyStars)].map((_, i) => (
          <Text key={`empty-${i}`} style={{ color: '#ccc', fontSize: 14 }}>★</Text>
        ))}
      </View>
    );
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

  const filteredLecturerReports = getFilteredLecturerReports();
  const pendingCount = lecturerReports.filter(r => r.status === 'pending' || !r.feedback).length;
  const reviewedCount = lecturerReports.filter(r => r.status === 'reviewed' || r.feedback).length;

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
              <Text style={styles.userName}>{userName}</Text>
              <Text style={styles.userRole}>Principal Lecturer (PRL)</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>Review Reports, Rate Courses and Lecturers, Monitor Classes</Text>
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
          {['courses', 'lecturerReports', 'lectures', 'rating'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab === 'courses' && 'Courses'}
                {tab === 'lecturerReports' && 'Lecturer Reports'}
                {tab === 'lectures' && 'Monitor Lectures'}
                {tab === 'rating' && 'Rating'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Courses Tab */}
        {activeTab === 'courses' && (
          <View style={styles.section}>
            <Title style={styles.sectionTitle}>All Courses</Title>
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
                      <View style={styles.cardHeader}>
                        <Title>{course.name}</Title>
                        <View style={styles.ratingContainer}>
                          {getRatingStars(avgRating)}
                          <Text style={styles.avgRatingText}> ({avgRating})</Text>
                        </View>
                      </View>
                      <Paragraph>Code: {course.code}</Paragraph>
                      <Paragraph>Stream: {course.stream}</Paragraph>
                      <Paragraph>Credits: {course.credits}</Paragraph>
                      <Paragraph>Semester: {course.semester}</Paragraph>
                      <Paragraph>Lecturer: {course.lecturerName || 'Not Assigned'}</Paragraph>
                    </Card.Content>
                  </Card>
                );
              })
            )}
          </View>
        )}

        {/* Lecturer Reports Tab */}
        {activeTab === 'lecturerReports' && (
          <>
            <View style={styles.filterContainer}>
              <Text style={styles.filterLabel}>Filter Reports:</Text>
              <View style={styles.filterButtons}>
                <TouchableOpacity
                  style={[styles.filterChip, selectedFilter === 'all' && styles.filterChipActive]}
                  onPress={() => setSelectedFilter('all')}
                >
                  <Text style={[styles.filterChipText, selectedFilter === 'all' && styles.filterChipTextActive]}>
                    All ({lecturerReports.length})
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
              <Title style={styles.sectionTitle}>Lecturer Reports</Title>
              {filteredLecturerReports.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <Card.Content>
                    <Paragraph style={styles.emptyText}>No reports in this category</Paragraph>
                  </Card.Content>
                </Card>
              ) : (
                filteredLecturerReports.map(report => (
                  <Card key={report.id} style={[styles.reportCard, report.feedback && styles.reviewedCard]}>
                    <Card.Content>
                      <View style={styles.reportHeader}>
                        <View>
                          <Text style={styles.reportLecturer}>Lecturer: {report.lecturerName || 'Unknown'}</Text>
                          <Text style={styles.reportLecture}>Course: {report.courseName} ({report.courseCode})</Text>
                        </View>
                      </View>
                      <Text style={styles.reportDate}>
                        Week: {report.weekOfReporting}
                      </Text>
                      <Text style={styles.reportDate}>
                        Date: {new Date(report.dateOfLecture).toLocaleDateString()}
                      </Text>
                      <Text style={styles.reportDate}>
                        Venue: {report.venue}
                      </Text>
                      <Text style={styles.reportDate}>
                        Time: {report.scheduledTime}
                      </Text>
                      <Text style={styles.reportLabel}>Topic Taught:</Text>
                      <Paragraph style={styles.reportContent}>{report.topicTaught}</Paragraph>
                      <Text style={styles.reportLabel}>Learning Outcomes:</Text>
                      <Paragraph style={styles.reportContent}>{report.learningOutcomes}</Paragraph>
                      <Text style={styles.reportLabel}>Attendance:</Text>
                      <Paragraph style={styles.reportContent}>{report.actualStudentsPresent} / {report.totalRegisteredStudents || 0} students</Paragraph>
                      {report.recommendations && (
                        <>
                          <Text style={styles.reportLabel}>Recommendations:</Text>
                          <Paragraph style={styles.reportContent}>{report.recommendations}</Paragraph>
                        </>
                      )}
                      {report.feedback ? (
                        <View style={styles.feedbackContainer}>
                          <Text style={styles.feedbackLabel}>Your Feedback:</Text>
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
                          <Text style={styles.reviewButtonText}>Add Feedback</Text>
                        </TouchableOpacity>
                      )}
                    </Card.Content>
                  </Card>
                ))
              )}
            </View>
          </>
        )}

        {/* Monitor Lectures Tab */}
        {activeTab === 'lectures' && (
          <View style={styles.section}>
            <Title style={styles.sectionTitle}>Monitor Lectures</Title>
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
                return (
                  <Card key={lecture.id} style={styles.lectureCard}>
                    <Card.Content>
                      <Title>{lecture.title}</Title>
                      <Paragraph>Lecturer: {lecture.lecturerName || 'TBA'}</Paragraph>
                      <Paragraph>Date: {lecture.date}</Paragraph>
                      <Paragraph>Time: {lecture.time}</Paragraph>
                      <Paragraph>Venue: {lecture.venue}</Paragraph>
                      <View style={styles.attendanceInfo}>
                        <Text style={styles.attendanceLabel}>Attendance:</Text>
                        <Text style={styles.attendanceCount}>{lecture.attendance || 0} / {lecture.totalStudents || 0}</Text>
                        <Text style={styles.attendancePercent}>({attendanceRate}%)</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.monitorButton}
                        onPress={() => {
                          setSelectedLecture(lecture);
                          setLectureModalVisible(true);
                        }}
                      >
                        <Text style={styles.monitorButtonText}>View Details</Text>
                      </TouchableOpacity>
                    </Card.Content>
                  </Card>
                );
              })
            )}
          </View>
        )}

        {/* Rating Tab */}
        {activeTab === 'rating' && (
          <>
            <View style={styles.section}>
              <Title style={styles.sectionTitle}>Rate Courses</Title>
              {courses.map(course => {
                const avgRating = getCourseAverageRating(course.id);
                return (
                  <Card key={course.id} style={styles.courseCard}>
                    <Card.Content>
                      <View style={styles.cardHeader}>
                        <Title>{course.name}</Title>
                        <View style={styles.ratingContainer}>
                          {getRatingStars(avgRating)}
                          <Text style={styles.avgRatingText}> ({avgRating})</Text>
                        </View>
                      </View>
                      <Paragraph>Code: {course.code}</Paragraph>
                      <Paragraph>Stream: {course.stream}</Paragraph>
                      <TouchableOpacity
                        style={styles.rateButton}
                        onPress={() => {
                          setSelectedCourse(course);
                          setCourseRatingModalVisible(true);
                        }}
                      >
                        <Text style={styles.rateButtonText}>Rate This Course</Text>
                      </TouchableOpacity>
                    </Card.Content>
                  </Card>
                );
              })}
            </View>

            <View style={styles.section}>
              <Title style={styles.sectionTitle}>Rate Lecturers</Title>
              {lecturers.map(lecturer => {
                const avgRating = getLecturerAverageRating(lecturer.id);
                return (
                  <Card key={lecturer.id} style={styles.lecturerCard}>
                    <Card.Content>
                      <View style={styles.cardHeader}>
                        <Title>{lecturer.name}</Title>
                        <View style={styles.ratingContainer}>
                          {getRatingStars(avgRating)}
                          <Text style={styles.avgRatingText}> ({avgRating})</Text>
                        </View>
                      </View>
                      <Paragraph>Email: {lecturer.email}</Paragraph>
                      <Paragraph>Department: {lecturer.department || 'Not specified'}</Paragraph>
                      <TouchableOpacity
                        style={styles.rateButton}
                        onPress={() => {
                          setSelectedLecturer(lecturer);
                          setLecturerRatingModalVisible(true);
                        }}
                      >
                        <Text style={styles.rateButtonText}>Rate This Lecturer</Text>
                      </TouchableOpacity>
                    </Card.Content>
                  </Card>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

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
                <Text style={styles.successIcon}>Success</Text>
                <Text style={styles.successTitle}>Feedback Submitted!</Text>
                <Text style={styles.successMessage}>
                  Your feedback has been sent
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.modalTitle}>Add Feedback</Text>
                
                <Text style={styles.modalLabel}>Report from:</Text>
                <Text style={styles.modalLecturer}>{selectedReport?.lecturerName}</Text>
                
                <Text style={styles.modalLabel}>Course:</Text>
                <Text style={styles.modalSubtitle}>{selectedReport?.courseName} ({selectedReport?.courseCode})</Text>
                
                <Text style={styles.modalLabel}>Week of Reporting:</Text>
                <Text style={styles.modalSubtitle}>{selectedReport?.weekOfReporting}</Text>
                
                <Text style={styles.modalLabel}>Topic Taught:</Text>
                <View style={styles.reportPreview}>
                  <Text style={styles.reportPreviewText}>{selectedReport?.topicTaught}</Text>
                </View>
                
                <Text style={styles.modalLabel}>Your Feedback:</Text>
                <TextInput
                  style={styles.feedbackInput}
                  placeholder="Enter your feedback..."
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
                <Text style={styles.successIcon}>Rating Submitted</Text>
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
                <Text style={styles.successIcon}>Rating Submitted</Text>
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
              <Text style={styles.detailLabel}>Lecturer:</Text>
              <Text style={styles.detailValue}>{selectedLecture?.lecturerName || 'Not assigned'}</Text>
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
              <Text style={styles.detailLabel}>Venue:</Text>
              <Text style={styles.detailValue}>{selectedLecture?.venue}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Attendance:</Text>
              <Text style={styles.detailValue}>{selectedLecture?.attendance || 0} / {selectedLecture?.totalStudents || 0}</Text>
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
            <Text style={styles.successIcon}>Success</Text>
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
  avgRatingText: { fontSize: 12, color: '#666', marginLeft: 4 },
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
  reportDate: { fontSize: 11, color: '#999', marginBottom: 4 },
  reportLabel: { fontSize: 12, fontWeight: 'bold', color: '#333', marginTop: 8, marginBottom: 4 },
  reportContent: { marginBottom: 8, fontSize: 14 },
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
  feedbackInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, minHeight: 100, textAlignVertical: 'top', marginBottom: 15 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modalButton: { flex: 1, padding: 12, borderRadius: 8, marginHorizontal: 5, alignItems: 'center' },
  cancelButton: { backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ddd' },
  cancelButtonText: { color: '#666' },
  submitButton: { backgroundColor: '#6200ee' },
  submitButtonText: { color: '#fff', fontWeight: 'bold' },
  successContainer: { alignItems: 'center', padding: 20 },
  successIcon: { fontSize: 20, marginBottom: 15, fontWeight: 'bold', color: '#4CAF50' },
  successTitle: { fontSize: 22, fontWeight: 'bold', color: '#4CAF50', marginBottom: 10 },
  successMessage: { fontSize: 14, color: '#666', textAlign: 'center' },
  detailRow: { flexDirection: 'row', marginBottom: 12 },
  detailLabel: { width: 100, fontWeight: 'bold', color: '#333' },
  detailValue: { flex: 1, color: '#666' },
  closeModalButton: { backgroundColor: '#6200ee', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  closeModalButtonText: { color: '#fff', fontWeight: 'bold' },
  successModalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  successModalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 25, alignItems: 'center', minWidth: 250 },
  successModalText: { fontSize: 16, color: '#333', textAlign: 'center', fontWeight: '500' },
});

export default PRLDashboard;