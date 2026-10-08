import { 
  YouthProfile, 
  Program, 
  Registration, 
  FeedbackRecord, 
  ResolutionRecord, 
  BarangayTenant, 
  DocumentRecord, 
  ExpenseRecord 
} from '../types';

/**
 * 1. Demographic Classification (Rule-Based)
 * Categorizes youth profiles based on standard rules.
 */
export function classifyDemographics(profile: YouthProfile): string[] {
  const categories: string[] = [];

  // 1. Student Classification
  if (
    profile.employmentStatus === 'Student' || 
    (profile.educationalLevel && profile.educationalLevel !== 'Not in School' && profile.educationalLevel !== 'None') ||
    (profile.school && profile.school.trim().length > 0)
  ) {
    categories.push('Student');
  }

  // 2. Out-of-School Youth Classification (OSY)
  if (
    profile.employmentStatus === 'Out-of-School Youth' || 
    profile.youthSector === 'Out-of-School Youth'
  ) {
    categories.push('Out-of-School Youth');
  }

  // 3. Scholar Classification
  if (
    profile.scholarStatus === 'Scholar' || 
    profile.scholarStatus === 'Yes' || 
    (profile.scholarshipType && profile.scholarshipType.trim().length > 0)
  ) {
    categories.push('Scholar');
  }

  // 4. PWD (Persons with Disabilities) Classification
  if (
    profile.youthSector === 'PWD' || 
    profile.youthSector === 'Youth with Special Needs'
  ) {
    categories.push('PWD');
  }

  // 5. Solo Parent Classification
  if (
    profile.civilStatus === 'Single Parent' || 
    profile.youthSector === 'Solo Parent'
  ) {
    categories.push('Solo Parent');
  }

  // 6. Employed / Working Youth Classification
  if (
    profile.employmentStatus === 'Employed' || 
    profile.employmentStatus === 'Self-employed' || 
    profile.youthSector === 'Working Youth'
  ) {
    categories.push('Employed');
  }

  // 7. Unemployed Classification
  if (
    profile.employmentStatus === 'Unemployed' && 
    profile.youthSector !== 'In-School Youth' &&
    profile.educationalLevel !== 'Elementary' &&
    profile.educationalLevel !== 'Junior High' &&
    profile.educationalLevel !== 'Senior High'
  ) {
    categories.push('Unemployed');
  }

  return categories;
}

/**
 * 2. Youth Engagement Score (Rule-Based)
 * Computes a score from 1-100 based on participation criteria.
 */
export function calculateEngagementScore(
  profile: YouthProfile, 
  registrations: Registration[], 
  feedbacks: FeedbackRecord[], 
  resolutions: ResolutionRecord[]
): { score: number; classification: 'Highly Active' | 'Active' | 'Moderately Active' | 'Needs Engagement' } {
  let score = 0;

  // Criteria A: Program registrations (+20 per approved/completed registration, max 40)
  const profileRegs = registrations.filter(r => r.participantId === profile.id);
  const approvedRegs = profileRegs.filter(r => r.status === 'Approved' || r.status === 'Completed');
  score += Math.min(approvedRegs.length * 20, 40);

  // Criteria B: Attendance check-ins (+25 per completed attendance, max 30)
  const completedRegs = profileRegs.filter(r => r.status === 'Completed');
  score += Math.min(completedRegs.length * 25, 30);

  // Criteria C: Direct Civic Feedback Submission (+15 per feedback, max 15)
  const profileFeedbacks = feedbacks.filter(f => f.submittedBy === profile.name || (!f.anonymous && f.submittedBy === profile.name));
  score += Math.min(profileFeedbacks.length * 15, 15);

  // Criteria D: Democratic Policy voting (+10 per resolution voted, max 15)
  const votedResolutionsCount = resolutions.filter(r => r.votedUsers && r.votedUsers.includes(profile.id)).length;
  score += Math.min(votedResolutionsCount * 10, 15);

  // Ensure minimum is 10 for registered users
  score = Math.max(10, Math.min(score, 100));

  let classification: 'Highly Active' | 'Active' | 'Moderately Active' | 'Needs Engagement' = 'Needs Engagement';
  if (score >= 90) {
    classification = 'Highly Active';
  } else if (score >= 70) {
    classification = 'Active';
  } else if (score >= 50) {
    classification = 'Moderately Active';
  }

  return { score, classification };
}

/**
 * 3. Program Recommendation (Rule-Based)
 * Recommends relevant programs using if-then criteria logic.
 */
export function recommendPrograms(
  profile: YouthProfile, 
  programs: Program[],
  registrations: Registration[] = []
): { program: Program; reason: string }[] {
  const recommendations: { program: Program; reason: string }[] = [];
  const registeredIds = new Set(registrations.filter(r => r.participantId === profile.id).map(r => r.programId));
  const availablePrograms = programs.filter(p => !registeredIds.has(p.id) && p.status !== 'Completed');

  const categories = classifyDemographics(profile);

  for (const prog of availablePrograms) {
    let score = 0;
    let reason = '';

    // Rule A: Scholarship/Education Category Alignment
    if (prog.category === 'Education & Scholarship') {
      if (categories.includes('Student') || categories.includes('Scholar')) {
        score += 30;
        reason = 'Matches student or scholarship enrollment profile.';
      }
      if (categories.includes('Out-of-School Youth')) {
        score += 20;
        reason = 'Recommended to re-integrate into scholarship avenues.';
      }
    }

    // Rule B: Livelihood & Skills Alignment
    if (prog.category === 'Livelihood & Skills') {
      if (categories.includes('Out-of-School Youth')) {
        score += 40;
        reason = 'Strongly recommended: Targeted skills training for Out-of-School Youth.';
      } else if (categories.includes('Unemployed')) {
        score += 35;
        reason = 'Livelihood seminar recommended for career development.';
      } else if (profile.age >= 22) {
        score += 15;
        reason = 'Appropriate for career and skill upgrading based on age group.';
      }
    }

    // Rule C: Sports & Physical Development Alignment
    if (prog.category === 'Sports Development') {
      if (profile.age <= 24) {
        score += 25;
        reason = 'Active sports engagement aligned with your age group.';
      }
    }

    // Rule D: Health & Special Groups Alignment
    if (prog.category === 'Health & Nutrition') {
      if (categories.includes('PWD') || categories.includes('Solo Parent')) {
        score += 35;
        reason = 'High-priority inclusive wellness and nutritional support check.';
      }
    }

    // Rule E: Low Engagement Boost
    const engagement = profile.engagementScore || 0;
    if (engagement < 50 && prog.category === 'Environmental Protection') {
      score += 15;
      reason = 'Great community protection gateway program for new volunteers.';
    }

    if (score > 0) {
      recommendations.push({ program: prog, reason: reason || 'Recommended community initiative' });
    }
  }

  // Sort by score/relevance (implicitly by priority rules)
  return recommendations.slice(0, 3);
}

/**
 * 4. Low Engagement Detection (Rule-Based)
 * Identifies residents with low participation and proposes outreach programs.
 */
export function detectLowEngagement(
  profiles: YouthProfile[],
  registrations: Registration[]
): Array<{ profile: YouthProfile; score: number; recommendedOutreach: string[] }> {
  return profiles
    .filter(p => p.status === 'Approved')
    .map(p => {
      const pRegs = registrations.filter(r => r.participantId === p.id);
      const attendanceCount = pRegs.filter(r => r.status === 'Completed').length;
      
      // Compute proxy score if engagementScore is undefined
      const score = p.engagementScore !== undefined ? p.engagementScore : (pRegs.length * 20);

      const outreach: string[] = [];
      if (score < 50) {
        if (p.employmentStatus === 'Out-of-School Youth' || p.youthSector === 'Out-of-School Youth') {
          outreach.push('Invite to free SK Skills/Vocational training programs');
          outreach.push('Conduct Purok-level educational counseling visitation');
        } else if (p.youthSector === 'PWD') {
          outreach.push('Coordinate inclusive home-based medical support updates');
        } else {
          outreach.push('Send invitations to general community sports leagues and assemblies');
          outreach.push('Zone leader engagement text outreach check-in');
        }
      }

      return { profile: p, score, recommendedOutreach: outreach };
    })
    .filter(item => item.score < 50)
    .sort((a, b) => a.score - b.score);
}

/**
 * 5. Schedule Conflict Detection (Rule-Based)
 * Identifies schedule overlaps or venue double-bookings before event scheduling.
 */
export function detectScheduleConflicts(
  newProg: { startDate: string; endDate: string; location: string; title: string },
  existingProgs: Program[]
): string[] {
  const conflicts: string[] = [];

  const newStart = new Date(newProg.startDate).getTime();
  const newEnd = new Date(newProg.endDate).getTime();

  if (isNaN(newStart) || isNaN(newEnd)) return conflicts;

  for (const prog of existingProgs) {
    if (prog.status === 'Completed') continue;

    const progStart = new Date(prog.startDate).getTime();
    const progEnd = new Date(prog.endDate).getTime();

    const datesOverlap = (newStart <= progEnd && newEnd >= progStart);

    if (datesOverlap) {
      // Rule A: Venue Double Booking Conflict
      if (prog.location.toLowerCase().trim() === newProg.location.toLowerCase().trim()) {
        conflicts.push(`Venue Double Booking: "${prog.title}" is already scheduled at ${prog.location} from ${prog.startDate} to ${prog.endDate}.`);
      }

      // Rule B: High Frequency Warning (Same Barangay, Same Category overlapping)
      if (prog.category === 'Sports Development' && prog.title !== newProg.title) {
        conflicts.push(`Coordination Advisory: Another Sports Development program ("${prog.title}") runs during this timeframe. Expect volunteer split.`);
      }
    }
  }

  return conflicts;
}

/**
 * 6. Budget Utilization Analytics (Rule-Based)
 */
export interface BudgetAnalytics {
  allocated: number;
  spent: number;
  remaining: number;
  utilizationRate: number;
  consumptionTrend: 'Normal' | 'Accelerated' | 'Under-utilizing';
  expenditureSummary: Record<string, number>;
}

export function getBudgetAnalytics(
  totalBudget: number,
  programs: Program[],
  expenses: ExpenseRecord[]
): BudgetAnalytics {
  const allocated = programs.reduce((sum, p) => sum + p.budgetAllocation, 0);
  const spent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = totalBudget - spent;
  const utilizationRate = totalBudget > 0 ? (spent / totalBudget) * 100 : 0;

  // Consumption trend logic based on utilization rate
  let consumptionTrend: 'Normal' | 'Accelerated' | 'Under-utilizing' = 'Normal';
  if (utilizationRate > 80) {
    consumptionTrend = 'Accelerated';
  } else if (utilizationRate < 30) {
    consumptionTrend = 'Under-utilizing';
  }

  const expenditureSummary: Record<string, number> = {
    'Supplies': 0,
    'Honorarium': 0,
    'Food & Catering': 0,
    'Travel & Transport': 0,
    'Equipment rental': 0,
    'Others': 0
  };

  for (const e of expenses) {
    const cat = e.category || 'Others';
    if (expenditureSummary[cat] !== undefined) {
      expenditureSummary[cat] += e.amount;
    } else {
      expenditureSummary['Others'] += e.amount;
    }
  }

  return {
    allocated,
    spent,
    remaining,
    utilizationRate,
    consumptionTrend,
    expenditureSummary
  };
}

/**
 * 7. Budget Monitoring (Rule-Based)
 * Triggers warnings when spending patterns or thresholds are breached.
 */
export function monitorBudgets(
  tenant: BarangayTenant,
  programs: Program[],
  expenses: ExpenseRecord[]
): Array<{ level: 'Critical' | 'Warning' | 'Info'; message: string; code: string }> {
  const alerts: Array<{ level: 'Critical' | 'Warning' | 'Info'; message: string; code: string }> = [];

  // Rule A: General Fund Utilization Thresholds
  const utilizationRate = (tenant.spentBudget / tenant.totalBudget) * 100;
  if (utilizationRate >= 90) {
    alerts.push({
      level: 'Critical',
      message: `Critical: ${tenant.name} overall budget spent has reached ${utilizationRate.toFixed(1)}% of maximum annual allocation.`,
      code: 'BUDGET_LIMIT_90'
    });
  } else if (utilizationRate >= 80) {
    alerts.push({
      level: 'Warning',
      message: `Warning: ${tenant.name} spent budget is at ${utilizationRate.toFixed(1)}%. Allocate remaining resources carefully.`,
      code: 'BUDGET_LIMIT_80'
    });
  }

  // Rule B: Over-allocation Checks
  const totalAllocated = programs.reduce((sum, p) => sum + p.budgetAllocation, 0);
  if (totalAllocated > tenant.totalBudget) {
    alerts.push({
      level: 'Critical',
      message: `Critical Deficit: Total programmatic allocations (₱${totalAllocated.toLocaleString()}) exceed your general fund allotment (₱${tenant.totalBudget.toLocaleString()}) by ₱${(totalAllocated - tenant.totalBudget).toLocaleString()}.`,
      code: 'ALLOCATION_EXCEEDED'
    });
  }

  // Rule C: Program-specific Overspending detection
  for (const prog of programs) {
    const progExpenses = expenses.filter(e => e.programId === prog.id);
    const actualSpent = progExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    if (actualSpent > prog.budgetAllocation) {
      alerts.push({
        level: 'Critical',
        message: `Deficit Alert: Expense itemizations for "${prog.title}" (₱${actualSpent.toLocaleString()}) exceed approved program budget allocation (₱${prog.budgetAllocation.toLocaleString()}).`,
        code: `PROG_OVERSPENT_${prog.id}`
      });
    } else if (actualSpent >= prog.budgetAllocation * 0.9) {
      alerts.push({
        level: 'Warning',
        message: `Budget Cap reached: Program "${prog.title}" has consumed ${(actualSpent / prog.budgetAllocation * 100).toFixed(0)}% of its ₱${prog.budgetAllocation.toLocaleString()} limit.`,
        code: `PROG_HIGH_SPENT_${prog.id}`
      });
    }

    // Rule D: Outsized single expense warning (>50% of program budget)
    for (const exp of progExpenses) {
      if (exp.amount > prog.budgetAllocation * 0.5) {
        alerts.push({
          level: 'Info',
          message: `Outsized Invoice: Single expense of ₱${exp.amount.toLocaleString()} for "${exp.supplier}" represents over 50% of the entire program budget for "${prog.title}".`,
          code: `OUTSIZED_EXPENSE_${exp.id}`
        });
      }
    }
  }

  return alerts;
}

/**
 * 8. Compliance Monitoring (Rule-Based)
 * Tracks documentation lapses, approval pile-ups, and pending clearances.
 */
export function getComplianceIssues(
  profiles: YouthProfile[],
  programs: Program[],
  documents: DocumentRecord[],
  expenses: ExpenseRecord[]
): Array<{ level: 'Urgent' | 'Warning' | 'Info'; code: string; message: string; action: string }> {
  const issues: Array<{ level: 'Urgent' | 'Warning' | 'Info'; code: string; message: string; action: string }> = [];

  // Check A: Pending youth profile approvals
  const pendingCount = profiles.filter(p => p.status === 'Pending').length;
  if (pendingCount > 0) {
    issues.push({
      level: 'Urgent',
      code: 'PENDING_YOUTH_APPROVALS',
      message: `Registration Backlog: There are ${pendingCount} pending youth registrations awaiting official SK validation.`,
      action: 'Validate registration applications'
    });
  }

  // Check B: Completed programs missing reports (Accomplishment/Liquidation)
  const completedPrograms = programs.filter(p => p.status === 'Completed');
  for (const prog of completedPrograms) {
    const hasAccomplishment = documents.some(
      doc => doc.category === 'Accomplishment' && 
      (doc.title.toLowerCase().includes(prog.title.toLowerCase()) || doc.description.toLowerCase().includes(prog.title.toLowerCase()))
    );
    const hasLiquidation = documents.some(
      doc => doc.category === 'Liquidation' && 
      (doc.title.toLowerCase().includes(prog.title.toLowerCase()) || doc.description.toLowerCase().includes(prog.title.toLowerCase()))
    );

    if (!hasAccomplishment) {
      issues.push({
        level: 'Warning',
        code: `MISSING_ACCOMPLISHMENT_${prog.id}`,
        message: `Missing Document: No accomplishment report uploaded for the completed program "${prog.title}".`,
        action: 'Draft and upload Accomplishment Report'
      });
    }
    if (!hasLiquidation) {
      issues.push({
        level: 'Warning',
        code: `MISSING_LIQUIDATION_${prog.id}`,
        message: `Missing Liquidation: Financial liquidation details for completed initiative "${prog.title}" are outstanding.`,
        action: 'Submit Liquidation Document Package'
      });
    }
  }

  // Check C: Pending expense authorizations
  const pendingExpenses = expenses.filter(e => e.status === 'Pending').length;
  if (pendingExpenses > 0) {
    issues.push({
      level: 'Urgent',
      code: 'PENDING_EXPENSE_APPROVALS',
      message: `Unauthorized Ledgers: ${pendingExpenses} expense ledger logs are pending approval from the Treasurer/Chairperson.`,
      action: 'Review pending financial vouchers'
    });
  }

  // Check D: Require an approved annual budget resolution before clearing the statutory notice.
  const hasApprovedBudgetResolution = documents.some(doc =>
    doc.status.toLowerCase() === 'approved' &&
    /\b(?:annual\s+)?budget\s+resolution\b/i.test(`${doc.title} ${doc.description}`)
  );
  if (!hasApprovedBudgetResolution) {
    issues.push({
      level: 'Urgent',
      code: 'MISSING_BUDGET_DOCUMENT',
      message: `Absolute Statutory Notice: No active Annual budget resolution (.pdf) is archived in your compliance folder.`,
      action: 'Upload official SK Annual Budget Resolution'
    });
  }

  return issues;
}

/**
 * 9. Feedback Analysis (Rule-Based)
 * Analyzes content using keyword parsing for sentiment tagging.
 */
export function analyzeFeedbackSentiment(content: string, category?: string): 'Positive' | 'Negative' | 'Neutral' {
  // Category override: use intent when the youth explicitly picks one.
  // A polite closing word in a Complaint should not flip sentiment.
  if (category) {
    const c = category.toLowerCase();
    if (c === 'complaint' || c === 'concern' || c === 'issue') {
      return 'Negative';
    }
    if (c === 'compliment' || c === 'praise' || c === 'commendation') {
      return 'Positive';
    }
  }
  const normalized = content.toLowerCase();

  const positiveKeywords = [
    'good', 'great', 'excellent', 'informative', 'helpful', 'fun', 'awesome', 
    'perfect', 'love', 'thanks', 'supportive', 'active', 'useful', 'learned a lot',
    'nice', 'happy', 'fantastic', 'amazing', 'convenient', 'clean', 'organized'
  ];

  const negativeKeywords = [
    'small', 'hot', 'late', 'bad', 'slow', 'crowded', 'poor', 'waste', 
    'boring', 'unorganized', 'disappointed', 'delayed', 'limited', 'confusing',
    'hard', 'difficult', 'loud', 'noisy', 'expensive', 'unhelpful', 'short', 'do not like', 'dislike', 'not good', 'not working', 'problem', 'issue', 'concern', 'intimidating', 'unfair', 'hate', 'upset', 'unhappy', 'frustrated'
  ];

  let positiveScore = 0;
  let negativeScore = 0;

  for (const word of positiveKeywords) {
    if (normalized.includes(word)) {
      positiveScore++;
    }
  }

  for (const word of negativeKeywords) {
    if (normalized.includes(word)) {
      negativeScore++;
    }
  }

  if (positiveScore > negativeScore) {
    return 'Positive';
  } else if (negativeScore > positiveScore) {
    return 'Negative';
  }
  
  return 'Neutral';
}

/**
 * 10. Keyword Extraction & Trend Analysis (Rule-Based)
 * Extracts most frequently mentioned keywords and requested programs as specified in PDF Modules 4 & 5.
 */
export function extractFeedbackKeywords(feedbacks: FeedbackRecord[]): Array<{ word: string; count: number }> {
  const stopWords = new Set([
    'the', 'and', 'to', 'a', 'of', 'in', 'for', 'is', 'on', 'that', 'by', 'this',
    'with', 'i', 'you', 'it', 'not', 'or', 'be', 'are', 'from', 'at', 'as', 'your',
    'all', 'have', 'new', 'more', 'an', 'was', 'we', 'will', 'my', 'has', 'very',
    'para', 'sa', 'ang', 'ng', 'mga', 'na', 'at', 'kung', 'ay', 'ito', 'din', 'rin',
    'po', 'naman', 'natin', 'kami', 'sila', 'kayo'
  ]);

  const wordCounts: Record<string, number> = {};

  for (const fb of feedbacks) {
    const text = `${fb.title} ${fb.content}`.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, ' ');
    const tokens = text.split(/\s+/).filter(t => t.length > 3 && !stopWords.has(t));

    for (const token of tokens) {
      wordCounts[token] = (wordCounts[token] || 0) + 1;
    }
  }

  return Object.entries(wordCounts)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export function getMostRequestedProgramTrends(feedbacks: FeedbackRecord[]): Array<{ program: string; requests: number; icon: string }> {
  const categories = [
    { program: 'Scholarship & Educational Aid', keywords: ['scholarship', 'tuition', 'school', 'allowance', 'student', 'books', 'stipend'], icon: 'GraduationCap' },
    { program: 'Sports & Inter-Purok Tournaments', keywords: ['sports', 'basketball', 'volleyball', 'tournament', 'league', 'gym', 'jersey'], icon: 'Trophy' },
    { program: 'Employment & Job Placement', keywords: ['employment', 'job', 'work', 'hiring', 'resume', 'internship', 'career'], icon: 'Briefcase' },
    { program: 'Livelihood & Skills Training', keywords: ['livelihood', 'skills', 'training', 'tesda', 'workshop', 'vocational', 'business'], icon: 'Wrench' },
    { program: 'Mental Health & Wellness Clinics', keywords: ['mental', 'health', 'wellness', 'counseling', 'stress', 'mind', 'clinic'], icon: 'Heart' }
  ];

  return categories.map(cat => {
    let requests = 0;
    for (const fb of feedbacks) {
      const full = `${fb.title} ${fb.content} ${fb.programTitle || ''}`.toLowerCase();
      if (cat.keywords.some(k => full.includes(k))) {
        requests++;
      }
    }
    return { program: cat.program, requests, icon: cat.icon };
  }).sort((a, b) => b.requests - a.requests);
}
