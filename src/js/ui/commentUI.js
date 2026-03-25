import { dom } from "./dom.js";

export function toggleCommentVisibility() {
  const icon = dom.toggleCommentsBtn.querySelector("i");
  const isHidden = dom.formattedCommentsOutput.classList.toggle("hidden");

  if (isHidden) {
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  } else {
    icon.classList.remove("fa-eye-slash");
    icon.classList.add("fa-eye");
  }
}

export function toggleEvaluationVisibility() {
  const icon = dom.toggleEvaluationBtn.querySelector("i");
  const isHidden = dom.evaluationOutput.classList.toggle("hidden");

  if (isHidden) {
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  } else {
    icon.classList.remove("fa-eye-slash");
    icon.classList.add("fa-eye");
  }
}
