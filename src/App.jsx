import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter, HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;
const LoginPage = Pages.Login;
const PrivacyPolicyPage = Pages.PrivacyPolicy;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

function isLoopbackHost() {
  if (typeof window === "undefined") return true;
  const host = String(window.location?.hostname || "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
  }

  if (!isAuthenticated) {
    const showPublicLanding = isLoopbackHost() && Pages.Home;
    return (
      <Routes>
        {/* In production (remote) default to the auth screen on first visit. */}
        {showPublicLanding ? (
          <>
            <Route path="/" element={<Pages.Home />} />
            <Route path="/Home" element={<Pages.Home />} />
          </>
        ) : (
          <>
            {LoginPage && <Route path="/" element={<LoginPage />} />}
            {Pages.Home && <Route path="/Home" element={<Navigate to="/Login" replace />} />}
          </>
        )}
        {LoginPage && <Route path="/Login" element={<LoginPage />} />}
        {PrivacyPolicyPage && <Route path="/PrivacyPolicy" element={<PrivacyPolicyPage />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Render the main app
  return (
    <Routes>
      {LoginPage && <Route path="/Login" element={<Navigate to="/" replace />} />}
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).filter(([path]) => path !== "Login").map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  const useHashRouter = import.meta.env.VITE_ROUTER_MODE === "hash";
  const routerBase = (import.meta.env.BASE_URL || "/").replace(/\/$/, "") || "/";
  const RouterComponent = useHashRouter ? HashRouter : BrowserRouter;
  const routerProps = useHashRouter || routerBase === "/" ? {} : { basename: routerBase };

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <RouterComponent {...routerProps}>
          <NavigationTracker />
          <AuthenticatedApp />
        </RouterComponent>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
