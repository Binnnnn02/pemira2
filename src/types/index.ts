// ==============================================================================
// TYPE DEFINITIONS FOR PEMIRA INTERVIEW ASSESSMENT SYSTEM
// ==============================================================================

export type UserRole = 'admin' | 'interviewer';

export type AssessmentStatus = 'draft' | 'submitted';

export type AssignmentStatus = 'active' | 'inactive' | 'replaced';

export type ScheduleStatus = 'scheduled' | 'in_progress' | 'completed' | 'rescheduled' | 'cancelled';

export type RecommendationType = 'highly_recommended' | 'recommended' | 'considered' | 'not_recommended';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Period {
  id: string;
  name: string;
  academic_year: string;
  description?: string;
  is_active: boolean;
  start_date: string;
  end_date: string;
  created_at?: string;
  updated_at?: string;
}

export interface Candidate {
  id: string;
  period_id: string;
  candidate_number: string;
  full_name: string;
  nisn?: string;
  class_grade: string;
  target_position: string;
  vision?: string;
  mission?: string;
  photo_url?: string;
  status: 'active' | 'withdrawn' | 'disqualified';
  created_at?: string;
  updated_at?: string;
}

export interface RubricCriteria {
  id: string;
  period_id: string;
  name: string;
  description: string;
  weight: number; // e.g. 20.00
  min_score: number; // default 1
  max_score: number; // default 100
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface InterviewerAssignment {
  id: string;
  period_id: string;
  candidate_id: string;
  interviewer_id: string;
  status: AssignmentStatus;
  assigned_at: string;
  created_at?: string;
  // Joins
  candidate?: Candidate;
  interviewer?: UserProfile;
  schedule?: InterviewSchedule;
  assessment?: Assessment;
}

export interface InterviewSchedule {
  id: string;
  assignment_id: string;
  scheduled_at: string; // ISO string
  duration_minutes: number;
  location: string;
  notes?: string;
  status: ScheduleStatus;
  created_at?: string;
  updated_at?: string;
}

export interface AssessmentScore {
  id: string;
  assessment_id: string;
  criteria_id: string;
  score: number; // 1 - 100
  notes?: string;
  created_at?: string;
  updated_at?: string;
  criteria?: RubricCriteria;
}

export interface Assessment {
  id: string;
  assignment_id: string;
  candidate_id: string;
  interviewer_id: string;
  period_id: string;
  status: AssessmentStatus;
  final_score?: number | null;
  strengths?: string;
  weaknesses?: string;
  general_notes?: string;
  recommendation?: RecommendationType | null;
  submitted_at?: string | null;
  locked_at?: string | null;
  unlocked_at?: string | null;
  unlocked_by?: string | null;
  unlock_reason?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joins
  scores?: AssessmentScore[];
  candidate?: Candidate;
  interviewer?: UserProfile;
}

export interface AuditLog {
  id: string;
  actor_id?: string;
  actor_email?: string;
  actor_role?: string;
  action: string;
  target_type: string;
  target_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export interface RankingItem {
  rank: number;
  candidate: Candidate;
  final_score: number;
  interviewer_name: string;
  recommendation?: RecommendationType | null;
  submitted_at: string;
  criteria_scores: {
    criteria_name: string;
    score: number;
    weight: number;
    weighted_value: number;
  }[];
}

