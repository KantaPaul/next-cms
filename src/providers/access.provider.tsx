'use client';

import { createContext, useContext } from 'react';
import type { PermissionKey, RoleName } from '@/config/permissions';

type AccessContextValue = {
  userId: string;
  role: RoleName | null;
  permissions: PermissionKey[];
};

const AccessContext = createContext<AccessContextValue>({
  userId: '',
  role: null,
  permissions: [],
});

export function AccessProvider({
  value,
  children,
}: {
  value: AccessContextValue;
  children: React.ReactNode;
}) {
  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  return useContext(AccessContext);
}

export function useCan(permission: PermissionKey) {
  return useAccess().permissions.includes(permission);
}

export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: PermissionKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return useCan(permission) ? children : fallback;
}
