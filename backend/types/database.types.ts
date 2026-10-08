import type { Request } from 'express';

export type RoleName =
  | 'SUPER_ADMIN'
  | 'BARANGAY_ADMIN'
  | 'SK_OFFICIAL'
  | 'YOUTH_CONSTITUENT'
  | 'VIEWER';

export type UserStatus = 'pending' | 'active' | 'rejected';
export type SexType = 'Male' | 'Female' | 'Other' | 'Prefer not to say';
export type EducationalStatus =
  | 'Elementary'
  | 'High School'
  | 'Vocational'
  | 'College'
  | 'Post-Graduate'
  | 'Out of School Youth';
export type EmploymentStatus = 'Employed' | 'Unemployed' | 'Self-Employed' | 'Student';
export type ProgramStatus = 'draft' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
export type RegistrationStatus = 'registered' | 'waitlisted' | 'cancelled' | 'attended';
export type TaxType = 'VAT' | 'NON_VAT' | 'EXEMPT';
export type ExpenseStatus = 'pending' | 'approved' | 'rejected';
export type InventoryCondition = 'New' | 'Good' | 'Fair' | 'Damaged' | 'Disposed';
export type DocumentType =
  | 'Resolution'
  | 'Ordinance'
  | 'Financial Report'
  | 'Minutes'
  | 'Project Proposal'
  | 'Other';
export type DocumentStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'archived';
export type FeedbackSentiment = 'positive' | 'neutral' | 'negative';
export type FeedbackStatus = 'submitted' | 'under_review' | 'resolved' | 'dismissed';

export interface Barangay {
  id: string;
  name: string;
  city: string;
  district: 'District 1' | 'District 2';
  sk_district: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Role {
  id: number;
  role_name: RoleName;
  description: string | null;
  created_at?: string;
}

export interface User {
  id: string;
  tenant_id: string | null;
  role_id: number;
  full_name: string;
  email: string;
  phone: string | null;
  status: UserStatus;
  approved_by: string | null;
  created_at?: string;
  updated_at?: string;
  barangay?: Barangay | null;
  roles?: Role | null;
}

export interface ResidentProfile {
  user_id: string;
  tenant_id: string;
  birthdate: string;
  sex: SexType;
  address: string;
  educational_status: EducationalStatus | null;
  employment_status: EmploymentStatus | null;
  is_registered_voter: boolean;
  digital_youth_id: string | null;
  qr_code_url: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Program {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  category: string;
  location: string;
  start_date: string;
  end_date: string;
  total_slots: number;
  budget_allocation?: number;
  aip_reference?: string | null;
  status: ProgramStatus;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProgramRegistration {
  id: string;
  program_id: string;
  user_id: string;
  tenant_id: string;
  status: RegistrationStatus;
  registered_at?: string;
  created_at?: string;
  user?: User;
}

export interface ProgramAttendance {
  id: string;
  program_id: string;
  user_id: string;
  tenant_id: string;
  checked_in_at: string;
  checked_in_by: string | null;
  qr_payload: string | null;
}

export interface Budget {
  id: string;
  tenant_id: string;
  fiscal_year: number;
  category: string;
  allocated_amount: number;
  remaining_amount: number;
  description: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Expense {
  id: string;
  tenant_id: string;
  budget_id: string;
  program_id: string | null;
  title: string;
  description: string | null;
  gross_amount: number;
  tax_type: TaxType;
  tax_rate: number;
  tax_amount: number;
  net_amount: number;
  receipt_url: string | null;
  expense_date: string;
  status: ExpenseStatus;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryItem {
  id: string;
  tenant_id: string;
  item_name: string;
  description: string | null;
  quantity: number;
  unit: string;
  condition: InventoryCondition;
  location: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DocumentRecord {
  id: string;
  tenant_id: string;
  title: string;
  document_type: DocumentType;
  file_url: string;
  status: DocumentStatus;
  submitted_by: string;
  reviewed_by: string | null;
  feedback: string | null;
  created_at?: string;
  updated_at?: string;
  submitter?: User;
  reviewer?: User;
}

export interface DocumentApproval {
  id: string;
  tenant_id: string;
  document_id: string;
  reviewer_id: string | null;
  status: 'approved' | 'rejected';
  feedback: string | null;
  created_at?: string;
}

export interface ResolutionVote {
  id: string;
  tenant_id: string;
  poll_id: string;
  user_id: string;
  vote_choice: 'Support' | 'Oppose' | 'Abstain';
  submitted_at?: string;
}

export interface ComplianceMonitoring {
  id: string;
  tenant_id: string;
  document_id: string | null;
  report_type: string;
  fiscal_year: number;
  status: 'pending' | 'submitted' | 'approved' | 'rejected' | 'overdue';
  due_date: string | null;
  submitted_at: string | null;
  reviewed_by: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SentimentAnalysis {
  id: string;
  tenant_id: string;
  feedback_id: string;
  sentiment: FeedbackSentiment;
  score: number;
  positive_keywords: string[];
  negative_keywords: string[];
  analyzed_at?: string;
}

export interface Committee {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  chairperson_id: string | null;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CommitteeAssignment {
  id: string;
  tenant_id: string;
  committee_id: string;
  user_id: string;
  position: string;
  assigned_at?: string;
}

export interface Notification {
  id: string;
  tenant_id: string;
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at?: string;
}

export interface FeedbackRecord {
  id: string;
  tenant_id: string;
  user_id: string | null;
  is_anonymous: boolean;
  subject: string;
  message: string;
  category: string;
  sentiment: FeedbackSentiment;
  status: FeedbackStatus;
  response: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Poll {
  id: string;
  tenant_id: string;
  question: string;
  description: string | null;
  options: string[];
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_by: string | null;
  created_at?: string;
}

export interface PollResponse {
  id: string;
  poll_id: string;
  user_id: string;
  tenant_id: string;
  selected_option: string;
  submitted_at?: string;
}

export interface SocialMediaPost {
  id: string;
  tenant_id: string;
  platform: string;
  post_url: string;
  content: string | null;
  metrics: {
    reach: number;
    likes: number;
    comments: number;
    shares: number;
  };
  posted_at: string;
  created_at?: string;
}

export interface AuditLog {
  id: string;
  tenant_id: string | null;
  user_id: string | null;
  action: string;
  entity_name: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at?: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  full_name: string;
  role: RoleName;
  role_id: number;
  tenant_id: string | null;
  barangay_name?: string | null;
  status: UserStatus;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser | undefined;
}
