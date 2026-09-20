/**
 * Public input surface for app/GameHost composition.
 * Values + types only — no core or runtime re-exports (LC-05).
 */
export {
  usePaddleGesture,
  type PaddleGestureHandle,
  type PaddleGestureOptions,
} from './usePaddleGesture';
export { computeRelativePaddleX, clampPaddleCenter } from './paddleIntent';
export { shouldAcceptServeTap, shouldAcceptResumeTap } from './gestureGates';
export {
  PADDLE_GAIN,
  SMOOTH_ALPHA,
  PAN_MIN_DISTANCE_PX,
  TAP_MAX_DISTANCE_PX,
  LOGICAL_WIDTH_VU,
} from './constants';
