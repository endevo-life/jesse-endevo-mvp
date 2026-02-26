import React, { useEffect, useState } from "react";
import "./LoadingScreen.css";

const LOADING_LINES = [
  "Jesse is reviewing your answers...",
  "Calculating your Readiness Score...",
  "Building your personalised 7-day plan...",
  "Almost ready — this is going to be good.",
];

interface LoadingScreenProps {
  isLongWait: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ isLongWait }) => {
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLineIndex((prev) => (prev + 1) % LOADING_LINES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="loading-screen">
      <div className="noise-overlay" />

      <div className="loading-content">
        {/* Jesse thinking animation */}
        <div className="loading-jesse-wrap">
          <div className="loading-rings">
            <div className="loading-ring ring1" />
            <div className="loading-ring ring2" />
            <div className="loading-ring ring3" />
          </div>
          <div className="loading-jesse-avatar">
            <svg width="60" height="60" viewBox="0 0 80 80" fill="none">
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
          {/* Thinking dots */}
          <div className="thinking-dots">
            <span />
            <span />
            <span />
          </div>
        </div>

        <h2 className="loading-heading">Jesse is working on your plan</h2>

        {/* Rotating copy */}
        <div className="loading-copy-wrap">
          {LOADING_LINES.map((line, i) => (
            <p
              key={i}
              className={`loading-copy ${i === lineIndex ? "copy-active" : "copy-hidden"}`}
            >
              {line}
            </p>
          ))}
        </div>

        {/* Progress pulse */}
        <div className="loading-pulse-track">
          <div className="loading-pulse-bar" />
        </div>

        {isLongWait && (
          <p className="loading-long-wait">
            Still working on your plan... almost there.
          </p>
        )}
      </div>
    </div>
  );
};

export default LoadingScreen;
