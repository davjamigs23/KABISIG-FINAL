# KABISIG Role Alignment — 20261112-091337


## 1. BACKEND ROUTE INVENTORY (every declared endpoint)

Total routes: 0

| Method | Path | File | Line | Auth | Role |
|---|---|---|---|---|---|

## 2. FRONTEND API CALLS (all kabisigApi.* invocations)

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

## 3. ROLE-BY-ROLE ALIGNMENT


### 1 — Super Admin (Federation)

**Frontend file:** `frontend\src\components\SuperAdminPages.tsx` — 196 top-level declarations

**Frontend inputs/selects/buttons:**
  inputs:   20
  selects:  6
  textareas:2
  buttons:  66
  modals:   10

**Frontend API calls used:**
  assignChairpersonByEmail
  cancelChairpersonInvitation
  clearRestriction
  getCurrentUser
  getEmailHistory
  getFederationAnalytics
  getRestrictions
  getRoleCapacity
  getTransferHistory
  inviteSkOfficial
  lookupUser
  transferChairmanship
  updateUserEmail
  updateUserName

**Backend routes used by this role:**
  admin.routes.ts                routes: 14  auth: 15  roleGate: 12
  analytics.routes.ts            routes:  4  auth:  5  roleGate:  5
  barangay.routes.ts             routes:  5  auth:  6  roleGate:  4
  announcement.routes.ts         routes:  4  auth:  5  roleGate:  8
  public.routes.ts               routes:  7  auth:  0  roleGate:  0

**DB tables referenced:**
  - users
  - barangay
  - audit_logs
  - chairperson_transfers
  - roles
  - account_restrictions
  - facebook_integration
  - social_media_posts
  - analytics


### 2 — Barangay Admin (Chairperson)

**Frontend file:** `frontend\src\components\BarangayAdminPages.tsx` — 297 top-level declarations

**Frontend inputs/selects/buttons:**
  inputs:   27
  selects:  6
  textareas:4
  buttons:  92
  modals:   13

**Frontend API calls used:**
  allocateBudget
  connectFacebookIntegration
  createAnnouncement
  deleteAnnouncement
  disconnectFacebookIntegration
  getAnnouncements
  getBudgets
  getFacebookIntegration
  getFederationPresident
  getInventory
  getProgramRegistrations
  getToken
  getUserVerification
  persistBudgetAlert
  persistComplianceIssue
  publishAnnouncementToFacebook
  setSkTotalBudget
  testFacebookIntegration
  updateAnnouncement
  updateVerificationStatus
  uploadDocument

**Backend routes used by this role:**
  barangay.routes.ts             routes:  5  auth:  6  roleGate:  4
  user.routes.ts                 routes: 17  auth: 18  roleGate: 17
  budget.routes.ts               routes:  8  auth:  9  roleGate: 13
  document.routes.ts             routes:  7  auth:  8  roleGate:  9
  compliance.routes.ts           routes:  1  auth:  2  roleGate:  2
  announcement.routes.ts         routes:  4  auth:  5  roleGate:  8
  social.routes.ts               routes:  5  auth:  6  roleGate:  7
  analytics.routes.ts            routes:  4  auth:  5  roleGate:  5

**DB tables referenced:**
  - users
  - resident_profile
  - barangay
  - budget
  - expense
  - documents
  - document_approvals
  - compliance_monitoring
  - announcement
  - facebook_integration
  - audit_logs
  - program


### 3 — SK Official (Kagawad/Secretary/Treasurer)

**Frontend file:** `frontend\src\components\OfficialPages.tsx` — 446 top-level declarations

**Frontend inputs/selects/buttons:**
  inputs:   50
  selects:  30
  textareas:4
  buttons:  109
  modals:   17

**Frontend API calls used:**
  addInventoryItem
  allocateBudget
  createPoll
  deleteBudget
  deleteExpense
  getBudgets
  getComplianceRecords
  getInventory
  getProgramAttendance
  getProgramRegistrations
  respondToFeedback
  sendNotification
  updateBudget
  updateExpense
  uploadDocument

**Backend routes used by this role:**
  program.routes.ts              routes: 10  auth: 11  roleGate: 14
  document.routes.ts             routes:  7  auth:  8  roleGate:  9
  compliance.routes.ts           routes:  1  auth:  2  roleGate:  2
  budget.routes.ts               routes:  8  auth:  9  roleGate: 13
  inventory.routes.ts            routes:  2  auth:  3  roleGate:  2
  feedback.routes.ts             routes:  3  auth:  4  roleGate:  5
  poll.routes.ts                 routes:  3  auth:  4  roleGate:  5
  user.routes.ts                 routes: 17  auth: 18  roleGate: 17

**DB tables referenced:**
  - program
  - program_registrations
  - program_attendance
  - documents
  - document_approvals
  - compliance_monitoring
  - budget
  - expense
  - inventory
  - feedback
  - sentiment_analysis
  - polls
  - poll_responses
  - resolution_votes


### 4 — Youth Constituent

**Frontend file:** `frontend\src\components\YouthPages.tsx` — 191 top-level declarations

**Frontend inputs/selects/buttons:**
  inputs:   23
  selects:  17
  textareas:1
  buttons:  50
  modals:   10

**Frontend API calls used:**
  acknowledgeWarning
  getFeedback
  getMyProgramRegistrations
  getProgramRegistrations
  getPublicProgramBudget
  getVerificationStatus
  getYouthDirectory
  logout
  submitFeedback
  updateProfile
  uploadAvatar
  uploadVerification

**Backend routes used by this role:**
  user.routes.ts                 routes: 17  auth: 18  roleGate: 17
  program.routes.ts              routes: 10  auth: 11  roleGate: 14
  poll.routes.ts                 routes:  3  auth:  4  roleGate:  5
  feedback.routes.ts             routes:  3  auth:  4  roleGate:  5
  public.routes.ts               routes:  7  auth:  0  roleGate:  0
  auth.routes.ts                 routes: 11  auth:  4  roleGate:  3

**DB tables referenced:**
  - users
  - resident_profile
  - program
  - program_registrations
  - program_attendance
  - polls
  - poll_responses
  - feedback
  - sentiment_analysis
  - notifications


### 5 — Public Viewer (unauthenticated)

**Frontend file:** `frontend\src\components\ViewerPages.tsx` — 62 top-level declarations

**Frontend inputs/selects/buttons:**
  inputs:   1
  selects:  2
  textareas:0
  buttons:  32
  modals:   3

**Frontend API calls used:**
  getPublicDemographics
  getPublicProgramBudget

**Backend routes used by this role:**
  public.routes.ts               routes:  7  auth:  0  roleGate:  0
  announcement.routes.ts         routes:  4  auth:  5  roleGate:  8

**DB tables referenced:**
  - barangay
  - program
  - program_attendance
  - budget
  - expense
  - documents
  - announcement


## 4. CRITICAL BUG VERIFICATION


### BUG-A: isVerifiedYouth missing demotion exception (user.routes.ts)

  L331: const isVerifiedYouth = user.role_id === 4
  L293: .select('id, email, tenant_id, role_id, status, full_name, first_name, middle_name, last_name, suffix, suspension_reason, is_demoted')
  L383: if (body.has_edited_profile === true && user.is_demoted === true) {
  L998: data ? { ...data, is_demoted_chair: isDemotedChair } : { id_type: null, id_number: null, verification_status: 'not_submitted', verification_notes: null, verification_reviewed_at: null, is_demoted_chair: isDemotedChair },
  L1079: is_demoted_chair: Boolean(transferRecord),

### BUG-B: 13 youth profile fields editable (YouthPages.tsx)

  mobile                     ✗ EDITABLE
  email                      ✗ EDITABLE
  guardianName               ✗ EDITABLE
  guardianContact            ✗ EDITABLE
  educationalLevel           ✗ EDITABLE
  school                     ✗ EDITABLE
  course                     ✗ EDITABLE
  year                       ✗ EDITABLE
  employmentStatus           ✗ EDITABLE
  scholarStatus              ✗ EDITABLE
  scholarshipSource          ✗ EDITABLE
  scholarshipSourceDetail    ✗ EDITABLE
  scholarshipType            ✗ EDITABLE

Frontend fields LOCKED: **0 / 13**

### BUG-C: 10 backend lock keys (user.routes.ts lockedFieldChanges)

  phone                  ✗ MISSING
  educational_status     ✗ MISSING
  employment_status      ✗ MISSING
  school                 ✗ MISSING
  course                 ✗ MISSING
  year_level             ✗ MISSING
  guardian_name          ✗ MISSING
  guardian_contact       ✗ MISSING
  scholar_status         ✗ MISSING
  scholarship_source     ✗ MISSING


### BUG-D: Q3 metadata-only fields (scholarshipSourceDetail, scholarshipType, email, year)

  L308: const scholarshipSourceDetail = body.scholarshipSourceDetail ?? body.scholarship_source_detail;
  L315: if (scholarshipStatus === 'Scholar' && scholarshipSource === 'Other' && !String(scholarshipSourceDetail || '').trim()) {
  L470: id: body.id || prevMeta.id || residentPayload.digital_youth_id || `SK-2026-${userId.slice(0, 4)}`,
  L471: name: body.name || body.full_name || prevMeta.name || userUpdates.full_name || user.full_name,
  L472: sex: body.sex || prevMeta.sex || sex,
  L474: age: body.age || calculatedAge || prevMeta.age || 20,
  L475: civilStatus: body.civilStatus || body.civil_status || civilStatus || prevMeta.civilStatus || 'Single',
  L476: address: body.address || prevMeta.address || address,
  L477: zone: body.zone || prevMeta.zone || null,
  L478: mobile: body.mobile || body.phone || prevMeta.mobile || userUpdates.phone,
  L479: email: body.email || dbUser?.email || user.email || prevMeta.email,
  L480: educationalLevel: body.educationalLevel || prevMeta.educationalLevel || normalizedEdu || 'College',
  L481: school: body.school ?? prevMeta.school ?? '',
  L482: course: body.course ?? prevMeta.course ?? '',
  L483: year: body.year ?? prevMeta.year ?? '1st Year',
  L484: employmentStatus: body.employmentStatus || prevMeta.employmentStatus || normalizedEmp || 'Student',
  L485: scholarStatus: body.scholarStatus || prevMeta.scholarStatus || 'Non-Scholar',
  L486: scholarshipSource: scholarshipSource ?? prevMeta.scholarshipSource ?? '',
  L487: scholarshipSourceDetail: scholarshipSourceDetail !== undefined
  L488: ? scholarshipSourceDetail || ''

## 5. RECENT FIX VERIFICATION (all 12)


### Fix 1: GYDF duplicates — UPSERT + partial unique index

  L1259: { onConflict: 'user_id' }
  L1479: { onConflict: 'user_id' }
  L183: { onConflict: 'user_id' }
  L447: .upsert(residentPayload, { onConflict: 'user_id' });
  L815: .upsert(residentPayload, { onConflict: 'user_id' });

### Fix 2: Expense delete routes

  (no match for 'router\.delete.*expense')
  L304: sendError(res, 'This allocation cannot be deleted while it has recorded expenses.', 409);
  L715: sendError(res, 'Forbidden: You cannot delete another Barangay expense.', 403);
  L724: sendError(res, `Failed to delete expense: ${deleteError.message}`, 500);

### Fix 3: Program delete includes SK_OFFICIAL

  (no match for 'router\.delete.*requireRoles')

### Fix 4: Document categories (should be 4: Resolutions, Minutes, Financial Reports, Vouchers)

  L14: document_type: z.enum([
  L18: 'Minutes',
  L36: document_type: z.enum(['Resolution', 'Resolutions', 'Ordinance', 'Ordinances', 'Financial Report', 'Reports', 'Minutes', 'Meeting Minutes', 'Project Proposal', 'Accomplishment', 'Budget', 'Vouchers', 'Liquidation', 'Communications', 'Other']),
  L43: const ALLOWED_DOCUMENT_TYPES = new Set([
  L106: const { title, document_type, file_name, content_type, file_base64 } = parsed.data;
  L111: if (!ALLOWED_DOCUMENT_TYPES.has(normalizedContentType) || !allowedExtensions.has(extension)) {
  L143: document_type,
  L163: details: { title, type: document_type, file_name: safeFileName, storage_path: objectPath },
  L183: message: '"' + title + '" (' + document_type + ') was uploaded by ' + (user.full_name || 'SK Secretary') + '. Please review and approve.',
  L207: const { status, document_type, tenant_id } = req.query;
  L119: function normalizeDocType(type: string): 'Resolutions' | 'Minutes' | 'Vouchers' | 'Reports' {
  L121: if (category.includes('resolution') || category.includes('ordinance')) return 'Resolutions';
  L122: if (category.includes('minute')) return 'Minutes';
  L123: if (category.includes('voucher') || category.includes('transmittal')) return 'Vouchers';
  L127: function getNormalizedDocumentType(document: DocumentRecord): 'Resolutions' | 'Minutes' | 'Vouchers' | 'Reports' {
  L142: resolutions: ResolutionRecord[];
  L177: resolutions,
  L230: const [localResolutions, setLocalResolutions] = useState<any[]>(resolutions);
  L231: const archivedResolutions = localResolutions.filter(
  L234: const activeResolutions = localResolutions.filter(

### Fix 5: Chart labels horizontal (angle={-30})

  angle={-30} occurrences: **0** (expect 0)

### Fix 6: Dashboard announcements limited to 2

  (no match for '\.slice\(0,\s*2\)')
  L2180: {announcements.filter(a => a.status === 'published').slice(0, 2).map(a => (
  L1104: .slice(0, 2)

### Fix 7: Compliance alerts route to correct pages

  (no match for 'compliance.*setActiveMenu|setActiveMenu.*compliance')
  L3111: onClick={() => { setActiveMenu('reports'); setReportModuleCategory('compliance'); setTreasurerReportTab('statement'); }}

### Fix 8: Scholarship source field (verified in prior scan)

  L203: scholarship_source: z.enum(['Government', 'Private', 'Academic', 'NGO', 'Other']).optional(),
  L204: scholarship_source_detail: z.string().max(250).optional(),
  L219: && data.scholarship_source === 'Other'
  L220: && !data.scholarship_source_detail?.trim()) {
  L223: path: ['scholarship_source_detail'],
  L291: scholarship_source,
  L292: scholarship_source_detail,
  L427: scholarship_source: scholarship_source || (scholar_status === 'Scholar' ? 'Other' : null),
  L441: if (scholarship_source_detail !== undefined) {
  L450: scholarshipSourceDetail: scholarship_source_detail,
  L307: const scholarshipSource = body.scholarshipSource ?? body.scholarship_source;
  L308: const scholarshipSourceDetail = body.scholarshipSourceDetail ?? body.scholarship_source_detail;
  L310: const validScholarshipSources = ['Government', 'Private', 'Academic', 'NGO', 'Other'];
  L311: if (scholarshipSource && !validScholarshipSources.includes(scholarshipSource)) {
  L315: if (scholarshipStatus === 'Scholar' && scholarshipSource === 'Other' && !String(scholarshipSourceDetail || '').trim()) {
  L434: if (scholarshipSource !== undefined) {
  L435: residentPayload.scholarship_source = scholarshipSource || null;
  L486: scholarshipSource: scholarshipSource ?? prevMeta.scholarshipSource ?? '',
  L487: scholarshipSourceDetail: scholarshipSourceDetail !== undefined
  L488: ? scholarshipSourceDetail || ''

### Fix 9: Privacy consent PDF

  PDF: 136384 bytes, modified 11/12/2026 08:08:33
  HTML: 8160 bytes, modified 11/12/2026 08:08:09

### Fix 10: Native alerts replaced

  Total window.alert/confirm: **0** (expect 0)

### Fix 11: Mobile responsive modals (max-w-[95vw])

  max-w-[95vw] occurrences: **0**

### Fix 12: Image lightbox (same-page, not new tab)

  L225: const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  L1394: onClick={() => setLightboxImg((viewingProgram as any).image_url || viewingProgram.imageUrl || null)}
  L2465: <img src={URL.createObjectURL(pubmatFile)} alt="Pubmat preview" className="max-h-48 rounded-lg border border-slate-200 object-contain cursor-pointer" onClick={() => setLightboxImg(URL.createObjectURL(pubmatFile!))} />
  L3203: onClick={() => setLightboxImg(announcement.imageUrl)}
  L3898: {lightboxImg && (
  L223: const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  L2131: onClick={() => setLightboxImg(announcement.imageUrl || (announcement as any).image_url)}
  L3356: onClick={() => setLightboxImg((p as any).image_url || p.imageUrl || null)}
  L6990: {/* INVENTORY LIGHTBOX MODAL */}
  L7014: {lightboxImg && (
  L122: const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  L1764: onClick={() => setLightboxImg(p.imageUrl || p.image_url)}
  L3012: {lightboxImg && (
  L3015: onClick={() => setLightboxImg(null)}
  L3018: src={lightboxImg}

## 6. DEMOTION WORKFLOW — SQL to run next

Paste in Supabase SQL Editor. Confirms Q1 demotion path.

```sql
SELECT u.id, u.email, u.full_name, u.status, u.role_id,
       (u.is_demoted::text) AS is_demoted,
       (u.has_edited_profile::text) AS has_edited_profile,
       rp.verification_status
FROM public.users u
LEFT JOIN public.resident_profile rp ON rp.user_id = u.id
WHERE u.role_id = 4 AND u.is_demoted = true
ORDER BY u.created_at DESC;
```

---
Scan ended: 20261112-091337
