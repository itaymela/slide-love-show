import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import DisplayPanel from "./pages/DisplayPanel";
import AdminLayout from "./components/admin/AdminLayout";
import PlaylistsTab from "./components/admin/PlaylistsTab";
import AutomationTab from "./components/admin/AutomationTab";
import SettingsHub from "./pages/admin/SettingsHub";
import TransitionsSettings from "./pages/admin/TransitionsSettings";
import TickerSettings from "./pages/admin/TickerSettings";
import BirthdaySettings from "./pages/admin/BirthdaySettings";
import OverlaySettings from "./pages/admin/OverlaySettings";
import CalibrationSettings from "./pages/admin/CalibrationSettings";
import PlaylistDetail from "./pages/admin/PlaylistDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/display" element={<DisplayPanel />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardTab />} />
            <Route path="playlists" element={<PlaylistsTab />} />
            <Route path="playlists/:id" element={<PlaylistDetail />} />
            <Route path="automation" element={<AutomationTab />} />
            <Route path="settings" element={<SettingsHub />} />
            <Route path="settings/transitions" element={<TransitionsSettings />} />
            <Route path="settings/ticker" element={<TickerSettings />} />
            <Route path="settings/birthdays" element={<BirthdaySettings />} />
            <Route path="settings/overlay" element={<OverlaySettings />} />
            <Route path="settings/calibration" element={<CalibrationSettings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
