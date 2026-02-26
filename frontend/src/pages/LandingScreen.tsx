import React from "react";
import "./LandingScreen.css";

interface LandingScreenProps {
  onStart: () => void;
}

const LandingScreen: React.FC<LandingScreenProps> = ({ onStart }) => {
  return (
    <div className="landing-screen">
      {/* Noise overlay */}
      <div className="noise-overlay" />

      {/* Top Nav */}
      <nav className="landing-nav">
        <div className="brand-logo">
          <span className="brand-dot" />
          <span className="brand-name">ENDevo</span>
        </div>
      </nav>

      {/* Hero Content */}
      <div className="landing-hero">
        {/* Jesse Avatar */}
        <div className="jesse-avatar-wrap">
          <div className="jesse-avatar-glow" />
          <div className="jesse-avatar">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Head */}
              <circle cx="40" cy="30" r="22" fill="#2563EB" />
              {/* Face highlight */}
              <ellipse cx="33" cy="25" rx="4" ry="5" fill="rgba(255,255,255,0.15)" />
              {/* Eyes */}
              <circle cx="33" cy="27" r="4" fill="white" />
              <circle cx="47" cy="27" r="4" fill="white" />
              <circle cx="34" cy="28" r="2" fill="#1e3a8a" />
              <circle cx="48" cy="28" r="2" fill="#1e3a8a" />
              {/* Smile */}
              <path d="M32 36 Q40 42 48 36" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              {/* Body */}
              <rect x="20" y="55" width="40" height="25" rx="12" fill="#1d4ed8" />
              {/* Arms */}
              <rect x="5" y="57" width="18" height="10" rx="5" fill="#2563EB" />
              <rect x="57" y="57" width="18" height="10" rx="5" fill="#2563EB" />
              {/* Tie / detail */}
              <rect x="37" y="56" width="6" height="14" rx="3" fill="#f97316" />
              {/* Badge */}
              <circle cx="40" cy="15" r="5" fill="#f97316" />
              <text x="40" y="18.5" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">J</text>
            </svg>
          </div>
          <div className="jesse-label">Jesse · Your Digital Guide</div>
        </div>

        {/* Headline */}
        <h1 className="landing-headline">
          Find out if your<br />
          <span className="headline-accent">digital life is ready</span>
          <br />— in 90 seconds.
        </h1>

        <p className="landing-sub">
          Jesse will ask you 10 questions and build your personal<br className="d-none d-md-inline" />
          <strong> 7-day Digital Readiness Plan</strong> — sent straight to your inbox.
        </p>

        {/* Stats row */}
        <div className="landing-stats">
          <div className="stat-pill">10 Questions</div>
          <div className="stat-divider" />
          <div className="stat-pill">90 Seconds</div>
          <div className="stat-divider" />
          <div className="stat-pill">Free PDF Report</div>
        </div>

        <button className="cta-button" onClick={onStart}>
          <span>Start My Assessment</span>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 10h12M10 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <p className="landing-disclaimer">
          Not legal or financial advice. Free educational program.{" "}
          <strong>We do not store your data.</strong>
        </p>
      </div>

      {/* Decorative bottom wave */}
      <div className="landing-wave">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M0 60 Q360 120 720 60 Q1080 0 1440 60 L1440 120 L0 120 Z" fill="rgba(249,115,22,0.08)" />
        </svg>
      </div>
    </div>
  );
};

export default LandingScreen;
