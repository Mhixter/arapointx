import { tokenStorage } from '@/lib/tokenStorage';
import AgentPerformancePage from './AgentPerformancePage';

export default function EducationAgentPerformancePage() {
  return (
    <AgentPerformancePage
      apiBase="/api/education-agent"
      getToken={() => tokenStorage.getItem('educationAgentToken')}
      agentLabel="Education Agent"
      backPath="/agent/education/dashboard"
    />
  );
}
