import { AppProviders } from "@/providers/AppProviders";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import Regie from "./pages/Regie";
import Screen from "./pages/Screen";
import Client from "./pages/Client";
import AdminSetup from "./pages/AdminSetup";
import AdminSounds from "./pages/AdminSounds";
import AdminSessions from "./pages/AdminSessions";
import AdminTeams from "./pages/AdminTeams";
import AdminSponsors from "./pages/AdminSponsors";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { Monitoring } from "./pages/Monitoring";
import { ProtectedRoute } from "./components/ProtectedRoute";

const App = () => (
  <AppProviders>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        <Route path="/regie" element={<ProtectedRoute><Regie /></ProtectedRoute>} />
        <Route path="/screen" element={<ProtectedRoute><Screen /></ProtectedRoute>} />
        <Route path="/client" element={<Client />} />
        <Route path="/client/:teamId" element={<Client />} />
        <Route path="/admin/setup" element={<ProtectedRoute><AdminSetup /></ProtectedRoute>} />
        <Route path="/admin/sounds" element={<ProtectedRoute><AdminSounds /></ProtectedRoute>} />
        <Route path="/admin/sessions" element={<ProtectedRoute><AdminSessions /></ProtectedRoute>} />
        <Route path="/admin/teams" element={<ProtectedRoute><AdminTeams /></ProtectedRoute>} />
        <Route path="/admin/sponsors/:sessionId" element={<ProtectedRoute><AdminSponsors /></ProtectedRoute>} />
        <Route path="/monitoring" element={<ProtectedRoute><Monitoring /></ProtectedRoute>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </AppProviders>
);

export default App;
