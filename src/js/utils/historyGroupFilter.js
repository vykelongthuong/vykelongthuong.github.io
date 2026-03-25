export function buildStoryGroupSelectOptions(groups = []) {
  const safeGroups = Array.isArray(groups) ? groups : [];
  return [
    { value: "", label: "Tất cả" },
    ...safeGroups.map((group) => ({ value: group, label: group })),
  ];
}

export function resolveStoryGroupSelection(currentValue = "", groups = []) {
  const normalizedCurrent = String(currentValue || "").trim().toLowerCase();
  if (!normalizedCurrent) return "";

  const safeGroups = Array.isArray(groups) ? groups : [];
  const matched = safeGroups.find(
    (group) => String(group || "").toLowerCase() === normalizedCurrent,
  );

  return matched || "";
}
