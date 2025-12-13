// Report type definitions
export type ServiceType = "VitaAI" | "ExecuWell";

export type TrendType = "up" | "down" | "stable";

// Common types
export interface ReportSummary {
  title: string;
  overall_comment: string;
}

export interface ScoreCard {
  label: string;
  score: number;
  trend?: TrendType;
}

// VitaAI Daily Report
export interface VitaAIDailyReport {
  service: "VitaAI";
  type: "daily";
  date: string;
  summary: ReportSummary;
  score_cards: ScoreCard[];
  radar_chart: {
    labels: string[];
    data: number[];
  };
  daily_trend: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
    }>;
  };
  advice: {
    title: string;
    points: string[];
  };
}

// VitaAI Monthly Report
export interface VitaAIMonthlyReport {
  service: "VitaAI";
  type: "monthly";
  month: string;
  summary: ReportSummary;
  monthly_average_scores: Array<{
    label: string;
    average: number;
  }>;
  trend_graph: {
    labels: string[];
    data: number[];
  };
  next_focus: string[];
}

// ExecuWell Daily Report
export interface ExecuWellDailyReport {
  service: "ExecuWell";
  type: "daily";
  date: string;
  summary: ReportSummary;
  score_cards: ScoreCard[];
  decision_profile: {
    mbti: string;
    disc: string;
    enneagram: number;
  };
  daily_insight: {
    message: string;
  };
  suggested_actions: string[];
}

// ExecuWell Monthly Report
export interface ExecuWellMonthlyReport {
  service: "ExecuWell";
  type: "monthly";
  month: string;
  summary: ReportSummary;
  decision_trend: {
    labels: string[];
    data: number[];
  };
  behavior_analysis: {
    strengths: string[];
    risks: string[];
  };
  next_month_strategy: string[];
}

export type Report = 
  | VitaAIDailyReport 
  | VitaAIMonthlyReport 
  | ExecuWellDailyReport 
  | ExecuWellMonthlyReport;
