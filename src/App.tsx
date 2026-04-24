import { HashRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./state/AppContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import UploadResume from "./pages/UploadResume";
import GitHubInput from "./pages/GitHubInput";
import CareerSelection from "./pages/CareerSelection";
import Interview from "./pages/Interview";
import Dashboard from "./pages/Dashboard";
import Report from "./pages/Report";
import LinkedInInput from "./pages/LinkedInInput";
import CareerChat from "./pages/CareerChat";
import Progress from "./pages/Progress";
import SkillTracker from "./pages/SkillTracker";

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />

            {/* Protected */}
            <Route element={<ProtectedRoute />}>
              <Route path="/upload" element={<UploadResume />} />
              <Route path="/github" element={<GitHubInput />} />
              <Route path="/career" element={<CareerSelection />} />
              <Route path="/interview" element={<Interview />} />
              <Route path="/linkedin" element={<LinkedInInput />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/career-chat" element={<CareerChat />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="/skill-tracker" element={<SkillTracker />} />
              <Route path="/report" element={<Report />} />
            </Route>

            <Route path="*" element={<Home />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppProvider>
  );
}
