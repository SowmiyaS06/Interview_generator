require('dotenv').config({ path: '.env.local' });
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

// Admin user credentials
const ADMIN_EMAIL = "admin@prepwise.com";
const ADMIN_PASSWORD = "Admin@123456";
const ADMIN_NAME = "Admin User";

async function seedAdmin() {
  console.log("🌱 Starting admin user seeding...\n");

  try {
    // Initialize Firebase Admin
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });

    const auth = getAuth();
    const db = getFirestore();

    // Check if admin user already exists
    let adminUser;
    try {
      adminUser = await auth.getUserByEmail(ADMIN_EMAIL);
      console.log("✅ Admin user already exists in Firebase Auth");
      console.log(`   UID: ${adminUser.uid}`);
      console.log(`   Email: ${adminUser.email}`);
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        // Create admin user in Firebase Auth
        console.log("📝 Creating admin user in Firebase Auth...");
        adminUser = await auth.createUser({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          displayName: ADMIN_NAME,
          emailVerified: true,
        });
        console.log("✅ Admin user created in Firebase Auth");
        console.log(`   UID: ${adminUser.uid}`);
        console.log(`   Email: ${adminUser.email}`);
      } else {
        throw error;
      }
    }

    // Check if user exists in Firestore
    const userDoc = await db.collection("users").doc(adminUser.uid).get();

    if (userDoc.exists) {
      console.log("✅ Admin user already exists in Firestore");
    } else {
      // Create admin user in Firestore
      console.log("📝 Creating admin user in Firestore...");
      await db.collection("users").doc(adminUser.uid).set({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        createdAt: new Date().toISOString(),
      });
      console.log("✅ Admin user created in Firestore");
    }

    console.log("\n🎉 Admin seeding completed successfully!\n");
    console.log("📧 Admin Credentials:");
    console.log("   Email:    ", ADMIN_EMAIL);
    console.log("   Password: ", ADMIN_PASSWORD);
    console.log("\n⚠️  Important: Add this to your .env.local file:");
    console.log(`   ADMIN_EMAILS="${ADMIN_EMAIL}"\n`);
    console.log("🔐 You can now sign in at: http://localhost:3000/sign-in");
    console.log("🛡️  Access admin dashboard at: http://localhost:3000/admin\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding admin user:", error);
    process.exit(1);
  }
}

seedAdmin();
