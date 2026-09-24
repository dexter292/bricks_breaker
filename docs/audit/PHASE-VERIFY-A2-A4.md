# XÁC MINH PHASE — A2 · A4 · E1a

**Ngày:** 2026-09-24
**HEAD kiểm:** `5144984` (`fix: harden Title↔Playing teardown and record physical soak PASS`)
**Commit trong phạm vi:** `135f7ed` → `06d9f79` → `f402c10` → `f8f677f` → `5144984`
**Tính chất:** xác minh độc lập — **không sửa production code, chỉ tạo báo cáo trong `docs/audit/`**
**Finding:** `R-15`…`R-19` (nối tiếp `R-01`…`R-14`)

---

## 0. Kết luận

> **Bằng chứng thiết bị vật lý đầu tiên có số thật.** Soak 100 chu kỳ + 15 phút trên iPhone 16 Pro đã phát hiện và dẫn tới sửa **một defect thật chỉ máy thật mới lộ** — đúng mục đích tồn tại của gate đó.
>
> `R-15` **đóng** (và đóng khéo). `R-16` **vẫn mở**.
> Ba finding mới: `R-17` (hàng memory không chứng minh verdict của chính nó), `R-18` (chỉ lưu lần chạy xanh), `R-19` (soak trên Release bất khả thi về cấu trúc).
>
> Không finding nào chặn A2. Cả ba đều là **cách ghi bằng chứng**, không phải lỗi sản phẩm.

---

## 1. Điểm mạnh — có bằng chứng

### 1.1 Một defect chỉ thiết bị mới thấy, đã tìm ra và sửa

`5144984` thêm vào `src/runtime/useGameLoop.ts:522`:

```ts
useEffect(() => {
  return () => { frameCallback.setActive(false); };
}, [frameCallback]);
```

Comment nguyên văn: *"Menu / soak Title↔Playing remount: stop the UI frame before Skia atlases dispose. Without this, `recordFrame` can `drawImageRect` a freed glow soft → HostFunction disposed."*

**Cùng lớp lỗi với NL-2** (vòng #08, cũng device-confirmed): một race giữa teardown React và vòng lặp UI runtime đang bay. Không unit test nào trong 277 test bắt được — nó cần mount/unmount thật với Skia thật.

Đây là lần đầu harness soak trả về giá trị vượt quá "không crash".

### 1.2 Số liệu vật lý thật

`docs/phase8-certification.md:170` — hàng Soak Results đầu tiên **không phải Simulator**:

- Thiết bị: iPhone 16 Pro vật lý, iOS 26.6.1
- 100 chu kỳ Title↔Playing + 15 phút liên tục
- Mem start `~576 MiB footprint`
- **0** lỗi `disposed` / HostFunction sau khi có fix
- Trace lưu: `/tmp/bricks-soak/start.trace`, `end.trace`

Kèm caveat tự giác: *"Debug+Metro mem is fat — not a release RSS claim."*

### 1.3 Không bị cuốn theo đà

Dòng status cuối `phase8-certification.md` vẫn giữ:

> *iOS D-16 = **OBSERVATION** (not ceiling PASS) … iOS ceiling under new protocol still **NOT RUN** … Floor **NOT RUN**. Android **OUT OF SCOPE (D2=B)**.*

Và `:108` tự ghi hàng D-16 là *"Single session, development build, no p50/p95 — **re-run required**"*. Một soak PASS không được dùng để nới bất kỳ hàng nào khác.

### 1.4 `R-15` đóng — và đóng đúng chỗ tinh tế

`docs/store/CONSOLE-ENTRY.md:38-45` nay có **hai nhánh** DSN-off / DSN-on, kèm nhận định chính xác ở `:38`:

> *"`@sentry/react-native` is **always linked**; transmission depends on DSN"*

Đó đúng là điểm dễ sai: SDK nằm trong binary bất kể DSN có được set hay không. Nhánh DSN-on khai `App info & performance (crash logs)` + `Share with third parties: Sentry` + `Encrypted in transit: HTTPS` — khớp yêu cầu ASC App Privacy.

### 1.5 F-43 đóng

3 file mount contract mới: `tests/ui/GameHost.test.tsx`, `GameScreen.test.tsx`, `TitleScreen.test.tsx` — đúng phần đã hoãn từ vòng #08 (`N-QA-03`).

---

## 2. Finding

### `R-17` — Hàng memory không chứng minh được verdict của chính nó · **Trung bình**

**Tiêu chí pass** (`docs/ops/SOAK-PHYSICAL.md:40`): *"Sustained memory growth across start→end"* ⇒ FAIL.

**Dữ liệu ghi** (`docs/phase8-certification.md:170`):

| Mem start | Mem end |
|---|---|
| `~576 MiB footprint` | `~514–725 MiB footprint` (end Title settle ~514; peak sample ~725) |

Một **khoảng bắc qua** giá trị start làm verdict không thể phản chứng:

- Lấy `514` → giảm **11%** ⇒ PASS
- Lấy `725` → tăng **26%** ⇒ trông như FAIL

Người đọc sau không có cách chọn đúng. Thiếu điều kiện quyết định: **mỗi mẫu được lấy ở trạng thái app nào.** Note có gợi ý (*"end Title settle"*) nhưng ô `Mem start` thì không nói `576` đo ở đâu.

**Đề xuất — chỉ là cách ghi, không phải đo lại:**

| Mem start (Title) | Mem end (Title) | Peak (in-play) |
|---|---|---|
| ~576 MiB | ~514 MiB | ~725 MiB |

Nếu `576` thật sự đo tại Title thì verdict PASS là **đúng và chứng minh được** (−11% ở trạng thái so sánh được). Peak in-play thuộc cột riêng — nó là thông tin headroom, không phải bằng chứng leak.

Thêm: ghi rõ công cụ là **Instruments Activity Monitor** hay **Xcode Memory gauge** — hai thứ báo chỉ số khác nhau, và runbook `:30` liệt kê cả hai.

---

### `R-18` — Chỉ lần chạy xanh được lưu; lần đỏ mới là bằng chứng soak có hiệu lực · **Trung bình**

Note ở `:170` nêu **đích danh cái fix**: *"0 `disposed` / HostFunction errors **after `useGameLoop` unmount `setActive(false)`**"*.

Câu đó chỉ có nghĩa nếu tồn tại một lần chạy **trước fix** đã sinh ra các lỗi đó. Lần chạy ấy không được ghi ở đâu.

Đó chính là **bằng chứng soak có khả năng báo đỏ** — cùng nguyên tắc đã áp ở:

| Công cụ | Self-check |
|---|---|
| `assert-worklet-closures.mjs` | vòng #06 — làm guard mù ⇒ exit 1 |
| `assert-level-solvability.mjs` | `level-02` là negative fixture, gate fail nếu nó không fail |
| **Soak** | **chưa có** |

Nếu ledger chỉ chứa lần xanh, người đọc sau không phân biệt được *"soak đã pass"* với *"soak không thể fail"*.

**Đề xuất:** thêm một hàng (hoặc một dòng trong note) cho lần chạy trước fix — ngày, commit, lỗi quan sát được. Chi phí bằng không; giá trị là biến hàng PASS từ khẳng định thành kết luận có đối chứng.

---

### `R-19` — Soak trên Release bất khả thi về cấu trúc · **Thấp**

**Bằng chứng:**

- `src/devflags.ts:15` — `SOAK_HARNESS = process.env.EXPO_PUBLIC_SOAK === '1'`
- `app/_components/GameHost.tsx:63` — `if (typeof __DEV__ === 'undefined' || !__DEV__ || !SOAK_HARNESS) return;`

Harness **chỉ arm dưới `__DEV__`**. Nên bằng chứng cho `G2.3` (`RELEASE-GATES.md:74`) sẽ **luôn** đến từ dev build. Profile bộ nhớ thực sự ship không bao giờ được soak.

Đây là thiết kế có chủ ý và hợp lý (`SOAK-PHYSICAL.md:19` — *"Never set `EXPO_PUBLIC_SOAK` on the production EAS profile"*). Vấn đề chỉ là **lời văn của gate**: `G2.3` đọc là *"Physical iOS soak PASS"* mà không nói bằng chứng đó thuộc cấu hình nào.

**Đề xuất:** `G2.3` ghi thành *"Physical iOS soak PASS (dev-client; release RSS không được claim từ bằng chứng này)"* — để sau này không ai đọc "soak PASS" thành một tuyên bố về bộ nhớ bản phát hành.

---

### `R-16` — **vẫn mở**: thuật toán reachability nhân đôi, không có parity test

Nêu từ vòng trước, chưa xử lý và chưa được ghi vào tài liệu nào (`grep -rn "R-16" docs/ .planning/` → **rỗng**).

| Bản cài đặt | Vai trò | Được test? |
|---|---|---|
| `src/core/levels/solvability.ts:198` | thư viện | ✅ `tests/levels.solvability.test.ts:10` |
| `scripts/assert-level-solvability.mjs:196` | **gate CI** | ❌ không test nào chạm |

`tests/levels.solvability.test.ts:9-10` chỉ import từ `src/core/levels/`. Bản trong `scripts/` — thứ thực sự gate CI — không có gì canh. Script tự ghi lý do tách ở `:22`: *"Match `src/core/constants.ts` — do not import (extensionless TS under Node ESM)"*.

Sửa bug ở một bên, bên kia im lặng giữ hành vi cũ.

**Tiền lệ đúng đã có trong repo:** `tests/constants.parity.test.ts` canh literal inline trong worklet khớp `constants.ts`. Cần một test tương tự: chạy **cả hai** bản trên 6 level trong `assets/levels/` và assert kết quả (`ok` + danh sách unreachable) giống hệt nhau.

---

## 3. Xác minh tự chạy

### 3.1 Solvability gate — self-check **không rỗng** (đã kiểm chứng)

Kiểm tra có kiểm soát: tạm ép `unreachableBreakables` luôn rỗng trong script gate, chạy lại:

```
assert-level-solvability: negative fixture level-02.json did not fail reachability
assert-level-solvability: FAILED                       EXIT=1
```

Khôi phục ngay; `git status scripts/` → rỗng. Công cụ chứng minh được nó có khả năng báo đỏ.

Chạy bình thường: `level-01/03/04/05/06 OK` · `level-02: FAIL as expected (8 unreachable) — self-check OK` · `EXIT=0`.

### 3.2 Test suite

Nguồn copy byte-identical với repo (`diff -rq src tests` → 0 khác biệt).

| Nhóm | File | Pass | Fail |
|---|---:|---:|---:|
| `tests/*.test.ts` | 56 | **266** | 0 |
| `tests/ui/*.test.tsx` — chứng kiến | 5 | **7** | 0 |
| `tests/ui/*.test.tsx` — **không chạy được ở harness** | 2 | — | — |
| **Tổng theo đếm `it()`** | **63** | **277** | — |

`GameHost.test.tsx` (1 test) và `GameScreen.test.tsx` (3 test) không thực thi được trong harness của tôi: chuỗi resolve `expo-modules-core/src/ts-declarations/*.ts` và `SkiaPictureViewNativeComponent` vượt quá ESM loader hook (`codegenNativeComponent`, deep CJS extensionless import). **Giới hạn harness, không phải lỗi repo** — vitest xử lý được qua Vite SSR transform.

→ **277 cần output `npm test` trên macOS để xác nhận trọn vẹn.** Tôi chứng kiến **273**.

### 3.3 Gate khác tại `5144984`

`assert-privacy-manifest` OK · `assert-worklet-closures` **OK (91 file)** · `assert-skia-version` `2.12.0 OK` · `assert-level-solvability` OK.

---

## 4. Trạng thái finding

| ID | Mức | Trạng thái |
|---|---|---|
| `R-15` Sentry vs bề mặt store | Cao | **ĐÓNG** — `CONSOLE-ENTRY.md:38-45` hai nhánh DSN |
| `R-16` reachability nhân đôi | TB | **ĐÓNG** — `scripts/lib/levelSolvability.mjs` + `tests/levels.solvability-parity.test.ts` |
| `R-17` hàng memory không phản chứng được | TB | **ĐÓNG** (cách ghi) — phase8 tách Title start/end vs peak; SOAK-PHYSICAL comparator = Title |
| `R-18` chỉ lưu lần chạy xanh | TB | **ĐÓNG** (cách ghi) — note pre-fix red `disposed` cùng ngày trước `5144984` |
| `R-19` soak Release bất khả thi | Thấp | **ĐÓNG** (lời văn) — `G2.3` + RELEASE-GATES Physical soak ghi dev-client |
| `R-10` floor mid-tier | Cao | **MỞ** — không có phần cứng |
| `R-12` tier theo RAM | Cao | **MỞ** — `docs/ops/QUALITY-TIER.md` đã ghi; owner chưa chọn mitigation |

**Bổ sung khi verify (2026-09-24):** `RELEASE-GATES.md` vẫn ghi Physical soak **OPEN (sim only)** trong khi phase8 đã PASS — đã sửa cùng đợt đóng `R-19`.

---

## 5. Còn lại trong Milestone A

| Mục | Trạng thái |
|---|---|
| **A1 ceiling** | `NOT RUN` — cần profiling IPA + 2×≥30 s + p50/p95/Hangs. D-16 cũ = `OBSERVATION`, không tính |
| **A2 soak** | **PASS** (dev-client) — `R-17`/`R-18`/`R-19` đã chỉnh cách ghi / lời văn gate |
| **A3 cohort** | Chưa chạy — form sẵn ở `docs/ops/PLAYTEST-FORM-A3.md`; gate `D3` |
| **A4** `N-OPS-01` | Wired, **chưa proven** — cần Sentry project + DSN + build + crash thật + event ID |
| **A4** `N-OPS-02/03` | Đóng (`UPDATE-STRATEGY.md`, `SDK-CADENCE.md`) |
| **E1a** | **Xong** — 5 level playable, lint xanh, self-check đỏ trên `level-02` |

---

## 6. Ràng buộc đã giữ

- Không sửa production code. Ngoại lệ có kiểm soát duy nhất: làm mù `assert-level-solvability.mjs` để kiểm chứng self-check, khôi phục ngay, `git status` xác nhận sạch (§3.1).
- Không tạo file ngoài `docs/audit/`.
- Mọi finding có file path + line number, kiểm tại `5144984`.
- Không tạo số liệu thiết bị. `R-10`, `R-12` giữ mở; A1 ceiling giữ `NOT RUN`.
- Giới hạn harness được nêu rõ ở §3.2 thay vì báo cáo con số không tự chứng kiến.

---

## 7. Liên quan

- [POST-MVP-ROADMAP-REVIEW.md](./POST-MVP-ROADMAP-REVIEW.md) · [IOS-ONLY-DECISION-IMPACT.md](./IOS-ONLY-DECISION-IMPACT.md)
- [DECISIONS-2026-09-24.md](./DECISIONS-2026-09-24.md) · [DECISIONS-FULL-LOCK-2026-09-24.md](./DECISIONS-FULL-LOCK-2026-09-24.md)
- [TEST-RUN-VERIFICATION-2026-09-24.md](./TEST-RUN-VERIFICATION-2026-09-24.md)
- `docs/ops/SOAK-PHYSICAL.md` · `docs/ops/CEILING-CERT.md` · `docs/ops/QUALITY-TIER.md` · `docs/phase8-certification.md`
