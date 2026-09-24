# REVIEW — ROADMAP POST-MVP

**Ngày:** 2026-09-24
**Đối tượng:** `.planning/post-mvp/` — 6 tài liệu, viết 2026-09-24 11:17–11:20
**Code baseline đối chiếu:** HEAD **`f445e0c`**, working tree clean
**Tính chất:** review tài liệu kế hoạch — **không sửa code, không sửa tài liệu được review**
**Namespace finding:** `R-*` (tách khỏi `F-*`, `NF/NG/NH/NJ/NK/NL-*` của chuỗi audit v1)

---

## 0. Kết luận

> **Đây là tài liệu kế hoạch tốt nhất dự án từng sản xuất.** Cấu trúc milestone và hệ thống cổng G0–G3 **đúng** — giữ nguyên.
>
> **8 finding**: 3 thực chất (`R-01` mâu thuẫn feature-freeze, `R-02` ba khoảng trống vận hành, `R-03` F-43 mồ côi), 5 là biên tập cho nhất quán.
>
> **Khuyến nghị: chưa lock** cho tới khi (a) con số ở quyết định **D4** về một giá trị duy nhất, và (b) ba khoảng trống ở `R-02` có chủ.

---

## 1. Phạm vi đã đọc

| Tài liệu | Dòng | Vai trò |
|---|---:|---|
| `CURRENT-STATE.md` | 175 | Baseline kỹ thuật |
| `PRODUCT-DIRECTION.md` | 156 | Tầm nhìn + 7 quyết định D1–D7 |
| `FEATURE-CANDIDATES.md` | 158 | 50+ ứng viên tính năng, phân loại S/M/L/XL |
| `REQUIREMENTS-NEXT.md` | 135 | Requirement `N-*` dạng DRAFT |
| `ROADMAP-NEXT.md` | 260 | 7 milestone A–G, 13 phase |
| `RELEASE-GATES.md` | 139 | Thang cổng G0–G3 |

---

## 2. Điểm mạnh — có bằng chứng

### 2.1 Thứ tự milestone đúng

`A Hardening → B Gameplay → C Progression → D Polish → F Store`. Nợ release đi trước tính năng, và `RELEASE-GATES.md:111-118` có luật feature-freeze để ép điều đó. Đúng bài học của chuỗi audit v1: nợ bị đẩy lùi sẽ không tự biến mất.

### 2.2 Thang cổng G0–G3 là artifact mạnh nhất

- **G2.2** có **đường thoát thật** — "public release là **iOS-only** với posture Android ghi rõ" — thay vì ép một PASS giả để mở cổng.
- `RELEASE-GATES.md:85`: *"**Must not claim:** '60 FPS on mid-range Android' unless G2.2 PLT-03 PASS"* — viết đúng tinh thần đã giữ suốt 9 vòng.
- `RELEASE-GATES.md:107`: *"Do not invent numbers; WAIVED ≠ PASS"* — chính là legend tôi đề xuất, đã có ở đây (nhưng **chưa** có ở tài liệu gốc — xem `R-08`).

### 2.3 Namespace `N-*` tách khỏi ID v1

`REQUIREMENTS-NEXT.md:5` ghi rõ *"do not overwrite v1 PHYS/LVL/RUN/PWR/FX/PLT/ARCH IDs"*. Tránh đúng lỗi trùng ID mà chính audit này đã phải đi sửa (F-19/F-24/F-30/F-50/F-20 dùng hai lần ở vòng đầu).

### 2.4 §6 CURRENT-STATE — kiểm từng dòng, **không sai chỗ nào**

| Claim trong tài liệu | Bằng chứng tại `f445e0c` | Kết quả |
|---|---|---|
| "One brick contact ends CCD per ball/step" | `src/core/step.ts:868-869` — `remaining = 0; break;` ngay sau brick hit | **ĐÚNG** |
| "Worklets cannot close over `constants.ts`" | `src/core/step.ts:14-17` định nghĩa `KIND_WALL/PADDLE/BRICK/BOTTOM` cục bộ; import list `:1-12` không có `constants` | **ĐÚNG** |
| "Serve vertical-only; dock snaps `ballX=paddleX`" | `src/core/rules/serve.ts:17` | **ĐÚNG** |
| "`LevelId` = 01 \| 03 playable" | `src/runtime/loadLevel.ts:18` | **ĐÚNG** |
| "Schema v1 only" | `src/core/levels/schema.ts:9` `SCHEMA_VERSION = 1` | **ĐÚNG** (đã có `levels/migrations/` sẵn — thuận lợi cho `N-BRK-01`) |
| "Caps: maxBalls 8 · MAX_BRICKS 256 · EVENT_RING 128 · MAX_PICKUPS/EFFECTS 16" | `src/core/constants.ts:47,50,53,56,85` | **ĐÚNG** |
| "Persistence = personal best only" | `src/services/storage/` — chỉ `@nbb/personal-best/v1` | **ĐÚNG** |

**Đây là lần đầu một tài liệu planning của dự án có phần kỹ thuật được kiểm line-by-line mà không tìm ra lỗi.** Hệ quả trực tiếp: hai ước lượng độ khó quan trọng nhất trong `FEATURE-CANDIDATES` là **đáng tin** — `FC-P05` fireball/pierce thật sự cần đổi chính sách CCD, và mọi brick type mới thật sự phải trả chi phí duplicate literal vào worklet (đã có `tests/constants.parity.test.ts` canh, 8 test).

### 2.5 Kỷ luật phạm vi

`CURRENT-STATE.md:139`: *"Architecture rewrite (Unity etc.) is not indicated."* — đúng và tiết chế.
`FEATURE-CANDIDATES.md:138-147` §H "Explicitly not recommended soon" — hiếm khi thấy tài liệu kế hoạch dám viết danh sách **không** làm.
`ROADMAP-NEXT.md:7,252`: *"Do not execute phases until locked"* / *"Do not auto-start Phase A1"*.

### 2.6 Cảnh báo tài liệu cũ

`CURRENT-STATE.md:24` cảnh báo `RELEASE-READINESS.md` và `EXECUTIVE-SUMMARY.md` (2026-09-21) đã lỗi thời — **chính là hai báo cáo của audit này**. Vệ sinh tài liệu đúng.

---

## 3. Finding thực chất

### `R-01` — Luật feature-freeze **tự mâu thuẫn** với đường waiver Android · **Cao**

**Bằng chứng:**

- `RELEASE-GATES.md:113-117`: tính năng mới (Milestone B+) không được lên **G2** cho tới khi *"Mid-tier Cert WC re-run if physics/VFX budgets changed"*.
- `RELEASE-GATES.md:27`: PLT-03 đang **OPEN (waived)** — *"no device"*.
- `PRODUCT-DIRECTION.md:104-107` quyết định **D2** cho phép owner chọn **B** (iOS-first) hoặc **C** (waive vĩnh viễn).

**Vấn đề:** nếu D2 = B hoặc C, tiền đề của §6 (*"Mid-tier Cert WC re-run"*) **không bao giờ thỏa được**. Hệ quả: hoặc mọi tính năng Milestone B vĩnh viễn không lên được G2, hoặc §6 bị lặng lẽ bỏ qua ở lần ship đầu tiên. Cả hai đều xấu — luật thứ hai nguy hiểm hơn vì nó tạo tiền lệ bỏ qua gate.

**Đề xuất:** viết lại §6 thành *"re-run Cert WC trên **nền tảng đang phát hành**"*, kèm định nghĩa ngân sách frame cho **tier iOS** (hiện `docs/measurement-methodology.md` chỉ khóa protocol Android gfxinfo + iOS Instruments, không có pass-lock riêng cho iOS).

---

### `R-02` — Ba khoảng trống vận hành, **không milestone nào nhận** · **Cao**

Xác minh trong `package.json` + `eas.json` tại `f445e0c`:

| Thiếu | Bằng chứng | Hệ quả |
|---|---|---|
| **Crash reporting** | `package.json` — không có `sentry` / `bugsnag` / `crashlytics` / `firebase` (grep → rỗng) | `RELEASE-GATES.md:74` **G2.8** *"External testing crash triage empty or accepted"* và `ROADMAP-NEXT.md:215` *"crash list empty or triaged"* **giả định có công cụ**. Hiện không có công cụ nào |
| **Đường hotfix OTA** | không có `expo-updates`; `eas.json` chỉ có `build` (`development`/`profiling`/`production`), **không có block `submit`**, không có `runtimeVersion` | Sau launch, mọi fix là **resubmit binary + chờ review**. Với game sim deterministic, một regression physics sẽ bất khả sửa trong nhiều ngày |
| **Nhịp nâng SDK** | `expo ~57.0.24` · `react-native 0.86.3` | Roadmap 9–19 tuần sẽ đi qua ít nhất một major Expo. Reanimated 4.5 + Skia 2.12 + worklets 0.10 đúng là tổ hợp hay vỡ khi upgrade (chuỗi audit này đã có NF-1, NJ-1, NL-2 quanh đúng biên đó). **Không phase nào sở hữu** |

Ba thứ này không phải tính năng nên không lọt vào `FEATURE-CANDIDATES`; nhưng chúng là **điều kiện cần của chính các cổng đã viết**.

**Đề xuất:** thêm một phase **A4 — Operational Readiness** vào Milestone A (crash reporting + quyết định OTA + chốt nhịp nâng SDK), hoặc tối thiểu ba requirement `N-OPS-01…03` trong `REQUIREMENTS-NEXT` §1.

---

### `R-03` — **F-43 rơi mất khỏi roadmap** · **Trung bình**

- `CURRENT-STATE.md:117` liệt F-43 (PlayingHost / GameScreen mount tests) là nợ **đang mở**.
- `REQUIREMENTS-NEXT.md` §0 "Inherited open" **không** mang F-43 sang.
- Không `N-*` ID nào phủ nó; `ROADMAP-NEXT.md` không có phase nào nhận.
- `N-QA-01` chỉ yêu cầu *"267+ tests remain green"* — một suite **đóng băng** cũng thỏa điều đó.

Đây là món nợ chất lượng bị nhắc lại xuyên suốt CODE-REVIEW → RE-AUDIT-02…08 → DEFERRED-ITEMS, và nó vừa lặng lẽ biến mất khỏi kế hoạch.

**Đề xuất:** một requirement `N-QA-03` trong Milestone A hoặc B, đặt trong phase A2 (đã sở hữu "automated regression floor").

---

## 4. Finding nhất quán

### `R-04` — Con số nội dung mâu thuẫn **4 cách**, và đó đúng là con số owner phải chốt

`PRODUCT-DIRECTION.md:118-123` **D4** yêu cầu owner chọn phạm vi nội dung public đầu tiên. Bốn tài liệu nói bốn khoảng:

| Nguồn | Số level |
|---|---|
| `PRODUCT-DIRECTION.md:43` §2 | **8–12** |
| `PRODUCT-DIRECTION.md:123` — khuyến nghị **D4=C** | **3–5** |
| `REQUIREMENTS-NEXT.md:67` `N-LVL-01` | **5–8** |
| `FEATURE-CANDIDATES.md:60` `FC-L01` | **5–12** |
| `RELEASE-GATES.md:81` G2.10 | **≥5** |

Owner không thể trả lời D4 một cách nhất quán. **Đây là blocker của việc lock.**

### `R-05` — Sticky paddle mâu thuẫn 3 nơi

| Nguồn | Trạng thái |
|---|---|
| `PRODUCT-DIRECTION.md:43` §2 | nằm trong "power-up set cho v1.x" |
| `REQUIREMENTS-NEXT.md:57` `N-PWR-05` | **Deferred** |
| `FEATURE-CANDIDATES.md:41` `FC-P06` | "B or C" |
| `ROADMAP-NEXT.md:130` B3 Out of scope | "Sticky (unless promoted)" |

### `R-06` — Phase B3 gộp hai rủi ro không liên quan

`ROADMAP-NEXT.md:125-134` bó **N-PWR-03** (fireball/pierce) và **N-PHYS-01** (aimed serve) vào một phase.

- Fireball đòi đổi chính sách CCD (`step.ts:868-869`) — chính tài liệu xếp *"Highest physics risk"* (`REQUIREMENTS-NEXT.md:55`).
- Aimed serve nhỏ: `PADDLE_ANGLE_CLAMP_DEG`, `MIN_VERTICAL_RATIO`, `MIN_HORIZONTAL_RATIO` **đã tồn tại** trong `constants.ts` và đã được `tests/constants.parity.test.ts` canh; chỉ cần thêm trường vào `Intent` + đổi chính sách dock.

Nếu owner chọn **D3=A**, không có lý do gì để tính năng nhỏ phải xếp hàng sau phần physics nguy hiểm nhất. **Đề xuất:** tách aimed serve thành phase riêng, đặt song song B1/B2.

### `R-07` — A1 có thể "đạt" bằng cách viết một tài liệu

`ROADMAP-NEXT.md:62` — Acceptance: *"Smoke PASS on ≥1 Android; PLT-03 PASS **or** documented waiver strategy with no Complete claim"*.

Chữ **or** phủ lên chính lý do tồn tại của milestone. Nếu không có máy Android nào về, A1 vẫn "pass" bằng một tài liệu và roadmap đi tiếp như thể đã hardened.

**Đề xuất tách:**
- **A1a — Android smoke**: bắt buộc phần cứng, **không có escape**. Đây là hạng mục *"Never run"* (`CURRENT-STATE.md:65`), không phải hạng mục đã đo và trượt.
- **A1b — PLT-03 cert**: cho phép escape bằng chiến lược iOS-first owner ký.

### `R-08` — Doc drift đã bắt đầu, **theo chiều sai**

`CURRENT-STATE.md:58-65` dùng đúng nhãn trung thực đã đề xuất ở vòng review MVP-close:

- D4 → `PASS (dev-build / Instruments; formal EAS profiling IPA optional debt)`
- Soak → `PASS on **Simulator** only; physical soak owed`
- Android smoke → `**Never run**`

Nhưng **tài liệu gốc chưa đổi**:

| Vị trí | Còn nguyên |
|---|---|
| `docs/phase8-certification.md:120` | D4 verdict `**PASS**` |
| `docs/phase8-certification.md:162` | Soak `**PASS (harness)**` |
| `docs/phase8-certification.md` bảng Results | **chưa có** legend `WAIVED ≠ PASS` |
| `docs/audit/MVP-CLOSE-REPORT.md` | `HEAD: 2aaa9cf` (thực tế `f445e0c`) |

**Tài liệu dẫn xuất giờ chính xác hơn tài liệu gốc.** Người đọc sau sẽ thấy hai phiên bản sự thật. Sửa ở nguồn, đừng sửa ở bản sao.

---

## 5. Ước lượng công sức

Cộng dải trong `ROADMAP-NEXT.md:35-43`: **A–F ≈ 9–19 engineer-week** cho 1 kỹ sư. Dải hợp lý cho phạm vi đã mô tả.

Một chỗ cần trung thực hơn: A ghi *"1–3 weeks wall-clock (hardware-bound)"* trong khi phần cứng **chưa có trong tay**. Phát biểu đúng là **A không có cận trên cho tới khi có máy**. Tài liệu có nói điều này ở ô Risks (`:66` *"No device → milestone stalls"*) nhưng bảng ước lượng lại đưa ra một dải như thể đã có máy.

---

## 6. Khuyến nghị có đòn bẩy cao nhất

**Mua một máy Android tầm trung (Pixel 6a cũ, ~$150–250).**

Một hành động đóng đồng thời:

| Hạng mục | Trạng thái hiện tại |
|---|---|
| PLT-03 | `WAIVED` — nợ duy nhất chặn claim hiệu năng |
| Android install smoke | `Never run` |
| `FC-D01` / `FC-D02` | Toàn bộ Milestone A phần Android |
| `R-01` mâu thuẫn §6 | Tự tan khi Cert WC chạy được |
| `N-PLT-01` / `N-PLT-02` | Cùng đóng |

Rẻ hơn — và trung thực hơn — mọi phương án tài liệu hóa đường vòng.

---

## 7. Bảng tổng hợp finding

| ID | Mức | Nội dung | Chặn lock? |
|---|---|---|---|
| `R-01` | Cao | Feature-freeze §6 không thỏa được nếu D2=B/C | Nên |
| `R-02` | Cao | Không crash reporting / OTA / nhịp nâng SDK | **Có** |
| `R-03` | TB | F-43 không còn chủ trong roadmap | Nên |
| `R-04` | TB | Số level mâu thuẫn 4 cách — chính là quyết định D4 | **Có** |
| `R-05` | Thấp | Sticky paddle mâu thuẫn 3 nơi | Không |
| `R-06` | TB | B3 bó fireball + aimed serve | Không |
| `R-07` | TB | A1 acceptance có escape bằng tài liệu | Nên |
| `R-08` | Thấp | Nhãn verdict ở tài liệu gốc chưa sửa | Không |

---

## 8. Việc cần làm trước khi lock

1. **`R-04`** — thống nhất số level về một giá trị; sửa cả 5 vị trí trước khi hỏi owner D4.
2. **`R-02`** — thêm phase **A4 Operational Readiness** hoặc `N-OPS-01…03`.
3. **`R-01`** — viết lại `RELEASE-GATES.md` §6 theo nền tảng phát hành + định nghĩa pass-lock tier iOS.
4. **`R-07`** — tách A1 thành A1a (smoke, không escape) / A1b (cert, có escape).
5. **`R-03`** — thêm `N-QA-03` cho F-43, đặt vào phase A2.
6. **`R-05`, `R-06`, `R-08`** — biên tập; không chặn.

Sau 6 mục đó, roadmap **lock được**.

---

## 9. Ràng buộc đã giữ trong review này

- Không sửa production code.
- Không sửa tài liệu được review (`.planning/post-mvp/*`, `.planning/REQUIREMENTS.md`, `docs/phase8-certification.md`, `docs/audit/MVP-CLOSE-REPORT.md`).
- Mọi finding về code có file path + line number, kiểm tại `f445e0c`.
- Không tạo số liệu thiết bị; không hạ scope để mục nào được đánh PASS.

---

## 10. Liên quan

- `.planning/post-mvp/` — 6 tài liệu được review
- [TEST-RUN-VERIFICATION-2026-09-24.md](./TEST-RUN-VERIFICATION-2026-09-24.md) — xác minh `267/267` tại cùng HEAD
- [MVP-CLOSE-REPORT.md](./MVP-CLOSE-REPORT.md) · [DEFERRED-ITEMS.md](./DEFERRED-ITEMS.md)
- `docs/phase8-certification.md` · `docs/measurement-methodology.md`
