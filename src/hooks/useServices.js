import { useState } from "react";

// >>> BACKEND INTEGRATION NOTE <<<
// Simple CRUD over a list — straightforward to swap for REST calls + socket sync later
// (POST /api/services, PATCH /api/services/:id, DELETE /api/services/:id).

export function useServices(initialServices) {
  const [services, setServices] = useState(initialServices);

  const addService = (name, details = {}) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const id = `svc-${Date.now()}`;
    setServices((s) => [...s, { id, name: trimmed, description: "", status: "Available", image: null, ...details }]);
    return id;
  };

  const renameService = (serviceId, name) => {
    setServices((s) => s.map((x) => (x.id === serviceId ? { ...x, name } : x)));
  };

  const updateService = (serviceId, updates) => {
    setServices((s) => s.map((x) => (x.id === serviceId ? { ...x, ...updates } : x)));
  };

  const removeService = (serviceId) => {
    setServices((s) => s.filter((x) => x.id !== serviceId));
  };

  const serviceName = (id) => services.find((s) => s.id === id)?.name || "General";

  return { services, setServices, addService, renameService, updateService, removeService, serviceName };
}
