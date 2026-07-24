# MarketLens — Feature-complete MVP scope và báo giá tham khảo

> Review cập nhật ngày 24/07/2026  
> Áp dụng cho `MARKETLENS_MASTER_PLAN.md` phiên bản 1.2  
> Không khóa deadline; ưu tiên đủ chức năng và triển khai theo phase.

## 1. Kết luận

MarketLens có thể làm đủ toàn bộ chức năng ban đầu mà không cần training,
fine-tune hoặc tự xây AI/ML model.

Kiến trúc phù hợp:

- KPI và analytics tính bằng FastAPI + pandas.
- Forecast dùng Moving Average/Linear Trend deterministic.
- AI Report gọi external AI API từ backend.
- Nếu AI API lỗi, report rule-based vẫn hoạt động.
- Auth và database dùng Supabase.
- PDF dùng print stylesheet/browser Save as PDF ở V1.
- File CSV/XLSX phải theo template MarketLens cố định.

Đây là **feature-complete MVP**, không phải production SaaS hoàn thiện. Mọi màn
hình và luồng chính đều chạy; animation, pixel-perfect mobile, mapping mọi file
sàn và thuật toán dự báo nâng cao không phải mục tiêu.

## 2. Checklist chức năng V1

### Landing Page

- Logo/tên MarketLens.
- Hero và nội dung giới thiệu.
- CTA “Bắt đầu miễn phí” và “Đăng nhập”.
- Ba nhóm tính năng chính.
- Header/footer cơ bản.

### Authentication

- Đăng ký.
- Đăng nhập.
- Quên mật khẩu.
- Đặt lại/đổi mật khẩu.
- Protected routes.
- Đăng xuất.

### Dashboard

- Tổng doanh thu.
- Tổng đơn hàng.
- Tổng khách hàng.
- Tổng sản phẩm bán ra.
- Doanh thu theo thời gian.
- Top sản phẩm.
- Top khách hàng.
- Phân loại khách hàng.
- Quick actions.

### Upload Data

- Kéo-thả hoặc chọn CSV/XLSX.
- File template tải xuống.
- Validate extension, size, columns và row values.
- Trạng thái xử lý.
- Lỗi dễ hiểu.
- Lưu kết quả phân tích.

### Sales Analytics

- Doanh thu theo ngày/tháng.
- Doanh thu theo sản phẩm.
- Doanh thu theo danh mục.
- Top theo doanh thu và số lượng.
- Sản phẩm có lượng bán thấp nhất trong dữ liệu.

### Customer Analytics

- Tổng khách hàng.
- Khách một đơn trong kỳ.
- Khách quay lại.
- Khách VIP.
- Khách tiềm năng theo doanh thu/tần suất trong kỳ.
- Top khách hàng theo doanh thu.
- Số đơn, số lượng và tổng chi tiêu.

### Forecast

- Dự báo 7 ngày.
- Actual và forecast trên cùng chart.
- So sánh forecast với 7 ngày gần nhất.
- Hiển thị method và disclaimer.
- Cảnh báo khi không đủ dữ liệu.

### AI Report

- Backend gửi aggregate JSON đã loại PII tới external AI API.
- Tổng quan, xu hướng, điểm nổi bật và tối đa ba khuyến nghị.
- Structured output validation.
- Nút tạo/tạo lại report.
- Rule-based fallback.
- Hiển thị report source trung thực.
- Xuất PDF.

### History và Profile

- Danh sách analysis.
- Mở lại analysis cũ.
- Xóa analysis của chính user sau confirm.
- Hiển thị email/tên.
- Cập nhật tên.
- Đổi mật khẩu.
- Đăng xuất.

### Chất lượng tối thiểu

- Loading, empty, error và success states.
- Responsive cơ bản.
- Ownership theo verified token.
- Không lộ secret.
- Không gửi raw file/customer PII tới AI.
- Test business rules chính.
- Deploy và smoke test.

## 3. Những gì không thuộc V1

- Kết nối trực tiếp Shopee/TikTok/Lazada.
- Tự nhận mọi cấu trúc Excel hoặc tự mapping cột.
- Training/fine-tune/model registry/GPU.
- Dự báo sản phẩm, tồn kho hoặc seasonality nâng cao.
- Multi-shop và phân quyền nhân viên.
- Subscription/thanh toán.
- Realtime dashboard.
- Chatbot hỏi đáp dữ liệu.
- Email report định kỳ.
- Lưu raw file lâu dài.
- Production SLA, audit/compliance cấp doanh nghiệp.

## 4. Kế hoạch triển khai

Không đặt ngày cứng. Mỗi phase chỉ hoàn thành khi gate pass:

1. Foundation local và protected vertical slice.
2. File validation, analytics và persistence.
3. Dashboard/Sales/Customers dùng dữ liệu thật.
4. Forecast và rule-based report.
5. External AI Report và PDF.
6. Forgot password, Profile và History.
7. Responsive, test, security và deploy.

Ước lượng một full-stack developer:

- Làm tập trung: khoảng **10–15 ngày làm việc**.
- Vừa làm vừa học/setup cùng nhau: khoảng **2–4 tuần lịch**, tùy thời gian mỗi
  ngày.
- Effort dự kiến: khoảng **70–100 giờ**.

Đây là estimate, không phải deadline cam kết. Nếu gặp lỗi provider/deploy, tăng
thời gian chứ không bỏ chức năng.

## 5. Báo giá tham khảo

| Gói | Phạm vi | Giá tham khảo |
|---|---|---:|
| UI prototype | Giao diện + mock data | 5–8 triệu VNĐ |
| Functional demo rút gọn | Không đủ toàn bộ V1 | 12–18 triệu VNĐ |
| Feature-complete MVP | Toàn bộ checklist phần 2 | 30–45 triệu VNĐ |
| MVP + QA/polish tốt hơn | Thêm test, responsive và PDF/UI chỉn chu | 45–65 triệu VNĐ |
| Production v1 | Monitoring, hardening, support, vận hành | Từ 80 triệu VNĐ |

Mức chào hợp lý cho feature-complete MVP là khoảng **35–40 triệu VNĐ**, chưa
gồm VAT, hosting, domain, AI API và yêu cầu mới ngoài checklist.

Gợi ý milestone:

- 20% khi freeze scope.
- 20% khi auth/foundation pass.
- 25% khi upload → analytics → database chạy.
- 20% khi đủ forecast/AI/PDF/profile/history.
- 15% sau deploy và smoke test.

## 6. Chi phí bên thứ ba

Demo có thể dùng free tier. Production nhỏ thường bắt đầu với:

- Supabase Pro từ $25/tháng.
- Frontend host từ $0–20/tháng tùy mục đích/gói.
- Backend từ khoảng $5–20/tháng.
- AI API tính theo lượng token sử dụng.
- Domain mua riêng.

Nguồn giá:

- https://supabase.com/pricing
- https://vercel.com/pricing
- https://railway.com/pricing
- https://openai.com/api/pricing/

## 7. Cách làm cùng nhau

Mỗi phần nhỏ theo chu trình:

1. Chốt mục tiêu và tiêu chí hoàn thành.
2. Chạy setup; giải thích command và biến môi trường.
3. Implement một vertical slice.
4. Chạy test/build.
5. Bro tự chạy lại để nắm luồng.
6. Commit trạng thái đang chạy được.
7. Sang phần tiếp theo.

Phần đầu tiên là **Foundation local**, chưa cần AI key:

- Cài backend dependencies.
- Scaffold React/Vite.
- Tạo FastAPI app và `/api/v1/health`.
- Chạy hai server.
- Giải thích cấu trúc repository.
