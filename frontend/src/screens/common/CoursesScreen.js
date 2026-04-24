import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import { Card, Title, Paragraph, IconButton } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const CoursesScreen = () => {
  const [courses, setCourses] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [newCourse, setNewCourse] = useState({
    name: '',
    code: '',
    description: '',
    stream: '',
    credits: '',
    semester: ''
  });

  useEffect(() => {
    fetchCourses();
    getUserRole();
  }, []);

  const getUserRole = async () => {
    const role = await AsyncStorage.getItem('userRole');
    setUserRole(role || 'student');
  };

  const fetchCourses = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`${API_URL}/courses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCourses(response.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCourses();
    setRefreshing(false);
  };

  const handleAddCourse = async () => {
    if (!newCourse.name || !newCourse.code) {
      Alert.alert('Error', 'Please fill required fields');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.post(`${API_URL}/courses`, newCourse, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert('Success', 'Course added successfully');
      setModalVisible(false);
      setNewCourse({ name: '', code: '', description: '', stream: '', credits: '', semester: '' });
      fetchCourses();
    } catch (error) {
      Alert.alert('Error', 'Failed to add course');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Courses</Text>
        {(userRole === 'pl' || userRole === 'prl') && (
          <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.addButtonText}>+ Add Course</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        style={styles.content}
      >
        {courses.map(course => (
          <Card key={course.id} style={styles.courseCard}>
            <Card.Content>
              <View style={styles.courseHeader}>
                <Title>{course.name}</Title>
                <Text style={styles.courseCode}>{course.code}</Text>
              </View>
              <Paragraph>{course.description}</Paragraph>
              <View style={styles.courseDetails}>
                <Text style={styles.detailText}>📚 Stream: {course.stream}</Text>
                <Text style={styles.detailText}>⭐ Credits: {course.credits}</Text>
                <Text style={styles.detailText}>📖 Semester: {course.semester}</Text>
                {course.lecturerId && (
                  <Text style={styles.detailText}>👨‍🏫 Lecturer ID: {course.lecturerId}</Text>
                )}
              </View>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>

      {/* Add Course Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Course</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Course Name *"
              value={newCourse.name}
              onChangeText={(text) => setNewCourse({...newCourse, name: text})}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Course Code *"
              value={newCourse.code}
              onChangeText={(text) => setNewCourse({...newCourse, code: text})}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Description"
              value={newCourse.description}
              onChangeText={(text) => setNewCourse({...newCourse, description: text})}
              multiline
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Stream"
              value={newCourse.stream}
              onChangeText={(text) => setNewCourse({...newCourse, stream: text})}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Credits"
              value={newCourse.credits}
              onChangeText={(text) => setNewCourse({...newCourse, credits: text})}
              keyboardType="numeric"
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Semester"
              value={newCourse.semester}
              onChangeText={(text) => setNewCourse({...newCourse, semester: text})}
              keyboardType="numeric"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleAddCourse}
              >
                <Text style={styles.submitButtonText}>Add Course</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#6200ee',
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  content: {
    padding: 15,
  },
  courseCard: {
    marginBottom: 15,
    elevation: 3,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  courseCode: {
    fontSize: 12,
    color: '#6200ee',
    fontWeight: 'bold',
  },
  courseDetails: {
    marginTop: 10,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#6200ee',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
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
});

export default CoursesScreen;