export type Platform =
  | 'meta' | 'google' | 'tiktok' | 'linkedin' | 'twitter'
  | 'snapchat' | 'pinterest' | 'microsoft' | 'amazon' | 'dv360'
  | 'apple' | 'spotify' | 'reddit' | 'taboola';

export type CampaignObjective =
  | 'awareness' | 'traffic' | 'engagement' | 'leads'
  | 'conversions' | 'app_installs' | 'video_views' | 'catalog_sales';

export type CampaignStatus =
  | 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'archived' | 'error';

export type BidStrategy =
  | 'lowest_cost' | 'cost_cap' | 'bid_cap' | 'target_roas' | 'maximize_conversions';

export interface BudgetConfig {
  total: number;
  daily?: number;
  currency: string;
  type: 'lifetime' | 'daily';
}

export interface KPITarget {
  metric: string;       // 'cpa' | 'roas' | 'ctr' | 'cpc' | 'cpm'
  target: number;
  operator: '<' | '>' | '=';
}

export interface MetricsSnapshot {
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  spend: number;
  conversions: number;
  conversionValue: number;
  cpa: number;
  roas: number;
  leads: number;
  videoViews: number;
  engagement: number;
  frequency: number;
}

export interface Campaign {
  id: string;
  name: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  platforms: Platform[];
  budget: BudgetConfig;
  dateDebut: string;
  dateFin: string;
  clientId?: string;
  clientNom?: string;
  assignedTo: string;
  kpis: KPITarget[];
  tags: string[];
  notes: string;
  metrics?: MetricsSnapshot;
  dateCreation: string;
  bidStrategy: BidStrategy;
}

// Configs d'intégration API par plateforme
export interface PlatformConnector {
  platform: Platform;
  label: string;
  connected: boolean;
  accountId?: string;
  accountName?: string;
  lastSync?: string;
  color: string;       // hex color for badge
  icon: string;        // emoji ou initiales
}
