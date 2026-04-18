import { tokenStorage } from '@/lib/tokenStorage';
import AgentPerformancePage from './AgentPerformancePage';

export default function IdentityAgentPerformancePage() {
  return (
    <AgentPerformancePage
      apiBase="/api/identity-agent"
      getToken={() => tokenStorage.getItem('identityAgentToken')}
      agentLabel="Identity Agent"
      backPath="/agent/identity/dashboard"
    />
  );
}
