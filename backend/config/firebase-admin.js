const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Try to load service account from different possible locations
let serviceAccount;
const possiblePaths = [
  './serviceAccountKey.json',
  './config/serviceAccountKey.json',
  '../serviceAccountKey.json',
  path.join(__dirname, '../../serviceAccountKey.json'),
  path.join(__dirname, '../serviceAccountKey.json')
];

for (const filePath of possiblePaths) {
  if (fs.existsSync(filePath)) {
    try {
      serviceAccount = require(filePath);
      console.log(`✅ Found service account at: ${filePath}`);
      break;
    } catch (err) {
      console.log(`Failed to load ${filePath}:`, err.message);
    }
  }
}

if (!serviceAccount) {
  console.error('❌ Service account key file not found!');
  console.log('Please download serviceAccountKey.json from Firebase Console and place it in the backend folder');
  console.log('Steps:');
  console.log('1. Go to Firebase Console → Project Settings → Service Accounts');
  console.log('2. Click "Generate New Private Key"');
  console.log('3. Save the file as "serviceAccountKey.json" in the backend folder');
  process.exit(1);
}

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://university-monitoring-system-default-rtdb.firebaseio.com"
    });
    console.log(' Firebase Admin initialized successfully');
    console.log(` Project ID: ${serviceAccount.project_id}`);
  } catch (error) {
    console.error(' Firebase initialization error:', error.message);
    throw error;
  }
} else {
  console.log('✅ Firebase Admin already initialized');
}

const db = admin.firestore();
const auth = admin.auth();

// Test Firestore connection
const testConnection = async () => {
  try {
    // Try to write a test document
    const testDoc = db.collection('_connection_test').doc('test');
    await testDoc.set({
      timestamp: new Date().toISOString(),
      message: 'Connection successful'
    });
    console.log('✅ Firestore connection verified');
    
    // Clean up test document
    await testDoc.delete();
  } catch (error) {
    console.error('❌ Firestore connection failed:', error.message);
    if (error.code === 7 || error.code === 14) {
      console.log('\n⚠️  Network/DNS issue detected. Try these fixes:');
      console.log('1. Check your internet connection');
      console.log('2. Run: ipconfig /flushdns (Windows) or sudo dscacheutil -flushcache (Mac)');
      console.log('3. Restart your router');
      console.log('4. Use Google DNS (8.8.8.8)');
    }
  }
};

// Test Auth connection
const testAuth = async () => {
  try {
    // Just check if we can list users (limit 1)
    await auth.listUsers(1);
    console.log('✅ Firebase Auth connection verified');
  } catch (error) {
    console.error('❌ Firebase Auth connection failed:', error.message);
  }
};

// Run tests
testConnection();
testAuth();

module.exports = { admin, db, auth };