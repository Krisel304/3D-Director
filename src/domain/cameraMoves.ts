import * as THREE from "three";
import type { SceneCamera, Vec3 } from "./projectTypes";

export const CAMERA_MOVE_PRESETS = [
  { id: "push-in", label: "镜头推进", description: "沿镜头方向靠近主体" },
  { id: "pull-back", label: "镜头后移", description: "沿镜头反方向拉远" },
  { id: "truck-left", label: "镜头左移", description: "横向移动并保持构图" },
  { id: "truck-right", label: "镜头右移", description: "横向移动并保持构图" },
  { id: "pan-left", label: "镜头左摇", description: "固定机位向左转场" },
  { id: "pan-right", label: "镜头右摇", description: "固定机位向右转场" },
  { id: "crane-up", label: "镜头上升", description: "抬升机位俯看画面" },
  { id: "crane-down", label: "镜头下降", description: "降低机位贴近画面" },
  { id: "orbit-left", label: "镜头左环绕", description: "围绕主体向左环绕" },
  { id: "orbit-right", label: "镜头右环绕", description: "围绕主体向右环绕" },
] as const;

export type CameraMovePresetId = (typeof CAMERA_MOVE_PRESETS)[number]["id"];

const vectorToTuple = (vector: THREE.Vector3): Vec3 => [vector.x, vector.y, vector.z];

function getLookAtRotation(position: THREE.Vector3, target: THREE.Vector3): Vec3 {
  const rig = new THREE.Object3D();
  rig.position.copy(position);
  rig.lookAt(target);
  return [rig.rotation.x, rig.rotation.y, rig.rotation.z];
}

function rotateOnGround(vector: THREE.Vector3, radians: number) {
  return vector.applyAxisAngle(new THREE.Vector3(0, 1, 0), radians);
}

export function getCameraMoveEndState(
  source: SceneCamera,
  presetId: CameraMovePresetId,
): SceneCamera {
  const position = new THREE.Vector3(...source.position);
  const target = new THREE.Vector3(...source.target);
  const forward = target.clone().sub(position);
  if (forward.lengthSq() < 0.0001) forward.set(0, 0, -1);
  const distance = forward.length();
  const horizontalForward = forward.clone().setY(0).normalize();
  if (horizontalForward.lengthSq() < 0.0001) horizontalForward.set(0, 0, -1);
  const right = new THREE.Vector3(-horizontalForward.z, 0, horizontalForward.x);
  const nextPosition = position.clone();
  const nextTarget = target.clone();
  let nextFov = source.fov;

  switch (presetId) {
    case "push-in":
      nextPosition.add(forward.normalize().multiplyScalar(Math.min(2.4, Math.max(0.6, distance * 0.3))));
      nextFov = Math.max(18, source.fov - 4);
      break;
    case "pull-back":
      nextPosition.add(forward.normalize().multiplyScalar(-Math.min(2.4, Math.max(0.6, distance * 0.3))));
      nextFov = Math.min(90, source.fov + 4);
      break;
    case "truck-left":
      nextPosition.add(right.clone().multiplyScalar(-1.8));
      nextTarget.add(right.clone().multiplyScalar(-1.8));
      break;
    case "truck-right":
      nextPosition.add(right.clone().multiplyScalar(1.8));
      nextTarget.add(right.clone().multiplyScalar(1.8));
      break;
    case "pan-left":
      nextTarget.copy(position).add(rotateOnGround(forward.clone(), Math.PI / 9));
      break;
    case "pan-right":
      nextTarget.copy(position).add(rotateOnGround(forward.clone(), -Math.PI / 9));
      break;
    case "crane-up":
      nextPosition.y += 2;
      nextTarget.y += 0.6;
      break;
    case "crane-down":
      nextPosition.y -= 1.5;
      nextTarget.y -= 0.35;
      break;
    case "orbit-left": {
      const offset = position.clone().sub(target);
      nextPosition.copy(target).add(rotateOnGround(offset, Math.PI / 7));
      break;
    }
    case "orbit-right": {
      const offset = position.clone().sub(target);
      nextPosition.copy(target).add(rotateOnGround(offset, -Math.PI / 7));
      break;
    }
  }

  return {
    ...source,
    position: vectorToTuple(nextPosition),
    target: vectorToTuple(nextTarget),
    rotation: getLookAtRotation(nextPosition, nextTarget),
    fov: nextFov,
  };
}
