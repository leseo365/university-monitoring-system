import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl
} from 'react-native';
import { Card, Title, Paragraph, ProgressBar } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const AttendanceScreen = () => {
  const [lectures, setLectures] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState({
    total: 0,
    present: 0,
    percentage: 0
  });
  const [markedAttendance, setMarkedAttendance] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchLectures();
    fetchAttendanceSummary();
  }, []);

  const fetchLectures = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`${API_URL}/lectures`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLectures(response.data);
    } catch (error) {
      console.error('Error fetching lectures:', error);
    }
  };

  const fetchAttendanceSummary = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`${API_URL}/attendance/student/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAttendanceSummary(response.data);
      
      // Get marked attendance IDs
      const markedIds = response.data.records?.map(r => r.lectureId) || [];
      setMarkedAttendance(markedIds);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const markAttendance = async (lectureId, status) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const studentId = await AsyncStorage.getItem('userId');
      
      await axios.post(`${API_URL}/attendance`, {
        lectureId,
        status,
        studentId: studentId || 'student1'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      Alert.alert('Success', `Attendance marked as ${status}`);
      fetchAttendanceSummary();
      fetchLectures();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to mark attendance');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchLectures(), fetchAttendanceSummary()]);
    setRefreshing(false);
  };

  const getStatusColor = (percentage) => {
    if (percentage >= 75) return '#4CAF50';
    if (percentage >= 60) return '#FF9800';
    return '#F44336';
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Attendance Tracker</Text>
      </View>

      <Card style={styles.summaryCard}>
        <Card.Content>
          <Title style={styles.summaryTitle}>Your Attendance Summary</Title>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{attendanceSummary.total}</Text>
              <Text style={styles.statLabel}>Total Lectures</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{attendanceSummary.present}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: getStatusColor(attendanceSummary.percentage) }]}>
                {attendanceSummary.percentage}%
              </Text>
              <Text style={styles.statLabel}>Attendance</Text>
            </View>
          </View>
          <ProgressBar
            progress={attendanceSummary.percentage / 100}
            color={getStatusColor(attendanceSummary.percentage)}
            style={styles.progressBar}
          />
          <Text style={styles.warningText}>
            {attendanceSummary.percentage < 75 ? 
              ' Warning: Your attendance is below 75%!' : 
              ' Good job! Keep up the attendance!'}
          </Text>
        </Card.Content>
      </Card>

      <View style={styles.section}>
        <Title style={styles.sectionTitle}>Upcoming Lectures</Title>
        {lectures.map(lecture => {
          const isMarked = markedAttendance.includes(lecture.id);
          return (
            <Card key={lecture.id} style={styles.lectureCard}>
              <Card.Content>
                <Title>{lecture.title}</Title>
                <Paragraph> Date: {lecture.date}</Paragraph>
                <Paragraph> Time: {lecture.time}</Paragraph>
                <Paragraph> Venue: {lecture.venue || 'TBA'}</Paragraph>
                
                {!isMarked ? (
                  <View style={styles.attendanceButtons}>
                    <TouchableOpacity
                      style={[styles.attendanceButton, styles.presentButton]}
                      onPress={() => markAttendance(lecture.id, 'present')}
                    >
                      <Text style={styles.buttonText}>✓ Present</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.attendanceButton, styles.absentButton]}
                      onPress={() => markAttendance(lecture.id, 'absent')}
                    >
                      <Text style={styles.buttonText}>✗ Absent</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.markedContainer}>
                    <Text style={styles.markedText}>✓ Attendance Already Marked</Text>
                  </View>
                )}
              </Card.Content>
            </Card>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#6200ee',
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  summaryCard: {
    margin: 15,
    elevation: 3,
  },
  summaryTitle: {
    textAlign: 'center',
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    marginVertical: 10,
  },
  warningText: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 12,
    color: '#FF9800',
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 10,
  },
  lectureCard: {
    marginBottom: 15,
    elevation: 2,
  },
  attendanceButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  attendanceButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  presentButton: {
    backgroundColor: '#4CAF50',
  },
  absentButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  markedContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    alignItems: 'center',
  },
  markedText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
});

export default AttendanceScreen;