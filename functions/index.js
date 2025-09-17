const {onRequest} = require("firebase-functions/v2/https");
const express = require("express");
const admin = require("firebase-admin");

// initialize admin SDK
admin.initializeApp();

const app = express();
app.use(express.json());

// mount auth router
const authRouter = require("./src/routes/auth");
app.use("/auth", authRouter);

// Export the Express app as a 2nd Gen Cloud Function
exports.api = onRequest(app);