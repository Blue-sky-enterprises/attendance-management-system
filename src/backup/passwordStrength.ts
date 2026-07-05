// ─── Password Strength Utilities ─────────────────────────────────────────────

export type PasswordStrength = "empty" | "weak" | "fair" | "good" | "strong";

export interface PasswordAnalysis {
  strength: PasswordStrength;
  score: number; // 0–4
  label: string;
  color: string;
  tips: string[];
}

const COMMON_PASSWORDS = new Set([
  "password",
  "12345678",
  "123456789",
  "1234567890",
  "password1",
  "password123",
  "qwerty123",
  "iloveyou",
  "admin123",
  "letmein",
  "welcome1",
  "monkey123",
  "dragon123",
  "baseball",
  "football",
  "superman",
  "trustno1",
  "sunshine",
  "princess",
  "passw0rd",
]);

/**
 * Analyzes a password and returns strength information.
 * Minimum 8 characters required.
 */
export function analyzePassword(password: string): PasswordAnalysis {
  if (!password) {
    return {
      strength: "empty",
      score: 0,
      label: "",
      color: "transparent",
      tips: [],
    };
  }

  const tips: string[] = [];
  let score = 0;

  // Length scoring
  if (password.length >= 8) score += 1;
  else tips.push("Use at least 8 characters");

  if (password.length >= 12) score += 1;
  else if (password.length >= 8) tips.push("Longer passwords are stronger (12+ recommended)");

  // Character variety
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  else tips.push("Mix uppercase and lowercase letters");

  if (/[0-9]/.test(password)) score += 0.5;
  else tips.push("Add numbers");

  if (/[^A-Za-z0-9]/.test(password)) score += 0.5;
  else tips.push("Add special characters (!, @, #, …)");

  // Common password penalty
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    score = Math.min(score, 1);
    tips.unshift("This is a very common password — please choose a different one");
  }

  // Clamp
  score = Math.min(Math.floor(score), 4);

  const levels: Record<
    number,
    { strength: PasswordStrength; label: string; color: string }
  > = {
    0: { strength: "weak", label: "Weak", color: "#94524a" },
    1: { strength: "weak", label: "Weak", color: "#94524a" },
    2: { strength: "fair", label: "Fair", color: "#a09a50" },
    3: { strength: "good", label: "Good", color: "#619e93" },
    4: { strength: "strong", label: "Strong", color: "#4e7e76" },
  };

  return { ...levels[score], score, tips };
}
