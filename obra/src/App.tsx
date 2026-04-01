import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ProtectedRoute } from './components/routes/ProtectedRoute';
import { PublicOnlyRoute } from './components/routes/PublicOnlyRoute';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { ProjectEditorPage } from './pages/ProjectEditorPage';
import { ProjectWizardPage } from './pages/ProjectWizardPage';
import { RegisterPage } from './pages/RegisterPage';
import { AuthProvider } from './providers/AuthProvider';

function App(): React.JSX.Element {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/projects/new/wizard" element={<ProjectWizardPage />} />
            <Route path="/projects/:projectId/wizard" element={<ProjectWizardPage />} />
            <Route path="/projects/:projectId/editor" element={<ProjectEditorPage />} />
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster richColors />
    </AuthProvider>
  );
}

export default App;
