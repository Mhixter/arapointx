import { tokenStorage } from '@/lib/tokenStorage';
import AgentPerformancePage from './AgentPerformancePage';

export default function CACAgentPerformancePage() {
  return (
    <AgentPerformancePage
      apiBase="/api/cac-agent"
      getToken={() => tokenStorage.getItem('cacAgentToken')}
      agentLabel="CAC Agent"
      backPath="/agent/dashboard"
    />
  );
}
