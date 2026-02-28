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

      <nav className="screen-nav">
        <img src="/logo_resized.png" alt="ENDevo" className="screen-nav-logo" />
      </nav>

      <div className="loading-content">
        {/* Jesse thinking animation */}
        <div className="loading-jesse-wrap">
          <div className="loading-rings">
            <div className="loading-ring ring1" />
            <div className="loading-ring ring2" />
            <div className="loading-ring ring3" />
          </div>
          <div className="loading-jesse-avatar">
            <img src="/jesse.png" alt="Jesse" className="loading-jesse-img" />
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
