import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Card, Title, Paragraph, Chip } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const API_URL = 'http://localhost:3000/api';

const SearchScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [results, setResults] = useState({ courses: [], lectures: [], reports: [] });
  const [loading, setLoading] = useState(false);

  const performSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Info', 'Please enter a search term');
      return;
    }
    
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`${API_URL}/search`, {
        params: { query: searchQuery, type: searchType },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setResults(response.data);
      
      const totalResults = 
        (response.data.courses?.length || 0) + 
        (response.data.lectures?.length || 0) + 
        (response.data.reports?.length || 0);
      
      if (totalResults === 0) {
        Alert.alert('No results', 'No matches found for your search');
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to perform search');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`${API_URL}/search/export/excel`, {
        params: { type: searchType === 'all' ? null : searchType },
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      // Create a file URI
      const fileUri = FileSystem.documentDirectory + 'export.xlsx';
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Convert blob to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert('Success', 'File exported successfully');
        }
      };
      reader.readAsDataURL(blob);
      
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export file');
    }
  };

  const totalResults = (results.courses?.length || 0) + (results.lectures?.length || 0) + (results.reports?.length || 0);

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search courses, lectures, reports..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={performSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={performSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView horizontal style={styles.filterContainer}>
        <Chip
          selected={searchType === 'all'}
          onPress={() => setSearchType('all')}
          style={styles.chip}
        >
          All
        </Chip>
        <Chip
          selected={searchType === 'courses'}
          onPress={() => setSearchType('courses')}
          style={styles.chip}
        >
          Courses
        </Chip>
        <Chip
          selected={searchType === 'lectures'}
          onPress={() => setSearchType('lectures')}
          style={styles.chip}
        >
          Lectures
        </Chip>
        <Chip
          selected={searchType === 'reports'}
          onPress={() => setSearchType('reports')}
          style={styles.chip}
        >
          Reports
        </Chip>
      </ScrollView>
      
      {totalResults > 0 && (
        <View style={styles.exportContainer}>
          <Text style={styles.resultCount}>Found {totalResults} results</Text>
          <TouchableOpacity style={styles.exportButton} onPress={exportToExcel}>
            <Text style={styles.exportButtonText}>📊 Export to Excel</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {loading ? (
        <ActivityIndicator size="large" color="#6200ee" style={styles.loader} />
      ) : (
        <ScrollView style={styles.resultsContainer}>
          {results.courses?.length > 0 && (
            <View style={styles.resultSection}>
              <Title style={styles.sectionTitle}>Courses ({results.courses.length})</Title>
              {results.courses.map(course => (
                <Card key={course.id} style={styles.resultCard}>
                  <Card.Content>
                    <Title>{course.name}</Title>
                    <Paragraph>Code: {course.code}</Paragraph>
                    <Paragraph>Stream: {course.stream}</Paragraph>
                    <Paragraph>Credits: {course.credits}</Paragraph>
                  </Card.Content>
                </Card>
              ))}
            </View>
          )}
          
          {results.lectures?.length > 0 && (
            <View style={styles.resultSection}>
              <Title style={styles.sectionTitle}>Lectures ({results.lectures.length})</Title>
              {results.lectures.map(lecture => (
                <Card key={lecture.id} style={styles.resultCard}>
                  <Card.Content>
                    <Title>{lecture.title}</Title>
                    <Paragraph>Date: {lecture.date}</Paragraph>
                    <Paragraph>Duration: {lecture.duration} mins</Paragraph>
                    <Paragraph>Venue: {lecture.venue}</Paragraph>
                  </Card.Content>
                </Card>
              ))}
            </View>
          )}
          
          {results.reports?.length > 0 && (
            <View style={styles.resultSection}>
              <Title style={styles.sectionTitle}>Reports ({results.reports.length})</Title>
              {results.reports.map(report => (
                <Card key={report.id} style={styles.resultCard}>
                  <Card.Content>
                    <Paragraph>{report.content}</Paragraph>
                    <Paragraph>Rating: {'⭐'.repeat(report.rating)}</Paragraph>
                    {report.feedback && <Paragraph>Feedback: {report.feedback}</Paragraph>}
                  </Card.Content>
                </Card>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginRight: 10,
  },
  searchButton: {
    backgroundColor: '#6200ee',
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  filterContainer: {
    padding: 10,
    backgroundColor: '#fff',
  },
  chip: {
    marginHorizontal: 5,
  },
  exportContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    marginTop: 5,
  },
  resultCount: {
    fontSize: 14,
    color: '#666',
  },
  exportButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  exportButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loader: {
    marginTop: 50,
  },
  resultsContainer: {
    flex: 1,
    padding: 15,
  },
  resultSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 10,
  },
  resultCard: {
    marginBottom: 10,
    elevation: 2,
  },
});

export default SearchScreen;