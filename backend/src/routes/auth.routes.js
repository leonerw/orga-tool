import express from "express";
import {
  changePassword,
  login,
  loginWithTwoFactor,
  logout,
  me,
  recoverWithBackupCode,
  refresh,
  register,
  resendVerificationEmail,
  verifyEmail,
} from "../controllers/auth.controller.js";
import {
  confirmTwoFactor,
  disableTwoFactor,
  setupTwoFactor,
} from "../controllers/twoFactor.controller.js";
import { requireAuth } from "../middleware/require-auth.js";

const router = express.Router();

// Public auth
router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);

// Protected auth
router.get("/me", requireAuth, me);
router.put("/password", requireAuth, changePassword);

// Email verification
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", requireAuth, resendVerificationEmail);

// 2FA setup (requires active session)
router.post("/2fa/setup", requireAuth, setupTwoFactor);
router.post("/2fa/confirm", requireAuth, confirmTwoFactor);
router.post("/2fa/disable", requireAuth, disableTwoFactor);

// 2FA login flow (public — called before session exists)
router.post("/2fa/login", loginWithTwoFactor);
router.post("/2fa/recover", recoverWithBackupCode);

export default router;
