const BASE = '/api/screening';

function getToken(): string | null {
  try { return localStorage.getItem('screeningToken'); } catch { return null; }
}

async function request(method: string, path: string, body?: any) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data.data ?? data;
}

export const screeningApi = {
  auth: {
    register: (body: any) => request('POST', '/auth/register', body),
    login: (body: any) => request('POST', '/auth/login', body),
    me: () => request('GET', '/auth/me'),
  },
  dashboard: {
    stats: () => request('GET', '/dashboard/stats'),
  },
  candidates: {
    list: (params?: { status?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.status) q.set('status', params.status);
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      return request('GET', `/candidates?${q}`);
    },
    create: (body: any) => request('POST', '/candidates', body),
    get: (id: string) => request('GET', `/candidates/${id}`),
  },
  bulk: {
    batches: () => request('GET', '/bulk/batches'),
    upload: (body: any) => request('POST', '/bulk/upload', body),
    getBatch: (id: string) => request('GET', `/bulk/${id}`),
  },
  analytics: () => request('GET', '/analytics'),
  fraud: () => request('GET', '/fraud'),
  billing: {
    get: () => request('GET', '/billing'),
    fund: (amount: number) => request('POST', '/billing/fund', { amount }),
    initiatePaystack: (amount: number) => request('POST', '/billing/paystack/initiate', { amount }),
    verifyPaystack: (reference: string) => request('GET', `/billing/paystack/verify/${reference}`),
  },
  team: {
    list: () => request('GET', '/team'),
    invite: (body: any) => request('POST', '/team/invite', body),
    updateRole: (userId: string, role: string) => request('PUT', `/team/${userId}/role`, { role }),
    remove: (userId: string) => request('DELETE', `/team/${userId}`),
  },
  notifications: {
    list: () => request('GET', '/notifications'),
    markRead: (id: string) => request('PUT', `/notifications/${id}/read`),
    markAllRead: () => request('PUT', '/notifications/read-all'),
  },
  settings: {
    update: (body: any) => request('PUT', '/settings', body),
  },
};

export function saveScreeningSession(token: string, org: any, user: any) {
  localStorage.setItem('screeningToken', token);
  localStorage.setItem('screeningOrg', JSON.stringify(org));
  localStorage.setItem('screeningUser', JSON.stringify(user));
}

export function clearScreeningSession() {
  localStorage.removeItem('screeningToken');
  localStorage.removeItem('screeningOrg');
  localStorage.removeItem('screeningUser');
}

export function getScreeningSession() {
  try {
    const token = localStorage.getItem('screeningToken');
    const org = JSON.parse(localStorage.getItem('screeningOrg') || 'null');
    const user = JSON.parse(localStorage.getItem('screeningUser') || 'null');
    return token && org ? { token, org, user } : null;
  } catch { return null; }
}

export function formatCurrency(amount: number | string): string {
  return `₦${Number(amount).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getDecisionColor(decision: string | null | undefined): string {
  if (decision === 'PASS') return 'text-green-600';
  if (decision === 'REVIEW') return 'text-yellow-600';
  if (decision === 'FAIL') return 'text-red-600';
  return 'text-gray-500';
}

export function getDecisionBg(decision: string | null | undefined): string {
  if (decision === 'PASS') return 'bg-green-100 text-green-700 border-green-200';
  if (decision === 'REVIEW') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  if (decision === 'FAIL') return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-gray-100 text-gray-600 border-gray-200';
}

export function getStatusBg(status: string | null | undefined): string {
  if (status === 'completed') return 'bg-green-100 text-green-700';
  if (status === 'processing') return 'bg-emerald-100 text-emerald-700';
  if (status === 'review') return 'bg-yellow-100 text-yellow-700';
  if (status === 'failed') return 'bg-red-100 text-red-700';
  if (status === 'manual_review') return 'bg-orange-100 text-orange-700';
  return 'bg-gray-100 text-gray-600';
}

export function getStatusLabel(status: string | null | undefined): string {
  if (status === 'completed') return 'Completed';
  if (status === 'processing') return 'In Progress';
  if (status === 'review') return 'Needs Review';
  if (status === 'failed') return 'Failed';
  if (status === 'manual_review') return 'Manual Review';
  if (status === 'pending') return 'Pending';
  return status || 'Unknown';
}

export const PRICING = { nin: 130, bvn: 80, education: 120, fraud: 20, total: 350 };
