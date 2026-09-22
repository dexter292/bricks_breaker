# RE-AUDIT #02 — sau đợt remediation

**Ngày:** 2026-09-22
**Baseline:** audit #01 (2026-09-21, commit `682056a`) — 63 finding F-01…F-63, xem [CODE-REVIEW.md](./CODE-REVIEW.md)
**Đối tượng:** commit HEAD `215873e` **+ working tree chưa commit** (xem §0 — điều này quan trọng)
**Tính chất:** read-only. Không file nào trong repository bị sửa trong đợt kiểm định này.

---

## 0. Cảnh báo đầu tiên: trạng thái đang kiểm định **không nằm trong git**

`git status` cho thấy 48 file modified/deleted và 13 file untracked. Những file **untracked hoặc chỉ tồn tại trong working tree** bao gồm:

| File | Trạng thái | Hệ quả |
|---|---|---|
| `app.config.js` | **untracked** | Cấu hình app (identity, icon, plugin, **privacyManifests**, gate `expo-dev-client`) **không tồn tại trong bất kỳ commit nào** |
| `app.json` | **deleted chỉ trong working tree** | Một `git checkout HEAD` sạch sẽ có `app.json` cũ và **không có** `app.config.js` |
| `docs/store/privacy-policy.{md,html}` | modified, chưa commit | Bản live trên GitHub Pages (serve từ `main:/docs`) vẫn là **bản cũ** |
| `.planning/.../08-VERIFICATION.md`, `08-REVIEW.md` | **untracked** | Waiver trung thực của Phase 8 không phải là hồ sơ dự án |
| `docs/audit/DEFERRED-ITEMS.md`, `assets/sfx/README.md` | **untracked** | — |
| 8 file test mới | **untracked** | — |

**Hai hệ quả cụ thể, đã kiểm chứng:**

1. **Bản privacy policy đang live vẫn không có kênh liên hệ hoạt động.** Audit đã fetch trực tiếp `https://dexter292.github.io/bricks_breaker/store/privacy-policy.html`: phần Contact vẫn là *"via the project's public repository issues (when published) or the developer contact listed on the store listing when one exists"*. Bản local đã có URL issues thật (`docs/store/privacy-policy.html:78-84`) nhưng **chưa được commit/push**. `08-VALIDATION.md:88` dùng `curl … 200` làm bằng chứng — 200 chứng minh *reachability*, không chứng minh *nội dung*.
2. **Một checkout sạch không build được.** Không có `app.config.js` và `app.json` đã bị xóa khỏi working tree — nghĩa là cả fix F-42 (gate `expo-dev-client`) và fix F-39 (`privacyManifests` có nội dung) đều **không có trong lịch sử git**.

→ Việc đầu tiên cần làm, trước mọi việc khác: **commit và push**. Sau đó xác minh bản live bằng *nội dung*, không bằng status code (`curl -fsS $URL | grep -F 'issues'`).

---

## 1. Kết quả gate tự động (audit tự chạy, 2026-09-22)

| Lệnh | Audit #01 | Re-audit #02 | |
|---|---|---|---|
| `npx tsc --noEmit` | **FAIL — 6 lỗi** | **PASS — 0 lỗi** | ✅ Và không có `@ts-ignore`/`as any`/`: any` nào được thêm để đạt (đã grep `src`+`app`: zero) |
| `npx eslint .` (nhóm `import/*` tắt do native binding) | 6 error + 7 warning | **0 error + 5 warning** | ✅ Chỉ còn `freeze.ts:14 no-redeclare` và 4 `import/first` |
| ESLint `boundaries/*` | 0 vi phạm | **0 vi phạm** | ✅ |
| `node scripts/assert-skia-version.mjs` | PASS | **PASS** | |
| `node scripts/assert-privacy-manifest.mjs` | PASS (chỉ kiểm tra key tồn tại) | **PASS + 2 WARN** | Nay kiểm tra **nội dung**; WARN về drift của `PrivacyInfo.xcprivacy` đã prebuild |
| Unit test suite | 179 pass / 0 fail | **245 pass / 1 fail** (53 file) | ❌ **Suite ĐỎ** — xem NF-4 |

> **Runner:** `npx vitest run` vẫn không chạy được trong môi trường audit (`node_modules` build cho macOS/arm64; `rolldown` thiếu native binding Linux; registry npm bị chặn). Audit dùng lại phương pháp của đợt #01: copy `src/`+`tests/`+`assets/`+`app/` ra thư mục scratch **ngoài repository**, chạy 53 file test bằng Node 22 `--experimental-strip-types` với shim `vitest`/`@fast-check/vitest`. **Không file nào trong repo bị sửa.** Đây là thực thi thật nhưng không phải output vitest chính thức — cần chạy `npm test` trên macOS để có bằng chứng chính thức. Ba failure ban đầu có 2 cái là do harness chưa copy `app/`; sau khi copy còn lại **đúng 1 failure thật**.

---

## 2. Tổng hợp verdict cho 63 finding của audit #01

| Verdict | Số lượng | ID |
|---|---|---|
| **FIXED** | **33** | F-01, F-02, F-04, F-06, F-08, F-09, F-10, F-11, F-13, F-14, F-15, F-17, F-18, F-19, F-22, F-23, F-28, F-30, F-31, F-32, F-33, F-34, F-35, F-41, F-44, F-46, F-47, F-48, F-50, F-58, F-60, F-61, F-62 |
| **PARTIALLY FIXED** | **22** | F-05, F-07, F-12, F-16, F-20, F-21, F-24, F-25, F-26, F-29, F-36, F-37, F-38, F-39, F-42, F-43, F-45, F-53, F-54, F-56, F-57, F-63 |
| **NOT FIXED** | **7** | F-03, F-27, F-40, F-49, F-52, F-55, F-59 |
| **REGRESSION** | **1** | F-51 → NF-1 (Critical) |

**Cả 5 finding Critical của đợt #01 đều đã đóng:** F-01 (retry mutate clone), F-04 (PLT-03 over-claim), F-05 (một phần — xem dưới), F-06 (SUMMARY over-claim), F-07 (một phần). Đây là kết quả tốt và đáng ghi nhận — đặc biệt F-01, vốn là lỗi khó nhất.

**Chất lượng đáng ghi nhận nhất** là các retraction trung thực: `REQUIREMENTS.md:50` revert PLT-03 về `Pending`; bốn `08-*-SUMMARY.md` đổi `requirements-completed` thành `[]`; `07-VERIFICATION.md:30` hạ SC-5 xuống `✗ NOT MET (pending device)` kèm câu "Procedure ≠ measurement"; và `08-VERIFICATION.md` là một stub **tự tuyên bố không verify** (`status: not_verified`, `:19` "does not claim phase completion or invent measurements"). Không có số liệu nào bị bịa ra. Đó chính là hành vi đúng.

### 2.1 Chi tiết các mục NOT FIXED

| ID | Vấn đề | Bằng chứng hiện tại |
|---|---|---|
| **F-27** | Anti-stall không có escalation sau tier 3 | `src/core/rules/stall.ts:239-244` vẫn là one-shot `prevTier`. **Nay đã đo được hậu quả** → NF-2 |
| **F-49** | Nhánh `LOST` không clear pickup/effect | `src/core/rules/lives.ts:51-54` — byte-identical với bản đã audit |
| **F-52** | `applyDropsFromBreaks`/`stepPickups` thiếu guard PLAYING | `grep -n simPhase src/core/rules/pickups.ts` → **zero match** |
| **F-03** | Gate quy trình bị bỏ qua | PLAN-CHECK **2/8**, REVIEW 3/8 (và `08-REVIEW.md:4` = `WAIVED-PENDING`), `01-PATTERNS.md` vẫn vắng, `nyquist_compliant: false` ở `05/06/08-VALIDATION.md:5`, sign-off `08-VALIDATION.md:102-103` vẫn trống |
| **F-40** | Attestation originality bị cây file phản bác | Asset template đã xóa ✅ — nhưng `assets/expo.icon/` **vẫn được track** và `app.config.js:20` trỏ `ios.icon` vào đó → NF-5 |
| **F-55** | Policy không có kênh liên hệ | Đã sửa trong repo, **chưa lên bản live** → §0 |
| **F-59** | `skia-version-decision.md` ghi "Confirmed" trái tiêu chí của chính nó | `git diff --stat docs/skia-version-decision.md` → **rỗng**, file chưa được chạm tới |

---

## 3. Finding mới — 18 mục (NF-1 … NF-18)

### NF-1 — **CRITICAL** — `remainderAfterSubstepCap` không phải worklet nhưng được gọi từ frame-callback worklet

**Nhãn:** Confirmed defect · **REGRESSION do chính fix F-51 tạo ra**
**File:** `src/runtime/substepCap.ts:6-20` (định nghĩa) · `src/runtime/useGameLoop.ts:400-407` (call site, nằm trong worklet mở ở `:291-292`)

```ts
// substepCap.ts:6 — không có 'worklet' ở bất kỳ đâu trong file
export function remainderAfterSubstepCap(
  accumulatorAfterLoop: number, stepsTaken: number, maxSubsteps: number, fixedDt: number,
): number {
```

**Xác minh trực tiếp bằng Babel config của chính dự án** (audit tự chạy):
```
babel src/runtime/substepCap.ts   → số lần xuất hiện __workletHash: 0
babel src/runtime/useGameLoop.ts  → captured in a __closure? true
                                     (remainderAfterSubstepCap: _substepCap.remainderAfterSubstepCap)
```
Và quét toàn bộ `src/`+`app/` bằng Babel: **đây là hàm duy nhất** bị capture vào một worklet closure mà không có directive. Census `grep -c "'worklet'"`:
```
src/runtime/substepCap.ts    0      ← duy nhất
src/runtime/freeze.ts        4
src/runtime/metrics.ts       5
src/runtime/worldRequests.ts 5
src/core/stepRun.ts          1
src/render/recordSprites.ts  6      (… mọi helper khác đều có)
```

**Impact:** hàm không-worklet bị serialize thành *remote function*; gọi đồng bộ trên UI runtime sẽ **throw**. `FrameCallbackRegistryUI.js:19-46` không có try/catch và `requestAnimationFrame(loop)` nằm **sau** lời gọi callback — nên throw vừa gây uncaught error trên UI runtime, vừa **dừng vĩnh viễn game loop** cho tới khi có một chu kỳ `setActive(false)`→`setActive(true)`.

**Điều kiện kích hoạt:** nhánh `if (steps === maxSubsteps)` — tức **bất kỳ frame nào ≥ `5 × 1/120` = 41,7 ms**. Nghĩa là: frame đầu compile shader Skia, một lần GC pause, hoặc **chính cảnh worst-case của Phase 8 certification** (`applyCertWorstCaseInject` đặt ≥3 ball + ~124 particle lên board 103 brick).

Đây là lỗi thuộc đúng loại mà `.planning/debug/ball-freeze-on-contact.md:12` đã mất một chu kỳ debug để truy ("device needs worklet-safe CCD") và **không một test Node nào thấy được** — `tests/runtime.substep-cap.test.ts` gọi hàm trực tiếp trong Node nên mãi mãi xanh.

**Fix:** thêm `'worklet';` làm câu lệnh đầu tiên của `remainderAfterSubstepCap`. **Một dòng.** Hàm vẫn test được như cũ.
**Fix kèm theo (quan trọng hơn):** thêm một guard CI quét mọi hàm bị capture trong worklet closure và assert nó có `__workletHash` — script ~40 dòng, đã bắt được lỗi này.

---

### NF-2 — **HIGH** — PHYS-04 thiếu hoàn toàn nửa "near-vertical"; hệ quả là một **soft-lock vĩnh viễn đã đo được**

**Nhãn:** Confirmed defect, có số đo · **tồn tại trước đợt remediation — audit #01 đã đánh giá nhẹ tay mục này**
**File:** `src/core/physics/resolve.ts` (`resolvePaddleEnglishInto`) · `src/core/constants.ts:35,44` · `src/core/rules/stall.ts:239-244` · yêu cầu: `.planning/REQUIREMENTS.md:15`

PHYS-04 (`REQUIREMENTS.md:15`, đánh `[x]`, traceability `:105` = `Complete`) yêu cầu:
> "clamps that avoid near-horizontal **and near-vertical** degenerate trajectories"

Code chỉ enforce **sàn |vy|** (chống near-horizontal):
```ts
const minVert = Math.cos(clampRad);           // = cos(62°) ≈ 0.469
const absVyRatio = Math.abs(ovy) / speed;
if (absVyRatio < minVert) { … }               // chỉ có sàn dọc
```
Grep toàn `src/` cho `MIN_HORIZONTAL|maxVertical|tooVertical|nearVertical` → **zero match**. Không tồn tại ràng buộc "quá dọc".

Nghiêm trọng hơn, paddle english làm `vx = 0` **chính xác** khi bóng chạm giữa paddle: `t = (ballX − paddleCx)/half = 0` → `angle = 0` → `ovx = sin(0) × speed = 0`.

**Số đo (harness headless, `stepRun` không sửa, level-03, paddle bám đúng tâm bóng):**
```
t=0    x=180 vx=0.00 vy=-360.0 tier=0 idle=1     score=0
t=75   x=180 vx=0.00 vy=+360.0 tier=1 idle=1111  score=1490
t=100  x=180 vx=0.00 vy=+388.8 tier=3 idle=4111  score=1490
t=200  x=180 vx=0.00 vy=+388.8 tier=3 idle=16111 score=1490
t=300  x=180 vx=0.00 vy=+388.8 tier=3 idle=28110 score=1490   ← 234 giây idle
|vx|/speed < 0.02 ở 12000/12000 step = 100,0%
```
Cơ chế vòng lặp kín: bóng bay thẳng lên → chạm brick (axis-only flip chỉ đảo `vy`) → rơi thẳng xuống → chạm giữa paddle → english cưỡng chế `vx = 0` **chính xác** → lặp lại. Anti-stall tier 2 chỉ nhân tốc độ ×1,08 (bảo toàn hướng, `vx` vẫn 0); tier 3 xoay góc **một lần duy nhất** rồi lần chạm paddle kế tiếp xóa sạch; và vì `prevTier` là one-shot (**F-27**) nên **không bao giờ có can thiệp nào nữa**.

Chạy đối chứng trên core cũ (`git archive 682056a`, cùng bot, cùng seed): cũng TIMEOUT (38/93 brick) — nên **đây không phải regression**, mà là lỗi tồn tại từ trước mà audit #01 chỉ xếp "Medium / potential risk". Bản mới clear **ít hơn** (15/93 so với 38/93) trong cùng kịch bản.

**Impact:** một trạng thái kẹt **không thoát ra được**, đạt tới bằng một hành vi hoàn toàn tự nhiên của người chơi — giữ paddle ngay dưới bóng. HUD hiện `Stall! · 3` vô hạn, điểm đóng băng, người chơi không mất mạng nên không có đường thoát nào ngoài Retry/Menu. Trực tiếp phủ định PHYS-04 đang được đánh `Complete`.

**Fix:** (a) thêm **sàn |vx|** (chống near-vertical) trong `resolvePaddleEnglishInto` và sau mọi reflect — ví dụ ép `|vx|/speed ≥ sin(8°)` với dấu suy ra từ `t` (hoặc từ `rngGameplay` nếu `t = 0`, vẫn deterministic); (b) đóng **F-27** bằng một tier 4 lặp lại thay vì one-shot; (c) thêm property test: sau mọi `PADDLE_HIT`, `|vx|/speed ≥ MIN_HORIZONTAL_RATIO`.

---

### NF-3 — **HIGH** — Fix của F-39/F-42/F-55 chỉ tồn tại trong working tree
Xem §0. `app.config.js` untracked; `app.json` deleted chỉ trong working tree; privacy policy đã sửa nhưng chưa push nên **bản live vẫn thiếu kênh liên hệ**. `08-VERIFICATION.md`/`08-REVIEW.md` — hai artifact trung thực nhất của đợt này — cũng untracked.
**Fix:** commit + push; sau đó verify bản live bằng nội dung, không bằng status code.

### NF-4 — **HIGH** — `npm test` đang ĐỎ, và hai tài liệu tuyên bố nó xanh
**File:** `tests/physics.level03-serve.test.ts:58-76` · `.planning/PROJECT.md:20,127` · `08-VALIDATION.md:63,65`

```ts
expect(compiled.pitchY - compiled.h[0]).toBeGreaterThanOrEqual(2 * BALL_RADIUS - 1e-6);
expect(compiled.pitchX - compiled.w[0]).toBeGreaterThanOrEqual(2 * BALL_RADIUS - 1e-6);
```
level-03 có `brickH 14 / gapY 2 / brickW 32 / gapX 4`; `compile.ts` cho `pitchY = 16`, `pitchX = 36`; `BALL_RADIUS = 6`. Vậy hai assert này là `2 >= 11.999999` và `4 >= 11.999999` — **luôn fail**. Cộng dòng `:76` (`gapYMin = 2`) là ba assert fail trong một `it`.

**Tiền đề của test là SAI.** Swept circle-vs-AABB CCD **không** đòi khe giữa brick ≥ đường kính bóng: các AABB đã mở rộng bán kính chồng nhau là vô hại, `step.ts` giữ TOI nhỏ nhất nên một bức tường brick liền khối hành xử đúng như một AABB lớn. Tường liền khối là ca *dễ*, không phải ca khó. Chính repo cũng tự phủ định tiền đề đó: `tests/physics.ball-freeze.test.ts:187-249` có tiêu đề *"dense 2×3 steel (gapY=2, gapX=4): escapes cluster"* và `:251-320` chạy 600 step trên chính level-03 không sửa — hai test trong cùng suite khẳng định hai hợp đồng loại trừ nhau.

Điều kiện `2r` chỉ xuất hiện trong các đường *sửa lỗi* (`depenetrateCircleAabb` đẩy tâm ra `radius + eps` theo pháp tuyến của **một** brick, nên nếu brick kế cận gần hơn `2r` thì cú đẩy đưa tâm vào trong brick đó) — đó là khiếm khuyết của **chiến lược sửa**, không phải thuộc tính của CCD. `.planning/debug/ball-freeze-on-contact.md:36,49` cho thấy đã từng thử sửa level-03 thành `gapY=12/gapX=8` và bản sửa đó đã mất. **Nó cũng không khả thi:** với `cols 10, originX 2, brickW 32`, `gapX=12` → chiều rộng `2 + 320 + 108 = 430` và `gapX=8` → `394`, đều **vượt playfield 360**; và `src/core/levels/validate.ts` **không có** kiểm tra bounds 360×640 (grep `360|640|bounds` → zero match), nên "bản sửa" đó sẽ âm thầm tạo brick nằm ngoài màn hình.

**Tuyên bố sai kèm theo:** `PROJECT.md:20` đổi thành "**~239 green** as of 2026-09-21"; `08-VALIDATION.md:63` ghi "`npm test` **179/179** ✅". Thực tế audit đo được **245 pass / 1 fail trên 53 file**. Ba con số không khớp nhau và không con nào đúng.

**Fix:** xóa các assert khe hở (`:58-63`, `:64-76`); **giữ** `:79-143` (soak 3000 frame serve) vì đó là test tính chất thật. **Không sửa level-03.** Thay vào đó sửa `depenetrateCircleAabb` để cú đẩy không đưa tâm vào brick khác. Tùy chọn: thêm rule bounds vào `validate.ts` để một lần sửa gap trong tương lai fail lớn tiếng thay vì tạo brick ngoài màn.

### NF-5 — **HIGH** — Icon iOS đang ship là logo Expo, trái với attestation originality
**File:** `app.config.js:20` (`ios: { icon: './assets/expo.icon' }`) · `assets/expo.icon/Assets/expo-symbol 2.svg` · `assets/expo.icon/icon.json:3` (gradient xanh Expo) · `docs/store/originality-attestation.md:13`

Asset template đã được xóa đúng (`expo-logo.png`, `tabIcons/*`) nhưng `assets/expo.icon/` **vẫn được git track** (`git ls-files assets/expo.icon` → 3 file) và là bundle Icon Composer mặc định của Expo. Bất đối xứng đáng chú ý: `android.adaptiveIcon` (`:53-58`) và `icon` top-level (`:15`) đều dùng art của dự án — **chỉ icon iOS** còn trỏ vào mark của Expo. Nghĩa là F-40 không đóng, mà mâu thuẫn chỉ *di chuyển* từ file không dùng sang **asset store dễ thấy nhất**.
**Fix:** trỏ `ios.icon` vào art của dự án (hoặc xóa `assets/expo.icon` để `icon` áp dụng), rồi verify lại attestation bằng `git ls-files assets/`.

### NF-6 — **MEDIUM** — Glow `SkImage` bị dispose trước khi frame callback được unregister
**File:** `app/_components/PlayingHost.tsx:209` (khai báo effect), `:232`, `:249-256` (cleanup) · `src/runtime/useGameLoop.ts:456` → `src/render/recordSprites.ts:287`

React chạy cleanup theo thứ tự khai báo. Effect bake/preload khai báo ở `:209`, còn `useGameLoop` (và effect register của `useFrameCallback`) chỉ được tạo ở `:283` → **ảnh bị release khi frame callback trên UI thread vẫn đang đăng ký và vẫn đọc `glowAtlas.value` để `drawImageRect(img, …)`**. Thêm nữa `glowAtlasSv.value = null` đi qua guest setter → `scheduleOnUI`, tức **bất đồng bộ**. Cùng cửa sổ lỗi ở `:232` (dispose atlas cũ trước khi bake lại khi đổi level) — và ở đó `fxReady` **không bao giờ** được set lại `false` (chỉ có set `true` ở `:247`) nên effect gate `:299-316` không tạm dừng loop khi đổi level. Đây cũng đúng là đường mà soak harness 100 chu kỳ Title↔Playing sẽ nện liên tục.
**Fix:** `setActive(false)` trước khi dispose; hoặc null SV **trước** rồi dispose bên trong `scheduleOnUI`; hoặc hoist atlas thành singleton module-level. Và thêm `setFxReady(false)` ở đầu effect bake.

### NF-7 — **MEDIUM** — Fix F-16 ghi `(0,0)` vào trail ring → bóng ma ở gốc playfield
**File:** `src/vfx/trails.ts:36-39` · `src/runtime/worldRequests.ts:65-70` · `src/render/recordSprites.ts:405-415`

`clearTrailBall` zero các sample, nhưng renderer vẽ **mọi** slot của ring mà không có sentinel "chưa ghi". Sau `clearTrailsFromIndex(vfx, 0)` (`useGameLoop.ts:389`, bắn mỗi khi `activeBallCount` giảm) hoặc sau Retry, sample kế tiếp chỉ ghi 1 slot → **4 circle trắng r=6 tại toạ độ logic (0,0)** ở alpha 0,15…0,45 trong ~5 frame, cộng viền cyan nếu slot mới nhất là slot zero. Artifact cũ chỉ xảy ra ở cold start; bản fix biến nó thành **thường trực mỗi lần mất bóng và mỗi lần Retry**. Chính khuyến nghị của audit #01 đã tránh được điều này ("seed mọi sample của ring mới-được-chiếm bằng vị trí hiện tại của ball").
**Fix:** seed toàn bộ `TRAIL_MAX` sample bằng vị trí hiện tại của bóng, hoặc giữ một `trailFilled` per-ball và clamp vòng vẽ theo nó.

### NF-8 — **MEDIUM** — Chrome pack cấp object mới mỗi frame → reaction nay thức mỗi frame (regression phía UI thread)
**File:** `src/runtime/useGameLoop.ts:436-442` · `app/_components/PlayingHost.tsx:382-405`

Chuỗi đã xác minh trong source thư viện: `valueSetter.js:53-57` short-circuit bằng `===`; với object mới mỗi frame thì `===` luôn false → `_value` luôn được gán → `mutables.js:74-83` gọi listener → `mappers.js:175-184` set `dirty` → reaction chạy. Vậy mapper chrome nay chạy **mỗi frame**, trước đây 5 mirror scalar short-circuit và để nó ngủ.

**Nhưng mục tiêu thật của F-25 đã đạt:** diff thủ công ở `PlayingHost.tsx:388-395` gate `runOnJS`, nên JS thread chỉ nhận **tối đa một** hop mỗi lần HUD thực sự đổi, thay cho 3-4 React render mỗi frame. Và chính diff đó là thứ ngăn triệu chứng F-01 cũ tái xuất: nếu một frame `LOST` chạy trước khi reset request kịp, `chromeOut` bị ghi lại cùng giá trị → `next === prev` → không `runOnJS` → **result overlay không nháy trở lại**.

Net: **sửa được phía JS, regress phía UI** — 2 allocation + một mapper wake mỗi frame (~120 alloc/s), vĩnh viễn.
**Fix:** giữ một `ChromeMirror` cấp một lần (như `intentScratch`) và mutate field, rồi bump **một scalar** `chromeSeq` *chỉ khi* có field thực sự đổi, và drive reaction theo `chromeSeq`.

### NF-9 — **MEDIUM** — Brick resolve là "đảo dấu theo trục trội", không phải phản xạ; kèm hai cơ chế bù
**File:** `src/core/step.ts:739-745` (resolve), `:797` (`remaining = 0`), `:813-844` (nuclear unstick), `:230-331` (cluster eject)

```ts
if (Math.abs(nx) >= Math.abs(ny)) { if (vx * nx < 0) { vx = -vx; } }
else if (vy * ny < 0) { vy = -vy; }
```
`sweep.ts` chỉ bảo đảm `d·n < 0` (tổng), nên **trục trội một mình có thể đã đang tách rời** → khối này không đổi gì cả. Kết hợp `remaining = 0` (bỏ phần còn lại của timestep ở **mọi** cú chạm brick), kết quả là một step gần như không dịch chuyển, rồi "nuclear unstick" (`:813-844`) **đảo ngược velocity và teleport 3px**.

**Nhưng số đo cho thấy mức độ nhẹ hơn nhiều so với suy luận thuần:** 11 run × 100 giây mô phỏng trên level-01/level-03 với bot bám bóng + offset luân phiên:
```
pinSteps (disp < 0.01 & speed > 1)     = 0   ở mọi run   → unstick KHÔNG bao giờ bắn
teleportSteps (disp > speed·dt + 0.5)  = 0   ở mọi run
effSpeed / 360                         = 0,995 … 1,175   → remaining=0 KHÔNG làm chậm bóng
```
Và A/B với core cũ (`git archive 682056a`, cùng bot/seed) cho thời gian clear level-03 **không xấu hơn** một cách hệ thống: cũ `497/309/309/288 s` so với mới `321/381/289/316 s` (trung bình 351 → 327 s). Comment trong code (`:734-736`) nói rõ đây là workaround có chủ đích cho một triệu chứng trên device.

Vậy severity là **Medium (nợ kỹ thuật), không phải High (lỗi gameplay)**: nó chưa gây hại đo được, nhưng nó là vật lý không đúng, nó khiến hai khối bù (~120 dòng code mới rủi ro nhất trong diff) trở thành bắt buộc, và nó là lý do `enforceMinVerticalRatio` tạo ra một "angle attractor" ở đúng 62° — làm tăng, không giảm, xác suất của quỹ đạo tuần hoàn mà **F-27** vẫn chưa có escalation để phá.
**Fix:** làm brick resolve thành phản xạ thật quanh `n` khi `v·n < 0` (dùng lại `reflectVelocityInto`, đã có sẵn nudge chống re-approach), hoặc tối thiểu là đảo trục **đang tiến vào** thay vì trục có thành phần pháp tuyến lớn hơn. Sau đó **xóa** `:813-844` và `:230-331` thay vì tiếp tục debug chúng.

### NF-10 — **MEDIUM** — Broadphase D-12 không còn được dùng; brick CCD nay là O(brickCount)
**File:** `src/core/step.ts:625-652` (vòng phẳng qua toàn bộ `brickCount`); `step.ts` không còn import `broadphase` (grep `forEachBrickCandidate` → chỉ `src/core/index.ts:90` và test)

Worst case mỗi `stepWorld`: `8 ball × 5 lượt CCD × ~130 brick ≈ 5.200` lời gọi `sweepCircleAabbInto`, × 5 substep/frame. Đồng thời toàn bộ bộ máy lattice thành gánh nặng vô ích: `assignSpatialBrickCells`, việc clear `cellToBrick` ở `apply.ts`, việc invalidate `cellToBrick` khi phá brick (`step.ts:786-791` — bản thân là một scan O(cells) *trong* hot path), và **cả hai fix F-38 và F-47**. Hai hệ quả cần nói thẳng: (1) dự án sắp đo 60 FPS trên một hot path đã bỏ chính broadphase mà nó tự thiết kế; (2) `tests/physics.broadphase.test.ts` nay guard code mà **không đường gameplay nào chạy**.
**Fix:** hoặc khôi phục `forEachBrickCandidate` trong vòng CCD (fix F-47 làm điều đó an toàn rồi), hoặc chính thức khai tử D-12 và xóa `spatial.ts`/`broadphase.ts`/`cellToBrick` cùng các test guard chúng, kèm ghi nhận quyết định. Giữ cả hai là lựa chọn tệ nhất: trả đủ chi phí, cộng dead code, cộng test tạo cảm giác có coverage.

### NF-11 — **MEDIUM** — Các "contract test" mới cho F-13…F-16 assert *comment*, không assert hành vi
**File:** `tests/render.path-contracts.test.ts:27`, `:32`, `:37`

```ts
expect(src).toMatch(/F-14/);                              // :27
expect(src).toMatch(/lastTrailBallCount|clearTrails|F-16/); // :32
```
`:27` pass khi và chỉ khi chuỗi "F-14" xuất hiện trong `bakeGlowSprites.ts`. Không một test nào trong file fail nếu glow blit sai kích thước, nếu trail bị clear thành `(0,0)` (**đang bị — NF-7**), hoặc nếu màu chip regress. Đây đúng là failure mode "comment tuyên bố đã fix không phải bằng chứng", được nâng lên thành một dòng CI xanh. `tests/runtime.chrome-reaction.test.ts` cũng 100% grep source — nó sẽ pass nguyên vẹn dù reaction thức mỗi frame (NF-8).
**Fix:** assert giá trị quan sát được — `bakeGlowSprites(32,14).<key>.atlasW === 40`; drive `consumeEventsForVfx` trên một ring tổng hợp rồi assert `vfx.r/g/b`; drive trail ring rồi assert không sample nào bằng `(0,0)` sau clear-then-push.

### NF-12 — **MEDIUM** — `constants.parity.test.ts` guard một tập hằng **khác** với tập F-37 đã nêu
**File:** `tests/constants.parity.test.ts:30-69`

Test mới cover logical W/H, `maxCcd`, `sepEps`, `serveSpeed`, palette. **Không** cover bất kỳ hằng nào F-37 đã nêu: `SCORE_HIT`, `SCORE_BREAK_BONUS`, `DROP_CHANCE`, `EXPAND_*`, `STALL_IDLE_TICKS`/`STALL_TIER2/3_*`/`STALL_SPEED_MULT`/`STALL_ANGLE_NUDGE_DEG`, `PICKUP_*`, `MULTIBALL_*`, `MAX_PICKUPS`, `DEFAULT_LIVES` — `scoring.ts`, `pickups.ts`, `effects.ts`, `multiball.ts`, `stall.ts` **không được đọc lần nào**. Sửa `constants.ts` để retune scoring/drop/expand/stall vẫn **không đổi gì ở runtime và không test nào fail**. Thêm nữa `:34`, `:42`, `:48`, `:51-54`, `:62` là tautology (so `constants.ts` với literal viết trong chính test, hoặc so một hằng với định nghĩa của nó).

### NF-13 — **LOW** — Offset shake không phải vector đơn vị → vượt cap 2,5
`src/render/recordSprites.ts:240-243`: `nx = sin(phase)`, `ny = cos(phase*1.3)` — comment gọi đây là hướng đơn vị nhưng `|(nx,ny)|` biến thiên 0…√2, nên translation thực đạt `amp × 1,41` = tới **3,54 px** so với `SHAKE_CAP = 2.5` (`src/vfx/types.ts:11`) và `07-UI-SPEC.md:189` ("subtle"). `shakeOffset()` (`shake.ts:37-43`) vẫn chết trong render path.

### NF-14 — **LOW** — Pad glow 4px > gapY/2 → halo tràn 2px lên brick kế cận
`bakeGlowSprites.ts:19` (`GLOW_PAD_SOFT = 4`) vs level-03 `gapY: 2`. Dest rect là `(bx−4, by−4, bw+8, bh+8)` (`recordSprites.ts:286`) và vòng vẽ glow-rồi-fill theo thứ tự index tăng (`:258-301`), nên halo của brick *i+1* — gồm cả footprint fill `edgeAlpha*0.35` — phủ **lên** fill của brick *i* 2px theo chiều dọc. Blowout 16px/8px của F-14 đã sửa đúng; 2px này là mới của đường `drawImageRect`.
**Fix:** clamp pad theo `min(GLOW_PAD_SOFT, gapY/2, gapX/2)`, hoặc vẽ toàn bộ glow ở pass 1 và toàn bộ fill ở pass 2.

### NF-15 — **LOW** — LC-07 mở rộng sang `app/**` nhưng bị vô hiệu hóa cho đúng file cần nó
`eslint.config.js:119-125` đặt `'no-restricted-syntax': 'off'` cho **toàn bộ** `app/_components/PlayingHost.tsx` (699 dòng). Probe xác nhận: `runOnJS(...)` trong một file `app/` khác thì báo lỗi; cùng đoạn code trong `PlayingHost.tsx` thì không. Nên rule nay phủ mọi file app **trừ** đúng file duy nhất hop UI→JS. Đây còn là disable cả rule, không chỉ entry `runOnJS`, nên mọi selector thêm về sau cũng im lặng ở đó.
**Fix:** chuyển chrome bridge sang `src/runtime` (làm exception thành tường minh, đúng ý `docs/layer-contract.md:25`), hoặc thay override bằng một `eslint-disable-next-line` tại đúng dòng.

### NF-16 — **LOW** — Element `devflags` của boundaries là inert; `src/devflags.ts` vẫn hoàn toàn không được quản lý
`eslint.config.js:138,213-216`. Mỗi lần lint đều in cảnh báo của chính plugin: *"Some element descriptors appear to use file patterns. Element patterns match folders, not individual files. Affected patterns: [\"src/devflags.ts\"]"*. Probe: `src/core/… → ../devflags` **không** báo lỗi, và `src/devflags.ts` import `react-native` cũng **không** báo lỗi. Mục F-24 đã được thay đổi nhưng hiệu lực bằng không.
**Fix:** dùng `boundaries/files` cho phân loại theo file (đúng như cảnh báo của plugin), hoặc pattern `src/devflags*`; và ngừng spread `recommended.rules` (`:142`) lên trên policy tường minh.

### NF-17 — **LOW** — `DEFERRED-ITEMS.md` gán D2/D4 vào một Results row **không tồn tại**
`docs/audit/DEFERRED-ITEMS.md:9-10` ghi owner là "dedicated Results row in `docs/phase8-certification.md`". Grep file đó cho `D2|D4|SC-2|worklet mutation` → **zero match**; các bảng Results (`:103-106`, `:151-152`) chỉ có dòng gfxinfo/Instruments/soak. Hai orphan nay đã có chủ trên giấy nhưng bề mặt ghi nhận thì chưa được tạo.

### NF-18 — **LOW** — Các lỗi tài liệu mới do chính đợt sửa tạo ra
- `07-VERIFICATION.md:127` (văn bản mới) ghi "Code + Human UAT for **FX-01…FX-04** truths 1–4" — FX-04 là requirement **v2** (haptics, `REQUIREMENTS.md:65`), không thuộc scope Phase 7 (`:145`).
- `08-VALIDATION.md:72` vẫn mô tả fallback tier là "conservative null→**Low**" sau khi code đã đổi sang `mid` (`resolveQualityTier.ts:64`).
- `07-VERIFICATION.md:27` vẫn ghi atlas có "soft/**strong** pads" trong khi `bakeGlowSprites.ts:4` nói "no unused strong bake" và `:24-29` chỉ expose `soft`.
- `PROJECT.md:29-35` vẫn liệt kê PHYS-01/PHYS-02/LVL-02/LVL-03/LVL-04/PLT-01 là chưa tick dưới mục **Active** trong khi `REQUIREMENTS.md:102-126` đánh tất cả là Complete.
- `applyFreeze` (`src/runtime/useGameLoop.ts:213-219`) nay có **zero** importer, kể cả test — cùng loại với F-36, mới được tạo ra.
- `useFonts` vẫn gọi trùng ở `GameHost.tsx:22-24` và `PlayingHost.tsx:86-88`.

---

## 4. Ledger requirements: hai lỗi loại-bằng-chứng còn lại

Phần **đã hòa giải tốt**: PHYS-01 (`:12`), PHYS-05 (`:16`), RUN-02 (`:30`), PLT-01 (`:48`) nay đều `[x]` và traceability khớp — under-claim đã hết. PLT-03 over-claim đã revert. Số học coverage đúng: 27 requirement, 27 mapped, bảng per-phase tổng đúng 27.

Nhưng **hai mục được đánh Complete cho những thứ code không ship**:

1. **PHYS-05.** `REQUIREMENTS.md:16` vẫn ghi "player launches with an **aimed release/tap**". `src/core/rules/serve.ts:35-36` đặt `ballVx[0] = 0; ballVy[0] = -serveSpeed` — serve thẳng đứng cố định — và docstring của chính hàm (`:25-27`) ghi "Aimed launch **deferred**". Văn bản requirement chưa bao giờ được hòa giải với hợp đồng đã ship; chỉ có cái tick bị đổi từ Pending sang Complete, làm ledger **sai hơn**, không phải đúng hơn. Hoặc mềm hóa wording thành "launches with a tap", hoặc đưa PHYS-05 về Pending.
2. **LVL-04.** Quyết định của owner (bỏ speed ramp, nới band thời lượng) được ghi ở `REMEDIATION-PLAN.md:151` và `DEFERRED-ITEMS.md:12` — và **không được lan sang bất cứ chỗ nào có hiệu lực**: `REQUIREMENTS.md:25` vẫn "~2–3 minute" và `[x]`; `ROADMAP.md` SC-1, `08-PLAN-CHECK.md:25`, `08-VERIFICATION.md:37`, `PROJECT.md:32` đều vẫn "~2–3 min". Số đo mới của audit càng làm band này khó đạt: **bot hoàn hảo clear level-03 trong 289–381 s** (4,8–6,4 phút), so với 156–317 s ở audit #01.

Thêm: PLT-04 đang `[x]` Complete (`:51`, `:126`) nhưng cả hai deliverable cứng đều đang hỏng — bản policy live không có kênh liên hệ (NF-3) và artifact privacy manifest đã drift (F-39).

---

## 5. Hiệu năng: cải thiện lớn về allocation, **không** cải thiện về draw call

Tính lại từ code hiện tại (phép tính tĩnh, không phải số đo), level-03 / tier `high`:

| Chỉ số | Audit #01 | Hiện tại | Thay đổi |
|---|---|---|---|
| Draw op/frame (worst case) | 690 | **690** | **0%** |
| Draw op/frame (đầu level) | 611 | **611** | 0% |
| `Skia.Color()`/frame | 452 | **0** | −100% |
| Template string/frame | 192 | **0** | −100% |
| Array cue/frame | 103 | **0** | −100% |
| Object cue/frame | ≤216 | **0** | −100% |
| **Tổng allocation/frame (worst case)** | ~970 (≈58.000/s) | **≈88 (≈5.280/s)** | **−91%** |
| Scan slot particle mỗi spawn | O(cap), worst ≈92.160 đọc/frame | **O(1)** free-list | −100% |
| Percentile mỗi frame | 2 × insertion sort (~1.800 so sánh) | **0** (gated theo overlay) | −100% |

Đã xác minh: `grep 'Skia.Color(' src/` chỉ còn `bakeGlowSprites.ts:55` (cold path) và `recordOverlay.ts:13` (paint cache một lần). Palette pre-bake `recordSprites.ts:77-88`; particle dùng `colorScratch` `:336-340`; cue ghi vào `cueScratch`; `intent` hoisted sang `global.__gameIntent`. Frame một-bóng điển hình: **≈6 allocation/frame**.

Phát sinh mới: một scan `cellToBrick` đầy đủ cho **mỗi** `BRICK_BREAK` (`step.ts:786-791`, `cellToBrick.length = 256`) → ≤10.240 đọc/frame ở 40 break/frame. Net vẫn dương mạnh.

**Kết luận trung thực:** đợt sửa đã loại gần như toàn bộ garbage per-frame và mọi lần parse CSS, nhưng **không giảm số draw call chút nào**. Nếu level-03 bị chặn bởi GPU/command chứ không phải allocation thì những cải thiện này không giúp gì — và **vẫn không có một phép đo nào trên thiết bị** để biết đó là trường hợp nào.

**Trạng thái certification: vẫn UNPROVEN.** Mọi ô trong `docs/phase8-certification.md:103-106` và `:151-152` vẫn là `PENDING_DEVICE`. Soak harness nay log timestamp + chuỗi lệnh `adb` (`GameHost.tsx:65-75`) — nhưng vẫn **không thu số liệu nào**: không JS heap, không frame-time, không artifact lưu lại. Và `PERF_OVERLAY` nay được truyền vào `drawOverlayFlag` (`PlayingHost.tsx:294`) nhưng `hudFont` **vẫn không được truyền** (default `null`, `useGameLoop.ts:182`) và `recordSprites.ts:450` yêu cầu `drawOverlayFlag && hudFont` → **overlay vẫn không thể vẽ**, nên cross-check trong app mà PLT-03 cần vẫn bất khả thi.

---

## 6. `08-VERIFICATION.md` có đóng được Phase 8 không?

**Không — và nó không hề tuyên bố như vậy. Đó là câu trả lời đúng, và là artifact đáng tin nhất mà đợt remediation này tạo ra.**

Frontmatter ghi `verified: null`, `status: not_verified`, `waiver: WAIVED-PENDING` (`:3-8`); heading ghi "STUB (Not Verified)" (`:11`); `:19` nói thẳng file này "does **not** claim phase completion or invent measurements"; `:23-31` liệt kê bảy gate còn mở. `08-REVIEW.md:11` cùng tinh thần. Cộng với việc hạ SC-5 của Phase 7 và revert PLT-03, đây là một chuỗi retraction mạch lạc và trung thực.

Bốn điểm làm nó yếu đi:
1. **Nó untracked** — một waiver trung thực chỉ tồn tại trong một working tree thì không phải hồ sơ dự án.
2. **`08-06-SUMMARY.md` vẫn vắng** → khoảng trống cấu trúc của F-05 không đổi (48 plan / 47 summary).
3. Nó **thừa hưởng mục tiêu LVL-04 chưa được nới** (`:37` vẫn "Human play ~2–3 min", LVL-04 vẫn "Complete (Plan 01)", không có phép đo nào).
4. Nó **nằm cạnh một `08-VALIDATION.md` phản bác nó** — `:63`/`:65` vẫn ghi "`npm test` 179/179 ✅ / Automated suite green". Ngay cả nửa **tự động** của gate Phase 8 cũng đang đỏ, và NF-1 nghĩa là đường substep-cap sẽ throw trên UI runtime dưới đúng tải mà protocol certification quy định. **Phase 8 xa khả năng đóng hơn stub này hàm ý: nó đang bị chặn bởi một bug code, không chỉ bởi thiếu hardware.**

---

## 7. Store compliance: chuẩn bị vs thỏa mãn thực tế

| Hạng mục | Chuẩn bị | Thỏa mãn để submit | Bằng chứng chặn |
|---|---|---|---|
| Privacy policy URL HTTPS công khai | ✅ | ✅ (reachability) | Audit đã fetch thành công |
| Policy có kênh liên hệ hoạt động | ✅ trong repo | ❌ | Bản live vẫn là text cũ; fix chưa commit — **NF-3** |
| Nội dung policy khớp dependency | ✅ | ✅ | Khớp `app.config.js:65-91` |
| iOS privacy manifest trong app config | ✅ | ✅ | `app.config.js:24-49`, assert theo **nội dung** (`assert-privacy-manifest.mjs:33-101`) |
| …nhưng config nằm trong file đã commit | ❌ | ❌ | `app.config.js` **untracked** — **NF-3** |
| `PrivacyInfo.xcprivacy` prebuild khớp config | Warn | ❌ | Script WARN nhưng exit 0; `/ios` gitignore nên EAS regenerate, nhưng không gate nào ép hay verify — **F-39** |
| Play Data Safety | ✅ | ❌ chỉ giấy tờ | Chưa nhập console |
| Age rating | ✅ | ❌ chỉ giấy tờ | Chưa nhập console |
| App name clearance | ⚠️ một phần | ❌ | `name-clearance.md:13-18` có log tự báo cáo, `:17`/`:26` "Not obtained" — **F-54** |
| Attestation originality | ✅ | ❌ | Icon iOS là logo Expo — **NF-5**; provenance SFX là placeholder (`assets/sfx/README.md:18-19`) |
| Dev client bị loại khỏi production | ✅ | ⚠️ uncommitted | `app.config.js:5-7,67` + `eas.json:22-26`; chưa QA thị giác (T-08-30) |
| 60 FPS đo trên thiết bị tầm trung (PLT-03) | Protocol + harness | ❌ | Mọi ô `PENDING_DEVICE` — **cần hardware** |
| Soak 100 chu kỳ + 15 phút | Harness | ❌ | Chỉ log timestamp + chuỗi lệnh `adb` — **F-07** |
| Gate tự động xanh | Tuyên bố | ❌ | **NF-4** — suite đỏ |
| Sẵn sàng release build | — | ❌ | **NF-1** |

**Net:** giấy tờ store nay được tổ chức tốt hơn thật và phần lớn trung thực về những gì còn thiếu. **Compliance** thì chưa thỏa mãn được hôm nay vì ba lý do độc lập: icon iOS là mark của bên thứ ba, bản policy live không có kênh liên hệ, và file config chứa privacy manifest + gate dev-client chưa được commit.

---

## 8. Sáu việc ưu tiên

1. **NF-1 — thêm `'worklet';` vào `src/runtime/substepCap.ts:6`.** Một dòng. Đây là thứ duy nhất chắn giữa build hiện tại và một game loop chết ngay ở frame nặng đầu tiên. Kèm theo: thêm guard CI quét worklet closure (script ~40 dòng đã bắt được lỗi này).
2. **NF-3 — commit + push.** Bao gồm `app.config.js`, `08-VERIFICATION.md`, privacy policy. Rồi verify bản live bằng nội dung. Hiện một checkout sạch **không build được**.
3. **NF-4 — xóa ba assert khe hở trong `tests/physics.level03-serve.test.ts` (giữ soak test), và sửa lại con số test trong `PROJECT.md:20` / `08-VALIDATION.md:63`.** Không sửa level-03.
4. **NF-2 + F-27 — thêm sàn |vx| (chống near-vertical) và escalation anti-stall sau tier 3.** Đây là soft-lock duy nhất đã được đo, đạt tới bằng hành vi người chơi bình thường, và nó phủ định PHYS-04 đang được đánh Complete.
5. **NF-5 — trỏ `ios.icon` sang art của dự án** rồi verify lại attestation bằng `git ls-files assets/`.
6. **NF-6 + NF-7 — thứ tự dispose glow atlas, và seed trail ring bằng vị trí bóng** thay vì `(0,0)`.

Sau đó mới tới đợt đo hardware (WP-6). Hai điều kiện tiên quyết cho nó **vẫn chưa xong**: NF-1 (loop sẽ throw dưới đúng tải cần đo) và `hudFont` chưa được truyền nên overlay vẫn không vẽ được.

---

## 9. Ghi chú về chất lượng của đợt remediation

Cần nói rõ hai điều, vì cả hai đều đúng:

**Điều đáng ghi nhận.** 33/63 finding đóng hẳn, cả 5 Critical đều xử lý, `tsc` và `lint` từ đỏ sang xanh mà không dùng `any`/`@ts-ignore`/disable diện rộng, allocation per-frame giảm 91%, và — quan trọng nhất về mặt kỷ luật — **không một số liệu nào bị bịa ra**; thay vào đó là một chuỗi retraction chủ động (PLT-03, SC-5 Phase 7, `requirements-completed`, và một `08-VERIFICATION.md` tự tuyên bố không verify). F-01, lỗi khó nhất của đợt #01, được sửa đúng cách bằng SharedValue request counter thay vì vá tạm.

**Điều cần chỉnh.** Bảy test mới là **grep trên source** chứ không phải test hành vi (NF-11, NF-12) — trong đó có một dòng `expect(src).toMatch(/F-14/)`, tức là test sự tồn tại của một comment chứa mã finding. Bốn trong sáu vấn đề nặng nhất của đợt này (NF-1, NF-6, NF-8, và việc xác minh F-10) chỉ quan sát được ở **biên runtime mà suite vẫn không băng qua** — đúng điều F-43 đã nêu và vẫn chưa được đóng (`package.json:33-44` vẫn không có `@testing-library/*`, `react-test-renderer`, hay `jest-expo`). Và một bug Critical mới (NF-1) được tạo ra bởi chính một fix, ở đúng lớp mà dự án đã có một chu kỳ debug ghi lại trong `.planning/debug/`.

Bài học cụ thể: **mỗi hàm mới được gọi từ frame callback phải có `'worklet'`, và điều đó cần một guard cơ học**, vì không một test Node nào thấy được sự thiếu vắng của nó.
