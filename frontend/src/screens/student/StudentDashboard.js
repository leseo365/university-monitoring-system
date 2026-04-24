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
  FlatList
} from 'react-native';
import { Card, Title, Paragraph } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const StudentDashboard = ({ navigation }) => {
  const [courses, setCourses] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [userName, setUserName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStream, setSelectedStream] = useState('all');
  const [submitting, setSubmitting] = useState(false);
  const [userRatings, setUserRatings] = useState({});
  const [userAttendance, setUserAttendance] = useState({});
  const [loadingActivity, setLoadingActivity] = useState(true);
  
  // Rating modal states
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  
  // Attendance modal states
  const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
  const [selectedCourseForAttendance, setSelectedCourseForAttendance] = useState(null);
  const [courseLectures, setCourseLectures] = useState([]);
  const [selectedLectureForAttendance, setSelectedLectureForAttendance] = useState(null);
  const [attendanceStatus, setAttendanceStatus] = useState('present');
  const [attendanceSubmitted, setAttendanceSubmitted] = useState(false);
  
  // View Lectures modal
  const [viewLecturesModalVisible, setViewLecturesModalVisible] = useState(false);
  const [selectedCourseForView, setSelectedCourseForView] = useState(null);
  
  // Streams available
  const streams = ['all', 'Computing', 'Creative Arts', 'Business', 'Engineering', 'Design'];

  // Helper to get auth headers
  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('userToken');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    loadAllData();
    getUserInfo();
    loadUserActivity();
  }, []);

  const getUserInfo = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setUserName(user.name || 'Student');
        setStudentId(user.uid || user.id || 'student1');
      }
    } catch (error) {
      console.error('Error getting user info:', error);
    }
  };

  const loadAllData = async () => {
    setLoadingActivity(true);
    try {
      const headers = await getAuthHeaders();
      
      // Fetch courses from backend
      const coursesRes = await axios.get(`${API_URL}/courses`, headers);
      setCourses(coursesRes.data || []);
      
      // Fetch lectures from backend
      const lecturesRes = await axios.get(`${API_URL}/lectures`, headers);
      setLectures(lecturesRes.data || []);
      
      // For enrolled courses, we need to filter based on student's enrollment
      // For now, show all courses as enrolled
      setEnrolledCourses(coursesRes.data || []);
      
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data. Please refresh.');
    } finally {
      setLoadingActivity(false);
    }
  };

  const loadUserActivity = async () => {
    try {
      const headers = await getAuthHeaders();
      const [ratingsRes, attendanceRes] = await Promise.all([
        axios.get(`${API_URL}/ratings/user?studentId=${studentId}`, headers).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/attendance/user?studentId=${studentId}`, headers).catch(() => ({ data: [] }))
      ]);
      
      const ratingsMap = {};
      (ratingsRes.data || []).forEach(r => { ratingsMap[r.lectureId] = r; });
      setUserRatings(ratingsMap);
      
      const attendanceMap = {};
      (attendanceRes.data || []).forEach(a => { attendanceMap[a.lectureId] = a; });
      setUserAttendance(attendanceMap);
    } catch (error) {
      console.log('No previous activity found');
    }
  };

  const getFilteredLectures = () => {
    if (selectedStream === 'all') {
      return lectures;
    }
    const streamCourseIds = courses
      .filter(c => c.stream === selectedStream)
      .map(c => c.id);
    return lectures.filter(l => streamCourseIds.includes(l.courseId));
  };

  const getFilteredCourses = () => {
    if (selectedStream === 'all') {
      return enrolledCourses;
    }
    return enrolledCourses.filter(c => c.stream === selectedStream);
  };

  const getCourseLectures = (courseId) => {
    return lectures.filter(l => l.courseId === courseId);
  };

  const getCourseAverageRating = (courseId) => {
    const courseLecturesList = lectures.filter(l => l.courseId === courseId);
    const ratedLecturesList = courseLecturesList.filter(l => userRatings[l.id]);
    if (ratedLecturesList.length === 0) return 0;
    const sum = ratedLecturesList.reduce((acc, l) => acc + userRatings[l.id].rating, 0);
    return (sum / ratedLecturesList.length).toFixed(1);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    await loadUserActivity();
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

  const isLectureRated = (lectureId) => {
    return !!userRatings[lectureId];
  };

  const isAttendanceMarked = (lectureId) => {
    return !!userAttendance[lectureId];
  };

  const submitRating = async () => {
    if (!selectedLecture) return;
    
    setSubmitting(true);
    setRatingSubmitted(false);
    try {
      const headers = await getAuthHeaders();
      await axios.post(`${API_URL}/ratings`, {
        lectureId: selectedLecture.id,
        rating: rating,
        comment: review,
        lectureTitle: selectedLecture.title,
        lecturer: selectedLecture.lecturerName,
        courseId: selectedLecture.courseId,
        studentId: studentId,
        studentName: userName
      }, headers);
      
      setRatingSubmitted(true);
      
      setTimeout(() => {
        Alert.alert('Success', `Thank you for rating "${selectedLecture.title}"!`);
        setRatingModalVisible(false);
        setRating(5);
        setReview('');
        setSelectedLecture(null);
        setRatingSubmitted(false);
        loadUserActivity();
      }, 1000);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
      setRatingSubmitted(false);
    } finally {
      setSubmitting(false);
    }
  };

  const markAttendance = async () => {
    if (!selectedLectureForAttendance) return;
    
    setSubmitting(true);
    setAttendanceSubmitted(false);
    try {
      const headers = await getAuthHeaders();
      
      await axios.post(`${API_URL}/attendance`, {
        lectureId: selectedLectureForAttendance.id,
        lectureTitle: selectedLectureForAttendance.title,
        status: attendanceStatus,
        studentId: studentId,
        studentName: userName,
        courseId: selectedLectureForAttendance.courseId,
        timestamp: new Date().toISOString()
      }, headers);
      
      setAttendanceSubmitted(true);
      
      const statusMessage = attendanceStatus === 'present' ? 'Present' : 
                           attendanceStatus === 'absent' ? 'Absent' : 'Late';
      
      setTimeout(() => {
        Alert.alert('Success', `Attendance marked as ${statusMessage} for "${selectedLectureForAttendance.title}"!`);
        setAttendanceModalVisible(false);
        setSelectedCourseForAttendance(null);
        setSelectedLectureForAttendance(null);
        setAttendanceStatus('present');
        setCourseLectures([]);
        setAttendanceSubmitted(false);
        loadUserActivity();
      }, 1000);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to mark attendance. Please try again.');
      setAttendanceSubmitted(false);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmAttendance = (lecture) => {
    Alert.alert(
      'Mark Attendance',
      `Select attendance status for "${lecture.title}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '✅ Present',
          onPress: () => {
            setAttendanceStatus('present');
            setSelectedLectureForAttendance(lecture);
            markAttendance();
          }
        },
        {
          text: '❌ Absent',
          onPress: () => {
            setAttendanceStatus('absent');
            setSelectedLectureForAttendance(lecture);
            markAttendance();
          }
        },
        {
          text: '⏰ Late',
          onPress: () => {
            setAttendanceStatus('late');
            setSelectedLectureForAttendance(lecture);
            markAttendance();
          }
        }
      ]
    );
  };

  const handleViewLectures = (course) => {
    const courseLecturesList = getCourseLectures(course.id);
    if (courseLecturesList.length > 0) {
      setSelectedCourseForView(course);
      setViewLecturesModalVisible(true);
    } else {
      Alert.alert('Info', 'No lectures available for this course');
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const renderStars = () => {
    return (
      <View style={styles.ratingStarsContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity key={star} onPress={() => setRating(star)} disabled={submitting}>
            <Text style={[styles.ratingStar, rating >= star && styles.ratingStarSelected]}>
              {rating >= star ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderRatingStarsDisplay = (ratingValue) => {
    const roundedRating = Math.round(ratingValue);
    return (
      <View style={styles.displayStarsContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <Text key={star} style={[styles.displayStar, star <= roundedRating && styles.displayStarSelected]}>
            {star <= roundedRating ? '★' : '☆'}
          </Text>
        ))}
      </View>
    );
  };

  const filteredCourses = getFilteredCourses();
  const filteredLectures = getFilteredLectures();

  if (loadingActivity) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{userName || 'Student'}!</Text>
            <Text style={styles.userRole}>Limkokwing University Student</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>🚪 Logout</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>Welcome to Limkokwing University Monitoring System</Text>
      </View>

      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Card.Content>
            <Title style={styles.statNumber}>{enrolledCourses.length}</Title>
            <Paragraph>Enrolled Courses</Paragraph>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content>
            <Title style={styles.statNumber}>{lectures.length}</Title>
            <Paragraph>Total Lectures</Paragraph>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content>
            <Title style={styles.statNumber}>{Object.keys(userRatings).length}</Title>
            <Paragraph>Lectures Rated</Paragraph>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content>
            <Title style={styles.statNumber}>{Object.keys(userAttendance).length}</Title>
            <Paragraph>Attendance Marked</Paragraph>
          </Card.Content>
        </Card>
      </View>

      {/* Stream Filter */}
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

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Title style={styles.sectionTitle}>Quick Actions</Title>
        
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
          onPress={() => {
            if (enrolledCourses.length > 0) {
              setAttendanceModalVisible(true);
            } else {
              Alert.alert('Info', 'You are not enrolled in any courses yet');
            }
          }}
        >
          <Text style={styles.actionButtonText}>📝 Mark Attendance</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
          onPress={() => {
            const unratedLectures = lectures.filter(l => !isLectureRated(l.id));
            if (unratedLectures.length > 0) {
              setSelectedLecture(unratedLectures[0]);
              setRatingModalVisible(true);
            } else if (lectures.length > 0) {
              Alert.alert('Info', 'You have already rated all available lectures');
            } else {
              Alert.alert('Info', 'No lectures available for rating');
            }
          }}
        >
          <Text style={styles.actionButtonText}>⭐ Rate Lecture</Text>
        </TouchableOpacity>
      </View>

      {/* My Courses Section */}
      <View style={styles.section}>
        <Title style={styles.sectionTitle}>📚 My Enrolled Courses</Title>
        {filteredCourses.map(course => {
          const avgRating = getCourseAverageRating(course.id);
          return (
            <Card key={course.id} style={styles.courseCard}>
              <Card.Content>
                <Title>{course.name}</Title>
                <Paragraph>📚 Code: {course.code}</Paragraph>
                <Paragraph>🎯 Stream: {course.stream}</Paragraph>
                <Paragraph>📖 Credits: {course.credits}</Paragraph>
                <View style={styles.courseRating}>
                  <Text style={styles.courseRatingLabel}>Course Rating:</Text>
                  {renderRatingStarsDisplay(avgRating)}
                  <Text style={styles.courseRatingValue}> ({avgRating})</Text>
                </View>
                <TouchableOpacity
                  style={styles.viewLecturesButton}
                  onPress={() => handleViewLectures(course)}
                >
                  <Text style={styles.viewLecturesButtonText}>📖 View Lectures</Text>
                </TouchableOpacity>
              </Card.Content>
            </Card>
          );
        })}
      </View>

      {/* Lectures Section */}
      <View style={styles.section}>
        <Title style={styles.sectionTitle}>📖 Upcoming Lectures</Title>
        {filteredLectures.map(lecture => {
          const course = courses.find(c => c.id === lecture.courseId);
          const isRated = isLectureRated(lecture.id);
          const isAttended = isAttendanceMarked(lecture.id);
          
          return (
            <Card key={lecture.id} style={styles.lectureCard}>
              <Card.Content>
                <View style={styles.lectureHeader}>
                  <Title>{lecture.title}</Title>
                  {isRated && <Text style={styles.ratedBadge}>⭐ Rated</Text>}
                  {isAttended && <Text style={styles.attendedBadge}>✓ Attended</Text>}
                </View>
                <Paragraph>🎓 Course: {course?.name || lecture.courseId}</Paragraph>
                <Paragraph>👨‍🏫 Lecturer: {lecture.lecturerName || 'TBA'}</Paragraph>
                <Paragraph>📅 Date: {lecture.date}</Paragraph>
                <Paragraph>⏰ Time: {lecture.time}</Paragraph>
                <Paragraph>⏱️ Duration: {lecture.duration} minutes</Paragraph>
                <Paragraph>📍 Venue: {lecture.venue}</Paragraph>
                {isRated && (
                  <View style={styles.ratingDisplay}>
                    <Text style={styles.ratingDisplayLabel}>Your Rating:</Text>
                    {renderRatingStarsDisplay(userRatings[lecture.id]?.rating)}
                  </View>
                )}
                <View style={styles.lectureButtons}>
                  <TouchableOpacity
                    style={[styles.smallButton, { backgroundColor: isAttended ? '#9E9E9E' : '#4CAF50' }]}
                    onPress={() => {
                      if (!isAttended) {
                        confirmAttendance(lecture);
                      } else {
                        Alert.alert('Info', 'You have already marked attendance for this lecture');
                      }
                    }}
                    disabled={isAttended}
                  >
                    <Text style={styles.smallButtonText}>
                      {isAttended ? '✓ Attendance Marked' : 'Mark Attendance'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallButton, { backgroundColor: isRated ? '#9E9E9E' : '#FF9800' }]}
                    onPress={() => {
                      if (!isRated) {
                        setSelectedLecture(lecture);
                        setRatingModalVisible(true);
                      } else {
                        Alert.alert('Info', 'You have already rated this lecture');
                      }
                    }}
                    disabled={isRated}
                  >
                    <Text style={styles.smallButtonText}>
                      {isRated ? '⭐ Rated' : 'Rate'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card.Content>
            </Card>
          );
        })}
      </View>

      {/* View Lectures Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={viewLecturesModalVisible}
        onRequestClose={() => {
          setViewLecturesModalVisible(false);
          setSelectedCourseForView(null);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Lectures - {selectedCourseForView?.name}</Text>
            <Text style={styles.modalSubtitle}>Course Code: {selectedCourseForView?.code}</Text>
            
            <ScrollView style={styles.lecturesListContainer}>
              {getCourseLectures(selectedCourseForView?.id).map(lecture => {
                const isRated = isLectureRated(lecture.id);
                const isAttended = isAttendanceMarked(lecture.id);
                return (
                  <Card key={lecture.id} style={styles.lectureItemCard}>
                    <Card.Content>
                      <View style={styles.lectureItemHeader}>
                        <Text style={styles.lectureItemTitle}>{lecture.title}</Text>
                        {isRated && <Text style={styles.miniRatedBadge}>⭐</Text>}
                        {isAttended && <Text style={styles.miniAttendedBadge}>✓</Text>}
                      </View>
                      <Text style={styles.lectureItemDetail}>👨‍🏫 {lecture.lecturerName || 'TBA'}</Text>
                      <Text style={styles.lectureItemDetail}>📅 {lecture.date}</Text>
                      <Text style={styles.lectureItemDetail}>⏰ {lecture.time}</Text>
                      <Text style={styles.lectureItemDetail}>📍 {lecture.venue}</Text>
                      <Text style={styles.lectureItemDetail}>⏱️ {lecture.duration} minutes</Text>
                    </Card.Content>
                  </Card>
                );
              })}
            </ScrollView>
            
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => {
                setViewLecturesModalVisible(false);
                setSelectedCourseForView(null);
              }}
            >
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Attendance Course Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={attendanceModalVisible}
        onRequestClose={() => {
          setAttendanceModalVisible(false);
          setSelectedCourseForAttendance(null);
          setCourseLectures([]);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Course</Text>
            <Text style={styles.modalSubtitle}>Choose a course to mark attendance</Text>
            
            <ScrollView style={styles.courseListContainer}>
              {enrolledCourses.map(course => {
                const courseLecturesList = getCourseLectures(course.id);
                const unattendedLectures = courseLecturesList.filter(l => !isAttendanceMarked(l.id));
                return (
                  <TouchableOpacity
                    key={course.id}
                    style={styles.courseSelectButton}
                    onPress={() => {
                      const unattendedLectures = getCourseLectures(course.id).filter(l => !isAttendanceMarked(l.id));
                      
                      if (unattendedLectures.length === 0) {
                        Alert.alert('Info', 'You have already marked attendance for all lectures in this course');
                        return;
                      }
                      
                      setSelectedCourseForAttendance(course);
                      setCourseLectures(unattendedLectures);
                    }}
                  >
                    <Text style={styles.courseSelectName}>{course.name}</Text>
                    <Text style={styles.courseSelectCode}>{course.code}</Text>
                    <Text style={styles.courseSelectStats}>
                      {courseLecturesList.length} lectures • {unattendedLectures.length} pending
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            {selectedCourseForAttendance && courseLectures.length > 0 && (
              <View style={styles.lectureSelectContainer}>
                <Text style={styles.lectureSelectTitle}>Select Lecture for {selectedCourseForAttendance.name}</Text>
                {courseLectures.map(lecture => (
                  <TouchableOpacity
                    key={lecture.id}
                    style={styles.lectureSelectButton}
                    onPress={() => {
                      setAttendanceModalVisible(false);
                      setSelectedCourseForAttendance(null);
                      setCourseLectures([]);
                      confirmAttendance(lecture);
                    }}
                  >
                    <Text style={styles.lectureSelectTitle}>{lecture.title}</Text>
                    <Text style={styles.lectureSelectDetails}>{lecture.date} • {lecture.time} • {lecture.venue}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => {
                    setSelectedCourseForAttendance(null);
                    setCourseLectures([]);
                  }}
                >
                  <Text style={styles.backButtonText}>← Back to Courses</Text>
                </TouchableOpacity>
              </View>
            )}
            
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setAttendanceModalVisible(false)}
            >
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Rating Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={ratingModalVisible}
        onRequestClose={() => {
          if (!ratingSubmitted) {
            setRatingModalVisible(false);
            setSelectedLecture(null);
            setRating(5);
            setReview('');
          }
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {ratingSubmitted ? (
              <View style={styles.successContainer}>
                <Text style={styles.successIcon}>⭐</Text>
                <Text style={styles.successTitle}>Rating Submitted!</Text>
                <Text style={styles.successMessage}>
                  Thank you for rating "{selectedLecture?.title}"
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.modalTitle}>Rate Lecture</Text>
                <Text style={styles.modalLecture}>{selectedLecture?.title}</Text>
                <Text style={styles.modalLecturer}>👨‍🏫 {selectedLecture?.lecturerName || 'TBA'}</Text>
                <Text style={styles.modalCourse}>📚 Course: {courses.find(c => c.id === selectedLecture?.courseId)?.name}</Text>
                
                <Text style={styles.modalLabel}>Your Rating:</Text>
                {renderStars()}
                
                <TextInput
                  style={styles.modalInput}
                  placeholder="Write your review (optional)"
                  value={review}
                  onChangeText={setReview}
                  multiline
                />
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setRatingModalVisible(false);
                      setSelectedLecture(null);
                      setRating(5);
                      setReview('');
                    }}
                    disabled={submitting}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.submitButton]}
                    onPress={submitRating}
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#6200ee',
    padding: 20,
    paddingTop: 50,
    paddingBottom: 25,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  greeting: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 2,
  },
  userRole: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.7,
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    marginTop: -20,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    margin: 5,
    elevation: 3,
    borderRadius: 10,
  },
  statNumber: {
    fontSize: 28,
    textAlign: 'center',
    color: '#6200ee',
    fontWeight: 'bold',
  },
  filterContainer: {
    padding: 15,
    backgroundColor: '#fff',
    marginTop: 10,
    marginHorizontal: 15,
    borderRadius: 10,
    elevation: 2,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: '#6200ee',
  },
  filterChipText: {
    color: '#666',
    fontSize: 12,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  quickActions: {
    padding: 15,
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  courseCard: {
    marginBottom: 10,
    elevation: 2,
    borderRadius: 8,
  },
  courseRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  courseRatingLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  courseRatingValue: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  viewLecturesButton: {
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  viewLecturesButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  lectureCard: {
    marginBottom: 10,
    elevation: 2,
    borderRadius: 8,
  },
  lectureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  ratedBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  attendedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  ratingDisplayLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  lectureButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  smallButton: {
    flex: 1,
    padding: 8,
    borderRadius: 5,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  smallButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionButton: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#6200ee',
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  modalLecture: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  modalLecturer: {
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
  },
  modalCourse: {
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 20,
    color: '#666',
  },
  modalLabel: {
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  ratingStarsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  ratingStar: {
    fontSize: 40,
    marginHorizontal: 5,
    color: '#ddd',
  },
  ratingStarSelected: {
    color: '#FFD700',
  },
  displayStarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  displayStar: {
    fontSize: 14,
    marginHorizontal: 2,
    color: '#ddd',
  },
  displayStarSelected: {
    color: '#FFD700',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#6200ee',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  successContainer: {
    alignItems: 'center',
    padding: 20,
  },
  successIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
  },
  successMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  courseListContainer: {
    maxHeight: 300,
  },
  courseSelectButton: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  courseSelectName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  courseSelectCode: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  courseSelectStats: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  lectureSelectContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  lectureSelectTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  lectureSelectButton: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
  },
  lectureSelectTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  lectureSelectDetails: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  backButton: {
    padding: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  backButtonText: {
    color: '#6200ee',
    fontSize: 14,
    fontWeight: 'bold',
  },
  closeModalButton: {
    backgroundColor: '#6200ee',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  closeModalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  lecturesListContainer: {
    maxHeight: 400,
  },
  lectureItemCard: {
    marginBottom: 10,
    elevation: 1,
  },
  lectureItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  lectureItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  miniRatedBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  miniAttendedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    overflow: 'hidden',
    marginLeft: 5,
  },
  lectureItemDetail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
});

export default StudentDashboard;