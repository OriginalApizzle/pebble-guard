export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface StaffMember {
  id: string;
  tag: string;
  avatar?: string;
  roles: string[];
  level: number;
  permissions: string[];
}

export interface ModerationAction {
  type: string;
  userId: string;
  userTag: string;
  moderatorId: string;
  moderatorTag: string;
  reason?: string;
  duration?: number;
  evidence?: string[];
}
