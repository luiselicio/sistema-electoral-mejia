import type { UserRole } from "@prisma/client";

export type Permission =
  | "users:manage"
  | "territories:manage"
  | "campaigns:manage"
  | "surveys:manage"
  | "figures:manage"
  | "submissions:capture"
  | "submissions:view_own_status"
  | "analytics:view"
  | "exports:create"
  | "audit:view"
  | "responses:view_individual"; // sensible, excepcional

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPERADMIN: [
    "users:manage",
    "territories:manage",
    "campaigns:manage",
    "surveys:manage",
    "figures:manage",
    "submissions:capture",
    "submissions:view_own_status",
    "analytics:view",
    "exports:create",
    "audit:view",
    "responses:view_individual",
  ],
  CAMPAIGN_ADMIN: [
    "campaigns:manage",
    "surveys:manage",
    "figures:manage",
    "analytics:view",
    "exports:create",
  ],
  ANALYST: ["analytics:view", "exports:create"],
  ENUMERATOR: ["submissions:capture", "submissions:view_own_status"],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function requirePermission(role: UserRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error("FORBIDDEN");
  }
}

export function isInternalRole(role: UserRole): boolean {
  return ["SUPERADMIN", "CAMPAIGN_ADMIN", "ANALYST", "ENUMERATOR"].includes(role);
}