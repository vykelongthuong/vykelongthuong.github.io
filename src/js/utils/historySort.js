export function normalizeGroupText(input = "") {
  if (typeof input !== "string") return "";
  return input.trim().toLowerCase();
}

export function extractAudioGenreGroupKey(record = {}) {
  const candidates = [record?.name, record?.fileName, record?.customStoryTitle];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;

    const matched = candidate.match(/^\s*audio\s+(.+?)\s*\/\s*/i);
    if (matched?.[1]) {
      return normalizeGroupText(matched[1]);
    }
  }

  return normalizeGroupText(record?.customStoryGenre || "");
}

export function getAvailableStoryGroups(records = []) {
  const safeRecords = Array.isArray(records) ? records : [];
  const groups = new Set();

  safeRecords.forEach((record) => {
    const groupKey = extractAudioGenreGroupKey(record);
    if (groupKey) groups.add(groupKey);
  });

  return [...groups].sort((a, b) =>
    a.localeCompare(b, "vi", {
      sensitivity: "base",
      numeric: true,
    }),
  );
}

export function isStoryGroupMatch(record = {}, selectedGroup = "") {
  const normalizedSelected = normalizeGroupText(selectedGroup);
  if (!normalizedSelected) return true;

  const recordGroup = extractAudioGenreGroupKey(record);
  return recordGroup === normalizedSelected;
}

export function sortRecordsByStoryGroup(records = []) {
  const safeRecords = Array.isArray(records) ? [...records] : [];

  return safeRecords
    .map((record, index) => ({
      record,
      index,
      groupKey: extractAudioGenreGroupKey(record),
      displayName: String(record?.name || record?.fileName || ""),
    }))
    .sort((a, b) => {
      if (!a.groupKey && b.groupKey) return 1;
      if (a.groupKey && !b.groupKey) return -1;

      const groupCompare = a.groupKey.localeCompare(b.groupKey, "vi", {
        sensitivity: "base",
        numeric: true,
      });

      if (groupCompare !== 0) return groupCompare;

      const nameCompare = a.displayName.localeCompare(b.displayName, "vi", {
        sensitivity: "base",
        numeric: true,
      });

      if (nameCompare !== 0) return nameCompare;

      return a.index - b.index;
    })
    .map((item) => item.record);
}
