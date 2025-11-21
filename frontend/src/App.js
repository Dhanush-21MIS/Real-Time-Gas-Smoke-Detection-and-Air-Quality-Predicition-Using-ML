// App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./Navbar";
import Homepage from "./Homepage";
import History from "./History";
import Predictions from "./predictions";
import "./App.css";  // <-- Import global styles

function App() {
  return (
    <Router>
      <Navbar />

      <div className="page-container">
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/history/:type" element={<History />} />
          <Route path="/predictions" element={<Predictions />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
