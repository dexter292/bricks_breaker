# BẢN GHI QUYẾT ĐỊNH — 2026-09-24

**Owner:** Dexter
**Code baseline:** HEAD **`f445e0c`**
**Tính chất:** ghi nhận quyết định + đặc tả thay đổi để dev áp dụng — **tôi không sửa file ngoài `docs/audit/`**
**Tiếp nối:** [POST-MVP-ROADMAP-REVIEW.md](./POST-MVP-ROADMAP-REVIEW.md) (`R-01`…`R-08`) · [IOS-ONLY-DECISION-IMPACT.md](./IOS-ONLY-DECISION-IMPACT.md) (`R-09`…`R-11`)

---

## 0. Bốn quyết định

| # | Quyết định | Lựa chọn | Đóng finding |
|---|---|---|---|
| **D4** | Số level bản public đầu | **5** (số nguyên, không phải khoảng) | `R-04` ✅ |
| **D1** | Tên hiển thị | **B — đổi tên trước khi tạo listing ASC** | `R-11` ✅ |
| **D2** | Nền tảng | **B — iOS-first, Android hoãn** (ghi nhận trước đó) | — |
| **R-10** | Máy gate mid-tier | **Chỉ có iPhone 16 Pro** → pass-lock ghi là **CEILING-ONLY** | `R-10` ⚠️ **vẫn mở** |
| **R-02** | Mức A4 Operational | **Tách ba mức** | `R-02` ✅ |

---

## 1. D4 = 5 level

**Trạng thái hôm nay: 2 level ship được** — `src/runtime/loadLevel.ts:18` → `LevelId = 'level-01' | 'level-03'`. `level-02.json` là fixture compile/regression, cổng steel bất khả thắng với sàn 8°. **Cần author thêm 3.**

### Sửa — 5 vị trí, đưa về một số duy nhất

| File:line | Hiện tại | Đổi thành |
|---|---|---|
| `.planning/post-mvp/PRODUCT-DIRECTION.md:43` | `Small campaign (8–12 levels)` | `Campaign of **5** authored levels` |
| `.planning/post-mvp/PRODUCT-DIRECTION.md:118-123` | D4 với 3 phương án A/B/C | Ghi **D4 = 5 (owner, 2026-09-24)**; giữ nguyên phần lịch sử phương án |
| `.planning/post-mvp/REQUIREMENTS-NEXT.md:67` | `N chosen at lock: recommend 5–8` | `ships with **exactly 5** authored playable levels` |
| `.planning/post-mvp/FEATURE-CANDIDATES.md:60` | `FC-L01 — 5–12 authored levels` | `FC-L01 — 5 authored levels (D4 locked)` |
| `.planning/post-mvp/RELEASE-GATES.md:81` | `G2.10 — Campaign ≥5 levels OR explicit single-level soft launch messaging` | **Giữ nguyên** — 5 đã khớp; nhánh OR trở thành dự phòng không dùng |

**Kèm theo:** `.planning/post-mvp/ROADMAP-NEXT.md:187-194` phase E1 — acceptance nên ghi rõ **3 level mới** (5 − 2 đang có), không phải "fill N-LVL-01 count".

---

## 2. D1 = B — đổi tên trước listing

### Vì sao rẻ bất thường ở thời điểm này

| Thành phần | Có chứa "neon"? | Phải đổi? |
|---|---|---|
| `app.config.js:19` `bundleIdentifier: 'com.dexter292.bricksbreaker'` | Không | **Không** |
| `app.config.js:53` `package: 'com.dexter292.bricksbreaker'` | Không | **Không** |
| `app.config.js:12` `slug: 'bricks-breaker'` | Không | **Không** |
| `app.config.js:15` `scheme: 'bricksbreaker'` | Không | **Không** |
| `extra.eas.projectId` | — | **Không** |
| `app.config.js:11` `name: 'Neon Brick Breaker'` | **Có** | **Có** |
| Icon / splash / wordmark trên Title | **Có** (nếu vẽ chữ) | **Có** |

Không đụng bundle ID ⇒ không mất project EAS, không mất dữ liệu đã lưu, không phải tạo lại app record. `docs/store/CONSOLE-ENTRY.md:3` xác nhận **chưa click gì trên console** — nên chưa có gì phải rút lại.

### Chọn tên — việc của owner, không phải của audit

`docs/store/name-clearance.md` đã có sẵn 3 ứng viên: *Neon Brick Breaker DX* · *Neon Breakout (Arcade)* · *Brick Neon Rally*. Tôi không khuyến nghị tên cụ thể — đó là quyết định thương hiệu.

**Lưu ý duy nhất về mặt rủi ro:** cả ba đều giữ lại "Neon" và/hoặc "Brick", tức vẫn nằm trong vùng mô tả chung của thể loại. Phương án giảm rủi ro nhất là một tên **không** tái sử dụng cặp từ đang va chạm. `name-clearance.md` tự ghi *"This file is not a legal opinion"* — và báo cáo này cũng vậy.

### Sửa

| File:line | Việc |
|---|---|
| `.planning/post-mvp/PRODUCT-DIRECTION.md:97-102` | Ghi **D1 = B (owner, 2026-09-24)** |
| `.planning/post-mvp/RELEASE-GATES.md:33` | Chuyển hàng trademark từ **G3** → điều kiện **G2**; trạng thái `DEFERRED soft-launch` → `MUST — rename before listing (D1=B)` |
| `docs/store/name-clearance.md` §Differentiation | Ghi tên đã chọn + ngày vào mục *"Record the chosen alternate + date here when decided"* |
| `app.config.js:11` | Đổi sau khi chốt tên (code — dev thực hiện) |
| `.planning/post-mvp/ROADMAP-NEXT.md:175-181` | Phase D2 Brand Surfaces — dep `A3 brand decision` nay đã có, có thể chạy sớm |

---

## 3. R-10 — chỉ có iPhone 16 Pro: pass-lock CEILING-ONLY

Đây là mục **không** đóng được bằng quyết định, và tôi ghi rõ như vậy.

### 3.1 Vấn đề định lượng

iPhone 16 Pro = **A18 Pro, 120 Hz ProMotion, 8 GB** — phần cứng mạnh nhất dải. Bằng chứng hiện có (`docs/phase8-certification.md:105`): *"Display surface duration 8.33 ms (120 Hz), Hangs 0"* nghĩa là máy đang chạy **120 fps**. Nó chứng minh **trần**, không chứng minh **sàn**.

Không có `deploymentTarget` nào biến 16 Pro thành sàn. Vậy nên lựa chọn trung thực là: **định nghĩa hai hàng gate, chạy hàng trần, để hàng sàn mở.**

### 3.2 Đặc tả pass-lock iOS đề xuất — thay `docs/measurement-methodology.md:39-45`

| Hàng | Thiết bị | Build | Công cụ | Ngưỡng | Trạng thái |
|---|---|---|---|---|---|
| **iOS ceiling** | iPhone 16 Pro (A18 Pro, 120 Hz) | `profiling` | Instruments — Game Performance | `p50 ≤ 8.33 ms` **và** `p95 ≤ 11 ms` **và** `Hangs = 0`, ép **tier = mid** | **Chạy được ngay** |
| **iOS floor** | Máy mid-tier được nêu tên (A13–A15, 60 Hz) | `profiling` | Instruments — Game Performance | `p50 ≤ 16.7 ms` **và** (`p95 ≤ 20 ms` **hoặc** jank ≤ 5%) | **NOT RUN** — chặn `N-PLT-02` |

Giữ nguyên các luật đang có ở `measurement-methodology.md:47-53`: ≥2 run × ≥30 s, **lấy run tệ hơn**, simulator không bao giờ tính (D-05), bỏ ~2 s đầu.

**Phải nói thẳng:** bằng chứng iOS hiện tại **không đạt** protocol này. `phase8-certification.md:105` là **một** phiên Instruments trên build **development**, ghi lại dưới dạng quan sát (*"Display ~8.33 ms"*), không có percentile, không có run thứ hai. Muốn hàng ceiling được tính là PASS thì **phải chạy lại** theo đúng đặc tả trên. Đây là cái giá của việc biến một quan sát thành một cổng có thể trượt.

### 3.3 `R-12` (mới) — tier resolver sẽ trao cho iPhone 11 đúng ngân sách đã cert trên A18 Pro · **Cao**

Đây là rủi ro **sản phẩm**, không phải rủi ro tài liệu.

**Bằng chứng:** `src/runtime/resolveQualityTier.ts:33-39`

```ts
if (totalMemory < 4 * GB) return 'low';
if (totalMemory < 8 * GB) return 'mid';
return 'high';
```

Tier được quyết **chỉ bằng dung lượng RAM**. Nhánh duy nhất khác là `:61-62` — một special-case cho `Pixel 6a`, nay **thành code chết** dưới D2=B.

Hệ quả:

| Máy | RAM | Tier được cấp | Ngân sách (`:22-24`) |
|---|---|---|---|
| iPhone 16 Pro (A18 Pro) | 8 GB | `high` | 192 particle, trail 5, glow on |
| **iPhone 11 (A13)** | **4 GB** | **`mid`** | **128 particle, trail 4, glow on** |
| iPhone SE 3 (A15) | 4 GB | `mid` | 128 particle, trail 4, glow on |

Phiên cert trên 16 Pro chạy ở **"Mid (Cert WC force)"** (`phase8-certification.md:105`) — tức **đúng ngân sách 128 particle + glow** mà một iPhone 11 sẽ nhận, nhưng trên GPU mạnh hơn nhiều thế hệ. RAM không phải proxy cho fill-rate.

**Đề xuất:** thêm một nhánh theo **thế hệ chip / model** (không chỉ RAM) trước khi phát hành công khai, hoặc hạ trần mặc định cho iPhone 4 GB xuống `low` (`glowScale 0`, 48 particle) cho tới khi có bằng chứng trên máy thật. Cả hai đều là thay đổi code — tôi không thực hiện; ghi lại như một finding cần chủ.

### 3.4 Sửa

| File:line | Việc |
|---|---|
| `docs/measurement-methodology.md:39-45` | Thay bảng Devices bằng hai hàng §3.2; bỏ hàng `Android FPS gate (D-01)` khỏi vị trí gate chính (chuyển xuống mục "hoãn") |
| `docs/measurement-methodology.md:22-23` | Bổ sung protocol Instruments tương đương `gfxinfo framestats` — phải xuất **p50/p95/Hangs**, không chỉ "Display ~x ms" |
| `.planning/post-mvp/REQUIREMENTS-NEXT.md:39` | `N-PLT-02` viết lại: *"iOS **ceiling** lock PASS trên iPhone 16 Pro; iOS **floor** lock trên máy mid-tier được nêu tên — **floor chưa chạy, không được claim**"* |
| `.planning/post-mvp/ROADMAP-NEXT.md:53-67` | A1 → **iOS Ceiling Certification**. Acceptance = hàng ceiling PASS. Hàng floor **không** nằm trong acceptance của A1, nhưng phải xuất hiện trong Deliverables dưới dạng `NOT RUN` |
| `.planning/post-mvp/RELEASE-GATES.md` §2/§3 | Thêm **G2.13**: *"Không được claim hiệu năng trên máy iOS ngoài máy đã đo. Nếu chỉ có ceiling evidence, listing và marketing không nêu FPS."* |
| `app.config.js` | Khai báo `ios.deploymentTarget` tường minh (code — dev thực hiện). Đây là thứ làm cho "sàn" có định nghĩa, dù chưa đo được |

---

## 4. R-02 = tách ba mức → `N-OPS-01…03`

Đề xuất thêm vào `.planning/post-mvp/REQUIREMENTS-NEXT.md` §1:

| ID | Requirement | Mức | Gate |
|---|---|---|---|
| **N-OPS-01** | Crash reporting tích hợp và xác nhận nhận được crash thật từ một build phân phối | **Must** | **G1** |
| **N-OPS-02** | Chiến lược cập nhật sau phát hành được ghi thành văn: dùng OTA (`expo-updates` + `runtimeVersion`) **hoặc** quyết định resubmit-only một cách tường minh | **Must** | **G2** |
| **N-OPS-03** | Nhịp nâng SDK có trigger thời gian (vd: đánh giá Expo 58 trong 4 tuần kể từ bản stable), ghi chủ sở hữu | **Should** | — |

**Lý do N-OPS-01 là Must trước G1:** `RELEASE-GATES.md:48` **G1.6** và `:74` **G2.8** đều yêu cầu crash triage. Không có công cụ thì hai cổng đó không kiểm chứng được — chúng trở thành ô tick rỗng. Và external tester đúng là lúc không repro được tại chỗ.

**Lý do N-OPS-02 chỉ cần trước G2:** đây là **quyết định**, không bắt buộc phải tích hợp. Chọn "không OTA, resubmit" một cách có ý thức là hợp lệ. Thứ không chấp nhận được là phát hiện ra sau khi launch — khi đó một regression physics sẽ bất khả sửa trong nhiều ngày.

### Sửa

| File | Việc |
|---|---|
| `.planning/post-mvp/REQUIREMENTS-NEXT.md:36-44` | Thêm 3 hàng `N-OPS-01…03` vào §1 |
| `.planning/post-mvp/REQUIREMENTS-NEXT.md:127` | Traceability: `A Hardening` += `N-OPS-01…03` |
| `.planning/post-mvp/ROADMAP-NEXT.md` sau `:94` | Thêm **Phase A4 — Operational Readiness**; song song được với A2/A3 |
| `.planning/post-mvp/RELEASE-GATES.md:39-48` | Thêm **G1.9** = `N-OPS-01`; §3 thêm **G2.14** = `N-OPS-02` |

---

## 5. Trạng thái finding sau bốn quyết định

| ID | Trạng thái | Ghi chú |
|---|---|---|
| `R-01` | **Giải được** — với điều kiện §3.2 được áp dụng | §6 feature-freeze trỏ vào iOS pass-lock mới |
| `R-02` | **Đóng về mặt quyết định** | Còn thực thi `N-OPS-01…03` |
| `R-03` | Mở | Thêm `N-QA-03` (F-43) vào A2 |
| `R-04` | **Đóng** | D4 = 5 |
| `R-05` | Mở | Sticky paddle — thống nhất 3 nơi |
| `R-06` | Mở | Tách aimed serve khỏi B3 |
| `R-07` | **Đóng bởi §3.4** | A1 không còn escape "viết doc"; đã có phần cứng cho hàng ceiling |
| `R-08` | Mở | Nhãn verdict ở **nguồn** (`phase8-certification.md:120,162`) vẫn chưa sửa |
| `R-09` | **Đóng về mặt đặc tả** | Còn chạy lại phiên Instruments theo protocol mới |
| `R-10` | **VẪN MỞ** | Không có máy mid-tier. Ceiling-only |
| `R-11` | **Đóng** | D1 = B |
| `R-12` | **MỚI — Cao** | Tier resolver chỉ theo RAM; iPhone 11 nhận ngân sách đã cert trên A18 Pro |

**Còn chặn lock roadmap:** `R-03`, `R-05`, `R-06`, `R-08` (biên tập) + thực thi §3.2 và §4.
**Không chặn lock nhưng phải hiện diện trong ledger:** `R-10`, `R-12`.

---

## 6. Điều không được đổi

| Không được | Vì sao |
|---|---|
| Tick **PLT-03 / N-PLT-02 = Complete** | Chỉ có ceiling evidence. Sàn chưa đo |
| Claim FPS trong listing / marketing | `G2.13` đề xuất ở §3.4 |
| Coi phiên Instruments 2026-09-22 là PASS của hàng ceiling | Chưa đạt protocol mới (một run, build development, không percentile) — phải chạy lại |
| Xóa hàng Android khỏi ledger | D2=B là **hoãn**, không phải bỏ |
| Gỡ special-case `Pixel 6a` (`resolveQualityTier.ts:61`) | Code chết nhưng vô hại; giữ đường quay lại |

---

## 7. Ràng buộc đã giữ

- Không sửa production code; không sửa file ngoài `docs/audit/`.
- Mọi finding có file path + line number, kiểm tại `f445e0c`.
- Không tạo số liệu thiết bị. `R-10` được giữ **mở** thay vì hợp thức hóa bằng dữ liệu từ máy ceiling.
- Không tự hạ scope: D4, D1, D2 là quyết định của owner; báo cáo ghi nhận và nêu hệ quả.

---

## 8. Applied by agent (2026-09-24)

Dev/agent đã áp đặc tả §1–§4 vào:

- `.planning/post-mvp/*` (PRODUCT, REQUIREMENTS-NEXT, ROADMAP-NEXT, RELEASE-GATES, FEATURE-CANDIDATES, CURRENT-STATE)
- `docs/measurement-methodology.md` · `docs/phase8-certification.md`
- `.planning/REQUIREMENTS.md` (PLT-02/03 notes) · `.planning/STATE.md`
- `docs/store/name-clearance.md` · `CONSOLE-ENTRY.md` · `play-data-safety.md`
- `docs/audit/MVP-CLOSE-REPORT.md` · `DEFERRED-ITEMS.md`

**Chưa làm (cần owner/code):** chọn chuỗi display name; `app.config.js` `name` + `deploymentTarget`; chạy lại Instruments ceiling; tích hợp N-OPS-01; chốt D3/D5–D7.
