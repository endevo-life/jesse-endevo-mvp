import React, { useEffect, useState } from "react";
import "./ConfirmationScreen.css";

interface ConfirmationScreenProps {
  name: string;
}

const ConfirmationScreen: React.FC<ConfirmationScreenProps> = ({ name }) => {
  const [checkVisible, setCheckVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setCheckVisible(true), 100);
  }, []);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "Jesse — Digital Readiness Assessment",
        text: "I just took the Jesse Digital Readiness Assessment by ENDevo. Find out if your digital life is ready!",
        url: window.location.origin,
      });
    } else {
      navigator.clipboard.writeText(window.location.origin);
      alert("Link copied to clipboard!");
    }
  };

  return (
    <div className="confirm-screen">
      <div className="noise-overlay" />

      <nav className="screen-nav">
        <img src="/logo_resized.png" alt="ENDevo" className="screen-nav-logo" />
      </nav>

      <div className="confirm-content">
        {/* Animated checkmark */}
        <div className={`checkmark-wrap ${checkVisible ? "check-animate" : ""}`}>
          <div className="checkmark-circle">
            <svg viewBox="0 0 52 52" className="checkmark-svg">
              <circle cx="26" cy="26" r="24" fill="none" stroke="#22c55e" strokeWidth="3" className="check-circle" />
              <path fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M14 26l8 8 16-16" className="check-path" />
            </svg>
          </div>
          <div className="check-sparkles">
            {[...Array(6)].map((_, i) => (
              <span key={i} className={`sparkle sparkle-${i + 1}`} />
            ))}
          </div>
        </div>

        <h1 className="confirm-heading">
          Your plan is on its way,<br />
          <span className="confirm-name">{name}!</span>
        </h1>

        <div className="confirm-card">
          <div className="confirm-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="4" width="20" height="16" rx="3" stroke="#f97316" strokeWidth="2" />
              <path d="M2 8l10 6 10-6" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <p className="confirm-body">
            Check your inbox — Jesse has built your personalised{" "}
            <strong>7-Day Digital Readiness Plan.</strong>
          </p>
          <p className="confirm-spam">
            Don't see it within 2 minutes? Check your spam folder.
          </p>
        </div>

        <div className="confirm-actions">
          <button className="share-btn" onClick={handleShare}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2" />
              <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
              <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2" />
              <path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Share with someone you love
          </button>

          <a
            href="https://endevo.life"
            target="_blank"
            rel="noopener noreferrer"
            className="endevo-link"
          >
            Learn more about ENDevo →
          </a>
        </div>

        {/* Jesse sign-off */}
        <div className="jesse-signoff">
          <div className="signoff-avatar">J</div>
          <div>
            <p className="signoff-quote">
              "Every step you take today protects the people you love tomorrow."
            </p>
            <p className="signoff-name">— Jesse, ENDevo</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationScreen;
