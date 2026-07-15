import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import SearchPage from './pages/SearchPage';
import SalonDetailPage from './pages/SalonDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import BookingsPage from './pages/BookingsPage';
import OwnerPage from './pages/OwnerPage';

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<SearchPage />} />
        <Route path="/salons/:id" element={<SalonDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/bookings"
          element={
            <ProtectedRoute>
              <BookingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner"
          element={
            <ProtectedRoute>
              <OwnerPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}
