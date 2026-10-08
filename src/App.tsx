import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { Toaster } from 'sonner'
import { APPLICATION_TYPES } from '@shared/constants'
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
const AboutPage = lazy(() => import('@/routes/about').then((m) => ({ default: m.AboutPage })))
const ContactPage = lazy(() => import('@/routes/contact').then((m) => ({ default: m.ContactPage })))
const PrivacyPage = lazy(() => import('@/routes/privacy').then((m) => ({ default: m.PrivacyPage })))
const DocsPage = lazy(() => import('@/routes/docs').then((m) => ({ default: m.DocsPage })))
const DevelopersPage = lazy(() =>
  import('@/routes/developers').then((m) => ({ default: m.DevelopersPage })),
)
const PricingPage = lazy(() => import('@/routes/pricing').then((m) => ({ default: m.PricingPage })))

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
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/developers" element={<DevelopersPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          {/*
            The picker is public on purpose: a stranger hitting Apply should see
            the three doors (hacker, judge, organizer) before any password field.
          */}
          <Route path="/apply" element={<ApplyPage />} />

          <Route element={<RequireAuth />}>
            {/*
              One route per account type, so the form never renders for a type
              that does not exist. Adding a type to APPLICATION_TYPES adds its
              URL here for free; anything else under /apply goes back to the picker.
            */}
            {APPLICATION_TYPES.map((type) => (
              <Route key={type} path={`/apply/${type}`} element={<ApplyFormPage type={type} />} />
            ))}
            <Route path="/apply/*" element={<Navigate to="/apply" replace />} />
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
