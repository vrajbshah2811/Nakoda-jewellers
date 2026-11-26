
import { useState } from "react";
import { supabase } from "./supabase";
import { Gem, Lock, Mail, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0c0c0b",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "20px",
      color: "#fff",
      fontFamily: "Arial, sans-serif"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "420px",
        background: "#151512",
        border: "1px solid #353026",
        borderRadius: "16px",
        padding: "38px"
      }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <Gem size={42} color="#d9b76e" />

          <h1 style={{
            letterSpacing: "5px",
            marginBottom: "5px"
          }}>
            NAKODA
          </h1>

          <p style={{
            color: "#d9b76e",
            letterSpacing: "4px",
            fontSize: "11px"
          }}>
            JEWELLERS
          </p>

          <h2 style={{ marginTop: "30px" }}>
            Welcome Back
          </h2>

          <p style={{ color: "#999", fontSize: "14px" }}>
            Sign in to manage your jewellery business
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <label>Email Address</label>

          <div style={{
            display: "flex",
            alignItems: "center",
            background: "#20201b",
            border: "1px solid #39352b",
            borderRadius: "8px",
            padding: "0 12px",
            margin: "10px 0 22px"
          }}>
            <Mail size={18} color="#c9a85e" />

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                flex: 1,
                background: "transparent",
                color: "white",
                border: "none",
                outline: "none",
                padding: "15px",
                minWidth: 0
              }}
            />
          </div>

          <label>Password</label>

          <div style={{
            display: "flex",
            alignItems: "center",
            background: "#20201b",
            border: "1px solid #39352b",
            borderRadius: "8px",
            padding: "0 12px",
            margin: "10px 0 22px"
          }}>
            <Lock size={18} color="#c9a85e" />

            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                flex: 1,
                background: "transparent",
                color: "white",
                border: "none",
                outline: "none",
                padding: "15px",
                minWidth: 0
              }}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                background: "none",
                border: "none",
                color: "#c9a85e",
                cursor: "pointer"
              }}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>

          {error && (
            <p style={{
              color: "#ff8178",
              fontSize: "13px",
              marginBottom: "15px"
            }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "15px",
              background: "#d9b76e",
              color: "#111",
              border: "none",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: "pointer",
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p style={{
          textAlign: "center",
          color: "#777",
          fontSize: "12px",
          marginTop: "28px"
        }}>
          Secure Admin & Staff Access
        </p>
      </div>
    </div>
  );
}
