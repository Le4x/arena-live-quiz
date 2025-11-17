import { AppProviders } from "@/providers/AppProviders";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import RegieWrapper from "./pages/RegieWrapper";
import Screen from "./pages/Screen";
import Client from "./pages/Client";
import AdminSetup from "./pages/AdminSetup";
import AdminSounds from "./pages/AdminSounds";
import AdminSessions from "./pages/AdminSessions";
import AdminTeams from "./pages/AdminTeams";
import AdminSponsors from "./pages/AdminSponsors";
import AdminMedia from "./pages/AdminMedia";
import AdminAnalytics from "./pages/AdminAnalytics";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { Monitoring } from "./pages/Monitoring";
import { ProtectedRoute } from "./components/ProtectedRoute";
import SessionsManager from "./pages/SessionsManager";
import SessionSelector from "./pages/SessionSelector";
import AdminSessionsDashboard from "./pages/AdminSessionsDashboard";
import ClientKit from "./pages/ClientKit";
import JoinSession from "./pages/JoinSession";

const App = () => (
  <AppProviders>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        <Route path="/regie" element={<ProtectedRoute><RegieWrapper /></ProtectedRoute>} />
        <Route path="/sessions/select" element={<ProtectedRoute><SessionSelector /></ProtectedRoute>} />
        <Route path="/screen" element={<ProtectedRoute><Screen /></ProtectedRoute>} />
        <Route path="/client" element={<Client />} />
        <Route path="/client/:teamId" element={<Client />} />
        <Route path="/admin/setup" element={<ProtectedRoute><AdminSetup /></ProtectedRoute>} />
        <Route path="/admin/sounds" element={<ProtectedRoute><AdminSounds /></ProtectedRoute>} />
        <Route path="/admin/sessions" element={<ProtectedRoute><AdminSessions /></ProtectedRoute>} />
        <Route path="/admin/sessions/dashboard" element={<ProtectedRoute><AdminSessionsDashboard /></ProtectedRoute>} />
        <Route path="/admin/teams" element={<ProtectedRoute><AdminTeams /></ProtectedRoute>} />
        <Route path="/admin/sponsors/:sessionId" element={<ProtectedRoute><AdminSponsors /></ProtectedRoute>} />
        <Route path="/admin/media" element={<ProtectedRoute><AdminMedia /></ProtectedRoute>} />
        <Route path="/admin/analytics" element={<ProtectedRoute><AdminAnalytics /></ProtectedRoute>} />
        <Route path="/monitoring" element={<ProtectedRoute><Monitoring /></ProtectedRoute>} />
        {/* Session Management Routes */}
        <Route path="/sessions" element={<ProtectedRoute><SessionsManager /></ProtectedRoute>} />
        <Route path="/sessions/:sessionId/kit" element={<ProtectedRoute><ClientKit /></ProtectedRoute>} />
        {/* Public Join Routes */}
        <Route path="/join" element={<JoinSession />} />
        <Route path="/join/:accessCode" element={<JoinSession />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </AppProviders>
);

export default App;
