# FINAL ACCEPTANCE & RELEASE VALIDATION

**Ngày:** 2026-09-22
**Baseline:** [RE-AUDIT-08.md](./RE-AUDIT-08.md) · [DEFERRED-ITEMS.md](./DEFERRED-ITEMS.md)
**Đối tượng:** HEAD **`7dadd1b`** (+ uncommitted: glow dispose handshake, AsyncStorage/ExpoDevice probes, Phase 8 iOS fill + Pixel WAIVE)
**Tính chất:** acceptance re-review 2026-09-22 evening — iOS D-16 filled; Pixel/Android **WAIVED** (owner: no device).
**Gate re-run (macOS, same evening):** `tsc` 0 · **`vitest` 267/267 (59 files)** · worklets OK previously · privacy Contact `dexter@lkfnb.com`

---

## KẾT LUẬN TỔNG QUÁT (re-review)

> **CONDITIONAL PASS — playtest nội bộ / iOS Release sideload OK.**
>
> Gate tự động xanh (**267/267**). iOS D-16 Cert WC + Instruments **PASS**. Bản **Release** đã cài lên iPhone 16 Pro (chơi offline, không Metro).
>
> **Chưa đóng MVP / store submit** vì: (1) **PHYS-05** ledger vs code (aimed launch), (2) **PLT-03 Android** WAIVED/unproven (không claim Complete), (3) soak iOS + D2/D4 iOS profiling còn mở, (4) trademark / SFX provenance / console Data Safety.
>
> Không blocker code khác trước internal iOS playtest ngoài quyết định PHYS-05.

---

## 1. Gate tự động — tôi tự chạy lại, 2026-09-22

| Gate | Kết quả | Ghi chú |
|---|---|---|
| `npx tsc --noEmit` | **0 lỗi** | |
| `npx eslint . --max-warnings 0` | **0 error / 0 warning** | Sạch hoàn toàn |
| Unit/logic suite (`*.test.ts`) | **261 pass / 0 fail** (55 file) | Chạy bằng runner thay thế — xem cảnh báo dưới |
| `node scripts/assert-worklet-closures.mjs` | **OK (89 file)**, exit 0 | Self-check sống (đã kiểm chứng ở vòng #07: làm guard mù → exit 1) |
| `node scripts/assert-skia-version.mjs` | **PASS** | `@shopify/react-native-skia@2.12.0 OK` |
| `node scripts/assert-privacy-manifest.mjs` | **PASS, 0 WARN** | Kiểm nội dung, không chỉ key |
| Live privacy policy | **200, nội dung đúng** | Tôi fetch với cache-buster; Contact có `dexter@lkfnb.com` |

> **Cảnh báo về runner, phải nêu:** `npx vitest run` không chạy được trong môi trường audit (`node_modules` build cho macOS/arm64; `rolldown` thiếu native binding Linux). Suite `*.test.ts` được chạy bằng shim `vitest`/`@fast-check/vitest` + Node 22 `--experimental-strip-types` trong thư mục scratch **ngoài repository**. Đây là thực thi thật nhưng **không phải output vitest chính thức**.
>
> **Và bốn file `*.test.tsx` KHÔNG được runner này thực thi.** Tôi đã dựng riêng một harness jsdom + babel JSX + alias: `jsdom-harness.test.tsx` **pass**, nhưng ba component test kia fail vì `react-native-safe-area-context` là CJS và `require('react-native')` không đi qua ESM loader hook của tôi — việc đó vitest tự xử lý, **không phải lỗi repo**. Kết luận trung thực: **tôi xác minh ba component test đó là test hành vi thật bằng cách đọc code, và xác minh toolchain chạy được; tôi chưa chứng kiến chúng pass.**
>
> **Việc cần làm để khép lại:** dán output `npm test` trên macOS (hoặc một CI run trên `ubuntu-latest`, nơi lockfile đã có `@rolldown/binding-linux-x64-gnu`).

### CI (`.github/workflows/ci.yml`) — 9 step, push-to-main + mọi PR
`npm ci` · `npx expo config --type public` · `typecheck` · `lint -- --max-warnings 0` · `npm test` · `assert:worklets` · `assert:skia` · `assert:privacy-manifest` · `vitest --coverage --coverage.thresholds.lines=40` · `npx expo export --platform web`

**Đây là gate thật.** Hai giới hạn cần biết, không phải finding:
- `expo export --platform web` chạy Metro trên toàn graph app (bắt lỗi resolve, asset thiếu, lỗi worklet plugin) nhưng **resolve theo react-native-web** → không bắt được lỗi import chỉ tồn tại ở native. `--platform all` phủ rộng hơn.
- `expo config --type public` **không** apply config plugin, nên không chứng minh buildability.
- **Không có native build validation** (không `expo prebuild`, không EAS build, không macOS runner). Đây là khoảng trống CI lớn nhất còn lại, và nó là lý do "native runtime" phải là một hạng mục kiểm thử riêng (§4).

---

## 2. Bằng chứng thiết bị thật — **cập nhật 2026-09-22 (owner)**

### `docs/phase8-certification.md` — iOS D-16 filled; Pixel WAIVED
| Hàng | Verdict |
|---|---|
| Pixel 6a run1 / run2 | **WAIVED** — owner: không có Pixel 6a |
| iPhone 16 Pro Instruments (Game Performance, multi Cert WC) | **PASS** — Display ~8.33 ms (120 Hz), Hangs 0; touch OK |
| Substitute Android | **WAIVED** — không dùng |
| D2 Android | **WAIVED** (cùng lý do) |
| D2 iOS / D4 iOS profiling SC-2 | vẫn **PENDING_DEVICE** |
| Soak Pixel | **WAIVED** |
| Soak iPhone | vẫn **PENDING_DEVICE** |

**PLT-03 Android mid-range vẫn không được claim.** iOS D-16 là companion, không thay gfxinfo Pixel.

### `docs/device-gate-results.md` — chỉ có smoke trên dev build
| Hạng mục | Trạng thái thực |
|---|---|
| iOS physical install + render + `worklet tick PASS` (iPhone 16 Pro, iOS 26.6.1) | **PASS** — development build |
| iOS Instruments D-16 Cert WC (2026-09-22) | **PASS** — xem `phase8-certification.md` |
| iOS simulator | PASS (interim), owner waiver — **không phải D-05 evidence** |
| **Android — mọi hàng** | **WAIVED** — không có máy Android / Pixel 6a |
| iOS profiling/release SC-2 (D2/D4) | vẫn mở |
| Sim overlay-only số liệu cũ | `WAIVED (interim)` — không thay Instruments |

### `docs/measurement-methodology.md` — protocol đúng chuẩn, chưa thực thi
Yêu cầu: `gfxinfo framestats` (không phải RN Perf Monitor), profiling build, thiết bị thật (simulator không tính, D-05), ≥30s/run, **≥2 run, lấy run tệ hơn**, pass lock `p50 ≤ 16.7ms` **và** `p95 ≤ 20ms` **hoặc** jank ≤ 5%. **Không có run nào đã chạy.**

### Soak / memory
Bảng Soak Results rỗng. Harness tồn tại (`app/_components/GameHost.tsx`, 100 chu kỳ Title↔Playing + 15 phút liên tục) và nay log timestamp + chuỗi lệnh `adb`, nhưng **không tự thu số liệu** — memory/frame-time phải lấy tay bằng `adb dumpsys meminfo`/`gfxinfo`.

### Gameplay playtest
Không có dữ liệu playtest người thật ở bất kỳ đâu. `08-VERIFICATION.md:37` ghi LVL-04 "Human play ~2–3 min — Plan 06 UAT" — Plan 06 chưa chạy.

**→ Giữ nguyên `PENDING_DEVICE`. Tôi không tạo bất kỳ số liệu nào.**

---

## 3. Gameplay acceptance

### 3.1 Aimed launch (PHYS-05) — **CHƯA ĐÁP ỨNG theo văn bản đã phê duyệt**

`.planning/REQUIREMENTS.md:16`:
> `- [x] **PHYS-05**: On life start, ball is docked to the paddle and player launches with an **aimed release/tap**`

Code (`src/core/rules/serve.ts`, `applyServe`):
```ts
const bi = 0;
world.ballVx[bi] = 0;
world.ballVy[bi] = -serveSpeed;
```
`vx` bị hard-code **0**. `Intent` không có trường góc (grep `aim|angle` trong `src/core/types.ts` → rỗng). `dockBall` còn snap `ballX = paddleX` mỗi step docked nên không thể dùng offset ball làm input ngắm.

**Phần "docked" đạt. Phần "aimed" không tồn tại.** Code **đã trung thực** về điều này (`serve.ts:24-27` ghi "Aimed launch deferred"), nhưng **ledger thì không** — vẫn `[x] Complete`.

Theo chỉ thị "không tự động hạ scope để khiến requirement được đánh dấu PASS", tôi xếp PHYS-05 là **NOT MET**. Đây là **mục duy nhất cần quyết định của owner**, và có hai lựa chọn hợp lệ:
- **(a) Triển khai:** thêm `aimAngle` vào `Intent`, drag-to-aim khi docked, clamp qua `PADDLE_ANGLE_CLAMP_DEG` + hai sàn góc hiện có. Ước lượng nhỏ — hạ tầng clamp đã sẵn.
- **(b) Sửa văn bản requirement** thành "launches with a tap", ghi vào `DEFERRED-ITEMS.md` như đã làm với F-45/LVL-04, rồi đánh Complete một cách trung thực.

**Không được** để nguyên trạng: ledger đang tuyên bố một tính năng không tồn tại.

### 3.2 Paddle responsiveness (PHYS-01) — **PARTIAL, chờ thiết bị**
Relative-drag (không finger-follow) được xác minh: `src/input/usePaddleGesture.ts` dùng `e.translationX` × `camScale`; `computeRelativePaddleX` có 5 unit test + 9 gesture-gate test. Nhưng requirement đòi "**tuned gain and light smoothing on device**" — grep `PHYS-01` trong `phase8-certification.md` và `08-VERIFICATION.md` → **không có hàng device nào**. Phần tuning trên máy thật chưa có bằng chứng.

### 3.3 Deterministic physics — **ĐẠT, bằng automated tests**
- `tests/core.purity.test.ts` (4 test): grep source cấm `Math.random`/`Date.now`/import RN trong `src/core`.
- `tests/physics.golden-replay.test.ts` (3): identical hash.
- `tests/physics.hash-canonical.test.ts` (4): hash canonical (loại `rngCosmetic`, thêm `lives`/`simPhase`, chỉ hash slice event sống).
- `tests/physics.tunneling.prop.test.ts`: property test ở 2× `MAX_BALL_SPEED`, PROP-CLAMP nay assert **cả hai** biên góc.
- Cộng `physics.overlap`, `physics.ball-freeze`, `physics.broadphase`, `physics.tiebreak`, `physics.near-vertical`.

Tôi cũng tự đo lại ở vòng #08: attractor θ=8° đã hết; level-03 với paddle bám tâm nay **WON cả 3 seed**, tier 0.

### 3.4 Thời lượng level-03 (LVL-04) — **PARTIAL, scope đã được owner nới, playtest vẫn thiếu**
`REQUIREMENTS.md:24` nay ghi thẳng: *"level-03 shipped; duration band ~2–3 min deferred — T3.4 accepts ~5–6 min bot / playtest median at ship"*. Đây là một **thay đổi phạm vi được ghi nhận đúng cách** (khác với PHYS-05) và khớp số đo của tôi (bot hoàn hảo: 315–408s).

Cấu trúc ba act được xác minh bằng dữ liệu (Act 1: 33 brick HP1 → plateau → Act 2: 52 brick/115 hit → Act 3: 8 breakable + 10 steel). Còn thiếu: **playtest người thật** cho tiêu chí "first-time player wants to replay it".

---

## 4. Phân loại kiểm thử — bốn tầng, hai tầng còn trống

| Tầng | Số lượng | Trạng thái | Cái gì được bảo vệ |
|---|---|---|---|
| **Unit / logic** (`tests/*.test.ts`, 55 file) | **261 test pass** | ✅ **Mạnh** | Toàn bộ `src/core`: physics, CCD, sàn góc, rules, levels, event ring, hash, vfx, audio mapping, storage, quality tier, substep cap. Property test + golden replay |
| **Component-contract** (`tests/ui/*.test.tsx`, 4 file) | 3 render component thật | ✅ **Mới có, đúng loại** | `HudStrip` (text `Score · 1200` / `Lives · 2` / `×3` / `Stall! · 2`, `getByRole('button', {name:'Pause game'})`, `fireEvent.click` → callback), `CountdownOverlay` (numeral + rerender), `LevelErrorOverlay` (render `ValidationIssue`) |
| **Integration** (mount `PlayingHost`/`GameScreen`) | **0** | ❌ **Trống** | Pause FSM, chuỗi countdown, Android Back, mapping `applyChrome`→`setState`, đường level-load error. `DEFERRED-ITEMS.md` ghi nhận đúng là "Post-MVP for PlayingHost" |
| **Native runtime** (thiết bị) | **0** | ❌ **Trống** | Worklet loop trên UI runtime, Skia render thật, expo-audio thật, AsyncStorage qua app-kill, OS interruption, frame timing |

**Điểm cần nói rõ về giới hạn bản chất:** khi Reanimated bị mock, `useFrameCallback`/`useAnimatedReaction` **không chạy trên UI runtime** — nên integration test (nếu thêm) sẽ **không bao giờ** kiểm chứng được worklet loop. `DEFERRED-ITEMS.md` gọi F-43 là "**component-contract** coverage — not UI-thread or worklet-loop coverage", và đó là cách gọi đúng. Worklet loop chỉ kiểm chứng được **trên thiết bị**.

Bù lại cho tầng đó, dự án có hai kiểm soát tĩnh thật: **worklet-closure guard** (đã kiểm chứng là bắt được lỗi + self-check báo đỏ khi bị làm mù) và **ESLint boundaries matrix** (probe từng rule, 0 vi phạm).

---

## 5. Trạng thái 27 requirements

| Trạng thái | Số | Requirement |
|---|---|---|
| **VERIFIED** (automated đủ cho văn bản requirement) | **14** | PHYS-02, PHYS-03, PHYS-04, PHYS-06, PHYS-07, LVL-01, LVL-02, LVL-03, RUN-01, PWR-01, PWR-02, PWR-03, PLT-04, ARCH-02 |
| **PARTIAL — chờ thiết bị** | **11** | PHYS-01, LVL-04, RUN-02, RUN-03, RUN-04, FX-01, FX-02, FX-03, PLT-01, PLT-02, ARCH-01 |
| **NOT MET** (theo văn bản đã phê duyệt) | **1** | **PHYS-05** (aimed launch) |
| **WAIVED — no Android hardware** | **1** | **PLT-03** Android mid-range (Pixel 6a) — owner waiver 2026-09-22; iOS D-16 PASS does not close this |

### Ghi chú cho từng mục PARTIAL
| ID | Phần đã đạt (automated) | Phần còn thiếu |
|---|---|---|
| PHYS-01 | relative-drag, gate, clamp | "tuned gain / smoothing **on device**" |
| LVL-04 | level-03 ship, 3 act xác minh bằng dữ liệu, band thời lượng **đã được nới có ghi nhận** | playtest người thật (replay intent) |
| RUN-02 | lives/win/lose logic; `CountdownOverlay`/`LevelErrorOverlay` có component test | **`ResultOverlay` + `PauseOverlay` chưa có component test**; presentation trên thiết bị |
| RUN-03 | `runtime.reset-request.test.ts` cover reset helper; F-01 đã sửa | end-to-end Retry trên thiết bị (không có integration test) |
| RUN-04 | singleton store, flush khi background, corrupt-vs-absent | AsyncStorage thật qua **app kill** |
| FX-01 | ring bounded, sàn reduced-motion, clear trail | "readability at maximum speed" — thị giác |
| FX-02 | intensity scalar, hard particle budget, tier | **"never breaks frame budget"** = PLT-03 |
| FX-03 | mapping 7 SFX, batch, dedupe, voice limit | đường `expo-audio` thật (bị force-disable dưới test) |
| PLT-01 | freeze/substep-cap/no-catch-up, Android Back | OS interruption / lock / cuộc gọi trên thiết bị |
| PLT-02 | letterbox `min(w/360,h/640)`, safe-area inset | bằng chứng nhiều kích thước màn hình |
| ARCH-01 | boundaries lint + purity test + worklet guard | waiver hardware Phase 1 (D2/D4) chưa discharge |

**PLT-04 đạt theo đúng văn bản** ("baseline is **prepared**"): privacy policy live + email (tôi verify bằng nội dung), Data Safety documented, age rating documented, iOS manifest được assert theo nội dung. Việc **nhập vào console** là bước submit, không thuộc văn bản requirement này.

---

## 6. Finding còn mở — đối chiếu code hiện tại

Tôi kiểm tra từng mục, **không mở lại finding đã FIXED**:

| ID | Trạng thái | Bằng chứng hiện tại | Chặn gì |
|---|---|---|---|
| **NJ-3** support contact | **✅ CLOSED** (mới) | Live page có `dexter@lkfnb.com` "no GitHub account required"; `SECURITY.md:13`; `HOSTING.md` grep đúng email | — |
| **WP-6** device rows | **PARTIAL** | iOS D-16 PASS; Pixel/Android WAIVED; soak iOS + D2/D4 iOS still open | public release |
| **D2 / D4** | **OPEN** | Hàng riêng đã tồn tại, giá trị PENDING | public release |
| **F-21** ledger PHYS-05 | **OPEN** | `REQUIREMENTS.md:16` vẫn `[x]` "aimed release/tap" | **external testing** |
| **NK-6** test scratch | **PARTIAL** | Grep lại: không code nào gán `scratchVel`/`scratchSweep` → `toBe` không thể fail | — (chất lượng) |
| **F-03** gate quy trình | **OPEN** | PLAN-CHECK **2/8**, REVIEW **3/8**, `01-PATTERNS.md` **thiếu**, `nyquist_compliant: false` ×**5**, sign-off trống ở `03`/`04-VALIDATION.md` | Phase 8 close |
| **F-29** `CLIFF_RAMP` | **OPEN** | 0 consumer ngoài `devflags.ts` | — |
| **F-40** SFX provenance | **OPEN** | `assets/sfx/README.md:18-19` tool chain "undocumented", license "confirm … before submit" | public release |
| **F-59** status Skia | **OPEN** | `skia-version-decision.md:6` vẫn `Confirmed` dù `:20` đòi "both platforms … physical devices" | — (tài liệu) |
| **NF-15** eslint override | **OPEN** | `eslint.config.js:115` (`eventBridge.ts`), `:123` (`PlayingHost.tsx`) vẫn miễn rule | — |
| **NG-20** 360/640 | **PARTIAL** | 3 định nghĩa độc lập, ~10 site inline chưa cover bởi parity test | — |
| **Trademark** | **DEFERRED** | Owner/legal | public release |
| F-23 / F-45 / NF-18f / F-43 / D13 | **SUPERSEDED / DEFERRED / ACCEPTED / PARTIAL / CLOSED** | Đã ghi nhận đúng trong `DEFERRED-ITEMS.md` | — |

**Không phát hiện finding mới.** Không có bằng chứng regression nào cho các mục đã FIXED.

---

## 7. Trả lời sáu câu hỏi acceptance

### 7.1 MVP đã đáp ứng các requirement được phê duyệt chưa?
**Chưa — 25/27 đạt hoặc đạt-một-phần, 1 chưa đạt, 1 bị chặn bởi hardware.**
- 14 requirement đạt hoàn toàn bằng automated tests.
- 11 requirement đạt phần logic, còn phần cần thiết bị.
- **PHYS-05 chưa đạt theo văn bản đã phê duyệt** — cần quyết định của owner (triển khai hoặc sửa văn bản).
- **PLT-03 Android mid-range** — **WAIVED / unproven** (no Pixel 6a, 2026-09-22). iOS D-16 companion **PASS** (Instruments).

### 7.2 Những tiêu chí nào đã được xác minh bằng automated tests?
Toàn bộ tầng simulation: fixed timestep, swept CCD không tunneling ở 2× max speed, depenetration, hai sàn góc (dọc **và** ngang), deterministic replay + hash canonical, no-RNG/no-clock purity, event ring clear policy, scoring/combo, multi-ball + last-ball life, pickup catch-only + expand, anti-stall escalation, level schema/validate/compile fail-closed, victory chỉ tính breakable, quality tier, substep cap, trail/particle/shake budget, audio mapping + dedupe + release, personal-best parse/compare, platform seams. Cộng **3 component-contract test** cho HudStrip / CountdownOverlay / LevelErrorOverlay. Cộng hai kiểm soát tĩnh: worklet-closure guard (đã kiểm chứng bắt được lỗi) và ESLint boundaries matrix.

### 7.3 Những tiêu chí nào đã được xác minh trên thiết bị thật?
**iOS physical (iPhone 16 Pro, iOS 26.6.1, A18 Pro):**
- Install + render + worklet tick (dev-client) — `device-gate-results.md`
- **D-16 Instruments Game Performance** — Cert WC multi-arm; Display ~**8.33 ms** (120 Hz); **Hangs 0**; touch OK — `phase8-certification.md` **PASS**
- **Release sideload** — JS bundled; chơi không cần Metro/cáp (2026-09-22 evening)

**Android:** **WAIVED** — không có máy (Pixel 6a / substitute). **Không claim PLT-03.**

**Chưa có:** soak 100+15 min; D2/D4 formal profiling/release SC-2; human LVL-04 playtest cohort; Android smoke.

### 7.4 Còn blocker nào trước external testing?
**Hai mục cứng:**
1. **PHYS-05** — quyết định phạm vi (triển khai aimed launch hoặc sửa văn bản requirement). Ledger hiện tuyên bố một tính năng không tồn tại.
2. **Android smoke** (nếu tester Android) — app chưa từng chạy trên Android; owner đã waive Pixel cert, nhưng smoke trên bất kỳ máy Android nào vẫn khuyến nghị trước Play internal track.

*Không* phải blocker cho **iOS internal playtest:** privacy + email, gate tự động, iOS D-16, Release sideload.

### 7.5 Còn blocker nào trước public release?
1. **PLT-03 Android** — **WAIVED** cho đến khi có mid-range Android; đừng tick Complete.
2. **iOS soak** — 100 Title↔Playing + 15 min; mem/frame start/end (chưa chạy).
3. **D2 / D4 iOS** — SC-2 trên profiling/release formal (dev-client D-16 ≠ discharge).
4. **LVL-04 playtest** — cohort người chơi lần đầu.
5. **F-40** SFX provenance + **trademark** opinion.
6. **Console** Data Safety / age rating submit.
7. **Phase 8 close** — `08-VERIFICATION.md` vẫn stub cho đến khi soak + (optional) Android trả nợ hoặc owner chấp nhận WAIVE công khai trong verification.
8. Commit các fix chưa push: glow dispose handshake, native-module probes.

### 7.6 Có cần thêm remediation không?
**Về code: gần như không.** Chỉ **một** mục có thể cần code — PHYS-05, và chỉ nếu owner chọn phương án (a).

Các mục chất lượng còn lại (**NK-6** test tautology, **F-29** `CLIFF_RAMP` chết, **NF-15** override eslint, **NG-20** hằng trùng lặp, **F-03** gate quy trình, **F-59** status doc) đều **nhỏ, độc lập, không chặn nhau và không chặn release**. Nên gom thành **một** đợt dọn dẹp rồi đóng sổ, không cần một vòng remediation riêng.

**Việc còn lại chủ yếu không phải lập trình:** mang máy ra đo, chơi thử, nhập giấy tờ vào console.

---

## 8. Khuyến nghị thứ tự thực thi

**Đợt A — trước external testing (không cần hardware certification)**
1. Owner quyết PHYS-05: triển khai `aimAngle`, **hoặc** sửa văn bản requirement + ghi vào `DEFERRED-ITEMS.md`.
2. Cài build lên **một** máy Android bất kỳ: xác nhận install / render / không crash / Back hoạt động. Ghi vào `device-gate-results.md`.
3. Nhập Data Safety + age rating vào Play Console và App Store Connect.
4. Dán output `npm test` (macOS hoặc CI) vào `08-VALIDATION.md` để khép lại phần component test.

**Đợt B — một lượt dọn dẹp (song song, không chặn)**
5. NK-6 (thay tautology bằng test sàn-góc-qua-scratch), F-29, NF-15, NG-20, F-59, F-03 (hoặc viết waiver tường minh cho các gate quy trình).

**Đợt C — hardware, đóng MVP**
6. (Tuỳ chọn) Soak iOS: `EXPO_PUBLIC_SOAK=1` + mem/frame đầu-cuối.
7. Khi có Android mid-range: certification theo protocol → điền lại hàng Pixel (bỏ WAIVED) trước khi claim PLT-03.
8. Discharge D2/D4 iOS trên profiling/release formal (D-16 dev-client chưa đủ).
9. LVL-04 playtest ≥5 người.
10. F-40 provenance + trademark opinion.
11. Commit + push fix glow dispose / native probes + docs Phase 8.
12. Tạo `08-06-SUMMARY.md`, chuyển `08-VERIFICATION.md` sang verified (với Pixel WAIVE tường minh nếu vẫn không có Android). **Không tick PLT-03 Complete** khi chỉ có iOS D-16.

---

## 9. Ghi nhận về chất lượng quy trình

Qua **tám vòng audit** và bảy đợt remediation, điều nhất quán nhất và đáng ghi nhận nhất: **không một số liệu nào bị bịa ra.** Mọi chỗ thiếu bằng chứng đều được ghi `PENDING_DEVICE`, "Not obtained", "fill before store submit", hoặc một stub `not_verified` tự tuyên bố không verify — thay vì được tô xanh. Các retraction chủ động (PLT-03 revert về Pending, SC-5 Phase 7 hạ xuống NOT MET, bốn `requirements-completed` bị xóa) là hành vi đúng và là lý do chuỗi audit này hội tụ được thay vì trượt.

Hai kiểm soát cơ học được dựng ở vòng #06-#07 — worklet-closure guard **tự kiểm chứng được** và CI 9 step — là thứ sẽ giữ cho chất lượng không trượt lại sau khi audit kết thúc. Đó là kết quả bền hơn bất kỳ fix đơn lẻ nào.

**Một điểm cuối cùng, quan trọng:** giờ mới là lúc đo có ý nghĩa. Sáu vòng trước thì không — `injectCertWorstCase` chưa inject được gì (F-01), perf overlay chưa vẽ được (F-29/NG-13), hot path còn chạy O(brickCount) (NJ-2), allocation/frame còn ~970 (F-17). Mọi điều kiện tiên quyết về code cho một phép đo trung thực nay đã đóng.
