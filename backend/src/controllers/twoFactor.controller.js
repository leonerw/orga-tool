import User from "../models/user.model.js";
import { hashBackupCode } from "../utils/auth.js";
import {
  generateBackupCodes,
  generateQrCodeDataUrl,
  generateTotpSecret,
  verifyTotpCode,
} from "../utils/totp.js";

export async function setupTwoFactor(req, res) {
  try {
    const user = await User.findById(req.auth.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({ message: "2FA is already enabled" });
    }

    const secret = generateTotpSecret();
    const qrCodeDataUrl = await generateQrCodeDataUrl(user.email, secret);

    // Store secret but don't enable yet — user must confirm with a code first
    user.twoFactorSecret = secret;
    await user.save();

    return res.json({ secret, qrCodeDataUrl });
  } catch {
    return res.status(500).json({ message: "Error setting up 2FA" });
  }
}

export async function confirmTwoFactor(req, res) {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Code is required" });
    }

    const user = await User.findById(req.auth.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({ message: "2FA is already enabled" });
    }

    if (!user.twoFactorSecret) {
      return res.status(400).json({ message: "2FA setup not initiated. Call /2fa/setup first" });
    }

    if (!verifyTotpCode(user.twoFactorSecret, String(code))) {
      return res.status(400).json({ message: "Invalid code" });
    }

    const backupCodes = generateBackupCodes();
    user.twoFactorEnabled = true;
    user.backupCodeHashes = backupCodes.map(hashBackupCode);
    await user.save();

    // Return plain backup codes once — they are never retrievable again
    return res.json({ backupCodes });
  } catch {
    return res.status(500).json({ message: "Error confirming 2FA" });
  }
}

export async function disableTwoFactor(req, res) {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Code is required" });
    }

    const user = await User.findById(req.auth.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: "2FA is not enabled" });
    }

    if (!verifyTotpCode(user.twoFactorSecret, String(code))) {
      return res.status(401).json({ message: "Invalid code" });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.backupCodeHashes = [];
    await user.save();

    return res.status(204).send();
  } catch {
    return res.status(500).json({ message: "Error disabling 2FA" });
  }
}
