function Dashboard() {
  const name = localStorage.getItem("name");
  const role = localStorage.getItem("role");

  const logout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <div style={{ margin: 50 }}>
      <h1>Welcome {name}</h1>
      <p>Role: {role}</p>

      <p>This is your dashboard.</p>

      <button onClick={logout}>Logout</button>
    </div>
  );
}

export default Dashboard;
