const express = require("express");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const {upsertUserDoc, getUserDoc} = require("../services/userService");
const {verifyIdTokenMiddleware} = require("../middleware/authMiddleware");

const router = express.Router(); // eslint-disable-line new-cap

const API_KEY = process.env.WEB_API_KEY;

if (!API_KEY) {
  console.warn(
      "WARNING: Firebase Web API Key not found in environment variables.",
  );
}

/**
 * Signs in a user with their email and password using the Identity Toolkit API.
 * @param {string} email The user's email.
 * @param {string} password The user's password.
 * @return {Promise<object>} The sign-in data from the API.
 * @throws {Error} Throws an error if the API key is missing or sign-in fails.
 */
async function signInWithEmailPassword(email, password) {
  if (!API_KEY) throw new Error("Identity Toolkit API Key missing");
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({email, password, returnSecureToken: true}),
  });
  const data = await resp.json();
  if (!resp.ok) {
    const errMsg =
      (data && data.error && data.error.message) || JSON.stringify(data);
    const err = new Error(errMsg);
    if (data && data.error && data.error.message) {
      err.code = data.error.message;
    }
    throw err;
  }
  return data;
}

// POST /auth/signup (Improved Version)
router.post("/signup", async (req, res) => {
  console.log("Signup request body:", req.body);
  try {
    const {email, password} = req.body;
    if (!email || !password) {
      return res.status(400).json({error: "Missing email or password"});
    }

    // 1. Create the user
    const userRecord = await admin.auth().createUser({email, password});

    // 2. Create the user document in Firestore
    await upsertUserDoc(userRecord.uid, email);

    // 3. Create a custom token instead of signing in with a password
    const customToken = await admin.auth().createCustomToken(userRecord.uid);

    // 4. Return the custom token and user info
    return res.status(201).json({
      token: customToken,
      user: {userId: userRecord.uid, email, subscriptionStatus: "free"},
    });
  } catch (err) {
    console.error("signup error:", err);
    if (err.code === "auth/email-already-exists") {
      return res.status(409).json({error: "Email already in use"});
    }
    return res.status(500).json({
      error: (err && err.message) || "Server error",
    });
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  try {
    const {email, password} = req.body;
    if (!email || !password) {
      return res.status(400).json({error: "Missing email or password"});
    }

    const signInData = await signInWithEmailPassword(email, password);
    const uid = signInData.localId;
    const userDoc = await getUserDoc(uid);
    const subscriptionStatus =
      (userDoc && userDoc.subscriptionStatus) || "free";

    return res.json({
      token: signInData.idToken,
      user: {userId: uid, email, subscriptionStatus},
    });
  } catch (err) {
    console.error("login error:", err);
    if (
      err.code === "EMAIL_NOT_FOUND" ||
      (err.message && err.message.includes("EMAIL_NOT_FOUND")) ||
      (err.message && err.message.includes("INVALID_PASSWORD"))
    ) {
      return res.status(401).json({error: "Invalid email or password"});
    }
    return res.status(500).json({
      error: (err && err.message) || "Server error",
    });
  }
});

// GET /auth/me (protected)
router.get("/me", verifyIdTokenMiddleware, async (req, res) => {
  try {
    const uid = req.user.uid;
    const userDoc = await getUserDoc(uid);
    if (!userDoc) {
      return res.json({
        user: {
          userId: uid,
          email: req.user.email || null,
          subscriptionStatus: "free",
        },
      });
    }
    return res.json({user: userDoc});
  } catch (err) {
    console.error("/auth/me error:", err);
    return res.status(500).json({
      error: (err && err.message) || "Server error",
    });
  }
});

module.exports = router;