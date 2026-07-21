import { Children, useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  Clock,
  Minus,
  Monitor,
  Palette,
  Plus,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  Upload,
  Users,
  X,
} from "lucide-react";
import { readImageFile } from "../../../lib/imageUpload";

function withAlpha(hex, alphaHex) {
  if (!hex || hex.length !== 7) return hex;
  return `${hex}${alphaHex}`;
}

function focusHandlers(accent, restoreBorderColor) {
  return {
    onFocus: (e) => {
      e.target.style.borderColor = accent;
      e.target.style.boxShadow = `0 0 0 3px ${withAlpha(accent, "33")}`;
    },
    onBlur: (e) => {
      e.target.style.borderColor = restoreBorderColor || "";
      e.target.style.boxShadow = "";
    },
  };
}

function useIsNarrow(breakpoint = 640) {
  const [isNarrow, setIsNarrow] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );

  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);

  return isNarrow;
}

function Toggle({ checked, onChange, accent }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200"
      style={{ backgroundColor: checked ? accent : "rgba(148, 163, 184, 0.35)" }}
      aria-pressed={checked}
    >
      <span
        className="absolute h-5 w-5 rounded-full bg-white transition-transform duration-200 ease-out"
        style={{
          transform: checked ? "translateX(22px)" : "translateX(2px)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
        }}
      />
    </button>
  );
}

function Select({ value, onChange, options, accent, fontColor, borderColor, radius }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...focusHandlers(accent, borderColor)}
        style={{ color: fontColor, borderColor, borderRadius: radius, backgroundColor: "var(--field-bg)" }}
        className="w-full appearance-none border px-3 py-2 text-sm outline-none transition-colors"
      >
        {options.map((option) => {
          const opt = typeof option === "string" ? { value: option, label: option } : option;
          return (
          <option key={opt.value} value={opt.value} style={{ color: "#0f172a" }}>
            {opt.label}
          </option>
          );
        })}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
        style={{ color: withAlpha(fontColor, "80") }}
      />
    </div>
  );
}

function TextInput({ value, onChange, placeholder, accent, fontColor, borderColor, radius }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      {...focusHandlers(accent, borderColor)}
      style={{ color: fontColor, borderColor, borderRadius: radius, backgroundColor: "var(--field-bg)" }}
      className="w-full border px-3 py-2 text-sm outline-none transition-colors placeholder:text-current placeholder:opacity-40"
    />
  );
}

function Stepper({ value, onChange, min = 1, fontColor, borderColor, radius }) {
  return (
    <div
      className="flex items-center justify-between border px-3 py-1.5"
      style={{ borderColor, borderRadius: radius, backgroundColor: "var(--field-bg)" }}
    >
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} style={{ color: withAlpha(fontColor, "99") }}>
        <Minus size={14} />
      </button>
      <span className="text-sm" style={{ color: fontColor }}>
        {value}
      </span>
      <button type="button" onClick={() => onChange(value + 1)} style={{ color: withAlpha(fontColor, "99") }}>
        <Plus size={14} />
      </button>
    </div>
  );
}

function Field({ label, hint, children, fontColor, inline }) {
  const isNarrow = useIsNarrow();
  const stacked = isNarrow && !inline;

  return (
    <div
      className="flex gap-2 py-4"
      style={stacked ? { flexDirection: "column" } : { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium" style={{ color: fontColor }}>
          {label}
        </p>
        {hint && (
          <p className="mt-0.5 text-xs" style={{ color: withAlpha(fontColor, "80") }}>
            {hint}
          </p>
        )}
      </div>
      <div style={{ width: stacked ? "100%" : inline ? "auto" : "16rem", flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function ColorSwatchInput({ label, hint, value, onChange, fontColor, radius, borderColor }) {
  const isNarrow = useIsNarrow();
  const compactRadius = Math.max(10, Math.min(14, radius));

  return (
    <div
      className="flex gap-2 py-4"
      style={isNarrow ? { flexDirection: "column" } : { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: "1.5rem" }}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium" style={{ color: fontColor }}>
          {label}
        </p>
        {hint && (
          <p className="mt-0.5 text-xs" style={{ color: withAlpha(fontColor, "80") }}>
            {hint}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3" style={{ width: isNarrow ? "100%" : "16rem", flexShrink: 0 }}>
        <label
          className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden border"
          style={{ borderRadius: compactRadius, borderColor, backgroundColor: value }}
        >
          <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundColor: value }} />
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer border-none p-0 opacity-0"
          />
        </label>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...focusHandlers(value, borderColor)}
          style={{ color: fontColor, borderRadius: compactRadius, borderColor, backgroundColor: "var(--field-bg)" }}
          className="h-9 w-full border px-3 py-2 text-sm uppercase outline-none transition-colors"
        />
      </div>
    </div>
  );
}

function RadiusControl({ value, onChange, fontColor, borderColor }) {
  const clamp = (n) => Math.max(0, Math.min(48, n));
  const isNarrow = useIsNarrow();
  const compactRadius = Math.max(10, Math.min(14, value));

  return (
    <div
      className="flex gap-2 py-4"
      style={isNarrow ? { flexDirection: "column" } : { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: "1.5rem" }}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium" style={{ color: fontColor }}>
          Corner Radius
        </p>
        <p className="mt-0.5 text-xs" style={{ color: withAlpha(fontColor, "80") }}>
          Roundness applied to cards, inputs, and buttons
        </p>
      </div>
      <div className="flex items-center gap-3" style={{ width: isNarrow ? "100%" : "16rem", flexShrink: 0 }}>
        <div
          className="h-9 w-9 shrink-0"
          style={{
            borderTop: `1.5px solid ${borderColor}`,
            borderLeft: `1.5px solid ${borderColor}`,
            borderRight: `1.5px dotted ${borderColor}`,
            borderBottom: `1.5px dotted ${borderColor}`,
            borderTopLeftRadius: value,
            backgroundColor: "var(--field-bg)",
          }}
        />
        <div className="relative w-full">
          <input
            type="number"
            min={0}
            max={48}
            value={value}
            onChange={(e) => onChange(clamp(Number(e.target.value) || 0))}
            {...focusHandlers("#2563eb", borderColor)}
            style={{ color: fontColor, borderColor, borderRadius: compactRadius, backgroundColor: "var(--field-bg)" }}
            className="h-9 w-full border px-3 py-2 pr-8 text-sm outline-none transition-colors"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: withAlpha(fontColor, "80") }}>
            px
          </span>
        </div>
      </div>
    </div>
  );
}

function LogoUpload({ logoUrl, onUpload, onRemove, fontColor, radius, borderColor }) {
  const inputRef = useRef(null);
  const isNarrow = useIsNarrow();

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readImageFile(file).then(onUpload).catch((error) => {
      console.warn(error.message);
    });
  };

  return (
    <div
      className="flex gap-2 py-4"
      style={isNarrow ? { flexDirection: "column" } : { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: "1.5rem" }}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium" style={{ color: fontColor }}>
          Brand Logo
        </p>
        <p className="mt-0.5 text-xs" style={{ color: withAlpha(fontColor, "80") }}>
          Upload an image to replace the default logo mark
        </p>
      </div>
      <div className="flex items-center gap-3" style={{ width: isNarrow ? "100%" : "16rem", flexShrink: 0 }}>
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden border"
          style={{ borderRadius: radius, borderColor, backgroundColor: "var(--field-bg)" }}
        >
          {logoUrl ? (
            <img src={logoUrl} alt="Logo preview" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs font-bold" style={{ color: fontColor }}>
              W
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-2 border px-3 py-2 text-xs transition-colors hover:bg-white/5"
          style={{ color: fontColor, borderRadius: radius, borderColor, backgroundColor: "var(--field-bg)" }}
        >
          <Upload size={13} />
          Upload
        </button>
        {logoUrl && (
          <button
            type="button"
            onClick={onRemove}
            className="flex h-9 w-9 shrink-0 items-center justify-center border transition-colors hover:bg-white/5"
            style={{ color: withAlpha(fontColor, "99"), borderRadius: radius, borderColor, backgroundColor: "var(--field-bg)" }}
            title="Remove logo"
          >
            <X size={14} />
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </div>
    </div>
  );
}

function SectionCard({ icon: Icon, iconBg, title, children, fontColor, borderColor, separatorColor, radius }) {
  const items = Children.toArray(children);

  return (
    <section className="border bg-white/5 p-4" style={{ borderColor, borderRadius: radius * 1.4 }}>
      <div className="mb-2 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center" style={{ backgroundColor: iconBg, borderRadius: radius }}>
          <Icon size={18} className="text-white" />
        </div>
        <h2 className="text-base font-semibold" style={{ color: fontColor }}>
          {title}
        </h2>
      </div>
      <div>
        {items.map((child, i) => (
          <div key={i} style={i > 0 ? { borderTop: `1px solid ${separatorColor}` } : undefined}>
            {child}
          </div>
        ))}
      </div>
    </section>
  );
}

export function AdminSettingsContent({ s, theme }) {
  const { accentColor, fontColor, borderColor, separatorColor, radius, logoUrl } = theme;
  const cardProps = { fontColor, borderColor, separatorColor, radius };

  return (
    <div className="space-y-4 px-2.5 py-2.5 sm:space-y-6 sm:px-6 sm:py-6 md:pl-10 md:pr-6">
      <SectionCard icon={Settings} iconBg={accentColor} title="General Settings" {...cardProps}>
        <Field label="System Timezone" hint="Set the default timezone for the system" fontColor={fontColor}>
          <Select
            value={s.timezone}
            onChange={s.setTimezone}
            accent={accentColor}
            fontColor={fontColor}
            borderColor={borderColor}
            radius={radius}
            options={["(GMT+05:30) Asia/Kolkata", "(GMT+00:00) UTC", "(GMT-05:00) America/New_York", "(GMT+01:00) Europe/Berlin"]}
          />
        </Field>
        <Field label="Date Format" hint="Set the default date format" fontColor={fontColor}>
          <Select
            value={s.dateFormat}
            onChange={s.setDateFormat}
            accent={accentColor}
            fontColor={fontColor}
            borderColor={borderColor}
            radius={radius}
            options={["DD MMM YYYY (12 Jul 2025)", "MM/DD/YYYY (07/12/2025)", "YYYY-MM-DD (2025-07-12)"]}
          />
        </Field>
        <Field label="Time Format" hint="Set the default time format" fontColor={fontColor}>
          <Select
            value={s.timeFormat}
            onChange={s.setTimeFormat}
            accent={accentColor}
            fontColor={fontColor}
            borderColor={borderColor}
            radius={radius}
            options={["12 Hour (03:45 PM)", "24 Hour (15:45)"]}
          />
        </Field>
        <Field label="Currency" hint="Used for service prices" fontColor={fontColor}>
          <Select
            value={s.currency}
            onChange={s.setCurrency}
            accent={accentColor}
            fontColor={fontColor}
            borderColor={borderColor}
            radius={radius}
            options={[
              { value: "USD", label: "Dollar ($)" },
              { value: "GBP", label: "Pound (£)" },
              { value: "INR", label: "INR (₹)" },
            ]}
          />
        </Field>
        <Field label="System Language" hint="Select default language" fontColor={fontColor}>
          <Select
            value={s.language}
            onChange={s.setLanguage}
            accent={accentColor}
            fontColor={fontColor}
            borderColor={borderColor}
            radius={radius}
            options={["English", "Hindi", "Bengali", "Spanish"]}
          />
        </Field>
      </SectionCard>

      <SectionCard icon={Palette} iconBg={accentColor} title="Appearance" {...cardProps}>
        <Field label="Display Theme" hint="Applies a matching color preset below (you can still fine-tune each color)" fontColor={fontColor}>
          <Select value={theme.themeMode} onChange={theme.handleThemeChange} accent={accentColor} fontColor={fontColor} borderColor={borderColor} radius={radius} options={["Dark", "Light", "System"]} />
        </Field>
        <Field label="Brand Name" hint="Name of your WaitQR system" fontColor={fontColor}>
          <TextInput value={s.systemName} onChange={s.setSystemName} accent={accentColor} fontColor={fontColor} borderColor={borderColor} radius={radius} />
        </Field>
        <LogoUpload
          logoUrl={logoUrl}
          onUpload={theme.setLogoUrl}
          onRemove={() => theme.setLogoUrl(null)}
          fontColor={fontColor}
          borderColor={borderColor}
          radius={radius}
        />
        <ColorSwatchInput label="Accent Color" hint="Used for active states, toggles, and the save button" value={accentColor} onChange={theme.setAccentColor} fontColor={fontColor} borderColor={borderColor} radius={radius} />
        <ColorSwatchInput label="Background Color" hint="Base background color for the dashboard" value={theme.bgColor} onChange={theme.setBgColor} fontColor={fontColor} borderColor={borderColor} radius={radius} />
        <ColorSwatchInput label="Font Color" hint="Text color used across labels, headings, and inputs" value={fontColor} onChange={theme.setFontColor} fontColor={fontColor} borderColor={borderColor} radius={radius} />
        <ColorSwatchInput label="Border Color" hint="Applied to card, input, and sidebar borders" value={borderColor} onChange={theme.setBorderColor} fontColor={fontColor} borderColor={borderColor} radius={radius} />
        <ColorSwatchInput label="Separator Color" hint="Divider lines between fields inside each card" value={separatorColor} onChange={theme.setSeparatorColor} fontColor={fontColor} borderColor={borderColor} radius={radius} />
        <RadiusControl value={radius} onChange={theme.setRadius} fontColor={fontColor} borderColor={borderColor} />
      </SectionCard>

      <SectionCard icon={Users} iconBg={accentColor} title="Queue Settings" {...cardProps}>
        <Field label="Default Estimated Time" hint="Default time (in minutes) for new services" fontColor={fontColor}>
          <Stepper value={s.estTime} onChange={s.setEstTime} min={1} fontColor={fontColor} borderColor={borderColor} radius={radius} />
        </Field>
        <Field label="Auto Generate Ticket Number" hint="Automatically generate ticket numbers" inline fontColor={fontColor}>
          <div className="flex justify-end">
            <Toggle checked={s.autoTicket} onChange={s.setAutoTicket} accent={accentColor} />
          </div>
        </Field>
        <Field label="Ticket Prefix" hint="Prefix for ticket numbers" fontColor={fontColor}>
          <TextInput value={s.ticketPrefix} onChange={s.setTicketPrefix} accent={accentColor} fontColor={fontColor} borderColor={borderColor} radius={radius} />
        </Field>
        <Field label="Daily Reset Time" hint="Time when daily stats will be reset" fontColor={fontColor}>
          <div className="relative">
            <input
              value={s.resetTime}
              onChange={(e) => s.setResetTime(e.target.value)}
              {...focusHandlers(accentColor, borderColor)}
              style={{ color: fontColor, borderColor, borderRadius: radius, backgroundColor: "var(--field-bg)" }}
              className="w-full border px-3 py-2 text-sm outline-none transition-colors"
            />
            <Clock size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: withAlpha(fontColor, "80") }} />
          </div>
        </Field>
      </SectionCard>

      <SectionCard icon={Bell} iconBg={accentColor} title="Notifications Settings" {...cardProps}>
        <Field label="Sound Alert" hint="Play sound when next ticket is called" inline fontColor={fontColor}>
          <div className="flex justify-end">
            <Toggle checked={s.soundAlert} onChange={s.setSoundAlert} accent={accentColor} />
          </div>
        </Field>
        <Field label="WhatsApp Notifications" hint="Send WhatsApp alerts to assigned members" inline fontColor={fontColor}>
          <div className="flex justify-end">
            <Toggle checked={s.whatsapp} onChange={s.setWhatsapp} accent={accentColor} />
          </div>
        </Field>
        <Field label="Email Notifications" hint="Send email notifications for important events" inline fontColor={fontColor}>
          <div className="flex justify-end">
            <Toggle checked={s.emailNotif} onChange={s.setEmailNotif} accent={accentColor} />
          </div>
        </Field>
      </SectionCard>

      <SectionCard icon={Monitor} iconBg={accentColor} title="Display Settings" {...cardProps}>
        <Field label="Show Wait Time on Display" hint="Show estimated wait time on public display" inline fontColor={fontColor}>
          <div className="flex justify-end">
            <Toggle checked={s.showWait} onChange={s.setShowWait} accent={accentColor} />
          </div>
        </Field>
        <Field label="Show Branding on Display" hint="Show system branding on display screen" inline fontColor={fontColor}>
          <div className="flex justify-end">
            <Toggle checked={s.showBranding} onChange={s.setShowBranding} accent={accentColor} />
          </div>
        </Field>
      </SectionCard>

      <SectionCard icon={ShieldCheck} iconBg={accentColor} title="Security Settings" {...cardProps}>
        <Field label="Session Timeout" hint="Automatically logout after inactivity" fontColor={fontColor}>
          <Select value={s.sessionTimeout} onChange={s.setSessionTimeout} accent={accentColor} fontColor={fontColor} borderColor={borderColor} radius={radius} options={["15 Minutes", "30 Minutes", "1 Hour", "Never"]} />
        </Field>
        <Field label="Two Factor Authentication" hint="Require 2FA for admin login" inline fontColor={fontColor}>
          <div className="flex justify-end">
            <Toggle checked={s.twoFA} onChange={s.setTwoFA} accent={accentColor} />
          </div>
        </Field>
      </SectionCard>

      <div className="flex flex-col gap-2 pb-4">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={s.handleReset}
            className="flex items-center gap-2 border px-4 py-2 text-sm transition-colors hover:bg-white/5"
            style={{ color: withAlpha(fontColor, "cc"), borderColor, borderRadius: radius }}
          >
            <RotateCcw size={15} />
            Reset to Default
          </button>
          <div className="flex items-center gap-3">
            {s.savedAt && <span className="hidden text-xs text-emerald-400 sm:inline">Saved at {s.savedAt}</span>}
            <button
              onClick={s.handleSave}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white shadow-lg transition-opacity hover:opacity-90"
              style={{ backgroundColor: accentColor, borderRadius: radius }}
            >
              <Save size={15} />
              Save Changes
            </button>
          </div>
        </div>
        {s.savedAt && <span className="text-right text-xs text-emerald-400 sm:hidden">Saved at {s.savedAt}</span>}
      </div>
    </div>
  );
}
