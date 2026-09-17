import { useState } from "react";
import Input from "../components/Input";

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      name.trim() === "" ||
      email.trim() === "" ||
      password.trim() === ""
    ) {
      setMessage("Please fill in all fields.");
      return;
    }

    setMessage("Account details entered successfully!");
  }

  return (
    <div className="page">
      <div className="login-card">
        <h1>Create Account</h1>

        <p className="subtitle">Join SecureDocs</p>

        <form onSubmit={handleSignup}>
          <Input
            label="Name"
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={setName}
          />

          <Input
            label="Email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={setEmail}
          />

          <Input
            label="Password"
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={setPassword}
          />

          <button type="submit">Create Account</button>
        </form>

        {message && <p className="message">{message}</p>}

        <p className="signup">
          Already have an account?{" "}
          <a href="/login">Log in</a>
        </p>
      </div>
    </div>
  );
}

export default Signup;