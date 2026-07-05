// ─── Import Panel ──────────────────────────────────────────────────────────────

import { useState, useRef, useId } from "react";
import {
  Upload,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  FileJson,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { importBackup } from "@/backup/importBackup";
import { BackupPreview } from "./BackupPreview";
// import type { ImportPreviewData, SectionKey } from "@/backup/backupTypes";
import type {
  ImportPreviewData,
  SectionKey,
  BackupPayload,
  RestoreApproval,
} from "@/backup/backupTypes";
import { SECTION_LABEL } from "@/backup/backupTypes";

// ─── File dropzone ────────────────────────────────────────────────────────────

interface DropzoneProps {
  file: File | null;
  onFile: (f: File) => void;
  onClear: () => void;
}

function Dropzone({ file, onFile, onClear }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith(".json")) onFile(dropped);
  };

  return (
    <div
      className={`dropzone ${dragging ? "dropzone--dragging" : ""} ${file ? "dropzone--filled" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !file && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />

      {file ? (
        <div className="dropzone__file">
          <FileJson className="w-5 h-5 shrink-0" style={{ color: "var(--accent-400)" }} />
          <div className="dropzone__file-info">
            <span className="dropzone__filename">{file.name}</span>
            <span className="dropzone__filesize">
              {(file.size / 1024).toFixed(1)} KB
            </span>
          </div>
          <button
            type="button"
            className="dropzone__clear"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            aria-label="Remove file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="dropzone__prompt">
          <Upload className="w-6 h-6" style={{ color: "var(--text-muted)" }} />
          <p className="dropzone__prompt-text">
            Drop your <code>.json</code> backup file here
          </p>
          <p className="dropzone__prompt-sub">or click to browse</p>
        </div>
      )}
    </div>
  );
}

// ─── ImportPanel ──────────────────────────────────────────────────────────────

interface ImportPanelProps {
  onSuccess?: (sections: SectionKey[], payload: BackupPayload, approval: RestoreApproval) => void;
  onError?: (message: string) => void;
}

export function ImportPanel({ onSuccess, onError }: ImportPanelProps) {
  const passwordId = useId();

  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<ImportPreviewData | null>(null);
  const [restored, setRestored] = useState<SectionKey[] | null>(null);

  const canDecrypt = file !== null && password.length > 0 && !loading;

  const handleDecrypt = async () => {
    if (!canDecrypt) return;
    setLoading(true);
    setError(null);

    try {
      const data = await importBackup(file!, password);
      setPreviewData(data);
      setPassword(""); // clear password after successful decrypt
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Import failed.";
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRestored = (sections: SectionKey[], payload: BackupPayload, approval: RestoreApproval) => {
    setRestored(sections);
    setPreviewData(null);
    onSuccess?.(sections, payload, approval);
  };

  const handleCancel = () => {
    setPreviewData(null);
    setError(null);
  };

  const handleReset = () => {
    setFile(null);
    setPassword("");
    setError(null);
    setPreviewData(null);
    setRestored(null);
  };

  // ── Success state ─────────────────────────────────────────────────────────
  if (restored !== null) {
    return (
      <div className="backup-panel">
        <div className="backup-success">
          <div className="backup-success__icon">✓</div>
          <h3 className="backup-success__title">Restore Complete</h3>
          <p className="backup-success__desc">
            Successfully restored:{" "}
            <strong>{restored.map((k) => SECTION_LABEL[k]).join(", ")}</strong>
          </p>
          <p className="backup-success__reload">
            The page needs to reload to reflect the restored data.
          </p>
          <div className="flex gap-3 justify-center flex-wrap mt-2">
            <Button
              id="reload-after-restore-btn"
              className="backup-btn backup-btn--primary"
              onClick={() => window.location.reload()}
            >
              Reload Now
            </Button>
            <Button
              variant="ghost"
              className="backup-btn backup-btn--ghost"
              onClick={handleReset}
            >
              Import Another
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Preview state ─────────────────────────────────────────────────────────
  if (previewData !== null) {
    return (
      <BackupPreview
        previewData={previewData}
        onRestored={handleRestored}
        onCancel={handleCancel}
      />
    );
  }

  // ── Upload state ──────────────────────────────────────────────────────────
  return (
    <div className="backup-panel">
      {/* Header */}
      <div className="backup-panel__header">
        <div className="backup-panel__icon backup-panel__icon--import">
          <Upload className="w-5 h-5" />
        </div>
        <div>
          <h3 className="backup-panel__title">Import & Restore Backup</h3>
          <p className="backup-panel__desc">
            Upload a <code>.json</code> backup file and enter the password used
            during export. Data is previewed before anything is written.
          </p>
        </div>
      </div>

      {/* Fields */}
      <div className="backup-panel__fields">
        {/* Dropzone */}
        <Dropzone
          file={file}
          onFile={setFile}
          onClear={() => setFile(null)}
        />

        {/* Password */}
        <div className="backup-field">
          <label htmlFor={passwordId} className="backup-field__label">
            Backup Password
          </label>
          <div className="backup-field__input-wrap">
            <Input
              id={passwordId}
              type={showPw ? "text" : "password"}
              placeholder="Enter the backup password…"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="backup-input pr-10"
              autoComplete="current-password"
              onKeyDown={(e) => e.key === "Enter" && handleDecrypt()}
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
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="backup-status backup-status--error">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Action */}
      <Button
        id="decrypt-preview-btn"
        onClick={handleDecrypt}
        disabled={!canDecrypt}
        className="backup-btn backup-btn--primary w-full"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Decrypting…
          </>
        ) : (
          <>
            <Eye className="w-4 h-4" />
            Decrypt & Preview
          </>
        )}
      </Button>

      <p className="backup-security-note">
        🔒 Data is never written to storage until you approve the preview.
      </p>
    </div>
  );
}
