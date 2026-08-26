# Chợ Vé — Zalo Mini App trao đổi/mua bán vé sự kiện

Mini App chạy trong Zalo để đăng tin, tìm và trao đổi/mua bán vé sự kiện: ca nhạc,
xem phim, đá bóng, và (giai đoạn tiếp theo) đặt sân thể thao (pickleball, bóng đá).

## Kiến trúc

- **`miniapp/`** — Zalo Mini App (React + TypeScript + Vite + `zmp-ui` + `zmp-sdk`).
  Đây là phần người dùng thấy trong Zalo.
- **`functions/`** — Firebase Cloud Functions. Chỉ có 1 function `zaloLogin`:
  nhận access token lấy được từ `zmp-sdk` phía client, xác thực lại với Zalo Graph
  API (server-to-server), rồi cấp Firebase custom token. Nhờ vậy client không thể
  giả mạo danh tính người khác, và Firestore/Storage rules có thể dựa vào
  `request.auth.uid` một cách an toàn.
- **Firestore** — lưu `users/{uid}` (chỉ Cloud Function được ghi) và
  `listings/{id}` (tin đăng vé, đọc công khai, chỉ chủ tin được sửa/xoá).
- **Storage** — ảnh vé, theo cấu trúc `listing-images/{sellerId}/...`.

## Vì sao không có màn hình đăng ký/đăng nhập riêng?

Zalo Mini App chạy trong Zalo, nên định danh người dùng lấy thẳng từ Zalo
(qua `zmp-sdk`) thay vì tự làm hệ thống tài khoản. Khi cần thao tác cần định danh
(đăng tin, xem "Tin của tôi"), app tự động gọi `ensureSignedIn()` để lấy access
token Zalo → đổi thành Firebase custom token → đăng nhập Firebase Auth, không cần
người dùng nhập gì thêm.

## MVP hiện có

- Trang chủ: tìm kiếm + lọc theo danh mục (Ca nhạc, Phim, Đá bóng, Sân thể thao).
- Chi tiết tin: xem thông tin vé, người bán, nút "Nhắn tin qua Zalo" (mở thẳng
  cuộc trò chuyện Zalo với người bán qua `openChat`).
- Đăng tin: chọn danh mục, hình thức (bán/trao đổi), ngày giờ, địa điểm, giá,
  ảnh vé (chọn ảnh bằng `chooseImage`, upload lên Firebase Storage).
- Tin của tôi: xem/đánh dấu đã bán/xoá tin đã đăng.

Chưa làm ở MVP này (có thể bổ sung sau): thanh toán trong app, đặt lịch sân thể
thao theo khung giờ, chat nội bộ (đang dùng thẳng Zalo Chat), kiểm duyệt tin.

## Thiết lập

### 1. Tạo Firebase project (nếu chưa có)

```bash
# Trong Firebase Console: tạo project mới, bật Firestore, Storage, Functions,
# Authentication (không cần bật provider nào, chỉ dùng custom token).
```

Cập nhật `.firebaserc` với đúng project ID của bạn.

### 2. Cấu hình web app Firebase cho Mini App

```bash
cd miniapp
cp .env.example .env.local
# Điền các giá trị lấy từ Firebase Console > Project settings > Your apps > Web app
```

### 3. Cài đặt & chạy thử

```bash
# Cloud Functions
cd functions && npm install && npm run build

# Deploy rules + functions
cd .. && firebase deploy --only firestore:rules,storage:rules,functions

# Zalo Mini App
cd miniapp && npm install
npm run dev   # mở Zalo Mini App Simulator / preview qua zmp-cli
```

### 4. Đăng ký App ID với Zalo

Tạo Mini App tại [Zalo Mini App Studio](https://mini.zalo.me), lấy App ID, sau đó
chạy `npx zmp-cli login` rồi `npm run deploy` trong `miniapp/` để đóng gói và nộp
bản build lên Zalo. Nhớ thêm domain Cloud Functions
(`https://<region>-<project-id>.cloudfunctions.net`) vào danh sách domain được
phép gọi trong cấu hình Mini App trên Zalo Developers.

## Việc tiếp theo gợi ý

- Đặt sân thể thao (pickleball, bóng đá): thêm collection `courts` + `bookings`,
  UI chọn khung giờ trống theo lịch chủ sân đăng.
- Thanh toán trong app (Momo/ZaloPay) khi cần giao dịch không qua liên hệ trực tiếp.
- Kiểm duyệt tin đăng (Cloud Function chạy khi tạo `listings` mới) để hạn chế lừa đảo.
