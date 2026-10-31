import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ApiError } from '@/api/client';
import { getCampaign, type Campaign, type CampaignRole } from '@/api/campaigns';
import { useSession } from '@/auth/session-context';
import { loadSetting, saveSetting } from '@/database/settings-repository';

import {
  restoreCampaignSelection,
  type CampaignSelection as Selection,
} from './selection';

type CampaignContextValue = {
  mode: CampaignRole | null;
  campaign: Campaign | null;
  characterId: string | null;
  loading: boolean;
  chooseRole(mode: CampaignRole): void;
  selectCampaign(id: string): Promise<Campaign>;
  selectCharacter(id: string | null): void;
  clearCampaign(): void;
  revalidate(): Promise<void>;
};
const CampaignContext = createContext<CampaignContextValue | null>(null);
const storageKey = (userId: string) => `campaign-selection:${userId}`;

export function CampaignProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const userId = user?.id;
  const [selection, setSelection] = useState<Selection | null>(null);
  const [hydratedUserId, setHydratedUserId] = useState<string | undefined | null>(null);
  const generation = useRef(0);
  const previousUser = useRef<string | undefined>(undefined);
  const writes = useRef(Promise.resolve());

  // Serialize optional preference writes so an older selection cannot overwrite logout.
  const persist = useCallback((id: string, value: Selection | null) => {
    writes.current = writes.current
      .catch(() => {})
      .then(() => saveSetting(storageKey(id), JSON.stringify(value)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const request = ++generation.current;
    if (previousUser.current && previousUser.current !== userId) {
      persist(previousUser.current, null);
    }
    previousUser.current = userId;
    async function restore() {
      if (!userId) return null;
      const saved = await loadSetting(storageKey(userId));
      const value: unknown = saved ? JSON.parse(saved) : null;
      const restored = await restoreCampaignSelection(
        value,
        userId,
        getCampaign,
      );
      return restored;
    }
    void restore()
      .catch(() => null)
      .then(restored => { if (generation.current === request) setSelection(restored); })
      .finally(() => {
        if (generation.current === request) setHydratedUserId(userId);
      });
    return () => {
      generation.current++;
    };
  }, [userId, persist]);

  const loading = hydratedUserId !== userId;
  const current = !loading && selection?.userId === userId ? selection : null;
  const update = useCallback(
    (value: Selection) => {
      setSelection(value);
      persist(value.userId, value);
    },
    [persist],
  );

  const clearCampaign = useCallback(() => {
    generation.current++;
    if (userId)
      update({
        userId,
        mode: current?.mode ?? null,
        campaign: null,
        characterId: null,
      });
  }, [userId, current?.mode, update]);

  const revalidate = useCallback(async () => {
    if (!current?.campaign || !userId) return;
    const request = generation.current;
    try {
      const campaign = await getCampaign(current.campaign.id);
      if (generation.current !== request) return;
      if (campaign.role !== current.mode) {
        clearCampaign();
        throw new Error(
          'Your role in this campaign has changed. Choose a campaign again.',
        );
      }
    } catch (error) {
      if (
        generation.current === request &&
        error instanceof ApiError &&
        [401, 403, 404].includes(error.status)
      ) {
        clearCampaign();
      }
      throw error;
    }
  }, [current?.campaign?.id, current?.mode, userId, clearCampaign]);

  async function selectCampaign(id: string) {
    if (!userId || !current?.mode)
      throw new Error('Choose Player or Dungeon Master first.');
    const request = ++generation.current;
    const campaign = await getCampaign(id);
    if (request !== generation.current)
      throw new Error('The selection changed. Please try again.');
    if (campaign.role !== current.mode)
      throw new Error('This campaign is not available in this mode.');
    update({
      userId,
      mode: current.mode,
      campaign,
      characterId: current.campaign?.id === id ? current.characterId : null,
    });
    return campaign;
  }

  return (
    <CampaignContext.Provider
      value={{
        mode: current?.mode ?? null,
        campaign: current?.campaign ?? null,
        characterId: current?.characterId ?? null,
        loading,
        chooseRole(mode) {
          generation.current++;
          if (userId)
            update(
              current?.mode === mode
                ? current
                : { userId, mode, campaign: null, characterId: null },
            );
        },
        selectCampaign,
        selectCharacter(characterId) {
          if (current) update({ ...current, characterId });
        },
        clearCampaign,
        revalidate,
      }}
    >
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaign() {
  const value = useContext(CampaignContext);
  if (!value)
    throw new Error('useCampaign must be used inside CampaignProvider.');
  return value;
}
