import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { tokenStorage } from "@/lib/tokenStorage";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Search, Loader2, Users, Receipt, Package, LifeBuoy, Cpu,
  ArrowRight, User, Mail, Phone, Wallet, Calendar, Hash,
  Tag, RefreshCw, AlertCircle, ShieldCheck, ExternalLink,
  FileText, Clock, AlertTriangle, CheckCircle, XCircle,
  CreditCard, Banknote, BookOpen, GraduationCap, Info,
} from "lucide-react";

type ResultType = 'user' | 'transaction' | 'identity' | 'education' | 'jamb' | 'ticket' | 'rpa';

interface SelectedItem {
  type: ResultType;
  data: any;
}

function statusColor(status: string) {
  switch (status?.toLowerCase()) {
    case 'completed': case 'success': case 'verified': case 'active': return 'bg-green-100 text-green-800 border-green-200';
    case 'pending': case 'processing': case 'open': case 'assigned': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'failed': case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
    case 'suspended': return 'bg-red-100 text-red-800 border-red-200';
    case 'resolved': case 'closed': return 'bg-slate-100 text-slate-600 border-slate-200';
    case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
    default: return 'bg-blue-100 text-blue-800 border-blue-200';
  }
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-NG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtAmount(a: string | number | null | undefined) {
  if (a === null || a === undefined) return '—';
  return `₦${parseFloat(String(a)).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
}

function truncateId(id: string) {
  if (!id) return '—';
  if (id.length <= 16) return id;
  return `${id.slice(0, 8)}…${id.slice(-6)}`;
}

function highlight(text: string, query: string) {
  if (!query || !text) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-yellow-900 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ── Detail Field Components ──────────────────────────────────────────────────

function DetailRow({ label, value, mono = false, className = '' }: { label: string; value?: string | null | boolean | number; mono?: boolean; className?: string }) {
  const display = value === null || value === undefined || value === '' ? '—'
    : typeof value === 'boolean' ? (value ? 'Yes' : 'No')
    : String(value);
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className={`text-sm text-foreground break-all ${mono ? 'font-mono text-xs' : ''}`}>{display}</span>
    </div>
  );
}

function DetailSection({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      {title && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  return <span className={`inline-flex items-center text-[11px] border rounded-full px-2.5 py-0.5 font-semibold ${statusColor(status)}`}>{status?.replace(/_/g, ' ')}</span>;
}

// ── Detail Modals ────────────────────────────────────────────────────────────

function UserDetail({ data, navigate, onClose }: { data: any; navigate: any; onClose: () => void }) {
  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <DialogTitle className="text-base">{data.name}</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{data.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <StatusPill status={data.kycStatus} />
          {data.isSuspended && <StatusPill status="suspended" />}
          {data.emailVerified && <span className="inline-flex items-center gap-1 text-[11px] border rounded-full px-2.5 py-0.5 font-semibold bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-3 w-3" />Email Verified</span>}
        </div>
      </DialogHeader>
      <Separator />
      <div className="space-y-4 overflow-y-auto max-h-[55vh] pr-1">
        <DetailSection title="Account Info">
          <DetailRow label="Full Name" value={data.name} />
          <DetailRow label="Email" value={data.email} />
          <DetailRow label="Phone" value={data.phone} />
          <DetailRow label="Wallet Balance" value={fmtAmount(data.walletBalance)} />
          <DetailRow label="KYC Status" value={data.kycStatus} />
          <DetailRow label="Email Verified" value={data.emailVerified} />
        </DetailSection>
        <Separator />
        <DetailSection title="Identity">
          <DetailRow label="BVN" value={data.bvn} mono />
          <DetailRow label="NIN" value={data.nin} mono />
        </DetailSection>
        <Separator />
        <DetailSection title="Account Status">
          <DetailRow label="Suspended" value={data.isSuspended} />
          <DetailRow label="Suspend Reason" value={data.suspendReason} className="col-span-2" />
        </DetailSection>
        <Separator />
        <DetailSection title="Timestamps">
          <DetailRow label="Registered" value={fmtDate(data.createdAt)} />
          <DetailRow label="Last Updated" value={fmtDate(data.updatedAt)} />
          <DetailRow label="User ID" value={data.id} mono className="col-span-2" />
        </DetailSection>
      </div>
      <div className="flex gap-2 pt-2">
        <Button className="flex-1" onClick={() => { navigate(`/admin/users?search=${encodeURIComponent(data.email)}`); onClose(); }}>
          <ExternalLink className="h-4 w-4 mr-2" />View in User Management
        </Button>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </>
  );
}

function TransactionDetail({ data, navigate, onClose }: { data: any; navigate: any; onClose: () => void }) {
  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Receipt className="h-5 w-5 text-primary" />
          </div>
          <div>
            <DialogTitle className="text-base capitalize">{data.transactionType?.replace(/_/g, ' ')}</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">{data.referenceId || truncateId(data.id)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <StatusPill status={data.status} />
          <span className="text-lg font-bold text-foreground">{fmtAmount(data.amount)}</span>
        </div>
      </DialogHeader>
      <Separator />
      <div className="space-y-4 overflow-y-auto max-h-[55vh] pr-1">
        <DetailSection title="Transaction Details">
          <DetailRow label="Type" value={data.transactionType?.replace(/_/g, ' ')} />
          <DetailRow label="Amount" value={fmtAmount(data.amount)} />
          <DetailRow label="Status" value={data.status} />
          <DetailRow label="Payment Method" value={data.paymentMethod} />
          <DetailRow label="Reference ID" value={data.referenceId} mono />
          <DetailRow label="Description" value={data.description} className="col-span-2" />
        </DetailSection>
        <Separator />
        <DetailSection title="Metadata">
          <DetailRow label="Transaction ID" value={data.id} mono className="col-span-2" />
          <DetailRow label="User ID" value={data.userId} mono className="col-span-2" />
          <DetailRow label="Date" value={fmtDate(data.createdAt)} />
          <DetailRow label="Updated" value={fmtDate(data.updatedAt)} />
        </DetailSection>
      </div>
      <div className="flex gap-2 pt-2">
        <Button className="flex-1" onClick={() => { navigate(`/admin/transactions?search=${encodeURIComponent(data.referenceId || data.id)}`); onClose(); }}>
          <ExternalLink className="h-4 w-4 mr-2" />View in Transactions
        </Button>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </>
  );
}

function IdentityOrderDetail({ data, navigate, onClose }: { data: any; navigate: any; onClose: () => void }) {
  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <DialogTitle className="text-base font-mono">{data.trackingId}</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5 capitalize">{data.serviceType?.replace(/_/g, ' ')} · Identity Service</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <StatusPill status={data.status} />
          {data.isPaid && <span className="inline-flex items-center gap-1 text-[11px] border rounded-full px-2.5 py-0.5 font-semibold bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-3 w-3" />Paid</span>}
        </div>
      </DialogHeader>
      <Separator />
      <div className="space-y-4 overflow-y-auto max-h-[55vh] pr-1">
        <DetailSection title="Request Info">
          <DetailRow label="Tracking ID" value={data.trackingId} mono />
          <DetailRow label="Service Type" value={data.serviceType?.replace(/_/g, ' ')} />
          <DetailRow label="Status" value={data.status} />
          <DetailRow label="NIN" value={data.nin} mono />
          <DetailRow label="Service Address" value={data.serviceAddress} className="col-span-2" />
          <DetailRow label="Customer Notes" value={data.customerNotes} className="col-span-2" />
        </DetailSection>
        <Separator />
        <DetailSection title="Payment">
          <DetailRow label="Fee" value={fmtAmount(data.fee)} />
          <DetailRow label="Paid" value={data.isPaid} />
          <DetailRow label="Payment Reference" value={data.paymentReference} mono />
        </DetailSection>
        <Separator />
        <DetailSection title="Result">
          <DetailRow label="Validated Full Name" value={data.validatedFullName} />
          <DetailRow label="Validated DOB" value={data.validatedDateOfBirth} />
          <DetailRow label="Resolved Tracking ID" value={data.resolvedTrackingId} mono />
          <DetailRow label="Agent Notes" value={data.agentNotes} className="col-span-2" />
          {data.slipUrl && (
            <div className="col-span-2">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Slip URL</span>
              <a href={data.slipUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline block truncate">{data.slipUrl}</a>
            </div>
          )}
        </DetailSection>
        <Separator />
        <DetailSection title="Timestamps">
          <DetailRow label="Created" value={fmtDate(data.createdAt)} />
          <DetailRow label="Completed" value={fmtDate(data.completedAt)} />
          <DetailRow label="Updated" value={fmtDate(data.updatedAt)} />
          <DetailRow label="User ID" value={data.userId} mono className="col-span-2" />
          <DetailRow label="Request ID" value={data.id} mono className="col-span-2" />
        </DetailSection>
      </div>
      <div className="flex gap-2 pt-2">
        <Button className="flex-1" onClick={() => { navigate('/admin/identity'); onClose(); }}>
          <ExternalLink className="h-4 w-4 mr-2" />View in Identity Services
        </Button>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </>
  );
}

function EduOrderDetail({ data, navigate, onClose }: { data: any; navigate: any; onClose: () => void }) {
  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <DialogTitle className="text-base font-mono">{data.trackingId}</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5 capitalize">{data.serviceType?.replace(/_/g, ' ')} · Education Service</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <StatusPill status={data.status} />
          {data.isPaid && <span className="inline-flex items-center gap-1 text-[11px] border rounded-full px-2.5 py-0.5 font-semibold bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-3 w-3" />Paid</span>}
        </div>
      </DialogHeader>
      <Separator />
      <div className="space-y-4 overflow-y-auto max-h-[55vh] pr-1">
        <DetailSection title="Request Info">
          <DetailRow label="Tracking ID" value={data.trackingId} mono />
          <DetailRow label="Service Type" value={data.serviceType?.replace(/_/g, ' ')} />
          <DetailRow label="Status" value={data.status} />
          <DetailRow label="Exam Year" value={data.examYear} />
          <DetailRow label="Registration Number" value={data.registrationNumber} mono />
          <DetailRow label="Candidate Name" value={data.candidateName} />
          <DetailRow label="Customer Notes" value={data.customerNotes} className="col-span-2" />
        </DetailSection>
        <Separator />
        <DetailSection title="Payment">
          <DetailRow label="Fee" value={fmtAmount(data.fee)} />
          <DetailRow label="Paid" value={data.isPaid} />
          <DetailRow label="Payment Reference" value={data.paymentReference} mono />
        </DetailSection>
        <Separator />
        <DetailSection title="Result">
          <DetailRow label="Agent Notes" value={data.agentNotes} className="col-span-2" />
          {data.resultUrl && (
            <div className="col-span-2">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Result URL</span>
              <a href={data.resultUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline block truncate">{data.resultUrl}</a>
            </div>
          )}
        </DetailSection>
        <Separator />
        <DetailSection title="Timestamps">
          <DetailRow label="Created" value={fmtDate(data.createdAt)} />
          <DetailRow label="Completed" value={fmtDate(data.completedAt)} />
          <DetailRow label="Updated" value={fmtDate(data.updatedAt)} />
          <DetailRow label="User ID" value={data.userId} mono className="col-span-2" />
          <DetailRow label="Request ID" value={data.id} mono className="col-span-2" />
        </DetailSection>
      </div>
      <div className="flex gap-2 pt-2">
        <Button className="flex-1" onClick={() => { navigate('/admin/education'); onClose(); }}>
          <ExternalLink className="h-4 w-4 mr-2" />View in Education Services
        </Button>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </>
  );
}

function JambOrderDetail({ data, navigate, onClose }: { data: any; navigate: any; onClose: () => void }) {
  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <DialogTitle className="text-base font-mono">{data.trackingId}</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5 capitalize">{data.serviceType?.replace(/_/g, ' ')} · JAMB Service</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <StatusPill status={data.status} />
          {data.isPaid && <span className="inline-flex items-center gap-1 text-[11px] border rounded-full px-2.5 py-0.5 font-semibold bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-3 w-3" />Paid</span>}
        </div>
      </DialogHeader>
      <Separator />
      <div className="space-y-4 overflow-y-auto max-h-[55vh] pr-1">
        <DetailSection title="Request Info">
          <DetailRow label="Tracking ID" value={data.trackingId} mono />
          <DetailRow label="Service Type" value={data.serviceType?.replace(/_/g, ' ')} />
          <DetailRow label="Status" value={data.status} />
          <DetailRow label="Exam Year" value={data.examYear} />
          <DetailRow label="Registration Number" value={data.registrationNumber} mono />
          <DetailRow label="Candidate Name" value={data.candidateName} />
          <DetailRow label="Customer Notes" value={data.customerNotes} className="col-span-2" />
        </DetailSection>
        <Separator />
        <DetailSection title="Payment">
          <DetailRow label="Fee" value={fmtAmount(data.fee)} />
          <DetailRow label="Paid" value={data.isPaid} />
          <DetailRow label="Payment Reference" value={data.paymentReference} mono />
        </DetailSection>
        <Separator />
        <DetailSection title="Result">
          <DetailRow label="Agent Notes" value={data.agentNotes} className="col-span-2" />
          {data.resultUrl && (
            <div className="col-span-2">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Result URL</span>
              <a href={data.resultUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline block truncate">{data.resultUrl}</a>
            </div>
          )}
          {data.requestData && (
            <div className="col-span-2">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Request Data</span>
              <pre className="text-xs bg-muted rounded p-2 mt-1 overflow-x-auto max-h-24">{JSON.stringify(data.requestData, null, 2)}</pre>
            </div>
          )}
        </DetailSection>
        <Separator />
        <DetailSection title="Timestamps">
          <DetailRow label="Created" value={fmtDate(data.createdAt)} />
          <DetailRow label="Completed" value={fmtDate(data.completedAt)} />
          <DetailRow label="Updated" value={fmtDate(data.updatedAt)} />
          <DetailRow label="User ID" value={data.userId} mono className="col-span-2" />
          <DetailRow label="Request ID" value={data.id} mono className="col-span-2" />
        </DetailSection>
      </div>
      <div className="flex gap-2 pt-2">
        <Button className="flex-1" onClick={() => { navigate('/admin/education'); onClose(); }}>
          <ExternalLink className="h-4 w-4 mr-2" />View in Education Services
        </Button>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </>
  );
}

function TicketDetail({ data, navigate, onClose }: { data: any; navigate: any; onClose: () => void }) {
  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <LifeBuoy className="h-5 w-5 text-primary" />
          </div>
          <div>
            <DialogTitle className="text-base">{data.subject}</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">{data.referenceId}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <StatusPill status={data.status} />
          {data.priority && data.priority !== 'medium' && <StatusPill status={data.priority} />}
          {data.category && <span className="inline-flex text-[11px] border rounded-full px-2.5 py-0.5 font-semibold bg-slate-100 text-slate-700 border-slate-200 capitalize">{data.category}</span>}
        </div>
      </DialogHeader>
      <Separator />
      <div className="space-y-4 overflow-y-auto max-h-[55vh] pr-1">
        <DetailSection title="Ticket Info">
          <DetailRow label="Reference" value={data.referenceId} mono />
          <DetailRow label="Subject" value={data.subject} className="col-span-2" />
          <DetailRow label="Status" value={data.status?.replace(/_/g, ' ')} />
          <DetailRow label="Priority" value={data.priority} />
          <DetailRow label="Category" value={data.category} />
          <DetailRow label="Department Tag" value={data.departmentTag} />
        </DetailSection>
        <Separator />
        <DetailSection title="Linked Order">
          <DetailRow label="Linked Order ID" value={data.linkedOrderId} mono />
          <DetailRow label="Order Type" value={data.linkedOrderType} />
        </DetailSection>
        <Separator />
        <DetailSection title="Timestamps">
          <DetailRow label="Created" value={fmtDate(data.createdAt)} />
          <DetailRow label="Last Activity" value={fmtDate(data.lastActivityAt)} />
          <DetailRow label="Assigned At" value={fmtDate(data.assignedAt)} />
          <DetailRow label="Escalated At" value={fmtDate(data.escalatedAt)} />
          <DetailRow label="Resolved At" value={fmtDate(data.resolvedAt)} />
          <DetailRow label="Closed At" value={fmtDate(data.closedAt)} />
          <DetailRow label="User ID" value={data.userId} mono className="col-span-2" />
          <DetailRow label="Ticket ID" value={data.id} mono className="col-span-2" />
        </DetailSection>
      </div>
      <div className="flex gap-2 pt-2">
        <Button className="flex-1" onClick={() => { navigate('/admin/support'); onClose(); }}>
          <ExternalLink className="h-4 w-4 mr-2" />View in Support
        </Button>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </>
  );
}

function RpaDetail({ data, navigate, onClose }: { data: any; navigate: any; onClose: () => void }) {
  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Cpu className="h-5 w-5 text-primary" />
          </div>
          <div>
            <DialogTitle className="text-base capitalize">{data.serviceType?.replace(/_/g, ' ')}</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">{truncateId(data.id)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <StatusPill status={data.status} />
          <span className="text-[11px] border rounded-full px-2.5 py-0.5 font-semibold bg-slate-100 text-slate-700 border-slate-200">
            Priority {data.priority ?? 0}
          </span>
        </div>
      </DialogHeader>
      <Separator />
      <div className="space-y-4 overflow-y-auto max-h-[55vh] pr-1">
        <DetailSection title="Job Info">
          <DetailRow label="Service Type" value={data.serviceType?.replace(/_/g, ' ')} />
          <DetailRow label="Status" value={data.status} />
          <DetailRow label="Retries" value={`${data.retryCount ?? 0} / ${data.maxRetries ?? 3}`} />
          <DetailRow label="Priority" value={data.priority ?? 0} />
        </DetailSection>
        {data.errorMessage && (
          <>
            <Separator />
            <div>
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Error Message</span>
              <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 break-all">{data.errorMessage}</div>
            </div>
          </>
        )}
        {data.queryData && (
          <>
            <Separator />
            <div>
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Query Data (Input)</span>
              <pre className="text-xs bg-muted rounded p-2 mt-1 overflow-x-auto max-h-32">{JSON.stringify(data.queryData, null, 2)}</pre>
            </div>
          </>
        )}
        {data.result && (
          <>
            <Separator />
            <div>
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Result Data</span>
              <pre className="text-xs bg-muted rounded p-2 mt-1 overflow-x-auto max-h-32">{JSON.stringify(data.result, null, 2)}</pre>
            </div>
          </>
        )}
        <Separator />
        <DetailSection title="Timestamps">
          <DetailRow label="Created" value={fmtDate(data.createdAt)} />
          <DetailRow label="Started" value={fmtDate(data.startedAt)} />
          <DetailRow label="Completed" value={fmtDate(data.completedAt)} />
          <DetailRow label="User ID" value={data.userId} mono className="col-span-2" />
          <DetailRow label="Job ID" value={data.id} mono className="col-span-2" />
        </DetailSection>
      </div>
      <div className="flex gap-2 pt-2">
        <Button className="flex-1" onClick={() => { navigate('/admin/rpa-jobs'); onClose(); }}>
          <ExternalLink className="h-4 w-4 mr-2" />View in RPA Monitor
        </Button>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </>
  );
}

// ── Detail Dialog Wrapper ────────────────────────────────────────────────────

function DetailDialog({ item, onClose, navigate }: { item: SelectedItem | null; onClose: () => void; navigate: any }) {
  if (!item) return null;
  const { type, data } = item;
  return (
    <Dialog open={!!item} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg w-full max-h-[90vh] flex flex-col gap-4 overflow-hidden">
        {type === 'user' && <UserDetail data={data} navigate={navigate} onClose={onClose} />}
        {type === 'transaction' && <TransactionDetail data={data} navigate={navigate} onClose={onClose} />}
        {type === 'identity' && <IdentityOrderDetail data={data} navigate={navigate} onClose={onClose} />}
        {type === 'education' && <EduOrderDetail data={data} navigate={navigate} onClose={onClose} />}
        {type === 'jamb' && <JambOrderDetail data={data} navigate={navigate} onClose={onClose} />}
        {type === 'ticket' && <TicketDetail data={data} navigate={navigate} onClose={onClose} />}
        {type === 'rpa' && <RpaDetail data={data} navigate={navigate} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

// ── Result Cards ─────────────────────────────────────────────────────────────

function ResultCard({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <Card className="hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group" onClick={onClick}>
      <CardContent className="p-3 sm:p-4">{children}</CardContent>
    </Card>
  );
}

function SectionHeader({ icon: Icon, title, count, href, navigate }: { icon: any; title: string; count: number; href?: string; navigate: any }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold flex items-center gap-1.5">
        <Icon className="h-4 w-4 text-primary" />
        {title}
        <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-1">{count}</Badge>
      </h3>
      {href && (
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate(href)}>
          View all <ArrowRight className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

function UserSection({ users, query, onSelect }: { users: any[]; query: string; onSelect: (item: SelectedItem) => void }) {
  return (
    <div>
      <SectionHeader icon={Users} title="Users" count={users.length} href="/admin/users" navigate={() => {}} />
      <div className="space-y-2">
        {users.map(u => (
          <ResultCard key={u.id} onClick={() => onSelect({ type: 'user', data: u })}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{highlight(u.name, query)}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{highlight(u.email, query)}</span>
                    {u.phone && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{highlight(u.phone, query)}</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Wallet className="h-3 w-3" />{fmtAmount(u.walletBalance)}</span>
                    <span className={`text-[10px] border rounded-full px-2 py-0.5 font-medium ${statusColor(u.kycStatus)}`}>{u.kycStatus}</span>
                    {u.isSuspended && <span className={`text-[10px] border rounded-full px-2 py-0.5 font-medium ${statusColor('suspended')}`}>Suspended</span>}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end"><Calendar className="h-3 w-3" />{fmtDate(u.createdAt)}</p>
                <p className="text-[10px] text-primary font-medium mt-2 group-hover:underline">View details →</p>
              </div>
            </div>
          </ResultCard>
        ))}
      </div>
    </div>
  );
}

function TxSection({ txs, query, onSelect }: { txs: any[]; query: string; onSelect: (item: SelectedItem) => void }) {
  return (
    <div>
      <SectionHeader icon={Receipt} title="Transactions" count={txs.length} navigate={() => {}} />
      <div className="space-y-2">
        {txs.map(tx => (
          <ResultCard key={tx.id} onClick={() => onSelect({ type: 'transaction', data: tx })}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Receipt className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold capitalize">{tx.transactionType?.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{tx.description || 'No description'}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5 items-center">
                    <span className="text-sm font-bold">{fmtAmount(tx.amount)}</span>
                    {tx.referenceId && <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono"><Hash className="h-3 w-3" />{highlight(tx.referenceId, query)}</span>}
                    {tx.paymentMethod && <span className="text-[10px] text-muted-foreground capitalize">{tx.paymentMethod}</span>}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-[10px] border rounded-full px-2 py-0.5 font-medium ${statusColor(tx.status)}`}>{tx.status}</span>
                <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 justify-end"><Calendar className="h-3 w-3" />{fmtDate(tx.createdAt)}</p>
                <p className="text-[10px] text-primary font-medium mt-1 group-hover:underline">View details →</p>
              </div>
            </div>
          </ResultCard>
        ))}
      </div>
    </div>
  );
}

function OrderSection({ identity, edu, jamb, query, onSelect }: {
  identity: any[]; edu: any[]; jamb: any[]; query: string; onSelect: (item: SelectedItem) => void;
}) {
  const total = identity.length + edu.length + jamb.length;
  return (
    <div>
      <SectionHeader icon={Package} title="Orders" count={total} navigate={() => {}} />
      <div className="space-y-2">
        {identity.map(o => (
          <ResultCard key={o.id} onClick={() => onSelect({ type: 'identity', data: o })}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold font-mono">{highlight(o.trackingId, query)}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">{o.serviceType?.replace(/_/g, ' ')} · Identity</p>
                  {(o.validatedFullName || o.nin) && <p className="text-xs text-muted-foreground mt-0.5">{highlight(o.validatedFullName || o.nin, query)}</p>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-[10px] border rounded-full px-2 py-0.5 font-medium ${statusColor(o.status)}`}>{o.status}</span>
                <p className="text-[10px] text-primary font-medium mt-2 group-hover:underline">View details →</p>
              </div>
            </div>
          </ResultCard>
        ))}
        {edu.map(o => (
          <ResultCard key={o.id} onClick={() => onSelect({ type: 'education', data: o })}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <GraduationCap className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold font-mono">{highlight(o.trackingId, query)}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">{o.serviceType?.replace(/_/g, ' ')} · Education</p>
                  {(o.candidateName || o.registrationNumber) && <p className="text-xs text-muted-foreground mt-0.5">{highlight(o.candidateName || o.registrationNumber, query)}</p>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-[10px] border rounded-full px-2 py-0.5 font-medium ${statusColor(o.status)}`}>{o.status}</span>
                <p className="text-[10px] text-primary font-medium mt-2 group-hover:underline">View details →</p>
              </div>
            </div>
          </ResultCard>
        ))}
        {jamb.map(o => (
          <ResultCard key={o.id} onClick={() => onSelect({ type: 'jamb', data: o })}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold font-mono">{highlight(o.trackingId, query)}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">{o.serviceType?.replace(/_/g, ' ')} · JAMB</p>
                  {(o.candidateName || o.registrationNumber) && <p className="text-xs text-muted-foreground mt-0.5">{highlight(o.candidateName || o.registrationNumber, query)}</p>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-[10px] border rounded-full px-2 py-0.5 font-medium ${statusColor(o.status)}`}>{o.status}</span>
                <p className="text-[10px] text-primary font-medium mt-2 group-hover:underline">View details →</p>
              </div>
            </div>
          </ResultCard>
        ))}
      </div>
    </div>
  );
}

function TicketSection({ tickets, query, onSelect }: { tickets: any[]; query: string; onSelect: (item: SelectedItem) => void }) {
  return (
    <div>
      <SectionHeader icon={LifeBuoy} title="Support Tickets" count={tickets.length} navigate={() => {}} />
      <div className="space-y-2">
        {tickets.map(t => (
          <ResultCard key={t.id} onClick={() => onSelect({ type: 'ticket', data: t })}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <LifeBuoy className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{highlight(t.subject, query)}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1 items-center">
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono"><Hash className="h-3 w-3" />{highlight(t.referenceId, query)}</span>
                    {t.category && <span className="flex items-center gap-1 text-[11px] text-muted-foreground capitalize"><Tag className="h-3 w-3" />{t.category}</span>}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-[10px] border rounded-full px-2 py-0.5 font-medium ${statusColor(t.status)}`}>{t.status?.replace(/_/g, ' ')}</span>
                <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 justify-end"><Calendar className="h-3 w-3" />{fmtDate(t.createdAt)}</p>
                <p className="text-[10px] text-primary font-medium mt-1 group-hover:underline">View details →</p>
              </div>
            </div>
          </ResultCard>
        ))}
      </div>
    </div>
  );
}

function RpaSection({ jobs, query, onSelect }: { jobs: any[]; query: string; onSelect: (item: SelectedItem) => void }) {
  return (
    <div>
      <SectionHeader icon={Cpu} title="RPA Jobs" count={jobs.length} navigate={() => {}} />
      <div className="space-y-2">
        {jobs.map(j => (
          <ResultCard key={j.id} onClick={() => onSelect({ type: 'rpa', data: j })}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Cpu className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold capitalize">{j.serviceType?.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{highlight(j.id, query)}</p>
                  {j.errorMessage && <p className="text-xs text-red-600 mt-0.5 truncate">{j.errorMessage}</p>}
                  <p className="text-[11px] text-muted-foreground mt-0.5">Retry {j.retryCount}/{j.maxRetries ?? 3}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-[10px] border rounded-full px-2 py-0.5 font-medium ${statusColor(j.status)}`}>{j.status}</span>
                <p className="text-[10px] text-primary font-medium mt-2 group-hover:underline">View details →</p>
              </div>
            </div>
          </ResultCard>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AdminSearch() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [totals, setTotals] = useState<any>(null);
  const [searchedQuery, setSearchedQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const totalCount = totals ? totals.users + totals.transactions + totals.orders + totals.supportTickets + totals.rpaJobs : 0;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q && q.length >= 2) {
      setQuery(q);
      setTimeout(() => runSearch(q), 50);
    }
  }, []);

  async function runSearch(q: string) {
    if (!q || q.length < 2) return;
    setLoading(true);
    setResults(null);
    setTotals(null);
    try {
      const token = tokenStorage.getItem('adminToken');
      const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Search failed');
      if (!data.data?.results) throw new Error('Invalid search response from server');
      setResults(data.data.results);
      setTotals(data.data.totals);
      setSearchedQuery(q);
      setActiveTab('all');
    } catch (err: any) {
      toast({ title: 'Search failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;
    if (q.length < 2) {
      toast({ title: 'Too short', description: 'Enter at least 2 characters to search.', variant: 'destructive' });
      return;
    }
    await runSearch(q);
  }

  const orderResults = results ? [...(results.identityOrders || []), ...(results.educationOrders || []), ...(results.jambOrders || [])] : [];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Search className="h-6 w-6 text-primary" />
          Global Search
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Search across users, transactions, orders, and support tickets — click any result to see full details</p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                placeholder="Search by name, email, phone, reference ID, tracking ID, ticket ID…"
                className="pl-9 h-11 text-sm"
                autoFocus
              />
            </div>
            <Button onClick={handleSearch} disabled={loading || query.trim().length < 2} className="h-11 px-5 shrink-0">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">Search</span>
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="h-3 w-3" />Users: name · email · phone</span>
            <span className="hidden sm:inline">·</span>
            <span className="flex items-center gap-1"><Receipt className="h-3 w-3" />Transactions: ID · reference</span>
            <span className="hidden sm:inline">·</span>
            <span className="flex items-center gap-1"><Package className="h-3 w-3" />Orders: tracking ID · name</span>
            <span className="hidden sm:inline">·</span>
            <span className="flex items-center gap-1"><LifeBuoy className="h-3 w-3" />Tickets: ticket ID · subject</span>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{totalCount}</span> result{totalCount !== 1 ? 's' : ''} for{' '}
              <span className="font-semibold text-foreground">"{searchedQuery}"</span>
              <span className="ml-2 text-xs">· Click any card to see full details</span>
            </p>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
              onClick={() => { setResults(null); setQuery(''); setTimeout(() => inputRef.current?.focus(), 50); }}>
              <RefreshCw className="h-3 w-3" />Clear
            </Button>
          </div>

          {totalCount === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-14 gap-3">
                <AlertCircle className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">No results found for "{searchedQuery}"</p>
                <p className="text-xs text-muted-foreground">Try a different search term or check the spelling</p>
              </CardContent>
            </Card>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex-wrap h-auto gap-1">
                <TabsTrigger value="all" className="text-xs h-8">
                  All <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{totalCount}</Badge>
                </TabsTrigger>
                {totals.users > 0 && <TabsTrigger value="users" className="text-xs h-8">Users <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{totals.users}</Badge></TabsTrigger>}
                {totals.transactions > 0 && <TabsTrigger value="transactions" className="text-xs h-8">Transactions <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{totals.transactions}</Badge></TabsTrigger>}
                {totals.orders > 0 && <TabsTrigger value="orders" className="text-xs h-8">Orders <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{totals.orders}</Badge></TabsTrigger>}
                {totals.supportTickets > 0 && <TabsTrigger value="tickets" className="text-xs h-8">Tickets <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{totals.supportTickets}</Badge></TabsTrigger>}
                {totals.rpaJobs > 0 && <TabsTrigger value="rpa" className="text-xs h-8">RPA <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{totals.rpaJobs}</Badge></TabsTrigger>}
              </TabsList>

              <TabsContent value="all" className="mt-4 space-y-6">
                {results.users?.length > 0 && <UserSection users={results.users} query={searchedQuery} onSelect={setSelectedItem} />}
                {results.transactions?.length > 0 && <TxSection txs={results.transactions} query={searchedQuery} onSelect={setSelectedItem} />}
                {orderResults.length > 0 && <OrderSection identity={results.identityOrders || []} edu={results.educationOrders || []} jamb={results.jambOrders || []} query={searchedQuery} onSelect={setSelectedItem} />}
                {results.supportTickets?.length > 0 && <TicketSection tickets={results.supportTickets} query={searchedQuery} onSelect={setSelectedItem} />}
                {results.rpaJobs?.length > 0 && <RpaSection jobs={results.rpaJobs} query={searchedQuery} onSelect={setSelectedItem} />}
              </TabsContent>
              <TabsContent value="users" className="mt-4"><UserSection users={results.users || []} query={searchedQuery} onSelect={setSelectedItem} /></TabsContent>
              <TabsContent value="transactions" className="mt-4"><TxSection txs={results.transactions || []} query={searchedQuery} onSelect={setSelectedItem} /></TabsContent>
              <TabsContent value="orders" className="mt-4"><OrderSection identity={results.identityOrders || []} edu={results.educationOrders || []} jamb={results.jambOrders || []} query={searchedQuery} onSelect={setSelectedItem} /></TabsContent>
              <TabsContent value="tickets" className="mt-4"><TicketSection tickets={results.supportTickets || []} query={searchedQuery} onSelect={setSelectedItem} /></TabsContent>
              <TabsContent value="rpa" className="mt-4"><RpaSection jobs={results.rpaJobs || []} query={searchedQuery} onSelect={setSelectedItem} /></TabsContent>
            </Tabs>
          )}
        </div>
      )}

      {!results && !loading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 gap-3">
            <Search className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">Enter a search term above to begin</p>
            <p className="text-xs text-muted-foreground text-center max-w-sm">
              You can search by user name, email, phone number, transaction reference, order tracking ID, or support ticket ID
            </p>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="flex flex-col items-center py-14 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Searching across all records…</p>
          </CardContent>
        </Card>
      )}

      <DetailDialog item={selectedItem} onClose={() => setSelectedItem(null)} navigate={navigate} />
    </div>
  );
}
