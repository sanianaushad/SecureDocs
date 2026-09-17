import { useState } from "react";
import Input from "../components/Input";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (email.trim() === "" && password.trim() === "") {
      setMessage("Please enter your email and password.");
      return;
    }

    if (email.trim() === "") {
      setMessage("Please enter your email.");
      return;
    }

    if (password.trim() === "") {
      setMessage("Please enter your password.");
      return;
    }

    setMessage("Login details entered successfully!");
  }

  return (
    <div className="page">
      <div className="login-card">
        <h1>SecureDocs</h1>

        <p className="subtitle">Secure document management</p>

        <form onSubmit={handleLogin}>
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
            placeholder="Enter your password"
            value={password}
            onChange={setPassword}
          />

          <button type="submit">Login</button>
        </form>

        {message && <p className="message">{message}</p>}

        <p className="signup">
          Don't have an account?{" "}
          <a href="/signup">Sign up</a>
        </p>
      </div>
    </div>
  );
}

export default Login;