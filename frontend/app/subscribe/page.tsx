import { SubscribePilotPage } from '@/components/subscribe/SubscribePilotPage';
import { WaitlistGate } from '@/components/waitlist/WaitlistGate';

export default function WaitlistSubscribePage() {
  return (
    <WaitlistGate featureName="Scent Box">
      <SubscribePilotPage />
    </WaitlistGate>
  );
}
