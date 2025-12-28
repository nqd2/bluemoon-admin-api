# bluemoon-admin-api

# BACKEND SPECIFICATION DOCUMENT

**Project:** BlueMoon Apartment Management System

**Version:** 1.0

**Stack:** Node.js, TypeScript, ExpressJS, MongoDB (Mongoose), JWT.

---

## 1. Tổng quan Kiến trúc

### 1.1. Cấu trúc thư mục (MVC + Layered)

```text
src/
├── config/         # Cấu hình DB, Environment variables
├── controllers/    # Xử lý request/response
├── middlewares/    # Auth, Error handling, Validation
├── models/         # Mongoose Schemas
├── routes/         # API Endpoints
├── services/       # Business Logic (tách biệt khỏi Controller)
├── utils/          # Helper functions (Hash password, Token)
└── server.ts       # Entry point

```

### 1.2. Database Schema (MongoDB)

*Dựa trên thiết kế Chapter 3 của báo cáo.*

1. **Users (Admin Accounts)**
* `email` (String, unique)
* `password` (String, hashed)
* `role` (String: 'ADMIN', 'MOD')


2. **Apartments (Hộ khẩu)**
* `name` (String: 'P101')
* `area` (Number: m2)
* `ownerId` (Ref: Residents)
* `members` (Array Ref: Residents)
* `status` (String: 'Active', 'Empty')


3. **Residents (Nhân khẩu)**
* `fullName`, `dob`, `gender`, `identityCard` (CCCD - unique)
* `hometown`, `job`
* `role` (String: 'Chủ hộ', 'Thành viên')
* `apartmentId` (Ref: Apartments)
* `status` (String: 'Thường trú', 'Tạm trú', 'Đã chuyển đi')


4. **Fees (Khoản thu)**
* `title`, `description`
* `type` (Enum: 'Service' - Bắt buộc, 'Contribution' - Tự nguyện)
* `amount` (Number: Đơn giá)
* `unit` (Enum: 'hộ', 'khẩu', 'm2')


5. **Transactions (Giao dịch)**
* `apartmentId`, `feeId`
* `totalAmount` (Số tiền thực đóng)
* `payerName`
* `date`



---

## 2. Danh sách Development Tickets (Backlog)

Dưới đây là các ticket được chia nhỏ để Dev có thể pick và làm việc ngay.

### Epic 1: System Setup & Authentication

#### <a href="docs/SRSs/BE-01.md">**[BE-01] Init Project & Database Connection**</a>

* **Mô tả:** Khởi tạo dự án Node.js, cài đặt các thư viện cần thiết và kết nối MongoDB Atlas.
* **Tech Stack:** Express, Mongoose, Dotenv, Cors, Helmet.
* **Acceptance Criteria (AC):**
* [ ] Server chạy thành công ở port 5000.
* [ ] Kết nối thành công tới MongoDB (log ra console).
* [ ] Cấu hình CORS để cho phép Frontend gọi API.
* [ ] Cấu hình Error Handler Middleware chung.



#### <a href="docs/SRSs/BE-02.md">**[BE-02] Admin Authentication (Login)**</a>

* **Mô tả:** API đăng nhập cho Admin, trả về JWT Token.
* **Endpoint:** `POST /api/auth/login`
* **Payload:** `{ email, password }`
* **AC:**
* [ ] Validate email/pass không được rỗng.
* [ ] So sánh password (dùng bcrypt).
* [ ] Nếu đúng, trả về Token (hạn 30 ngày) và thông tin user.
* [ ] Nếu sai, trả về 401 Unauthorized.



#### <a href="docs/SRSs/BE-03.md">**[BE-03] Auth Middleware**</a>

* **Mô tả:** Middleware chặn các request không có Token hợp lệ.
* **AC:**
* [ ] Kiểm tra Header `Authorization: Bearer <token>`.
* [ ] Verify token bằng `jsonwebtoken`.
* [ ] Gắn thông tin `req.user` nếu token đúng.
* [ ] Trả về 401 nếu token hết hạn hoặc không hợp lệ.



---

### Epic 2: Quản lý Nhân khẩu (Resident Module)

#### <a href="docs/SRSs/BE-04.md">**[BE-04] Create Resident (Thêm mới nhân khẩu)**</a>

* **Mô tả:** API thêm một người dân vào hệ thống.
* **Endpoint:** `POST /api/residents`
* **Payload:** `{ fullName, dob, gender, identityCard, hometown, apartmentId (optional) }`
* **AC:**
* [ ] Kiểm tra trùng số CCCD (`identityCard`). Nếu trùng trả về 400.
* [ ] Validate các trường bắt buộc.
* [ ] Lưu thành công vào collection `Residents`.



#### <a href="docs/SRSs/BE-05.md">**[BE-05] Get Residents List (Xem danh sách)**</a>

* **Mô tả:** Lấy danh sách cư dân, hỗ trợ phân trang và tìm kiếm.
* **Endpoint:** `GET /api/residents?page=1&limit=10&keyword=ABC`
* **AC:**
* [ ] Trả về danh sách object cư dân.
* [ ] Hỗ trợ tìm kiếm theo tên (`regex`).
* [ ] Trả về tổng số trang (`totalPages`) để FE phân trang.
* [ ] Populate thông tin phòng (nếu có).



#### <a href="docs/SRSs/BE-06.md">**[BE-06] Update & Delete Resident**</a>

* **Mô tả:** Chỉnh sửa thông tin hoặc xóa cư dân.
* **Endpoint:**
* `PUT /api/residents/:id`
* `DELETE /api/residents/:id`


* **AC:**
* [ ] Update: Cho phép sửa tên, ngày sinh, quê quán...
* [ ] Delete: Thực hiện Soft Delete (đổi trạng thái sang 'Đã chuyển đi') hoặc Hard Delete tuỳ yêu cầu (MVP dùng Hard Delete).
* [ ] Nếu cư dân là Chủ hộ, cảnh báo hoặc không cho xóa.



---

### Epic 3: Quản lý Hộ khẩu (Apartment Module)

#### <a href="docs/SRSs/BE-07.md">**[BE-07] Create Apartment (Thêm hộ khẩu)**</a>

* **Mô tả:** Tạo hồ sơ căn hộ mới.
* **Endpoint:** `POST /api/apartments`
* **Payload:** `{ name, area, ownerId (optional) }`
* **AC:**
* [ ] Kiểm tra mã phòng (`name`) đã tồn tại chưa.
* [ ] Lưu diện tích để tính phí dịch vụ.



#### <a href="docs/SRSs/BE-08.md">**[BE-08] Add Member to Apartment (Thêm người vào hộ)**</a>

* **Mô tả:** Gán một nhân khẩu vào một căn hộ.
* **Endpoint:** `POST /api/apartments/:id/members`
* **Payload:** `{ residentId, role }` (role: Chủ hộ/Thành viên)
* **Logic:**
* Cập nhật `apartmentId` bên Collection Resident.
* Push `residentId` vào mảng `members` bên Collection Apartment.


* **AC:**
* [ ] Nếu role là 'Chủ hộ', kiểm tra căn hộ đã có chủ hộ chưa. Nếu có rồi -> Báo lỗi.
* [ ] Đảm bảo tính nhất quán dữ liệu 2 bảng.



#### <a href="docs/SRSs/BE-09.md">**[BE-09] Get Apartment Details**</a>

* **Mô tả:** Lấy thông tin chi tiết căn hộ và danh sách thành viên.
* **Endpoint:** `GET /api/apartments/:id`
* **AC:**
* [ ] Populate `ownerId` để lấy tên chủ hộ.
* [ ] Populate mảng `members` để hiển thị danh sách thành viên.



---

### Epic 4: Quản lý Khoản thu (Fee Module)

#### <a href="docs/SRSs/BE-10.md">**[BE-10] Create Fee Type (Tạo khoản thu)**</a>

* **Mô tả:** Admin định nghĩa các khoản phí (VD: Phí dịch vụ T10/2025, Quỹ ủng hộ bão lụt).
* **Endpoint:** `POST /api/fees`
* **Payload:** `{ title, type, amount, unit }`
* **AC:**
* [ ] `type`: 'Service' (Bắt buộc) hoặc 'Contribution' (Tự nguyện).
* [ ] Nếu là Tự nguyện, `amount` có thể để 0 (người dân đóng tùy tâm).



#### <a href="docs/SRSs/BE-11.md">**[BE-11] Get Fee List**</a>

* **Mô tả:** Lấy danh sách các khoản thu đang kích hoạt.
* **Endpoint:** `GET /api/fees`
* **AC:**
* [ ] Sắp xếp theo ngày tạo mới nhất.



---

### Epic 5: Giao dịch & Thống kê (Transactions)

#### <a href="docs/SRSs/BE-12.md">**[BE-12] Calculate Fee for Apartment (Tính phí)**</a>

* **Mô tả:** API tính toán số tiền cần đóng cho 1 hộ đối với 1 khoản phí cụ thể.
* **Endpoint:** `POST /api/transactions/calculate`
* **Payload:** `{ apartmentId, feeId }`
* **Logic:**
* Lấy thông tin `Fee` và `Apartment`.
* Nếu unit = 'm2' -> `amount * area`.
* Nếu unit = 'khẩu' -> `amount * members.length`.
* Nếu unit = 'hộ' -> `amount`.


* **AC:**
* [ ] Trả về số tiền gợi ý.



#### <a href="docs/SRSs/BE-13.md">**[BE-13] Record Transaction (Ghi nhận đóng tiền)**</a>

* **Mô tả:** Lưu giao dịch khi người dân đến đóng tiền.
* **Endpoint:** `POST /api/transactions`
* **Payload:** `{ apartmentId, feeId, totalAmount, payerName }`
* **AC:**
* [ ] Kiểm tra xem hộ này đã đóng khoản phí này chưa (nếu là phí bắt buộc).
* [ ] Lưu vào collection `Transactions`.
* [ ] Trả về thông tin biên lai.



#### <a href="docs/SRSs/BE-14.md">**[BE-14] Get Payment Status (Thống kê tình trạng đóng)**</a>

* **Mô tả:** Xem danh sách các hộ đã đóng/chưa đóng cho một khoản phí.
* **Endpoint:** `GET /api/fees/:id/status`
* **Logic:**
* Lấy list tất cả `Apartments`.
* Lấy list `Transactions` của `feeId` đó.
* Map dữ liệu để biết hộ nào chưa có transaction.


* **AC:**
* [ ] Trả về danh sách gồm: Tên phòng, Chủ hộ, Trạng thái (Đã đóng/Chưa đóng), Số tiền (nếu đã đóng).



#### <a href="docs/SRSs/BE-15.md">**[BE-15] Dashboard Statistics**</a>

* **Mô tả:** API số liệu cho màn hình Dashboard.
* **Endpoint:** `GET /api/stats/dashboard`
* **AC:**
* [ ] Trả về: Tổng số nhân khẩu.
* [ ] Trả về: Tổng số căn hộ.
* [ ] Trả về: Tổng doanh thu (sum `totalAmount` trong transactions).
* [ ] Trả về: Số tiền thu được trong tháng hiện tại.



---

## 3. Các quy định chung về API

### 3.1. Request Headers

Tất cả các API (trừ Login) đều yêu cầu header sau:

```http
Content-Type: application/json
Authorization: Bearer <your_jwt_token>

```

### 3.2. Response Format

**Success (200, 201):**

```json
{
  "success": true,
  "data": { ... } // hoặc [ ... ]
}

```

**Error (400, 401, 404, 500):**

```json
{
  "success": false,
  "message": "Mô tả lỗi chi tiết"
}

```

### 3.3. Security Checklist

* [ ] **Helmet:** Bảo vệ HTTP Headers.
* [ ] **Rate Limiting:** Chống spam request (giới hạn 100 req/1 phút cho 1 IP).
* [ ] **Mongo Injection:** Validate dữ liệu đầu vào bằng `zod`.
* [ ] **XSS:** Sanitize dữ liệu đầu vào.

### 3.4. Naming Convention
Sử dụng **dot notation** cho tên file để phân loại rõ ràng.
*   **Format:** `[filename].[type].ts`
*   **Ví dụ:**
    *   `user.controller.ts`
    *   `auth.middleware.ts`
    *   `resident.model.ts`
    *   `user.routes.ts`
    *   `db.config.ts`