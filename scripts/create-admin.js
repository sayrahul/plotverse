const admin = require("firebase-admin");

// Check if we are running against the emulator
if (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true" || process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "1") {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
  // The Firebase admin SDK will automatically use FIREBASE_AUTH_EMULATOR_HOST
}

// Initialize the Firebase Admin SDK (will automatically connect to emulator if env var is set)
admin.initializeApp({
  projectId: "demo-project", // Use demo-project for emulators if no project ID is provided
});

async function createAdmin() {
  const email = process.argv[2] || "admin@example.com";
  const password = process.argv[3] || "password123";

  try {
    let user;
    try {
      user = await admin.auth().getUserByEmail(email);
      console.log(`User ${email} already exists. Updating password and claims.`);
      await admin.auth().updateUser(user.uid, { password });
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        user = await admin.auth().createUser({
          email,
          password,
          emailVerified: true,
        });
        console.log(`Created new user ${email}.`);
      } else {
        throw e;
      }
    }

    // Set the role custom claim required by PlotVerse (superadmin or editor)
    await admin.auth().setCustomUserClaims(user.uid, { role: "superadmin" });
    console.log(`Successfully assigned superadmin role to ${email}.`);
    console.log(`You can now log in at http://localhost:3000/admin/login with:`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    
  } catch (error) {
    console.error("Error creating admin user:", error);
  }
}

createAdmin();
