import { dom } from "../ui/dom.js";
import { state } from "../state.js";
import {
  updateCharacterCount,
  updateTranslateButtonState,
} from "../ui/inputState.js";

export async function handleFileSelect() {
  dom.pasteInput.value = "";
  if (dom.docFileInput.files.length > 0) {
    const file = dom.docFileInput.files[0];
    dom.fileNameSpan.textContent = file.name;
    dom.uploadIcon.classList.add("hidden");
    dom.clearFileBtn.classList.remove("hidden");

    let fileContent = "";
    if (file.name.toLowerCase().endsWith(".srt")) {
      state.currentFileType = "srt";
      fileContent = await file.text();
      dom.customPromptContainer.classList.add("hidden");
      dom.titleSuggestionBtn.classList.add("hidden");
      dom.storyDescriptionBtn.classList.add("hidden");
      dom.storyDescriptionArea.classList.add("hidden");
      dom.storyDescriptionOutput.textContent = "";
      dom.addCommentBtn.classList.add("hidden");
      dom.evaluateBtn.classList.add("hidden");
      dom.qaSection.classList.add("hidden");
      dom.qaQuestionInput.value = "";
      dom.qaAnswerOutput.textContent = "";
    } else {
      state.currentFileType = "docx";
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      fileContent = result.value;
      dom.addCommentBtn.classList.remove("hidden");
      dom.evaluateBtn.classList.remove("hidden");
      dom.customPromptContainer.classList.remove("hidden");
      dom.titleSuggestionBtn.classList.remove("hidden");
      dom.storyDescriptionBtn.classList.remove("hidden");
      dom.qaSection.classList.remove("hidden");
    }
    updateCharacterCount(fileContent);
  } else {
    updateCharacterCount("");
  }
  updateTranslateButtonState();
}
