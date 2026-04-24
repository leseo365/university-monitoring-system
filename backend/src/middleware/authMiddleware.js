const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    // Try to load service account
    const serviceAccount = require('../config/serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    // If no service account, use default (for development)
    console.warn('No service account found. Using default credentials.');
    admin.initializeApp({
      projectId: 'demo-project'
    });
  }
}

const db = admin.firestore();
const auth = admin.auth();

const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    
    // Get user role from Firestore
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    req.user.role = userDoc.exists ? userDoc.data().role : 'student';
    
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

const checkRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Required role: ' + roles.join(' or ') });
    }
    next();
  };
};

module.exports = { verifyToken, checkRole, db, auth };
