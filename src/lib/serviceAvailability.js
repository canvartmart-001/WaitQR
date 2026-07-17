export function desksHandlingService(desks, serviceId) {
  if (!serviceId) return desks;
  return desks.filter((desk) => desk.services.includes(serviceId));
}

export function getServiceAvailability(desks, serviceId) {
  const assignedDesks = desksHandlingService(desks, serviceId);
  return {
    assignedCount: assignedDesks.length,
    available: assignedDesks.length > 0,
  };
}
