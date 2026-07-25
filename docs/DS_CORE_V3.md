# MarketLens DS Core V3

> Trạng thái: `LOCKED`. Backend, frontend, persistence và development data đã
> clean-cut sang contract `3.0`; toàn bộ gate DS Core đã đạt.

## 1. Mục tiêu

DS Core V3 nâng MarketLens từ descriptive analytics có forecast baseline thành
một data product có quy trình thực nghiệm đầy đủ:

- so sánh các phương pháp forecast trên time-series backtest;
- chọn phương pháp phù hợp cho từng analysis;
- định lượng khoảng bất định từ sai số lịch sử;
- đo product association bằng support, confidence và lift;
- đo customer retention theo acquisition cohort;
- cung cấp evidence có cấu trúc cho AI Report V2.

Không tạo model chung từ dữ liệu synthetic, không lưu model, không dùng dữ liệu
shop này để dự báo cho shop khác và không gửi raw rows/PII đến AI.

## 2. Migration contract

- Target contract: `3.0`.
- V2 không được giữ bằng optional field hoặc compatibility branch.
- Runtime chỉ đổi sang V3 khi backend schema, frontend type, persistence và
  tests đã đồng bộ.
- Development `public.analyses` được reset một lần sau cutover; Auth users và
  database schema được giữ nguyên.
- Kết quả V3 tiếp tục nằm trong `analyses.result_json`; không thêm bảng chỉ để
  chứa aggregate mới.

## 3. Dataset strategy

Synthetic data chỉ là test/demo fixture có ground truth, không phải training
data. Generator chính thức:

```text
scripts/generate_ds_demo_data.py
```

Generator dùng seed `20260725` và tạo:

- `marketlens_ds_demo_365_days.csv`: integrated demo 365 ngày, 800 khách hàng,
  24 sản phẩm, weekly seasonality, campaign spikes, zero-sales days,
  multi-product baskets, discount và đủ ba order status;
- `forecast_weekly_84_days.csv`: weekly seasonality oracle;
- `association_known_lift.csv`: 100 order với support/confidence/lift biết
  trước;
- `cohort_known_retention.csv`: retention counts biết trước.

Mọi file phải qua validator production, dưới 50.000 dòng và không chứa danh
tính thật. Dataset 60 ngày hiện tại tiếp tục là regression oracle V2/E3.

## 4. Forecast candidate selection

Candidate deterministic:

| Method | Minimum training history |
|---|---:|
| `seasonal_naive_7_days` | 14 ngày |
| `moving_average_7_days` | 14 ngày |
| `weekday_average_4_weeks` | 28 ngày |
| `linear_trend_30_days` | 30 ngày |

Quy trình:

1. Chỉ giữ candidate có đủ lịch sử cho ít nhất 2 rolling-origin fold.
2. Tất cả candidate đủ điều kiện phải được đánh giá trên cùng fold origins.
3. Mỗi fold train bằng các ngày đứng trước và dự báo đúng 7 ngày tiếp theo.
4. Primary metric là MAE; RMSE và sMAPE là diagnostics.
5. Nếu MAE của candidate đơn giản hơn nằm trong 5% so với best candidate,
   chọn candidate đơn giản hơn.
6. Tie-break cuối cùng dùng thứ tự độ phức tạp đã tài liệu hóa rồi method ID.
7. Forecast production chạy selected method trên toàn bộ history.

Model selection dùng tối đa 8 non-overlapping fold gần nhất, tương đương 56
validation points. Giới hạn này cân bằng độ ổn định và khả năng thích nghi với
pattern gần đây.

Với 14–27 ngày, forecast dùng fallback hiện tại nhưng model selection và
evaluation có thể unavailable. Response phải nói rõ reason, không giả metric.

## 5. Uncertainty

- Dùng absolute residual của selected method trên common backtest folds.
- Target empirical coverage: 80%.
- Cần tối thiểu 28 residual; nếu không đủ trả unavailable reason.
- Quantile dùng deterministic `higher` rule.
- Mỗi point trả `lower_bound`, `predicted_revenue`, `upper_bound`.
- Lower bound bị chặn tại 0.

Đây là empirical forecast interval, không được quảng cáo là xác suất đảm bảo
hoặc confidence interval có coverage lý thuyết.

## 6. Product association

Trên distinct completed orders:

```text
support(A,B) = orders(A and B) / total_completed_orders
confidence(A→B) = orders(A and B) / orders(A)
lift(A→B) = confidence(A→B) / support(B)
```

Trong V3, `total_completed_orders` ở công thức trên là association universe
sau khi loại order có hơn 50 unique products. API trả cả tổng completed orders
ban đầu và `eligible_completed_order_count` để mẫu số hoàn toàn minh bạch.

Rules:

- minimum pair order count: 3;
- minimum support: 1%;
- tối đa 20 directional rules;
- order có hơn 50 unique products tiếp tục bị loại và được đếm;
- sort: lift giảm dần, confidence giảm dần, pair count giảm dần, IDs tăng dần;
- association không được mô tả như quan hệ nhân quả.

## 7. Customer cohort

- Chỉ dùng completed orders.
- Acquisition month là tháng của completed order đầu tiên.
- `month_index` là khoảng cách tháng lịch giữa acquisition và activity month.
- Active customers dùng distinct customer count.
- Retention bằng active customers chia cohort size.
- Month 0 bằng 100%.
- Revenue và order count được trả cho mỗi observed cell.
- Future/unobserved cells không được biến thành 0.
- Analysis cần tối thiểu 3 calendar months; nếu thiếu trả unavailable reason.

## 8. Definition of Done

- Contract V3 strict ở Pydantic và TypeScript.
- Dataset generator deterministic và committed files khớp generator.
- Forecast comparison không leakage, có leaderboard, selection reason và
  interval/unavailable reason.
- Association metrics và cohort cells có exact oracle tests.
- UI có loading/error/empty/unavailable/success và methodology note.
- AI payload chỉ dùng aggregate V3, không có raw rows/customer identity.
- Reset dev analyses và smoke persistence/reload sau cutover.
- Backend/frontend tests, lint, build, compile, dependency check, secret scan
  và diff check pass.

## 9. Bằng chứng khóa phase

- Supabase development `public.analyses` có `0` record sau reset.
- Smoke protected API thật đạt:
  `upload V3 → persist → list → reload → delete`; user tạm và analysis tạm
  đều được dọn, count cuối cùng vẫn bằng `0`.
- Generator `--check` xác nhận toàn bộ file committed khớp byte-for-byte.
- Gate local: `145` backend tests và `57` frontend tests pass; frontend lint,
  production build, `pip check`, compile, secret scan và `git diff --check`
  đều pass.
