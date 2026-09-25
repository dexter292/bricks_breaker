# RE-AUDIT #07 — sau đợt remediation thứ sáu

**Ngày:** 2026-09-22
**Chuỗi:** [#01](./CODE-REVIEW.md) (63 F) → [#02](./RE-AUDIT-02.md) (+18 NF) → [#03](./RE-AUDIT-03.md) (+17 NG) → [#04](./RE-AUDIT-04.md) (+7 NH) → [#05](./RE-AUDIT-05.md) (+5 NJ) → [#06](./RE-AUDIT-06.md) (+7 NK) → tài liệu này (+4 NL)
**Đối tượng:** HEAD **`39023e7`** — "fix: close RE-AUDIT-06 NK findings and UI harness", working tree sạch
**Tính chất:** read-only, **hai ngoại lệ được công bố** ở §2 (thử nghiệm có kiểm soát trên guard, đã hoàn nguyên; `git status` xác nhận sạch).

---

## 1. Gate

| | #06 | **#07** |
|---|---|---|
| `tsc --noEmit` | 0 lỗi | **0 lỗi** |
| Test suite | 257 / 0 | **259 pass / 0 fail** |
| `eslint .` | 0 error / 5 warn | **0 error / 5 warn** |
| Worklet guard | thật, 88 file | **thật, 89 file — và self-check đã được kiểm chứng là sống** ✅ |
| `assert-privacy-manifest` | 0 WARN | 0 WARN |
| CI | 5 step | **6 step** — thêm `npx expo config --type public` |

---

## 2. Điểm sáng lớn nhất: lần đầu tiên "công cụ kiểm chứng tự được kiểm chứng"

Sáu vòng trước, mọi lần tôi nhận `exit 0` là một lần phải tự hỏi "nó có khả năng báo đỏ không?". Lần này **có câu trả lời cơ học.**

**Thử nghiệm 1 — làm guard mù trở lại.** Tôi xóa `'useAnimatedReaction'` khỏi `AUTO_WORKLET_CALLEES` (`scripts/assert-worklet-closures.mjs:27-33`):
```
Worklet guard self-check FAILED: reaction-bad fixture (implicit useAnimatedReaction worklet)
produced zero violations — NK-2 guard is blind
EXIT=1
```
Phục hồi → `Worklet closure guard OK (89 files)`, `EXIT=0`.

**Thử nghiệm 2 (vòng #06, nhắc lại) — tái lập lỗi NF-1.** Xóa directive `'worklet'` khỏi `substepCap.ts` → guard báo đỏ đúng call site.

Nghĩa là guard **bắt được cả hai lớp lỗi nó tồn tại để bắt**, **và** self-check bắt được khi chính guard bị làm mù, **và** exit code đúng nên CI enforce được. Đây là thứ duy nhất trong chuỗi bảy vòng có tính chất "verify the verifier". Bốn fixture: `good.ts`, `bad.ts`, `nonWorkletHelper.ts`, `reaction-bad.ts`.

---

## 3. Verdict 7 finding NK

| ID | Verdict | Bằng chứng |
|---|---|---|
| **NK-1** comment `resolve.ts:9` sai | **FIXED** | `resolve.ts:9-11` nay ghi "test-only returning wrappers … production worklets must use `World.scratchVel` + `*Into`"; và `stall.ts:81-84`, `:145-146` **thực sự** dùng `world.scratchVel` + `enforceMin*RatioInto`. Hazard aliasing `steep`/`flat` cũng hết (`:145-146` ghi tuần tự vào cùng scratch, có comment ghi rõ) |
| **NK-2** guard mù với callback workletize ngầm | **FIXED — chứng minh end-to-end** | `AUTO_WORKLET_CALLEES` (`:27-33`) + `GESTURE_HANDLER_METHODS` (`:36-43`) + self-check `reaction-bad.ts` (`:442`). Thử nghiệm 1 ở §2 |
| **NK-3** test tự sao chép | **FIXED — đúng cách** | Publish step tách thành `src/runtime/publishChromeMirror.ts`; `tests/runtime.chrome-reaction.test.ts:5-8` import **hàm production thật** và assert hành vi (giữ identity, `dirty` 0/1, idempotent); và `useGameLoop.ts:295,435` **thực sự gọi** nó — nên helper được test chính là đường production, không bị đứt kết nối |
| **NK-4** `forEachBrickCandidate` dead code | **FIXED** | Đã xóa khỏi `broadphase.ts`; `src/core/index.ts:92` chỉ export `collectBrickCandidatesInto`; test helper nay gọi hàm hot-path thật. Doc drift còn lại → **NL-4** |
| **NK-5** tally audio không dùng | **FIXED** | `expoAudioService.ts:200-206` dùng `Set<SfxId>`; comment nay đúng (service thật tally ở `:151-159` và bump `DEDUPE_GAIN`) |
| **NK-6** scratch không có coverage | **PARTIALLY FIXED** | `tests/physics.world-shape.test.ts:25-37` có field và có assert identity qua hai `stepWorld` — nhưng **assertion là tautology**: tôi grep `scratchVel =\|scratchSweep =` toàn `src/` → **zero** (ngoài `allocate.ts:136-137`), nên `expect(w.scratchSweep).toBe(sweep)` không thể fail. Thêm nữa ball ở trạng thái nghỉ + `DOCKED` nên hai step không tạo va chạm, scratch không bao giờ được ghi |
| **NK-7** công thức verify HOSTING | **FIXED** | `HOSTING.md:19` nay `grep -F 'github.com/dexter292/bricks_breaker/discussions'` — không còn khớp URL issues bị chặn. (Vẫn chỉ chứng minh *chuỗi* có trên trang, không chứng minh Discussions đang bật — nhưng Discussions đã được xác nhận live) |

### Các mục dài hạn

| ID | Verdict | Ghi chú |
|---|---|---|
| **NH-7** F-23 supersession | **FIXED** | Đã ghi ở cả ba nơi hợp đồng sống: `05-05-PLAN.md:81`, `REMEDIATION-PLAN.md:141-145`, `REQUIREMENTS-MATRIX.md:80-84`. Còn sót `RELEASE-READINESS.md:56` |
| **NF-18f** `useFonts` trùng | **CLOSED — quyết định được ghi nhận** | Code không đổi nhưng nay là quyết định có chủ ý với lý do trong `DEFERRED-ITEMS.md:15`. `expo-font` cache nên hợp lý |
| **NJ-3** kênh liên hệ không cần GitHub | **NOT FIXED — nhưng đã có chủ** | Mọi kênh vẫn là `github.com`; chính trang ghi "no store support email yet"; đăng Discussions vẫn cần đăng nhập. Nay được ghi nhận có owner ở `DEFERRED-ITEMS.md:16`. **Vẫn là mục chặn submit** — App Store Connect đòi support contact |
| **NG-20** 360/640 trùng lặp | **PARTIALLY FIXED** | `recordSprites.ts:72,76,228-230,250` nay dùng `LOGICAL_W/H` (tiến bộ thật). Nhưng vẫn **ba** định nghĩa độc lập của 360 (`core/constants.ts:17`, `input/constants.ts:8`, `recordSprites.ts:12`) và ~10 site inline chưa được parity test cover |
| **F-45**, **F-54** | **DEFERRED, ghi nhận mạch lạc** | Speed ramp hoãn có chủ ý. Về F-54: lo ngại "chuỗi đã clear ≠ identifier đang ship" của tôi ở vòng #06 là **sai** — `app.config.js:11` `name: 'Neon Brick Breaker'` **chính là** chuỗi đã clear; `bricks-breaker` là slug và `com.dexter292.bricksbreaker` là bundle id, không phải store display name. Chỉ còn trademark opinion "Not obtained", hoãn có chủ ý |
| **NF-15**, **F-03**, **F-21**, **F-29**, **F-40**, **F-59** | **NOT FIXED** | Không đổi. F-03 đáng nhắc: PLAN-CHECK 2/8, REVIEW 3/8, thiếu `01-PATTERNS.md`, `nyquist_compliant: false` ×5, sign-off trống ở `03`/`04-VALIDATION.md` trong khi ROADMAP ghi Complete — và mọi `waiver` trong `.planning/` đều về **hardware**, chưa bao giờ về gate quy trình |

---

## 4. F-43 — câu trả lời dứt khoát, sau bảy vòng

**Trạng thái: PARTIALLY FIXED.** `@testing-library/react` + `jsdom` đã cài, `vitest.config.ts:6-10` include `tests/**/*.test.tsx`, và `tests/ui/jsdom-harness.test.tsx` chạy thật (đã xác minh cơ chế: `@vitest-environment jsdom` docblock được vitest đọc qua regex trên nội dung file; `jsdom@29.1.1` đã cài). Nhưng nó render một `<div>` và tự ghi "Do NOT mount PlayingHost here". **Không một component nào của app được render.**

**Và đây là phần quan trọng: dependency đang cài là ĐÚNG, đừng đổi.**

Ba lý do dứt điểm:
1. `@testing-library/react-native` phụ thuộc `react-test-renderer`, mà **React 19 đã deprecate** — repo đang ở `react@19.2.3`.
2. `jest-expo` là preset của **Jest**; runner ở đây là `vitest`. Không có đường nối.
3. **Đường rẻ nhất đã trả tiền rồi**: `react-native-web@0.21.2` và `react-dom@19.2.3` **đã là dependency runtime** (`package.json:29,32`), và `@testing-library/react` đúng là thư viện cho react-native-web.

**Việc cần làm chỉ là một dòng config:**
```ts
// vitest.config.ts
resolve: { alias: { 'react-native': 'react-native-web' } }
```
Cộng một `vi.mock` cho `useSafeAreaInsets` (hoặc bọc `SafeAreaProvider`). Khi đó **7 component render được ngay, zero dependency mới**, vì chúng chỉ import `react-native` + `react-native-safe-area-context`:

`HudStrip.tsx` · `PauseOverlay.tsx` · `ResultOverlay.tsx` · `CountdownOverlay.tsx` · `LevelErrorOverlay.tsx` · `TitleScreen.tsx` (+ `GameScreen.tsx` với một mock `GestureDetector` và một mock `GameCanvas`).

Những regression mà 259 test hiện tại **không thể** bắt và sẽ bắt được ngay: định dạng score/lives/combo và `Stall! · N` trong HudStrip; numeral countdown; wiring nút Pause/Result/Retry; render `ValidationIssue` của LevelErrorOverlay; **và scrim của 4 overlay** — chính lỗi F-09 của audit #01.

**Và một đính chính về phạm vi:** khi Reanimated bị mock, `useFrameCallback`/`useAnimatedReaction` không còn chạy trên UI runtime — nên **mount `PlayingHost` sẽ không bao giờ test được worklet loop**. Nó test được pause FSM, chuỗi countdown, Android Back, mapping `applyChrome` → `setState`, và mặt lỗi level-load. Đáng có, nhưng nên ngừng gọi F-43 là "UI-thread coverage"; nó là **component-contract coverage**. Dòng F-43 trong `DEFERRED-ITEMS.md:14` nên được viết lại theo đúng nghĩa đó.

---

## 5. Finding mới — 4 mục

### NL-1 — **MEDIUM** — Allocation mỗi frame bị tái lập trong worklet nóng, trái với comment ngay phía trên nó
**File:** `src/runtime/useGameLoop.ts:435-441` (và `:295-301`)

```ts
// Publish chrome: mutate stable mirror in place; bump chromeSeq only on change
// (NF-8 / NG-15 / NK-3 — publishChromeMirror is the tested pure path).
{
  const c = chromeOut.value;
  const dirty = publishChromeMirror(c, {        // ← object literal MỚI mỗi frame
    phase: w.simPhase, lives: w.lives, score: w.score,
    combo: w.combo, stallTier: w.stallTier,
  });
```
Tôi xác minh: khối này nằm trong `onFrame`, directive `'worklet'` ở `:284`, là thân `useFrameCallback` → **chạy mỗi frame trên UI runtime**. Code trước `39023e7` so sánh năm field inline với **zero allocation**. Việc tách NK-3 cho `publishChromeMirror` một tham số **object** (`publishChromeMirror.ts:27-30`), nên mọi call site buộc phải cấp literal mới.

Comment được giữ nguyên ("mutate stable mirror in place") đúng với *mirror* nhưng sai với *snapshot*. Và NF-8/NG-15 tồn tại **chỉ vì** allocation này; commit ngay trước có tên `fix(wp4/wp5): cut frame allocs`; cùng hàm dùng `intentScratch()` ở `:369` đúng để tránh allocation per-substep.

**Impact:** một object nhỏ mỗi frame (~60/s) trên UI runtime — nhỏ tuyệt đối (audit #01 là ~970/frame) nhưng là **đảo chiều một invariant đã được ghi nhận và audit hai lần**.
**Fix:** đổi signature thành năm scalar — `publishChromeMirror(mirror, phase, lives, score, combo, stallTier): number`. Giữ nguyên tính test-được của NK-3 (test ở `:14-56` sửa không đáng kể), khôi phục zero-alloc, xóa type `ChromeSnapshot`.

### NL-2 — **MEDIUM** — NH-4 **REGRESSION**: glow atlas nay dispose đồng bộ trên JS thread ngay sau một lần ghi SharedValue xuyên thread
**File:** `app/_components/PlayingHost.tsx:293-297`; consumer `src/runtime/useGameLoop.ts:460`

```ts
setActive(false);
const prev = glowAtlasSv.value;
// UI holds the new ref immediately — safe to dispose previous now (NH-4).
glowAtlasSv.value = bakeGlowSprites(brickW, brickH);
disposeGlowAtlas(prev);                          // ← đồng bộ, trên JS thread
```
`setTimeout` 32ms đã bị bỏ (tốt — đó là đúng phần NH-4 yêu cầu), nhưng nó được thay bằng **dispose đồng bộ ngay sau** một lần ghi SharedValue. Ghi SharedValue từ JS thread được propagate sang UI runtime **bất đồng bộ**; `setActive(false)` cũng đi qua `scheduleOnUI` nên cũng không đồng bộ. Comment `:295` ("UI holds the new ref immediately") khẳng định một bảo đảm mà Reanimated không cung cấp — và nó là lý lẽ duy nhất biện minh cho thay đổi.

So với `098921a`: 32ms là một hack xấu nhưng cho UI runtime ~2 frame dung sai; bản mới có **zero** dung sai. NH-4 yêu cầu một bảo đảm **tất định**; cái hạ cánh là tất định trên JS thread và không xác định qua biên.
**Impact:** khi đổi level / re-bake, render worklet có thể vẽ `SkImage` đã dispose. `disposeGlowAtlas` nuốt lỗi (`:57`) nhưng `recordFrame` **không** có try/catch → throw nổi lên thành lỗi UI runtime. Cửa sổ hẹp, chỉ khi bake.
**Fix:** đưa việc dispose sang UI thread để thứ tự là **nhân quả** chứ không phải thời gian — gán atlas mới, rồi trong cùng work item của UI runtime quan sát nó, `scheduleOnRN` việc dispose `prev`. Hoặc: `onFrame` bump một `glowAtlasGeneration` sau khi đã dùng atlas mới một frame, và dispose `prev` từ một `useAnimatedReaction` trên counter đó. Nếu thấy quá đắt thì phương án trung thực là **phục hồi delay và ghi nhận nó là một timing mitigation được chấp nhận**, thay vì tuyên bố một bảo đảm.

### NL-3 — **LOW** — Peer `@types/react-dom` của `@testing-library/react` bị thiếu; chỉ được che bởi `skipLibCheck`
`package.json:38` thêm `@testing-library/react@^16.3.3`, vốn khai peer `@types/react-dom`. `node_modules/@types/react-dom` **không tồn tại** và `package.json` không liệt kê. `tsc` pass chỉ vì `node_modules/expo/tsconfig.base.json:16` set `skipLibCheck: true`.
**Impact:** latent — sẽ nổ ngay khi F-43 mở rộng (test nào import trực tiếp từ `react-dom`, hoặc khi tắt `skipLibCheck`).
**Fix:** `npm i -D @types/react-dom@~19.2` — hoặc thêm cùng lúc với alias react-native-web ở §4.

### NL-4 — **LOW** — `forEachBrickCandidate` bị xóa mà không cập nhật các plan đặc tả nó — **đúng khuôn mẫu NH-7 vừa được sửa trong cùng commit này**
`.planning/milestones/v1.0-phases/02-headless-core-simulation/02-04-PLAN.md:109`, `:163`; `02-02-PLAN.md:99`; và `docs/audit/REMEDIATION-PLAN.md:96` (vẫn quy định regression test của F-47 là "test trực tiếp `forEachBrickCandidate`" — một test nay không thể tồn tại).

Symbol đã biến mất khỏi `src/` nhưng bốn tài liệu planning/remediation vẫn đặc tả nó là hợp đồng. Điểm nhẹ: verify tự động ở `02-04-PLAN.md:117` là một alternation grep nên vẫn pass nhờ `sweepCircleAabb` — gate không vỡ, nhưng gate cũng không còn kiểm cái nó tuyên bố.
**Cùng lớp, còn sót từ chính fix NH-7:** `docs/audit/RELEASE-READINESS.md:56` vẫn liệt F-23 là nguyên nhân mở của gate G-8.

---

## 6. CI: bước tiến thật, nhưng `expo config` không verify buildability

Step mới `npx expo config --type public` chạy pass (tôi xác nhận exit 0). Nhưng nó chỉ chứng minh **`app.config.js` evaluate được và hợp schema**. `--type public` **không** apply config plugin (đó là `--type prebuild`/`expo prebuild`); nó không bundle một dòng code app nào, không resolve một import nào, không chạy Metro hay Babel plugin của worklets. **Một import hỏng trong `app/index.tsx` vẫn ship CI-xanh.**

Còn thiếu, theo thứ tự giá trị:
1. **`npx expo export --platform all`** — chạy Metro trên toàn bộ graph app, trên Linux, không cần Xcode/Android SDK. Bắt được lỗi resolve RN/Skia/Reanimated, asset thiếu, lỗi worklet plugin. **Đây là step giá trị nhất còn thiếu**, và nó là thứ làm cho step `expo config` trở nên có nghĩa.
2. **Không coverage floor** — `@vitest/coverage-v8` đã cài mà không có script/threshold/CI step nào. "259 test" không có sàn; xóa test vẫn CI-xanh.
3. **`lint` không `--max-warnings 0`** — 5 warning vĩnh viễn không được gate.
4. **Worklet guard chỉ được chain trong `npm test`**, không phải một step riêng — hiện có hiệu lực nhưng vô hình trong `ci.yml` và sẽ âm thầm mất nếu ai sửa script `test`. `assert:worklets` đã tồn tại; thêm một dòng.

---

## 7. Guard: các lớp vi phạm còn sót

Guard nay bắt lớp chính (direct call tới hàm import/local thiếu directive, kể cả trong callback workletize ngầm) và **fail closed** khi không resolve được import tương đối. Còn sót, theo mức reachable trong style của codebase này:

| Lớp | Reachable? |
|---|---|
| **Optional call `nw?.()`** | **Cao nhất — nên sửa.** `?.()` đang được dùng ở 4 chỗ (`appStatePause.ts:22`, `useGameLoop.ts:559`, `PlayingHost.tsx:185,234`); hiện **không** chỗ nào nằm trong worklet nên là **latent, không live** — nhưng idiom đã nằm trong tay tác giả, và `useGameLoop.ts` chính là nơi worklet sống. Fix: thêm `OptionalCallExpression` vào visitor. **Một dòng** |
| Truyền hàm làm **argument** (`apply(nw)`, `a.map(nw)`) | Trung bình — đây là lỗ cấu trúc thật, nhưng `runOnJS(applyChrome)` là dạng *hợp lệ* của chính nó nên khó fix mà không false positive |
| Alias local (`const g = nw; g()`) | Trung bình — `const x = world.y` rất phổ biến trong `step.ts` |
| Method object/class, `new C()`, computed member, sequence callee, default param | Thấp |
| Auto-worklet root chưa liệt kê (`withTiming`/`withSpring` callback, `sharedValue.modify`, `useWorkletCallback`, `useAnimatedProps`, `onTouches*`) | **Hiện zero instance** trong `src/`+`app/` — nên set đang **đủ cho code hôm nay, âm thầm thiếu cho code mai**. Cân nhắc fail-closed: flag mọi member-call *chưa biết* trên namespace Reanimated có argument là function literal |

---

## 8. Chất lượng test

**Đây là lần đầu trong chuỗi một refactor "test đúng thứ thật" thực sự hạ cánh.** `tests/runtime.chrome-reaction.test.ts` bỏ hẳn bản copy local, import `publishChromeMirror` production, assert hành vi thật — và helper đó **đúng là** đường production. NK-3 đóng đúng cách. `tests/physics.broadphase.test.ts:25-42` nay gọi hàm hot-path thật, và test ở `:100-118` **chính xác hơn** bản cũ (brick trải 4 cell phải cho đúng một candidate — đó *là* hợp đồng F-47).

Ba mục còn yếu:
- **`tests/runtime.chrome-reaction.test.ts:48-56`** vẫn là grep source: `expect(src).toContain("publishChromeMirror(c,")` — vỡ nếu reformat wrap argument, và chỉ khớp call site `:435` chứ không khớp `:295` (`publishChromeMirror(c0,`). Nó lại là **assertion duy nhất** chứng minh đường production được wire.
- **`tests/physics.world-shape.test.ts:25-37`** là **tautology** (NK-6): tôi grep xác nhận không code nào gán hai field đó, nên `toBe` không thể fail; và ball ở trạng thái nghỉ nên hai `stepWorld` không tạo va chạm. Test **đáng giá** — và sẽ bắt được bug NK-1 — là: đẩy ball vào stall gần-ngang, chạy `stepAntiStall`, assert velocity khớp `enforceMinVerticalRatioInto ∘ enforceMinHorizontalRatioInto` tính tay, chứng minh sàn được áp **qua** `world.scratchVel`.
- **`tests/ui/jsdom-harness.test.tsx:12-15`** render `<div>`: chứng minh **toolchain** chạy (đáng một commit) nhưng test **zero dòng của app này**. Sau bảy vòng, F-43 cho ra một test sẽ pass trong một repo rỗng.

**Và khuôn mẫu đáng đặt tên:** hai finding mới của vòng này (NL-1 allocation per-frame, NL-2 use-after-free xuyên thread) **đều do chính các refactor nhằm tăng tính test-được tạo ra**, và **đều vô hình với suite**. Việc tách code để test được đã hai lần làm đổi hợp đồng runtime của nó, mà test sinh ra lại không thấy được thay đổi đó. Alias react-native-web ở §4 là nước đi rẻ nhất chống lại điều này.

---

## 9. Sáu việc ưu tiên

1. **Thêm `resolve.alias: { 'react-native': 'react-native-web' }`** vào `vitest.config.ts` và viết test cho 7 component không cần mock. Zero dependency mới. Đây là nước đi có đòn bẩy cao nhất còn lại — nó đóng F-43 theo nghĩa thực dụng và chặn được lớp lỗi đã sinh ra NL-1/NL-2.
2. **NL-1** — đổi `publishChromeMirror` sang 5 tham số scalar; khôi phục zero-alloc mà vẫn giữ tính test-được.
3. **NL-2** — dispose glow atlas qua UI-thread handshake, hoặc phục hồi delay **và ghi nhận nó là timing mitigation** thay vì tuyên bố bảo đảm.
4. **Guard: thêm `OptionalCallExpression`** (một dòng) — `?.()` đã có trong codebase, chỉ chưa trong worklet.
5. **CI: thêm `npx expo export --platform all`** + coverage threshold + `--max-warnings 0` + `assert:worklets` thành step riêng.
6. **NK-6** — thay tautology bằng test sàn-góc-qua-scratch; **NL-4** — cập nhật 4 tài liệu còn đặc tả `forEachBrickCandidate`; **NJ-3** — đặt một email hỗ trợ (đang chặn submit).

---

## 10. Nhận định

Vòng này đóng **6/7 NK** và hai mục có giá trị dài hạn hơn bất kỳ fix nào trước đó: **guard nay tự kiểm chứng được** (tôi làm nó mù và self-check báo đỏ, exit 1), và **NK-3 được sửa đúng cách** — helper tách ra là đường production thật, không phải bản sao. Cộng NH-7 đóng ở cả ba nơi hợp đồng sống, NK-1 hòa giải đúng, NK-4/NK-5/NK-7 sạch, và CI thêm một step. Tôi cũng tự đính chính một điểm của vòng #06: lo ngại về F-54 ("chuỗi clear ≠ identifier ship") là sai — `app.config.js:11` đúng là chuỗi đã clear.

Hai điều còn lại, và chúng là cùng một điều:

**F-43 đã mở cửa nhưng chưa đi qua.** Harness chạy thật — nhưng render một `<div>`. Tin tốt là dependency đang cài **đúng** và đường đi chỉ còn **một dòng alias**: `react-native-web` và `react-dom` đã là dependency runtime, nên 7 component render được ngay mà không thêm gì. Đừng đổi sang `@testing-library/react-native` (kéo theo `react-test-renderer` mà React 19 đã deprecate) hay `jest-expo` (preset Jest, runner ở đây là vitest).

**Và hai finding mới đều do refactor-để-test-được sinh ra, đều vô hình với suite.** Đó chính là lý do bước 1 ở §9 quan trọng hơn nó trông. Bảy vòng qua, phần sửa lỗi luôn tốt; phần thiếu luôn là một lớp kiểm chứng — và lần này nó chỉ còn cách một dòng config.
