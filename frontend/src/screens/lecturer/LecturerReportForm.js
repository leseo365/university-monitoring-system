import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = Platform.select({
  android: 'http://10.0.2.2:3000/api',
  ios: 'http://localhost:3000/api',
  default: 'http://localhost:3000/api'
});

const LecturerReportForm = ({ onClose, onSubmitSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lecturerName, setLecturerName] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  
  // Modal visibility states
  const [facultyModalVisible, setFacultyModalVisible] = useState(false);
  const [weekModalVisible, setWeekModalVisible] = useState(false);
  const [venueModalVisible, setVenueModalVisible] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  
  // Form fields
  const [facultyName, setFacultyName] = useState('');
  const [className, setClassName] = useState('');
  const [weekOfReporting, setWeekOfReporting] = useState('');
  const [dateOfLecture, setDateOfLecture] = useState('');
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [actualStudentsPresent, setActualStudentsPresent] = useState('');
  const [totalRegisteredStudents, setTotalRegisteredStudents] = useState('');
  const [venue, setVenue] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [topicTaught, setTopicTaught] = useState('');
  const [learningOutcomes, setLearningOutcomes] = useState('');
  const [recommendations, setRecommendations] = useState('');

  // Updated faculties list
  const faculties = [
    'Faculty of Business',
    'Faculty IT',
    'Faculty Tourism',
    'Faculty Design',
    'Faculty Architecture',
    'Faculty communication, media and broadcasting'
  ];

  const weeks = Array.from({ length: 16 }, (_, i) => `Week ${i + 1}`);
  
  // Updated venues list
  const venues = [
    'MM1', 'MM2', 'MM3', 'MM5', 'MM6', 'MM7',
    'Room1', 'Room2', 'Room3', 'Room4', 'Room5', 'Room6', 'Room7',
    'Hall1', 'Hall2', 'Hall3', 'Hall4', 'Hall5', 'Hall6', 'Hall7', 'Hall8'
  ];

  // Generate dates for the next 90 days
  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 90; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const formattedDate = date.toISOString().split('T')[0];
      const displayDate = date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      dates.push({ value: formattedDate, label: displayDate });
    }
    return dates;
  };

  const dates = generateDates();

  useEffect(() => {
    loadLecturerData();
  }, []);

  const loadLecturerData = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setLecturerName(user.name || '');
      }
    } catch (error) {
      console.error('Error loading lecturer data:', error);
    }
  };

  const validateForm = () => {
    if (!facultyName) {
      Alert.alert('Error', 'Please select Faculty Name');
      return false;
    }
    if (!className.trim()) {
      Alert.alert('Error', 'Please enter Class Name');
      return false;
    }
    if (!weekOfReporting) {
      Alert.alert('Error', 'Please select Week of Reporting');
      return false;
    }
    if (!dateOfLecture) {
      Alert.alert('Error', 'Please select Date of Lecture');
      return false;
    }
    if (!courseName.trim()) {
      Alert.alert('Error', 'Please enter Course Name');
      return false;
    }
    if (!courseCode.trim()) {
      Alert.alert('Error', 'Please enter Course Code');
      return false;
    }
    if (!actualStudentsPresent) {
      Alert.alert('Error', 'Please enter Actual Number of Students Present');
      return false;
    }
    if (!venue) {
      Alert.alert('Error', 'Please select Venue');
      return false;
    }
    if (!scheduledTime.trim()) {
      Alert.alert('Error', 'Please enter Scheduled Lecture Time');
      return false;
    }
    if (!topicTaught.trim()) {
      Alert.alert('Error', 'Please enter Topic Taught');
      return false;
    }
    if (!learningOutcomes.trim()) {
      Alert.alert('Error', 'Please enter Learning Outcomes');
      return false;
    }
    return true;
  };

  const handlePreview = () => {
    if (validateForm()) {
      setShowPreview(true);
    }
  };

  const handleSubmitReport = async () => {
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      const user = userData ? JSON.parse(userData) : {};
      
      const reportData = {
        facultyName,
        className,
        weekOfReporting,
        dateOfLecture,
        courseName,
        courseCode,
        lecturerName: user.name || lecturerName,
        actualStudentsPresent: parseInt(actualStudentsPresent),
        totalRegisteredStudents: parseInt(totalRegisteredStudents) || 0,
        venue,
        scheduledTime,
        topicTaught,
        learningOutcomes,
        recommendations,
        submittedAt: new Date().toISOString(),
        status: 'pending'
      };

      const response = await axios.post(`${API_URL}/lecturer-reports`, reportData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setShowPreview(false);
        
        Alert.alert(
          'Success',
          'Report submitted successfully to PRL!',
          [
            {
              text: 'OK',
              onPress: () => {
                resetForm();
                if (onSubmitSuccess) onSubmitSuccess();
                if (onClose) onClose();
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFacultyName('');
    setClassName('');
    setWeekOfReporting('');
    setDateOfLecture('');
    setCourseName('');
    setCourseCode('');
    setActualStudentsPresent('');
    setTotalRegisteredStudents('');
    setVenue('');
    setScheduledTime('');
    setTopicTaught('');
    setLearningOutcomes('');
    setRecommendations('');
  };

  const calculateAttendanceRate = () => {
    if (totalRegisteredStudents && actualStudentsPresent) {
      const rate = (parseInt(actualStudentsPresent) / parseInt(totalRegisteredStudents)) * 100;
      return rate.toFixed(1);
    }
    return null;
  };

  const renderPickerModal = (visible, setVisible, items, selectedValue, onSelect, title, getLabel = null) => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.pickerModal}>
          <Text style={styles.pickerTitle}>{title}</Text>
          <FlatList
            data={items}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.pickerItem}
                onPress={() => {
                  if (getLabel) {
                    onSelect(item.value);
                  } else {
                    onSelect(item);
                  }
                  setVisible(false);
                }}
              >
                <Text style={styles.pickerItemText}>
                  {getLabel ? item.label : item}
                </Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity
            style={styles.pickerCloseButton}
            onPress={() => setVisible(false)}
          >
            <Text style={styles.pickerCloseText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Report Preview Modal
  const ReportPreviewModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showPreview}
      onRequestClose={() => setShowPreview(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.previewModal}>
          <Text style={styles.previewTitle}> Report Summary</Text>
          <ScrollView style={styles.previewContent}>
            <View style={styles.previewSection}>
              <Text style={styles.previewLabel}>Faculty:</Text>
              <Text style={styles.previewValue}>{facultyName}</Text>
            </View>
            <View style={styles.previewSection}>
              <Text style={styles.previewLabel}>Class Name:</Text>
              <Text style={styles.previewValue}>{className}</Text>
            </View>
            <View style={styles.previewSection}>
              <Text style={styles.previewLabel}>Week of Reporting:</Text>
              <Text style={styles.previewValue}>{weekOfReporting}</Text>
            </View>
            <View style={styles.previewSection}>
              <Text style={styles.previewLabel}>Date of Lecture:</Text>
              <Text style={styles.previewValue}>{dateOfLecture}</Text>
            </View>
            <View style={styles.previewSection}>
              <Text style={styles.previewLabel}>Course Name:</Text>
              <Text style={styles.previewValue}>{courseName}</Text>
            </View>
            <View style={styles.previewSection}>
              <Text style={styles.previewLabel}>Course Code:</Text>
              <Text style={styles.previewValue}>{courseCode}</Text>
            </View>
            <View style={styles.previewSection}>
              <Text style={styles.previewLabel}>Lecturer:</Text>
              <Text style={styles.previewValue}>{lecturerName}</Text>
            </View>
            <View style={styles.previewSection}>
              <Text style={styles.previewLabel}>Students Present:</Text>
              <Text style={styles.previewValue}>{actualStudentsPresent} / {totalRegisteredStudents || 'N/A'}</Text>
              {calculateAttendanceRate() && (
                <Text style={styles.previewAttendance}>Attendance: {calculateAttendanceRate()}%</Text>
              )}
            </View>
            <View style={styles.previewSection}>
              <Text style={styles.previewLabel}>Venue:</Text>
              <Text style={styles.previewValue}>{venue}</Text>
            </View>
            <View style={styles.previewSection}>
              <Text style={styles.previewLabel}>Scheduled Time:</Text>
              <Text style={styles.previewValue}>{scheduledTime}</Text>
            </View>
            <View style={styles.previewSection}>
              <Text style={styles.previewLabel}>Topic Taught:</Text>
              <Text style={styles.previewValue}>{topicTaught}</Text>
            </View>
            <View style={styles.previewSection}>
              <Text style={styles.previewLabel}>Learning Outcomes:</Text>
              <Text style={styles.previewValue}>{learningOutcomes}</Text>
            </View>
            {recommendations ? (
              <View style={styles.previewSection}>
                <Text style={styles.previewLabel}>Recommendations:</Text>
                <Text style={styles.previewValue}>{recommendations}</Text>
              </View>
            ) : null}
          </ScrollView>
          <View style={styles.previewButtons}>
            <TouchableOpacity
              style={[styles.previewActionButton, styles.cancelPreviewButton]}
              onPress={() => setShowPreview(false)}
            >
              <Text style={styles.cancelPreviewText}>Edit Form</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.previewActionButton, styles.submitPreviewButton]}
              onPress={handleSubmitReport}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitPreviewText}>Submit Report to PRL</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onClose} style={styles.closeHeaderButton}>
              <Text style={styles.closeHeaderText}>✕ Close</Text>
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}> Lecturer Report Form</Text>
              <Text style={styles.headerSubtitle}>Weekly Lecture Reporting</Text>
            </View>
            <View style={styles.placeholder} />
          </View>
        </View>

        <View style={styles.formContainer}>
          {/* Faculty Name - Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Faculty Name (Required)</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setFacultyModalVisible(true)}
            >
              <Text style={[styles.dropdownText, !facultyName && styles.placeholderText]}>
                {facultyName || 'Select Faculty'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Class Name - Text Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Class Name (Required)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., BSCSMY2S3"
              value={className}
              onChangeText={setClassName}
            />
          </View>

          {/* Week of Reporting - Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Week of Reporting (Required)</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setWeekModalVisible(true)}
            >
              <Text style={[styles.dropdownText, !weekOfReporting && styles.placeholderText]}>
                {weekOfReporting || 'Select Week'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Date of Lecture - Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date of Lecture (Required)</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setDateModalVisible(true)}
            >
              <Text style={[styles.dropdownText, !dateOfLecture && styles.placeholderText]}>
                {dateOfLecture || 'Select Date'}
              </Text>
              <Text style={styles.dropdownArrow}></Text>
            </TouchableOpacity>
          </View>

          {/* Course Name - Text Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Course Name (Required)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Introduction to Programming"
              value={courseName}
              onChangeText={setCourseName}
            />
          </View>

          {/* Course Code - Text Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Course Code (Required)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., CS101, IT201"
              value={courseCode}
              onChangeText={setCourseCode}
            />
          </View>

          {/* Lecturer's Name - Auto-filled */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Lecturer's Name</Text>
            <TextInput
              style={[styles.input, styles.readonlyInput]}
              value={lecturerName}
              editable={false}
              placeholder="Auto-filled from profile"
            />
          </View>

          {/* Student Numbers - Row */}
          <View style={styles.rowContainer}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Actual Students Present (Required)</Text>
              <TextInput
                style={styles.input}
                placeholder="Number"
                value={actualStudentsPresent}
                onChangeText={setActualStudentsPresent}
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Total Registered Students</Text>
              <TextInput
                style={styles.input}
                placeholder="Number"
                value={totalRegisteredStudents}
                onChangeText={setTotalRegisteredStudents}
                keyboardType="numeric"
              />
              {calculateAttendanceRate() && (
                <Text style={styles.attendanceRate}>
                  Attendance: {calculateAttendanceRate()}%
                </Text>
              )}
            </View>
          </View>

          {/* Venue - Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Venue of the Class (Required)</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setVenueModalVisible(true)}
            >
              <Text style={[styles.dropdownText, !venue && styles.placeholderText]}>
                {venue || 'Select Venue'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Scheduled Lecture Time - Text Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Scheduled Lecture Time (Required)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 09:00 AM - 11:00 AM"
              value={scheduledTime}
              onChangeText={setScheduledTime}
            />
          </View>

          {/* Topic Taught - Text Area */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Topic Taught (Required)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter the main topic(s) covered in this lecture"
              value={topicTaught}
              onChangeText={setTopicTaught}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Learning Outcomes - Text Area */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Learning Outcomes (Required)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What students should be able to do after this lecture"
              value={learningOutcomes}
              onChangeText={setLearningOutcomes}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Recommendations - Text Area */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Lecturer's Recommendations</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any recommendations for improvement or future actions"
              value={recommendations}
              onChangeText={setRecommendations}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Preview Button */}
          <TouchableOpacity
            style={styles.previewButton}
            onPress={handlePreview}
          >
            <Text style={styles.previewButtonText}> Preview Report Summary</Text>
          </TouchableOpacity>

          {/* Clear Form Button */}
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetForm}
          >
            <Text style={styles.resetButtonText}>Clear Form</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Picker Modals */}
      {renderPickerModal(facultyModalVisible, setFacultyModalVisible, faculties, facultyName, setFacultyName, 'Select Faculty')}
      {renderPickerModal(weekModalVisible, setWeekModalVisible, weeks, weekOfReporting, setWeekOfReporting, 'Select Week')}
      {renderPickerModal(dateModalVisible, setDateModalVisible, dates, dateOfLecture, setDateOfLecture, 'Select Date', true)}
      {renderPickerModal(venueModalVisible, setVenueModalVisible, venues, venue, setVenue, 'Select Venue')}
      
      {/* Report Preview Modal */}
      <ReportPreviewModal />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#6200ee',
    padding: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeHeaderButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  closeHeaderText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    marginTop: 2,
  },
  placeholder: {
    width: 70,
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  readonlyInput: {
    backgroundColor: '#f5f5f5',
    color: '#666',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  dropdownText: {
    fontSize: 14,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  dropdownArrow: {
    fontSize: 14,
    color: '#666',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  attendanceRate: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 5,
    fontWeight: '500',
  },
  previewButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: '#f5f5f5',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 30,
  },
  resetButtonText: {
    color: '#666',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModal: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: '85%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    color: '#6200ee',
  },
  pickerItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerItemText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  },
  pickerCloseButton: {
    padding: 15,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  pickerCloseText: {
    fontSize: 16,
    color: '#6200ee',
    fontWeight: 'bold',
  },
  previewModal: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: '90%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  previewTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 20,
    backgroundColor: '#6200ee',
    color: '#fff',
  },
  previewContent: {
    padding: 20,
  },
  previewSection: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 5,
  },
  previewValue: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  previewAttendance: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 5,
    fontWeight: 'bold',
  },
  previewButtons: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  previewActionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelPreviewButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelPreviewText: {
    color: '#666',
    fontSize: 14,
    fontWeight: 'bold',
  },
  submitPreviewButton: {
    backgroundColor: '#4CAF50',
  },
  submitPreviewText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default LecturerReportForm;