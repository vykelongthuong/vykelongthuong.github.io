export function filterRecordsByCompletedVisibility(
  records = [],
  shouldHideCompleted = false,
) {
  if (!Array.isArray(records)) return [];
  if (!shouldHideCompleted) return records;
  return records.filter((item) => !item?.isCompleted);
}

export function getCompletedVisibilityButtonText(shouldHideCompleted = false) {
  return shouldHideCompleted ? "Hiện truyện đã làm" : "Ẩn truyện đã làm";
}
