import { useState } from "react";
import { AdminSettingsContent } from "./AdminSettingsContent";

const DEFAULT_SETTINGS = {
  systemName: "WaitQR",
  timezone: "(GMT+05:30) Asia/Kolkata",
  dateFormat: "DD MMM YYYY (12 Jul 2025)",
  timeFormat: "12 Hour (03:45 PM)",
  currency: "USD",
  language: "English",
  estTime: 5,
  autoTicket: true,
  ticketPrefix: "WQ",
  resetTime: "12:00 AM",
  soundAlert: true,
  whatsapp: false,
  emailNotif: true,
  showWait: true,
  showBranding: true,
  sessionTimeout: "30 Minutes",
  twoFA: false,
};

export function AdminSettingsPage({ theme, defaultAppearance, onSaveSettings }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [savedAt, setSavedAt] = useState(null);
  const set = (key) => (value) => setSettings((current) => ({ ...current, [key]: value }));

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    theme.setAppearance(defaultAppearance);
    setSavedAt(null);
  };

  const handleSave = async () => {
    const ok = await onSaveSettings?.();
    if (ok !== false) setSavedAt(new Date().toLocaleTimeString());
  };

  return (
    <div style={{ "--field-bg": "rgba(255,255,255,0.04)" }}>
      <AdminSettingsContent
        s={{
          ...settings,
          systemName: theme.systemName || settings.systemName,
          setSystemName: theme.setSystemName || set("systemName"),
          setTimezone: set("timezone"),
          setDateFormat: set("dateFormat"),
          setTimeFormat: set("timeFormat"),
          currency: theme.currency || settings.currency,
          setCurrency: theme.setCurrency || set("currency"),
          setLanguage: set("language"),
          setEstTime: set("estTime"),
          setAutoTicket: set("autoTicket"),
          setTicketPrefix: set("ticketPrefix"),
          setResetTime: set("resetTime"),
          setSoundAlert: set("soundAlert"),
          setWhatsapp: set("whatsapp"),
          setEmailNotif: set("emailNotif"),
          setShowWait: set("showWait"),
          setShowBranding: set("showBranding"),
          setSessionTimeout: set("sessionTimeout"),
          setTwoFA: set("twoFA"),
          savedAt,
          handleSave,
          handleReset,
        }}
        theme={theme}
      />
    </div>
  );
}
