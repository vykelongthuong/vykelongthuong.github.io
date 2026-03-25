# Tài liệu Hướng dẫn API Local LLM

Tài liệu này mô tả chi tiết các endpoint và cách cấu hình để tương tác với dịch vụ ngôn ngữ tại máy cục bộ qua cổng 8317.

---

## 1. Thông tin chung
* **Base URL:** `http://localhost:8317`
* **Xác thực:** Bearer Token
* **Token:** `hello`
* **Header yêu cầu:** `Authorization: Bearer hello`

---

## 2. Danh sách Endpoint

### API 1: Lấy danh sách Model
Sử dụng để liệt kê toàn bộ các mô hình (models) đang khả dụng trong hệ thống.

* **Phương thức:** `GET`
* **Đường dẫn:** `/v1/models`
* **Authentication:** `Bearer hello`

---

### API 2: Tạo phản hồi Chat (Chat Completions)
Gửi một chuỗi các tin nhắn hội thoại để nhận về văn bản phản hồi từ mô hình AI được chỉ định.

* **Phương thức:** `POST`
* **Đường dẫn:** `/v1/chat/completions`
* **Authentication:** `Bearer hello`

#### Tham số Request Body
| Trường | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `model` | String | ID của model được chọn (lấy từ kết quả API `/v1/models`). |
| `messages` | Array | Danh sách các đối tượng tin nhắn chứa nội dung hội thoại. |
| `stream` | Boolean | `true` để nhận phản hồi dạng luồng dữ liệu, `false` để nhận toàn bộ kết quả một lần. |

#### Cấu trúc đối tượng Message trong mảng `messages`
* **`role`**: Vai trò của chủ thể gửi tin nhắn.
    * `system`: Thiết lập các quy tắc, vai trò hoặc bối cảnh cho AI.
    * `user`: Câu hỏi hoặc yêu cầu trực tiếp từ người dùng.
    * `assistant`: Phản hồi trước đó của AI (dùng để lưu giữ ngữ cảnh hội thoại).
* **`content`**: Nội dung văn bản chi tiết của tin nhắn.

#### Ví dụ Request
```json
{
  "model": "gpt-5.2-2025-12-11",
  "messages": [
    {
      "role": "system",
      "content": "Bạn là chuyên gia dịch thuật phụ đề phim Trung - Việt."
    },
    {
      "role": "user",
      "content": "Dịch câu: '穿越到了大明王朝'"
    }
  ],
  "stream": false
}
```

#### Ví dụ Response
```json
{
    "id": "resp_05dd63aa35a410620169b84918adc08191931f564d142464f9",
    "object": "chat.completion",
    "created": 1773685016,
    "model": "gpt-5.2-2025-12-11",
    "choices": [
        {
            "index": 0,
            "message": {
                "role": "assistant",
                "content": "nội dung phản hồi",
                "reasoning_content": null,
                "tool_calls": null
            },
            "finish_reason": "stop",
            "native_finish_reason": "stop"
        }
    ],
    "usage": {
        "completion_tokens": 75,
        "total_tokens": 95,
        "prompt_tokens": 20,
        "prompt_tokens_details": {
            "cached_tokens": 0
        },
        "completion_tokens_details": {
            "reasoning_tokens": 0
        }
    }
}