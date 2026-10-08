import express from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin, canAccessTenant, recordAuditLog } from '../services/supabase.service.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';
import { authenticateUser, requireActiveUser, requireRoles } from '../middleware/auth.js';
import type { AuthRequest } from '../types/database.types.js';

const router = express.Router();

function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

const CreateBudgetSchema = z.object({
  fiscal_year: z.number().int().min(2020).max(2100).default(new Date().getFullYear()),
  category: z.string().min(2, 'Category name is required'),
  allocated_amount: z.number().positive('Allocated amount must be greater than zero'),
  description: z.string().optional(),
});

const RecordExpenseSchema = z.object({
  budget_id: z.string().uuid('Valid budget allocation ID is required'),
  program_id: z.string().uuid().optional(),
  title: z.string().min(2, 'Expense title is required'),
  description: z.string().optional(),
  gross_amount: z.number().positive('Gross expense amount must be greater than zero'),
  tax_type: z.enum(['VAT', 'NON_VAT', 'EXEMPT']),
  tax_rate: z.number().min(0).max(100).optional(),
  receipt_url: z.string().url().optional(),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

router.get('/', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthRequest).user!;
  const { fiscal_year, tenant_id } = req.query;

  let query = supabaseAdmin.from('budget').select('*, barangay(name)');

  if (user.role !== 'SUPER_ADMIN') {
    if (!user.tenant_id) {
      sendError(res, 'User has no assigned Barangay tenant.', 403);
      return;
    }
    query = query.eq('tenant_id', user.tenant_id);
  } else if (tenant_id && typeof tenant_id === 'string') {
    query = query.eq('tenant_id', tenant_id);
  }

  if (fiscal_year) {
    query = query.eq('fiscal_year', Number(fiscal_year));
  }

  const { data: budgets, error } = await query.order('category', { ascending: true });

  if (error) {
    sendError(res, `Failed to retrieve budget allocations: ${error.message}`, 500);
    return;
  }

  const totalAllocated = budgets?.reduce((acc, b) => acc + Number(b.allocated_amount), 0) || 0;
  const totalRemaining = budgets?.reduce((acc, b) => acc + Number(b.remaining_amount), 0) || 0;
  const totalSpent = totalAllocated - totalRemaining;
  const utilizationRate = totalAllocated > 0 ? round2((totalSpent / totalAllocated) * 100) : 0;

  sendSuccess(
    res,
    {
      summary: {
        total_allocated: round2(totalAllocated),
        total_remaining: round2(totalRemaining),
        total_spent: round2(totalSpent),
        utilization_rate_pct: utilizationRate,
      },
      budgets,
    },
    'Budget allocations retrieved.'
  );
});

router.post(
  '/',
  authenticateUser,
  requireActiveUser,
  requireRoles('BARANGAY_ADMIN', 'SK_OFFICIAL', 'SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const parseResult = CreateBudgetSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, 'Validation failed', 400, parseResult.error.flatten().fieldErrors);
      return;
    }

    const user = (req as AuthRequest).user!;
    const { fiscal_year, category, allocated_amount, description } = parseResult.data;

    const tenantId = user.tenant_id;
    if (!tenantId) {
      sendError(res, 'User has no assigned Barangay tenant.', 400);
      return;
    }

    const { data: existing } = await supabaseAdmin
      .from('budget')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('fiscal_year', fiscal_year)
      .ilike('category', category)
      .maybeSingle();

    let newBudget: any;
    let error: any;

    if (existing) {
      // Update existing allocation amount (upsert behavior)
      const result = await supabaseAdmin
        .from('budget')
        .update({
          allocated_amount,
          remaining_amount: allocated_amount,
          description: description || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();
      newBudget = result.data;
      error = result.error;
    } else {
      const result = await supabaseAdmin
        .from('budget')
        .insert([
          {
            tenant_id: tenantId,
            fiscal_year,
            category,
            allocated_amount,
            remaining_amount: allocated_amount,
            description: description || null,
          },
        ])
        .select()
        .single();
      newBudget = result.data;
      error = result.error;
    }

    if (error) {
      sendError(res, `Failed to allocate budget: ${error.message}`, 500);
      return;
    }

    await recordAuditLog({
      tenantId,
      userId: user.id,
      action: 'ALLOCATE_BUDGET',
      entityName: 'budget',
      entityId: newBudget.id,
      details: { category, amount: allocated_amount, fiscal_year },
      ipAddress: req.ip || null,
    });

    sendCreated(res, newBudget, `Budget of ₱${allocated_amount.toLocaleString()} allocated for ${category}.`);
  }
);

router.get('/expenses', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthRequest).user!;
  const { budget_id, status, tenant_id } = req.query;

  let query = supabaseAdmin
    .from('expense')
    .select('*, budget(category, fiscal_year), program(title)');

  if (user.role !== 'SUPER_ADMIN') {
    if (!user.tenant_id) {
      sendError(res, 'User has no assigned Barangay tenant.', 403);
      return;
    }
    query = query.eq('tenant_id', user.tenant_id);
  } else if (tenant_id && typeof tenant_id === 'string') {
    query = query.eq('tenant_id', tenant_id);
  }

  if (budget_id && typeof budget_id === 'string') {
    query = query.eq('budget_id', budget_id);
  }

  if (status && typeof status === 'string') {
    query = query.eq('status', status);
  }

  const { data: expenses, error } = await query.order('created_at', { ascending: false });

  if (error) {
    sendError(res, `Failed to retrieve expenses: ${error.message}`, 500);
    return;
  }

  sendSuccess(res, expenses, 'Expenses retrieved successfully.');
});

router.post(
  '/expense',
  authenticateUser,
  requireActiveUser,
  requireRoles('BARANGAY_ADMIN', 'SK_OFFICIAL', 'SUPER_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const parseResult = RecordExpenseSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, 'Validation failed', 400, parseResult.error.flatten().fieldErrors);
      return;
    }

    const user = (req as AuthRequest).user!;
    const {
      budget_id,
      program_id,
      title,
      description,
      gross_amount,
      tax_type,
      tax_rate: userTaxRate,
      receipt_url,
      expense_date,
    } = parseResult.data;

    const { data: budget, error: budgetError } = await supabaseAdmin
      .from('budget')
      .select('*')
      .eq('id', budget_id)
      .single();

    if (budgetError || !budget) {
      sendError(res, 'Target budget allocation not found.', 404);
      return;
    }

    if (!canAccessTenant(user, budget.tenant_id)) {
      sendError(res, 'Forbidden: You cannot charge expenses to another Barangay budget.', 403);
      return;
    }

    const remainingAmount = Number(budget.remaining_amount);
    if (gross_amount > remainingAmount) {
      sendError(
        res,
        `Budget Overrun: Expense amount (₱${gross_amount.toLocaleString()}) exceeds the remaining balance (₱${remainingAmount.toLocaleString()}) for "${budget.category}".`,
        422,
        {
          gross_amount,
          allocated_amount: Number(budget.allocated_amount),
          remaining_amount: remainingAmount,
          deficit: round2(gross_amount - remainingAmount),
        }
      );
      return;
    }

    let effectiveTaxRate = 0;
    let taxAmount = 0;
    let netAmount = 0;

    switch (tax_type) {
      case 'VAT':
        effectiveTaxRate = userTaxRate !== undefined ? userTaxRate : 12.0;
        netAmount = round2(gross_amount / (1 + effectiveTaxRate / 100));
        taxAmount = round2(gross_amount - netAmount);
        break;

      case 'NON_VAT':
        effectiveTaxRate = userTaxRate !== undefined ? userTaxRate : 3.0;
        taxAmount = round2(gross_amount * (effectiveTaxRate / 100));
        netAmount = round2(gross_amount - taxAmount);
        break;

      case 'EXEMPT':
        effectiveTaxRate = 0.0;
        taxAmount = 0.0;
        netAmount = gross_amount;
        break;
    }

    const { data: newExpense, error: expenseError } = await supabaseAdmin
      .from('expense')
      .insert([
        {
          tenant_id: budget.tenant_id,
          budget_id,
          program_id: program_id || null,
          title,
          description: description || null,
          gross_amount,
          tax_type,
          tax_rate: effectiveTaxRate,
          tax_amount: taxAmount,
          net_amount: netAmount,
          receipt_url: receipt_url || null,
          expense_date: expense_date || new Date().toISOString().split('T')[0],
          status: 'approved',
          created_by: user.id,
        },
      ])
      .select()
      .single();

    if (expenseError) {
      sendError(res, `Failed to record expense: ${expenseError.message}`, 500);
      return;
    }

    const updatedRemaining = round2(remainingAmount - gross_amount);
    await supabaseAdmin
      .from('budget')
      .update({
        remaining_amount: updatedRemaining,
        updated_at: new Date().toISOString(),
      })
      .eq('id', budget_id);

    await recordAuditLog({
      tenantId: budget.tenant_id,
      userId: user.id,
      action: 'RECORD_EXPENSE',
      entityName: 'expense',
      entityId: newExpense.id,
      details: {
        title,
        gross_amount,
        tax_type,
        tax_amount: taxAmount,
        net_amount: netAmount,
        budget_category: budget.category,
        remaining_budget: updatedRemaining,
      },
      ipAddress: req.ip || null,
    });

    sendCreated(
      res,
      {
        expense: newExpense,
        fiscal_breakdown: {
          gross_amount,
          tax_type,
          tax_rate: `${effectiveTaxRate}%`,
          tax_amount: taxAmount,
          net_amount: netAmount,
        },
        budget_update: {
          category: budget.category,
          previous_remaining: remainingAmount,
          new_remaining: updatedRemaining,
        },
      },
      `Expense of ₱${gross_amount.toLocaleString()} recorded successfully with ${tax_type} breakdown.`
    );
  }
);

export default router;
