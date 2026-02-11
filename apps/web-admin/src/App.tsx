import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DeliveryDashboard } from './pages/DeliveryDashboard';

function App(): React.ReactElement {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DeliveryDashboard />} />
        <Route path="/deliveries" element={<DeliveryDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
