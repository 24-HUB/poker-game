import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { z } from "zod";

/**
 * Auth API Integration Tests
 * Tests the authentication endpoints
 */
describe("Auth API Integration Tests", () => {
  const API_BASE = "http://localhost:3000/api/auth";
  
  const validUserData = {
    username: "testuser",
    email: "test@example.com",
    password: "Password123",
  };

  describe("POST /api/auth/register", () => {
    test("should register a new user successfully", async () => {
      const userData = {
        ...validUserData,
        email: `test_${Date.now()}@example.com`,
      };

      const response = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(userData.email);
      expect(data.user.chips).toBe(1000); // Starting chips
    });

    test("should reject registration with invalid email", async () => {
      const userData = {
        ...validUserData,
        email: "invalid-email",
      };

      const response = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      expect(response.status).not.toBe(200);
    });

    test("should reject registration with short password", async () => {
      const userData = {
        ...validUserData,
        password: "short",
      };

      const response = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      expect(response.status).not.toBe(200);
    });

    test("should reject registration with short username", async () => {
      const userData = {
        ...validUserData,
        username: "ab",
      };

      const response = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      expect(response.status).not.toBe(200);
    });

    test("should prevent duplicate email registration", async () => {
      const userData = {
        ...validUserData,
        email: `duplicate_${Date.now()}@example.com`,
      };

      // First registration
      await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      // Duplicate attempt
      const response = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      expect(response.status).not.toBe(200);
      const data = await response.json();
      expect(data.error.code).toBe("USER_EXISTS");
    });
  });

  describe("POST /api/auth/login", () => {
    let testEmail: string;
    let testPassword = "TestPassword123";

    beforeEach(async () => {
      // Create a test user
      testEmail = `login_test_${Date.now()}@example.com`;
      await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "logintest",
          email: testEmail,
          password: testPassword,
        }),
      });
    });

    test("should login with valid credentials", async () => {
      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(testEmail);
      expect(data.session).toBeDefined();
    });

    test("should reject login with invalid email", async () => {
      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "nonexistent@example.com",
          password: testPassword,
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error.code).toBe("INVALID_CREDENTIALS");
    });

    test("should reject login with invalid password", async () => {
      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail,
          password: "WrongPassword123",
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error.code).toBe("INVALID_CREDENTIALS");
    });

    test("should return user with starting chips (1000)", async () => {
      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      const data = await response.json();
      expect(data.user.chips).toBe(1000);
    });
  });
});

/**
 * Health Check Integration Test
 */
describe("Server Health Check", () => {
  test("should return health status", async () => {
    const response = await fetch("http://localhost:3000/health");
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe("ok");
  });
});

/**
 * Socket.IO Integration Tests (Basic connectivity)
 */
describe("Socket.IO Server", () => {
  test("server should be running on correct port", async () => {
    const response = await fetch("http://localhost:3000/health");
    expect(response.ok).toBe(true);
  });
});
