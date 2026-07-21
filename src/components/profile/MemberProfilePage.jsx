import { BriefcaseBusiness, KeyRound, Lock, Mail, Phone, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { isMemberLoggedIn, setMemberLoggedIn as setMemberSessionLoggedIn } from "../../lib/memberSession";

function withAlpha(hex, alphaHex) {
  if (!hex || hex.length !== 7) return hex;
  return `${hex}${alphaHex}`;
}

function initials(name) {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "MB";
}

function namesForIds(items, ids) {
  const selected = new Set((Array.isArray(ids) ? ids : []).map(String));
  return (Array.isArray(items) ? items : [])
    .filter((item) => selected.has(String(item.id)))
    .map((item) => item.name);
}

function InfoRow({ icon: Icon, label, value, theme }) {
  return (
    <div className="flex min-w-0 items-start gap-3 border-t py-3" style={{ borderColor: withAlpha(theme.borderColor, "55") }}>
      <Icon size={16} className="mt-0.5 shrink-0" style={{ color: theme.accentColor }} />
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase" style={{ color: withAlpha(theme.fontColor, "70") }}>
          {label}
        </p>
        <p className="mt-0.5 break-words text-sm font-medium" style={{ color: theme.fontColor }}>
          {value || "-"}
        </p>
      </div>
    </div>
  );
}

export function MemberProfilePage({ member, desks, services, labels, theme, loading = false, onNavigate }) {
  const [loginMessage, setLoginMessage] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const assignedDeskNames = namesForIds(desks, member?.deskIds);
  const assignedServiceNames = namesForIds(services, member?.serviceIds);
  const hasPassword = Boolean(String(member?.password || "").trim());
  const sessionKey = member?.id ? `waitqr:member-login:${member.id}` : "";

  useEffect(() => {
    if (!sessionKey) {
      setLoggedIn(false);
      return;
    }

    setLoggedIn(isMemberLoggedIn(member?.id));
  }, [sessionKey]);

  const setMemberLoggedIn = (value) => {
    setLoggedIn(value);
    setMemberSessionLoggedIn(member?.id, value);
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center px-4 py-6" style={{ backgroundColor: theme.bgColor, color: theme.fontColor }}>
      <section className="w-full max-w-xl border bg-white/5 p-5 shadow-xl" style={{ borderColor: theme.borderColor, borderRadius: theme.radius * 1.4 }}>
        {loading || !member ? (
          <div className="py-16 text-center">
            <UserRound size={34} className="mx-auto" style={{ color: withAlpha(theme.fontColor, "70") }} />
            <h1 className="mt-4 text-xl font-semibold" style={{ color: theme.fontColor }}>
              {loading ? "Loading profile..." : "Profile not found"}
            </h1>
            <p className="mt-2 text-sm" style={{ color: withAlpha(theme.fontColor, "80") }}>
              {loading ? "Fetching member details." : "This member profile link does not match an active member."}
            </p>
          </div>
        ) : (
          <>
        <div className="flex items-start gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border" style={{ borderColor: theme.borderColor, backgroundColor: withAlpha(theme.accentColor, "1f") }}>
            {member?.photo ? (
              <img src={member.photo} alt={member.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xl font-semibold" style={{ color: theme.accentColor }}>
                {initials(member?.name)}
              </span>
            )}
          </div>

          <div className="min-w-0 pt-1">
            <p className="text-xs font-semibold uppercase" style={{ color: theme.accentColor }}>
              {member?.id}
            </p>
            <h1 className="mt-1 break-words text-2xl font-semibold" style={{ color: theme.fontColor }}>
              {member?.name || "Member"}
            </h1>
            <p className="mt-1 text-sm" style={{ color: withAlpha(theme.fontColor, "80") }}>
              {member?.role || labels.memberWord}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {!loggedIn ? (
            <button
              type="button"
              onClick={() => onNavigate?.(hasPassword ? "/login" : `/create-password?member=${encodeURIComponent(member.id)}`)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: theme.accentColor, borderRadius: theme.radius }}
            >
              {hasPassword ? <Lock size={15} /> : <KeyRound size={15} />}
              {hasPassword ? "Login" : "Create password"}
            </button>
          ) : null}
          {loggedIn ? (
            <button
              type="button"
              onClick={() => onNavigate?.("/")}
              className="border px-3 py-2 text-sm transition-colors hover:bg-white/5"
              style={{ color: withAlpha(theme.fontColor, "cc"), borderColor: theme.borderColor, borderRadius: theme.radius }}
            >
              Visit dashboard
            </button>
          ) : null}
          {loggedIn ? (
            <button
              type="button"
              onClick={() => {
                setMemberLoggedIn(false);
                setLoginMessage("");
              }}
              className="border px-3 py-2 text-sm transition-colors hover:bg-white/5"
              style={{ color: withAlpha(theme.fontColor, "cc"), borderColor: theme.borderColor, borderRadius: theme.radius }}
            >
              Logout
            </button>
          ) : null}
          {loginMessage ? (
            <span className="text-xs" style={{ color: "#22c55e" }}>
              {loginMessage}
            </span>
          ) : null}
        </div>

        {member?.about ? (
          <p className="mt-5 break-words text-sm leading-relaxed" style={{ color: withAlpha(theme.fontColor, "cc") }}>
            {member.about}
          </p>
        ) : null}

        <div className="mt-5">
          <InfoRow icon={Mail} label="Email" value={member?.email} theme={theme} />
          <InfoRow icon={Phone} label="Phone" value={member?.phone} theme={theme} />
          <InfoRow icon={BriefcaseBusiness} label={labels.deskWordPlural} value={assignedDeskNames.join(", ")} theme={theme} />
          <InfoRow icon={UserRound} label={labels.serviceWordPlural} value={assignedServiceNames.join(", ")} theme={theme} />
        </div>
          </>
        )}
      </section>
    </main>
  );
}
