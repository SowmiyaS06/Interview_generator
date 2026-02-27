interface Feedback {
  id: string;
  interviewId: string;
  userId: string;
  totalScore: number;
  categoryScores: Array<{
    name: string;
    score: number;
    comment: string;
  }>;
  strengths: string[];
  areasForImprovement: string[];
  finalAssessment: string;
  createdAt: string;
  transcript?: Array<{ role: string; content: string }>;
  shareId?: string | null;
}

interface Interview {
  id: string;
  role: string;
  level: string;
  questions: string[];
  techstack: string[];
  createdAt: string;
  userId: string;
  type: string;
  finalized: boolean;
  coverImage?: string;
  amount?: number;
  difficulty?: "Easy" | "Medium" | "Hard";
  templateId?: string;
}

interface CreateFeedbackParams {
  interviewId: string;
  transcript: { role: string; content: string }[];
  feedbackId?: string;
}

interface User {
  name: string;
  email: string;
  id: string;
  resumeUrl?: string;
  profileUrl?: string;
}

interface InterviewCardProps {
  interviewId?: string;
  userId?: string;
  role: string;
  type: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  techstack: string[];
  createdAt?: string;
  coverImage?: string;
  showDelete?: boolean;
  feedback?: Feedback | null;
}

interface AgentProps {
  userName: string;
  userId?: string;
  interviewId?: string;
  feedbackId?: string;
  type: "generate" | "interview";
  questions?: string[];
}

interface InterviewTemplate {
  id: string;
  title: string;
  role: string;
  level: string;
  type: string;
  difficulty: "Easy" | "Medium" | "Hard";
  techstack: string[];
  questions: string[];
}

interface RouteParams {
  params: Promise<Record<string, string>>;
  searchParams: Promise<Record<string, string>>;
}

interface GetFeedbackByInterviewIdParams {
  interviewId: string;
  userId: string;
}

interface GetLatestInterviewsParams {
  userId: string;
  limit?: number;
}

interface SignInParams {
  email: string;
  idToken: string;
}

interface SignUpParams {
  uid: string;
  name: string;
  email: string;
}

type FormType = "sign-in" | "sign-up";

interface InterviewFormProps {
  interviewId: string;
  role: string;
  level: string;
  type: string;
  techstack: string[];
  amount: number;
}

interface TechIconProps {
  techStack: string[];
}

// ==================== NEW ADVANCED FEATURES ====================

// 1. RESUME ANALYSIS & JOB MATCHING
interface ResumeData {
  id: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  parsedContent: {
    summary?: string;
    skills: string[];
    experience: Array<{
      company: string;
      title: string;
      duration: string;
      description: string;
    }>;
    education: Array<{
      school: string;
      degree: string;
      field: string;
      year: string;
    }>;
    languages: string[];
  };
  aiAnalysis?: {
    strengths: string[];
    weaknesses: string[];
    recommendedRoles: string[];
    recommendedSkills: string[];
    overallScore: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface JobDescription {
  id: string;
  userId: string;
  title: string;
  company: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  experience_years: number;
  salary_range?: string;
  fileUrl?: string;
  matchScore?: number;
  createdAt: string;
}

// 2. INTERVIEW RETRY/RESUME FUNCTIONALITY
interface InterviewAttempt {
  id: string;
  interviewId: string;
  userId: string;
  attemptNumber: number;
  status: "in-progress" | "completed" | "abandoned";
  startedAt: string;
  completedAt?: string;
  transcript: Array<{ role: string; content: string }>;
  score?: number;
  feedbackId?: string;
}

interface InterviewSession {
  id: string;
  interviewId: string;
  userId: string;
  totalAttempts: number;
  bestAttemptId?: string;
  bestScore?: number;
  currentAttemptId: string;
  status: "active" | "completed" | "paused";
  createdAt: string;
  updatedAt: string;
}

// 3. REAL-TIME PERFORMANCE INSIGHTS
interface PerformanceMetrics {
  id: string;
  feedbackId: string;
  userId: string;
  speakingPace: "slow" | "normal" | "fast";
  fillerWords: {
    count: number;
    percentage: number;
    examples: string[];
  };
  confidenceScore: number;
  clarityScore: number;
  coherenceScore: number;
  pauseAnalysis: {
    totalPauses: number;
    averagePauseDuration: number;
    thoughtfulPauses: number;
    hesitantPauses: number;
  };
  eyeContact?: number;
  bodyLanguageScore?: number;
  createdAt: string;
}

// 4. ADVANCED SEARCH & FILTERS
interface InterviewFilter {
  userId: string;
  keywords?: string[];
  scoreRange?: { min: number; max: number };
  dateRange?: { start: string; end: string };
  roles?: string[];
  difficulties?: string[];
  types?: string[];
  tags?: string[];
  status?: "completed" | "in-progress" | "all";
}

interface InterviewTag {
  id: string;
  userId: string;
  interviewId: string;
  name: string;
  color: string;
  createdAt: string;
}

interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  filters: InterviewFilter;
  createdAt: string;
}

// 5. INTERVIEW NOTES & BOOKMARKS
interface InterviewNote {
  id: string;
  interviewId: string;
  userId: string;
  questionIndex?: number;
  timestamp?: string;
  content: string;
  type: "general" | "strength" | "improvement" | "question";
  createdAt: string;
  updatedAt: string;
}

interface InterviewBookmark {
  id: string;
  interviewId: string;
  userId: string;
  questionIndex: number;
  question: string;
  reason: string;
  priority: "low" | "medium" | "high";
  createdAt: string;
}

// 6. NOTIFICATION SYSTEM
interface Notification {
  id: string;
  userId: string;
  type: "reminder" | "milestone" | "alert" | "announcement" | "achievement";
  title: string;
  message: string;
  actionUrl?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationPreference {
  userId: string;
  emailReminders: boolean;
  performanceAlerts: boolean;
  weeklyReports: boolean;
  announcements: boolean;
  achievementNotifications: boolean;
  updatedAt: string;
}

// 7. GOAL SETTING & PROGRESS TRACKING
interface InterviewGoal {
  id: string;
  userId: string;
  title: string;
  description: string;
  targetScore: number;
  category?: string;
  deadline: string;
  priority: "low" | "medium" | "high";
  progress: number;
  status: "active" | "completed" | "abandoned";
  milestones: Array<{
    name: string;
    target: number;
    achieved: boolean;
    achievedAt?: string;
  }>;
  createdAt: string;
  completedAt?: string;
}

interface LearningPlan {
  id: string;
  userId: string;
  goalId: string;
  topics: string[];
  resources: Array<{
    title: string;
    url: string;
    type: string;
  }>;
  practiceInterviews: string[];
  createdAt: string;
  updatedAt: string;
}

// 8. CUSTOM SCORING RUBRICS
interface ScoringRubric {
  id: string;
  createdBy: string;
  name: string;
  category: string;
  industry?: string;
  criteria: Array<{
    name: string;
    weight: number;
    description: string;
    scoreRange: { min: number; max: number };
  }>;
  totalWeight: number;
  isDefault: boolean;
  createdAt: string;
}

interface RubricApplication {
  id: string;
  feedbackId: string;
  rubricId: string;
  scores: Array<{
    criteriaName: string;
    score: number;
    weight: number;
  }>;
  finalScore: number;
  appliedAt: string;
}

// 9. INTERVIEW RECORDING
interface InterviewRecording {
  id: string;
  interviewId: string;
  userId: string;
  audioUrl: string;
  videoUrl?: string;
  duration: number;
  format: "audio" | "video";
  transcript: Array<{ role: string; content: string; timestamp: number }>;
  fileSize: number;
  isProcessed: boolean;
  createdAt: string;
}

// 10. COMPANY-SPECIFIC INTERVIEW PREP
interface CompanyProfile {
  id: string;
  name: string;
  industry: string;
  size: string;
  website?: string;
  logo?: string;
  interviewStyle: string;
  commonQuestions: string[];
  interviewProcess: Array<{
    stage: number;
    name: string;
    description: string;
    duration: string;
  }>;
  culture: {
    values: string[];
    teamSize: string;
    workEnvironment: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface CompanyInterview {
  id: string;
  userId: string;
  companyId: string;
  interviewId: string;
  position: string;
  stage: string;
  feedback?: string;
  status: "scheduled" | "completed" | "failed";
  createdAt: string;
}

// 11. GAMIFICATION SYSTEM
interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria: {
    type: string;
    threshold: number;
  };
  points: number;
}

interface UserLevel {
  userId: string;
  totalPoints: number;
  level: number;
  currentLevelPoints: number;
  nextLevelPoints: number;
  progress: number;
  updatedAt: string;
}

interface Streak {
  userId: string;
  type: "daily" | "weekly";
  currentCount: number;
  longestCount: number;
  lastActivityDate: string;
  updatedAt: string;
}

// 12. PEER COMPARISON & BENCHMARKING
interface BenchmarkData {
  id: string;
  role: string;
  level: string;
  averageScore: number;
  medianScore: number;
  percentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  categoryAverages: Record<string, number>;
  sampleSize: number;
  updatedAt: string;
}

interface UserBenchmark {
  userId: string;
  role: string;
  level: string;
  userScore: number;
  benchmarkScore: number;
  percentile: number;
  ranking: number;
  comparisonMetrics: Record<string, number>;
}

// 13. MENTOR/EXPERT REVIEW MODE
interface MentorReviewRequest {
  id: string;
  userId: string;
  interviewId: string;
  feedbackId: string;
  status: "pending" | "accepted" | "completed" | "declined";
  mentorId?: string;
  requestedAt: string;
  completedAt?: string;
  feedback?: string;
  rating?: number;
}

interface MentorProfile {
  id: string;
  userId: string;
  expertise: string[];
  bio: string;
  experience_years: number;
  hourlyRate: number;
  availability: Array<{
    day: string;
    startTime: string;
    endTime: string;
  }>;
  totalReviews: number;
  rating: number;
  createdAt: string;
}

// 14. JOB DESCRIPTION PARSER
interface ParsedJobDescription {
  id: string;
  userId: string;
  originalText: string;
  title: string;
  company: string;
  employmentType: string;
  experience_level: string;
  requiredSkills: Array<{
    skill: string;
    level: string;
    importance: "required" | "preferred";
  }>;
  responsibilities: string[];
  qualifications: string[];
  benefits: string[];
  salary?: string;
  generatedQuestionsIds?: string[];
  createdAt: string;
}

// 15. API & WEBHOOKS
interface ApiKey {
  id: string;
  userId: string;
  name: string;
  key: string;
  isActive: boolean;
  lastUsed?: string;
  createdAt: string;
  expiresAt?: string;
}

interface WebhookSubscription {
  id: string;
  userId: string;
  event: string;
  url: string;
  isActive: boolean;
  retryCount: number;
  createdAt: string;
}

interface WebhookEvent {
  id: string;
  event: string;
  userId: string;
  data: Record<string, any>;
  status: "pending" | "sent" | "failed";
  createdAt: string;
}

