import { useRef, useState } from "react";
import { AlertTriangle, Camera, Eye, EyeOff, Link2, Pencil, Plus, Trash2, User } from "lucide-react";
import { C } from "../../lib/theme";

const BLANK_MEMBER_FORM = { name: "", phone: "", password: "", photo: null, about: "" };

export function ManageMembersSection({
  desks,
  members,
  labels,
  editingMemberLabel,
  setEditingMemberLabel,
  showAddMember,
  setShowAddMember,
  editingMember,
  setEditingMember,
  addMember,
  updateMember,
  removeMember,
  toggleMemberDesk,
  askConfirm,
}) {
  const { memberLabel, setMemberLabel, memberWord, memberWordLower, memberWordPlural, memberWordPluralLower, deskWordLower, deskWordPluralLower } = labels;

  const [newMember, setNewMember] = useState(BLANK_MEMBER_FORM);
  const [memberFormError, setMemberFormError] = useState("");
  const [revealedMemberPassword, setRevealedMemberPassword] = useState(null);
  const newMemberPhotoRef = useRef(null);

  const handleAddMember = () => {
    const result = addMember(newMember);
    if (!result.ok) {
      setMemberFormError(
        result.error === "duplicate-phone"
          ? "This phone number is already in use by another member."
          : `Enter name, phone number, and a password to add ${memberWordLower}.`
      );
      return false;
    }
    setNewMember(BLANK_MEMBER_FORM);
    setMemberFormError("");
    if (newMemberPhotoRef.current) newMemberPhotoRef.current.value = "";
    return true;
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3">
        {editingMemberLabel ? (
          <input
            autoFocus
            value={memberLabel}
            onChange={(e) => setMemberLabel(e.target.value)}
            onBlur={() => setEditingMemberLabel(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setEditingMemberLabel(false);
            }}
            placeholder="Member"
            className="qp-focusable text-sm font-semibold rounded-md px-2 py-1 outline-none"
            style={{ background: C.ink900, border: `1px solid ${C.ink600}`, color: C.textLight }}
          />
        ) : (
          <h3 className="text-sm font-semibold" style={{ color: C.textLight }}>
            {memberWordPlural}
          </h3>
        )}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setEditingMemberLabel(true)}
            title={`Rename "${memberWord}" label`}
            className="qp-focusable p-1.5 rounded-md border"
            style={{ borderColor: C.ink600, color: C.textFaint }}
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => {
              setShowAddMember((v) => !v);
              setMemberFormError("");
            }}
            title={`Add ${memberWordLower}`}
            className="qp-focusable p-1.5 rounded-md border"
            style={{ borderColor: showAddMember ? C.amber : C.ink600, color: showAddMember ? C.amber : C.textFaint }}
          >
            <Plus size={13} />
          </button>
        </div>
      </div>

      {showAddMember && (
        <div className="mb-3 rounded-lg border p-3 flex flex-col gap-2" style={{ borderColor: C.ink600, background: C.ink900 }}>
          {/* Photo + Name row */}
          <div className="flex items-start gap-3">
            <div className="relative shrink-0">
              <label
                title="Upload profile photo"
                style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "9999px", overflow: "hidden", width: 56, height: 56, border: `2px solid ${newMember.photo ? C.teal : C.ink600}`, background: C.ink800 }}
              >
                <input
                  ref={newMemberPhotoRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => setNewMember((f) => ({ ...f, photo: ev.target.result }));
                    reader.readAsDataURL(file);
                  }}
                />
                {newMember.photo ? (
                  <img src={newMember.photo} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <User size={22} style={{ color: C.textFaint }} />
                )}
              </label>
              <div
                className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border pointer-events-none"
                style={{ background: C.ink700, borderColor: C.ink600 }}
              >
                <Camera size={10} style={{ color: C.textFaint }} />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: C.textFaint }}>
                Name
              </label>
              <input
                autoFocus
                value={newMember.name}
                onChange={(e) => setNewMember((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Anita Sharma"
                className="qp-focusable w-full text-sm rounded-md px-2.5 py-1.5 outline-none"
                style={{ background: C.ink800, border: `1px solid ${C.ink600}`, color: C.textLight }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1 min-w-0">
              <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: C.textFaint }}>
                Phone number
              </label>
              <input
                value={newMember.phone}
                onChange={(e) => setNewMember((f) => ({ ...f, phone: e.target.value }))}
                placeholder="9900112233"
                inputMode="numeric"
                className="qp-mono qp-focusable w-full text-sm rounded-md px-2.5 py-1.5 outline-none"
                style={{ background: C.ink800, border: `1px solid ${C.ink600}`, color: C.textLight }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: C.textFaint }}>
                Password
              </label>
              <input
                value={newMember.password}
                onChange={(e) => setNewMember((f) => ({ ...f, password: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (handleAddMember()) setShowAddMember(false);
                  }
                }}
                placeholder="••••"
                type="text"
                className="qp-mono qp-focusable w-full text-sm rounded-md px-2.5 py-1.5 outline-none"
                style={{ background: C.ink800, border: `1px solid ${C.ink600}`, color: C.textLight }}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: C.textFaint }}>
              About <span style={{ color: C.ink600 }}>(optional)</span>
            </label>
            <textarea
              value={newMember.about}
              onChange={(e) => setNewMember((f) => ({ ...f, about: e.target.value }))}
              placeholder="Role, specialization, or a short note…"
              rows={2}
              className="qp-focusable w-full text-sm rounded-md px-2.5 py-1.5 outline-none resize-none"
              style={{ background: C.ink800, border: `1px solid ${C.ink600}`, color: C.textLight }}
            />
          </div>

          {memberFormError && (
            <div className="text-xs flex items-center gap-1.5" style={{ color: C.coral }}>
              <AlertTriangle size={12} /> {memberFormError}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-end gap-2 mt-1">
            <button
              onClick={() => {
                setShowAddMember(false);
                setMemberFormError("");
              }}
              className="qp-focusable text-xs px-2.5 py-1.5 rounded-md"
              style={{ color: C.textFaint }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (handleAddMember()) setShowAddMember(false);
              }}
              className="qp-focusable flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md shrink-0"
              style={{ background: C.amberSoft, color: C.amber, border: `1px solid ${C.amber}` }}
            >
              <Plus size={13} /> Add
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {members.length === 0 && (
          <div className="text-xs py-2" style={{ color: C.textFaint }}>
            No {memberWordPluralLower} yet. Add one above.
          </div>
        )}
        {members.map((m) => {
          const isEditing = editingMember === m.id;
          const memberDeskIds = (Array.isArray(m.deskIds) ? m.deskIds : []).map(String);
          const assignedDesks = desks.filter((d) => memberDeskIds.includes(String(d.id)));
          return (
            <div key={m.id} className="rounded-lg border p-3" style={{ borderColor: isEditing ? C.amber : C.ink700, background: C.ink900 }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center overflow-hidden border"
                    style={{ borderColor: C.ink600, background: C.ink800 }}
                  >
                    {m.photo ? (
                      <img src={m.photo} alt={m.name} className="w-full h-full object-cover" />
                    ) : (
                      <User size={16} style={{ color: C.textFaint }} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: C.textLight }}>
                      {m.name}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] mt-0.5 qp-mono" style={{ color: C.textFaint }}>
                      <Link2 size={11} />
                      {assignedDesks.length === 0 ? `No ${deskWordPluralLower} assigned` : assignedDesks.map((d) => d.name).join(", ")}
                    </div>
                    {m.about && (
                      <div className="text-[11px] mt-1 leading-snug" style={{ color: C.textMuted }}>
                        {m.about}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      setEditingMember(isEditing ? null : m.id);
                      setRevealedMemberPassword(null);
                    }}
                    title={`Edit ${memberWordLower}`}
                    className="qp-focusable p-1.5 rounded-md border"
                    style={{ borderColor: isEditing ? C.amber : C.ink600, color: isEditing ? C.amber : C.textFaint }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() =>
                      askConfirm(
                        `Remove this ${memberWordLower}?`,
                        `"${m.name}" will lose access and be unassigned from every ${deskWordLower}.`,
                        () => {
                          removeMember(m.id);
                          setEditingMember(null);
                        }
                      )
                    }
                    title={`Remove this ${memberWordLower}`}
                    className="qp-focusable p-1.5 rounded-md border"
                    style={{ borderColor: C.ink600, color: C.coral }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {isEditing && (
                <div className="mt-3 pt-3 border-t flex flex-col gap-3" style={{ borderColor: C.ink700 }}>
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <label
                        title="Change profile photo"
                        style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "9999px", overflow: "hidden", width: 56, height: 56, border: `2px solid ${m.photo ? C.teal : C.ink600}`, background: C.ink800 }}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => updateMember(m.id, { photo: ev.target.result });
                            reader.readAsDataURL(file);
                          }}
                        />
                        {m.photo ? (
                          <img src={m.photo} alt={m.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <User size={22} style={{ color: C.textFaint }} />
                        )}
                      </label>
                      <div
                        className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border pointer-events-none"
                        style={{ background: C.ink700, borderColor: C.ink600 }}
                      >
                        <Camera size={10} style={{ color: C.textFaint }} />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: C.textFaint }}>
                        Name
                      </label>
                      <input
                        value={m.name}
                        onChange={(e) => updateMember(m.id, { name: e.target.value })}
                        className="qp-focusable w-full text-sm rounded-md px-2.5 py-1.5 outline-none"
                        style={{ background: C.ink800, border: `1px solid ${C.ink600}`, color: C.textLight }}
                      />
                      {m.photo && (
                        <button onClick={() => updateMember(m.id, { photo: null })} className="text-[10px] mt-1 qp-focusable" style={{ color: C.coral }}>
                          Remove photo
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="flex-1 min-w-0">
                      <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: C.textFaint }}>
                        Phone number
                      </label>
                      <input
                        value={m.phone}
                        onChange={(e) => updateMember(m.id, { phone: e.target.value.replace(/\D/g, "") })}
                        inputMode="numeric"
                        className="qp-mono qp-focusable w-full text-sm rounded-md px-2.5 py-1.5 outline-none"
                        style={{ background: C.ink800, border: `1px solid ${C.ink600}`, color: C.textLight }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: C.textFaint }}>
                        Password
                      </label>
                      <div className="relative">
                        <input
                          value={m.password}
                          onChange={(e) => updateMember(m.id, { password: e.target.value })}
                          type={revealedMemberPassword === m.id ? "text" : "password"}
                          className="qp-mono qp-focusable w-full text-sm rounded-md pl-2.5 pr-8 py-1.5 outline-none"
                          style={{ background: C.ink800, border: `1px solid ${C.ink600}`, color: C.textLight }}
                        />
                        <button
                          onClick={() => setRevealedMemberPassword(revealedMemberPassword === m.id ? null : m.id)}
                          title={revealedMemberPassword === m.id ? "Hide password" : "Show password"}
                          className="qp-focusable absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded"
                          style={{ color: C.textFaint }}
                        >
                          {revealedMemberPassword === m.id ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: C.textFaint }}>
                      About <span style={{ color: C.ink600 }}>(optional)</span>
                    </label>
                    <textarea
                      value={m.about || ""}
                      onChange={(e) => updateMember(m.id, { about: e.target.value })}
                      placeholder="Role, specialization, or a short note…"
                      rows={2}
                      className="qp-focusable w-full text-sm rounded-md px-2.5 py-1.5 outline-none resize-none"
                      style={{ background: C.ink800, border: `1px solid ${C.ink600}`, color: C.textLight }}
                    />
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: C.textFaint }}>
                      Assigned {deskWordPluralLower}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {desks.length === 0 && (
                        <span className="text-xs" style={{ color: C.textFaint }}>
                          No {deskWordPluralLower} defined yet
                        </span>
                      )}
                      {desks.map((d) => {
                        const active = memberDeskIds.includes(String(d.id));
                        return (
                          <button
                            key={d.id}
                            onClick={() => toggleMemberDesk(m.id, d.id)}
                            className="qp-focusable text-[11px] px-2 py-1 rounded-full border"
                            style={
                              active
                                ? { background: C.amberSoft, borderColor: C.amber, color: C.amber }
                                : { background: "transparent", borderColor: C.ink600, color: C.textFaint }
                            }
                          >
                            {d.name}
                          </button>
                        );
                      })}
                    </div>
                    {memberDeskIds.length === 0 && desks.length > 0 && (
                      <div className="text-[10px] mt-1.5" style={{ color: C.textFaint }}>
                        No {deskWordPluralLower} selected — this {memberWordLower} isn't assigned anywhere yet.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
