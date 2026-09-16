import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { AuthProvider } from './auth/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ProjectPage from './pages/ProjectPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import SpacePage from './pages/SpacePage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<HomePage />} />
            <Route path="/spaces/:id" element={<SpacePage />} />
            <Route path="/projects/:id" element={<ProjectPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}