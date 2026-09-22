# RE-AUDIT #06 — sau đợt remediation thứ năm

**Ngày:** 2026-09-22
**Chuỗi:** [#01](./CODE-REVIEW.md) (63 F) → [#02](./RE-AUDIT-02.md) (+18 NF) → [#03](./RE-AUDIT-03.md) (+17 NG) → [#04](./RE-AUDIT-04.md) (+7 NH) → [#05](./RE-AUDIT-05.md) (+5 NJ) → tài liệu này (+7 NK)
**Đối tượng:** HEAD **`098921a`** — "fix: close RE-AUDIT-05 NJ findings and wire real CI gates", working tree sạch
**Tính chất:** read-only, **một ngoại lệ được công bố** ở NJ-1 (thử nghiệm có kiểm soát, đã hoàn nguyên, `git status` xác nhận sạch).

---

## 1. Gate tự động

| | #05 | **#06** |
|---|---|---|
| `tsc --noEmit` | 0 lỗi | **0 lỗi** |
| Test suite | 255 / 0 | **257 pass / 0 fail** (54 file) |
| `eslint .` | 0 error / 6 warn | **0 error / 5 warn** |
| `assert-privacy-manifest` | PASS + **2 WARN** | **PASS, 0 WARN** — `privacyManifests OK (config + 1 PrivacyInfo.xcprivacy)` ✅ |
| `assert-worklet-closures` | tồn tại nhưng **vacuous** | **thật, bắt được lỗi** ✅ |
| **CI** | *không có* | **`.github/workflows/ci.yml`** — typecheck + lint + test + assert:skia + assert:privacy-manifest, trên push-to-main và mọi PR ✅ |

---

## 2. Verdict 5 finding NJ

| ID | Verdict | Bằng chứng |
|---|---|---|
| **NJ-1** guard không thể fail | **FIXED — tôi chứng minh end-to-end** | Xóa directive `'worklet'` khỏi `src/runtime/substepCap.ts` (tái lập chính xác lỗi NF-1 Critical) → guard báo:<br>`Worklet closure violations:`<br>`src/runtime/useGameLoop.ts: worklet calls remainderAfterSubstepCap from ./substepCap (not a worklet)`<br>`GUARD EXIT=1`<br>Phục hồi ngay; `git status` sạch. Thêm self-check với cặp fixture `scripts/fixtures/worklet-guard/{good,bad}.ts` tại `scripts/assert-worklet-closures.mjs:334-347` |
| **NJ-2** broadphase bị bỏ qua 98,7% | **FIXED** | `src/core/step.ts:649` nay là `if (useLattice)` — điều kiện `&& candCount > 0` đã bỏ; khi lattice trả 0 candidate thì vòng chạy 0 lượt thay vì rơi vào flat scan. Comment tại `:637-639` ghi rõ lý do. Kiểm chứng bằng **differential execution** (transpile `06864eb` và bản hiện tại, chạy cùng scenario): bản cũ `brickHp 9→8` (flat scan chạm brick không map), bản mới `9→9`. Và `tests/physics.broadphase.test.ts:132-177` **thực sự phân biệt được** hai nhánh — test tốt nhất được thêm trong đợt này |
| **NJ-3** kênh liên hệ policy đã chết | **PARTIALLY FIXED** | Trang `https://github.com/dexter292/bricks_breaker/issues` render nguyên văn *"Issue creation is restricted in this repository"* → **kênh chính xác nhận đã chết**. Discussions **có** bật (6 category) nên là fallback hoạt động, nhưng cần tài khoản GitHub. Fallback thứ ba `github.com/dexter292` không có bio/email/website. Không có email nào trong repo, không có `SECURITY.md`. `HOSTING.md:12-22` đã thêm cache-buster (đúng yêu cầu) nhưng grep vẫn khớp cả URL bị chặn → **công thức verify không thể phát hiện chính vấn đề nó được viết để kiểm** (NK-7) |
| **NJ-4** 4 package phantom | **FIXED** | `glob`, `@babel/core`, `@babel/parser`, `@babel/traverse` nay trong `devDependencies`; lockfile khớp nên `npm ci` trong CI không vỡ |
| **NJ-5** hợp đồng F-56 bị đánh đổi | **PARTIALLY FIXED** | Nửa allocation **đã đóng và đo được**: scratch chuyển lên `World` (`src/core/types.ts:102-109`, `allocate.ts:136-137`, `step.ts:412-419`). Đo trên 20.000 frame chơi thật (93/103 brick bị phá): **0,00 allocation/frame** trong core sim (vòng #05: ~3,8). Nhưng văn bản hợp đồng mới **sai** → **NK-1** |

### Các mục khác đóng trong đợt này

| ID | Bằng chứng |
|---|---|
| **F-39** xcprivacy drift | `assert-privacy-manifest` nay **0 WARN** — file prebuild đã khớp app config |
| **NG-18** `void hits` + comment sai | Warning lint đã hết |
| **NF-11** test assert comment | `tests/render.path-contracts.test.ts:26-31` nay assert `/export function bakeGlowSprites\(\s*brickW: number/`; grep toàn repo cho `toMatch(/F-…/)` → **không còn** |
| **NF-16** element `devflags` inert | `eslint.config.js:152-155`, `:208-213` chuyển sang `boundaries/files` (setting chính thức của plugin 7.2.0); cảnh báo file-vs-folder **đã hết** — tôi chạy lint xác nhận không còn dòng nào |
| **NF-17** D2/D4 trỏ vào row không tồn tại | `docs/phase8-certification.md:112,118,119,120` — row nay tồn tại thật với schema khớp |
| **NF-18 a/b/c/d** | FX-04 khỏi scope Phase 7; "null→Low" sửa thành `mid`; "soft/strong pads" sửa; `PROJECT.md` Active list tick |
| **NF-18e** `applyFreeze` mồ côi | Đã xóa khỏi `useGameLoop.ts` (còn claim cũ trong `03-04-SUMMARY.md:79`) |

**Tổng: 11 finding đóng hẳn** trong đợt này, gồm cả ba mục cơ sở hạ tầng (guard thật, CI, deps khai báo) mà bốn vòng trước chưa có.

---

## 3. Finding mới — 7 mục (NK-1 … NK-7)

### NK-1 — **MEDIUM** — `resolve.ts:9` nay ghi một hợp đồng **sai**; module-level scratch vẫn nằm trên đường worklet production
**File:** `src/core/physics/resolve.ts:9` vs `src/core/rules/stall.ts:83-84`, `:145-146`

```
/** Module-level scratch for test-only wrappers (F-56). Hot path uses World.scratchVel (NJ-5). */
```
Các wrapper **không** phải test-only. Tôi grep xác nhận: `stall.ts:83-84` (`applyTier2SpeedBoost`, directive `'worklet'` ở `:54`) và `:145-146` (`applyTier3AngleNudge`, directive ở `:96`) đều gọi `enforceMinVerticalRatio` / `enforceMinHorizontalRatio` — dạng wrapper trả về `_velScratch` chia sẻ (`resolve.ts:10,231,242`) — và cả hai đến từ `stepAntiStall` → `stepRun`.

Hai hệ quả:
1. **Comment cũ đúng, comment mới sai.** Đây là một doc regression do chính commit `098921a` tạo ra. NJ-5 yêu cầu "cập nhật văn bản hợp đồng"; cái hạ cánh là một văn bản mà hai dòng grep phủ định.
2. **Chính mối nguy được nêu lại chưa được xử lý ở đây.** Comment bị xóa khỏi `step.ts:407-408` trong đúng commit này nói module mutable "can clone/share incorrectly across UI frames; stack locals are reliable". Lập luận đó áp nguyên vào `_velScratch` trong `stall.ts`. **Hoặc** mối nguy là thật — và `stall.ts` đang lỗi trên thiết bị — **hoặc** nó không thật, và việc chuyển scratch lên `World` là không cần. Đợt này migrate một call site và bỏ lại cái kia mà không hòa giải hai lập luận.

Thêm một hazard aliasing latent: ở `stall.ts:145-146`, `steep` và `flat` là **cùng một object**. Đúng hôm nay chỉ vì argument được evaluate trước khi callee mutate và `steep` không được đọc sau `:146`.
**Fix:** hoặc route `stall.ts` qua `world.scratchVel` và xóa bốn wrapper (`resolve.ts:216-257`) + export ở `src/core/index.ts:98-101`, chuyển test sang dạng `*Into`; hoặc phục hồi comment trung thực và thêm test pin rằng `stall.ts` dùng wrapper có chủ ý.

### NK-2 — **MEDIUM-HIGH** — Guard mù với callback được Reanimated workletize **ngầm**, và cả ba callback trong repo đều không được bảo vệ
**File:** `scripts/assert-worklet-closures.mjs:234` (`if (!fnIsWorklet(path.node)) return;`) vs `app/_components/PlayingHost.tsx:366`, `:430`

Tôi grep xác nhận: **`grep -rn "'worklet'" app/` trả về rỗng** — không một directive nào trong toàn bộ `app/`. Nhưng `PlayingHost.tsx:366` và `:430` là các callback `useAnimatedReaction` mà Babel plugin của Reanimated **tự động workletize**. Vì `fnIsWorklet` đòi directive tường minh, guard không bao giờ đi vào thân chúng.

Agent đã chứng minh bằng probe: `useAnimatedReaction(() => nonWorkletImport(), …)` được báo là **MISSED**.
**Impact:** tuyên bố đầu file của guard ("worklet bodies must not call functions lacking a `'worklet'` directive") **không đúng** cho đúng phần code UI-thread dễ bị sửa nhất khi làm UI. Một edit tương lai thêm lời gọi non-worklet vào một trong các callback đó sẽ ship xanh.
**Fix:** coi callback argument của tập API auto-workletize (`useAnimatedReaction`, `useFrameCallback`, `useAnimatedStyle`, `useDerivedValue`, `runOnUI`, `Gesture.*().on*`) là worklet root; hoặc **đòi** directive tường minh ở các vị trí đó và fail khi thiếu.

**Các lớp vi phạm guard vẫn bỏ sót** (agent probe 18 lớp, bắt 7, fail-closed 1, bỏ sót 7): callback workletize ngầm (trên), `f?.()` (`OptionalCallExpression`), truyền hàm làm **argument** (`runIt(namedNW)`), alias local (`const g = nw; g()`), method object/class (`obj.m()`, `new C().m()`), callee dạng sequence `(0, nw)()`. Guard **fail closed** khi không resolve được import tương đối (đúng hướng) nhưng **fail open** khi không nhận dạng được *hình dạng* callee (`:260-262` return im lặng).

### NK-3 — **MEDIUM** — `tests/runtime.chrome-reaction.test.ts` nay là một **bản tự sao chép tự kiểm** → NG-16 **REGRESSION**
**File:** `tests/runtime.chrome-reaction.test.ts:19-52`

Tôi grep import của file: **duy nhất `import { describe, expect, it } from 'vitest'`** — **không import gì từ `src/`**. File định nghĩa một `publishChrome` local rồi assert chính bản copy đó. **Nó sẽ pass nếu `src/runtime/useGameLoop.ts` bị xóa hoàn toàn.**

Vòng #05 nói test này (khi đó là grep source) "sẽ pass nếu defect quay lại". Bản thay thế **yếu hơn**: grep cũ ít nhất còn đọc file thật. Đây là remediation đổi một test yếu-nhưng-có-kết-nối thành một test trông-mạnh-nhưng-đứt-kết-nối.
**Fix:** import bước publish của `useGameLoop` (hoặc tách nó thành một pure helper trong `src/runtime/`, đúng như `src/runtime/substepCap.ts` đã làm cho F-51) và assert **cái đó**.

### NK-4 — **LOW** — `forEachBrickCandidate` nay là dead production code
`src/core/physics/broadphase.ts:134`, export ở `src/core/index.ts:93`. Sau NJ-2, `step.ts` chỉ dùng `collectBrickCandidatesInto`; caller còn lại là `tests/physics.broadphase.test.ts:30` và re-export. Nó cũng đúng là API dạng callback mà guard không kiểm được và mà `step.ts:643-644` cảnh báo không nên dùng.

### NK-5 — **LOW** — `createMemoryAudioService` tính tally không dùng
`src/services/audio/expoAudioService.ts:200-206` — `tallies.set(...)` dựng số đếm nhưng vòng `:206` chỉ dùng `tallies.keys()`. Comment mới nói "tallies count is for gain bump in real service" — nhưng đây là test double, nơi số đếm không bao giờ được dùng. Warning NG-18 được dọn đúng cách nhưng để lại phép tính chết.

### NK-6 — **LOW** — `World.scratchSweep`/`scratchVel` là dependency cứng mới, **zero test coverage**
`src/core/step.ts:412-419` dereference và ghi vô điều kiện. `grep -rn "scratchSweep\|scratchVel" tests/` → **không match**; `tests/physics.world-shape.test.ts` không liệt kê hai field này. TypeScript cover phần construction, nhưng không gì pin invariant.
**Fix:** thêm hai field vào world-shape test, và assert **identity** qua hai lần `stepWorld` (`const a = w.scratchVel; stepWorld(…); expect(w.scratchVel).toBe(a)`) — đó chính là hợp đồng allocation phát biểu dưới dạng tính chất kiểm được.

### NK-7 — **LOW** — Công thức verify trong `HOSTING.md` không thể phát hiện kênh liên hệ đã chết
`docs/store/HOSTING.md:18-19`. Grep mở rộng `github.com/dexter292/bricks_breaker/issues|github.com/dexter292` **khớp** cả URL bị chặn tạo issue và cả trang profile trống. Công thức verify rằng một *chuỗi* được serve — vốn chưa bao giờ là câu hỏi của F-55/NJ-3.
**Fix:** trỏ policy tới kênh hoạt động **không cần tài khoản GitHub** (email hỗ trợ là đáp án theo quy ước store), và cho công thức assert chính kênh đó; tối thiểu là bỏ `issues` khỏi Contact và để Discussions lên đầu.

---

## 4. Còn mở

| ID | Verdict | Ghi chú |
|---|---|---|
| **F-43** component/integration test | **NOT FIXED — vòng thứ năm** | Không `@testing-library/*`, không `react-test-renderer`, không `jest-expo`; **zero file `.test.tsx`**; `vitest.config.ts:5` là `environment: 'node'` không jsdom nên một render test **không thể chạy** dù có viết. Lần chạm `app/` duy nhất trong toàn suite là `readFileSync` ở `tests/constants.parity.test.ts:78` |
| **NG-20** 360/640 inline | **NOT FIXED** | `git diff 06864eb..098921a -- src app \| grep '360\|640'` → **rỗng**. 9 file inline; parity test cover **2**. Có **ba** định nghĩa độc lập của 360 (`core/constants.ts:17`, `input/constants.ts:8`, `recordSprites.ts:12`), và `recordSprites.ts` định nghĩa `LOGICAL_W/H` ở `:12-13` rồi **bỏ qua chúng** ở `:72,228,250` |
| **NH-4** thứ tự dispose glow atlas | **NOT FIXED** | `PlayingHost.tsx:310-316` vẫn `setTimeout(…, 32)`. Rò rỉ-khi-hủy đã sửa; tính tất định thì không. `try/catch` ở `:55-59` ("native teardown raced") là lời tự thừa nhận của code |
| **NH-7** F-23 supersession | **PARTIALLY FIXED** | Ghi ở `stall.ts:93`, `rules.stall.test.ts:136`, `DEFERRED-ITEMS.md:13`. **Chưa** ghi nơi hợp đồng thật sống: `05-05-PLAN.md:81` vẫn "toward steeper"; `REMEDIATION-PLAN.md:140-141` vẫn *quy định* hành vi đã bị thay; `REQUIREMENTS-MATRIX.md:83` vẫn liệt F-23 là defect sống |
| **NF-18f** `useFonts` trùng | **NOT FIXED** | `GameHost.tsx:24` và `PlayingHost.tsx:91`; chỉ thêm comment biện minh — comment ≠ fix, và nếu là waiver thì chưa được ghi vào `DEFERRED-ITEMS.md` |
| **NF-15** lỗ lint PlayingHost | **PARTIALLY FIXED** | Blanket `'off'` đã bỏ; nhưng flat config **thay thế** options nên `eslint.config.js:122-137` (2 selector) khiến PlayingHost vẫn miễn cả hai selector `runOnJS`. Và một blanket `'off'` thật **vẫn còn** ở `:114-117` cho `eventBridge.ts` |
| **F-03** gate quy trình | **PARTIALLY FIXED** | CI đóng nửa "không enforce cơ học". Nửa authoring **không đổi**: PLAN-CHECK 2/8, REVIEW 3/8, thiếu `01-PATTERNS.md`, `nyquist_compliant: false` ×5, sign-off trống ở `03`/`04-VALIDATION.md` trong khi ROADMAP ghi Complete — và **không có waiver viết ra** |
| F-21, F-29, F-40, F-45, F-54, F-59 | **NOT FIXED** | serve thẳng đứng (code đã trung thực, `REQUIREMENTS.md:16` vẫn overclaim "aimed release/tap"); `CLIFF_RAMP` 0 consumer; provenance SFX vẫn là heading "fill before store submit"; không speed ramp (hoãn có chủ ý, đã ghi nhận); trademark "Not obtained" **và chuỗi đã clear ("Neon Brick Breaker") ≠ identifier đang ship (`bricks-breaker`)**; `skia-version-decision.md:6` vẫn "Confirmed" trái tiêu chí `:20` |
| **NF-18d** phụ | ⚠️ | `PROJECT.md:32` nay `[x]` cho "progressive difficulty" trong khi **không có speed ramp** và band thời lượng đã bị bỏ. Bookkeeping đúng, nội dung không |

---

## 5. CI: đủ làm hàng rào regression, chưa đủ làm ship gate

**Có gate:** typecheck, lint, toàn bộ vitest suite, worklet guard + self-check (qua chuỗi `&&` trong `npm test`), Skia pin, privacy manifest — trên push-to-main và mọi PR. Đây là bước tiến thật so với "không có CI".

**Chưa gate:**
1. **Không coverage gate** — `@vitest/coverage-v8` đã cài mà không bao giờ được gọi. Với một suite nặng grep-source, coverage là con số duy nhất sẽ phơi ra điều đó.
2. **Không verify build native.** Một job `ubuntu-latest` duy nhất; không `expo prebuild`, không `npx expo config`, không EAS build, không macOS runner. Các assert Skia/xcprivacy là kiểm tra file — **không gì chứng minh app còn build được**. Với một app React Native đây là lỗ lớn nhất.
3. Không gate harness solvability level (chưa tồn tại), không `permissions:`/`concurrency:`/`timeout`.

---

## 6. Hiệu năng

Allocation core-sim mỗi frame, đo bằng instrument trên bản transpile, bot bám ball 20.000 frame:

| | #05 | **#06** |
|---|---|---|
| `sweepOut` per `stepWorld` | 1,88/frame | **0** |
| `velOut` per `stepWorld` | 1,88/frame | **0** |
| `floorOut` trong escape | 1/lần bắn | **0** |
| 4 array literal trong escape | 4/lần bắn | 4/lần bắn — nhưng **đo được 0 lần bắn** trong 20.000 frame |
| **Tổng core sim** | **≈3,8/frame** | **0,00/frame** |

Ngoài core: 1 `SkPicture`/frame (bản chất Skia); chrome publish **0** (in-place + `chromeSeq` chỉ bump khi đổi); object ở `PlayingHost.tsx:435` đo được 0,0129/frame; `new Int16Array` của audio hop 0,0307/frame (chính đáng).

**Caveat không thể giải trong môi trường audit:** `World` đi qua UI thread dưới dạng SharedValue. Nếu Reanimated re-materialise object lồng nhau khi truy cập thì `world.scratchSweep`/`scratchVel` có thể là object mới mỗi frame **trên thiết bị**, tái lập allocation một cách vô hình với test Node — đúng mối nguy mà comment bị xóa ở `step.ts:407-408` đã cảnh báo. Liên quan trực tiếp tới NK-1. **Cần device profile.**

**Certification vẫn UNPROVEN** — mọi ô `phase8-certification.md` là `PENDING_DEVICE`. Nhưng các điều kiện tiên quyết về code nay đã đóng gần hết.

---

## 7. Sáu việc ưu tiên

1. **F-43 — cài renderer.** `react-test-renderer` hoặc `@testing-library/react-native`, thêm một project vitest với `environment: 'jsdom'` và `include: ['tests/**/*.test.tsx']`. Đây là mục duy nhất, sau **năm vòng**, khiến NG-20 / NH-4 / NF-11 / NK-3 cứ tái diễn — mọi "hợp đồng" tầng UI đang được enforce bằng grep vì không có gì chạy được tầng đó.
2. **NK-3** — xóa `tests/runtime.chrome-reaction.test.ts`; tách publish step thành pure helper trong `src/runtime/` rồi assert cái đó.
3. **NK-2** — cho guard coi callback của `useAnimatedReaction`/`useFrameCallback`/`useAnimatedStyle`/`useDerivedValue`/`Gesture.*` là worklet root. Ba callback trong `PlayingHost.tsx` đang không được bảo vệ.
4. **NK-1** — hòa giải: hoặc `stall.ts` dùng `world.scratchVel` và xóa wrapper, hoặc phục hồi comment trung thực. Hiện `resolve.ts:9` nói một điều mà `stall.ts:83` phủ định.
5. **NJ-3 + NK-7** — đặt một email hỗ trợ vào policy (kênh không cần tài khoản GitHub), và cho công thức verify assert đúng kênh đó.
6. **CI**: thêm coverage threshold và một job verify build (`expo prebuild` / `npx expo config`). Hiện CI không thể phát hiện app hỏng build.

---

## 8. Nhận định

Đây là đợt mạnh nhất về **hạ tầng kiểm chứng** — và đó đúng là thứ năm vòng trước còn thiếu. Ba mục đóng lần này có giá trị lâu dài hơn bất kỳ fix gameplay nào: **guard worklet nay thật** (tôi tái lập lỗi NF-1 và nó báo đỏ), **CI tồn tại và sẽ chạy**, **dependency được khai báo** nên `npm ci` không phụ thuộc may mắn hoisting. Cộng thêm NJ-2 (được chứng minh bằng differential execution), NJ-5 nửa allocation (đo 0/frame trên 20.000 frame chơi thật), F-39 về 0 WARN, và NF-16 dùng đúng setting chính thức của plugin.

Ba điều cần nói thẳng:

- **NG-16 là regression.** `runtime.chrome-reaction.test.ts` từ một grep trên file thật thành một **bản sao logic tự assert chính nó**, không import gì từ `src/`. Nó sẽ pass nếu `useGameLoop.ts` bị xóa. Remediation làm test *trông* mạnh hơn nhưng *yếu* hơn.
- **Guard mới mù đúng chỗ code này viết như vậy.** `app/` không có một directive `'worklet'` nào, nên cả ba callback `useAnimatedReaction` — code UI-thread hay bị sửa nhất — nằm ngoài tầm guard.
- **F-43 vẫn là No, vòng thứ năm.** Và nó là nguyên nhân gốc chung của NG-20, NH-4, NF-11, NK-3: không có harness chạy được tầng UI, nên mọi hợp đồng tầng UI đều được enforce bằng string matching. Đợt này cải thiện các grep; nó chưa dựng harness.

Khuôn mẫu của cả sáu vòng, nói ngắn: **sửa lỗi thì tốt, và nay hạ tầng kiểm chứng cũng đã tốt — trừ đúng một lớp.** Cài một renderer là việc nhỏ hơn nhiều so với những gì đã làm, và nó là thứ duy nhất sẽ chấm dứt chuỗi tái diễn này.
