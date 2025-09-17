const admin = require("firebase-admin");
// FIX: Spaces removed from inside the curly braces.
const {FieldValue} = require("firebase-admin/firestore");

/**
 * Creates a new user document or updates an existing one with basic info.
 * @param {string} uid The user's unique ID from Firebase Auth.
 * @param {string} email The user's email address.
 * @return {Promise<object|null>} A promise that resolves to the user's data.
 */
async function upsertUserDoc(uid, email) {
  const ref = admin.firestore().collection("users").doc(uid);
  const data = {
    userId: uid,
    email,
    createdAt: FieldValue.serverTimestamp(),
    subscriptionStatus: "free",
    stripeCustomerId: null,
    subscriptionEndDate: null,
  };
  // FIX: Spaces removed from inside the curly braces.
  await ref.set(data, {merge: true});
  const snap = await ref.get();
  return snap.exists ? snap.data() : null;
}

/**
 * Retrieves a user document from Firestore by its UID.
 * @param {string} uid The user's unique ID.
 * @return {Promise<object|null>} The user's data object or null.
 */
async function getUserDoc(uid) {
  const ref = admin.firestore().collection("users").doc(uid);
  const snap = await ref.get();
  return snap.exists ? snap.data() : null;
}

// FIX: Spaces removed from inside the curly braces.
module.exports = {upsertUserDoc, getUserDoc};
// FIX: Added a final newline at the end of the file.
