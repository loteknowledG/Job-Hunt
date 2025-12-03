
export enum JobStatus {
  APPLIED = 'APPLIED',
  INTERVIEWING = 'INTERVIEWING',
  OFFER = 'OFFER',
  REJECTED = 'REJECTED',
  WISHLIST = 'WISHLIST'
}

export enum EventType {
  INTERVIEW = 'INTERVIEW',
  DEADLINE = 'DEADLINE',
  FOLLOW_UP = 'FOLLOW_UP',
  OTHER = 'OTHER'
}

export interface EmailLog {
  id: string;
  sender: string;
  subject: string;
  body: string;
  date: string;
  summary?: string; // AI Generated summary
}

export interface JobEvent {
  id: string;
  type: EventType;
  date: string; // ISO String
  title: string;
  notes?: string;
  completed: boolean;
}

export interface Contact {
  id: string;
  name: string;
  role: string; // Job Title
  email: string;
  phone: string;
  linkedin: string;
  organization: string; // Agency or Company
}

export interface Job {
  id: string;
  company: string;
  role: string;
  location?: string;
  salaryRange?: string;
  status: JobStatus;
  dateApplied: string;
  description: string; // Raw JD
  notes: string;
  emails: EmailLog[];
  events: JobEvent[];
  contacts: Contact[]; // New structured array replacing recruitingContact string
  // Legacy field for migration purposes only
  recruitingContact?: string; 
  aiInsights?: {
    interviewQuestions?: string[];
    keySkills?: string[];
    matchScore?: number;
  };
}

export interface JobParseResult {
  company: string;
  role: string;
  location: string;
  description: string;
  keySkills: string[];
  contacts: Contact[];
}
