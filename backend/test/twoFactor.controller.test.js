import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/models/user.model.js", () => ({
  default: {
    findById: vi.fn(),
  },
}));

vi.mock("../src/utils/auth.js", () => ({
  hashBackupCode: vi.fn(),
}));

vi.mock("../src/utils/totp.js", () => ({
  generateTotpSecret: vi.fn(),
  generateQrCodeDataUrl: vi.fn(),
  generateBackupCodes: vi.fn(),
  verifyTotpCode: vi.fn(),
}));

import User from "../src/models/user.model.js";
import { hashBackupCode } from "../src/utils/auth.js";
import {
  generateBackupCodes,
  generateQrCodeDataUrl,
  generateTotpSecret,
  verifyTotpCode,
} from "../src/utils/totp.js";
import {
  confirmTwoFactor,
  disableTwoFactor,
  setupTwoFactor,
} from "../src/controllers/twoFactor.controller.js";

const userId = "507f191e810c19729de860ea";

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
};

const mockReq = (overrides = {}) => ({
  auth: { userId },
  body: {},
  ...overrides,
});

const makeUser = (overrides = {}) => ({
  _id: userId,
  email: "alice@example.com",
  twoFactorEnabled: false,
  twoFactorSecret: null,
  backupCodeHashes: [],
  save: vi.fn().mockResolvedValue({}),
  ...overrides,
});

describe("twoFactor.controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    generateTotpSecret.mockReturnValue("BASE32SECRET");
    generateQrCodeDataUrl.mockResolvedValue("data:image/png;base64,qrcode");
    generateBackupCodes.mockReturnValue(["code1", "code2"]);
    hashBackupCode.mockImplementation((c) => `hash:${c}`);
    verifyTotpCode.mockReturnValue(true);
  });

  // ─── setupTwoFactor ───────────────────────────────────────────────────────────

  describe("setupTwoFactor", () => {
    it("returns 401 when user not found", async () => {
      User.findById.mockResolvedValue(null);
      const res = mockRes();

      await setupTwoFactor(mockReq(), res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 400 when 2FA is already enabled", async () => {
      User.findById.mockResolvedValue(makeUser({ twoFactorEnabled: true }));
      const res = mockRes();

      await setupTwoFactor(mockReq(), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "2FA is already enabled" });
    });

    it("generates secret and QR code, saves secret to user", async () => {
      const userObj = makeUser();
      User.findById.mockResolvedValue(userObj);
      const res = mockRes();

      await setupTwoFactor(mockReq(), res);

      expect(generateTotpSecret).toHaveBeenCalled();
      expect(generateQrCodeDataUrl).toHaveBeenCalledWith("alice@example.com", "BASE32SECRET");
      expect(userObj.twoFactorSecret).toBe("BASE32SECRET");
      expect(userObj.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        secret: "BASE32SECRET",
        qrCodeDataUrl: "data:image/png;base64,qrcode",
      });
    });

    it("returns 500 on unexpected error", async () => {
      User.findById.mockRejectedValue(new Error("db down"));
      const res = mockRes();

      await setupTwoFactor(mockReq(), res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── confirmTwoFactor ─────────────────────────────────────────────────────────

  describe("confirmTwoFactor", () => {
    it("returns 400 when code is missing", async () => {
      User.findById.mockResolvedValue(makeUser({ twoFactorSecret: "SECRET" }));
      const res = mockRes();

      await confirmTwoFactor(mockReq({ body: {} }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Code is required" });
    });

    it("returns 400 when 2FA is already enabled", async () => {
      User.findById.mockResolvedValue(makeUser({ twoFactorEnabled: true, twoFactorSecret: "SECRET" }));
      const res = mockRes();

      await confirmTwoFactor(mockReq({ body: { code: "123456" } }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "2FA is already enabled" });
    });

    it("returns 400 when setup was not initiated (no secret)", async () => {
      User.findById.mockResolvedValue(makeUser());
      const res = mockRes();

      await confirmTwoFactor(mockReq({ body: { code: "123456" } }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "2FA setup not initiated. Call /2fa/setup first" });
    });

    it("returns 400 when TOTP code is wrong", async () => {
      User.findById.mockResolvedValue(makeUser({ twoFactorSecret: "SECRET" }));
      verifyTotpCode.mockReturnValue(false);
      const res = mockRes();

      await confirmTwoFactor(mockReq({ body: { code: "000000" } }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid code" });
    });

    it("enables 2FA, hashes backup codes, returns plain codes once", async () => {
      const userObj = makeUser({ twoFactorSecret: "SECRET" });
      User.findById.mockResolvedValue(userObj);
      const res = mockRes();

      await confirmTwoFactor(mockReq({ body: { code: "123456" } }), res);

      expect(verifyTotpCode).toHaveBeenCalledWith("SECRET", "123456");
      expect(userObj.twoFactorEnabled).toBe(true);
      expect(userObj.backupCodeHashes).toEqual(["hash:code1", "hash:code2"]);
      expect(userObj.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ backupCodes: ["code1", "code2"] });
    });
  });

  // ─── disableTwoFactor ─────────────────────────────────────────────────────────

  describe("disableTwoFactor", () => {
    it("returns 400 when code is missing", async () => {
      User.findById.mockResolvedValue(makeUser({ twoFactorEnabled: true }));
      const res = mockRes();

      await disableTwoFactor(mockReq({ body: {} }), res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 when 2FA is not enabled", async () => {
      User.findById.mockResolvedValue(makeUser());
      const res = mockRes();

      await disableTwoFactor(mockReq({ body: { code: "123456" } }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "2FA is not enabled" });
    });

    it("returns 401 when code is wrong", async () => {
      User.findById.mockResolvedValue(makeUser({ twoFactorEnabled: true, twoFactorSecret: "SECRET" }));
      verifyTotpCode.mockReturnValue(false);
      const res = mockRes();

      await disableTwoFactor(mockReq({ body: { code: "000000" } }), res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid code" });
    });

    it("disables 2FA and clears secret on valid code", async () => {
      const userObj = makeUser({
        twoFactorEnabled: true,
        twoFactorSecret: "SECRET",
        backupCodeHashes: ["hash:abc"],
      });
      User.findById.mockResolvedValue(userObj);
      const res = mockRes();

      await disableTwoFactor(mockReq({ body: { code: "123456" } }), res);

      expect(userObj.twoFactorEnabled).toBe(false);
      expect(userObj.twoFactorSecret).toBeNull();
      expect(userObj.backupCodeHashes).toEqual([]);
      expect(userObj.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(204);
    });
  });
});
