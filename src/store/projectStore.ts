import * as THREE from "three";
import { create } from "zustand";
import {
  applyAnimationToProjectState,
  clampAnimationDuration,
  clampAnimationFps,
  clampAnimationTime,
  clearAnimationInPoint,
  clearAnimationOutPoint,
  moveCameraCuts,
  moveTimelineKeyframes,
  normalizeAnimationRangePoints,
  resizeCameraCut,
  recordBoneRotationChannel,
  recordCameraChannels,
  recordIkTargetChannel,
  recordObjectTransformChannels,
  removeCameraCuts,
  removeTimelineKeyframes,
  setAnimationInPoint,
  setAnimationOutPoint,
  upsertAnimationCameraCut,
} from "../domain/animationTimeline";
import {
  getCameraMoveEndState,
  type CameraMovePresetId,
} from "../domain/cameraMoves";
import { defaultProject } from "../domain/defaultProject";
import { getIkControlBones, isIkControlBoneName } from "../domain/rigUtils";
import type {
  AssetRecord,
  AnimationCameraCut,
  BoneRecord,
  IkChainRecord,
  MaterialOverride,
  ObjectRig,
  OutputFrame,
  ProjectState,
  SceneCamera,
  SceneGroup,
  SceneObject,
  SpaceScene,
  SpaceSceneTheme,
  SnapshotRecord,
  TimelineKeyframeSelection,
  TimelineKeyframeRef,
  ToolMode,
  TransformMode,
  Vec3,
  WorldSettings,
} from "../domain/projectTypes";

type ProjectStore = ProjectState & {
  setActiveTool: (tool: ToolMode) => void;
  setTransformMode: (mode: TransformMode) => void;
  setOutputFrame: (frame: OutputFrame) => void;
  clearSelection: () => void;
  toggleAssetSelection: (assetId: string, assetType: "object" | "camera", additive?: boolean) => void;
  selectGroup: (groupId: string) => void;
  createGroup: () => void;
  renameGroup: (groupId: string, name: string) => void;
  addAssetsToGroup: (groupId: string, objectIds: string[], cameraIds: string[]) => void;
  removeAssetsFromGroup: (groupId: string, objectIds: string[], cameraIds: string[]) => void;
  ungroup: (groupId: string) => void;
  removeGroup: (groupId: string) => void;
  alignGroup: (groupId: string, mode: "center" | "top" | "bottom" | "ground") => void;
  toggleGroupVisible: (groupId: string) => void;
  toggleGroupLocked: (groupId: string) => void;
  duplicateObject: (objectId: string) => void;
  duplicateCamera: (cameraId: string) => void;
  duplicateGroup: (groupId: string) => void;
  setAnimationTrajectoryControlPoint: (
    bindingId: string,
    startKeyframeId: string,
    endKeyframeId: string,
    controlPoint: Vec3,
  ) => void;
  clearTimelineSelection: () => void;
  setSelectedTimelineKeyframe: (selection?: TimelineKeyframeSelection) => void;
  setActiveObject: (objectId?: string) => void;
  setActiveCamera: (cameraId: string) => void;
  setCameraPreviewActive: (active: boolean) => void;
  addCamera: (camera?: Partial<SceneCamera>) => void;
  reorderCamera: (cameraId: string, direction: -1 | 1) => void;
  updateCamera: (cameraId: string, updates: Partial<SceneCamera>) => void;
  updateWorldSettings: (updates: Partial<WorldSettings>) => void;
  setWorldPanoramaAsset: (asset?: AssetRecord) => void;
  createSpaceScene: (prompt: string, theme?: SpaceSceneTheme) => string;
  completeSpaceScene: (sceneId: string) => void;
  activateSpaceScene: (sceneId: string) => void;
  removeSpaceScene: (sceneId: string) => void;
  toggleCameraVisible: (cameraId: string) => void;
  toggleCameraLocked: (cameraId: string) => void;
  removeCamera: (cameraId: string) => void;
  setObjectRigMode: (objectId: string, mode: ObjectRig["mode"]) => void;
  toggleObjectSkeletonVisible: (objectId: string) => void;
  setActiveBone: (objectId: string, boneId?: string) => void;
  updateBoneRotation: (objectId: string, boneId: string, rotation: Vec3) => void;
  updateBonePosition: (objectId: string, boneId: string, position: Vec3) => void;
  createIkChain: (
    objectId: string,
    rootBoneId: string,
    effectorBoneId: string,
  ) => { ok: true; chainId: string } | { ok: false; message: string };
  setActiveIkChain: (objectId: string, chainId?: string) => void;
  updateIkChain: (
    objectId: string,
    chainId: string,
    updates: Partial<IkChainRecord>,
  ) => void;
  removeIkChain: (objectId: string, chainId: string) => void;
  updateObject: (objectId: string, updates: Partial<SceneObject>) => void;
  reorderObject: (objectId: string, direction: -1 | 1) => void;
  updateObjectTransform: (
    objectId: string,
    transform: Partial<Pick<SceneObject, "position" | "rotation" | "scale">>,
  ) => void;
  updateObjectMetrics: (
    objectId: string,
    updates: Partial<Pick<SceneObject, "actualDimensions">>,
  ) => void;
  toggleObjectVisible: (objectId: string) => void;
  toggleObjectLocked: (objectId: string) => void;
  toggleObjectBoundsVisible: (objectId: string) => void;
  removeObject: (objectId: string) => void;
  updateObjectMaterial: (
    objectId: string,
    materialId: string,
    updates: Partial<MaterialOverride>,
  ) => void;
  addAsset: (asset: AssetRecord) => void;
  addSceneObject: (object: SceneObject) => void;
  addImportedModel: (asset: AssetRecord, object: SceneObject) => void;
  addSnapshot: (snapshot: SnapshotRecord) => void;
  removeSnapshot: (snapshotId: string) => void;
  setAnimationTime: (time: number) => void;
  setAnimationPlaying: (playing: boolean) => void;
  toggleAnimationPlayback: () => void;
  toggleAnimationLoop: () => void;
  setAnimationAutoKeyEnabled: (enabled: boolean) => void;
  setAnimationAutoKeyMode: (mode: ProjectState["animation"]["autoKeyMode"]) => void;
  setAnimationDuration: (duration: number) => void;
  setAnimationFps: (fps: number) => void;
  setAnimationInPoint: (time: number) => void;
  setAnimationOutPoint: (time: number) => void;
  clearAnimationInPoint: () => void;
  clearAnimationOutPoint: () => void;
  setAnimationInPointToCurrentTime: () => void;
  setAnimationOutPointToCurrentTime: () => void;
  stepAnimation: (deltaSeconds: number) => void;
  captureCurrentKeyframe: () => { ok: true } | { ok: false; message: string };
  captureSelectedAssetsKeyframes: () => { ok: true; count: number; bindings: ProjectState["animation"]["bindings"] } | { ok: false; message: string };
  applyCameraMovePreset: (
    cameraId: string,
    presetId: CameraMovePresetId,
  ) => { ok: true; startTime: number; endTime: number } | { ok: false; message: string };
  addCurrentCameraCut: () => { ok: true } | { ok: false; message: string };
  addCameraCutAtTime: (cameraId: string) => { ok: true } | { ok: false; message: string };
  removeSelectedTimelineKeyframe: (refs: TimelineKeyframeRef[]) => void;
  moveSelectedTimelineKeyframe: (refs: TimelineKeyframeRef[], time: number) => void;
  resizeCameraCutClip: (
    cutId: string,
    edge: "start" | "end",
    time: number,
  ) => void;
  setImportError: (message?: string) => void;
  releaseRuntimeAssets: () => void;
};

function buildIkLinkIds(
  bones: BoneRecord[],
  rootBoneId: string,
  effectorBoneId: string,
) {
  const byId = new Map(bones.map((bone) => [bone.id, bone]));
  const linkIds: string[] = [];
  let current = byId.get(effectorBoneId);

  while (current?.parentId) {
    const parent = byId.get(current.parentId);
    if (!parent) {
      return undefined;
    }
    linkIds.push(parent.id);
    if (parent.id === rootBoneId) {
      return linkIds;
    }
    current = parent;
  }

  return undefined;
}

function getDefaultBoneId(bones: BoneRecord[]) {
  return bones.find((bone) => !bone.parentId)?.id ?? bones[0]?.id;
}

const spaceScenePalettes: Record<SpaceSceneTheme, { sky: string; ground: string; glow: string }> = {
  mist: { sky: "#e8eef5", ground: "#657487", glow: "#ffffff" },
  verdant: { sky: "#162d24", ground: "#3b7554", glow: "#a4e5ae" },
  amber: { sky: "#322517", ground: "#a46d28", glow: "#ffd58a" },
};

function createSpaceSceneAsset(id: string, name: string, theme: SpaceSceneTheme): AssetRecord {
  const palette = spaceScenePalettes[theme];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1024" viewBox="0 0 2048 1024"><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${palette.sky}"/><stop offset=".58" stop-color="${palette.ground}"/></linearGradient><radialGradient id="glow" cx="50%" cy="42%" r="46%"><stop stop-color="${palette.glow}" stop-opacity=".72"/><stop offset="1" stop-color="${palette.glow}" stop-opacity="0"/></radialGradient><pattern id="grid" width="96" height="64" patternUnits="userSpaceOnUse"><path d="M0 64 48 0 96 64M0 64h96" fill="none" stroke="#fff" stroke-opacity=".14"/></pattern></defs><rect width="2048" height="1024" fill="url(#sky)"/><rect width="2048" height="1024" fill="url(#glow)"/><rect y="550" width="2048" height="474" fill="url(#grid)" opacity=".58"/><path d="M0 555h2048" stroke="#fff" stroke-opacity=".35" stroke-width="3"/></svg>`;
  return {
    id,
    name,
    type: "panorama",
    objectUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    mimeType: "image/svg+xml",
    size: svg.length,
    createdAt: new Date().toISOString(),
  };
}

function applyAnimationState(state: ProjectState, time: number) {
  const nextTime = clampAnimationTime(time, state.animation.duration, state.animation.fps);
  const sampled = applyAnimationToProjectState(state, nextTime);
  return {
    ...sampled,
    animation: {
      ...state.animation,
      currentTime: nextTime,
    },
  };
}

function captureManualSelectionKeyframes(state: ProjectState) {
  const currentTime = clampAnimationTime(
    state.animation.currentTime,
    state.animation.duration,
    state.animation.fps,
  );
  const activeObject = state.activeObjectId
    ? state.objects.find((object) => object.id === state.activeObjectId)
    : undefined;
  const activeCamera = state.selectedCameraId
    ? state.cameras.find((camera) => camera.id === state.selectedCameraId)
    : undefined;

  if (activeObject?.rig?.hasSkeleton && activeObject.rig.boneControlActive) {
    if (activeObject.rig.mode === "fk" && activeObject.rig.activeBoneId) {
      const activeBone = activeObject.rig.bones.find(
        (bone) => bone.id === activeObject.rig?.activeBoneId,
      );
      if (!activeBone) {
        return { ok: false as const, message: "当前骨骼不存在，无法记录关键帧" };
      }
      return {
        ok: true as const,
        bindings: recordBoneRotationChannel(
          state.animation.bindings,
          activeObject,
          activeBone,
          currentTime,
        ),
      };
    }

    if (activeObject.rig.mode === "ik" && activeObject.rig.activeIkChainId) {
      const activeChain = activeObject.rig.ikChains.find(
        (chain) => chain.id === activeObject.rig?.activeIkChainId,
      );
      if (!activeChain) {
        return { ok: false as const, message: "当前 IK 节点不存在，无法记录关键帧" };
      }
      return {
        ok: true as const,
        bindings: recordIkTargetChannel(
          state.animation.bindings,
          activeObject,
          activeChain,
          currentTime,
        ),
      };
    }
  }

  if (activeObject) {
    return {
      ok: true as const,
      bindings: recordObjectTransformChannels(
        state.animation.bindings,
        activeObject,
        currentTime,
      ),
    };
  }

  if (activeCamera) {
    return {
      ok: true as const,
      bindings: recordCameraChannels(state.animation.bindings, activeCamera, currentTime),
    };
  }

  return { ok: false as const, message: "请先选择对象、机位或骨骼控制节点" };
}

function captureCameraCut(state: ProjectState) {
  const cameraId = state.selectedCameraId ?? state.activeCameraId;
  return captureCameraCutForCamera(state, cameraId);
}

function captureCameraCutForCamera(state: ProjectState, cameraId?: string) {
  if (!cameraId) {
    return { ok: false as const, message: "请先选择一个机位，再添加机位序列" };
  }
  return {
    ok: true as const,
    cameraCuts: upsertAnimationCameraCut(
      state.animation.cameraCuts,
      cameraId,
      clampAnimationTime(
        state.animation.currentTime,
        state.animation.duration,
        state.animation.fps,
      ),
      state.animation.duration,
      state.animation.fps,
    ),
  };
}

function getCameraMoveRange(state: ProjectState, cameraId: string) {
  const duration = clampAnimationDuration(state.animation.duration);
  const fps = clampAnimationFps(state.animation.fps);
  const frameDuration = 1 / fps;
  const currentTime = clampAnimationTime(state.animation.currentTime, duration, fps);
  const binding = state.animation.bindings.find(
    (item) => item.targetType === "camera" && item.targetId === cameraId,
  );
  const keyframeTimes = Array.from(
    new Set(
      binding?.channels.flatMap((channel) => channel.keyframes.map((keyframe) => keyframe.time)) ?? [],
    ),
  ).sort((left, right) => left - right);
  const previousTime = [...keyframeTimes].reverse().find((time) => time < currentTime - frameDuration / 2);
  const nextTime = keyframeTimes.find((time) => time > currentTime + frameDuration / 2);
  const startsInsideSegment = previousTime !== undefined && nextTime !== undefined;
  const startTime = startsInsideSegment ? nextTime : currentTime;
  const nextBlockingTime = keyframeTimes.find((time) => time > startTime + frameDuration / 2);
  const desiredEndTime = Math.min(duration, startTime + 3);
  const endTime =
    nextBlockingTime !== undefined && nextBlockingTime < desiredEndTime
      ? Math.max(startTime, nextBlockingTime - frameDuration)
      : desiredEndTime;

  if (endTime - startTime < frameDuration / 2) {
    return { ok: false as const, message: "当前机位后方没有足够空间添加 3 秒运镜" };
  }
  return { ok: true as const, startTime, endTime };
}

function normalizeExistingCameraCuts(
  cameraCuts: AnimationCameraCut[],
  duration: number,
  fps: number,
) {
  return cameraCuts.map((existing) => {
    const startTime = clampAnimationTime(
      existing.startTime ?? existing.time ?? 0,
      duration,
      fps,
    );
    return {
      ...existing,
      startTime,
      endTime: startTime,
      time: startTime,
    };
  });
}

function removeTimelineTarget(
  animation: ProjectState["animation"],
  targetType: "object" | "camera",
  targetId: string,
) {
  return {
    ...animation,
    bindings: animation.bindings.filter(
      (binding) => binding.targetType !== targetType || binding.targetId !== targetId,
    ),
    cameraCuts:
      targetType === "camera"
        ? animation.cameraCuts.filter((cut) => cut.cameraId !== targetId)
        : animation.cameraCuts,
  };
}

function hasTimelineBinding(
  animation: ProjectState["animation"],
  targetType: "object" | "camera",
  targetId: string,
) {
  return animation.bindings.some(
    (binding) => binding.targetType === targetType && binding.targetId === targetId,
  );
}

function moveItemById<T extends { id: string }>(
  items: T[],
  id: string,
  direction: -1 | 1,
) {
  const index = items.findIndex((item) => item.id === id);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }
  const nextItems = [...items];
  const [item] = nextItems.splice(index, 1);
  nextItems.splice(nextIndex, 0, item);
  return nextItems;
}

function maybeAutoKeyObjectTransform(
  state: ProjectState,
  objectId: string,
  nextObjects: SceneObject[],
) {
  if (
    !state.animation.autoKeyEnabled ||
    state.activeObjectId !== objectId ||
    !hasTimelineBinding(state.animation, "object", objectId)
  ) {
    return state.animation;
  }
  const activeObject = nextObjects.find((object) => object.id === objectId);
  if (!activeObject) {
    return state.animation;
  }
  return {
    ...state.animation,
    bindings: recordObjectTransformChannels(
      state.animation.bindings,
      activeObject,
      state.animation.currentTime,
      state.animation.autoKeyMode,
    ),
  };
}

function maybeAutoKeyCamera(
  state: ProjectState,
  cameraId: string,
  nextCameras: SceneCamera[],
) {
  if (
    !state.animation.autoKeyEnabled ||
    (state.selectedCameraId !== cameraId && state.activeCameraId !== cameraId) ||
    !hasTimelineBinding(state.animation, "camera", cameraId)
  ) {
    return state.animation;
  }
  const activeCamera = nextCameras.find((camera) => camera.id === cameraId);
  if (!activeCamera) {
    return state.animation;
  }
  return {
    ...state.animation,
    bindings: recordCameraChannels(
      state.animation.bindings,
      activeCamera,
      state.animation.currentTime,
      state.animation.autoKeyMode,
    ),
  };
}

function maybeAutoKeyBone(
  state: ProjectState,
  objectId: string,
  boneId: string,
  nextObjects: SceneObject[],
) {
  if (
    !state.animation.autoKeyEnabled ||
    state.activeObjectId !== objectId ||
    !hasTimelineBinding(state.animation, "object", objectId)
  ) {
    return state.animation;
  }
  const activeObject = nextObjects.find((object) => object.id === objectId);
  const activeBone = activeObject?.rig?.bones.find((bone) => bone.id === boneId);
  if (!activeObject || !activeBone) {
    return state.animation;
  }
  return {
    ...state.animation,
    bindings: recordBoneRotationChannel(
      state.animation.bindings,
      activeObject,
      activeBone,
      state.animation.currentTime,
      state.animation.autoKeyMode,
    ),
  };
}

function maybeAutoKeyIkChain(
  state: ProjectState,
  objectId: string,
  chainId: string,
  nextObjects: SceneObject[],
) {
  if (
    !state.animation.autoKeyEnabled ||
    state.activeObjectId !== objectId ||
    !hasTimelineBinding(state.animation, "object", objectId)
  ) {
    return state.animation;
  }
  const activeObject = nextObjects.find((object) => object.id === objectId);
  const activeChain = activeObject?.rig?.ikChains.find((chain) => chain.id === chainId);
  if (!activeObject || !activeChain) {
    return state.animation;
  }
  return {
    ...state.animation,
    bindings: recordIkTargetChannel(
      state.animation.bindings,
      activeObject,
      activeChain,
      state.animation.currentTime,
      state.animation.autoKeyMode,
    ),
  };
}

const matrixPosition = new THREE.Vector3();
const matrixRotation = new THREE.Quaternion();
const matrixScale = new THREE.Vector3();
const previousMatrix = new THREE.Matrix4();
const nextMatrix = new THREE.Matrix4();
const deltaMatrix = new THREE.Matrix4();
const transformedTarget = new THREE.Vector3();

function applyObjectDeltaToTargetPosition(
  previousObject: Pick<SceneObject, "position" | "rotation" | "scale">,
  nextObject: Pick<SceneObject, "position" | "rotation" | "scale">,
  targetPosition: Vec3,
): Vec3 {
  previousMatrix.compose(
    matrixPosition.set(...previousObject.position),
    matrixRotation.setFromEuler(new THREE.Euler(...previousObject.rotation)),
    matrixScale.set(...previousObject.scale),
  );
  nextMatrix.compose(
    matrixPosition.set(...nextObject.position),
    matrixRotation.setFromEuler(new THREE.Euler(...nextObject.rotation)),
    matrixScale.set(...nextObject.scale),
  );
  deltaMatrix.copy(nextMatrix).multiply(previousMatrix.clone().invert());
  transformedTarget.set(...targetPosition).applyMatrix4(deltaMatrix);
  return [transformedTarget.x, transformedTarget.y, transformedTarget.z];
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  ...defaultProject,
  setActiveTool: (tool) => set({ activeTool: tool }),
  setTransformMode: (mode) => set({ transformMode: mode, activeTool: "move" }),
  setOutputFrame: (frame) => set({ outputFrame: frame, activeTool: "aspect" }),
  clearSelection: () =>
    set({
      activeObjectId: undefined,
      selectedCameraId: undefined,
      activeGroupId: undefined,
      selectedAssetIds: [],
    }),
  toggleAssetSelection: (assetId, assetType, additive = false) =>
    set((state) => {
      const key = `${assetType}:${assetId}`;
      const current = additive ? state.selectedAssetIds : [];
      const next = current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key];
      const nextObjectIds = next
        .filter((item) => item.startsWith("object:"))
        .map((item) => item.slice(7));
      const nextCameraIds = next
        .filter((item) => item.startsWith("camera:"))
        .map((item) => item.slice(7));
      return {
        activeObjectId: nextObjectIds.length === 1 ? nextObjectIds[0] : undefined,
        selectedCameraId: nextCameraIds.length === 1 ? nextCameraIds[0] : undefined,
        activeGroupId: undefined,
        selectedTimelineKeyframe: undefined,
        selectedAssetIds: next,
      };
    }),
  selectGroup: (groupId) =>
    set((state) => {
      const group = state.groups.find((item) => item.id === groupId);
      if (!group) {
        return state;
      }
      const selectedAssetIds = [
        ...state.objects
          .filter((item) => item.groupId === groupId)
          .map((item) => `object:${item.id}`),
        ...state.cameras
          .filter((item) => item.groupId === groupId)
          .map((item) => `camera:${item.id}`),
      ];
      return {
        activeGroupId: groupId,
        selectedAssetIds,
        activeObjectId: undefined,
        selectedCameraId: undefined,
        selectedTimelineKeyframe: undefined,
      };
    }),
  createGroup: () =>
    set((state) => {
      const group: SceneGroup = {
        id: `group_${crypto.randomUUID()}`,
        name: `组合 ${state.groups.length + 1}`,
        createdAt: Date.now(),
      };
      return { groups: [...state.groups, group], activeGroupId: group.id };
    }),
  renameGroup: (groupId, name) =>
    set((state) => ({
      groups: state.groups.map((group) =>
        group.id === groupId ? { ...group, name: name.trim() || group.name } : group,
      ),
    })),
  addAssetsToGroup: (groupId, objectIds, cameraIds) =>
    set((state) => ({
      objects: state.objects.map((item) =>
        objectIds.includes(item.id) ? { ...item, groupId } : item,
      ),
      cameras: state.cameras.map((item) =>
        cameraIds.includes(item.id) ? { ...item, groupId } : item,
      ),
      activeGroupId: groupId,
      selectedAssetIds: [
        ...objectIds.map((id) => `object:${id}`),
        ...cameraIds.map((id) => `camera:${id}`),
      ],
      activeObjectId: undefined,
      selectedCameraId: undefined,
    })),
  removeAssetsFromGroup: (groupId, objectIds, cameraIds) =>
    set((state) => ({
      objects: state.objects.map((item) =>
        item.groupId === groupId && objectIds.includes(item.id)
          ? { ...item, groupId: undefined }
          : item,
      ),
      cameras: state.cameras.map((item) =>
        item.groupId === groupId && cameraIds.includes(item.id)
          ? { ...item, groupId: undefined }
          : item,
      ),
      activeGroupId: undefined,
      selectedAssetIds: [
        ...objectIds.map((id) => `object:${id}`),
        ...cameraIds.map((id) => `camera:${id}`),
      ],
    })),
  ungroup: (groupId) =>
    set((state) => ({
      objects: state.objects.map((item) =>
        item.groupId === groupId ? { ...item, groupId: undefined } : item,
      ),
      cameras: state.cameras.map((item) =>
        item.groupId === groupId ? { ...item, groupId: undefined } : item,
      ),
      groups: state.groups.filter((item) => item.id !== groupId),
      activeGroupId: undefined,
      selectedAssetIds: [],
    })),
  removeGroup: (groupId) =>
    set((state) => {
      const objectIds = new Set(
        state.objects.filter((item) => item.groupId === groupId).map((item) => item.id),
      );
      const cameraIds = new Set(
        state.cameras.filter((item) => item.groupId === groupId).map((item) => item.id),
      );
      objectIds.forEach((id) => window.dispatchEvent(new CustomEvent("scene-object-remove-request", { detail: id })));
      cameraIds.forEach((id) => window.dispatchEvent(new CustomEvent("scene-camera-remove-request", { detail: id })));
      return {
        objects: state.objects.filter((item) => !objectIds.has(item.id)),
        cameras: state.cameras.filter((item) => !cameraIds.has(item.id)),
        groups: state.groups.filter((item) => item.id !== groupId),
        activeObjectId: undefined,
        selectedCameraId: undefined,
        activeCameraId: state.cameras.find((item) => !cameraIds.has(item.id))?.id,
        activeGroupId: undefined,
        selectedAssetIds: [],
        animation: {
          ...state.animation,
          bindings: state.animation.bindings.filter(
            (binding) =>
              !(binding.targetType === "object" && objectIds.has(binding.targetId)) &&
              !(binding.targetType === "camera" && cameraIds.has(binding.targetId)),
          ),
          cameraCuts: state.animation.cameraCuts.filter((cut) => !cameraIds.has(cut.cameraId)),
        },
      };
    }),
  alignGroup: (groupId, mode) =>
    set((state) => {
      const objects = state.objects.filter((item) => item.groupId === groupId);
      const cameras = state.cameras.filter((item) => item.groupId === groupId);
      const all = [...objects, ...cameras];
      if (!all.length) return state;
      const ys = all.map((item) => item.position[1]);
      const targetY = mode === "top" ? Math.max(...ys) : mode === "bottom" || mode === "ground" ? Math.min(...ys) : ys.reduce((sum, y) => sum + y, 0) / ys.length;
      return {
        objects: state.objects.map((item) =>
          item.groupId === groupId ? { ...item, position: [item.position[0], mode === "center" ? targetY : targetY, item.position[2]] as Vec3 } : item,
        ),
        cameras: state.cameras.map((item) =>
          item.groupId === groupId ? { ...item, position: [item.position[0], mode === "center" ? targetY : targetY, item.position[2]] as Vec3 } : item,
        ),
      };
    }),
  toggleGroupVisible: (groupId) =>
    set((state) => {
      const members = state.objects.filter((item) => item.groupId === groupId);
      const cameras = state.cameras.filter((item) => item.groupId === groupId);
      const nextVisible = [...members.map((item) => item.visible), ...cameras.map((item) => item.visible)].some(Boolean) ? false : true;
      return {
        objects: state.objects.map((item) => item.groupId === groupId ? { ...item, visible: nextVisible } : item),
        cameras: state.cameras.map((item) => item.groupId === groupId ? { ...item, visible: nextVisible } : item),
      };
    }),
  toggleGroupLocked: (groupId) =>
    set((state) => {
      const lockStates = [
        ...state.objects.filter((item) => item.groupId === groupId).map((item) => item.locked),
        ...state.cameras.filter((item) => item.groupId === groupId).map((item) => item.locked),
      ];
      const locked = lockStates.length > 0 && lockStates.every(Boolean);
      return {
        objects: state.objects.map((item) => item.groupId === groupId ? { ...item, locked: !locked } : item),
        cameras: state.cameras.map((item) => item.groupId === groupId ? { ...item, locked: !locked } : item),
      };
    }),
  duplicateObject: (objectId) =>
    set((state) => {
      const source = state.objects.find((item) => item.id === objectId);
      if (!source) return state;
      const id = `object_${crypto.randomUUID()}`;
      const clone: SceneObject = {
        ...source,
        id,
        name: `${source.name} 副本`,
        groupId: undefined,
        position: [source.position[0] + 0.8, source.position[1], source.position[2] + 0.8],
        rig: source.rig ? { ...source.rig, bones: source.rig.bones.map((bone) => ({ ...bone })), ikChains: source.rig.ikChains.map((chain) => ({ ...chain })) } : undefined,
      };
      return { objects: [...state.objects, clone], activeObjectId: id, selectedCameraId: undefined, selectedAssetIds: [`object:${id}`] };
    }),
  duplicateCamera: (cameraId) =>
    set((state) => {
      const source = state.cameras.find((item) => item.id === cameraId);
      if (!source) return state;
      const id = `camera_${crypto.randomUUID()}`;
      const clone: SceneCamera = { ...source, id, name: `${source.name} 副本`, groupId: undefined, position: [source.position[0] + 0.8, source.position[1], source.position[2] + 0.8] };
      return { cameras: [...state.cameras, clone], activeCameraId: id, selectedCameraId: id, activeObjectId: undefined, selectedAssetIds: [`camera:${id}`] };
    }),
  duplicateGroup: (groupId) =>
    set((state) => {
      const sourceGroup = state.groups.find((item) => item.id === groupId);
      if (!sourceGroup) return state;
      const newGroupId = `group_${crypto.randomUUID()}`;
      const objectClones = state.objects
        .filter((item) => item.groupId === groupId)
        .map((item) => ({
          ...item,
          id: `object_${crypto.randomUUID()}`,
          name: `${item.name} 副本`,
          groupId: newGroupId,
          position: [item.position[0] + 0.8, item.position[1], item.position[2] + 0.8] as Vec3,
          rig: item.rig ? {
            ...item.rig,
            bones: item.rig.bones.map((bone) => ({ ...bone })),
            ikChains: item.rig.ikChains.map((chain) => ({ ...chain })),
          } : undefined,
        }));
      const cameraClones = state.cameras
        .filter((item) => item.groupId === groupId)
        .map((item) => ({
          ...item,
          id: `camera_${crypto.randomUUID()}`,
          name: `${item.name} 副本`,
          groupId: newGroupId,
          position: [item.position[0] + 0.8, item.position[1], item.position[2] + 0.8] as Vec3,
        }));
      const group: SceneGroup = {
        id: newGroupId,
        name: `${sourceGroup.name} 副本`,
        createdAt: Date.now(),
      };
      return {
        groups: [...state.groups, group],
        objects: [...state.objects, ...objectClones],
        cameras: [...state.cameras, ...cameraClones],
        activeGroupId: newGroupId,
        activeObjectId: undefined,
        selectedCameraId: undefined,
        selectedAssetIds: [
          ...objectClones.map((item) => `object:${item.id}`),
          ...cameraClones.map((item) => `camera:${item.id}`),
        ],
      };
    }),
  setAnimationTrajectoryControlPoint: (bindingId, startKeyframeId, endKeyframeId, controlPoint) =>
    set((state) => ({
      animation: {
        ...state.animation,
        bindings: state.animation.bindings.map((binding) => {
          if (binding.id !== bindingId) return binding;
          const segments = binding.trajectorySegments ?? [];
          const existingIndex = segments.findIndex(
            (segment) =>
              segment.startKeyframeId === startKeyframeId &&
              segment.endKeyframeId === endKeyframeId,
          );
          const nextSegment = { startKeyframeId, endKeyframeId, controlPoint };
          return {
            ...binding,
            trajectorySegments:
              existingIndex >= 0
                ? segments.map((segment, index) => index === existingIndex ? nextSegment : segment)
                : [...segments, nextSegment],
          };
        }),
      },
    })),
  clearTimelineSelection: () => set({ selectedTimelineKeyframe: undefined }),
  setSelectedTimelineKeyframe: (selection) => set({ selectedTimelineKeyframe: selection }),
  setActiveObject: (objectId) =>
    set((state) => ({
      activeObjectId: objectId,
      selectedCameraId: undefined,
      selectedTimelineKeyframe: undefined,
      activeGroupId: undefined,
      selectedAssetIds: objectId ? [`object:${objectId}`] : [],
      objects: state.objects.map((object) =>
        object.id === objectId && object.rig
          ? {
              ...object,
              rig: {
                ...object.rig,
                boneControlActive: false,
              },
            }
          : object,
      ),
    })),
  setActiveCamera: (cameraId) =>
    set({
      activeCameraId: cameraId,
      selectedCameraId: cameraId,
      activeObjectId: undefined,
      selectedTimelineKeyframe: undefined,
      activeGroupId: undefined,
      selectedAssetIds: [`camera:${cameraId}`],
    }),
  setCameraPreviewActive: (active) => set({ cameraPreviewActive: active }),
  addCamera: (camera = {}) =>
    set((state) => {
      const index = state.cameras.length + 1;
      const id = camera.id ?? `camera_${crypto.randomUUID()}`;
      const nextCamera: SceneCamera = {
        id,
        name: camera.name ?? `相机${index}`,
        position: camera.position ?? [8, 5.2, 7.4],
        rotation: camera.rotation ?? [-0.7, 0.8, 0.5],
        target: camera.target ?? [0, 0, 0],
        targetMode: camera.targetMode ?? "manual",
        targetRefId: camera.targetRefId,
        targetRefType: camera.targetRefType,
        fov: camera.fov ?? 45,
        mode: camera.mode ?? "lookAt",
        visible: camera.visible ?? true,
        locked: camera.locked ?? false,
      };

      return {
        cameras: [...state.cameras, nextCamera],
        activeCameraId: id,
        selectedCameraId: id,
        activeObjectId: undefined,
      };
    }),
  reorderCamera: (cameraId, direction) =>
    set((state) => {
      const cameras = moveItemById(state.cameras, cameraId, direction);
      return {
        cameras,
      };
    }),
  updateCamera: (cameraId, updates) =>
    set((state) => {
      const cameras = state.cameras.map((camera) =>
        camera.id === cameraId ? { ...camera, ...updates } : camera,
      );
      return {
        cameras,
        animation: maybeAutoKeyCamera(state, cameraId, cameras),
      };
    }),
  updateWorldSettings: (updates) =>
    set((state) => {
      return {
        worldSettings: {
          ...state.worldSettings,
          ...updates,
          rootTransform: {
            ...state.worldSettings.rootTransform,
            ...updates.rootTransform,
          },
          snap: {
            ...state.worldSettings.snap,
            ...updates.snap,
          },
          ground: {
            ...state.worldSettings.ground,
            ...updates.ground,
          },
          panoramaSphere: {
            ...state.worldSettings.panoramaSphere,
            ...updates.panoramaSphere,
          },
        },
      };
    }),
  setWorldPanoramaAsset: (asset) =>
    set((state) => {
      const previousAsset = state.assets.find(
        (item) => item.id === state.worldSettings.panoramaSphere.assetId,
      );
      const previousAssetIsScene = state.spaceScenes.some(
        (scene) => scene.assetId === previousAsset?.id,
      );
      if (previousAsset && previousAsset.id !== asset?.id && !previousAssetIsScene) {
        URL.revokeObjectURL(previousAsset.objectUrl);
      }

      const nextAssets = asset
        ? [
            ...state.assets.filter((item) =>
              item.id !== asset.id &&
              (
                item.id !== state.worldSettings.panoramaSphere.assetId ||
                state.spaceScenes.some((scene) => scene.assetId === item.id)
              ),
            ),
            asset,
          ]
        : state.assets.filter(
            (item) =>
              item.id !== state.worldSettings.panoramaSphere.assetId ||
              state.spaceScenes.some((scene) => scene.assetId === item.id),
          );

      return {
        assets: nextAssets,
        worldSettings: {
          ...state.worldSettings,
          panoramaSphere: {
            ...state.worldSettings.panoramaSphere,
            assetId: asset?.id,
            visible: asset ? true : false,
          },
        },
      };
    }),
  createSpaceScene: (prompt, theme = "mist") => {
    const id = `space_scene_${crypto.randomUUID()}`;
    const assetId = `space_panorama_${crypto.randomUUID()}`;
    const sequence = get().spaceScenes.length + 1;
    const name = `场景${sequence}`;
    const scene: SpaceScene = {
      id,
      name,
      prompt: prompt.trim() || "未命名 3D 世界",
      theme,
      status: "generating",
      assetId,
      createdAt: new Date().toISOString(),
    };
    const asset = createSpaceSceneAsset(assetId, name, theme);
    set((state) => ({
      assets: [...state.assets.filter((item) => item.id !== assetId), asset],
      spaceScenes: [...state.spaceScenes, scene],
      activeSpaceSceneId: id,
      worldSettings: {
        ...state.worldSettings,
        panoramaSphere: {
          ...state.worldSettings.panoramaSphere,
          assetId,
          visible: true,
        },
      },
    }));
    return id;
  },
  completeSpaceScene: (sceneId) =>
    set((state) => ({
      spaceScenes: state.spaceScenes.map((scene) =>
        scene.id === sceneId ? { ...scene, status: "ready" } : scene,
      ),
    })),
  activateSpaceScene: (sceneId) =>
    set((state) => {
      const scene = state.spaceScenes.find((item) => item.id === sceneId);
      if (!scene) return state;
      return {
        activeSpaceSceneId: scene.id,
        worldSettings: {
          ...state.worldSettings,
          panoramaSphere: {
            ...state.worldSettings.panoramaSphere,
            assetId: scene.assetId,
            visible: true,
          },
        },
      };
    }),
  removeSpaceScene: (sceneId) =>
    set((state) => {
      const removed = state.spaceScenes.find((scene) => scene.id === sceneId);
      const spaceScenes = state.spaceScenes.filter((scene) => scene.id !== sceneId);
      const replacement =
        spaceScenes.find((scene) => scene.id === state.activeSpaceSceneId) ??
        spaceScenes[spaceScenes.length - 1];
      if (removed) {
        const asset = state.assets.find((item) => item.id === removed.assetId);
        if (asset) URL.revokeObjectURL(asset.objectUrl);
      }
      return {
        assets: state.assets.filter((asset) => asset.id !== removed?.assetId),
        spaceScenes,
        activeSpaceSceneId: replacement?.id,
        worldSettings: {
          ...state.worldSettings,
          panoramaSphere: {
            ...state.worldSettings.panoramaSphere,
            assetId: replacement?.assetId,
            visible: Boolean(replacement),
          },
        },
      };
    }),
  toggleCameraVisible: (cameraId) =>
    set((state) => ({
      cameras: state.cameras.map((camera) =>
        camera.id === cameraId ? { ...camera, visible: !camera.visible } : camera,
      ),
    })),
  toggleCameraLocked: (cameraId) =>
    set((state) => ({
      cameras: state.cameras.map((camera) =>
        camera.id === cameraId ? { ...camera, locked: !camera.locked } : camera,
      ),
    })),
  removeCamera: (cameraId) =>
    set((state) => {
      const nextCameras = state.cameras.filter((camera) => camera.id !== cameraId);
      const nextActiveCameraId =
        state.activeCameraId === cameraId
          ? nextCameras[0]?.id
          : state.activeCameraId ?? nextCameras[0]?.id;

      window.dispatchEvent(
        new CustomEvent("scene-camera-remove-request", {
          detail: cameraId,
        }),
      );

      return {
        cameras: nextCameras,
        activeCameraId: nextActiveCameraId,
        selectedCameraId:
          state.selectedCameraId === cameraId ? undefined : state.selectedCameraId,
        activeObjectId: undefined,
        cameraPreviewActive:
          state.activeCameraId === cameraId ? false : state.cameraPreviewActive,
        animation: removeTimelineTarget(state.animation, "camera", cameraId),
      };
    }),
  setObjectRigMode: (objectId, mode) =>
    set((state) => ({
      objects: state.objects.map((object) => {
        if (object.id !== objectId || !object.rig) {
          return object;
        }
        const activeBoneId =
          mode === "fk"
            ? object.rig.activeBoneId ?? getDefaultBoneId(object.rig.bones)
            : object.rig.activeBoneId &&
                object.rig.bones.some(
                  (bone) =>
                    bone.id === object.rig?.activeBoneId &&
                    isIkControlBoneName(bone.name),
                )
              ? object.rig.activeBoneId
              : getIkControlBones(object.rig.bones)[0]?.id;
        const activeIkChainId =
          mode === "ik"
            ? object.rig.activeIkChainId ?? object.rig.ikChains[0]?.id
            : object.rig.activeIkChainId;
        return {
          ...object,
          rig: {
            ...object.rig,
            mode,
            activeBoneId,
            activeIkChainId,
            boneControlActive:
              mode === "fk"
                ? Boolean(activeBoneId)
                : Boolean(activeIkChainId),
          },
        };
      }),
    })),
  toggleObjectSkeletonVisible: (objectId) =>
    set((state) => ({
      objects: state.objects.map((object) =>
        object.id === objectId && object.rig
          ? {
              ...object,
              rig: {
                ...object.rig,
                showSkeleton: !object.rig.showSkeleton,
              },
            }
          : object,
      ),
    })),
  setActiveBone: (objectId, boneId) =>
    set((state) => ({
      objects: state.objects.map((object) =>
        object.id === objectId && object.rig
          ? {
              ...object,
              rig: {
                ...object.rig,
                activeBoneId: boneId,
                boneControlActive: Boolean(boneId),
              },
            }
          : object,
      ),
      activeObjectId: objectId,
      selectedCameraId: undefined,
    })),
  updateBoneRotation: (objectId, boneId, rotation) =>
    set((state) => {
      const objects = state.objects.map((object) =>
        object.id === objectId && object.rig
          ? {
              ...object,
              rig: {
                ...object.rig,
                activeBoneId: boneId,
                boneControlActive: true,
                bones: object.rig.bones.map((bone) =>
                  bone.id === boneId ? { ...bone, rotation } : bone,
                ),
              },
            }
          : object,
      );
      return {
        objects,
        animation: maybeAutoKeyBone(state, objectId, boneId, objects),
      };
    }),
  updateBonePosition: (objectId, boneId, position) =>
    set((state) => {
      const objects = state.objects.map((object) =>
        object.id === objectId && object.rig
          ? {
              ...object,
              rig: {
                ...object.rig,
                activeBoneId: boneId,
                boneControlActive: true,
                bones: object.rig.bones.map((bone) =>
                  bone.id === boneId ? { ...bone, position } : bone,
                ),
              },
            }
          : object,
      );
      return {
        objects,
      };
    }),
  createIkChain: (objectId, rootBoneId, effectorBoneId) => {
    const state = useProjectStore.getState();
    const object = state.objects.find((item) => item.id === objectId);
    const rig = object?.rig;
    if (!rig?.hasSkeleton) {
      return { ok: false, message: "当前模型没有可编辑骨架" };
    }
    const linkBoneIds = buildIkLinkIds(rig.bones, rootBoneId, effectorBoneId);
    if (!linkBoneIds || linkBoneIds.length === 0) {
      return { ok: false, message: "根骨骼必须是末端骨骼的祖先骨骼" };
    }
    const chainId = `ik_chain_${crypto.randomUUID()}`;
    const effectorBone = rig.bones.find((bone) => bone.id === effectorBoneId);
    const nextChain: IkChainRecord = {
      id: chainId,
      name: effectorBone?.name ? `${effectorBone.name} IK` : `骨链${rig.ikChains.length + 1}`,
      rootBoneId,
      effectorBoneId,
      linkBoneIds,
      targetPosition: object?.position ?? [0, 1, 0],
      enabled: true,
    };
    set((current) => ({
      objects: current.objects.map((item) =>
        item.id === objectId && item.rig
          ? {
              ...item,
              rig: {
                ...item.rig,
                mode: "ik",
                activeIkChainId: chainId,
                ikChains: [...item.rig.ikChains, nextChain],
              },
            }
          : item,
      ),
    }));
    return { ok: true, chainId };
  },
  setActiveIkChain: (objectId, chainId) =>
    set((state) => ({
      objects: state.objects.map((object) =>
        object.id === objectId && object.rig
          ? {
              ...object,
              rig: {
                ...object.rig,
                activeIkChainId: chainId,
                boneControlActive: Boolean(chainId),
              },
            }
          : object,
      ),
      activeObjectId: objectId,
      selectedCameraId: undefined,
    })),
  updateIkChain: (objectId, chainId, updates) =>
    set((state) => {
      const objects = state.objects.map((object) =>
        object.id === objectId && object.rig
          ? {
              ...object,
              rig: {
                ...object.rig,
                ikChains: object.rig.ikChains.map((chain) =>
                  chain.id === chainId ? { ...chain, ...updates } : chain,
                ),
              },
            }
          : object,
      );
      return {
        objects,
        animation: maybeAutoKeyIkChain(state, objectId, chainId, objects),
      };
    }),
  removeIkChain: (objectId, chainId) =>
    set((state) => ({
      objects: state.objects.map((object) =>
        object.id === objectId && object.rig
          ? {
              ...object,
              rig: {
                ...object.rig,
                ikChains: object.rig.ikChains.filter((chain) => chain.id !== chainId),
                activeIkChainId:
                  object.rig.activeIkChainId === chainId
                    ? undefined
                    : object.rig.activeIkChainId,
              },
            }
          : object,
      ),
    })),
  updateObject: (objectId, updates) =>
    set((state) => ({
      objects: state.objects.map((object) =>
        object.id === objectId ? { ...object, ...updates } : object,
      ),
    })),
  reorderObject: (objectId, direction) =>
    set((state) => ({
      objects: moveItemById(state.objects, objectId, direction),
    })),
  updateObjectTransform: (objectId, transform) =>
    set((state) => {
      const objects = state.objects.map((object) => {
        if (object.id !== objectId) {
          return object;
        }
        const nextObject = {
          ...object,
          ...transform,
        };
        if (!object.rig?.ikChains.length) {
          return nextObject;
        }
        return {
          ...nextObject,
          rig: {
            ...object.rig,
            ikChains: object.rig.ikChains.map((chain) => ({
              ...chain,
              targetPosition: applyObjectDeltaToTargetPosition(
                {
                  position: object.position,
                  rotation: object.rotation,
                  scale: object.scale,
                },
                {
                  position: nextObject.position,
                  rotation: nextObject.rotation,
                  scale: nextObject.scale,
                },
                chain.targetPosition,
              ),
            })),
          },
        };
      });
      return {
        objects,
        animation: maybeAutoKeyObjectTransform(state, objectId, objects),
      };
    }),
  updateObjectMetrics: (objectId, updates) =>
    set((state) => ({
      objects: state.objects.map((object) =>
        object.id === objectId ? { ...object, ...updates } : object,
      ),
    })),
  toggleObjectVisible: (objectId) =>
    set((state) => ({
      objects: state.objects.map((object) =>
        object.id === objectId ? { ...object, visible: !object.visible } : object,
      ),
    })),
  toggleObjectLocked: (objectId) =>
    set((state) => ({
      objects: state.objects.map((object) =>
        object.id === objectId ? { ...object, locked: !object.locked } : object,
      ),
    })),
  toggleObjectBoundsVisible: (objectId) =>
    set((state) => ({
      objects: state.objects.map((object) =>
        object.id === objectId
          ? { ...object, boundsVisible: !object.boundsVisible }
          : object,
      ),
    })),
  removeObject: (objectId) =>
    set((state) => {
      const removedObject = state.objects.find((object) => object.id === objectId);
      const removedAssetIds = new Set<string>();
      if (removedObject?.assetId) {
        removedAssetIds.add(removedObject.assetId);
      }
      removedObject?.materialOverrides?.forEach((override) => {
        if (override.textureAssetId) {
          removedAssetIds.add(override.textureAssetId);
        }
      });
      const removedAssets = state.assets.filter((asset) =>
        removedAssetIds.has(asset.id),
      );
      removedAssets.forEach((asset) => URL.revokeObjectURL(asset.objectUrl));
      window.dispatchEvent(
        new CustomEvent("scene-object-remove-request", {
          detail: objectId,
        }),
      );

      return {
        assets: state.assets.filter((asset) => !removedAssetIds.has(asset.id)),
        objects: state.objects.filter((object) => object.id !== objectId),
        activeObjectId:
          state.activeObjectId === objectId ? undefined : state.activeObjectId,
        animation: removeTimelineTarget(state.animation, "object", objectId),
      };
    }),
  updateObjectMaterial: (objectId, materialId, updates) =>
    set((state) => {
      const textureAssetsToRemove = new Set<string>();
      const objects = state.objects.map((object) => {
        if (object.id !== objectId) {
          return object;
        }
        const existingOverrides = object.materialOverrides ?? [];
        const previous = existingOverrides.find(
          (override) => override.materialId === materialId,
        );
        if (
          updates.textureAssetId &&
          previous?.textureAssetId &&
          previous.textureAssetId !== updates.textureAssetId
        ) {
          textureAssetsToRemove.add(previous.textureAssetId);
        }
        const nextOverride: MaterialOverride = {
          materialId,
          materialName: updates.materialName ?? previous?.materialName ?? materialId,
          ...previous,
          ...updates,
        };
        const nextOverrides = previous
          ? existingOverrides.map((override) =>
              override.materialId === materialId ? nextOverride : override,
            )
          : [...existingOverrides, nextOverride];

        return {
          ...object,
          materialOverrides: nextOverrides,
        };
      });

      const removedAssets = state.assets.filter((asset) =>
        textureAssetsToRemove.has(asset.id),
      );
      removedAssets.forEach((asset) => URL.revokeObjectURL(asset.objectUrl));

      return {
        objects,
        assets: state.assets.filter((asset) => !textureAssetsToRemove.has(asset.id)),
      };
    }),
  addAsset: (asset) =>
    set((state) => ({
      assets: [...state.assets, asset],
    })),
  addSceneObject: (object) =>
    set((state) => ({
      objects: [...state.objects, object],
      activeObjectId: object.id,
      selectedCameraId: undefined,
    })),
  addImportedModel: (asset, object) =>
    set((state) => ({
      assets: [...state.assets, asset],
      objects: [...state.objects, object],
      activeObjectId: object.id,
      selectedCameraId: undefined,
      importError: undefined,
    })),
  addSnapshot: (snapshot) =>
    set((state) => ({
      snapshots: [snapshot, ...state.snapshots],
    })),
  removeSnapshot: (snapshotId) =>
    set((state) => ({
      snapshots: state.snapshots.filter((snapshot) => snapshot.id !== snapshotId),
    })),
  setAnimationTime: (time) =>
    set((state) => applyAnimationState(state, time)),
  setAnimationPlaying: (playing) =>
    set((state) => ({
      animation: {
        ...state.animation,
        currentTime:
          playing && (state.animation.currentTime >= (state.animation.outPointTime ?? state.animation.duration) - 0.0001 || state.animation.currentTime < (state.animation.inPointTime ?? 0))
            ? state.animation.inPointTime ?? 0
            : state.animation.currentTime,
        isPlaying: playing,
      },
    })),
  toggleAnimationPlayback: () =>
    set((state) => {
      const nextPlaying = !state.animation.isPlaying;
      const startTime = state.animation.inPointTime ?? 0;
      const endTime = state.animation.outPointTime ?? state.animation.duration;
      return {
        animation: {
          ...state.animation,
          currentTime:
            nextPlaying && (state.animation.currentTime >= endTime - 0.0001 || state.animation.currentTime < startTime)
              ? startTime
              : state.animation.currentTime,
          isPlaying: nextPlaying,
        },
      };
    }),
  toggleAnimationLoop: () =>
    set((state) => ({
      animation: {
        ...state.animation,
        loop: !state.animation.loop,
      },
    })),
  setAnimationAutoKeyEnabled: (enabled) =>
    set((state) => ({
      animation: {
        ...state.animation,
        autoKeyEnabled: enabled,
      },
    })),
  setAnimationAutoKeyMode: (mode) =>
    set((state) => ({
      animation: {
        ...state.animation,
        autoKeyMode: mode,
      },
    })),
  setAnimationDuration: (duration) =>
    set((state) => {
      const nextDuration = clampAnimationDuration(duration);
      const nextAnimation = normalizeAnimationRangePoints({
        ...state.animation,
        duration: nextDuration,
      });
      const nextState = {
        ...state,
        animation: {
          ...nextAnimation,
          cameraCuts: normalizeExistingCameraCuts(
            nextAnimation.cameraCuts,
            nextDuration,
            nextAnimation.fps,
          ),
        },
      };
      return applyAnimationState(nextState, state.animation.currentTime);
    }),
  setAnimationFps: (fps) =>
    set((state) => {
      const nextFps = clampAnimationFps(fps);
      const nextAnimation = normalizeAnimationRangePoints({
        ...state.animation,
        fps: nextFps,
      });
      const nextState = {
        ...state,
        animation: {
          ...nextAnimation,
          cameraCuts: normalizeExistingCameraCuts(
            nextAnimation.cameraCuts,
            nextAnimation.duration,
            nextFps,
          ),
        },
      };
      return applyAnimationState(nextState, state.animation.currentTime);
    }),
  setAnimationInPoint: (time) =>
    set((state) => ({
      animation: setAnimationInPoint(state.animation, time),
    })),
  setAnimationOutPoint: (time) =>
    set((state) => ({
      animation: setAnimationOutPoint(state.animation, time),
    })),
  clearAnimationInPoint: () =>
    set((state) => ({
      animation: clearAnimationInPoint(state.animation),
    })),
  clearAnimationOutPoint: () =>
    set((state) => ({
      animation: clearAnimationOutPoint(state.animation),
    })),
  setAnimationInPointToCurrentTime: () =>
    set((state) => {
      const currentInPointTime =
        state.animation.inPointTime === undefined
          ? undefined
          : clampAnimationTime(
              state.animation.inPointTime,
              state.animation.duration,
              state.animation.fps,
            );
      const currentTime = clampAnimationTime(
        state.animation.currentTime,
        state.animation.duration,
        state.animation.fps,
      );
      return {
        animation:
          currentInPointTime !== undefined && Math.abs(currentInPointTime - currentTime) < 0.0001
            ? clearAnimationInPoint(state.animation)
            : setAnimationInPoint(state.animation, currentTime),
      };
    }),
  setAnimationOutPointToCurrentTime: () =>
    set((state) => {
      const currentOutPointTime =
        state.animation.outPointTime === undefined
          ? undefined
          : clampAnimationTime(
              state.animation.outPointTime,
              state.animation.duration,
              state.animation.fps,
            );
      const currentTime = clampAnimationTime(
        state.animation.currentTime,
        state.animation.duration,
        state.animation.fps,
      );
      return {
        animation:
          currentOutPointTime !== undefined &&
          Math.abs(currentOutPointTime - currentTime) < 0.0001
            ? clearAnimationOutPoint(state.animation)
            : setAnimationOutPoint(state.animation, currentTime),
      };
    }),
  stepAnimation: (deltaSeconds) =>
    set((state) => {
      if (!state.animation.isPlaying) {
        return state;
      }
      const duration = clampAnimationDuration(state.animation.duration);
      const startTime = state.animation.inPointTime ?? 0;
      const endTime = state.animation.outPointTime ?? duration;
      const rawNextTime = state.animation.currentTime + Math.max(0, deltaSeconds);
      const shouldLoop = state.animation.loop;
      const nextTime =
        rawNextTime > endTime
          ? shouldLoop
            ? startTime + ((rawNextTime - startTime) % Math.max(endTime - startTime, 0.001))
            : endTime
          : rawNextTime;
      if (!shouldLoop && rawNextTime >= endTime) {
        return {
          animation: {
            ...state.animation,
            currentTime: nextTime,
            isPlaying: false,
          },
        };
      }
      return {
        animation: {
          ...state.animation,
          currentTime: nextTime,
        },
      };
    }),
  captureCurrentKeyframe: () => {
    const state = useProjectStore.getState();
    const result = captureManualSelectionKeyframes(state);
    if (!result.ok) {
      return result;
    }
    set((current) => ({
      animation: {
        ...current.animation,
        bindings: result.bindings,
      },
    }));
    return { ok: true as const };
  },
  captureSelectedAssetsKeyframes: () => {
    const state = get();
    const currentTime = clampAnimationTime(state.animation.currentTime, state.animation.duration, state.animation.fps);
    const selected = state.selectedAssetIds;
    if (!selected.length) return { ok: false as const, message: "请先选择对象、机位或组合" };
    let bindings = state.animation.bindings;
    selected.forEach((key) => {
      const [type, id] = key.split(":");
      if (type === "object") {
        const object = state.objects.find((item) => item.id === id);
        if (object) bindings = recordObjectTransformChannels(bindings, object, currentTime);
      }
      if (type === "camera") {
        const camera = state.cameras.find((item) => item.id === id);
        if (camera) bindings = recordCameraChannels(bindings, camera, currentTime);
      }
    });
    set((current) => ({
      animation: {
        ...current.animation,
        bindings,
      },
    }));
    return { ok: true as const, count: selected.length, bindings };
  },
  applyCameraMovePreset: (cameraId, presetId) => {
    const state = get();
    const camera = state.cameras.find((item) => item.id === cameraId);
    if (!camera) {
      return { ok: false as const, message: "当前机位不存在" };
    }
    if (camera.locked) {
      return { ok: false as const, message: "当前机位已锁定，无法添加运镜" };
    }
    const range = getCameraMoveRange(state, cameraId);
    if (!range.ok) {
      return range;
    }

    const sampledStart = applyAnimationToProjectState(state, range.startTime).cameras.find(
      (item) => item.id === cameraId,
    ) ?? camera;
    const endCamera = getCameraMoveEndState(sampledStart, presetId);
    const bindingsWithStart = recordCameraChannels(
      state.animation.bindings,
      sampledStart,
      range.startTime,
    );
    const bindings = recordCameraChannels(bindingsWithStart, endCamera, range.endTime);

    set((current) => {
      const animation = { ...current.animation, bindings };
      const sampled = applyAnimationToProjectState(
        { objects: current.objects, cameras: current.cameras, animation },
        animation.currentTime,
      );
      return { ...sampled, animation };
    });
    return { ok: true as const, startTime: range.startTime, endTime: range.endTime };
  },
  addCurrentCameraCut: () => {
    const state = useProjectStore.getState();
    const result = captureCameraCut(state);
    if (!result.ok) {
      return result;
    }
    set((current) => ({
      animation: {
        ...current.animation,
        cameraCuts: result.cameraCuts,
      },
    }));
    return { ok: true as const };
  },
  addCameraCutAtTime: (cameraId) => {
    const state = useProjectStore.getState();
    const result = captureCameraCutForCamera(state, cameraId);
    if (!result.ok) {
      return result;
    }
    set((current) => ({
      animation: {
        ...current.animation,
        cameraCuts: result.cameraCuts,
      },
    }));
    return { ok: true as const };
  },
  removeSelectedTimelineKeyframe: (refs) =>
    set((state) => ({
      animation: {
        ...state.animation,
        bindings: removeTimelineKeyframes(state.animation.bindings, refs),
        cameraCuts: removeCameraCuts(state.animation.cameraCuts, refs),
      },
    })),
  moveSelectedTimelineKeyframe: (refs, time) =>
    set((state) => {
      const nextTime = clampAnimationTime(
        time,
        state.animation.duration,
        state.animation.fps,
      );
      const nextBindings = moveTimelineKeyframes(
        state.animation.bindings,
        refs,
        nextTime,
      );
      const nextCameraCuts = moveCameraCuts(
        state.animation.cameraCuts,
        refs,
        nextTime,
        state.animation.duration,
        state.animation.fps,
      );
      return applyAnimationState(
        {
          ...state,
          animation: {
            ...state.animation,
            bindings: nextBindings,
            cameraCuts: nextCameraCuts,
          },
        },
        state.animation.currentTime,
      );
    }),
  resizeCameraCutClip: (cutId, edge, time) =>
    set((state) => {
      const nextCameraCuts = resizeCameraCut(
        state.animation.cameraCuts,
        cutId,
        edge,
        time,
        state.animation.duration,
        state.animation.fps,
      );
      return {
        animation: {
          ...state.animation,
          cameraCuts: nextCameraCuts,
        },
      };
    }),
  setImportError: (message) => set({ importError: message }),
  releaseRuntimeAssets: () =>
    set((state) => {
      state.assets.forEach((asset) => URL.revokeObjectURL(asset.objectUrl));
      return {
      assets: [],
      objects: state.objects.filter((object) => object.type === "character"),
        worldSettings: {
          ...state.worldSettings,
          panoramaSphere: {
            ...state.worldSettings.panoramaSphere,
            assetId: undefined,
            visible: false,
          },
        },
        activeObjectId:
          state.activeObjectId &&
          state.objects.find((object) => object.id === state.activeObjectId)
            ?.type === "character"
            ? state.activeObjectId
            : undefined,
        selectedCameraId: undefined,
        cameraPreviewActive: false,
      };
    }),
}));
