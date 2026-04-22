import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface Job {
  id: string;
  status: string;
  assignedAgentId?: string | null;
  [key: string]: any;
}

interface Props {
  job: Job;
  agentId?: string;
  apiBase: string; // e.g. '/api/identity-agent'
  token: string;
  onChanged: () => void;
  onPicked?: () => void; // optional: called after a successful claim (e.g. to switch to "My Jobs" filter)
  onOpenUpdate?: (job: Job) => void; // optional: opens the per-dashboard status update modal
}

export function JobActionButtons({ job, agentId, apiBase, token, onChanged, onPicked, onOpenUpdate }: Props) {
  const { toast } = useToast();

  const call = async (action: 'claim' | 'release' | 'processing', successMsg: string, failMsg: string) => {
    try {
      const res = await fetch(`${apiBase}/requests/${job.id}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        toast({ title: successMsg, variant: 'success', description: data.message });
        if (action === 'claim' && onPicked) onPicked();
        onChanged();
      } else {
        toast({ title: failMsg, variant: 'destructive', description: data.message || 'Try again.' });
        onChanged();
      }
    } catch {
      toast({ title: 'Network error', variant: 'destructive', description: 'Please retry.' });
    }
  };

  const isMine = !!agentId && job.assignedAgentId === agentId;
  const isUnclaimed = job.status === 'pending' && !job.assignedAgentId;

  return (
    <>
      {isUnclaimed && (
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700"
          onClick={() => call('claim', 'Picked!', 'Could not pick')}
        >
          Pick Job
        </Button>
      )}
      {isMine && job.status === 'pickup' && (
        <>
          <Button size="sm" variant="outline" onClick={() => call('release', 'Released', 'Cannot release')}>
            Release
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => call('processing', 'Processing', 'Cannot mark processing')}
          >
            Mark Processing
          </Button>
        </>
      )}
      {isMine && onOpenUpdate && job.status !== 'completed' && job.status !== 'rejected' && (
        <Button
          size="sm"
          className="bg-purple-600 hover:bg-purple-700"
          onClick={() => onOpenUpdate(job)}
        >
          Update / Complete
        </Button>
      )}
    </>
  );
}
