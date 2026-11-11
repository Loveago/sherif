export type ProviderType = "MANUAL" | "TSKCONNECT" | (string & {});

export interface TskconnectConfig {
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
  webhookSecret: string;
  numberVerificationEnabled: boolean;
}

export interface TskconnectPackage {
  id: string;
  network: string;
  name: string;
  dataGb: number;
  price: number;
  currency: string;
  available: boolean;
}

export interface ProviderRoutingConfig {
  enabled: boolean; // Master switch: if false, everything is manual export
  defaultProvider: ProviderType;
  autoDispatch: boolean; // Dispatch immediately on order creation
  networkRoutes: Record<string, ProviderType>; // e.g. { "MTN": "TSKCONNECT", "TELECEL": "TSKCONNECT", "AIRTELTIGO_ISHARE": "MANUAL", ... }
  tskconnect: TskconnectConfig;
  customProviders?: Record<string, unknown>;
  [key: string]: any;
}

export interface ProviderDispatchResult {
  success: boolean;
  provider: ProviderType;
  providerReference?: string;
  status?: string;
  price?: number | string;
  error?: string;
  raw?: unknown;
}

export interface NumberVerificationResult {
  validNumbers: string[];
  invalidNumbers: string[];
  raw?: unknown;
}

export type TskconnectDisputeStatus =
  | "pending_resolution"
  | "confirmed_sent"
  | "resolved"
  | "refunded";

export interface TskconnectNotReceivedParams {
  reason?: string;
  note?: string;
  message?: string;
  entryNumber?: string;
  entryId?: string | number;
}

export interface TskconnectEvidenceData {
  type?: string;
  url?: string;
  proofImage?: string;
  carrierReference?: string;
  note?: string;
  deliveredAt?: string;
  uploadedAt?: string;
  [key: string]: any;
}

export interface TskconnectDisputeData {
  reportId?: string;
  orderId?: string;
  reference?: string | null;
  status: TskconnectDisputeStatus | string;
  reason?: string | null;
  message?: string | null;
  evidence?: string | TskconnectEvidenceData | null;
  carrierReference?: string | null;
  adminResponse?: string | null;
  createdAt?: string;
  resolvedAt?: string | null;
  [key: string]: any;
}
