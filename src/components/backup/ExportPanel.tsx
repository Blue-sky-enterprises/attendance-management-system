// ─── Export Panel ──────────────────────────────────────────────────────────────

import { useState, useId } from "react";
import { Shield, Download, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exportBackup } from "@/backup/exportBackup";
import { analyzePassword } from "@/backup/passwordStrength";

// ─── PasswordStrengthBar ─────────────────────────────────────────────────────

function PasswordStrengthBar({ password }: { password: string }) {
  const analysis = analyzePassword(password);
  if (!password) return null;

  const filledSegments = analysis.score;

  return (
    <div className="space-y-1.5 mt-2">
      {/* Segmented bar */}
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{
              backgroundColor:
                i < filledSegments ? analysis.color : "rgba(58,67,95,0.4)",
            }}
          />
        ))}
      </div>
      {/* Label + tips */}
      <div className="flex items-start justify-between gap-2">
        <span
          className="text-[11px] font-semibold"
          style={{ color: analysis.color }}
        >
          {analysis.label}
        </span>
        {analysis.tips.length > 0 && (
          <span className="text-[10px] text-right leading-tight"
            style={{ color: "var(--text-muted)" }}>
            {analysis.tips[0]}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── ExportPanel ─────────────────────────────────────────────────────────────

interface ExportPanelProps {
  onSuccess?: (filename: string) => void;
  onError?: (message: string) => void;
}

export function ExportPanel({ onSuccess, onError }: ExportPanelProps) {
  const passwordId = useId();
  const confirmId = useId();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");

  const analysis = analyzePassword(password);
  const passwordTooWeak = password.length > 0 && analysis.score < 2;
  const passwordMismatch = confirm.length > 0 && password !== confirm;
  const canExport =
    password.length >= 8 &&
    analysis.score >= 2 &&
    password === confirm &&
    !loading;

  const handleExport = async () => {
    if (!canExport) return;
    setLoading(true);
    setStatus("idle");
    setStatusMsg("");

    try {
      const filename = await exportBackup(password);
      setStatus("success");
      setStatusMsg(`Backup saved as "${filename}"`);
      setPassword("");
      setConfirm("");
      onSuccess?.(filename);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Export failed.";
      setStatus("error");
      setStatusMsg(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="backup-panel">
      {/* Header */}
      <div className="backup-panel__header">
        <div className="backup-panel__icon backup-panel__icon--export">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h3 className="backup-panel__title">Export Encrypted Backup</h3>
          <p className="backup-panel__desc">
            All data is compressed and encrypted with AES-256-GCM before
            download. The password is never stored.
          </p>
        </div>
      </div>

      {/* Fields */}
      <div className="backup-panel__fields">
        {/* Password */}
        <div className="backup-field">
          <label htmlFor={passwordId} className="backup-field__label">
            Encryption Password
          </label>
          <div className="backup-field__input-wrap">
            <Input
              id={passwordId}
              type={showPw ? "text" : "password"}
              placeholder="Enter a strong passphrase…"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="backup-input pr-10"
              autoComplete="new-password"
            />
            <button
              type="button"
              className="backup-field__eye"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          <PasswordStrengthBar password={password} />
          {passwordTooWeak && (
            <p className="backup-field__error">
              Password is too weak. Use at least 12 characters with mixed case
              and symbols.
            </p>
          )}
        </div>

        {/* Confirm */}
        <div className="backup-field">
          <label htmlFor={confirmId} className="backup-field__label">
            Confirm Password
          </label>
          <div className="backup-field__input-wrap">
            <Input
              id={confirmId}
              type={showConfirm ? "text" : "password"}
              placeholder="Repeat the passphrase…"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="backup-input pr-10"
              autoComplete="new-password"
              onKeyDown={(e) => e.key === "Enter" && handleExport()}
            />
            <button
              type="button"
              className="backup-field__eye"
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {passwordMismatch && (
            <p className="backup-field__error">Passwords do not match.</p>
          )}
        </div>
      </div>

      {/* Status message */}
      {status !== "idle" && (
        <div
          className={`backup-status ${status === "success" ? "backup-status--success" : "backup-status--error"}`}
        >
          {status === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Action */}
      <Button
        id="export-backup-btn"
        onClick={handleExport}
        disabled={!canExport}
        className="backup-btn backup-btn--primary w-full"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Encrypting…
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Download Encrypted Backup
          </>
        )}
      </Button>

      {/* Security note */}
      <p className="backup-security-note">
        🔒 AES-256-GCM · PBKDF2 · 600,000 iterations · Browser-native WebCrypto
      </p>
    </div>
  );
}
