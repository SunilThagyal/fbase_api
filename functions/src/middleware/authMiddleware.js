const admin = require("firebase-admin");

/**
 * Middleware to verify Firebase ID token from Authorization header.
 * Attaches decoded token as req.user and calls next().
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
async function verifyIdTokenMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({error: "Missing or invalid token"});
    }

    const idToken = authHeader.split(" ")[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded; // contains uid, email, etc.
    next();
  } catch (err) {
    console.error("verify token error:", err);
    return res.status(401).json({error: "Unauthorized"});
  }
}

module.exports = {verifyIdTokenMiddleware};
