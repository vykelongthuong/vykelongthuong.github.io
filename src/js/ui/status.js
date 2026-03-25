import { dom } from "./dom.js";

export function showStatus(message, showSpinner = false) {
  const spinner = showSpinner ? '<div class="spinner"></div>' : "";
  dom.statusDiv.innerHTML = `${spinner}<span>${message}</span>`;
}

export function updateDetailedStatus(threadId, message, isError = false, charCount = null) {
  let statusLine = document.getElementById(`status-thread-${threadId}`);
  if (!statusLine) {
    statusLine = document.createElement("div");
    statusLine.id = `status-thread-${threadId}`;
    statusLine.className = "text-sm p-2 rounded-md transition-colors";
    dom.detailedStatusContainer.appendChild(statusLine);
  }

  const countHtml =
    charCount !== null
      ? ` <span class="text-xs text-slate-500">(${charCount.toLocaleString(
          "vi-VN"
        )} ký tự)</span>`
      : "";
  statusLine.innerHTML = `<span class="font-bold">Luồng ${threadId}:</span> ${message}${countHtml}`;

  if (isError) {
    statusLine.classList.remove("bg-slate-800", "text-green-400");
    statusLine.classList.add("bg-red-900/50", "text-red-400");
  } else if (message.includes("Hoàn thành")) {
    statusLine.classList.remove("bg-slate-800", "text-red-400");
    statusLine.classList.add("bg-green-900/50", "text-green-400");
  } else {
    statusLine.classList.remove(
      "bg-red-900/50",
      "text-red-400",
      "bg-green-900/50",
      "text-green-400"
    );
    statusLine.classList.add("bg-slate-800", "text-slate-300");
  }
}
