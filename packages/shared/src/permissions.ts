export const STAFF_LEVELS = {
  STAFF: 1,
  MODERATOR: 2,
  SENIOR_MOD: 3,
  ADMIN: 4,
} as const;

export type StaffLevel = typeof STAFF_LEVELS[keyof typeof STAFF_LEVELS];

export function hasPermission(userLevel: number, required: number): boolean {
  return userLevel >= required;
}

export function getStaffLabel(level: number): string {
  switch (level) {
    case 1: return 'Staff';
    case 2: return 'Moderator';
    case 3: return 'Senior Mod / Admin';
    case 4: return 'Owner';
    default: return 'Unknown';
  }
}
