export type AppScreen =
  | "landing"
  | "quiz"
  | "capture"
  | "loading"
  | "confirmation";

export interface UserAnswers {
  [questionId: string]: {
    answer: string;
    score: number;
    domain: string;
  };
}

export interface AssessmentPayload {
  name: string;
  email: string;
  answers: UserAnswers;
}
