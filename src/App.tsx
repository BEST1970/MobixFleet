import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnalysisProvider, useAnalysis } from './context/AnalysisContext';
import { AppShell } from './components/layout/AppShell';
import { UploadPage } from './pages/UploadPage';
import { DashboardPage } from './pages/DashboardPage';

function AppRoutes() {
  const { result } = useAnalysis();

  return (
    <Routes>
      <Route path="/" element={<UploadPage />} />
      <Route path="/dashboard" element={result ? <DashboardPage /> : <Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AnalysisProvider>
        <AppShell>
          <AppRoutes />
        </AppShell>
      </AnalysisProvider>
    </BrowserRouter>
  );
}
