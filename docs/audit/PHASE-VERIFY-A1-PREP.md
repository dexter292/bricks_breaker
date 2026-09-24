# XÁC MINH — CHUẨN BỊ A1 (Cert arm · audio unblock · Sentry EAS)

**Ngày:** 2026-09-24
**HEAD kiểm:** `7c26cd9` (`docs: link Cert-armed profiling rebuild for A1`), working tree clean
**Phạm vi:** 12 commit từ `1166524` → `7c26cd9`
**Tính chất:** xác minh độc lập — **không sửa production code, chỉ tạo báo cáo trong `docs/audit/`**
**Finding mới:** `R-20`, `R-21` (nối tiếp `R-01`…`R-19`)

---

## 0. Kết luận

> **Bốn finding vòng trước đóng sạch**, `R-16` đóng **hơn** mức đề xuất (gỡ hẳn trùng lặp thay vì canh nó).
>
> ~~Nhưng **hai gate đang đỏ tại HEAD**~~ **FIXED 2026-09-24** (sau `7c26cd9`): mirror cert metrics (R-20), refs → `useEffect`, `GameScreen.test.tsx` stubs, `assert-eas-profiles.mjs` (R-21). `tsc` / `eslint --max-warnings 0` / `npm test` xanh trên commit fix.
>
> `N-QA-01` đạt trở lại sau fix.
>
> ~~Hai lỗi `LC-07` nằm đúng trong đường đo mà **A1 sắp dùng**~~ Đã chuyển sang mirror + `useAnimatedReaction` trong `PlayingHost` — Instruments p95 không còn chứa hop logger.

---

## 1. Đóng sạch — `R-16` … `R-19`

### `R-16` — đóng **hơn** đề xuất

Tôi đề xuất thêm parity test cho hai bản cài đặt. Các bạn **gỡ hẳn trùng lặp**:

| Trước | Sau |
|---|---|
| `scripts/assert-level-solvability.mjs` tự cài lại thuật toán (~146 dòng) | `scripts/lib/levelSolvability.mjs` — nguồn chung; script `:17` import nó |
| Không có gì canh | `tests/levels.solvability-parity.test.ts` — canh hằng số mjs khớp core export |

Không còn hai bản để lệch nhau. Đây là cách sửa đúng hơn cách tôi đề nghị.

### `R-17` — hàng soak giờ tự chứng minh

`docs/phase8-certification.md:170`:

> *"**Comparable Title footprints: 576 → 514 (−11%) — no sustained growth.** In-play peak sample ~725 MiB is headroom only (not the leak comparator)."*

Cột start/end nay ghi rõ trạng thái lấy mẫu (`mid-cycle Title↔Playing` / `Title after complete`), công cụ nêu đích danh **Instruments Activity Monitor (`xctrace`)**. Verdict đọc tách khỏi note vẫn đúng.

### `R-18` — lần chạy đỏ đã được ghi

> *"**Pre-fix red (R-18):** same device earlier same day (terminal log before `5144984`) — `HostFunction: Attempted to access a disposed object` at `recordSprites.ts` `drawImageRect` during Title↔Playing remount."*

Có chuỗi lỗi thật và vị trí thật. Hàng PASS chuyển từ khẳng định thành **kết luận có đối chứng** — soak giờ đã chứng minh được nó có khả năng báo đỏ, ngang hàng với worklet guard và solvability lint.

### `R-19` — `G2.3` sửa cả hai chỗ

`RELEASE-GATES.md:29` và `:74` đều thêm *"**dev-client**; release RSS must not be claimed from this evidence"*.

### `R-15` (vòng trước) vẫn đóng

`docs/store/CONSOLE-ENTRY.md:38-45` giữ hai nhánh DSN-off / DSN-on.

---

## 2. **Gate đỏ tại HEAD** — regression

`npm test` xanh, nhưng `npm test` **không** chạy typecheck và lint. `.github/workflows/ci.yml` thì có:

```
19:  - run: npm run typecheck
20:  - run: npm run lint -- --max-warnings 0
```

Cả hai step này **sẽ fail** trên `7c26cd9`.

### 2.1 `npx tsc --noEmit` → **3 lỗi**, tất cả một file

```
tests/ui/GameScreen.test.tsx(24,23): TS7031  Binding element 'children' implicitly has an 'any' type
tests/ui/GameScreen.test.tsx(33,14): TS2352  Conversion of '{ value: null }' to 'SharedValue<SkPicture>'…
tests/ui/GameScreen.test.tsx(34,18): TS2352  …to 'SharedValue<SkSize>'
```

Đây là file mount test mà commit `f402c10` đánh dấu **"F-43 closed"**. Nó cũng là file duy nhất harness audit không thực thi được (§4.2) — nên hiện là file **được kiểm chứng ít nhất** trong repo, mà lại đang mang nhãn đóng một nợ chất lượng.

### 2.2 `npx eslint . --max-warnings 0` → **4 lỗi**

| # | Vị trí | Rule |
|---|---|---|
| 1 | `src/runtime/useGameLoop.ts:463` | **`LC-07: No runOnJS on the per-frame hot path (D-14)`** |
| 2 | `src/runtime/useGameLoop.ts:476` | **`LC-07`** |
| 3 | `src/runtime/useGameLoop.ts:260` | `react-hooks/refs` — Cannot access refs during render |
| 4 | `app/_components/PlayingHost.tsx:290` | `react-hooks/refs` |

`LC-07` là quy tắc được tạo riêng ở WP-7/T7.3 để chặn đúng lớp lỗi này. Đây là lần đầu nó đỏ kể từ khi ra đời.

---

## 3. `R-20` — cert metrics đang đo chính cái nó chèn vào · **Cao**

### 3.1 Bằng chứng

`src/runtime/useGameLoop.ts:459-481`, bên trong frame worklet:

```ts
if (
  certLogSv.value === 1 &&
  m.sampleCount > 0 &&
  (m.sampleCount === 30 || m.sampleCount % 120 === 0)
) {
  runOnJS(logCertMetricsStable)(
    percentileMsPublic(m, 50), m.p95Ms, meanInterval(m),
    m.rollingFps, m.sampleCount, m.overBudget,
  );
}
```

và một nhánh heartbeat thứ hai ở `:471-481` khi frozen.

### 3.2 Về mặt chức năng thì phòng thủ được

Chặn bởi `certLogSv.value === 1`, tiết lưu ~1 Hz ở 120 Hz. Production không arm CERT ⇒ không bao giờ chạy. **Tôi không cho rằng đây là bug runtime.**

### 3.3 Nhưng có hai vấn đề thật

**(a) `LC-07` tồn tại để chuyện này là quyết định có ý thức.** Rule đang đỏ. Hai lối đi hợp lệ: hoặc một exception **có phạm vi và ghi lý do** ngay tại chỗ, hoặc đổi cách làm để không cần exception.

**(b) Cách làm không cần exception đã có sẵn trong chính file đó.**

`useGameLoop.ts:172-177` định nghĩa:

```ts
chromeOut: SharedValue<ChromeMirror>;
/** Reaction should listen to this scalar — not reallocate chromeOut each frame. */
chromeSeq: SharedValue<number>;
```

Đó là pattern **publish-mirror + `useAnimatedReaction`** mà NL-1 đã dựng để đưa dữ liệu từ UI runtime sang JS **không** dùng `runOnJS` trong hot path. Metrics đi qua cùng đường thì `LC-07` xanh tự nhiên, không cần exception nào.

**(c) Điểm quan trọng hơn cả hai ý trên:** đây là **cert harness chèn một lời gọi cross-runtime vào đúng vòng lặp nó đi đo**.

Dù chỉ ~1 Hz, mỗi lần `runOnJS` là một lần schedule qua biên runtime **bên trong cửa sổ đo**. Số Instruments mà A1 ceiling sắp thu sẽ bao gồm cả cái nhiệt kế. Với ngưỡng đã chốt là `p50 ≤ 8.33 ms` / `p95 ≤ 11 ms`, một spike hiếm do scheduling rơi đúng vào đuôi phân phối là thứ ảnh hưởng trực tiếp tới **p95** — chỉ số nhạy nhất trong pass-lock.

Mirror + reaction giữ đường đo gần với hành vi lúc ship hơn: worklet chỉ ghi số vào SharedValue, JS đọc khi rảnh.

### 3.4 `react-hooks/refs` — cùng gốc

`useGameLoop.ts:259-260`:

```ts
const logCertMetricsRef = useRef(logCertMetricsLine);
logCertMetricsRef.current = logCertMetricsLine;   // ghi ref trong render
```

Pattern "latest ref". Không an toàn dưới React Compiler — và `app.config.js` đang bật `experiments.reactCompiler: true`. `PlayingHost.tsx:289-290` (`setActiveRef.current = setActive`) là cùng lớp.

Chuyển phép gán vào `useEffect`. Nếu §3.3(b) được áp dụng thì cả hai ref này có thể biến mất luôn.

### 3.5 Đề xuất

| Việc | Kết quả |
|---|---|
| Publish metrics qua `certOut`/`certSeq` SharedValue + `useAnimatedReaction` (khuôn `chromeOut`/`chromeSeq`) | `LC-07` xanh; bỏ được `logCertMetricsRef`; phép đo sạch |
| Nếu giữ `runOnJS`: thêm `eslint-disable-next-line` **có lý do viết ra**, và ghi vào `CEILING-CERT.md` rằng số đo chứa cả instrument | Gate xanh nhưng confound vẫn còn |
| Chuyển `setActiveRef.current = setActive` (`PlayingHost.tsx:290`) vào `useEffect` | `react-hooks/refs` xanh |

**Nên làm trước khi chạy A1.** Đo xong rồi mới sửa nghĩa là phải đo lại.

---

## 4. `R-21` — CERT arm mất bảo đảm cấu trúc · **Trung bình**

### 4.1 Thay đổi

`358f53f` (`fix: allow Cert WC arm on profiling IPA without __DEV__`) — `src/devflags.ts:14`:

```ts
/** Cert harness arm — PlayingHost / GameHost when EXPO_PUBLIC_CERT=1 (profiling OK). */
export const CERT_HARNESS = process.env.EXPO_PUBLIC_CERT === '1';
```

`eas.json` thêm `EXPO_PUBLIC_CERT: "1"` vào profile **`profiling`**.

### 4.2 Lý do đúng, phạm vi đúng

A1 ceiling cần arm Cert WC trên profiling IPA nơi `__DEV__` là `false` — không nới thì không đo được. Và `production.env` **không** có biến đó (đã kiểm `eas.json`); `SOAK_HARNESS` vẫn `__DEV__`-only trong `GameHost.tsx:63`. Comment ở `devflags.ts:5-9` ghi rõ ràng quy ước.

### 4.3 Nhưng bản chất bảo đảm đã đổi

| Trước | Sau |
|---|---|
| `__DEV__` — **trình biên dịch strip** trong release. Không cách nào arm. | Một biến môi trường trong **file config người sửa tay** |

`G2.5` (*"Production build QA: no Cert WC / Soak / DEV tier chrome"*) từ chỗ **bất khả vi phạm** trở thành **một mục QA nhìn bằng mắt**. Một lần copy-paste nhầm giữa các profile trong `eas.json` là đủ để ship binary có Cert overlay.

### 4.4 Đề xuất — rẻ, đúng khuôn đã có

Thêm `scripts/assert-eas-profiles.mjs`: đọc `eas.json`, **fail** nếu `build.production.env` chứa bất kỳ khoá nào trong:

```
EXPO_PUBLIC_CERT · EXPO_PUBLIC_SOAK · EXPO_PUBLIC_CLIFF_RAMP · EXPO_PUBLIC_PERF_OVERLAY
```

Cùng khuôn `assert-privacy-manifest.mjs` (đọc config, kiểm nội dung). Thêm vào `npm test` + CI. Khôi phục lại tính bất khả vi phạm mà `__DEV__` từng cho, với chi phí ~20 dòng.

Kèm self-check: một fixture `eas.json` có `EXPO_PUBLIC_CERT` trong `production` mà script phải báo đỏ.

---

## 5. Xác minh tự chạy tại `7c26cd9`

| Gate | Kết quả |
|---|---|
| `npx tsc --noEmit` | **FAIL — 3 lỗi** (§2.1) |
| `npx eslint . --max-warnings 0` | **FAIL — 4 lỗi** (§2.2) |
| `node scripts/assert-worklet-closures.mjs` | OK (**91 file**), exit 0 |
| `node scripts/assert-level-solvability.mjs` | OK — ship levels pass; `level-02` fail as expected, exit 0 |
| `node scripts/assert-privacy-manifest.mjs` | OK |
| `node scripts/assert-skia-version.mjs` | `2.12.0 OK` |

### 5.1 Test suite

Nguồn copy byte-identical với repo (`diff -rq src tests` → 0 khác biệt).

| Nhóm | File | Pass |
|---|---:|---:|
| `tests/*.test.ts` | 58 | **270** |
| `tests/ui/*.test.tsx` (đếm `it()`) | 7 | 11 |
| **Tổng dự kiến** | **65** | **281** |

+2 file mới so với vòng trước: `tests/audio.preload-hang.test.ts`, `tests/levels.solvability-parity.test.ts`.

**Giới hạn harness (không phải lỗi repo):** `GameHost.test.tsx` và `GameScreen.test.tsx` không thực thi được trong runner của tôi — chuỗi resolve `expo-modules-core/src/ts-declarations/*.ts` và `SkiaPictureViewNativeComponent` vượt quá ESM loader hook. Cần output `npm test` trên macOS để xác nhận 281.

### 5.2 Ghi nhận: audio preload soft-fail

`860e867` / `3dcb26b` — `expoAudioService.ts` thêm `withTimeout(…, PRELOAD_STEP_MS = 1500)` và `try/catch` quanh từng `createPlayer`, để một lời gọi native treo không chặn được cold path vào ván chơi. Kèm test `tests/audio.preload-hang.test.ts`.

Đây lại là một defect **chỉ thiết bị mới lộ** (phát hiện trong phiên CERT trên máy thật), và lần này đã có unit test đi kèm. Mở rộng đúng hướng của F-33.

---

## 6. Việc trước mắt

| # | Việc | Trạng thái |
|---|---|---|
| 1 | Sửa 2 lỗi `LC-07` — mirror (§3.5) | **DONE** — `publishCertMetricsMirror` + `PlayingHost` reaction |
| 2 | Sửa 2 lỗi `react-hooks/refs` | **DONE** — `setActiveRef` trong `useEffect`; bỏ `logCertMetricsRef` |
| 3 | Sửa 3 lỗi `tsc` trong `tests/ui/GameScreen.test.tsx` | **DONE** |
| 4 | `assert-eas-profiles.mjs` (`R-21`) | **DONE** — `npm test` + CI |

A1 official vẫn **NOT RUN** cho đến profiling/Instruments p50/p95 — nhưng đường đo đã sạch LC-07.

---

## 7. Ràng buộc đã giữ

- Không sửa production code; không tạo file ngoài `docs/audit/`.
- Mọi finding có file path + line number, kiểm tại `7c26cd9` (working tree clean).
- Không tạo số liệu thiết bị. A1 ceiling vẫn **NOT RUN**; `R-10` floor, `R-12` tier vẫn mở.
- Giới hạn harness nêu rõ ở §5.1 thay vì báo con số không tự chứng kiến.

---

## 8. Liên quan

- [PHASE-VERIFY-A2-A4.md](./PHASE-VERIFY-A2-A4.md) — `R-15`…`R-19`
- [POST-MVP-ROADMAP-REVIEW.md](./POST-MVP-ROADMAP-REVIEW.md) · [IOS-ONLY-DECISION-IMPACT.md](./IOS-ONLY-DECISION-IMPACT.md)
- [DECISIONS-2026-09-24.md](./DECISIONS-2026-09-24.md) · [DECISIONS-FULL-LOCK-2026-09-24.md](./DECISIONS-FULL-LOCK-2026-09-24.md)
- `docs/ops/CEILING-CERT.md` · `docs/ops/QUALITY-TIER.md` · `.github/workflows/ci.yml`
