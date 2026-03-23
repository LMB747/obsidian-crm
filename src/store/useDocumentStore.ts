import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DocType = 'facture' | 'devis' | 'contrat' | 'contrat_influenceur';
export type DocStatus = 'brouillon' | 'envoyé' | 'signé' | 'refusé';

export interface ServiceItemSaved {
  id: string;
  description: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
  tarif: string;
  offert: boolean;
}

export interface FormStateSaved {
  numero: string;
  date: string;
  echeance: string;
  validite: string;
  clientNom: string;
  clientEntreprise: string;
  clientSiret: string;
  clientAdresse: string;
  clientEmail: string;
  clientTel: string;
  clientRepresentant: string;
  projetNom: string;
  projetObjet: string;
  dateDebut: string;
  dateFin: string;
  tvaPercent: number;
  acomptePercent: number;
  acompteDejaVerse: boolean;
  dateAcompte: string;
  notes: string;
  influPlatformes?: string;
  influTypeContenu?: string;
  influNbPublications?: string;
  influDatesPublication?: string;
  influDroitsUtilisation?: string;
  influExclusivite?: string;
  influRemuneration?: string;
  influKpis?: string;
  influValidation?: string;
}

export interface SavedDocument {
  id: string;
  type: DocType;
  numero: string;
  status: DocStatus;
  clientId: string;
  clientNom: string;
  projectId?: string;
  formData: FormStateSaved;
  serviceItems: ServiceItemSaved[];
  freelancerIds: string[];
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
}

// ─── Counters ─────────────────────────────────────────────────────────────────

interface DocCounters {
  facture: number;
  devis: number;
  contrat: number;
  contrat_influenceur: number;
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface DocumentStore {
  documents: SavedDocument[];
  counters: DocCounters;

  // CRUD
  saveDocument: (doc: Omit<SavedDocument, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateDocument: (id: string, updates: Partial<SavedDocument>) => void;
  deleteDocument: (id: string) => void;
  duplicateDocument: (id: string) => string;

  // Counter
  getNextNumber: (type: DocType) => string;
  incrementCounter: (type: DocType) => void;
}

const PREFIX_MAP: Record<DocType, string> = {
  facture: 'FAC',
  devis: 'DEV',
  contrat: 'CTR',
  contrat_influenceur: 'INF',
};

export const useDocumentStore = create<DocumentStore>()(
  persist(
    (set, get) => ({
      documents: [],
      counters: { facture: 0, devis: 0, contrat: 0, contrat_influenceur: 0 },

      getNextNumber: (type) => {
        const year = new Date().getFullYear();
        const count = get().counters[type] + 1;
        return `${PREFIX_MAP[type]}-${year}-${String(count).padStart(3, '0')}`;
      },

      incrementCounter: (type) =>
        set((state) => ({
          counters: { ...state.counters, [type]: state.counters[type] + 1 },
        })),

      saveDocument: (doc) => {
        const id = uuidv4();
        const now = new Date().toISOString();
        const saved: SavedDocument = {
          ...doc,
          id,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          documents: [saved, ...state.documents],
          counters: { ...state.counters, [doc.type]: state.counters[doc.type] + 1 },
        }));
        return id;
      },

      updateDocument: (id, updates) =>
        set((state) => ({
          documents: state.documents.map((d) =>
            d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d
          ),
        })),

      deleteDocument: (id) =>
        set((state) => ({
          documents: state.documents.filter((d) => d.id !== id),
        })),

      duplicateDocument: (id) => {
        const { documents } = get();
        const orig = documents.find((d) => d.id === id);
        if (!orig) return '';
        const newId = uuidv4();
        const now = new Date().toISOString();
        const newDoc: SavedDocument = {
          ...orig,
          id: newId,
          numero: get().getNextNumber(orig.type),
          status: 'brouillon',
          createdAt: now,
          updatedAt: now,
          sentAt: undefined,
        };
        set((state) => ({
          documents: [newDoc, ...state.documents],
          counters: { ...state.counters, [orig.type]: state.counters[orig.type] + 1 },
        }));
        return newId;
      },
    }),
    {
      name: 'document-store-v1',
      partialize: (state) => ({
        documents: state.documents,
        counters: state.counters,
      }),
    }
  )
);
