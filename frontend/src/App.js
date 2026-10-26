import './App.css';
import { Routes, Route, BrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { Home } from './pages/Home';
import About from './pages/About';
import { AdminDashboard, AdminLogin } from './pages/Admin';
import { ToastContainer } from 'react-toastify';
import { UserAuthProvider, useUserAuth } from './Context/UserAuthContext';
import PublicLayout from './pages/PublicLayout';
import AuthPage from './pages/AuthPage';
import AuthorPage from './pages/AuthorPage';
import Composer from './pages/Composer';
import PostDetail from './pages/PostDetail';
import 'react-toastify/dist/ReactToastify.css';
import 'sweetalert2/dist/sweetalert2.min.css';
import './pages/PublicBlog.css';

const SignedInOnly = () => {
  const { user, ready } = useUserAuth();
  if (!ready) return <p className="state-message">Restoring your session…</p>;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

const PublicRoutes = () => (
  <Routes>
    <Route element={<PublicLayout />}>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
      <Route path="/reset-password/:token" element={<AuthPage mode="reset" />} />
      <Route path="/posts/:slug" element={<PostDetail />} />
      <Route path="/authors/:authorId" element={<AuthorPage />} />
      <Route element={<SignedInOnly />}>
        <Route path="/write" element={<Composer />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

function App() {
  return (
    <BrowserRouter>
      <UserAuthProvider>
        <ToastContainer position="top-right" autoClose={3500} />
        <Routes>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/*" element={<PublicRoutes />} />
        </Routes>
      </UserAuthProvider>
    </BrowserRouter>
  );
}
export default App;
