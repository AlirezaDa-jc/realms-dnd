import { apiRequest } from '@/api/client';

export type CampaignRole = 'player' | 'dm';
export type Campaign = {
  id: string;
  name: string;
  description: string | null;
  dm_id: string;
  role: CampaignRole;
  member_count?: number;
  character_count?: number;
  combat_count?: number;
};

type Envelope<T> = { data: T };

export async function listCampaigns(): Promise<Campaign[]> {
  return (await apiRequest<Envelope<Campaign[]>>('/campaigns')).data;
}

export async function getCampaign(id: string): Promise<Campaign> {
  return (
    await apiRequest<Envelope<Campaign>>(`/campaigns/${encodeURIComponent(id)}`)
  ).data;
}

export async function createCampaign(
  name: string,
  description: string,
): Promise<Campaign> {
  return (
    await apiRequest<Envelope<Campaign>>('/campaigns', {
      method: 'POST',
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim(),
      }),
    })
  ).data;
}

export type CampaignInvite = {
  id: string;
  campaign_id: string;
  expires_at: string | null;
  max_uses: number | null;
  uses: number;
  created_at: string;
  code: string;
};

export async function createCampaignInvite(
  campaignId: string,
): Promise<CampaignInvite> {
  return (
    await apiRequest<Envelope<CampaignInvite>>(
      `/campaigns/${encodeURIComponent(campaignId)}/invites`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
    )
  ).data;
}

export async function joinCampaign(code: string): Promise<Campaign> {
  return (
    await apiRequest<Envelope<Campaign>>('/campaigns/join', {
      method: 'POST',
      body: JSON.stringify({ code: code.trim() }),
    })
  ).data;
}

export async function assignCharacter(
  campaignId: string,
  characterId: string,
): Promise<void> {
  await apiRequest(`/campaigns/${encodeURIComponent(campaignId)}/characters`, {
    method: 'POST',
    body: JSON.stringify({ characterId }),
  });
}
