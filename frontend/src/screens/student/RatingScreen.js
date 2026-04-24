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

const RatingScreen = () => {
  const [lectures, setLectures] = useState([]);
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState({});
  const [submittedRatings, setSubmittedRatings] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    fetchLectures();
    fetchSubmittedRatings();
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

  const fetchSubmittedRatings = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userRole = await AsyncStorage.getItem('userRole');
      
      if (userRole === 'lecturer') {
        const response = await axios.get(`${API_URL}/ratings/lecturer/lecturer1`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAverageRating(response.data.averageRating);
        setSubmittedRatings(response.data.ratings || []);
      }
    } catch (error) {
      console.error('Error fetching ratings:', error);
    }
  };

  const submitRating = async (lectureId) => {
    const rating = ratings[lectureId];
    const comment = comments[lectureId] || '';
    
    if (!rating) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.post(`${API_URL}/ratings`, {
        lectureId,
        rating,
        comment
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      Alert.alert('Success', 'Thank you for your feedback!');
      setRatings({ ...ratings, [lectureId]: null });
      setComments({ ...comments, [lectureId]: '' });
      fetchSubmittedRatings();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit rating');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchLectures(), fetchSubmittedRatings()]);
    setRefreshing(false);
  };

  const renderStars = (lectureId) => {
    const currentRating = ratings[lectureId] || 0;
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity
            key={star}
            onPress={() => setRatings({ ...ratings, [lectureId]: star })}
          >
            <Text style={[
              styles.star,
              currentRating >= star && styles.starSelected
            ]}>
              {currentRating >= star ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderRatingAverage = () => {
    if (averageRating > 0) {
      return (
        <Card style={styles.averageCard}>
          <Card.Content>
            <Title style={styles.averageTitle}>Your Average Rating</Title>
            <View style={styles.averageStars}>
              <Text style={styles.averageNumber}>{averageRating}</Text>
              <Text style={styles.averageStarText}>
                {' '}{'★'.repeat(Math.round(averageRating))}{'☆'.repeat(5 - Math.round(averageRating))}
              </Text>
            </View>
            <Paragraph>Total Ratings: {submittedRatings.length}</Paragraph>
          </Card.Content>
        </Card>
      );
    }
    return null;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rate Your Lectures</Text>
      </View>

      {renderRatingAverage()}

      <View style={styles.section}>
        <Title style={styles.sectionTitle}>Rate Recent Lectures</Title>
        {lectures.map(lecture => {
          const isRated = submittedRatings.some(r => r.lectureId === lecture.id);
          
          if (isRated) {
            return (
              <Card key={lecture.id} style={styles.ratedCard}>
                <Card.Content>
                  <Title>{lecture.title}</Title>
                  <Paragraph>📅 {lecture.date}</Paragraph>
                  <View style={styles.ratedContainer}>
                    <Text style={styles.ratedText}>✓ Already Rated</Text>
                  </View>
                </Card.Content>
              </Card>
            );
          }
          
          return (
            <Card key={lecture.id} style={styles.lectureCard}>
              <Card.Content>
                <Title>{lecture.title}</Title>
                <Paragraph>📅 Date: {lecture.date}</Paragraph>
                <Paragraph>⏰ Time: {lecture.time}</Paragraph>
                
                <Text style={styles.ratingLabel}>Your Rating:</Text>
                {renderStars(lecture.id)}
                
                <TextInput
                  style={styles.commentInput}
                  placeholder="Add a comment (optional)"
                  value={comments[lecture.id] || ''}
                  onChangeText={(text) => setComments({ ...comments, [lecture.id]: text })}
                  multiline
                />
                
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={() => submitRating(lecture.id)}
                >
                  <Text style={styles.submitButtonText}>Submit Rating</Text>
                </TouchableOpacity>
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
  averageCard: {
    margin: 15,
    backgroundColor: '#FFF3E0',
    elevation: 3,
  },
  averageTitle: {
    textAlign: 'center',
    fontSize: 16,
  },
  averageStars: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  averageNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  averageStarText: {
    fontSize: 24,
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
  ratedCard: {
    marginBottom: 15,
    opacity: 0.7,
    backgroundColor: '#f0f0f0',
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  star: {
    fontSize: 30,
    marginRight: 5,
    color: '#ddd',
  },
  starSelected: {
    color: '#FFD700',
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    fontSize: 14,
    minHeight: 60,
  },
  submitButton: {
    backgroundColor: '#6200ee',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  ratedContainer: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    alignItems: 'center',
  },
  ratedText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
});

export default RatingScreen;