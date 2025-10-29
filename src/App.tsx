import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import Regie from "./pages/Regie";
import Screen from "./pages/Screen";
import Client from "./pages/Client";
import AdminSetup from "./pages/AdminSetup";
import AdminSounds from "./pages/AdminSounds";
import AdminSessions from "./pages/AdminSessions";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="/regie" element={<ProtectedRoute><Regie /></ProtectedRoute>} />
          <Route path="/screen" element={<Screen />} />
          <Route path="/client" element={<Client />} />
          <Route path="/client/:teamId" element={<Client />} />
          <Route path="/admin/setup" element={<ProtectedRoute><AdminSetup /></ProtectedRoute>} />
          <Route path="/admin/sounds" element={<ProtectedRoute><AdminSounds /></ProtectedRoute>} />
          <Route path="/admin/sessions" element={<ProtectedRoute><AdminSessions /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
