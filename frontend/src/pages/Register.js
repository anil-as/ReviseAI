import { useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

function Register() {

  const navigate = useNavigate();

  const [user, setUser] = useState({
    name:"",
    email:"",
    password:"",
    role:"student"
  });

  const handleChange = (e)=>{
    setUser({
      ...user,
      [e.target.name]:e.target.value
    });
  };

  const handleSubmit = async (e)=>{
    e.preventDefault();

    await API.post("/auth/register", user);

    alert("Registration successful!");
    navigate("/");
  };

  return(
    <form onSubmit={handleSubmit}>
      <h2>Register</h2>

      <input name="name" placeholder="Name" onChange={handleChange}/>
      <input name="email" placeholder="Email" onChange={handleChange}/>
      <input name="password" type="password" placeholder="Password" onChange={handleChange}/>

      <select name="role" onChange={handleChange}>
        <option value="student">Student</option>
        <option value="instructor">Instructor</option>
      </select>

      <button>Register</button>
    </form>
  );
}

export default Register;
