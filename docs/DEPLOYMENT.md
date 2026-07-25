# Deploy MarketLens

MarketLens có thể deploy thành hai service độc lập:

```text
marketlens-web  -> React/Vite static site
marketlens-api  -> FastAPI web service
                  |
                  -> Supabase Hosted
                  -> Gemini API (mặc định) hoặc OpenAI API
```

Repository có sẵn `render.yaml` cho Render Blueprint và `Dockerfile` cho
backend nếu dùng nền tảng hỗ trợ container.

## 1. Gate trước deploy

Từ thư mục gốc:

```bash
.venv/bin/pytest backend/tests -q
.venv/bin/python scripts/generate_ds_demo_data.py --check
.venv/bin/python scripts/verify_academic_evidence.py --check
.venv/bin/python scripts/benchmark_analysis.py --max-seconds 30
.venv/bin/python scripts/check_secrets.py
.venv/bin/python scripts/run_browser_journey_e2e.py
.venv/bin/python scripts/run_report_e2e.py
cd frontend
npm ci
npm audit --omit=dev
npm test
npm run lint
npm run build
```

Không deploy nếu bất kỳ lệnh nào thất bại.

## 2. Render Blueprint

1. Đưa repository lên GitHub, GitLab hoặc Bitbucket.
2. Trong Render chọn `New > Blueprint`.
3. Chọn repository có file `render.yaml`.
4. Render tạo:
   - `marketlens-api`, FastAPI tại region Singapore.
   - `marketlens-web`, Vite static site.
5. Điền các biến có `sync: false` trong Dashboard.

Backend:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
AI_API_KEY
```

Frontend:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Không đặt `SUPABASE_SECRET_KEY` hoặc `AI_API_KEY` vào frontend.

`render.yaml` mặc định dùng Gemini Free Tier với
`gemini-3.5-flash-lite`. Tạo key theo `docs/AI_REPORT_SETUP.md` và nhập key vào
service backend. Không bật billing cho project Gemini nếu muốn đảm bảo không
phát sinh phí; khi hết quota ứng dụng tự dùng report rule-based.

Blueprint tự nối:

- URL frontend vào `FRONTEND_ORIGINS`.
- URL backend vào `VITE_API_ORIGIN`.
- `/api/v1` được frontend tự thêm.
- SPA routes được rewrite về `index.html`.
- Assets có hash được cache immutable.

Plan trong Blueprint là `free` để tránh tạo chi phí ngoài ý muốn. Free web
service có thể cold start; nâng plan sau khi xác nhận ngân sách và yêu cầu
uptime.

## 3. Supabase production

Trong `Authentication > URL Configuration`:

```text
Site URL:
https://YOUR_MARKETLENS_WEB_DOMAIN

Redirect URLs:
https://YOUR_MARKETLENS_WEB_DOMAIN/reset-password
```

Giữ URL local nếu vẫn cần kiểm thử local.

Trước khi mở cho người dùng thật:

- Cấu hình custom SMTP.
- Kiểm tra email xác nhận đăng ký nếu tính năng này đang bật.
- Gửi và mở một email reset bằng inbox do bạn sở hữu.
- Kiểm tra RLS bằng `supabase/schema.sql`.

Xem thêm `docs/SUPABASE_AUTH_SETUP.md`.

## 4. Custom domain

Nếu thêm custom domain:

1. Cập nhật `FRONTEND_ORIGINS` bằng HTTPS origin chính xác.
2. Cập nhật `VITE_API_ORIGIN` nếu backend dùng custom domain.
3. Thêm frontend custom domain vào Supabase Site URL và Redirect URLs.
4. Nếu backend không còn dùng `*.onrender.com`, thêm hostname đó vào
   `connect-src` trong static header CSP của `render.yaml`.
5. Rebuild frontend vì biến `VITE_*` được đóng vào bundle lúc build.

Backend production từ chối khởi động nếu CORS chứa HTTP, localhost, wildcard
hoặc path.

## 5. Docker backend tùy chọn

Build:

```bash
docker build -t marketlens-api .
```

Run bằng file env production:

```bash
docker run --env-file backend/.env -e PORT=8000 -p 8000:8000 marketlens-api
```

Container chạy non-root, đọc `PORT`, bind `0.0.0.0`, bật proxy headers và có
health check tại `/api/v1/health`.

Không copy file `.env` vào image.

## 6. Automated production smoke

Tạo riêng một tài khoản smoke test đã xác nhận email. Không dùng tài khoản của
khách hàng.

Khai báo biến trong terminal, không commit:

```bash
export SMOKE_FRONTEND_ORIGIN=https://YOUR_MARKETLENS_WEB_DOMAIN
export SMOKE_API_ORIGIN=https://YOUR_MARKETLENS_API_DOMAIN
export SMOKE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
export SMOKE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
export SMOKE_TEST_EMAIL=YOUR_SMOKE_USER_EMAIL
export SMOKE_TEST_PASSWORD=YOUR_SMOKE_USER_PASSWORD
```

Chạy:

```bash
.venv/bin/python scripts/smoke_production.py
```

Script kiểm tra:

- Frontend.
- Backend health và token verification.
- Upload file demo 60 ngày.
- KPI và forecast đúng test oracle.
- History list/detail.
- AI Report qua provider đã cấu hình trả `source = "ai"`.
- Xóa analysis test trong `finally`.

Script không in access token, password hoặc key.

## 7. Manual smoke bắt buộc

Automated smoke không thay thế các bước cần browser/inbox:

- Register, email confirmation và login.
- Forgot password, mở email và reset.
- Landing desktop/mobile.
- Drag-and-drop CSV và XLSX.
- Dashboard, Sales, Customer, Forecast.
- AI Report và browser Save as PDF.
- Profile cập nhật tên và đổi mật khẩu.
- History mở/xóa với dialog xác nhận.
- Refresh trực tiếp từng protected route.
- Logout, login lại và mở analysis cũ.
- Light theme, keyboard focus và mobile navigation.

## 8. Rollback

Nếu smoke fail:

1. Không đổi hoặc xóa database schema.
2. Rollback frontend/backend về deploy xanh gần nhất trên Render.
3. Kiểm tra env có được lưu đúng service không.
4. Kiểm tra CORS, Supabase Redirect URLs và SMTP.
5. Chạy lại automated smoke trước khi mở traffic.
