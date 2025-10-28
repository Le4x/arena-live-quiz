import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import Regie from "./pages/Regie";
import RegieVideo from "./pages/RegieVideo";
import RegieSound from "./pages/RegieSound";
import Screen from "./pages/Screen";
import Client from "./pages/Client";
import AdminSetup from "./pages/AdminSetup";
import AdminSounds from "./pages/AdminSounds";
import AdminSessions from "./pages/AdminSessions";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/regie" element={<Regie />} />
          <Route path="/regie/video" element={<RegieVideo />} />
          <Route path="/regie/sound" element={<RegieSound />} />
          <Route path="/screen" element={<Screen />} />
          <Route path="/client" element={<Client />} />
          <Route path="/client/:teamId" element={<Client />} />
          <Route path="/admin/setup" element={<AdminSetup />} />
          <Route path="/admin/sounds" element={<AdminSounds />} />
          <Route path="/admin/sessions" element={<AdminSessions />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
