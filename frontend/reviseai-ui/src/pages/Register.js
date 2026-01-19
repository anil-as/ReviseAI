import { useState } from "react";

function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
  });
  const [msg, setMsg] = useState("");

  const register = async () => {
    const res = await fetch("http://127.0.0.1:8000/users/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (data.message) {
      setMsg("Registered successfully. Please login.");
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } else {
      setMsg(data.error || "Registration failed");
    }
  };

  return (
    <div style={{ width: 320, margin: "120px auto" }}>
      <h2>ReviseAI Register</h2>

      <input
        placeholder="Name"
        onChange={(e) =>
          setForm({ ...form, name: e.target.value })
        }
        style={{ width: "100%", marginBottom: 10 }}
      />

      <input
        placeholder="Email"
        onChange={(e) =>
          setForm({ ...form, email: e.target.value })
        }
        style={{ width: "100%", marginBottom: 10 }}
      />

      <input
        type="password"
        placeholder="Password"
        onChange={(e) =>
          setForm({ ...form, password: e.target.value })
        }
        style={{ width: "100%", marginBottom: 10 }}
      />

      <select
        onChange={(e) =>
          setForm({ ...form, role: e.target.value })
        }
        style={{ width: "100%", marginBottom: 10 }}
      >
        <option value="student">Student</option>
        <option value="instructor">Instructor</option>
      </select>

      <button onClick={register} style={{ width: "100%" }}>
        Register
      </button>

      <p>{msg}</p>

      <p>
        Already have an account? <a href="/">Login</a>
      </p>
    </div>
  );
}

export default Register;
