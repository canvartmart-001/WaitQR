export const DEFAULT_SERVICE_ID = "svc-general";
export const DEFAULT_DESK_ID = 1;

export const DEFAULT_SERVICES = [{ id: DEFAULT_SERVICE_ID, name: "Generel service", isDefault: true }];

export function seedQueue() {
  return [];
}

export function seedDesks() {
  return [{ id: DEFAULT_DESK_ID, name: "Desk 1", services: [DEFAULT_SERVICE_ID], locked: false, current: null, isDefault: true }];
}

export function seedServedLog() {
  return [];
}

export function seedAbsentList() {
  return [];
}

export function seedRemovedLog() {
  return [];
}

export function seedMembers() {
  return [];
}
