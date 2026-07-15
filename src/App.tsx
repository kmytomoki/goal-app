import { Navigate, Route, Routes } from "react-router-dom";
import { useApp } from "./lib/useApp";
import Welcome from "./pages/Welcome";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import Morning from "./pages/Morning";
import Evening from "./pages/Evening";
import Weekly from "./pages/Weekly";
import Settings from "./pages/Settings";
import Upcoming from "./pages/Upcoming";
import AppShell from "./components/AppShell";

function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <p className="text-sm font-semibold tracking-widest text-[var(--color-text-secondary)]">開演準備中…</p>
    </div>
  );
}

export default function App() {
  const { user, authLoading, profile, dataLoading } = useApp();

  if (authLoading || dataLoading) return <Loading />;

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Welcome />} />
      </Routes>
    );
  }

  const onboarded = profile?.onboardingCompleted === true;

  return (
    <Routes>
      {!onboarded ? (
        <>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        </>
      ) : (
        <>
          <Route element={<AppShell />}>
            <Route path="/" element={<Home />} />
            <Route path="/upcoming" element={<Upcoming />} />
            <Route path="/weekly" element={<Weekly />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="/morning" element={<Morning />} />
          <Route path="/evening" element={<Evening />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      )}
    </Routes>
  );
}
