import { KeyRound, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { loginAsMember } from "../../lib/memberSession";
import { getMemberProfilePath } from "../../lib/routing";

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

export function CreatePasswordPage({ members, theme, loading, initialIdentifier = "", onUpdateMember, onNavigate }) {
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setIdentifier(initialIdentifier);
  }, [initialIdentifier]);

  useEffect(() => {
    if (loading || !initialIdentifier) return;

    const member = findLoginMember(members, initialIdentifier);
    if (member && String(member.password || "").trim()) {
      onNavigate(`/reset-password?member=${encodeURIComponent(initialIdentifier)}`);
    }
  }, [initialIdentifier, loading, members, onNavigate]);

  const handleCreate = () => {
    setError("");
    if (loading) return;

    const member = findLoginMember(members, identifier);
    if (!member) {
      setError("Member not found.");
      return;
    }
    if (String(member.password || "").trim()) {
      setError("Password already exists. Please login or reset your password.");
      return;
    }
    if (password.trim().length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const result = onUpdateMember?.(member.id, { password: password.trim() });
    if (result?.ok === false) {
      setError("Failed to create password.");
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
            <KeyRound size={22} />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: theme.fontColor }}>
              Create password
            </h1>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="relative">
              <UserRound size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: withAlpha(theme.fontColor, "80") }} />
              <input
                autoFocus
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="Employee ID, email, or phone"
                {...focusHandlers(theme)}
                className="w-full border py-2 pl-9 pr-3 text-sm outline-none placeholder:text-current placeholder:opacity-40"
                style={fieldStyle(theme)}
              />
            </div>
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              {...focusHandlers(theme)}
              className="w-full border px-3 py-2 text-sm outline-none placeholder:text-current placeholder:opacity-40"
              style={fieldStyle(theme)}
            />
          </div>
          <div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm password"
              onKeyDown={(event) => {
                if (event.key === "Enter") handleCreate();
              }}
              {...focusHandlers(theme)}
              className="w-full border px-3 py-2 text-sm outline-none placeholder:text-current placeholder:opacity-40"
              style={fieldStyle(theme)}
            />
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
          onClick={handleCreate}
          className="mt-5 flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: theme.accentColor, borderRadius: theme.radius }}
        >
          <KeyRound size={16} />
          {loading ? "Loading..." : "Create password"}
        </button>
        <button
          type="button"
          onClick={() => onNavigate("/login")}
          className="mt-3 flex w-full items-center justify-center border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
          style={{ color: withAlpha(theme.fontColor, "cc"), borderColor: theme.borderColor, borderRadius: theme.radius }}
        >
          Back to login
        </button>
      </section>
    </main>
  );
}
