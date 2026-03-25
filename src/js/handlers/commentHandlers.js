import { dom } from "../ui/dom.js";
import { showStatus } from "../ui/status.js";
import { translateTextAI, translateTextGoogle } from "../services/apiService.js";
import { commentPromptTemplate } from "../prompts.js";
import { state } from "../state.js";

function pushConversationMessage(message) {
  state.currentConversationLog.push({
    at: new Date().toISOString(),
    ...message,
  });
}

export function snapshotComments() {
  const commentItems = dom.formattedCommentsOutput.querySelectorAll(".comment-item");
  return Array.from(commentItems).map((item) => {
    const author = item.querySelector(".font-bold")?.textContent?.replace(":", "").trim() || "";
    const text = item.querySelector(".comment-text")?.textContent?.trim() || "";
    return {
      author,
      text,
    };
  });
}

export function handleCommentProcessing() {
  const htmlString = dom.commentHtmlInput.value;
  if (!htmlString.trim()) {
    alert("Vui lòng dán nội dung HTML.");
    return;
  }

  dom.commentModal.classList.add("hidden");
  dom.commentSection.classList.remove("hidden");
  dom.formattedCommentsOutput.innerHTML = "";

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");
    const commentBlocks = doc.querySelectorAll("div[data-id]");
    let commentIndex = 0;

    commentBlocks.forEach((block) => {
      const authorNode = block.querySelector("a.css-10u695f");
      const commentNode = block.querySelector(".CommentContent");

      if (authorNode && commentNode) {
        const authorName = authorNode.innerText.trim();
        const commentText = commentNode.innerText.trim();

        if (authorName && commentText) {
          const commentDiv = document.createElement("div");
          commentDiv.className =
            "comment-item flex justify-between items-start gap-x-2";
          commentDiv.dataset.commentId = commentIndex;

          commentDiv.innerHTML = `
              <div>
                  <span class="font-bold text-teal-400">${authorName}: </span>
                  <span class="comment-text text-slate-300" data-original-text="${encodeURIComponent(
                    commentText
                  )}">${commentText}</span>
              </div>
              <div class="flex items-center gap-x-1 flex-shrink-0">
                  <button title="Dịch nhanh" class="comment-translate-btn" data-type="google" data-comment-id="${commentIndex}"><i class="fa-brands fa-google text-green-500 hover:text-green-400"></i></button>
                  <button title="Dịch AI" class="comment-translate-btn" data-type="ai" data-comment-id="${commentIndex}"><i class="fa-solid fa-wand-magic-sparkles text-indigo-500 hover:text-indigo-400"></i></button>
              </div>`;

          dom.formattedCommentsOutput.appendChild(commentDiv);
          commentIndex++;
        }
      }
    });

    if (dom.formattedCommentsOutput.children.length > 0) {
      pushConversationMessage({
        role: "system",
        type: "comments_import",
        content: `Imported ${dom.formattedCommentsOutput.children.length} comments from HTML`,
      });
      dom.commentActions.classList.remove("hidden");
      dom.commentActions.classList.add("flex");
      dom.formattedCommentsOutput.classList.remove("hidden");
      dom.toggleCommentsBtn.querySelector("i").classList.add("fa-eye");
      dom.toggleCommentsBtn.querySelector("i").classList.remove("fa-eye-slash");
    } else {
      dom.commentActions.classList.add("hidden");
      dom.formattedCommentsOutput.innerHTML =
        '<p class="text-slate-500 p-2">Không tìm thấy comment nào có định dạng phù hợp (ví dụ: comment từ Zhihu).</p>';
    }
  } catch (error) {
    console.error("Lỗi khi xử lý HTML:", error);
    dom.commentActions.classList.add("hidden");
    dom.formattedCommentsOutput.innerHTML =
      '<p class="text-red-500 p-2">Đã xảy ra lỗi khi xử lý HTML. Vui lòng kiểm tra lại nội dung đã dán.</p>';
  }
}

export async function translateAllComments(method) {
  const commentElements =
    dom.formattedCommentsOutput.querySelectorAll(".comment-text");
  if (commentElements.length === 0) return;

  dom.translateAllCommentsGoogleBtn.disabled = true;
  dom.translateAllCommentsAIBtn.disabled = true;
  showStatus(
    `Đang dịch toàn bộ comment bằng ${method.toUpperCase()}...`,
    true
  );

  const originalTexts = Array.from(commentElements).map((el) =>
    decodeURIComponent(el.dataset.originalText)
  );

  try {
    let translatedTexts = [];
    if (method === "google") {
      translatedTexts = await Promise.all(
        originalTexts.map((text) => translateTextGoogle(text))
      );
    } else {
      translatedTexts = await translateTextAI(
        originalTexts.join("\n[<->]\n"),
        commentPromptTemplate
      ).then((res) => res.split("[<->]").map((text) => text.trim()));
    }

    if (originalTexts.length !== translatedTexts.length) {
      throw new Error("Số lượng comment trả về không khớp.");
    }

    commentElements.forEach((el, index) => {
      el.textContent = translatedTexts[index] || originalTexts[index];
    });
    pushConversationMessage({
      role: "assistant",
      type: "comments_translation_batch",
      content: `Translated all comments using ${method}`,
    });
    showStatus("Dịch toàn bộ comment hoàn tất!", false);
  } catch (error) {
    console.error("Lỗi dịch toàn bộ comment:", error);
    showStatus(`Lỗi dịch: ${error.message}`, false);
  } finally {
    dom.translateAllCommentsGoogleBtn.disabled = false;
    dom.translateAllCommentsAIBtn.disabled = false;
  }
}

export async function handleSingleCommentTranslate(event) {
  const button = event.target.closest(".comment-translate-btn");
  if (!button) return;

  const { type, commentId } = button.dataset;
  const commentTextElement = dom.formattedCommentsOutput.querySelector(
    `[data-comment-id='${commentId}'] .comment-text`
  );
  const originalText = decodeURIComponent(
    commentTextElement.dataset.originalText
  );

  const originalIcon = button.innerHTML;
  button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
  button.disabled = true;

  try {
    let translatedText = "";
    if (type === "google") {
      translatedText = await translateTextGoogle(originalText);
    } else {
      translatedText = await translateTextAI(
        originalText,
        commentPromptTemplate.replace(
          "The comments are separated by a unique delimiter: `[<->]`.",
          ""
        )
      );
    }
    commentTextElement.textContent = translatedText;
    pushConversationMessage({
      role: "assistant",
      type: "comment_translation_single",
      content: `Translated one comment using ${type}`,
    });
  } catch (error) {
    console.error(`Lỗi dịch comment #${commentId}:`, error);
    commentTextElement.textContent = `Lỗi dịch: ${error.message}`;
  } finally {
    button.innerHTML = originalIcon;
    button.disabled = false;
  }
}
