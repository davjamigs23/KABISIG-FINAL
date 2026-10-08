import express from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin, recordAuditLog } from '../services/supabase.service.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';
import { authenticateUser, requireRoles, optionalAuthenticateUser } from '../middleware/auth.js';
import type { AuthRequest } from '../types/database.types.js';

const router = express.Router();

function round2(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

const UpdateBarangaySchema = z.object({
  chairperson: z.string().optional(),
  chairperson_email: z.string().email().optional().or(z.literal('')),
  chairpersonEmail: z.string().email().optional().or(z.literal('')),
  contact: z.string().optional(),
  youth_population: z.number().int().min(0).optional(),
  youthPopulation: z.number().int().min(0).optional(),
  allocated_budget: z.number().min(0).optional(),
  allocatedBudget: z.number().min(0).optional(),
  totalBudget: z.number().min(0).optional(),
  status: z.enum(['Active', 'Inactive']).optional(),
  logo_url: z.string().optional().or(z.literal('')),
  logo: z.string().optional().or(z.literal('')),
});

const AssignChairpersonSchema = z.object({
  full_name: z.string().min(2, 'Chairperson full name is required'),
  email: z.string().email('Valid chairperson email is required'),
  phone: z.string().optional(),
});

const DEFAULT_BARANGAY_LOGOS: Record<string, string> = {
  'Bagumbayan Norte': '/logos/bagumbayannorte_logo.png',
  'Bagumbayan Sur': '/logos/bagumbayansur_logo.png',
  'Calauag': '/logos/calauag_logo.png',
  'Carolina': '/logos/carolina_logo.png',
  'Dayangdang': '/logos/dayangdang_logo.png',
  'Liboton': '/logos/liboton_logo.png',
  'Pacol': '/logos/pacol_logo.png',
  'Panicuason': '/logos/panicuason_logo.png',
  'Peñafrancia': '/logos/penafrancia_logo.png',
  'San Felipe': '/logos/sanfelipe_logo.png',
  'Santa Cruz': '/logos/stacruz_logo.png',
  'Abella': '/logos/abella_logo.PNG',
  'Balatas': '/logos/balatas_logo.png',
  'Cararayan': '/logos/cararayan_logo.png',
  'Concepcion Grande': '/logos/grande_logo.png',
  'Concepcion Pequeña': '/logos/pequena_logo.png',
  'Del Rosario': '/logos/delrosario_logo.png',
  'Dinaga': '/logos/dinaga_logo.png',
  'Igualdad Interior': '/logos/igualidad_logo.png',
  'Lerma': '/logos/lerma_logo.png',
  'Mabolo': '/logos/mabolo_logo.png',
  'Sabang': '/logos/sabang_logo.png',
  'San Francisco': '/logos/sanfrancisco_logo.png',
  'San Isidro': '/logos/sanisidiro_logo.png',
  'Tabuco': '/logos/tabuco_logo.png',
  'Tinago': '/logos/tinago_logo.png',
  'Triangulo': '/logos/triangulo_logo.png',
};

import fs from 'fs';
import path from 'path';

const LOGOS_FILE = path.resolve(process.cwd(), 'data', 'custom_logos.json');

function getCustomLogos(): Record<string, string> {
  try {
    if (fs.existsSync(LOGOS_FILE)) {
      return JSON.parse(fs.readFileSync(LOGOS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.warn('Error reading custom logos:', err);
  }
  return {};
}

function saveCustomLogo(idOrName: string, logoUrl: string) {
  try {
    const logos = getCustomLogos();
    fs.mkdirSync(path.dirname(LOGOS_FILE), { recursive: true });
    if (logoUrl.trim()) {
      logos[idOrName] = logoUrl;
    } else {
      delete logos[idOrName];
    }
    fs.writeFileSync(LOGOS_FILE, JSON.stringify(logos, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error saving custom logo:', err);
  }
}

function resolveBarangayLogo(id: string, name: string): string {
  const custom = getCustomLogos();
  return custom[id] || custom[name] || DEFAULT_BARANGAY_LOGOS[name] || '';
}

// Chairperson email/phone are only returned to the owning barangay and city-level roles.
const CONTACT_VISIBLE_ROLES = ['SUPER_ADMIN', 'VIEWER', 'FEDERATION_OBSERVER', 'LGU_AUDITOR'];
function canSeeBarangayContacts(req: Request, barangayId: string): boolean {
  const viewer = (req as unknown as { user?: { role?: string; tenant_id?: string | null } }).user;
  if (!viewer) return false;
  if (viewer.role && CONTACT_VISIBLE_ROLES.includes(viewer.role)) return true;
  return Boolean(viewer.tenant_id) && viewer.tenant_id === barangayId;
}
// GET /api/barangays - Public/Authenticated: List all 27 Naga City permanently seeded barangays
router.get('/', optionalAuthenticateUser, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: barangays, error: bgyError } = await supabaseAdmin
      .from('barangay')
      .select('id, name, city, district, sk_district, allocated_budget, created_at, updated_at')
      .order('name', { ascending: true });

    if (bgyError) {
      sendError(res, `Failed to load barangays: ${bgyError.message}`, 500);
      return;
    }

    // Fetch assigned SK Chairpersons (role_id = 2)
    const { data: chairpersons } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, phone, tenant_id, status, updated_at')
      .eq('role_id', 2)
      .eq('status', 'active')
      .order('updated_at', { ascending: false });

    const chairMap = new Map<string, { full_name: string; email: string; phone: string | null }>();
    chairpersons?.forEach((c) => {
      if (c.tenant_id && !chairMap.has(c.tenant_id)) {
        chairMap.set(c.tenant_id, {
          full_name: c.full_name,
          email: c.email,
          phone: c.phone,
        });
      }
    });

    // Fetch active programs count per barangay
    const { data: programs } = await supabaseAdmin
      .from('program')
      .select('tenant_id, status');

    const progCountMap = new Map<string, number>();
    programs?.forEach((p) => {
      if (p.status === 'ongoing' || p.status === 'upcoming') {
        progCountMap.set(p.tenant_id, (progCountMap.get(p.tenant_id) || 0) + 1);
      }
    });

    // Fetch registered youth population per barangay (users with role_id = 4: YOUTH_CONSTITUENT)
    const { data: youthUsers, error: youthUsersError } = await supabaseAdmin
      .from('users')
      .select('tenant_id')
      .eq('role_id', 4)
      .eq('status', 'active');
    if (youthUsersError) {
      console.warn('Unable to load live youth counts for barangays:', youthUsersError.message);
    }

    const youthCountMap = new Map<string, number>();
    youthUsers?.forEach((u) => {
      if (u.tenant_id) {
        youthCountMap.set(u.tenant_id, (youthCountMap.get(u.tenant_id) || 0) + 1);
      }
    });

    // Fetch current year budgets
    const currentYear = new Date().getFullYear();
    const { data: budgets } = await supabaseAdmin
      .from('budget')
      .select('tenant_id, allocated_amount, remaining_amount')
      .eq('fiscal_year', currentYear);

    const budgetMap = new Map<string, { allocated: number; spent: number }>();
    budgets?.forEach((b) => {
      const existing = budgetMap.get(b.tenant_id) || { allocated: 0, spent: 0 };
      const allocated = Number(b.allocated_amount) || 0;
      const remaining = Number(b.remaining_amount) || 0;
      existing.allocated += allocated;
      existing.spent += (allocated - remaining);
      budgetMap.set(b.tenant_id, existing);
    });

    const enrichedBarangays = (barangays || []).map((b) => {
      const chair = chairMap.get(b.id);
      const budget = budgetMap.get(b.id) || { allocated: 0, spent: 0 };
      return {
        id: b.id,
        name: b.name,
        city: b.city,
        district: b.district,
        skDistrict: b.sk_district ?? null,
        chairperson: chair?.full_name || 'Unassigned',
        chairpersonEmail: canSeeBarangayContacts(req, b.id) ? (chair?.email || '') : '',
        contact: canSeeBarangayContacts(req, b.id) ? (chair?.phone || '') : '',
        youthPopulation: youthCountMap.get(b.id) || 0,
        youthPopulationAvailable: !youthUsersError,
        activePrograms: progCountMap.get(b.id) || 0,
        totalBudget: ((b as any).allocated_budget && Number((b as any).allocated_budget) > 0) ? Number((b as any).allocated_budget) : budget.allocated,
        allocatedBudget: budget.allocated,
        spentBudget: budget.spent,
        status: 'Active',
        logo: resolveBarangayLogo(b.id, b.name),
        dateCreated: b.created_at || '2026-01-01',
      };
    });

    enrichedBarangays.sort((a, b) => a.name.localeCompare(b.name));

    sendSuccess(res, enrichedBarangays, '27 Naga City barangays retrieved successfully.');
  } catch (err: any) {
    sendError(res, err.message || 'Error fetching barangays', 500);
  }
});

// GET /api/barangays/:id - Get specific barangay details
router.get('/:id', optionalAuthenticateUser, async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);

  const { data: barangay, error } = await supabaseAdmin
    .from('barangay')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !barangay) {
    sendError(res, 'Barangay not found.', 404);
    return;
  }

  // Fetch Chairperson
  const { data: chair } = await supabaseAdmin
    .from('users')
    .select('id, full_name, email, phone, status')
    .eq('tenant_id', id)
    .eq('role_id', 2)
    .eq('status', 'active')
    .maybeSingle();

  sendSuccess(res, {
    ...barangay,
    chairperson: chair?.full_name || 'Unassigned',
    chairpersonEmail: canSeeBarangayContacts(req, barangay.id) ? (chair?.email || '') : '',
    contact: canSeeBarangayContacts(req, barangay.id) ? (chair?.phone || '') : '',
    logo: resolveBarangayLogo(barangay.id, barangay.name),
  }, 'Barangay details retrieved.');
});

// PATCH /api/barangays/:id - Super Admin: Initialize/Configure/Adjust barangay settings
router.patch(
  '/:id',
  authenticateUser,
  requireRoles('SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const admin = (req as AuthRequest).user!;

    const parseResult = UpdateBarangaySchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, 'Validation failed', 400, parseResult.error.flatten().fieldErrors);
      return;
    }

    const { data: existingBgy, error: fetchErr } = await supabaseAdmin
      .from('barangay')
      .select('id, name')
      .eq('id', id)
      .single();

    if (fetchErr || !existingBgy) {
      sendError(res, 'Barangay not found.', 404);
      return;
    }

    const updates = parseResult.data;
    const allocatedBudget = updates.allocated_budget ?? updates.allocatedBudget ?? updates.totalBudget;
    const chairName = updates.chairperson;
    const chairEmail = updates.chairperson_email || updates.chairpersonEmail;
    const phone = updates.contact;

    // 1. If allocating budget, upsert into budget table for current year
    if (typeof allocatedBudget === 'number' && allocatedBudget >= 0) {
      const currentYear = new Date().getFullYear();
      const { data: currentBudget, error: budgetFetchError } = await supabaseAdmin
        .from('budget')
        .select('id, allocated_amount, remaining_amount')
        .eq('tenant_id', id)
        .eq('fiscal_year', currentYear)
        .eq('category', 'General Youth Development Fund')
        .maybeSingle();

      if (budgetFetchError) {
        sendError(res, `Failed to retrieve the current budget allocation: ${budgetFetchError.message}`, 500);
        return;
      }

      const previouslySpent = currentBudget
        ? round2(Number(currentBudget.allocated_amount) - Number(currentBudget.remaining_amount))
        : 0;
      if (allocatedBudget < previouslySpent) {
        sendError(
          res,
          `The new allocation cannot be lower than the ₱${previouslySpent.toLocaleString()} already spent.`,
          422,
          { allocated_budget: allocatedBudget, already_spent: previouslySpent }
        );
        return;
      }

      const budgetValues = {
        allocated_amount: allocatedBudget,
        remaining_amount: round2(allocatedBudget - previouslySpent),
        description: `Annual budget allocation configured by SK Federation President for Brgy. ${existingBgy.name}`,
        updated_at: new Date().toISOString(),
      };
      const budgetWrite = currentBudget
        ? await supabaseAdmin.from('budget').update(budgetValues).eq('id', currentBudget.id)
        : await supabaseAdmin.from('budget').insert({
            tenant_id: id,
            fiscal_year: currentYear,
            category: 'General Youth Development Fund',
            ...budgetValues,
          });

      if (budgetWrite.error) {
        sendError(res, `Failed to save the budget allocation: ${budgetWrite.error.message}`, 500);
        return;
      }
    }

    // 2. Chairperson assignment and resolution
    let resolvedChairName = chairName && chairName.trim() && chairName !== 'Unassigned' ? chairName.trim() : null;
    let resolvedChairEmail = chairEmail && chairEmail.trim() ? chairEmail.trim().toLowerCase() : null;

    if (resolvedChairEmail) {
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id, email, full_name, tenant_id')
        .eq('email', resolvedChairEmail)
        .maybeSingle();

      if (existingUser) {
        resolvedChairName = resolvedChairName || existingUser.full_name || 'Hon. SK Chairperson';

        // Unassign any other previous chairperson for this barangay
        await supabaseAdmin
          .from('users')
          .update({ role_id: 4, updated_at: new Date().toISOString() })
          .eq('tenant_id', id)
          .eq('role_id', 2)
          .neq('id', existingUser.id);

        await supabaseAdmin
          .from('users')
          .update({
            full_name: resolvedChairName,
            tenant_id: id,
            role_id: 2, // BARANGAY_ADMIN
            status: 'active',
            approved_by: admin.id,
            phone: phone || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingUser.id);
      } else {
        resolvedChairName = resolvedChairName || 'Hon. SK Chairperson';
        const secureTempPassword = `KabisigChairperson${new Date().getFullYear()}!`;
        const { data: authData } = await supabaseAdmin.auth.admin.createUser({
          email: resolvedChairEmail,
          password: secureTempPassword,
          email_confirm: true,
          user_metadata: { full_name: resolvedChairName, tenant_id: id, role_id: 2 },
        });

        if (authData?.user) {
          // Unassign any previous chairperson for this barangay
          await supabaseAdmin
            .from('users')
            .update({ role_id: 4, updated_at: new Date().toISOString() })
            .eq('tenant_id', id)
            .eq('role_id', 2);

          await supabaseAdmin.from('users').upsert({
            id: authData.user.id,
            tenant_id: id,
            role_id: 2, // BARANGAY_ADMIN
            full_name: resolvedChairName,
            email: resolvedChairEmail,
            phone: phone || null,
            status: 'active',
            approved_by: admin.id,
            updated_at: new Date().toISOString(),
          });
        }
      }
    } else if (resolvedChairName) {
      const { data: currentChair } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .eq('tenant_id', id)
        .eq('role_id', 2)
        .maybeSingle();

      if (currentChair) {
        resolvedChairEmail = currentChair.email;
        await supabaseAdmin
          .from('users')
          .update({
            full_name: resolvedChairName,
            phone: phone || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentChair.id);
      }
    }

    // 3. Fallback to existing active chairperson in DB if not updated in this request
    if (!resolvedChairName || !resolvedChairEmail) {
      const { data: existingChair } = await supabaseAdmin
        .from('users')
        .select('full_name, email, phone')
        .eq('tenant_id', id)
        .eq('role_id', 2)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingChair) {
        if (!resolvedChairName) resolvedChairName = existingChair.full_name;
        if (!resolvedChairEmail) resolvedChairEmail = existingChair.email;
      }
    }

    if ('logo' in updates || 'logo_url' in updates) {
      const newLogo = updates.logo ?? updates.logo_url ?? '';
      saveCustomLogo(id, newLogo);
      saveCustomLogo(existingBgy.name, newLogo);
    }

    await recordAuditLog({
      tenantId: id,
      userId: admin.id,
      action: 'UPDATE_BARANGAY_SETTINGS',
      entityName: 'barangay',
      entityId: id,
      details: { ...updates, chairperson: resolvedChairName, chairpersonEmail: resolvedChairEmail, updated_by: admin.full_name, barangay_name: existingBgy.name },
      ipAddress: req.ip || null,
    });

    sendSuccess(res, {
      id,
      name: existingBgy.name,
      chairperson: resolvedChairName || 'Unassigned',
      chairpersonEmail: resolvedChairEmail || '',
      contact: phone || '',
      allocatedBudget: allocatedBudget !== undefined ? allocatedBudget : 0,
      totalBudget: allocatedBudget !== undefined ? allocatedBudget : 0,
      youthPopulation: updates.youth_population ?? updates.youthPopulation ?? 0,
      logo: resolveBarangayLogo(id, existingBgy.name),
      status: updates.status || 'Active',
    }, `Settings updated for Barangay ${existingBgy.name}.`);
  }
);

// POST /api/barangays/:id/assign-chairperson - Super Admin: Assign SK Chairperson (Barangay Admin)
router.patch(
  '/:id/sk-budget',
  authenticateUser,
  requireRoles('BARANGAY_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthRequest).user!;
    const { id } = req.params;
    if (user.tenant_id !== id) {
      sendError(res, 'You can only set the total budget for your own Barangay.', 403);
      return;
    }
    const body = req.body || {};
    const numericAmount = Number(body.total_amount ?? body.totalBudget ?? body.allocatedBudget);
    if (!numericAmount || numericAmount <= 0) {
      sendError(res, 'Total amount must be a positive number.', 400);
      return;
    }
    const { error } = await supabaseAdmin
      .from('barangay')
      .update({ allocated_budget: numericAmount })
      .eq('id', id);
    if (error) {
      sendError(res, `Failed to update total SK budget: ${error.message}`, 500);
      return;
    }
    sendSuccess(res, { total_amount: numericAmount, fiscal_year: body.fiscal_year }, 'Total SK budget updated.');
  }
);
router.post(
  '/:id/assign-chairperson',
  authenticateUser,
  requireRoles('SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const admin = (req as AuthRequest).user!;

    const parseResult = AssignChairpersonSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, 'Validation failed', 400, parseResult.error.flatten().fieldErrors);
      return;
    }

    const { full_name, email, phone } = parseResult.data;

    const { data: existingBgy, error: fetchErr } = await supabaseAdmin
      .from('barangay')
      .select('id, name')
      .eq('id', id)
      .single();

    if (fetchErr || !existingBgy) {
      sendError(res, 'Barangay not found in Naga City registry.', 404);
      return;
    }

    // Check if user already exists in users table with this email
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, email, tenant_id, role_id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      const { error: updateErr } = await supabaseAdmin
        .from('users')
        .update({
          full_name,
          tenant_id: id,
          role_id: 2, // BARANGAY_ADMIN
          status: 'active',
          approved_by: admin.id,
          phone: phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingUser.id);

      if (updateErr) {
        sendError(res, `Failed to update user to SK Chairperson: ${updateErr.message}`, 500);
        return;
      }
    } else {
      const tempPassword = `Kabisig${new Date().getFullYear()}!`;
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name, tenant_id: id, role_id: 2 },
      });

      if (authErr || !authData.user) {
        sendError(res, authErr?.message || 'Failed to create chairperson auth account.', 500);
        return;
      }

      const { error: insertUserErr } = await supabaseAdmin.from('users').insert([
        {
          id: authData.user.id,
          tenant_id: id,
          role_id: 2, // BARANGAY_ADMIN
          full_name,
          email,
          phone: phone || null,
          status: 'active',
          approved_by: admin.id,
        },
      ]);

      if (insertUserErr) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        sendError(res, `Failed to register SK Chairperson in database: ${insertUserErr.message}`, 500);
        return;
      }
    }

    await recordAuditLog({
      tenantId: id,
      userId: admin.id,
      action: 'ASSIGN_SK_CHAIRPERSON',
      entityName: 'users',
      entityId: id,
      details: {
        assigned_chairperson: full_name,
        email,
        barangay: existingBgy.name,
        assigned_by: admin.full_name,
      },
      ipAddress: req.ip || null,
    });

    sendCreated(
      res,
      {
        tenant_id: id,
        barangay_name: existingBgy.name,
        chairperson: full_name,
        email,
      },
      `Hon. ${full_name} successfully assigned as SK Chairperson (Barangay Admin) for Barangay ${existingBgy.name}.`
    );
  }
);

export default router;
