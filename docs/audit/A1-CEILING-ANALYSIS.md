# PHÂN TÍCH A1 CEILING — `NOT PASS` là lỗi đặc tả, không phải lỗi hiệu năng

**Ngày:** 2026-09-24
**HEAD:** `8d8a898` (`docs: sync Milestone A progress; record A1 Instruments NOT PASS`)
**Đối tượng:** hàng iOS ceiling — `docs/phase8-certification.md:109`, `docs/ops/CEILING-CERT.md` §5 / §5b
**Tính chất:** phân tích — **không sửa production code, không sửa ledger**
**Finding mới:** `R-22`, `R-23`

---

## 0. Kết luận

> **Hai con số cần thiết để giải thích `NOT PASS` đã nằm sẵn trong repo, chỉ là chưa ai đặt cạnh nhau.**
>
> - `CEILING-CERT.md` **§5b** — app tự đo: `p50 / p95 / mean = 8.33 / 8.33 / 8.33 ms`, **120.0 fps**, `over16.7 = 0`, n ≈ 4800
> - `CEILING-CERT.md` **§5** — Instruments `display-surface-swap` Δ: `p50 ≈ 8.87 / p95 ≈ 16.10 ms`, Hangs 0
>
> Hai số này đo **hai tầng khác nhau**. Ngưỡng cũ không nói nó khóa tầng nào — đó là `R-23`.
>
> Và ngưỡng cũ (`p50 ≤ 8.33`, `p95 ≤ 11`) yêu cầu **120 FPS**, trong khi requirement gốc `PLT-03` chỉ yêu cầu **"stable 60 FPS"** — đó là `R-22`.
>
> **Owner lock 2026-09-24:** áp **§5** (60 FPS + jank OR). Ledger cập nhật → ceiling **PASS**; G2.16 đóng. Floor vẫn NOT RUN.

---

## 1. Dữ liệu — đặt cạnh nhau

| | App tự đo (§5b) | Instruments (§5) |
|---|---|---|
| **Build** | Debug dev-client + Metro | local Release + CERT `13018eb` |
| **Đại lượng** | `dt` giữa hai frame callback (`metrics.ts:117`) | `display-surface-swap` Δ |
| **Tầng** | vòng lặp render của app | compositor / trình bày lên màn hình |
| **p50** | **8.33** ms | **8.87** ms |
| **p95** | **8.33** ms | **16.10** ms |
| **fps** | **120.0** | — |
| **Vượt 16.7 ms** | **0 / ~4800 mẫu** | — |
| **Hangs** | — | **0** |

Hai run Instruments lệch nhau **0.04 ms** (8.89/16.10 và 8.85/16.11). Độ lặp lại đó nói đây là phân phối thật, không phải nhiễu — dữ liệu đáng tin ở cả hai phía.

**Điều đáng chú ý:** app chạy Debug + Metro — cấu hình **chậm nhất** — mà vẫn giữ `p95 = 8.33` với **0** frame vượt ngân sách trong 40 giây. Vòng lặp render không hụt một nhịp vsync nào.

---

## 2. `R-22` — ngưỡng ceiling khóa 120 FPS, trong khi sản phẩm chỉ yêu cầu 60 · **Cao** · *lỗi của audit*

### 2.1 Mâu thuẫn văn bản

`.planning/REQUIREMENTS.md:51` — `PLT-03`:

> *"**Stable 60 FPS** is measured on a named mid-range real device…"*

`docs/measurement-methodology.md:43` — hàng ceiling **tôi viết**:

> *`p50 ≤ 8.33 ms` and `p95 ≤ 11 ms` and `Hangs = 0`*

`8.33 ms` = chu kỳ của **120 Hz**. Tôi đã khóa gate ở **120 FPS** trong khi requirement sản phẩm là **60 FPS**. Hai tuyên bố khác nhau, và tôi gộp chúng khi viết hàng đó ở vòng `IOS-ONLY-DECISION-IMPACT` §3.2.

### 2.2 Đối chiếu số đo với bar 60 FPS (16.67 ms)

| Chỉ số | Instruments | Bar 60 FPS | Biên |
|---|---|---|---|
| p50 | 8.87 ms | ≤ 16.67 | dư **47%** |
| p95 | 16.10 ms | ≤ 16.67 | dư **3.4%** |
| Hangs | 0 | 0 | ✓ |

Ngay cả bằng đại lượng khắt khe hơn (tầng trình bày), sản phẩm **đạt bar 60 FPS**.

### 2.3 `p95 ≤ 11 ms` gần như không thể đạt

Δ giữa hai lần swap trên màn hình bị **lượng tử theo chu kỳ quét**: các giá trị khả dĩ tụ quanh `8.33`, `16.67`, `25.0`… **Không có gì rơi quanh 11 ms.**

Nên `p95 ≤ 11` thực chất mã hóa điều kiện *"dưới 5% số frame trượt một nhịp vsync"* — chính là nhánh `jank ≤ 5%` mà lock Android có, và tôi **đã bỏ đi** khi viết hàng ceiling:

| Hàng | Ngưỡng |
|---|---|
| Android mid (`:45`) | `p50 ≤ 16.7` **và** (`p95 ≤ 20` **hoặc** jank ≤ 5%) |
| iOS floor (`:44`) | `p50 ≤ 16.7` **và** (`p95 ≤ 20` **hoặc** jank ≤ 5%) |
| **iOS ceiling (`:43`)** | `p50 ≤ 8.33` **và** `p95 ≤ 11` — **không có nhánh OR** |

Tôi đặt `11` bằng suy diễn tỉ lệ từ `16.7 → 20` (đệm 1.2×). Phép suy diễn đó không chuyển được sang một đại lượng lượng tử.

### 2.4 Đây là sửa lỗi đặc tả hay dời cột gôn?

Phép thử: **tôi có nêu điều này nếu kết quả đã PASS không?**

**Có.** Mâu thuẫn giữa *"stable 60 FPS"* và `p50 ≤ 8.33` nhìn thấy được từ **văn bản**, không cần tới số đo. Nếu run vừa rồi ra `8.1 / 10.5` và PASS, hàng ceiling vẫn đang chứng nhận sai thứ — nó sẽ tuyên bố "đạt 120 FPS" dưới nhãn của một requirement nói 60.

Ranh giới cần giữ:

| Hợp lệ | Không hợp lệ |
|---|---|
| "Gate đang đo 120 FPS; requirement nói 60; sửa gate cho khớp requirement" | "p95 = 16.1 > 11, nâng ngưỡng lên 17" |

Vì vậy §5 đề xuất ngưỡng mới **dẫn xuất từ `PLT-03`**, không dẫn xuất từ con số đo được.

---

## 3. `R-23` — ngưỡng không nói nó khóa tầng nào · **Trung bình**

### 3.1 Hai đại lượng, hai tầng

| Nguồn | Đo gì | Hệ quả khi hụt |
|---|---|---|
| `metrics.ts:117` `pushSample(dt*1000)` | khoảng cách giữa hai lần **frame callback** chạy | vòng sim/render của app không theo kịp |
| Instruments `display-surface-swap` Δ | khoảng cách giữa hai lần **màn hình đổi surface** | người chơi nhìn thấy frame lặp |

App báo `8.33/8.33`, Instruments báo `8.87/16.10`. **Hai số này không thể cùng mô tả một đại lượng.**

### 3.2 Không được kết luận "Instruments sai"

Cám dỗ ở đây là nói app đo đúng còn Instruments đo nhầm. **Không.**

App có thể dựng frame đúng hạn mà compositor vẫn không kịp đưa lên màn hình — khi đó `dt` của app vẫn đẹp 8.33 trong khi **người chơi thấy frame rơi**. Tầng người dùng thực sự cảm nhận là tầng **display**. Nên Instruments là đại lượng *có ý nghĩa hơn*, không phải đại lượng sai.

Kết luận đúng: **gate chưa bao giờ nói nó khóa tầng nào** — và đó là thiếu sót trong đặc tả, không phải trong phép đo.

### 3.3 Một điểm chưa giải thích được → **đã khép (verify 2026-09-24)**

`p50 = 8.87 ms` **lớn hơn** một chu kỳ vsync (8.333), tức quá nửa số mẫu vượt một nhịp — trong khi app báo 0 frame vượt ngân sách.

**Verify recompute** trên `/tmp/bricks-a1/a1-clean{1,2}-swap.xml` (Δ sau discard 2 s):

| Run | n | ~8.3 ms | ~16.7 ms | p50 / p95 |
|---|---:|---:|---:|---|
| 1 | 1181 | **591 (50.0%)** | **590 (50.0%)** | 8.89 / 16.10 |
| 2 | 1181 | **591 (50.0%)** | **590 (50.0%)** | 8.85 / 16.11 |

Phân phối **hai đỉnh đúng lượng tử vsync**, không phải lệch phải liên tục. p50 hơi trên 8.33 vì nửa mẫu nằm ở đỉnh 16.7 — khớp §2.3. **Không đổi kết luận §2** — cả hai đỉnh đều ≤ bar 60 FPS (16.67).

### 3.4 Tôi rút lại một nhận định ở vòng trước

Vòng trước tôi nêu `CADisableMinimumFrameDurationOnPhone` không được set trong `app.config.js`, và gợi ý iOS có thể đang chặn app ở 60 FPS.

**Dữ liệu §5b bác bỏ điều đó:** app đo được `120.0 fps` với `dt = 8.33 ms`, tức display link đang chạy ở **120 Hz**. Trần 60 Hz mặc định rõ ràng không áp dụng ở đây. Mối lo đó của tôi đặt sai chỗ.

Nó chỉ còn liên quan nếu sau này muốn **tuyên bố công khai** 120 FPS — lúc đó mới cần xác minh khóa plist một cách tường minh.

---

## 4. Vì sao không nên chase jank lúc này

`ROADMAP-NEXT` cho ba lựa chọn tiếp theo; lựa chọn (1) là *"soi GUI Instruments / chase jank A1"*.

Chase jank bây giờ là tối ưu **về phía một bar chưa chắc đúng**. Rủi ro cụ thể: bỏ vài ngày để kéo p95 từ 16.10 xuống dưới 11 — tức ép ≥95% frame trúng **mọi** nhịp 120 Hz — trong khi sản phẩm chưa bao giờ yêu cầu điều đó, và thời gian ấy lẽ ra dành cho **A3 cohort**, thứ có lead time dài nhất và đang chặn `D3` + `G2.11`.

Nếu sau khi sửa hàng ceiling mà vẫn còn jank vượt bar 60 FPS, lúc đó chase là có mục tiêu rõ.

---

## 5. Đề xuất hàng ceiling — dẫn xuất từ `PLT-03`

Thay `docs/measurement-methodology.md:43`:

| Hàng | Tầng đo | Ngưỡng | Vai trò |
|---|---|---|---|
| **iOS ceiling — bar sản phẩm** | `display-surface-swap` Δ (tầng người dùng thấy) | `p50 ≤ 16.7 ms` **và** (`p95 ≤ 20 ms` **hoặc** jank ≤ 5%) **và** `Hangs = 0` | **Gate `G2.16`** — khớp `PLT-03` "stable 60 FPS" |
| **App-loop health** | `dt` frame callback (`metrics.ts`) | `over16.7 = 0` trong ≥30 s | Gate phụ — chứng minh vòng sim không hụt |
| **120 Hz stretch** | `display-surface-swap` Δ | `p50 ≤ 8.33 ms` | **Thông tin, không phải gate** |

Ba thay đổi so với bản tôi viết:

1. **Nêu rõ tầng đo** cho từng hàng (`R-23`).
2. **Khôi phục nhánh `hoặc jank ≤ 5%`** — cần thiết cho đại lượng lượng tử (`R-22` §2.3).
3. **Tách yêu cầu 120 FPS ra khỏi gate**, giữ làm thông tin.

Với ngưỡng này, số đo hiện có (`p50 8.87 / p95 16.10 / Hangs 0` + `over16.7 = 0`) **đạt** — nhưng **chỉ owner mới được quyết** có áp ngưỡng mới hay không. Audit không tự sửa ngưỡng rồi tự tick.

---

## 6. Việc cần làm

| # | Việc | Ai | Status |
|---|---|---|---|
| 1 | Quyết hàng ceiling theo §5 | **Owner** | **DONE** — chọn §5 (60 FPS + jank OR) 2026-09-24 |
| 2 | Cập nhật methodology / CEILING-CERT / ledger rồi đánh giá lại số đo | Dev | **DONE** — ceiling **PASS**; G2.16 đóng |
| 3 | Histogram Δ §3.3 | Verify | **DONE** — 50/50 bimodal |
| 4 | **A3 cohort** + **Sentry DSN** | Owner | **OPEN** |

---

## 7. Ràng buộc đã giữ

- Không sửa production code, **không sửa ledger** — hàng `NOT PASS` giữ nguyên.
- Không đề xuất ngưỡng nào dẫn xuất từ con số đo được; ngưỡng §5 dẫn xuất từ `PLT-03`.
- Không tạo số liệu thiết bị. Mọi số trong báo cáo này trích từ `CEILING-CERT.md` §5 / §5b do dev ghi.
- Tự đính chính nhận định sai ở vòng trước (§3.4).

---

## 8. Liên quan

- [PHASE-VERIFY-A1-PREP.md](./PHASE-VERIFY-A1-PREP.md) — `R-20`, `R-21`
- [IOS-ONLY-DECISION-IMPACT.md](./IOS-ONLY-DECISION-IMPACT.md) §3.2 — nơi hàng ceiling được viết ra
- `docs/ops/CEILING-CERT.md` · `docs/measurement-methodology.md` · `docs/phase8-certification.md:109`
