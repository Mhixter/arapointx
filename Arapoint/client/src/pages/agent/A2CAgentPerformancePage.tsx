import { tokenStorage } from '@/lib/tokenStorage';
import AgentPerformancePage from './AgentPerformancePage';

export default function A2CAgentPerformancePage() {
  return (
    <AgentPerformancePage
      apiBase="/api/a2c-agent"
      getToken={() => tokenStorage.getItem('a2cAgentToken')}
      agentLabel="A2C Agent"
      backPath="/agent/a2c/dashboard"
    />
  );
}
