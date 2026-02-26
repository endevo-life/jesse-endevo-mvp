import React, { useState } from "react";
import "./CaptureScreen.css";

interface CaptureScreenProps {
  onSubmit: (name: string, email: string) => void;
}

const CaptureScreen: React.FC<CaptureScreenProps> = ({ onSubmit }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const errs: { name?: string; email?: string } = {};
    if (!name.trim()) errs.name = "Please enter your first name.";
    if (!email.trim()) {
      errs.email = "Please enter your email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = "Please enter a valid email address.";
    }
    return errs;
  };

  const handleSubmit = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    onSubmit(name.trim(), email.trim());
  };

  return (
    <div className="capture-screen">
      <div className="noise-overlay" />

      <div className="capture-card">
        {/* Jesse avatar */}
        <div className="capture-avatar">
          <div className="capture-avatar-ring" />
          <div className="capture-avatar-inner">
            <svg width="48" height="48" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="30" r="22" fill="#2563EB" />
              <circle cx="33" cy="27" r="4" fill="white" />
              <circle cx="47" cy="27" r="4" fill="white" />
              <circle cx="34" cy="28" r="2" fill="#1e3a8a" />
              <circle cx="48" cy="28" r="2" fill="#1e3a8a" />
              <path d="M32 36 Q40 42 48 36" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <rect x="20" y="55" width="40" height="25" rx="12" fill="#1d4ed8" />
              <rect x="5" y="57" width="18" height="10" rx="5" fill="#2563EB" />
              <rect x="57" y="57" width="18" height="10" rx="5" fill="#2563EB" />
              <rect x="37" y="56" width="6" height="14" rx="3" fill="#f97316" />
              <circle cx="40" cy="15" r="5" fill="#f97316" />
              <text x="40" y="18.5" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">J</text>
            </svg>
          </div>
        </div>

        <h2 className="capture-heading">
          Great — your plan is almost ready.
        </h2>
        <p className="capture-sub">
          Where should Jesse send it?
        </p>

        <div className="capture-form">
          <div className="form-group">
            <label className="form-label" htmlFor="firstName">First Name</label>
            <input
              id="firstName"
              type="text"
              className={`form-input ${errors.name ? "input-error" : ""}`}
              placeholder="Your first name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              autoFocus
            />
            {errors.name && <span className="error-msg">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className={`form-input ${errors.email ? "input-error" : ""}`}
              placeholder="your@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            {errors.email && <span className="error-msg">{errors.email}</span>}
          </div>

          <button
            className="send-btn"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <span>Sending…</span>
            ) : (
              <>
                <span>Send My 7-Day Plan</span>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10h12M10 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            )}
          </button>

          <p className="capture-micro">
            We'll send your personalised PDF to this email. No spam, ever.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CaptureScreen;
