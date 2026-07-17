import { useState } from "react";
import { pluralize } from "../lib/format";

/** Centralizes the "Desk"/"Service"/"Member" terminology customization. Each label is editable by
 * the admin (e.g. rename "Desk" to "Counter"), and every screen needs several case/plural
 * variants of it — deriving them all in one place keeps that logic from being copy-pasted three
 * times across components. */
export function useLabels() {
  const [deskLabel, setDeskLabel] = useState("Desk");
  const [serviceLabel, setServiceLabel] = useState("Service");
  const [memberLabel, setMemberLabel] = useState("Member");

  const deskWord = String(deskLabel || "").trim() || "Desk";
  const deskWordLower = deskWord.toLowerCase();
  const deskWordPlural = pluralize(deskWord);
  const deskWordPluralLower = deskWordPlural.toLowerCase();

  const serviceWord = String(serviceLabel || "").trim() || "Service";
  const serviceWordLower = serviceWord.toLowerCase();
  const serviceWordPlural = pluralize(serviceWord);
  const serviceWordPluralLower = serviceWordPlural.toLowerCase();

  const memberWord = String(memberLabel || "").trim() || "Member";
  const memberWordLower = memberWord.toLowerCase();
  const memberWordPlural = pluralize(memberWord);
  const memberWordPluralLower = memberWordPlural.toLowerCase();

  return {
    deskLabel, setDeskLabel, deskWord, deskWordLower, deskWordPlural, deskWordPluralLower,
    serviceLabel, setServiceLabel, serviceWord, serviceWordLower, serviceWordPlural, serviceWordPluralLower,
    memberLabel, setMemberLabel, memberWord, memberWordLower, memberWordPlural, memberWordPluralLower,
  };
}
