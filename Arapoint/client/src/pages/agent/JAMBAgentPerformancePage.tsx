import { tokenStorage } from '@/lib/tokenStorage';
import AgentPerformancePage from './AgentPerformancePage';

export default function JAMBAgentPerformancePage() {
  return (
    <AgentPerformancePage
      apiBase="/api/jamb-agent"
      getToken={() => tokenStorage.getItem('jambAgentToken')}
      agentLabel="JAMB Agent"
      backPath="/jamb/agent/dashboard"
    />
  );
}
