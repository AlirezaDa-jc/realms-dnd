import AppTabs from '@/components/app-tabs';
import CampaignBoundary from '@/components/campaigns/campaign-boundary';
export default function ModeLayout() {
  return (
    <CampaignBoundary mode="dm">
      <AppTabs mode="dm" />
    </CampaignBoundary>
  );
}
