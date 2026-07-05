// ─── Backup Preview Screen ─────────────────────────────────────────────────────

import { useState } from "react";
import {
  CheckCircle2,
  X,
  BarChart3,
  Trophy,
  Calendar,
  HardDrive,
  FileArchive,
  Info,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionPreviewCard } from "./SectionPreviewCard";
import type { ImportPreviewData, RestoreApproval, SectionKey,BackupPayload } from "@/backup/backupTypes";
import { ALL_SECTION_KEYS, SECTION_LABEL } from "@/backup/backupTypes";
import { writeSections } from "@/backup/storage";
import { formatBytes, formatISODate } from "@/backup/utils";

// ─── Analytics card ───────────────────────────────────────────────────────────

function AnalyticsSummary({ data }: { data: ImportPreviewData }) {
  const { analytics, envelope } = data;

  const items = [
    {
      icon: <Calendar className="w-4 h-4" />,
      label: "Date Range",
      value: analytics.dateRange
        ? `${analytics.dateRange.first} → ${analytics.dateRange.last}`
        : "No records",
    },
    {
      icon: <BarChart3 className="w-4 h-4" />,
      label: "Total Duties",
      value: analytics.totalDuties.toLocaleString(),
    },
    {
      icon: <X className="w-4 h-4" />,
      label: "Total Absentees",
      value: analytics.totalAbsentees.toLocaleString(),
    },
    ...(analytics.topEmployee
      ? [
          {
            icon: <Trophy className="w-4 h-4" />,
            label: "Top Employee",
            value: `${analytics.topEmployee.name} (${analytics.topEmployee.count} duties)`,
          },
        ]
      : []),
    {
      icon: <FileArchive className="w-4 h-4" />,
      label: "Encrypted Size",
      value: formatBytes(data.encryptedSizeBytes),
    },
    {
      icon: <HardDrive className="w-4 h-4" />,
      label: "Uncompressed Size",
      value: formatBytes(data.uncompressedSizeBytes),
    },
  ];

  return (
    <div className="preview-meta">
      {/* Backup info header */}
      <div className="preview-meta__header">
        <Info className="w-4 h-4 shrink-0" style={{ color: "var(--accent-400)" }} />
        <div>
          <p className="preview-meta__app">
            {envelope.app} · v{envelope.appVersion}
          </p>
          <p className="preview-meta__date">
            Backed up on {formatISODate(envelope.createdAt)}
          </p>
        </div>
      </div>

      {/* Summary grid */}
      <div className="preview-meta__grid">
        {/* Record counts */}
        <div className="preview-meta__counts">
          {(
            [
              ["attendance", "Attendance Records"],
              ["clients", "Clients"],
              ["employees", "Employees"],
              ["borrowings", "Fines & Borrowings"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="preview-meta__count-item">
              <span className="preview-meta__count-num">
                {envelope.summary[key]}
              </span>
              <span className="preview-meta__count-label">{label}</span>
            </div>
          ))}
        </div>

        {/* Analytics list */}
        <div className="preview-meta__analytics">
          {items.map((item) => (
            <div key={item.label} className="preview-meta__analytic-row">
              <span className="preview-meta__analytic-icon">{item.icon}</span>
              <span className="preview-meta__analytic-label">{item.label}</span>
              <span className="preview-meta__analytic-value">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── BackupPreview ────────────────────────────────────────────────────────────

interface BackupPreviewProps {
  previewData: ImportPreviewData;
  onRestored: (sections: SectionKey[], payload: BackupPayload, approval: RestoreApproval) => void;
  onCancel: () => void;
}

export function BackupPreview({
  previewData,
  onRestored,
  onCancel,
}: BackupPreviewProps) {
  const [approval, setApproval] = useState<RestoreApproval>(() =>
    Object.fromEntries(ALL_SECTION_KEYS.map((k) => [k, true])) as RestoreApproval,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSection = (key: SectionKey) => {
    setApproval((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const approveAll = () => {
    setApproval(
      Object.fromEntries(ALL_SECTION_KEYS.map((k) => [k, true])) as RestoreApproval,
    );
  };

  const approvedCount = ALL_SECTION_KEYS.filter((k) => approval[k]).length;
  const approvedLabels = ALL_SECTION_KEYS.filter((k) => approval[k]).map(
    (k) => SECTION_LABEL[k],
  );

  const handleRestore = async () => {
    if (approvedCount === 0) return;
    setLoading(true);
    setError(null);
    try {
      const written = writeSections(approval, previewData.payload);
      onRestored(written, previewData.payload, approval);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed.");
      setLoading(false);
    }
  };

  return (
    <div className="backup-preview">
      {/* Title */}
      <div className="backup-preview__heading">
        <CheckCircle2
          className="w-5 h-5"
          style={{ color: "var(--accent-500)" }}
        />
        <h3 className="backup-preview__title">Backup Decrypted — Review & Restore</h3>
      </div>
      <p className="backup-preview__subtitle">
        Review the imported data below. Select which sections to restore, then
        click <strong>Restore Selected</strong>. Existing data is only overridden
        for approved sections.
      </p>

      {/* Analytics / metadata summary */}
      <AnalyticsSummary data={previewData} />

      {/* Section cards */}
      <div className="backup-preview__sections">
        <div className="backup-preview__sections-header">
          <span className="backup-preview__sections-title">Data Sections</span>
          <button
            type="button"
            className="backup-preview__select-all"
            onClick={approveAll}
          >
            Select All
          </button>
        </div>

        <div className="backup-preview__cards">
          {ALL_SECTION_KEYS.map((key) => (
            <SectionPreviewCard
              key={key}
              sectionKey={key}
              sections={previewData.payload.sections}
              approved={approval[key]}
              onToggle={() => toggleSection(key)}
            />
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="backup-status backup-status--error">
          <X className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary of what will be restored */}
      {approvedCount > 0 && (
        <p className="backup-preview__restore-summary">
          Will restore:{" "}
          <strong>{approvedLabels.join(", ")}</strong>
        </p>
      )}

      {/* Actions */}
      <div className="backup-preview__actions">
        <Button
          id="cancel-restore-btn"
          variant="ghost"
          onClick={onCancel}
          disabled={loading}
          className="backup-btn backup-btn--ghost"
        >
          <X className="w-4 h-4" />
          Cancel
        </Button>

        <Button
          id="restore-selected-btn"
          onClick={handleRestore}
          disabled={approvedCount === 0 || loading}
          className="backup-btn backup-btn--primary"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Restoring…
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Restore{" "}
              {approvedCount === ALL_SECTION_KEYS.length
                ? "All Sections"
                : `${approvedCount} Section${approvedCount !== 1 ? "s" : ""}`}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
