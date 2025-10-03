import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { AnalysisPage } from "./pages/AnalysisPage";
import { ChartExamplesPage } from "./pages/ChartExamplesPage";
import { Toaster } from "./components/ui/toaster";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/analyze/:repo" element={<AnalysisPage />} />
        <Route path="/charts" element={<ChartExamplesPage />} />
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;