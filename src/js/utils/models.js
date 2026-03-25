function normalizeOwnedBy(value) {
  const ownedBy = `${value || ""}`.trim().toLowerCase();
  return ownedBy || "other";
}

export function filterModelIds(models) {
  if (!Array.isArray(models)) {
    return [];
  }

  return models
    .map((model) => ({
      id: `${model?.id || ""}`.trim(),
      ownedBy: normalizeOwnedBy(model?.owned_by),
      created:
        typeof model?.created === "number" && Number.isFinite(model.created)
          ? model.created
          : 0,
    }))
    .filter((model) => model.id)
    .filter((model) => !model.id.toLowerCase().includes("codex"));
}

export function groupModelIdsByProvider(models) {
  const groups = {};

  models.forEach((model) => {
    const provider = normalizeOwnedBy(model?.ownedBy);
    if (!groups[provider]) {
      groups[provider] = [];
    }
    groups[provider].push(model);
  });

  Object.keys(groups).forEach((provider) => {
    groups[provider].sort((a, b) => {
      if (b.created !== a.created) {
        return b.created - a.created;
      }
      return a.id.localeCompare(b.id);
    });
  });

  return groups;
}
