# KABISIG State of Project — 20261112-090747

### Frontend (33 files)
  frontend\src\components\charts\ProgramTrendD3.tsx           74 lines
  frontend\src\components\ui\button.tsx                       32 lines
  frontend\src\components\ui\card.tsx                         17 lines
  frontend\src\components\BarangayAdminPages.tsx            3759 lines
  frontend\src\components\ChairpersonOnboarding.tsx          431 lines
  frontend\src\components\GlobalFormBehavior.tsx              18 lines
  frontend\src\components\ImageCropModal.tsx                 159 lines
  frontend\src\components\LandingPage.tsx                    213 lines
  frontend\src\components\LiveCameraScanner.tsx              423 lines
  frontend\src\components\NotificationMenu.tsx               169 lines
  frontend\src\components\OfficialPages.tsx                 6710 lines
  frontend\src\components\PopupDialog.tsx                     53 lines
  frontend\src\components\ProfileAvatar.tsx                   22 lines
  frontend\src\components\ProfileSettings.tsx                181 lines
  frontend\src\components\PublicPages.tsx                   1598 lines
  frontend\src\components\RestrictedUsers.tsx                 87 lines
  frontend\src\components\RestrictedUsersPanel.tsx           112 lines
  frontend\src\components\SupabaseCookieCleanup.tsx           16 lines
  frontend\src\components\SuperAdminPages.tsx               2533 lines
  frontend\src\components\UserMenu.tsx                        56 lines
  frontend\src\components\ViewerPages.tsx                   1256 lines
  frontend\src\components\YouthPages.tsx                    3003 lines
  frontend\src\lib\api.ts                                    895 lines
  frontend\src\lib\auditFormatter.ts                         104 lines
  frontend\src\lib\intelligence.ts                           566 lines
  frontend\src\lib\name.ts                                    60 lines
  frontend\src\lib\pdfReports.ts                             284 lines
  frontend\src\lib\reportGenerator.ts                         71 lines
  frontend\src\lib\role-routing.ts                            49 lines
  frontend\src\lib\utils.ts                                   15 lines
  frontend\src\App.tsx                                      1509 lines
  frontend\src\data.ts                                       520 lines
  frontend\src\types.ts                                      241 lines

### Backend (52 files)
  backend\dist\middleware\auth.d.ts                            7 lines
  backend\dist\routes\admin.routes.d.ts                        3 lines
  backend\dist\routes\analytics.routes.d.ts                    3 lines
  backend\dist\routes\announcement.routes.d.ts                 3 lines
  backend\dist\routes\auth.routes.d.ts                         3 lines
  backend\dist\routes\barangay.routes.d.ts                     3 lines
  backend\dist\routes\budget.routes.d.ts                       3 lines
  backend\dist\routes\compliance.routes.d.ts                   3 lines
  backend\dist\routes\document.routes.d.ts                     3 lines
  backend\dist\routes\feedback.routes.d.ts                    11 lines
  backend\dist\routes\inventory.routes.d.ts                    3 lines
  backend\dist\routes\notifications.routes.d.ts                3 lines
  backend\dist\routes\poll.routes.d.ts                         3 lines
  backend\dist\routes\program.routes.d.ts                      3 lines
  backend\dist\routes\public.routes.d.ts                       3 lines
  backend\dist\routes\social.routes.d.ts                       3 lines
  backend\dist\routes\user.routes.d.ts                         3 lines
  backend\dist\services\avatar.service.d.ts                    2 lines
  backend\dist\services\program-reminder.service.d.ts          3 lines
  backend\dist\services\spam-detection.service.d.ts           21 lines
  backend\dist\services\supabase.service.d.ts                 16 lines
  backend\dist\types\database.types.d.ts                     300 lines
  backend\dist\utils\email.d.ts                                2 lines
  backend\dist\utils\name.d.ts                                56 lines
  backend\dist\utils\response.d.ts                            27 lines
  backend\dist\server.d.ts                                     3 lines
  backend\middleware\auth.ts                                 140 lines
  backend\routes\admin.routes.ts                            1527 lines
  backend\routes\analytics.routes.ts                         338 lines
  backend\routes\announcement.routes.ts                      339 lines
  backend\routes\auth.routes.ts                             1432 lines
  backend\routes\barangay.routes.ts                          566 lines
  backend\routes\budget.routes.ts                            694 lines
  backend\routes\compliance.routes.ts                         82 lines
  backend\routes\document.routes.ts                          497 lines
  backend\routes\feedback.routes.ts                          339 lines
  backend\routes\inventory.routes.ts                          70 lines
  backend\routes\notifications.routes.ts                     106 lines
  backend\routes\poll.routes.ts                              169 lines
  backend\routes\program.routes.ts                           509 lines
  backend\routes\public.routes.ts                            224 lines
  backend\routes\social.routes.ts                            369 lines
  backend\routes\user.routes.ts                             1430 lines
  backend\services\avatar.service.ts                          19 lines
  backend\services\program-reminder.service.ts                71 lines
  backend\services\spam-detection.service.ts                 132 lines
  backend\services\supabase.service.ts                        90 lines
  backend\types\database.types.ts                            316 lines
  backend\utils\email.ts                                      12 lines
  backend\utils\name.ts                                      188 lines
  backend\utils\response.ts                                   72 lines
  backend\server.ts                                          166 lines
- Frontend TSC exit: **0**
- Backend  TSC exit: **0**

### Age validation (15–30)

  L148: function calculateAge(birthdateStr: string): number {
  L149: const birthdate = new Date(birthdateStr);
  L151: let age = today.getFullYear() - birthdate.getFullYear();
  L152: const monthDiff = today.getMonth() - birthdate.getMonth();
  L153: if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
  L187: birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Birthdate must be in YYYY-MM-DD format'),
  L266: birthdate,
  L300: // 1. Age Verification (SK Reform Act: 15 to 30 years old)
  L301: const calculatedAge = calculateAge(birthdate);
  L302: if (calculatedAge < 15 || calculatedAge > 30) {
  L307: { calculatedAge, requiredRange: '15-30' }
  L414: birthdate,
  L542: birthdate,
  L1122: birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Birthdate must be formatted as YYYY-MM-DD').optional(),
  L1134: const { email, password, confirmPassword, full_name, first_name, middle_name, last_name, suffix, phone, birthdate, sex, address } = parseResult.data;
  L1248: // Ensure resident_profile exists with valid birthdate so App.tsx routes straight to Chairperson's Dashboard
  L1249: const profileBirthdate = birthdate || '2001-01-01';   const profileSex = sex || 'Female';   const profileAddress = address || 'Barangay Hall, Naga City';
  L1254: birthdate: profileBirthdate,
  L1326: birthdate: '2001-01-01',
  L1474: birthdate: '2001-01-01',
  L69: <path d="M-80 480 C 80 480, 150 350, 80 220 C 30 140, -80 180, -80 180 Z" fill="rgba(251, 191, 36, 0.05)" />

### Demographic classification (rule-based)

  api.ts L462: scholar_status?: string;
  api.ts L463: scholarship_source?: 'Government' | 'Private' | 'Academic' | 'NGO' | 'Other';
  api.ts L464: scholarship_source_detail?: string;
  api.ts L467: is_pwd?: boolean;
  intelligence.ts L19: // 1. Student Classification
  intelligence.ts L21: profile.employmentStatus === 'Student' ||
  intelligence.ts L25: categories.push('Student');
  intelligence.ts L28: // 2. Out-of-School Youth Classification (OSY)
  intelligence.ts L36: // 3. Scholar Classification
  intelligence.ts L38: profile.scholarStatus === 'Scholar' ||
  auth.routes.ts L194: employment_status: z.enum(['Employed', 'Unemployed', 'Self-Employed', 'Student']).optional(),
  auth.routes.ts L202: scholar_status: z.string().optional(),
  auth.routes.ts L203: scholarship_source: z.enum(['Government', 'Private', 'Academic', 'NGO', 'Other']).optional(),
  auth.routes.ts L204: scholarship_source_detail: z.string().max(250).optional(),
  auth.routes.ts L205: is_pwd: z.boolean().default(false),
  auth.routes.ts L209: id_type: z.enum(["Philippine Passport", "Driver's License", "PRC ID", "UMID", "PhilHealth ID", "SSS ID", "Pag-IBIG ID", "Voter's ID (COMELEC)", "Postal ID", "NBI Clearance", "Police Clearance", "PhilSys National ID", "Student ID", "Barangay Certificate", "Other"]).optional(),
  auth.routes.ts L218: if (data.scholar_status === 'Scholar'
  auth.routes.ts L219: && data.scholarship_source === 'Other'
  auth.routes.ts L220: && !data.scholarship_source_detail?.trim()) {
  auth.routes.ts L223: path: ['scholarship_source_detail'],

### Digital Youth ID + QR

  L230: .select('*, roles(role_name), barangay(name, city, district), resident_profile!resident_profile_user_id_fkey(birthdate, sex, address, digital_youth_id, qr_code_url)')
  L438: if (body.digital_youth_id || body.id) {
  L439: residentPayload.digital_youth_id = body.digital_youth_id || body.id;
  L441: if (body.qrCode || body.qr_code_url) {
  L442: residentPayload.qr_code_url = body.qrCode || body.qr_code_url;
  L464: Object.entries(prevMeta).filter(([key]) => !['profilePic', 'qrCode', 'picture'].includes(key)),
  L470: id: body.id || prevMeta.id || residentPayload.digital_youth_id || `SK-2026-${userId.slice(0, 4)}`,
  L588: id: meta.id || resident.digital_youth_id || `SK-2026-${userId.slice(0, 4)}`,
  L614: qrCode: resident.qr_code_url || meta.qrCode || resident.digital_youth_id || '',
  L691: id: meta.id || resident.digital_youth_id || `SK-2026-${u.id.slice(0, 4)}`,
  L717: qrCode: resident.qr_code_url || meta.qrCode || resident.digital_youth_id || '',
  L561: digital_youth_id: null,
  L562: qr_code_url: null,
  L727: digital_youth_id: digitalYouthId,
  L767: digital_youth_id: digitalYouthId,
  L768: qr_code_url: qrCodeDataUrl,
  L798: digital_youth_id: digitalYouthId,
  L812: digital_youth_id: digitalYouthId,
  L813: qr_code_url: qrCodeDataUrl,

### Verification workflow

  L332: && (user.status === 'active' || existingProfile?.verification_status === 'verified');
  L610: verificationStatus: (resident as any).verification_status || 'pending',
  L713: verificationStatus: (resident as any).verification_status || 'pending',
  L856: * and sets resident_profile.verification_status = 'submitted'.
  L934: verification_status: 'submitted',
  L961: { id_type, id_number, verification_status: 'submitted' },
  L980: .select('id_type, id_number, verification_status, verification_notes, verification_reviewed_at')
  L998: data ? { ...data, is_demoted_chair: isDemotedChair } : { id_type: null, id_number: null, verification_status: 'not_submitted', verification_notes: null, verification_reviewed_at: null, is_demoted_chair: isDemotedChair },
  L1024: .select('user_id, tenant_id, id_type, id_number, id_document_path, id_back_document_path, verification_status, verification_notes, verification_reviewed_at')
  L1089: verification_status: profile.verification_status,
  L1125: sendError(res, 'You can only verify youth in your barangay.', 403);
  L1132: verification_status: status,
  L1181: sendSuccess(res, { verification_status: status }, 'ID verification status updated.');
  L1386: await supabaseAdmin.from('resident_profile').update({ verification_status: 'verified' }).eq('user_id', targetId);
  L1393: .update({ verification_status: 'verified', verification_reviewed_at: new Date().toISOString() })
  L1574: verificationStatus: prof.verification_status || 'not_submitted',

### Engagement scoring

  BarangayAdminPages.tsx L84: calculateEngagementScore,
  OfficialPages.tsx L97: calculateEngagementScore, detectLowEngagement, detectScheduleConflicts, getComplianceIssues } from '../lib/intelligence';
  YouthPages.tsx L62: calculateEngagementScore,
  YouthPages.tsx L366: const myEngagement = calculateEngagementScore(youth, localRegs, feedback, resolutions);
  YouthPages.tsx L1267: Engagement Score: <span className="text-[#091d64] font-black">{myEngagement.score}</span>/100
  intelligence.ts L85: * 2. Youth Engagement Score (Rule-Based)
  intelligence.ts L88: export function calculateEngagementScore(
  intelligence.ts L190: const engagement = profile.engagementScore || 0;
  intelligence.ts L225: // Compute proxy score if engagementScore is undefined
  intelligence.ts L226: const score = p.engagementScore !== undefined ? p.engagementScore : (pRegs.length * 20);
  App.tsx L1373: engagementScore: 0
  types.ts L90: engagementScore?: number; // scale 1-100

### Program routes


### QR attendance + duplicate prevention

  L27: const AttendanceScanSchema = z.object({
  L395: sendError(res, `You are already registered for this program (Status: ${existingReg.status}).`, 409);
  L414: message: 'The program "' + program.title + '" is already full (' + program.total_slots + '/' + program.total_slots + ' slots filled). You can register for other programs from your dashboard.',
  L424: `Registration full: All ${program.total_slots} slots for "${program.title}" have already been filled.`,
  L462: router.post('/:id/attendance', authenticateUser, requireActiveUser, requireRoles('BARANGAY_ADMIN', 'SK_OFFICIAL', 'SUPER_ADMIN'), async (req: Request, res: Response): Promise<void> => {
  L507: sendError(res, `Attendance blocked: this program ended on ${program.end_date}.`, 400, { code: 'PROGRAM_ENDED', end_date: program.end_date });
  L515: const { data: existingAttendance } = await supabaseAdmin.from('program_attendance').select('id').eq('program_id', programId).eq('user_id', resolvedUserId).maybeSingle();
  L516: if (existingAttendance) { sendError(res, 'Duplicate check-in: Already marked present.', 400, { attendee_name: attendeeName }); return; }
  L525: const { data: newAttendance, error: attendError } = await supabaseAdmin.from('program_attendance').insert([{
  L529: checked_in_at: checkInTime,
  L533: if (attendError) { sendError(res, `Failed to record attendance: ${attendError.message}`, 500); return; }
  L547: `Attendance confirmed: ${program.title}`,
  L548: `<p>Hello ${escapeHtml(attendeeName)},</p><p>Your attendance has been recorded as <strong>Present</strong> for <strong>${escapeHtml(program.title)}</strong>.</p><p>Checked in at ${escapeHtml(new Date(checkInTime).toLocaleString())}.</p>`
  L553: attendance: newAttendance,
  L556: checked_in_at: checkInTime,
  L557: }, `Attendance verified and recorded for ${attendeeName}.`);
  L564: '/:id/attendance',
  L582: sendError(res, 'Forbidden: You cannot view attendance for another Barangay.', 403);
  L587: .from('program_attendance')
  L588: .select('id, program_id, user_id, tenant_id, checked_in_at, qr_payload, users!user_id(full_name)')
  L590: .order('checked_in_at', { ascending: false });
  L593: sendError(res, `Failed to retrieve program attendance: ${error.message}`, 500);
  L597: sendSuccess(res, data || [], 'Program attendance retrieved successfully.');
  L84: AttendanceRecord,
  L156: onRegisterAttendance: (record: AttendanceRecord, qrPayload: string) => Promise<AttendanceRecord>;
  L191: onRegisterAttendance,
  L229: const [localAttendance, setLocalAttendance] = useState<AttendanceRecord[]>([]);
  L358: const [reportModuleCategory, setReportModuleCategory] = useState<'attendance' | 'residents' | 'accomplishment' | 'compliance' | 'minutes' | 'document_reports' | 'financial'>('attendance');
  L364: const [reportAttendance, setReportAttendance] = useState<any[]>([]);
  L365: const [reportAttendanceLoading, setReportAttendanceLoading] = useState(false);
  L366: const [reportAttendanceError, setReportAttendanceError] = useState<string | null>(null);
  L372: setReportAttendance([]);
  L373: setReportAttendanceError(null);
  L374: setReportAttendanceLoading(false);
  L377: if (reportModuleCategory !== 'attendance') return;
  L381: setReportAttendanceLoading(true);
  L382: setReportAttendanceError(null);
  L385: kabisigApi.getProgramAttendance(reportProgramId),
  L386: ]).then(([registrations, attendance]) => {
  L389: setReportAttendance(attendance || []);
  L393: setReportAttendance([]);
  L394: setReportAttendanceError(error instanceof Error ? error.message : 'Program participants could not be loaded.');
  L396: if (isMounted) setReportAttendanceLoading(false);

### Slot management

  L19: total_slots: z.number().int().min(1, 'Total slots must be at least 1').default(50),
  L123: const availableSlots = Math.max(0, program.total_slots - totalRegistered);
  L131: is_full: totalRegistered >= program.total_slots,
  L242: details: { title: newProgram.title, slots: newProgram.total_slots },
  L363: .select('id, title, tenant_id, total_slots, status, end_date')
  L407: if (totalActiveRegistrations >= program.total_slots) {
  L414: message: 'The program "' + program.title + '" is already full (' + program.total_slots + '/' + program.total_slots + ' slots filled). You can register for other programs from your dashboard.',
  L424: `Registration full: All ${program.total_slots} slots for "${program.title}" have already been filled.`,
  L426: { total_slots: program.total_slots, current_registrations: totalActiveRegistrations }
  L455: total_slots: program.total_slots,

### Rule-based recommendations + conflict detection

  admin.routes.ts L513: { onConflict: 'id' }
  admin.routes.ts L578: { onConflict: 'id' }
  admin.routes.ts L873: }, { onConflict: 'id' });
  admin.routes.ts L916: }, { onConflict: 'id' });
  admin.routes.ts L1288: }, { onConflict: 'id' });
  analytics.routes.ts L128: }, { onConflict: 'tenant_id,report_type,fiscal_year' })
  auth.routes.ts L134: { onConflict: 'id' }
  auth.routes.ts L1241: { onConflict: 'id' }
  auth.routes.ts L1259: { onConflict: 'user_id' }
  auth.routes.ts L1463: { onConflict: 'id' }
  auth.routes.ts L1479: { onConflict: 'user_id' }
  social.routes.ts L184: }, { onConflict: 'tenant_id' })
  user.routes.ts L183: { onConflict: 'user_id' }
  user.routes.ts L447: .upsert(residentPayload, { onConflict: 'user_id' });
  user.routes.ts L815: .upsert(residentPayload, { onConflict: 'user_id' });
  BarangayAdminPages.tsx L85: recommendPrograms,
  BarangayAdminPages.tsx L87: detectScheduleConflicts,
  BarangayAdminPages.tsx L813: notes: `${issue.message} Recommended action: ${issue.action}`,
  LandingPage.tsx L20: { icon: ClipboardList, title: 'Program & Event Management', desc: 'End-to-end lifecycle for SK programs — scheduling, calendar conflict detection, registration, and beneficiary tracking.' },
  OfficialPages.tsx L96: recommendPrograms,

### Budget routes


### VAT/EWT calculations

  avatar.service.d.ts L1: export declare function resolveAvatarUrl(storagePath: string | null | undefined): Promise<string | null>;
  avatar.service.d.ts L2: //# sourceMappingURL=avatar.service.d.ts.map
  database.types.d.ts L9: export type TaxType = 'VAT' | 'NON_VAT' | 'EXEMPT';
  database.types.d.ts L38: avatar_url: string | null;
  database.types.d.ts L118: tax_rate: number;
  admin.routes.ts L1037: // PATCH /api/admin/restrictions/:id/clear - clear restriction and reactivate account
  admin.routes.ts L1093: if (userErr) { sendError(res, 'Restriction cleared but failed to reactivate account: ' + userErr.message, 500); return; }
  admin.routes.ts L1112: 'Restriction cleared and account reactivated.'
  auth.routes.ts L9: import { resolveAvatarUrl } from '../services/avatar.service.js';
  auth.routes.ts L203: scholarship_source: z.enum(['Government', 'Private', 'Academic', 'NGO', 'Other']).optional(),
  auth.routes.ts L760: sendError(res, `Failed to activate user: ${updateUserError.message}`, 500);
  auth.routes.ts L1567: const avatarUrl = await resolveAvatarUrl(profile?.avatar_url);
  auth.routes.ts L1568: sendSuccess(res, { ...(profile || user), avatar_url: avatarUrl ?? null, user_metadata: userMeta }, 'User profile retrieved.');
  budget.routes.ts L41: tax_type: z.enum(['VAT', 'NON_VAT', 'EXEMPT']),
  budget.routes.ts L42: tax_rate: z.number().min(0).max(100).optional(),
  budget.routes.ts L387: tax_rate: userTaxRate,
  budget.routes.ts L424: let effectiveTaxRate = 0;
  budget.routes.ts L429: case 'VAT':
  budget.routes.ts L430: effectiveTaxRate = userTaxRate !== undefined ? userTaxRate : 12.0;
  budget.routes.ts L431: netAmount = round2(gross_amount / (1 + effectiveTaxRate / 100));

### Utilization + remaining

  L31: allocated_amount: z.number().positive('Allocated amount must be greater than zero'),
  L48: allocated_amount: z.number().positive('Allocated amount must be greater than zero'),
  L78: const totalAllocated = budgets?.reduce((acc, b) => acc + Number(b.allocated_amount), 0) || 0;
  L79: const totalRemaining = budgets?.reduce((acc, b) => acc + Number(b.remaining_amount), 0) || 0;
  L80: const totalSpent = totalAllocated - totalRemaining;
  L81: const utilizationRate = totalAllocated > 0 ? round2((totalSpent / totalAllocated) * 100) : 0;
  L87: total_allocated: round2(totalAllocated),
  L88: total_remaining: round2(totalRemaining),
  L90: utilization_rate_pct: utilizationRate,
  L111: const { fiscal_year, category, allocated_amount, description, program_id } = parseResult.data;
  L135: allocated_amount,
  L137: remaining_amount: allocated_amount,
  L154: allocated_amount,
  L156: remaining_amount: allocated_amount,
  L177: details: { category, amount: allocated_amount, fiscal_year },
  L181: sendCreated(res, newBudget, `Budget of ₱${allocated_amount.toLocaleString()} allocated for ${category}.`);
  L225: const allocatedAmount = parseResult.data.allocated_amount;
  L226: if (allocatedAmount < spent) {
  L234: allocated_amount: allocatedAmount,
  L235: remaining_amount: round2(allocatedAmount - spent),

### Document routes + categories


### Document categories (should be 4: Resolutions, Minutes, Financial Reports, Vouchers)


### COA report / PDF generation

  BarangayAdminPages.tsx L238: const generatePDFReport = (title: string = 'COA Financial Performance Report') => {
  LandingPage.tsx L22: { icon: Wallet, title: 'Budget Transparency & COA Reports', desc: 'Automated VAT/Non-VAT computation, budget utilization tracking, and COA-ready financial statements per program.' },
  OfficialPages.tsx L3014: Log disbursement vouchers, compute automated 5% VAT / 1% EWT tax withholdings, track liquidation timelines, and publish COA reports.
  OfficialPages.tsx L3047: <FileText className="w-4 h-4 text-blue-300" /> COA Financial Reports
  PublicPages.tsx L944: <p className="text-xs text-slate-500">View public expenses, itemized budgets, and COA-ready reports.</p>
  ViewerPages.tsx L129: <title>Public COA Ledger Audit Report - ${targetBgy}</title>
  ViewerPages.tsx L154: <p>Official Public COA Financial & Expenditure Audit Report &bull; ${targetBgy} &bull; Date: ${new Date().toLocaleDateString()}</p>
  ViewerPages.tsx L921: Download COA Audit Report
  pdfReports.ts L2: //  KABISIG — Automated PDF Report Generation (jsPDF)
  pdfReports.ts L5: import { jsPDF } from 'jspdf';
  pdfReports.ts L37: function drawHeader(doc: jsPDF, title: string, opts: PDFReportOptions) {
  pdfReports.ts L60: function drawFooter(doc: jsPDF, meta?: any) {
  pdfReports.ts L67: doc.text(`COA-Ready Report - Generated by KABISIG | Page ${i} of ${pages}`, 105, 290, { align: 'center' });
  pdfReports.ts L89: doc: jsPDF,
  pdfReports.ts L150: const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

### Feedback routes


### Anonymity toggle


### Sentiment analysis (keyword-based)

  feedback.routes.d.ts L1: import type { FeedbackSentiment } from '../types/database.types.js';
  feedback.routes.d.ts L3: export declare function analyzeSentiment(text: string): {
  feedback.routes.d.ts L4: sentiment: FeedbackSentiment;
  database.types.d.ts L14: export type FeedbackSentiment = 'positive' | 'neutral' | 'negative';
  database.types.d.ts L187: export interface SentimentAnalysis {
  database.types.d.ts L191: sentiment: FeedbackSentiment;
  database.types.d.ts L193: positive_keywords: string[];
  database.types.d.ts L194: negative_keywords: string[];
  database.types.d.ts L234: sentiment: FeedbackSentiment;
  analytics.routes.ts L233: .select('sentiment, status, category')
  analytics.routes.ts L239: positive: feedbacks?.filter((f) => f.sentiment === 'positive').length || 0,
  analytics.routes.ts L240: neutral: feedbacks?.filter((f) => f.sentiment === 'neutral').length || 0,
  analytics.routes.ts L241: negative: feedbacks?.filter((f) => f.sentiment === 'negative').length || 0,
  analytics.routes.ts L346: .select('sentiment').neq('status', 'flagged');
  analytics.routes.ts L348: const sentimentOverview = {
  analytics.routes.ts L349: positive: allFeedbacks?.filter((f) => f.sentiment === 'positive').length || 0,
  analytics.routes.ts L350: neutral: allFeedbacks?.filter((f) => f.sentiment === 'neutral').length || 0,
  analytics.routes.ts L351: negative: allFeedbacks?.filter((f) => f.sentiment === 'negative').length || 0,
  analytics.routes.ts L387: sentiment_overview: sentimentOverview,
  feedback.routes.ts L7: import type { AuthRequest, FeedbackSentiment } from '../types/database.types.js';

### Poll voting + resolution votes

  L14: 'support', 'clean', 'friendly', 'commend', 'thank', 'thanks', 'safe', 'success',
  L255: .select('*, barangay(name), users(full_name, email, phone, resident_profile!resident_profile_user_id_fkey(birthdate, sex, address, educational_status, employment_status, is_registered_voter, digital_youth_id))');

### Analytics routes


### Public FPD dashboard

  L74: // Navigation: 'home' | 'transparency' | 'announcements'
  L77: const [activeMenu, setActiveMenu] = useState<'home' | 'transparency' | 'announcements'>('home');
  L80: // Sub-tab inside Transparency: 'financial' | 'demographics' | 'fpd' | 'auditing'
  L81: const [transparencySubTab, setTransparencySubTab] = useState<'financial' | 'demographics' | 'fpd' | 'auditing'>('financial');
  L87: // P13: Program budget transparency state
  L92: if (activeMenu !== 'transparency' || transparencySubTab !== 'demographics') return;
  L100: }, [activeMenu, transparencySubTab]);
  L186: <p>Published for Public Transparency per RA 10742 (SK Reform Act of 2015):</p>
  L230: // Calculate city wide transparency aggregate statistics
  L290: // FPD Compliance Documents list from live documents
  L291: const fpdDocuments = documents.length > 0 ? documents.filter(d => d.status?.toLowerCase() === "approved").map(d => ({
  L347: onClick={() => { setActiveMenu('transparency'); setIsMobileMenuOpen(false); }}
  L348: className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 ${activeMenu === 'transparency' ? 'bg-[#091d64] text-white shadow-md' : 'text-slate-200 hover:bg-white/10'}`}
  L351: Transparency Desk
  L407: onClick={() => setActiveMenu('transparency')}
  L409: activeMenu === 'transparency'
  L414: <TrendingUp className={`w-4 h-4 ${activeMenu === 'transparency' ? 'text-[#091d64]' : 'text-slate-400'}`} />
  L415: Transparency
  L454: {activeMenu === 'transparency' && 'SK Transparency & Auditing Portal'}
  L507: onClick={() => setActiveMenu('transparency')}

### Facebook Meta Graph API integration

  social.routes.ts L14: page_access_token: z.string().trim().min(1).max(4096),
  social.routes.ts L67: const url = new URL(`https://graph.facebook.com/${encodeURIComponent(version)}/${encodeURIComponent(pageId)}`);
  social.routes.ts L134: const page = await verifyFacebookPage(parsed.data.page_id, parsed.data.page_access_token);
  social.routes.ts L163: page = await verifyFacebookPage(parsed.data.page_id, parsed.data.page_access_token);
  social.routes.ts L164: encryptedToken = encryptPageToken(parsed.data.page_access_token);
  social.routes.ts L178: page_access_token: encryptedToken,
  social.routes.ts L265: .select('page_id, page_access_token, is_active')
  social.routes.ts L287: pageAccessToken = decryptPageToken(integration.page_access_token);
  social.routes.ts L294: pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  social.routes.ts L330: const graphUrl = `https://graph.facebook.com/${encodeURIComponent(version)}/${encodeURIComponent(pageId)}/${imageUrl ? 'photos' : 'feed'}`;
  social.routes.ts L365: const facebookPostId = graphBody.post_id || graphBody.id;
  social.routes.ts L366: const postUrl = graphBody.post_url || `https://www.facebook.com/${encodeURIComponent(facebookPostId)}`;
  social.routes.ts L381: const dbMessage = persistenceError?.message || 'The Facebook post could not be persisted.';
  social.routes.ts L382: console.error('Facebook post persistence failed', {
  social.routes.ts L387: sendError(res, `Facebook published, but saving the social post failed: ${dbMessage}`, 500);

### Audit logs

  supabase.service.d.ts L7: export declare function recordAuditLog(params: {
  database.types.d.ts L275: export interface AuditLog {
  admin.routes.ts L5: import { supabaseAdmin, recordAuditLog } from '../services/supabase.service.js';
  admin.routes.ts L205: await recordAuditLog({
  admin.routes.ts L245: .from('audit_logs')
  admin.routes.ts L607: await recordAuditLog({
  admin.routes.ts L952: await recordAuditLog({
  admin.routes.ts L1095: await recordAuditLog({
  admin.routes.ts L1329: await recordAuditLog({
  admin.routes.ts L1480: await recordAuditLog({
  admin.routes.ts L1519: await recordAuditLog({ tenantId: null, userId: admin.id, action: 'UPDATE_USER_EMAIL', entityName: 'users', entityId: userId, details: { new_email: cleanEmail }, ipAddress: req.ip || null });
  admin.routes.ts L1649: await recordAuditLog({
  admin.routes.ts L1667: .from('audit_logs')
  auth.routes.ts L8: import { supabase, supabaseAdmin, recordAuditLog, canAccessTenant } from '../services/supabase.service.js';
  auth.routes.ts L41: .from('audit_logs')
  auth.routes.ts L621: await recordAuditLog({
  auth.routes.ts L790: await recordAuditLog({
  auth.routes.ts L872: await recordAuditLog({
  auth.routes.ts L1267: await recordAuditLog({
  auth.routes.ts L1486: await recordAuditLog({

### tenant_id usage

  user.routes.ts tenant_id refs: 37
  program.routes.ts tenant_id refs: 27
  budget.routes.ts tenant_id refs: 29

### RLS migrations


### Fix 1: GYDF duplicates (UPSERT + partial unique index)

  admin.routes.ts L496: const { error: insertUserErr } = await supabaseAdmin.from('users').upsert(
  admin.routes.ts L561: const { error: insertUserErr } = await supabaseAdmin.from('users').upsert(
  admin.routes.ts L858: const { error: insertUserErr } = await supabaseAdmin.from('users').upsert({
  admin.routes.ts L901: const { error: insertUserErr } = await supabaseAdmin.from('users').upsert({
  admin.routes.ts L1273: const { error: insertErr } = await supabaseAdmin.from('users').upsert({
  analytics.routes.ts L120: .upsert({
  announcement.routes.ts L99: upsert: false,
  auth.routes.ts L127: .upsert(
  auth.routes.ts L393: upsert: true
  auth.routes.ts L404: upsert: true

### Fix 2: Expense delete routes


### Fix 3: Program delete includes SK_OFFICIAL


### Fix 4: Document categories standardized


### Fix 5: Chart labels horizontal (no angle={-30})

  Total angle={-30} occurrences: 0

### Fix 6: Dashboard announcements limited to 2


### Fix 7: Compliance alerts route correctly


### Fix 8: Scholarship source field

  auth.routes.ts L203: scholarship_source: z.enum(['Government', 'Private', 'Academic', 'NGO', 'Other']).optional(),
  auth.routes.ts L204: scholarship_source_detail: z.string().max(250).optional(),
  auth.routes.ts L219: && data.scholarship_source === 'Other'
  auth.routes.ts L220: && !data.scholarship_source_detail?.trim()) {
  auth.routes.ts L223: path: ['scholarship_source_detail'],
  auth.routes.ts L291: scholarship_source,
  auth.routes.ts L292: scholarship_source_detail,
  auth.routes.ts L427: scholarship_source: scholarship_source || (scholar_status === 'Scholar' ? 'Other' : null),
  auth.routes.ts L441: if (scholarship_source_detail !== undefined) {
  auth.routes.ts L450: scholarshipSourceDetail: scholarship_source_detail,
  auth.routes.ts L486: scholarshipSourceDetail: scholarship_source_detail || '',
  auth.routes.ts L549: scholarship_source: scholarship_source || (scholar_status === 'Scholar' ? 'Other' : null),
  user.routes.ts L307: const scholarshipSource = body.scholarshipSource ?? body.scholarship_source;
  user.routes.ts L308: const scholarshipSourceDetail = body.scholarshipSourceDetail ?? body.scholarship_source_detail;
  user.routes.ts L310: const validScholarshipSources = ['Government', 'Private', 'Academic', 'NGO', 'Other'];

### Fix 9: Privacy consent PDF

  PDF: 136384 bytes, modified 11/12/2026 08:08:33
  (Note: cannot verify background color from bytes; open visually)
  HTML source: 8160 bytes, modified 11/12/2026 08:08:09

### Fix 10: Native alerts replaced


### Fix 11: Mobile responsive modals


### Fix 12: Image lightbox same-page

  Barangay Admin  inputs:  27  selects:   6  textareas:   4  buttons:  92  modals: 16
  SK Official     inputs:  50  selects:  30  textareas:   4  buttons: 109  modals: 68
  MISSING: frontend\src\components\AdminPages.tsx
  Viewer          inputs:  50  selects:   2  textareas:   4  buttons:  32  modals: 2
  Public          inputs:  28  selects:   9  textareas:   4  buttons:  22  modals: 2

### Frontend API calls (kabisigApi.* / fetch)

  acknowledgeWarning
  addInventoryItem
  allocateBudget
  approveDocument
  approveUser
  assignChairpersonByEmail
  cancelChairpersonInvitation
  clearRestriction
  completeProfile
  connectFacebookIntegration
  createAnnouncement
  createPoll
  createProgram
  deleteAnnouncement
  deleteBudget
  deleteExpense
  deleteProgram
  disconnectFacebookIntegration
  getAnnouncements
  getAuditLogs
  getBarangays
  getBudgets
  getComplianceRecords
  getCurrentUser
  getDocuments
  getEmailHistory
  getExpenses
  getFacebookIntegration
  getFederationAnalytics
  getFederationPresident
  getFeedback
  getInventory
  getMyProgramRegistrations
  getNotifications
  getPolls
  getProgramAttendance
  getProgramRegistrations
  getPrograms
  getPublicAnnouncements
  getPublicDemographics
  getPublicDocuments
  getPublicExpenses
  getPublicProgramBudget
  getPublicPrograms
  getRestrictions
  getRoleCapacity
  getSuspendedUsers
  getToken
  getTransferHistory
  getUserVerification
  getVerificationStatus
  getYouthDirectory
  getYouthProfiles
  inviteSkOfficial
  login
  logout
  lookupUser
  markAllNotificationsRead
  markNotificationRead
  persistBudgetAlert
  persistComplianceIssue
  publishAnnouncementToFacebook
  recordExpense
  recordProgramAttendance
  registerForProgram
  registerOfficial
  registerYouth
  rejectDocument
  rejectUser
  request
  requestPasswordReset
  respondToFeedback
  saveBarangayConfiguration
  sendNotification
  setSkTotalBudget
  setupChairpersonPassword
  submitFeedback
  testFacebookIntegration
  transferChairmanship
  updateAnnouncement
  updateBudget
  updateExpense
  updateProfile
  updateProgram
  updateUserEmail
  updateUserName
  updateUserStatus
  updateVerificationStatus
  uploadAvatar
  uploadDocument
  uploadVerification
  voteOnPoll

### Backend route handlers declared


### Recharts usages

  BarangayAdminPages.tsx L1609: <BarChart3 className="w-4.5 h-4.5 text-amber-400" />
  BarangayAdminPages.tsx L1731: <BarChart3 className={`w-4.5 h-4.5 ${activeMenu === 'reports' ? 'text-[#091d64]' : 'text-slate-400'}`} />
  BarangayAdminPages.tsx L1960: <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
  BarangayAdminPages.tsx L1961: <BarChart data={_filterPrograms.slice(0, 10).map(p => ({ name: p.title.substring(0, 15) + '...', registered: p.registeredCount || 0, capacity: p.maxParticipants || 10 }))} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
  OfficialPages.tsx L2523: <ResponsiveContainer width="100%" height="100%">
  OfficialPages.tsx L2524: <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
  OfficialPages.tsx L2869: <ResponsiveContainer width="100%" height="100%">
  OfficialPages.tsx L2870: <BarChart data={programs.slice(0, 10).map(p => ({
  OfficialPages.tsx L3077: <ResponsiveContainer width="100%" height="100%">
  OfficialPages.tsx L3078: <BarChart data={treasurerProgramsBudget} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
  OfficialPages.tsx L3236: <ResponsiveContainer width="100%" height="100%">
  OfficialPages.tsx L3237: <BarChart data={programs.slice(0, 10).map(p=>({ name: p.title.slice(0, 15)+'...', registered: p.registeredCount }))} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
  OfficialPages.tsx L3785: <BarChart3 className="w-4 h-4 text-[#091d64]" />
  OfficialPages.tsx L4204: <BarChart3 className="w-3.5 h-3.5" /> Program Budget Limits vs Actuals
  OfficialPages.tsx L4298: <ResponsiveContainer width="100%" height="100%">
  OfficialPages.tsx L4299: <BarChart data={treasurerProgramsBudget} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
  SuperAdminPages.tsx L750: <BarChart3 className="w-4.5 h-4.5 text-amber-400" />
  SuperAdminPages.tsx L818: <BarChart3 className={`w-4 h-4 ${activeMenu === 'analytics' ? 'text-white' : 'text-slate-400'}`} />
  SuperAdminPages.tsx L1010: <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
  SuperAdminPages.tsx L1011: <BarChart data={analyticsChartData}>
  SuperAdminPages.tsx L1038: <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
  SuperAdminPages.tsx L1039: <PieChart>
  SuperAdminPages.tsx L1397: <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
  SuperAdminPages.tsx L1398: <BarChart data={analyticsChartData}>
  SuperAdminPages.tsx L1416: <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
  SuperAdminPages.tsx L1417: <BarChart data={analyticsChartData}>
  SuperAdminPages.tsx L2357: <BarChart3 className={`w-5 h-5 ${activeMenu === 'analytics' ? 'text-[#091d64] scale-110' : 'text-slate-400'} transition-transform`} />
  ViewerPages.tsx L741: <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
  ViewerPages.tsx L742: <BarChart data={cityWideBarData}>
  ViewerPages.tsx L755: <PieChartIcon className="w-4 h-4 text-rose-600" />
  ViewerPages.tsx L759: <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
  ViewerPages.tsx L760: <PieChart>
  ViewerPages.tsx L797: <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
  ViewerPages.tsx L798: <PieChart>
  ViewerPages.tsx L817: <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
  ViewerPages.tsx L818: <BarChart data={educationDemographicData}>

### Hardcoded chart data detector


### splitFullName / composeFullName

  L4: * Panel rec: First + Middle + Last + Suffix stored separately,
  L5: * displayed as "First Middle Last Suffix".
  L12: suffix?: string | null | undefined;
  L15: const SUFFIX_VALUES = new Set(['jr.', 'sr.', 'ii', 'iii', 'iv', 'v', 'jr', 'sr']);
  L17: /** Compose display name: "First Middle Last Suffix" (omits empties). */
  L18: export function composeFullName(parts: NameParts): string {
  L23: (parts.suffix || '').trim(),
  L33: /** Normalize suffix (capitalize known values, otherwise return as-is). */
  L34: const ROMAN_SUFFIXES = new Set(['ii', 'iii', 'iv', 'v', 'i']);
  L36: export function normalizeSuffix(input?: string | null): string | null {
  L43: if (ROMAN_SUFFIXES.has(lower)) {
  L53: // Unknown suffix: return as-is
  L65: suffix: string;
  L68: export function splitFullName(fullName: string): SplitNameParts {
  L71: return { first_name: '', middle_name: '', last_name: '', suffix: '' };
  L76: // Detect trailing suffix (last token)
  L77: let suffix = '';
  L79: if (lastToken && SUFFIX_VALUES.has(lastToken.toLowerCase())) {
  L80: suffix = normalizeSuffix(lastToken) || lastToken;
  L85: return { first_name: '', middle_name: '', last_name: '', suffix };
  L89: return { first_name: only, middle_name: '', last_name: '', suffix };
  L92: return { first_name: tokens[0] || '', middle_name: '', last_name: tokens[1] || '', suffix };
  L99: return { first_name, middle_name, last_name, suffix };
  L114: suffix: string | null;
  L122: suffix?: string | null | undefined;
  L130: fallback?: { first_name: string; last_name: string; suffix?: string | null };
  L142: suffix: normalizeSuffix(payload.suffix) || '',
  L148: suffix: p.suffix || null,
  L149: full_name: composeFullName(p),
  L155: const s = splitFullName(payload.full_name);
  L10: suffix?: string | null;
  L13: const SUFFIX_VALUES = new Set(['jr.', 'sr.', 'ii', 'iii', 'iv', 'v', 'jr', 'sr']);
  L14: const ROMAN_SUFFIXES = new Set(['ii', 'iii', 'iv', 'v', 'i']);
  L16: export function composeFullName(parts: NameParts): string {
  L17: return [parts.first_name, parts.middle_name, parts.last_name, parts.suffix]
  L23: export function normalizeSuffix(input?: string | null): string | null {
  L27: if (ROMAN_SUFFIXES.has(lower)) return lower.toUpperCase();
  L39: suffix: string;
  L42: export function splitFullName(fullName: string): SplitNameParts {
  L44: if (!raw) return { first_name: '', middle_name: '', last_name: '', suffix: '' };
  L46: let suffix = '';
  L48: if (lastToken && SUFFIX_VALUES.has(lastToken.toLowerCase())) {
  L49: suffix = normalizeSuffix(lastToken) || lastToken;
  L52: if (tokens.length === 0) return { first_name: '', middle_name: '', last_name: '', suffix };
  L55: return { first_name: only, middle_name: '', last_name: '', suffix };
  L58: return { first_name: tokens[0] || '', middle_name: '', last_name: tokens[1] || '', suffix };
  L64: suffix,

### Last 20 commits

  f273582 fix: forgot-password enhanced logging + fallback
  6a3077c feat: complete password reset flow with Brevo security alert email
  7c47dba feat: forgot-password now uses brevo with custom branded email
  84044e3 feat: dynamic email change log listing all modified fields
  316cd49 feat: email alerts, form reset, chairperson FY badge
  d3b3beb fix: update-name route handles email or UUID to prevent 500 error
  b2fd807 fix: prevent duplicate emails in SA credential manager
  2db64df feat: SA search UI optimized (Email only + Enter key)
  f68d9e0 fix: lookup route query param, robust formatter, backend build
  0f4ef8a fix: surgical backend lookup + target_barangay + JSON parse formatter + back button
  650a433 fix: complete fiscal year cascade + harden feedback/poll RLS tenant isolation
  87ed309 fix: intelligence engine now matches registrations via userId/user_id/participantId
  e9537ce fix: bulletproof fiscal year filter with fail-closed logic and debug logging
  5341f50 fix: program allocation table respects fiscal year for both programs and expenses
  6117c5d fix: complete fiscal year isolation for all sector cards and budget arrays
  e789e80 fix: complete fiscal year isolation for expenses, allocations, and tables
  b558f4a fix: strict fiscal year filtering for expenses and program allocations
  5f7adab fix: resolve program UUID from title to eliminate 400 error on budget allocation
  831e1ea fix: treasurer allocation modal with dropdowns, status filtering, and amount sanitization
  7ff840b feat: fully dynamic fiscal year dropdowns driven by database records

### Files changed in last 5 commits

  f273582 fix: forgot-password enhanced logging + fallback
  backend/routes/auth.routes.ts
  6a3077c feat: complete password reset flow with Brevo security alert email
  backend/routes/auth.routes.ts
  frontend/app/reset-password/page.tsx
  frontend/src/components/SuperAdminPages.tsx
  frontend/src/lib/api.ts
  7c47dba feat: forgot-password now uses brevo with custom branded email
  backend/routes/admin.routes.ts
  backend/routes/auth.routes.ts
  84044e3 feat: dynamic email change log listing all modified fields
  backend/routes/admin.routes.ts
  frontend/src/components/SuperAdminPages.tsx
  316cd49 feat: email alerts, form reset, chairperson FY badge
  backend/routes/admin.routes.ts
  frontend/src/components/BarangayAdminPages.tsx
  frontend/src/components/SuperAdminPages.tsx

### Uncommitted changes

   M backend/routes/analytics.routes.ts
   M backend/routes/auth.routes.ts
   M backend/routes/budget.routes.ts
   M backend/routes/compliance.routes.ts
   M backend/routes/poll.routes.ts
   M backend/routes/program.routes.ts
   M backend/routes/public.routes.ts
   M backend/routes/user.routes.ts
   M backend/services/avatar.service.ts
   M backend/utils/name.ts
   M frontend/app/chairperson-setup/page.tsx
   D frontend/app/icon.png
   M frontend/app/layout.tsx
   D frontend/app/not-found.tsx
   M frontend/app/official-setup/page.tsx
   M frontend/next.config.ts
   M frontend/package-lock.json
   M frontend/package.json
   M frontend/public/docs/privacy-consent.pdf
   M frontend/src/App.tsx
   M frontend/src/components/BarangayAdminPages.tsx
   M frontend/src/components/ImageCropModal.tsx
   M frontend/src/components/LandingPage.tsx
   M frontend/src/components/LiveCameraScanner.tsx
   M frontend/src/components/NotificationMenu.tsx
   M frontend/src/components/OfficialPages.tsx
   M frontend/src/components/ProfileSettings.tsx
   M frontend/src/components/PublicPages.tsx
   M frontend/src/components/RestrictedUsers.tsx
   M frontend/src/components/RestrictedUsersPanel.tsx
   M frontend/src/components/SuperAdminPages.tsx
   M frontend/src/components/ViewerPages.tsx
   M frontend/src/components/YouthPages.tsx
   M frontend/src/lib/api.ts
   M frontend/src/lib/name.ts
   M frontend/src/lib/pdfReports.ts
   M frontend/src/lib/reportGenerator.ts
   M frontend/src/types.ts
   D package-lock.json
  ?? STATE_OF_PROJECT.md
  ?? diagnostics-20261112-082036.txt
  ?? diagnostics-20261112-083317.txt
  ?? frontend/app/not-found.tsx.disabled
  ?? frontend/public/docs/privacy-consent.html
  ?? frontend/public/icon.png
  ?? frontend/src/components/PopupDialog.tsx
  ?? node_modules.disabled/
  ?? package-lock.json.disabled
  OfficialPages.tsx.20261112-075103.bak                       458864 bytes  11/12/2026 8:00:55 AM
  name.ts.20261112-075103.bak                                   2212 bytes  11/12/2026 7:55:24 AM
  auth.routes.ts.20261112-075103.bak                           62901 bytes  11/12/2026 7:22:37 AM
  PublicPages.tsx.20261112-075103.bak                          94901 bytes  11/12/2026 7:21:11 AM
  YouthPages.tsx.20261112-075103.bak                          183473 bytes  11/12/2026 7:19:58 AM
  user.routes.ts.20261112-075103.bak                           64934 bytes  11/12/2026 7:19:45 AM
  api.ts.20261112-075103.bak                                   39856 bytes  11/12/2026 7:19:27 AM
  BarangayAdminPages.tsx.20261112-075103.bak                  246246 bytes  11/12/2026 7:09:28 AM
  user.routes.ts.20261112-071905.bak                           64451 bytes  11/12/2026 7:05:53 AM
  App.tsx.20261112-071905.bak                                  74401 bytes  11/12/2026 7:05:52 AM
  App.tsx.20261112-075103.bak                                  74401 bytes  11/12/2026 7:05:52 AM
  types.ts.20261112-071905.bak                                  7753 bytes  11/12/2026 7:05:52 AM
  types.ts.20261112-075103.bak                                  7753 bytes  11/12/2026 7:05:52 AM
  BarangayAdminPages.tsx.20261112-070515.bak                  245114 bytes  11/12/2026 6:28:08 AM
  App.tsx.20261112-070515.bak                                  74178 bytes  11/12/2026 6:27:50 AM
  OfficialPages.tsx.20261112-070515.bak                       458310 bytes  11/12/2026 6:27:40 AM
  OfficialPages.tsx.20261112-062550.bak                       456188 bytes  11/12/2026 4:55:08 AM
  BarangayAdminPages.tsx.20261112-062550.bak                  244347 bytes  11/12/2026 4:53:56 AM
  BarangayAdminPages.tsx.20261112-045153.bak                  243813 bytes  11/12/2026 3:49:06 AM
  OfficialPages.tsx.20261112-045153.bak                       452352 bytes  11/12/2026 3:46:03 AM
  api.ts.20261112-071905.bak                                   39773 bytes  11/12/2026 3:43:32 AM
  frontend_src_components_OfficialPages.tsx.20261112-034316.bak     449925 bytes  11/12/2026 2:59:27 AM
  frontend_src_components_BarangayAdminPages.tsx.20261112-034316.bak     236784 bytes  11/12/2026 2:44:52 AM
  frontend_src_components_OfficialPages.tsx.20261112-025922.bak     449947 bytes  11/12/2026 2:44:49 AM
  frontend_src_components_OfficialPages.tsx.20261112-024242.bak     449276 bytes  11/12/2026 2:29:20 AM
  frontend_src_components_OfficialPages.tsx.20261112-024432.bak     449276 bytes  11/12/2026 2:29:20 AM
  frontend_src_components_BarangayAdminPages.tsx.20261112-024432.bak     236766 bytes  11/12/2026 2:27:51 AM
  frontend_src_components_BarangayAdminPages.tsx.20261112-024242.bak     236766 bytes  11/12/2026 2:27:51 AM
  frontend_src_components_OfficialPages.tsx.20261112-022654.bak     448018 bytes  11/12/2026 1:55:52 AM
  frontend_src_components_OfficialPages.tsx.20261112-015534.bak     448055 bytes  11/12/2026 1:53:03 AM
  frontend_src_components_OfficialPages.tsx.20261112-015245.bak     447943 bytes  11/12/2026 1:47:21 AM
  frontend_src_components_BarangayAdminPages.tsx.20261112-022654.bak     236459 bytes  11/12/2026 1:39:06 AM
  frontend_src_lib_api.ts.20261112-022654.bak                  39546 bytes  11/12/2026 1:38:09 AM
  frontend_src_lib_api.ts.20261112-034316.bak                  39546 bytes  11/12/2026 1:38:09 AM
  frontend_src_lib_api.ts.20261112-024242.bak                  39546 bytes  11/12/2026 1:38:09 AM
  App.tsx.20261112-062550.bak                                  74151 bytes  11/12/2026 1:38:05 AM
  frontend_src_App.tsx.20261112-024242.bak                     74151 bytes  11/12/2026 1:38:05 AM
  frontend_src_components_OfficialPages.tsx.20261112-014615.bak     447522 bytes  11/12/2026 1:37:36 AM
  frontend_src_components_BarangayAdminPages.tsx.20261112-013615.bak     232210 bytes  11/12/2026 12:40:37 AM
  frontend_src_components_OfficialPages.tsx.20261112-013615.bak     447325 bytes  11/12/2026 12:40:03 AM
  ABSENT : backend\.env
  PRESENT: backend\.env.local
  ABSENT : frontend\.env
  PRESENT: frontend\.env.local

---
End of scan: 20261112-090747
