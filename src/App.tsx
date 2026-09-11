import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/lib/auth'
import { Starfield } from '@/components/space/starfield'
import { Grain } from '@/components/space/dune-horizon'
import { JumpKey } from '@/components/space/jump-key'
import { RequireAuth, RequireOrganizer } from '@/components/route-guards'
import { LandingPage } from '@/routes/landing'
import { RouteFallback } from '@/components/route-fallback'

// The applicant journey is the common path and ships in the main bundle.
const LoginPage = lazy(() => import('@/routes/login').then((m) => ({ default: m.LoginPage })))
const SignupPage = lazy(() => import('@/routes/signup').then((m) => ({ default: m.SignupPage })))
const ApplyPage = lazy(() => import('@/routes/apply').then((m) => ({ default: m.ApplyPage })))
const ApplyFormPage = lazy(() =>
  import('@/routes/apply-form').then((m) => ({ default: m.ApplyFormPage })),
)
const StatusPage = lazy(() => import('@/routes/status').then((m) => ({ default: m.StatusPage })))

// The organizer console is a separate chunk. Most visitors never load it.
const AdminLayout = lazy(() =>
  import('@/routes/admin/layout').then((m) => ({ default: m.AdminLayout })),
)
const AdminDashboard = lazy(() =>
  import('@/routes/admin/dashboard').then((m) => ({ default: m.AdminDashboard })),
)
const AdminReview = lazy(() =>
  import('@/routes/admin/review').then((m) => ({ default: m.AdminReview })),
)
const AdminApplication = lazy(() =>
  import('@/routes/admin/application').then((m) => ({ default: m.AdminApplication })),
)
const NotFoundPage = lazy(() =>
  import('@/routes/not-found').then((m) => ({ default: m.NotFoundPage })),
)

export function App() {
  return (
    <AuthProvider>
      {/* One sky for the whole product, fixed behind every route. */}
      <Starfield />
      <Grain />
      <JumpKey />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route element={<RequireAuth />}>
            <Route path="/apply" element={<ApplyPage />} />
            <Route path="/apply/:type" element={<ApplyFormPage />} />
            <Route path="/status" element={<StatusPage />} />
          </Route>

          <Route element={<RequireOrganizer />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="review" element={<AdminReview />} />
              <Route path="applications/:id" element={<AdminApplication />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>

      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast:
              'bg-surface border border-line-strong text-fg rounded-xl font-sans text-sm shadow-2xl shadow-black/60',
            description: 'text-fg-muted',
            actionButton: 'bg-fg text-ink rounded-full',
          },
        }}
      />
    </AuthProvider>
  )
}
