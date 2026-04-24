import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD4lD8FVko6H2UoUlvzb_O19f_ASAE2caQ",
  authDomain: "university-monitoring-system.firebaseapp.com",
  projectId: "university-monitoring-system",
  storageBucket: "university-monitoring-system.firebasestorage.app",
  messagingSenderId: "592959018762",
  appId: "1:592959018762:web:24462f39e7b40efbc6ccf3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Helper functions
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const registerUser = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get all courses from Firebase
export const getAllCourses = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'courses'));
    const courses = [];
    querySnapshot.forEach(doc => {
      courses.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: courses };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};

// Add course to Firebase
export const addCourseToFirebase = async (courseData) => {
  try {
    const docRef = await addDoc(collection(db, 'courses'), {
      ...courseData,
      createdAt: new Date().toISOString()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get all lecturers
export const getAllLecturers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'lecturers'));
    const lecturers = [];
    querySnapshot.forEach(doc => {
      lecturers.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: lecturers };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};

// Get all lectures
export const getAllLectures = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'lectures'));
    const lectures = [];
    querySnapshot.forEach(doc => {
      lectures.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: lectures };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};

// Get all reports
export const getAllReports = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'reports'));
    const reports = [];
    querySnapshot.forEach(doc => {
      reports.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: reports };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};

export default { auth, db, loginUser, registerUser, logoutUser, getAllCourses, getAllLecturers, getAllLectures, getAllReports };