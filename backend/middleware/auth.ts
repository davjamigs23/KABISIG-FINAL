import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../services/supabase.service.js';
import { sendError } from '../utils/response.js';
import type { AuthenticatedUser, AuthRequest, RoleName } from '../types/database.types.js';

export async function authenticateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    sendError(res, 'Access denied. Authentication token is missing.', 401);
    return;
  }

  try {
    const {
      data: { user: authUser },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authUser) {
      sendError(res, 'Invalid or expired authentication token.', 401);
      return;
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, tenant_id, role_id, status, roles(role_name), barangay(name)')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profile) {
      sendError(res, 'User profile record not found in system.', 403);
      return;
    }

    const roleRecord = profile.roles as unknown as { role_name: RoleName } | { role_name: RoleName }[] | null;
    const barangayRecord = profile.barangay as unknown as { name: string } | { name: string }[] | null;

    const roleName: RoleName = Array.isArray(roleRecord)
      ? roleRecord[0]?.role_name || 'YOUTH_CONSTITUENT'
      : roleRecord?.role_name || 'YOUTH_CONSTITUENT';

    const barangayName = Array.isArray(barangayRecord)
      ? barangayRecord[0]?.name || null
      : barangayRecord?.name || null;

    const authenticatedUser: AuthenticatedUser = {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: roleName,
      role_id: profile.role_id,
      tenant_id: profile.tenant_id,
      barangay_name: barangayName,
      status: profile.status,
    };

    (req as AuthRequest).user = authenticatedUser;
    next();
  } catch (err: any) {
    sendError(res, 'Authentication internal error: ' + (err.message || 'Unknown error'), 500);
  }
}

export async function optionalAuthenticateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    (req as AuthRequest).user = undefined;
    return next();
  }

  try {
    const {
      data: { user: authUser },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authUser) {
      sendError(res, 'Invalid or expired authentication token.', 401);
      return;
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, tenant_id, role_id, status, roles(role_name), barangay(name)')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profile) {
      sendError(res, 'User profile record not found in system.', 403);
      return;
    }

    const roleRecord = profile.roles as unknown as { role_name: RoleName } | { role_name: RoleName }[] | null;
    const barangayRecord = profile.barangay as unknown as { name: string } | { name: string }[] | null;

    const roleName: RoleName = Array.isArray(roleRecord)
      ? roleRecord[0]?.role_name || 'YOUTH_CONSTITUENT'
      : roleRecord?.role_name || 'YOUTH_CONSTITUENT';

    const barangayName = Array.isArray(barangayRecord)
      ? barangayRecord[0]?.name || null
      : barangayRecord?.name || null;

    const authenticatedUser: AuthenticatedUser = {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: roleName,
      role_id: profile.role_id,
      tenant_id: profile.tenant_id,
      barangay_name: barangayName,
      status: profile.status,
    };

    (req as AuthRequest).user = authenticatedUser;
    next();
  } catch (err: any) {
    sendError(res, 'Authentication internal error: ' + (err.message || 'Unknown error'), 500);
  }
}

export function requireActiveUser(req: Request, res: Response, next: NextFunction): void {
  const user = (req as AuthRequest).user;
  if (!user) {
    sendError(res, 'User is not authenticated.', 401);
    return;
  }

  if (user.status !== 'active') {
    sendError(
      res,
      `Your account is currently '${user.status}'. Access is restricted until approved by an administrator.`,
      403
    );
    return;
  }

  next();
}

export function requireRoles(...allowedRoles: RoleName[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthRequest).user;
    if (!user) {
      sendError(res, 'User is not authenticated.', 401);
      return;
    }

    if (user.role === 'SUPER_ADMIN') {
      return next();
    }

    if (!allowedRoles.includes(user.role)) {
      sendError(
        res,
        `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}. Your role: ${user.role}`,
        403
      );
      return;
    }

    next();
  };
}