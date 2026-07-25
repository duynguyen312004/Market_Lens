# E3 — Forecast selection, evaluation và uncertainty

## Mục tiêu

Forecast V3 của MarketLens không chỉ đưa ra bảy điểm dự báo. Hệ thống phải
chứng minh được:

- những phương pháp nào đủ điều kiện để so sánh;
- việc so sánh không nhìn thấy dữ liệu tương lai;
- phương pháp nào được chọn và vì sao;
- sai số lịch sử của phương pháp được chọn so với baseline;
- khoảng bất định thực nghiệm có đủ bằng chứng hay chưa.

Forecast được tính deterministic tại request time, không dùng LLM, không huấn
luyện hoặc lưu model.

## Candidate và điều kiện lịch sử

| Method | Minimum training history |
|---|---:|
| `seasonal_naive_7_days` | 14 ngày |
| `moving_average_7_days` | 14 ngày |
| `weekday_average_4_weeks` | 28 ngày |
| `linear_trend_30_days` | 30 ngày |

- Dưới 14 ngày: không tạo forecast.
- Từ 14 đến 27 ngày: dùng `moving_average_7_days` làm fallback; model
  selection/evaluation có thể unavailable.
- Từ 28 ngày: so sánh tất cả candidate có đủ training history và ít nhất hai
  fold.

## Rolling-origin model selection

- Horizon của mỗi fold: 7 ngày.
- Tối đa: 8 fold gần nhất, không chồng phần validation.
- Tối thiểu để công bố selection: 2 fold.
- Mọi candidate đủ điều kiện dùng cùng fold origins.
- Mỗi fold chỉ train bằng dữ liệu đứng trước validation.
- Prediction được làm tròn và chặn âm giống output production trước khi tính
  metric.

Primary metric là MAE. Candidate được rank theo MAE, rồi sMAPE, độ phức tạp và
method ID. Nếu candidate đơn giản hơn có MAE không cao hơn 5% so với candidate
tốt nhất, hệ thống chọn candidate đơn giản hơn. Response ghi rõ
`LOWEST_MAE` hoặc `SIMPLER_WITHIN_FIVE_PERCENT`.

Production forecast chạy selected method trên toàn bộ history. Với fallback
14–27 ngày, `selection.available = false` và UI phải nói rõ nguyên nhân thay
vì hiển thị metric giả.

## Baseline và error metrics

Evaluation của selected method dùng đúng common folds ở model selection và so
với baseline `seasonal_naive_7_days`.

- **MAE**: trung bình sai số tuyệt đối, cùng đơn vị với doanh thu.
- **RMSE**: căn bậc hai của trung bình sai số bình phương.
- **sMAPE**: sai số phần trăm đối xứng; actual và prediction cùng bằng 0 đóng
  góp 0%.
- **MAE improvement vs baseline**:
  `(baseline_mae - model_mae) / baseline_mae * 100`.

Metrics tổng hợp được tính trên toàn bộ validation points, không lấy trung
bình từ metric đã làm tròn của từng fold.

## Reliability label

Reliability mô tả độ mạnh của bằng chứng backtest, không phải xác suất đúng:

- `high`: ít nhất 6 fold, sMAPE không quá 20% và MAE không kém baseline;
- `medium`: ít nhất 2 fold, sMAPE không quá 40% và MAE không cao hơn baseline
  quá 10%;
- `low`: đủ fold nhưng không đạt các điều kiện trên;
- `unavailable`: chưa có model selection đủ điều kiện.

## Empirical uncertainty interval

- Dùng absolute residual của selected method trên common folds.
- Target coverage: 80%.
- Cần ít nhất 28 residual.
- Quantile dùng deterministic method `higher`.
- Mỗi forecast point trả `lower_bound`, `predicted_revenue` và `upper_bound`.
- Lower bound bị chặn tại 0.

`observed_backtest_coverage_percent` chỉ mô tả coverage trên residual đã quan
sát. Interval này không phải confidence interval có bảo đảm lý thuyết.

## API contract

`forecast` trong analysis contract V3 luôn có:

- `points`, trong đó bounds là số khi uncertainty available và `null` khi
  unavailable;
- `selection`: leaderboard, common fold count và selection reason;
- `evaluation`: selected method, seasonal-naive baseline, aggregate/fold
  metrics và reliability;
- `uncertainty`: target coverage, residual count, quantile và observed
  coverage hoặc unavailable reason.

Không lưu raw rows hoặc toàn bộ prediction của backtest folds. Contract,
threshold và dataset oracle liên quan được khóa thêm tại
`docs/DS_CORE_V3.md` và `sample_data/EXPECTED_DEMO_METRICS.md`.
