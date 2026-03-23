import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Campaign, PlatformConnector } from '../types/mediaBuying';

interface MediaBuyingStore {
  campaigns: Campaign[];
  connectors: PlatformConnector[];

  addCampaign: (c: Omit<Campaign, 'id' | 'dateCreation'>) => void;
  updateCampaign: (id: string, updates: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;
  updateConnector: (platform: string, updates: Partial<PlatformConnector>) => void;
}

const defaultConnectors: PlatformConnector[] = [
  { platform: 'meta',      label: 'Meta Ads',       connected: false, color: '#1877F2', icon: 'M' },
  { platform: 'google',    label: 'Google Ads',      connected: false, color: '#EA4335', icon: 'G' },
  { platform: 'tiktok',    label: 'TikTok Ads',      connected: false, color: '#010101', icon: 'T' },
  { platform: 'linkedin',  label: 'LinkedIn Ads',    connected: false, color: '#0A66C2', icon: 'L' },
  { platform: 'twitter',   label: 'X (Twitter) Ads', connected: false, color: '#1D9BF0', icon: 'X' },
  { platform: 'snapchat',  label: 'Snapchat Ads',    connected: false, color: '#FFFC00', icon: 'S' },
  { platform: 'pinterest', label: 'Pinterest Ads',   connected: false, color: '#E60023', icon: 'P' },
  { platform: 'microsoft', label: 'Microsoft Ads',   connected: false, color: '#00A4EF', icon: 'Ms' },
  { platform: 'amazon',    label: 'Amazon Ads',      connected: false, color: '#FF9900', icon: 'A' },
  { platform: 'dv360',     label: 'DV360',           connected: false, color: '#4285F4', icon: 'D' },
  { platform: 'apple',     label: 'Apple Search Ads',connected: false, color: '#555555', icon: '' },
  { platform: 'spotify',   label: 'Spotify Ads',     connected: false, color: '#1DB954', icon: 'Sp' },
  { platform: 'reddit',    label: 'Reddit Ads',      connected: false, color: '#FF4500', icon: 'R' },
  { platform: 'taboola',   label: 'Taboola',         connected: false, color: '#1C6EAC', icon: 'Tb' },
];

const mockCampaigns: Campaign[] = [
  {
    id: uuidv4(),
    name: 'Black Friday 2025 — Meta',
    objective: 'conversions',
    status: 'active',
    platforms: ['meta'],
    budget: { total: 15000, daily: 500, currency: 'EUR', type: 'lifetime' },
    dateDebut: '2025-11-20',
    dateFin: '2025-12-05',
    clientId: 'client-001',
    clientNom: 'Maison Luxe Paris',
    assignedTo: 'Sophie Martin',
    kpis: [
      { metric: 'roas', target: 5, operator: '>' },
      { metric: 'cpa', target: 25, operator: '<' },
    ],
    tags: ['black-friday', 'ecommerce', 'retargeting'],
    notes: 'Campagne retargeting + prospection. Audiences lookalike 2-5%.',
    metrics: {
      impressions: 1_420_000,
      reach: 890_000,
      clicks: 28_400,
      ctr: 2.0,
      cpc: 0.38,
      cpm: 7.6,
      spend: 10_800,
      conversions: 432,
      conversionValue: 64_800,
      cpa: 25.0,
      roas: 6.0,
      leads: 0,
      videoViews: 0,
      engagement: 1_420,
      frequency: 1.6,
    },
    dateCreation: '2025-11-15',
    bidStrategy: 'target_roas',
  },
  {
    id: uuidv4(),
    name: 'Lead Gen B2B — LinkedIn',
    objective: 'leads',
    status: 'active',
    platforms: ['linkedin'],
    budget: { total: 8000, daily: 300, currency: 'EUR', type: 'lifetime' },
    dateDebut: '2026-01-10',
    dateFin: '2026-02-28',
    clientId: 'client-002',
    clientNom: 'TechVision SAS',
    assignedTo: 'Thomas Dupont',
    kpis: [
      { metric: 'cpl', target: 80, operator: '<' },
      { metric: 'ctr', target: 0.5, operator: '>' },
    ],
    tags: ['b2b', 'lead-gen', 'saas'],
    notes: 'Ciblage DG / DSI entreprises 50-500 salariés France.',
    metrics: {
      impressions: 520_000,
      reach: 380_000,
      clicks: 3_120,
      ctr: 0.6,
      cpc: 1.8,
      cpm: 10.8,
      spend: 5_600,
      conversions: 70,
      conversionValue: 35_000,
      cpa: 80.0,
      roas: 6.25,
      leads: 70,
      videoViews: 0,
      engagement: 420,
      frequency: 1.37,
    },
    dateCreation: '2026-01-05',
    bidStrategy: 'cost_cap',
  },
  {
    id: uuidv4(),
    name: 'Google Search — Ventes en ligne',
    objective: 'conversions',
    status: 'paused',
    platforms: ['google'],
    budget: { total: 6000, daily: 200, currency: 'EUR', type: 'daily' },
    dateDebut: '2026-02-01',
    dateFin: '2026-03-31',
    clientId: 'client-003',
    clientNom: 'E-Shop Mode',
    assignedTo: 'Sophie Martin',
    kpis: [
      { metric: 'roas', target: 4, operator: '>' },
      { metric: 'cpc', target: 0.8, operator: '<' },
    ],
    tags: ['search', 'pmax', 'shopping'],
    notes: 'Performance Max + Search. Extensions : sitelinks, prix, promotions.',
    metrics: {
      impressions: 680_000,
      reach: 680_000,
      clicks: 13_600,
      ctr: 2.0,
      cpc: 0.74,
      cpm: 14.7,
      spend: 4_100,
      conversions: 205,
      conversionValue: 16_400,
      cpa: 20.0,
      roas: 4.0,
      leads: 0,
      videoViews: 0,
      engagement: 0,
      frequency: 1.0,
    },
    dateCreation: '2026-01-28',
    bidStrategy: 'target_roas',
  },
  {
    id: uuidv4(),
    name: 'Awareness TikTok — Lancement Marque',
    objective: 'awareness',
    status: 'draft',
    platforms: ['tiktok', 'meta'],
    budget: { total: 3000, currency: 'EUR', type: 'lifetime' },
    dateDebut: '2026-04-01',
    dateFin: '2026-04-30',
    clientId: 'client-004',
    clientNom: 'Nova Beauty',
    assignedTo: 'Julie Bernard',
    kpis: [
      { metric: 'cpm', target: 8, operator: '<' },
      { metric: 'video_views', target: 100000, operator: '>' },
    ],
    tags: ['awareness', 'video', 'launch'],
    notes: 'Lancement nouvelle gamme skincare. Formats : TopView + In-Feed.',
    metrics: undefined,
    dateCreation: '2026-03-20',
    bidStrategy: 'lowest_cost',
  },
];

export const useMediaBuyingStore = create<MediaBuyingStore>()(
  persist(
    (set) => ({
      campaigns: mockCampaigns,
      connectors: defaultConnectors,

      addCampaign: (c) =>
        set((state) => ({
          campaigns: [
            ...state.campaigns,
            { ...c, id: uuidv4(), dateCreation: new Date().toISOString().slice(0, 10) },
          ],
        })),

      updateCampaign: (id, updates) =>
        set((state) => ({
          campaigns: state.campaigns.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),

      deleteCampaign: (id) =>
        set((state) => ({
          campaigns: state.campaigns.filter((c) => c.id !== id),
        })),

      updateConnector: (platform, updates) =>
        set((state) => ({
          connectors: state.connectors.map((conn) =>
            conn.platform === platform ? { ...conn, ...updates } : conn
          ),
        })),
    }),
    { name: 'media-buying-store' }
  )
);
