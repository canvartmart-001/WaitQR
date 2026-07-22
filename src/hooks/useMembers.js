import { useEffect, useRef, useState } from "react";
import { memberCanBeAssignedToDesk, memberCanBeAssignedToService, normalizeMemberRole, uniqueIds } from "../lib/assignments";

function randomDigits(length) {
  const values = new Uint8Array(length);
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(values);
    return Array.from(values, (value) => String(value % 10)).join("");
  }

  return Array.from({ length }, () => String(Math.floor(Math.random() * 10))).join("");
}

// >>> BACKEND INTEGRATION NOTE <<<
// `password` is stored and displayed in plaintext today purely because this is local-only demo
// state. The moment a real backend exists, this MUST change: passwords should be hashed
// server-side (e.g. bcrypt) before storage, the client should never receive the hash or
// plaintext back, and the "reveal password" eye-icon feature (see ManageMembersSection) should be
// removed entirely — there is no legitimate product reason to show a stored password back to an
// admin once real auth exists. Treat this as a known, intentional placeholder, not a pattern to
// carry forward.

export function useMembers(initialMembers) {
  const [members, setMembers] = useState(initialMembers);
  const membersRef = useRef(initialMembers);

  const normalizeMemberId = (id) => String(id || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24);
  const normalizeThemeMode = (themeMode) => (["Dark", "Light", "System"].includes(themeMode) ? themeMode : null);

  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  const commitMembers = (nextMembers) => {
    membersRef.current = nextMembers;
    setMembers(nextMembers);
  };

  const replaceMembers = (nextMembers) => {
    commitMembers(typeof nextMembers === "function" ? nextMembers(membersRef.current) : nextMembers);
  };

  const addMember = ({ name, phone, password, photo, about, employeeId, role, themeMode, email, status, deskIds, serviceIds }) => {
    const trimmedName = String(name || "").trim();
    const phoneDigits = String(phone || "").trim().replace(/\D/g, "");
    const trimmedPassword = String(password || "").trim();
    const fallbackId = `MEM${randomDigits(8)}`;
    const trimmedId = normalizeMemberId(employeeId || fallbackId);
    const normalizedThemeMode = normalizeThemeMode(themeMode);

    if (!trimmedName || !phoneDigits) {
      return { ok: false, error: "missing-fields" };
    }
    if (!/^[A-Z0-9]{3,24}$/.test(trimmedId)) {
      return { ok: false, error: "invalid-id" };
    }

    const list = membersRef.current;
    if (list.some((m) => String(m.id).trim().toLowerCase() === trimmedId.toLowerCase())) {
      return { ok: false, error: "duplicate-id" };
    }
    if (list.some((m) => String(m.phone || "").replace(/\D/g, "") === phoneDigits)) {
      return { ok: false, error: "duplicate-phone" };
    }

    commitMembers([
      ...list,
      {
        id: trimmedId,
        name: trimmedName,
        phone: phoneDigits,
        password: trimmedPassword,
        photo: photo || null,
        about: String(about || "").trim(),
        role: normalizeMemberRole(role),
        ...(normalizedThemeMode ? { themeMode: normalizedThemeMode } : {}),
        email: String(email || "").trim(),
        status: status || "Active",
        deskIds: uniqueIds(deskIds),
        serviceIds: uniqueIds(serviceIds),
      },
    ]);

    return { ok: true, memberId: trimmedId };
  };

  const updateMember = (memberId, patch) => {
    const nextPatch = { ...patch };
    const list = membersRef.current;
    const currentMember = list.find((m) => String(m.id) === String(memberId));
    if (!currentMember) {
      return { ok: false, error: "not-found" };
    }

    const nextId = Object.prototype.hasOwnProperty.call(nextPatch, "id") ? normalizeMemberId(nextPatch.id) : String(currentMember.id);

    if (!nextId || !/^[A-Z0-9]{3,24}$/.test(nextId)) {
      return { ok: false, error: "invalid-id" };
    }

    if (list.some((m) => String(m.id).trim().toLowerCase() === nextId.toLowerCase() && String(m.id) !== String(memberId))) {
      return { ok: false, error: "duplicate-id" };
    }

    if (Object.prototype.hasOwnProperty.call(nextPatch, "phone")) {
      nextPatch.phone = String(nextPatch.phone || "").replace(/\D/g, "");
      if (!nextPatch.phone) {
        return { ok: false, error: "missing-fields" };
      }
      if (list.some((m) => String(m.phone || "").replace(/\D/g, "") === nextPatch.phone && String(m.id) !== String(memberId))) {
        return { ok: false, error: "duplicate-phone" };
      }
    }

    if (Object.prototype.hasOwnProperty.call(nextPatch, "deskIds")) {
      nextPatch.deskIds = uniqueIds(nextPatch.deskIds);
    }

    if (Object.prototype.hasOwnProperty.call(nextPatch, "serviceIds")) {
      nextPatch.serviceIds = uniqueIds(nextPatch.serviceIds);
    }

    if (Object.prototype.hasOwnProperty.call(nextPatch, "role")) {
      nextPatch.role = normalizeMemberRole(nextPatch.role);
    }

    if (Object.prototype.hasOwnProperty.call(nextPatch, "themeMode")) {
      nextPatch.themeMode = normalizeThemeMode(nextPatch.themeMode) || currentMember.themeMode || "Dark";
    }

    if (Object.prototype.hasOwnProperty.call(nextPatch, "id")) {
      nextPatch.id = nextId;
    }

    commitMembers(list.map((m) => (String(m.id) === String(memberId) ? { ...m, ...nextPatch } : m)));

    return { ok: true, memberId: nextId };
  };

  const removeMember = (memberId) => {
    commitMembers(membersRef.current.filter((m) => String(m.id) !== String(memberId)));
  };

  const toggleMemberDesk = (memberId, deskId) => {
    commitMembers(
      membersRef.current.map((m) => {
        if (String(m.id) !== String(memberId)) return m;
        const deskIds = uniqueIds(m.deskIds);
        const has = deskIds.map(String).includes(String(deskId));
        return { ...m, deskIds: has ? deskIds.filter((id) => String(id) !== String(deskId)) : [...deskIds, deskId] };
      })
    );
  };

  const setMemberDesks = (memberId, deskIds) => {
    commitMembers(membersRef.current.map((m) => (String(m.id) === String(memberId) ? { ...m, deskIds: uniqueIds(deskIds) } : m)));
  };

  const toggleMemberService = (memberId, serviceId) => {
    commitMembers(
      membersRef.current.map((m) => {
        if (String(m.id) !== String(memberId)) return m;
        const serviceIds = uniqueIds(m.serviceIds);
        const has = serviceIds.map(String).includes(String(serviceId));
        return { ...m, serviceIds: has ? serviceIds.filter((id) => String(id) !== String(serviceId)) : [...serviceIds, serviceId] };
      })
    );
  };

  const setMemberServices = (memberId, serviceIds) => {
    commitMembers(membersRef.current.map((m) => (String(m.id) === String(memberId) ? { ...m, serviceIds: uniqueIds(serviceIds) } : m)));
  };

  const setServiceMembers = (serviceId, memberIds) => {
    const targetMemberIds = new Set((Array.isArray(memberIds) ? memberIds : []).map(String));
    commitMembers(
      membersRef.current.map((m) => {
        if (!memberCanBeAssignedToService(m)) return m;
        const currentServices = uniqueIds(m.serviceIds);
        const shouldHaveService = targetMemberIds.has(String(m.id)) && memberCanBeAssignedToService(m);
        const hasService = currentServices.map(String).includes(String(serviceId));

        if (shouldHaveService === hasService) return m;

        return {
          ...m,
          serviceIds: shouldHaveService
            ? uniqueIds([...currentServices, serviceId])
            : currentServices.filter((id) => String(id) !== String(serviceId)),
        };
      })
    );
  };

  const setDeskMembers = (deskId, memberIds) => {
    const targetMemberIds = new Set((Array.isArray(memberIds) ? memberIds : []).map(String));
    commitMembers(
      membersRef.current.map((m) => {
        if (!memberCanBeAssignedToDesk(m)) return m;
        const currentDesks = uniqueIds(m.deskIds);
        const shouldHaveDesk = targetMemberIds.has(String(m.id)) && memberCanBeAssignedToDesk(m);
        const hasDesk = currentDesks.map(String).includes(String(deskId));

        if (shouldHaveDesk === hasDesk) return m;

        return {
          ...m,
          deskIds: shouldHaveDesk
            ? uniqueIds([...currentDesks, deskId])
            : currentDesks.filter((id) => String(id) !== String(deskId)),
        };
      })
    );
  };

  const unassignDeskFromAllMembers = (deskId) => {
    commitMembers(membersRef.current.map((m) => ({ ...m, deskIds: uniqueIds(m.deskIds).filter((id) => String(id) !== String(deskId)) })));
  };

  const removeServiceFromAllMembers = (serviceId) => {
    commitMembers(membersRef.current.map((m) => ({ ...m, serviceIds: uniqueIds(m.serviceIds).filter((id) => String(id) !== String(serviceId)) })));
  };

  return {
    members,
    setMembers: replaceMembers,
    addMember,
    updateMember,
    removeMember,
    toggleMemberDesk,
    setMemberDesks,
    toggleMemberService,
    setMemberServices,
    setServiceMembers,
    setDeskMembers,
    unassignDeskFromAllMembers,
    removeServiceFromAllMembers,
  };
}
