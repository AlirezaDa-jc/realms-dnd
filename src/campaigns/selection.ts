import type { Campaign, CampaignRole } from '@/api/campaigns';

export type CampaignSelection = {
  userId: string;
  mode: CampaignRole | null;
  campaign: Campaign | null;
  characterId: string | null;
};

export function campaignsForRole(
  campaigns: Campaign[],
  mode: CampaignRole | null,
): Campaign[] {
  return campaigns.filter((campaign) => campaign.role === mode);
}

export async function restoreCampaignSelection(
  value: unknown,
  userId: string,
  fetchCampaign: (id: string) => Promise<Campaign>,
): Promise<CampaignSelection | null> {
  if (!value || typeof value !== 'object') return null;
  const stored = value as Partial<CampaignSelection>;
  if (
    stored.userId !== userId ||
    (stored.mode !== 'dm' && stored.mode !== 'player')
  )
    return null;
  const id = stored.campaign?.id;
  if (id !== undefined && typeof id !== 'string') return null;
  const campaign = id ? await fetchCampaign(id) : null;
  if (campaign && (campaign.id !== id || campaign.role !== stored.mode))
    return null;
  return {
    userId,
    mode: stored.mode,
    campaign,
    characterId:
      typeof stored.characterId === 'string' ? stored.characterId : null,
  };
}

export function assertCombatCampaign(
  combatCampaignId: string | null | undefined,
  activeCampaignId: string | undefined,
): void {
  if (!activeCampaignId || combatCampaignId !== activeCampaignId) {
    throw new Error('This combat does not belong to the selected campaign.');
  }
}
