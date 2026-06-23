export type EvidenceItem = {
  id: string;
  title: string;
  text: string;
  url: string;
  author: string;
  createdAt: string;
  points: number;
  comments: number;
  type: string;
  source?: string;
  parentStoryId?: string;
  threadPoints?: number;
  threadComments?: number;
};

export type ProblemCluster = {
  title: string;
  severity: "High" | "Medium" | "Low";
  summary: string;
  source: "Hacker News";
  score: number;
  tractionScore: number;
  sourceUrls: string[];
  evidence: EvidenceItem[];
};

export type ExtractedProblem = {
  id: string;
  statement: string;
  evidenceId: string;
  evidenceUrl: string;
  products?: string[];
  evidenceType: "story" | "comment";
  parentStoryId?: string;
  points: number;
  comments: number;
  tractionScore: number;
};
