import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import Dashboard from './pages/Dashboard';
import ProjectView from './pages/ProjectView';
import ExplorePage from './pages/ExplorePage';
import Login from './components/auth/Login';
import TestCanvas from './pages/TestCanvas';
import { SidebarProvider } from './contexts/SidebarContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import EditorView from './pages/EditorView';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function RequireNoAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (user) {
    return <Navigate to={location.state?.from?.pathname || "/"} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RequireNoAuth>
            <Login />
            <Footer />
          </RequireNoAuth>
        }
      />
      <Route path="/test-canvas" element={
        <>
          <TestCanvas />
          <Footer />
        </>
      } />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <ProjectProvider>
              <SidebarProvider>
                <div className="flex h-screen bg-gray-50 flex-col">
                  <div className="flex flex-1 overflow-hidden">
                    <Sidebar />
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <Header />
                      <main className="flex-1 overflow-y-auto">
                        <Routes>
                          <Route path="/" element={<Dashboard />} />
                          <Route path="/project/:id" element={<ProjectView />} />
                          <Route path="/project/:projectId/:fileId" element={<EditorView />} />
                          <Route path="/explore" element={<ExplorePage />} />
                          <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                      </main>
                      <Footer />
                    </div>
                  </div>
                </div>
              </SidebarProvider>
            </ProjectProvider>
          </RequireAuth>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}