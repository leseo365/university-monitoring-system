import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl
} from 'react-native';
import { Card, Title, Paragraph } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const ReportsScreen = () => {
  const [lectures, setLectures] = useState([]);
  const [reports, setReports] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [reportContent, setReportContent] = useState('');
  const [reportRating, setReportRating] = useState(5);
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    fetchData();
    getUserRole();
  }, []);

  const getUserRole = async () => {
    const role = await AsyncStorage.getItem('userRole');
    setUserRole(role || 'lecturer');
  };

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const [lecturesRes, reportsRes] = await Promise.all([
        axios.get(`${API_URL}/lectures`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/reports`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setLectures(lecturesRes.data);
      setReports(reportsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSubmitReport = async () => {
    if (!reportContent.trim()) {
      Alert.alert('Error', 'Please enter report content');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.post(`${API_URL}/reports`, {
        lectureId: selectedLecture.id,
        content: reportContent,
        rating: reportRating
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      Alert.alert('Success', 'Report submitted successfully');
      setShowForm(false);
      setReportContent('');
      setReportRating(5);
      setSelectedLecture(null);
      fetchData();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity key={star} onPress={() => setReportRating(star)}>
            <Text style={[styles.star, reportRating >= star && styles.starSelected]}>
              {reportRating >= star ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reports Management</Text>
      </View>

      {userRole === 'lecturer' && !showForm && (
        <View style={styles.section}>
          <Title style={styles.sectionTitle}>Create Report</Title>
          {lectures.map(lecture => (
            <Card key={lecture.id} style={styles.lectureCard}>
              <Card.Content>
                <Title>{lecture.title}</Title>
                <Paragraph>Date: {lecture.date}</Paragraph>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => {
                    setSelectedLecture(lecture);
                    setShowForm(true);
                  }}
                >
                  <Text style={styles.selectButtonText}>Create Report</Text>
                </TouchableOpacity>
              </Card.Content>
            </Card>
          ))}
        </View>
      )}

      {showForm && (
        <View style={styles.formContainer}>
          <Title style={styles.formTitle}>Submit Report</Title>
          <Text style={styles.lectureTitle}>Lecture: {selectedLecture?.title}</Text>
          
          <Text style={styles.label}>Rating:</Text>
          {renderStars()}
          
          <Text style={styles.label}>Report Content:</Text>
          <TextInput
            style={styles.reportInput}
            placeholder="Write your report here..."
            value={reportContent}
            onChangeText={setReportContent}
            multiline
          />
          
          <View style={styles.formButtons}>
            <TouchableOpacity
              style={[styles.formButton, styles.cancelFormButton]}
              onPress={() => {
                setShowForm(false);
                setReportContent('');
                setSelectedLecture(null);
              }}
            >
              <Text style={styles.cancelFormButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.formButton, styles.submitFormButton]}
              onPress={handleSubmitReport}
            >
              <Text style={styles.submitFormButtonText}>Submit Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Title style={styles.sectionTitle}>Submitted Reports</Title>
        {reports.map(report => (
          <Card key={report.id} style={styles.reportCard}>
            <Card.Content>
              <View style={styles.reportHeader}>
                <Text style={styles.reportRating}>
                  {'★'.repeat(report.rating)}{'☆'.repeat(5 - report.rating)}
                </Text>
                <Text style={styles.reportDate}>
                  {new Date(report.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Paragraph style={styles.reportContent}>{report.content}</Paragraph>
              {report.feedback && (
                <View style={styles.feedbackContainer}>
                  <Text style={styles.feedbackTitle}>Feedback from PRL:</Text>
                  <Text style={styles.feedbackText}>{report.feedback}</Text>
                </View>
              )}
            </Card.Content>
          </Card>
        ))}
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
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 10,
  },
  lectureCard: {
    marginBottom: 10,
    elevation: 2,
  },
  selectButton: {
    backgroundColor: '#6200ee',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  selectButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  formContainer: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    elevation: 3,
  },
  formTitle: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 15,
    color: '#6200ee',
  },
  lectureTitle: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  label: {
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  star: {
    fontSize: 30,
    marginRight: 5,
    color: '#ddd',
  },
  starSelected: {
    color: '#FFD700',
  },
  reportInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  formButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cancelFormButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelFormButtonText: {
    color: '#666',
  },
  submitFormButton: {
    backgroundColor: '#4CAF50',
  },
  submitFormButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  reportCard: {
    marginBottom: 15,
    elevation: 2,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reportRating: {
    fontSize: 14,
    color: '#FFD700',
  },
  reportDate: {
    fontSize: 12,
    color: '#666',
  },
  reportContent: {
    marginBottom: 10,
  },
  feedbackContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  feedbackTitle: {
    fontWeight: 'bold',
    fontSize: 12,
    marginBottom: 5,
    color: '#1976D2',
  },
  feedbackText: {
    fontSize: 13,
  },
});

export default ReportsScreen;