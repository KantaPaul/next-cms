export interface LicenseListItem {
  id: string;
  publicId: string;
  keyPrefix: string;
  productId: string;
  status: string;
  ownerUserId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  issuedAt: Date | string;
  activatedAt: Date | string | null;
  expiresAt: Date | string | null;
  reassignmentCount: number;
  lastValidatedAt: Date | string | null;
}

export interface LicensesListProps {
  items: LicenseListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  currentSearch?: string;
  currentStatus?: string;
}
