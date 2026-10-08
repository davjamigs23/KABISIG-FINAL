import type { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  details?: unknown;
  timestamp: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedApiResponse<T = unknown> extends ApiResponse<T[]> {
  pagination: PaginationMeta;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Operation successful',
  statusCode = 200
): Response {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
}

export function sendCreated<T>(
  res: Response,
  data: T,
  message = 'Resource created successfully'
): Response {
  return sendSuccess(res, data, message, 201);
}

export function sendError(
  res: Response,
  message = 'An unexpected error occurred',
  statusCode = 400,
  details?: unknown
): Response {
  return res.status(statusCode).json({
    success: false,
    message,
    error: message,
    ...(details !== undefined ? { details } : {}),
    timestamp: new Date().toISOString(),
  });
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: { page: number; limit: number; total: number },
  message = 'Data retrieved successfully'
): Response {
  const totalPages = Math.ceil(pagination.total / pagination.limit) || 1;
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages,
    },
    timestamp: new Date().toISOString(),
  });
}
