import React, { useState } from "react";
import "./LandingScreen.css";

interface LandingScreenProps {
  onStart: () => void;
}

const LandingScreen: React.FC<LandingScreenProps> = ({ onStart }) => {
  const [muted, setMuted] = useState(true);

  return (
    <div className="landing-screen">
      {/* Noise overlay */}
      <div className="noise-overlay" />

      {/* Top Nav */}
      <nav className="landing-nav">
        <div className="brand-logo">
          <img src="/logo_resized.png" alt="ENDevo" className="brand-logo-image" />
        </div>
      </nav>

      {/* Hero Content */}
      <div className="landing-hero">
        {/* Jesse Image */}
        <div className="jesse-avatar-wrap">
          <div className="jesse-avatar-glow" />
          <img src="/jesse.png" alt="Jesse" className="jesse-image" />
          <div className="jesse-label">Jesse · Your Digital Guide</div>
        </div>

        {/* Headline */}
        <h1 className="landing-headline">
          Find out if your<br />
          <span className="headline-accent">digital life is ready</span>
          <br />— in 90 seconds.
        </h1>

        <p className="landing-sub">
          Jesse will ask you 10 questions and build your personal{" "}
          <strong>7-day Digital Readiness Plan</strong> — sent straight to your inbox.
        </p>

        {/* Stats row */}
        <div className="landing-stats">
          <div className="stat-pill">10 Questions</div>
          <div className="stat-divider" />
          <div className="stat-pill">90 Seconds</div>
          <div className="stat-divider" />
          <div className="stat-pill">Free PDF Report</div>
        </div>

        <div className="jesse-intro">
          <strong>Jesse Intro:</strong> I'll guide you with quick, simple questions and build your personalized plan at the end.
        </div>

        <div className="jesse-video-wrap">
          <video
            className="jesse-video"
            src="/jesse-intro.mp4"
            autoPlay
            loop
            muted={muted}
            playsInline
            controlsList="nodownload"
            onContextMenu={(e) => e.preventDefault()}
          />
          <button
            className="video-sound-btn"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Unmute video" : "Mute video"}
          >
            {muted ? (
              /* Muted icon */
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/>
                <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : (
              /* Sound on icon */
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )}
          </button>
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
