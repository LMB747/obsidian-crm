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


export const useMediaBuyingStore = create<MediaBuyingStore>()(
  persist(
    (set) => ({
      campaigns: [],
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
    { name: 'media-buying-store', version: 2 }
  )
);
