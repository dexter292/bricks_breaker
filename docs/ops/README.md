# `docs/ops/` — chỉ mục runbook

**Cập nhật:** 2026-09-24

> **Trạng thái dự án ở [`/README.md`](../../README.md).** Trang này chỉ là bản đồ runbook.

Quy trình chạy tay. Ngưỡng và verdict **không** sống ở đây — chúng ở [`docs/measurement-methodology.md`](../measurement-methodology.md) và [`docs/phase8-certification.md`](../phase8-certification.md). Các file dưới chỉ nói **cách chạy** và **chép kết quả vào đâu**.

---

## Runbook đo đạc — Milestone A

| Runbook | Gate | Trạng thái |
|---|---|---|
| [CEILING-CERT.md](./CEILING-CERT.md) | `G2.16` · `N-PLT-02` | **A1 PASS** theo bar 60 FPS (owner lock 2026-09-24). Floor mid-tier vẫn `NOT RUN` (`R-10`) |
| [SOAK-PHYSICAL.md](./SOAK-PHYSICAL.md) | `G2.3` · `N-PLT-03` | **PASS** trên iPhone 16 Pro (dev-client). Không dùng để claim release RSS (`R-19`) |
| [QUALITY-TIER.md](./QUALITY-TIER.md) | `N-TIER-01` | ⚠️ **Rủi ro chưa đóng** (`R-12`) — iPhone 4 GB nhận ngân sách Mid chỉ được cert trên A18 Pro. Owner chưa chọn phương án |

## Runbook vận hành — Milestone A4

| Runbook | Requirement | Trạng thái |
|---|---|---|
| [CRASH-REPORTING.md](./CRASH-REPORTING.md) | `N-OPS-01` · **Must trước G1** | Code đã wire; **chờ Sentry project + DSN**. Bảng event ID còn `_pending_` |
| [UPDATE-STRATEGY.md](./UPDATE-STRATEGY.md) | `N-OPS-02` · Must trước G2 | **Đóng** — chọn resubmit-only, ghi thành văn |
| [SDK-CADENCE.md](./SDK-CADENCE.md) | `N-OPS-03` · Should | **Đóng** — review tiếp theo 2026-10-22 |

## Runbook playtest — A3

| Runbook | Nội dung |
|---|---|
| [A3-COHORT-RUNBOOK.md](./A3-COHORT-RUNBOOK.md) | Cách tổ chức cohort ≥5 người chơi lần đầu |
| [PLAYTEST-FORM-A3.md](./PLAYTEST-FORM-A3.md) | Phiếu. **Câu Q4 serve-agency là bắt buộc** — nó quyết `D3` (aimed serve). Lựa chọn *"không để ý"* mới là đáp án quan trọng nhất |

**A3 đang 0/5.** Đây là hạng mục lead-time dài nhất trong Milestone A, và nó chặn `D3` + `G2.11` + tên hiển thị.

## Ghi chú thiết kế — phase gameplay đang làm

Không phải runbook; là đặc tả cho code đang viết.

| Tài liệu | Phase | Requirement |
|---|---|---|
| [EXPLOSIVE-BRICKS.md](./EXPLOSIVE-BRICKS.md) | B1 | `N-BRK-01` |
| [POWERUPS-B2.md](./POWERUPS-B2.md) | B2 | `N-PWR-01`, `-02`, `-04` |
| [FIREBALL-B3.md](./FIREBALL-B3.md) | B3 | `N-PWR-03` |
| [PROGRESS-STORAGE.md](./PROGRESS-STORAGE.md) | C1 | `N-PROG-01`…`04` |

> ⚠️ **`R-28`** — B1/B2/B3 đang thay đổi chồng nhau trong một working tree, và `ROADMAP-NEXT` ghi B3 *"serialize with physics hot path"*. Hệ quả đã thấy: bug `R-24` mất một vòng để định vị vì `git bisect` không dùng được. Nên tách commit.

---

## Luật chung cho mọi runbook ở đây

1. **Simulator không bao giờ tính** cho gate thiết bị (D-05).
2. **Số trên Metro là harness signal**, không discharge gate nào — chỉ Instruments / `gfxinfo` mới tính.
3. **≥2 run × ≥30 s, lấy run tệ hơn**, bỏ ~2 s đầu.
4. Chép kết quả vào `docs/phase8-certification.md` — runbook không phải nơi giữ verdict.
5. Khi một công cụ mới ra đời, **chứng minh nó biết báo đỏ** trước khi tin nó xanh. Tiền lệ: `assert-level-solvability` (`level-02` là negative fixture) và `assert-eas-profiles` (self-check hai chiều).
