/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole =
  | 'Super Admin'
  | 'Barangay Admin'
  | 'SK Chairperson'
  | 'SK Kagawad'
  | 'SK Secretary'
  | 'SK Treasurer'
  | 'Youth Constituent'
  | 'Viewer';

export interface BarangayTenant {
  id: string;
  name: string;
  chairperson: string;
  youthPopulation: number;
  youthPopulationAvailable?: boolean;
  activePrograms: number;
  totalBudget: number;
  spentBudget: number;
  allocatedBudget: number;
  contact: string;
  status: 'Active' | 'Inactive';
  logo?: string;
  dateCreated?: string;
  district?: string;
  skDistrict?: string | null;
  city?: string;
  chairpersonEmail?: string;
  mustChangePassword?: boolean;
}

export interface YouthProfile {
  userId?: string;
  id: string; // Resident ID (Auto-generated, e.g. SK-2026-001)
  name: string; // Full Name (Required)
  sex: 'Male' | 'Female' | 'Other'; // Sex (Required)
  birthdate: string; // Birthdate (Required)
  age: number; // Age (Auto-calculated from birthdate)
  civilStatus?: 'Single' | 'Married' | 'Widowed' | 'Separated' | 'Single Parent'; // Civil Status (Required)
  address: string; // Complete residential address (Required)
  zone: string; // Zone/Purok (Required)
  mobile: string; // Contact Number (Required)
  email: string; // Email Address (Optional)
  educationalLevel: string; // Educational Level (Required: Elementary / Junior High / Senior High / College / Vocational / etc.)
  school: string; // School (Required if applicable)
  course?: string; // Course (Optional)
  year?: string; // Year Level (Optional)
  employmentStatus?: 'Student' | 'Employed' | 'Unemployed' | 'Self-employed' | 'Out-of-School Youth'; // Employment Status (Required)
  scholarStatus: 'Scholar' | 'Non-Scholar' | 'Yes' | 'No'; // Scholar Status (Required)
  scholarshipType?: string; // Scholarship Type (if applicable)
  youthSector?: 'In-School Youth' | 'Out-of-School Youth' | 'Working Youth' | 'Youth with Special Needs' | 'PWD' | 'Solo Parent'; // Youth Sector (Required - DILG MC 2022-033)
  guardianName: string; // Parent/Guardian Information (Required)
  guardianContact: string; // Parent/Guardian Contact (Required)
  profilePic?: string; // Profile Picture (Optional)
  qrCode?: string; // QR Code (Auto-generated)
  
  // Convenience fields for legacy / report references
  education?: string;
  employment?: string;
  isScholar?: boolean;

  // System metadata
  status: 'Pending' | 'Approved' | 'Rejected';
  rejectionReason?: string;
  dateRegistered: string;
  registeredRole?: UserRole;
  barangayId?: string;
  approvedBy?: string;
  approvedAt?: string;
  registeredProgramsCount?: number;
  attendanceRate?: number;
  engagementScore?: number; // scale 1-100
  mustChangePassword?: boolean;
}

export interface Program {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  maxParticipants: number;
  budgetAllocation: number;
  spentBudget: number;
  aipReference: string; // Annual Investment Program reference code
  category: 'Health & Nutrition' | 'Education & Scholarship' | 'Sports Development' | 'Livelihood & Skills' | 'Peace & Security' | 'Environmental Protection';
  status: 'Draft' | 'Published' | 'Upcoming' | 'Ongoing' | 'Completed';
  registeredCount: number;
  barangayId?: string;
}

export interface Registration {
  id: string;
  programId: string;
  programTitle: string;
  participantId: string; // matches YouthProfile.id
  participantName: string;
  dateRegistered: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed';
  qrCode: string;
}

export interface AttendanceRecord {
  id: string;
  programId: string;
  participantId: string;
  participantName: string;
  checkInTime: string;
  status: 'Present' | 'Absent';
}

export interface DocumentRecord {
  id: string;
  title: string;
  category: 'Resolutions' | 'Vouchers' | 'Liquidation' | 'Accomplishment' | 'Budget' | 'Minutes' | 'Reports' | 'Communications' | string;
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Archived' | string;
  uploadedBy: string; // name
  uploadedDate: string;
  fileSize: string;
  description: string;
  fileUrl?: string;
  reviewFeedback?: string;
  resolutionNumber?: string;
  designatedApprover?: string;
  version?: string;
  history?: { date: string; action: string; user: string; notes?: string }[];
  barangayId?: string;
  created_at?: string;
}

export interface ExpenseRecord {
  id: string;
  programId: string;
  budgetId?: string;
  programTitle: string;
  amount: number;
  supplier?: string;
  taxType?: 'VAT' | 'Non-VAT' | 'Exempt' | 'Withholding' | string;
  vatAmount?: number;
  withholdingTax?: number;
  netAmount?: number;
  category: 'Supplies' | 'Honorarium' | 'Food & Catering' | 'Travel & Transport' | 'Equipment rental' | 'Others' | string;
  status: 'Pending' | 'Approved' | string;
  dateLogged?: string;
  receiptUrl?: string;
  voucherNumber?: string;
  payee?: string;
  title?: string;
  aipCode?: string;
  isVat?: boolean;
  barangayId?: string;
  date?: string;
  description?: string;
}

export interface FeedbackRecord {
  id: string;
  userId?: string;
  type: 'Suggestion' | 'Complaint' | 'Evaluation' | 'Inquiry';
  programId?: string;
  programTitle?: string;
  title: string;
  content: string;
  rating: number; // 1 to 5
  anonymous: boolean;
  status: 'Pending' | 'Reviewed' | 'Resolved';
  response?: string;
  residentProfile?: {
    age?: number;
    sex?: string;
    zone?: string;
    address?: string;
    educationalLevel?: string;
    employmentStatus?: string;
    youthSector?: string;
    contact?: string;
    email?: string;
  };
  dateSubmitted: string;
  submittedBy?: string; // name (or anonymous)
}

export interface ResolutionRecord {
  id: string;
  resolutionNumber: string; // e.g. Res-2026-005
  author?: string;
  title: string;
  content: string;
  status: 'Draft' | 'Under Review' | 'Approved' | 'Archived' | 'Voting Open' | 'Closed';
  validityPeriod: string; // e.g., "July 2026 - Dec 2026"
  votesSupport: number;
  votesOppose: number;
  votesAbstain: number;
  votedUsers: string[]; // List of participantIds
  dateCreated: string;
}

export interface SystemAuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  details: string;
}

export interface AnnouncementRecord {
  id: string;
  title: string;
  content: string;
  what?: string;
  where?: string;
  when?: string;
  hashtags?: string;
  imageUrl?: string;
  imagePath?: string;
  author: string;
  barangay: string;
  datePosted: string;
  status?: string;
  category: 'Opportunity' | 'Notice' | 'Emergency' | 'Event';
  attachments?: string[];
  facebookPostUrl?: string;
  facebookPostId?: string;
  facebookPostedAt?: string;
}
