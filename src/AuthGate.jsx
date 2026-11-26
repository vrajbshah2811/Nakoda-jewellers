
import { useEffect, useState, useRef } from "react";
import { supabase } from "./supabase.js";
import Login from "./login.jsx";
import Dashboard from "./App.jsx";

export default function AuthGate() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const currentUserId = useRef(null);

  // Authentication listener
  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;

        const newUserId = newSession?.user?.id ?? null;

        // Only reset profile when actual user changes
        if (currentUserId.current !== newUserId) {
          currentUserId.current = newUserId;

          setProfile(null);
          setError("");

          if (newUserId) {
            setLoading(true);
          } else {
            setLoading(false);
          }
        }

        setSession(newSession);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Load profile only when user changes
  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      if (!session?.user?.id) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, role")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!mounted) return;

        if (error) {
          setError(error.message);
          setProfile(null);
        } else if (!data) {
          setError("User profile not found. Contact administrator.");
          setProfile(null);
        } else {
          setProfile(data);
        }
      } catch (err) {
        if (!mounted) return;

        setError(err.message || "Unable to load profile.");
        setProfile(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [session?.user?.id]);

  // Logout
  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setError(error.message);
    }
  }

  // Loading
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0c0c0b",
          color: "#d9b76e",
          display: "grid",
          placeItems: "center",
          fontSize: 18,
        }}
      >
        Loading your account...
      </div>
    );
  }

  // Login
  if (!session) {
    return <Login />;
  }

  // Profile error
  if (error || !profile) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0c0c0b",
          color: "white",
          display: "grid",
          placeItems: "center",
          padding: 20,
        }}
      >
        <div>
          <h2>Account Access Error</h2>
          <p>{error || "User profile not found."}</p>

          <button onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Role validation
  if (!["admin", "staff"].includes(profile.role)) {
    return (
      <div style={{ padding: 40, color: "white" }}>
        <h2>Access Denied</h2>
        <p>Your account does not have permission.</p>

        <button onClick={handleLogout}>
          Sign Out
        </button>
      </div>
    );
  }

  // Dashboard
  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 10,
          right: 15,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "#242119",
          border: "1px solid #57472a",
          borderRadius: 8,
          padding: "8px 12px",
          color: "#e4c47d",
          fontSize: 12,
        }}
      >
        {profile.full_name || session.user.email}

        <span>({profile.role})</span>

        <button
          onClick={handleLogout}
          style={{
            background: "#d9b76e",
            border: 0,
            borderRadius: 5,
            padding: "6px 10px",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>

      <Dashboard />
    </>
  );
}
