import { useState } from "react";
import { createSubmission } from "../lib/submissionsApi";
import { getServiceAvailability } from "../lib/serviceAvailability";

export function useTicketIssuer({ services, queue, desks, setQueue, serviceWordLower, onIssued }) {
  const [counters, setCounters] = useState({ general: 0, priority: 0 });
  const [form, setForm] = useState({ name: "", phone: "", serviceId: "" });
  const [issueStep, setIssueStep] = useState(1);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState(null);
  const [issuePending, setIssuePending] = useState(false);

  const issuedToday = counters.general + counters.priority;

  const resetForm = () => {
    setForm({ name: "", phone: "", serviceId: "" });
    setIssueStep(1);
    setFormError("");
  };

  const advanceIssueStep = () => {
    const name = form.name.trim();
    const phoneDigits = form.phone.trim().replace(/\D/g, "");

    if (!name && !phoneDigits) {
      setFormError("Please enter a name and mobile number to continue.");
      return false;
    }

    if (!name) {
      setFormError("Please enter a name to continue.");
      return false;
    }

    if (!phoneDigits) {
      setFormError("Please enter a mobile number to continue.");
      return false;
    }

    setFormError("");
    setIssueStep(2);
    return true;
  };

  const isServiceAvailable = (serviceId) => {
    if (!serviceId) return true;
    return getServiceAvailability(desks, serviceId).available;
  };

  const handleIssue = async (type, serviceIdOverride = null) => {
    if (issuePending) return;

    const name = form.name.trim();
    const phoneRaw = form.phone.trim();
    const phoneDigits = phoneRaw.replace(/\D/g, "");
    const selectedServiceId = serviceIdOverride || form.serviceId || (services.length === 1 ? services[0].id : "");

    if (!name || !phoneDigits) {
      setFormError("Please enter a name and mobile number before issuing a ticket.");
      return;
    }

    if (services.length > 1 && !selectedServiceId) {
      setFormError(`Please choose a ${serviceWordLower} to continue.`);
      return;
    }

    if (selectedServiceId && !isServiceAvailable(selectedServiceId)) {
      setFormError(`Selected ${serviceWordLower} is unavailable. Choose an open ${serviceWordLower}.`);
      return;
    }
    setFormError("");

    const inQueue = queue.find((t) => t.phone.replace(/\D/g, "") === phoneDigits);
    const deskWithMatch = desks.find((d) => d.current && d.current.phone.replace(/\D/g, "") === phoneDigits);
    const existing = inQueue || deskWithMatch?.current;
    if (existing) {
      onIssued?.(existing);
      resetForm();
      return;
    }

    setIssuePending(true);

    try {
      const { submission, counters: nextCounters } = await createSubmission({
        name,
        phone: phoneRaw,
        serviceId: selectedServiceId,
        type,
      });

      const ticket = {
        id: submission.id,
        label: submission.label,
        type: submission.type,
        name: submission.name,
        phone: submission.phone,
        serviceId: submission.serviceId || "",
        deskId: submission.deskId == null ? null : String(submission.deskId),
        createdAt: submission.createdAt,
      };

      setCounters((prev) => ({
        ...prev,
        ...nextCounters,
      }));
      setQueue((q) => [...q, ticket]);
      onIssued?.(ticket);
      resetForm();
    } catch (error) {
      setFormError(error.message || "Could not save the submission.");
    } finally {
      setIssuePending(false);
    }
  };

  const resetCounters = () => setCounters({ general: 0, priority: 0 });

  const syncCountersFromTickets = (tickets) => {
    const nextCounters = tickets.reduce(
      (next, ticket) => {
        const match = /^([AP])(\d+)$/i.exec(ticket.label || "");
        if (!match) return next;

        const value = Number(match[2]);
        if (!Number.isFinite(value)) return next;

        if (match[1].toUpperCase() === "P") {
          return { ...next, priority: Math.max(next.priority, value) };
        }

        return { ...next, general: Math.max(next.general, value) };
      },
      { general: 0, priority: 0 }
    );

    setCounters((prev) => ({
      general: Math.max(prev.general, nextCounters.general),
      priority: Math.max(prev.priority, nextCounters.priority),
    }));
  };

  return {
    counters,
    resetCounters,
    issuedToday,
    form,
    setForm,
    issueStep,
    setIssueStep,
    advanceIssueStep,
    formError,
    setFormError,
    toast,
    setToast,
    issuePending,
    syncCountersFromTickets,
    handleIssue,
    resetForm,
  };
}
