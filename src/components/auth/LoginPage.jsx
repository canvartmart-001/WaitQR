import { Lock, LogIn, RotateCcw, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { getMemberProfilePath } from "../../lib/routing";
import { findLoggedInMember, isMasterLoggedIn, loginAsMaster, loginAsMember } from "../../lib/memberSession";

const MASTER_EMAIL = "apumandal167@gmail.com";
const MASTER_PASSWORD = "iam19283746@ok";

function withAlpha(hex, alphaHex) {
  if (!hex || hex.length !== 7) return hex;
  return `${hex}${alphaHex}`;
}

function fieldStyle(theme) {
  return {
    color: theme.fontColor,
    borderColor: theme.borderColor,
    borderRadius: theme.radius,
    backgroundColor: "rgba(255,255,255,0.04)",
  };
}

function focusHandlers(theme) {
  return {
    onFocus: (event) => {
      event.target.style.borderColor = theme.accentColor;
      event.target.style.boxShadow = `0 0 0 3px ${withAlpha(theme.accentColor, "33")}`;
    },
    onBlur: (event) => {
      event.target.style.borderColor = theme.borderColor;
      event.target.style.boxShadow = "";
    },
  };
}

function findLoginMember(members, identifier) {
  const value = String(identifier || "").trim().toLowerCase();
  const phoneDigits = value.replace(/\D/g, "");
  if (!value) return null;

  return (Array.isArray(members) ? members : []).find((member) => {
    const id = String(member.id || "").toLowerCase();
    const email = String(member.email || "").toLowerCase();
    const phone = String(member.phone || "").replace(/\D/g, "");
    return id === value || email === value || (phoneDigits && phone === phoneDigits);
  }) || null;
}

export function LoginPage({ members, theme, loading, onNavigate }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) return;

    if (isMasterLoggedIn()) {
      onNavigate("/");
      return;
    }

    const loggedInMember = findLoggedInMember(members);
    if (loggedInMember) {
      onNavigate(getMemberProfilePath(loggedInMember, members));
    }
  }, [loading, members, onNavigate]);

  const handleLogin = () => {
    setError("");
    if (loading) return;

    if (identifier.trim().toLowerCase() === MASTER_EMAIL && password === MASTER_PASSWORD) {
      loginAsMaster(members);
      onNavigate("/");
      return;
    }

    const member = findLoginMember(members, identifier);
    if (!member) {
      setError("Member not found.");
      return;
    }
    if (!String(member.password || "").trim()) {
      setError("Password is not created yet. Open your member profile to create one.");
      return;
    }
    if (password !== String(member.password || "")) {
      setError("Incorrect password.");
      return;
    }

    loginAsMember(member.id, members);
    onNavigate(getMemberProfilePath(member, members));
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center px-4 py-6" style={{ backgroundColor: theme.bgColor, color: theme.fontColor }}>
      <section className="w-full max-w-md border bg-white/5 p-5 shadow-xl" style={{ borderColor: theme.borderColor, borderRadius: theme.radius * 1.4 }}>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: withAlpha(theme.accentColor, "1f"), color: theme.accentColor }}>
            <LogIn size={22} />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: theme.fontColor }}>
              Member login
            </h1>
            <p className="mt-1 text-sm" style={{ color: withAlpha(theme.fontColor, "80") }}>
              Sign in with Employee ID, email, or phone.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: theme.fontColor }}>
              Employee ID, email, or phone
            </label>
            <div className="relative">
              <UserRound size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: withAlpha(theme.fontColor, "80") }} />
              <input
                autoFocus
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                {...focusHandlers(theme)}
                className="w-full border py-2 pl-9 pr-3 text-sm outline-none"
                style={fieldStyle(theme)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: theme.fontColor }}>
              Password
            </label>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: withAlpha(theme.fontColor, "80") }} />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleLogin();
                }}
                {...focusHandlers(theme)}
                className="w-full border py-2 pl-9 pr-3 text-sm outline-none"
                style={fieldStyle(theme)}
              />
            </div>
          </div>
        </div>

        {error ? (
          <p className="mt-3 text-xs" style={{ color: "#f87171" }}>
            {error}
          </p>
        ) : null}

        <button
          type="button"
          disabled={loading}
          onClick={handleLogin}
          className="mt-5 flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: theme.accentColor, borderRadius: theme.radius }}
        >
          <LogIn size={16} />
          {loading ? "Loading..." : "Login"}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => onNavigate("/reset-password")}
          className="mt-3 flex w-full items-center justify-center gap-2 border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ color: withAlpha(theme.fontColor, "cc"), borderColor: theme.borderColor, borderRadius: theme.radius }}
        >
          <RotateCcw size={16} />
          Reset password
        </button>
      </section>
    </main>
  );
}
