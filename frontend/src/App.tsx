import { useState, useEffect } from "react";
import { AppScreen, UserAnswers } from "./types";
import { QUESTIONS } from "./data/questions";
import { API_ENDPOINTS } from "./api/config";

import LandingScreen from "./pages/LandingScreen";
import QuizScreen from "./pages/QuizScreen";
import CaptureScreen from "./pages/CaptureScreen";
import LoadingScreen from "./pages/LoadingScreen";
import ConfirmationScreen from "./pages/ConfirmationScreen";

function App() {
  const [screen, setScreen] = useState<AppScreen>("landing");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<UserAnswers>({});
  const [userName, setUserName] = useState("");
  const [isLongWait, setIsLongWait] = useState(false);

  // Long-wait timeout handler
  useEffect(() => {
    if (screen !== "loading") {
      setIsLongWait(false);
      return;
    }
    const timer = setTimeout(() => setIsLongWait(true), 15000);
    return () => clearTimeout(timer);
  }, [screen]);

  const handleStart = () => setScreen("quiz");

  const handleAnswer = (questionId: string, answer: string, score: number, domain: string) => {
    const newAnswers = {
      ...answers,
      [questionId]: { answer, score, domain },
    };
    setAnswers(newAnswers);

    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      // Move to capture after last question
      setScreen("capture");
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    } else {
      setScreen("landing");
      setCurrentQuestion(0);
    }
  };

  const handleCapture = async (name: string, email: string) => {
    setUserName(name);
    setScreen("loading");

    // Transform answers object into the array format the backend expects:
    // { q1_phone_access: { answer: "A", ... } } → [{ q: 1, answer: "A" }, ...]
    const answersArray = QUESTIONS.map((q) => ({
      q: q.number,
      answer: answers[q.id]?.answer ?? "A",
    }));

    const payload = {
      name,
      email,
      answers: answersArray,
    };

    try {
      const response = await fetch(API_ENDPOINTS.assess, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("API error");
    } catch (err) {
      console.warn("API call failed — showing confirmation anyway", err);
      // Graceful fallback: still show confirmation
    }

    setScreen("confirmation");
  };

  return (
    <>
      {screen === "landing" && <LandingScreen onStart={handleStart} />}

      {screen === "quiz" && (
        <QuizScreen
          currentQuestion={currentQuestion}
          answers={answers}
          onAnswer={handleAnswer}
          onBack={handleBack}
        />
      )}

      {screen === "capture" && <CaptureScreen onSubmit={handleCapture} />}

      {screen === "loading" && <LoadingScreen isLongWait={isLongWait} />}

      {screen === "confirmation" && <ConfirmationScreen name={userName} />}
    </>
  );
}

export default App;
