import { useState } from "react";
import API from "../services/api";
import { saveToken } from "../services/auth";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [data, setData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setData({
      ...data,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    const res = await API.post("/auth/login", data);

    if (res.data.token) {
      localStorage.setItem("token", res.data.token);
      navigate("/dashboard");
    } else {
      alert("Invalid credentials");
    }

    const role = res.data.role;

    if (role === "student") {
      navigate("/student");
    } else {
      navigate("/instructor");
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <h2>Login</h2>

      <input name="email" placeholder="Email" onChange={handleChange} />
      <input
        name="password"
        type="password"
        placeholder="Password"
        onChange={handleChange}
      />

      <button>Login</button>
    </form>
  );
}

export default Login;
