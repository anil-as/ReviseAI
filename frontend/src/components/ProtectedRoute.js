import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

function ProtectedRoute({ children, role }) {
  const token = localStorage.getItem("token");

  // 1️⃣ No token → redirect
  if (!token) {
    return <Navigate to="/" />;
  }

  try {
    // 2️⃣ Decode safely
    const decoded = jwtDecode(token);

    // 3️⃣ Role check
    if (role && decoded.role !== role) {
      return <Navigate to="/" />;
    }

    return children;

  } catch (error) {
    // 4️⃣ Invalid token → clean & redirect
    localStorage.removeItem("token");
    return <Navigate to="/" />;
  }
}

export default ProtectedRoute;
