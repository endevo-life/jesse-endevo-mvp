import React, { useState, useEffect } from "react";
import { QUESTIONS } from "../data/questions";
import { UserAnswers } from "../types";
import "./QuizScreen.css";

interface QuizScreenProps {
  currentQuestion: number;
  answers: UserAnswers;
  onAnswer: (questionId: string, answerLabel: string, score: number, domain: string) => void;
  onBack: () => void;
}

const QuizScreen: React.FC<QuizScreenProps> = ({
  currentQuestion,
  answers,
  onAnswer,
  onBack,
}) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const [visible, setVisible] = useState(true);

  const q = QUESTIONS[currentQuestion];
  const progressPct = ((currentQuestion) / QUESTIONS.length) * 100;

  // Reset selection on question change
  useEffect(() => {
    setSelected(answers[q.id]?.answer ?? null);
    setVisible(true);
    setAnimating(false);
  }, [currentQuestion, q.id, answers]);

  const handleSelect = (label: string, score: number) => {
    if (animating) return;
    setSelected(label);

    setTimeout(() => {
      setAnimating(true);
      setVisible(false);
      setTimeout(() => {
        onAnswer(q.id, label, score, q.domain);
      }, 350);
    }, 400);
  };

  return (
    <div className="quiz-screen">
      <div className="noise-overlay" />

      {/* Top bar */}
      <div className="quiz-topbar">
        <div className="quiz-nav-left">
          <button className="back-btn" onClick={onBack} aria-label="Go back">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M13 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="quiz-progress-info">
          Q<strong>{currentQuestion + 1}</strong> of {QUESTIONS.length}
        </div>
        <div className="quiz-brand">
          <img src="/logo_resized.png" alt="ENDevo" className="screen-nav-logo" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Question card */}
      <div className={`quiz-card ${visible ? "slide-in" : "slide-out"}`}>
        <div className="domain-tag">{q.domain}</div>
        <h2 className="quiz-question">{q.text}</h2>

        <div className="answers-list">
          {q.answers.map((ans) => (
            <button
              key={ans.label}
              className={`answer-btn ${selected === ans.label ? "selected" : ""}`}
              onClick={() => handleSelect(ans.label, ans.score)}
              disabled={animating}
            >
              <span className="answer-label">{ans.label}</span>
              <span className="answer-text">{ans.text}</span>
              {selected === ans.label && (
                <span className="answer-check">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="9" r="9" fill="white" fillOpacity="0.2" />
                    <path d="M5 9l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Jesse hint */}
        <div className="jesse-hint">
          <div className="jesse-hint-avatar">J</div>
          <span>Take your time — there are no wrong answers.</span>
        </div>
      </div>
    </div>
  );
};

export default QuizScreen;
