import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    // Provide dummy secrets so integration tests work in CI without a .env file.
    // These values are not used in production — real secrets live in .env (gitignored).
    env: {
      NODE_ENV: "test",
      ACCESS_TOKEN_SECRET: "test-access-secret",
      ACCESS_TOKEN_TTL: "15m",
      EMAIL_VERIFY_SECRET: "test-email-verify-secret",
      TWO_FACTOR_PENDING_SECRET: "test-2fa-pending-secret",
      FRONTEND_URL: "http://localhost:5173",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.js"],
      exclude: ["src/main.js"],
    },
  },
});
