import { useState } from "react";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const login = async () => {
    const res = await fetch("http://127.0.0.1:8000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("name", data.name);
      localStorage.setItem(
        "profile_completed",
        data.profile_completed
      );

      window.location.href = "/";
    } else {
      setMsg("Invalid email or password");
    }
  };

  return (
    <div style={{ width: 320, margin: "120px auto" }}>
      <h2>ReviseAI Login</h2>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <button onClick={login} style={{ width: "100%" }}>
        Login
      </button>

      <p style={{ color: "red" }}>{msg}</p>

      <p>
        New user? <a href="/register">Register</a>
      </p>
    </div>
  );
}

export default Login;
