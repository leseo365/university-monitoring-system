const express = require('express');
const router = express.Router();

// Helper to get Firebase instances
const getDb = (req) => req.app.locals.db;
const getAuth = (req) => req.app.locals.auth;

// register - Create new user account
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  const db = getDb(req);
  const auth = getAuth(req);
  
  console.log(' Registration attempt:', { name, email, role });
  
  // Validate inputs
  if (!name || !email || !password) {
    return res.status(400).json({ 
      success: false,
      error: 'Please provide all required fields' 
    });
  }
  
  // Check if Firebase is initialized
  if (!db || !auth) {
    console.error(' Firebase not initialized');
    return res.status(500).json({ 
      success: false,
      error: 'Database service unavailable. Please check server configuration.',
      details: 'Firebase not initialized'
    });
  }
  
  try {
    // Check if user already exists in Firestore
    console.log(' Checking if user exists...');
    const userQuery = await db.collection('users').where('email', '==', email).get();
    
    if (!userQuery.empty) {
      console.log(' Registration failed: User already exists');
      return res.status(400).json({ 
        success: false,
        error: 'User already exists with this email' 
      });
    }
    
    // Create user in Firebase Auth
    console.log(' Creating user in Firebase Auth...');
    let firebaseUser;
    try {
      firebaseUser = await auth.createUser({
        email: email,
        password: password,
        displayName: name
      });
      console.log(' User created in Firebase Auth:', firebaseUser.uid);
    } catch (authError) {
      console.error('Firebase Auth error:', authError.code, authError.message);
      
      // Handle specific Firebase Auth errors
      if (authError.code === 'auth/email-already-exists') {
        return res.status(400).json({ 
          success: false,
          error: 'Email already exists in authentication system' 
        });
      }
      if (authError.code === 'auth/invalid-email') {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid email format' 
        });
      }
      if (authError.code === 'auth/weak-password') {
        return res.status(400).json({ 
          success: false,
          error: 'Password should be at least 6 characters' 
        });
      }
      
      return res.status(500).json({ 
        success: false,
        error: 'Failed to create user in authentication system',
        details: authError.message
      });
    }
    
    // Store user data in Firestore
    console.log(' Storing user in Firestore...');
    const userData = {
      uid: firebaseUser.uid,
      name,
      email,
      role: role || 'student',
      createdAt: new Date().toISOString(),
      lastLogin: null,
      isActive: true
    };
    
    await db.collection('users').doc(firebaseUser.uid).set(userData);
    console.log(' User stored in Firestore');
    
    // Return success without password
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        uid: firebaseUser.uid,
        name,
        email,
        role: userData.role
      }
    });
    
  } catch (error) {
    console.error(' Registration error:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// login - Authenticate user
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const db = getDb(req);
  const auth = getAuth(req);
  
  console.log(' Login attempt:', { email });
  
  // Validate inputs
  if (!email || !password) {
    return res.status(400).json({ 
      success: false,
      error: 'Please provide email and password' 
    });
  }
  
  // Check if Firebase is initialized
  if (!db || !auth) {
    console.error(' Firebase not initialized');
    return res.status(500).json({ 
      success: false,
      error: 'Database service unavailable. Please check server configuration.',
      details: 'Firebase not initialized'
    });
  }
  
  try {
    // Find user in Firestore
    console.log(' Looking up user in Firestore...');
    const userQuery = await db.collection('users').where('email', '==', email).get();
    
    if (userQuery.empty) {
      console.log(' Login failed: User not found');
      return res.status(401).json({ 
        success: false,
        error: 'Account not found. Please register first.' 
      });
    }
    
    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();
    console.log(' User found in Firestore:', userData.uid);
    
    
    // Update last login timestamp
    await db.collection('users').doc(userData.uid).update({
      lastLogin: new Date().toISOString()
    });
    
    console.log(` Login successful:`, { email: userData.email, role: userData.role });
    
    // Return user data (no token for now)
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        uid: userData.uid,
        name: userData.name,
        email: userData.email,
        role: userData.role
      }
    });
    
  } catch (error) {
    console.error(' Login error:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// get user profile
router.get('/profile', async (req, res) => {
  const db = getDb(req);
  const userId = req.query.userId;
  
  console.log(' Profile request for userId:', userId);
  
  if (!db) {
    return res.status(500).json({ 
      success: false,
      error: 'Database service unavailable' 
    });
  }
  
  if (!userId) {
    return res.status(400).json({ 
      success: false,
      error: 'User ID required' 
    });
  }
  
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    const userData = userDoc.data();
    res.json({
      success: true,
      user: {
        uid: userData.uid,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        createdAt: userData.createdAt,
        lastLogin: userData.lastLogin
      }
    });
    
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// get all users (for testing)
router.get('/users', async (req, res) => {
  const db = getDb(req);
  
  if (!db) {
    return res.status(500).json({ 
      success: false,
      error: 'Database service unavailable' 
    });
  }
  
  try {
    const snapshot = await db.collection('users').get();
    const users = [];
    snapshot.forEach(doc => {
      const userData = doc.data();
      users.push({
        uid: userData.uid,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        createdAt: userData.createdAt
      });
    });
    
    console.log(`📋 Retrieved ${users.length} users`);
    res.json({ 
      success: true, 
      users, 
      count: users.length 
    });
    
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;