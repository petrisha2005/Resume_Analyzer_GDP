import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { parseResumeFile } from "../lib/resumeParser";
import type { ResumeValidationReport } from "../lib/types";

export default function UploadResume() {
  const { resume, setResume } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejection, setRejection] = useState<ResumeValidationReport | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  /** Fully reset the upload UI and the underlying file input so the
   *  user can re-pick the SAME file again after an error. */
  function resetUpload() {
    setError(null);
    setRejection(null);
    setResume(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleFile(file: File) {
    setError(null);
    setRejection(null);
    setLoading(true);
    try {
      const data = await parseResumeFile(file);
      if (!data.valid) {
        setError(data.message || "Invalid resume.");
        setRejection(data.validation || null);
        setResume(null);
        // Re-upload fix: clear the input value so re-selecting works
        if (fileRef.current) fileRef.current.value = "";
      } else {
        setResume(data);
      }
    } catch {
      setError("Something went wrong while reading your file. Please try again.");
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setLoading(false);
    }
  }

  function openPicker() {
    if (fileRef.current) {
      fileRef.current.value = "";
      fileRef.current.click();
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">📄 Upload your resume</h1>
      <p className="text-white/60 mb-6">PDF, DOC or DOCX. We extract skills, tools, projects and roles automatically.</p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault(); setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        className={`card p-10 text-center border-2 border-dashed transition ${
          drag ? "border-indigo-400 bg-indigo-500/10" : "border-white/10"
        }`}
      >
        <div className="text-5xl mb-3">{loading ? "⏳" : "📎"}</div>
        <div className="font-semibold text-lg mb-1">
          {loading ? "Analyzing your resume..." : "Drop your resume here"}
        </div>
        <div className="text-white/50 text-sm mb-4">or click to browse — PDF, DOC, DOCX (max 5MB)</div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <button className="btn-primary" disabled={loading} onClick={openPicker}>
          {loading ? "Processing..." : "Choose file"}
        </button>
      </div>

      {/* Error / Invalid resume display */}
      {error && (
        <div className="mt-4 p-5 rounded-xl border border-red-500/40 bg-red-500/10 text-red-100">
          <div className="flex items-start gap-3">
            <div className="text-2xl">🚫</div>
            <div className="flex-1">
              <div className="font-semibold text-red-200">{error}</div>
              {rejection && <ValidationFeedback report={rejection} />}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="text-sm px-3 py-1.5 rounded-lg border border-red-400/40 hover:bg-red-500/20"
                  onClick={openPicker}
                >
                  📎 Try another file
                </button>
                <button
                  className="text-sm px-3 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 text-white/80"
                  onClick={resetUpload}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success display */}
      {resume?.valid && (
        <div className="card p-6 mt-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-green-400 text-sm font-semibold">✓ Resume validated &amp; parsed successfully</div>
              {resume.name && <div className="text-xl font-bold mt-1">{resume.name}</div>}
              {resume.validation && (
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/70">
                  <span className="px-2 py-1 rounded bg-green-500/15 border border-green-500/30">
                    Score: {resume.validation.confidenceScore}%
                  </span>
                  <span className="px-2 py-1 rounded bg-green-500/15 border border-green-500/30">
                    ✓ {resume.validation.sectionScore} sections
                  </span>
                  {resume.validation.matchedSections.length > 0 && (
                    <span className="px-2 py-1 rounded bg-white/5 border border-white/10">
                      {resume.validation.matchedSections.join(", ")}
                    </span>
                  )}
                  {resume.validation.emailFound && (
                    <span className="px-2 py-1 rounded bg-white/5 border border-white/10">
                      ✉️ Contact detected
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                className="text-sm px-3 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 text-white/80"
                onClick={() => { resetUpload(); }}
              >
                Re-upload
              </button>
              <button className="btn-primary" onClick={() => navigate("/github")}>
                Next: Connect GitHub →
              </button>
            </div>
          </div>

          <div>
            <div className="text-sm text-white/50 mb-2">Skills detected ({resume.skills.length})</div>
            <div className="flex flex-wrap gap-2">
              {resume.skills.map((s) => <span key={s} className="chip">{s}</span>)}
            </div>
          </div>

          {resume.tools.length > 0 && (
            <div>
              <div className="text-sm text-white/50 mb-2">Tools</div>
              <div className="flex flex-wrap gap-2">
                {resume.tools.map((s) => <span key={s} className="chip">{s}</span>)}
              </div>
            </div>
          )}

          {resume.experience.length > 0 && (
            <div>
              <div className="text-sm text-white/50 mb-2">Experience roles</div>
              <ul className="text-sm text-white/80 space-y-1">
                {resume.experience.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            </div>
          )}

          {resume.projects.length > 0 && (
            <div>
              <div className="text-sm text-white/50 mb-2">Project mentions</div>
              <ul className="text-sm text-white/80 space-y-1">
                {resume.projects.map((p, i) => <li key={i}>• {p}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Detailed validation feedback component with confidence score */
function ValidationFeedback({ report }: { report: ResumeValidationReport }) {
  const scoreColor =
    report.confidenceScore >= 70 ? "text-green-400" :
    report.confidenceScore >= 50 ? "text-amber-400" : "text-red-400";

  const barColor =
    report.confidenceScore >= 70 ? "bg-green-500" :
    report.confidenceScore >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="mt-4 space-y-3">
      {/* Confidence Score Bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">Resume Confidence Score</span>
          <span className={`text-lg font-bold ${scoreColor}`}>{report.confidenceScore}%</span>
        </div>
        <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} rounded-full transition-all duration-700`}
            style={{ width: `${report.confidenceScore}%` }}
          />
        </div>
      </div>

      {/* Diagnostic Chips */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-1 rounded bg-white/5 border border-white/10">
          Sections: <b>{report.sectionScore} found</b>
        </span>
        <span className="px-2 py-1 rounded bg-white/5 border border-white/10">
          Email: <b>{report.emailFound ? "✓" : "✗"}</b>
        </span>
        <span className="px-2 py-1 rounded bg-white/5 border border-white/10">
          Phone: <b>{report.phoneFound ? "✓" : "✗"}</b>
        </span>
        <span className="px-2 py-1 rounded bg-white/5 border border-white/10">
          Length: <b>{report.textLength} chars</b>
        </span>
        <span className="px-2 py-1 rounded bg-white/5 border border-white/10">
          Short lines: <b>{report.shortLines}</b>
        </span>
        <span className="px-2 py-1 rounded bg-white/5 border border-white/10">
          Bullets: <b>{report.bulletPoints}</b>
        </span>
      </div>

      {/* Matched Sections */}
      {report.matchedSections.length > 0 && (
        <div>
          <div className="text-sm text-white/60 mb-1">Sections detected:</div>
          <div className="flex flex-wrap gap-1.5">
            {report.matchedSections.map((s) => (
              <span key={s} className="px-2 py-0.5 rounded bg-green-500/15 border border-green-500/30 text-green-300 text-xs">
                ✓ {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Missing Sections */}
      {report.missingSections.length > 0 && (
        <div>
          <div className="text-sm text-white/60 mb-1">Missing sections:</div>
          <div className="flex flex-wrap gap-1.5">
            {report.missingSections.map((s) => (
              <span key={s} className="px-2 py-0.5 rounded bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Reasons */}
      {report.reasons.length > 0 && (
        <ul className="list-disc list-inside space-y-1 text-sm text-red-100/80">
          {report.reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      )}

      {/* Suggestion */}
      <div className="text-xs text-white/50 pt-2 border-t border-white/10">
        💡 A valid resume should include at least 2 sections (like <b>Education</b>, <b>Skills</b>, <b>Projects</b>, <b>Experience</b>), a contact <b>email</b>, and a structured layout with bullet points.
      </div>
    </div>
  );
}
