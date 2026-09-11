import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Download, Search } from 'lucide-react'
import type { AdminApplicationRow, AdminStats } from '@shared/api'
import {
  APPLICATION_STATUSES,
  APPLICATION_TYPES,
  DECISION_STATUSES,
  STATUS_META,
  type ApplicationStatus,
  type ApplicationType,
} from '@shared/constants'
import { StatusBadge, TypeBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/choice'
import { Input } from '@/components/ui/field'
import { EmptyState, Skeleton } from '@/components/ui/surface'
import { api, ApiClientError } from '@/lib/api'
import { useDebouncedCallback } from '@/lib/hooks'
import { cn, formatScore, relativeTime } from '@/lib/utils'

type Sort = 'submitted_desc' | 'submitted_asc' | 'score_desc' | 'score_asc' | 'reviews_asc'

const SORTS: { value: Sort; label: string }[] = [
  { value: 'submitted_desc', label: 'Newest first' },
  { value: 'submitted_asc', label: 'Oldest first' },
  { value: 'score_desc', label: 'Highest score' },
  { value: 'score_asc', label: 'Lowest score' },
  { value: 'reviews_asc', label: 'Least reviewed' },
]

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [rows, setRows] = useState<AdminApplicationRow[] | null>(null)
  const [type, setType] = useState<ApplicationType | 'all'>('all')
  const [status, setStatus] = useState<ApplicationStatus | 'all'>('all')
  const [sort, setSort] = useState<Sort>('submitted_desc')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  // Guards against an out-of-order response overwriting a newer one.
  const requestId = useRef(0)

  const params = useMemo(() => {
    const p = new URLSearchParams({ sort })
    if (type !== 'all') p.set('type', type)
    if (status !== 'all') p.set('status', status)
    if (query.trim()) p.set('q', query.trim())
    return p.toString()
  }, [type, status, sort, query])

  const load = useCallback(async () => {
    const id = ++requestId.current
    try {
      const res = await api.get<{ applications: AdminApplicationRow[] }>(
        `/admin/applications?${params}`,
      )
      if (id === requestId.current) setRows(res.applications)
    } catch {
      if (id === requestId.current) setRows([])
    }
  }, [params])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void api
      .get<{ stats: AdminStats }>('/admin/stats')
      .then((res) => setStats(res.stats))
      .catch(() => setStats(null))
  }, [])

  const applySearch = useDebouncedCallback((value: string) => setQuery(value), 300)

  const onDecide = async (row: AdminApplicationRow, next: ApplicationStatus) => {
    const previous = rows
    // Optimistic: the table should feel instant when deciding in bulk.
    setRows((current) =>
      (current ?? []).map((r) => (r.id === row.id ? { ...r, status: next } : r)),
    )
    try {
      await api.patch(`/admin/applications/${row.id}/status`, { status: next })
      toast.success(`${row.applicantName} marked ${STATUS_META[next].label.toLowerCase()}.`)
      void api.get<{ stats: AdminStats }>('/admin/stats').then((res) => setStats(res.stats))
    } catch (error) {
      setRows(previous)
      toast.error(error instanceof ApiClientError ? error.message : 'Could not save that decision.')
    }
  }

  return (
    <div className="px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="telemetry">Pool</p>
          <h1 className="display-lg mt-2">Applications</h1>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={`/api/admin/applications.csv?${params}`}>
            <Download className="size-4" />
            Export CSV
          </a>
        </Button>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats === null
          ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24" />)
          : (
              [
                { label: 'Submitted', value: stats.totalSubmitted, tone: 'text-fg' },
                { label: 'Awaiting review', value: stats.awaitingReview, tone: 'text-status-review' },
                { label: 'Reviewed', value: stats.reviewed, tone: 'text-ion' },
                { label: 'Decided', value: stats.decided, tone: 'text-status-accepted' },
              ] as const
            ).map((tile) => (
              <div key={tile.label} className="panel p-5">
                <p className="telemetry">{tile.label}</p>
                <p className={cn('mt-2 font-mono text-3xl tabular-nums', tile.tone)}>{tile.value}</p>
              </div>
            ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-fg-dim" />
          <Input
            className="h-10 pl-10"
            placeholder="Search name, email or school"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              applySearch(e.target.value)
            }}
          />
        </div>
        <div className="w-40">
          <Select
            options={[{ value: 'all', label: 'All types' }, ...APPLICATION_TYPES.map((t) => ({ value: t, label: STATUS_LABEL(t) }))]}
            value={type}
            onChange={(v) => setType(v as ApplicationType | 'all')}
          />
        </div>
        <div className="w-44">
          <Select
            options={[
              { value: 'all', label: 'All statuses' },
              ...APPLICATION_STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label })),
            ]}
            value={status}
            onChange={(v) => setStatus(v as ApplicationStatus | 'all')}
          />
        </div>
        <div className="w-44">
          <Select options={SORTS} value={sort} onChange={(v) => setSort(v as Sort)} />
        </div>
      </div>

      <div className="panel mt-5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[62rem] text-left text-[14px]">
            <thead>
              <tr className="border-b border-line text-fg-dim">
                <th className="px-5 py-3 font-mono text-[11px] font-medium tracking-[0.1em] uppercase">Applicant</th>
                <th className="px-3 py-3 font-mono text-[11px] font-medium tracking-[0.1em] uppercase">Type</th>
                <th className="px-3 py-3 font-mono text-[11px] font-medium tracking-[0.1em] uppercase">School</th>
                <th className="px-3 py-3 font-mono text-[11px] font-medium tracking-[0.1em] uppercase">Status</th>
                <th className="px-3 py-3 text-right font-mono text-[11px] font-medium tracking-[0.1em] uppercase">Reviews</th>
                <th className="px-3 py-3 text-right font-mono text-[11px] font-medium tracking-[0.1em] uppercase">Avg</th>
                <th className="px-3 py-3 font-mono text-[11px] font-medium tracking-[0.1em] uppercase">Submitted</th>
                <th className="px-5 py-3 font-mono text-[11px] font-medium tracking-[0.1em] uppercase">Decision</th>
              </tr>
            </thead>
            <tbody>
              {rows === null ? (
                Array.from({ length: 6 }, (_, i) => (
                  <tr key={i} className="border-b border-line/60">
                    <td colSpan={8} className="px-5 py-4">
                      <Skeleton className="h-5" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10">
                    <EmptyState
                      title="Nothing matches"
                      body="No application fits those filters. Widen them, or clear the search."
                      className="border-0"
                    />
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="group border-b border-line/60 last:border-0 hover:bg-white/[0.03]">
                    <td className="px-5 py-3">
                      <Link to={`/admin/applications/${row.id}`} className="block">
                        <span className="text-fg group-hover:underline">{row.applicantName}</span>
                        <span className="block font-mono text-[11px] text-fg-dim">{row.applicantEmail}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <TypeBadge type={row.type} />
                    </td>
                    <td className="max-w-44 truncate px-3 py-3 text-fg-muted">{row.school || '--'}</td>
                    <td className="px-3 py-3">
                      <StatusBadge status={row.status} size="sm" />
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-fg-muted">
                      {row.reviewCount}
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-fg">
                      {formatScore(row.avgScore)}
                    </td>
                    <td className="px-3 py-3 font-mono text-[12px] text-fg-dim">
                      {row.submittedAt ? relativeTime(row.submittedAt) : '--'}
                    </td>
                    <td className="px-5 py-3">
                      {row.status === 'draft' ? (
                        <span className="font-mono text-[11px] text-fg-dim">Not submitted</span>
                      ) : (
                        <div className="flex gap-1">
                          {DECISION_STATUSES.map((decision) => (
                            <button
                              key={decision}
                              type="button"
                              onClick={() => void onDecide(row, decision)}
                              disabled={row.status === decision}
                              className={cn(
                                'rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-[0.08em] uppercase transition-colors',
                                row.status === decision
                                  ? 'border-line-strong bg-white/[0.08] text-fg'
                                  : 'border-line text-fg-dim hover:border-line-strong hover:text-fg',
                              )}
                            >
                              {decision === 'accepted' ? 'Accept' : decision === 'waitlisted' ? 'Wait' : 'Reject'}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const STATUS_LABEL = (type: ApplicationType) => (type === 'hacker' ? 'Hackers' : 'Mentors')
