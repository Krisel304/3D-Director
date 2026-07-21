import {
  Camera,
  Clock3,
  Download,
  GripVertical,
  KeyRound,
  Pause,
  Play,
  Plus,
  Repeat2,
  SkipBack,
  SkipForward,
  TimerReset,
  Trash2,
  X,
} from "lucide-react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { TimelineKeyframeRef } from "../../domain/projectTypes";
import { formatBoneDisplayName } from "../../domain/rigUtils";
import {
  createAnimationExportName,
  type AnimationExportRange,
  type AnimationExportRequestDetail,
} from "../../export/animationExport";
import { useProjectStore } from "../../store/projectStore";

type TimelineTreeNode = {
  id: string;
  label: string;
  subtitle?: string;
  kind: "cameraSequence" | "section" | "camera" | "object" | "empty";
  targetId?: string;
  keyframes: TimelineDisplayKeyframe[];
  cameraClip?: TimelineCameraClip;
  laneClassName?: string;
  muted?: boolean;
};

type TimelineDisplayKeyframe = {
  id: string;
  time: number;
  refs: TimelineKeyframeRef[];
  label?: string;
};

type VisibleTimelineNode = {
  depth: number;
  node: TimelineTreeNode;
};

type TimelineCameraClip = {
  id: string;
  cameraId: string;
  label: string;
  startTime: number;
  endTime: number;
  refs: TimelineKeyframeRef[];
};

function buildDisplayKeyframes(
  items: Array<{ id: string; time: number; refs: TimelineKeyframeRef[]; label?: string }>,
) {
  const byTime = new Map<string, TimelineDisplayKeyframe>();
  items.forEach((item) => {
    const key = item.time.toFixed(4);
    const current = byTime.get(key);
    if (current) {
      current.refs = [...current.refs, ...item.refs];
      return;
    }
    byTime.set(key, {
      id: item.id,
      time: item.time,
      refs: [...item.refs],
      label: item.label,
    });
  });
  return Array.from(byTime.values()).sort((left, right) => left.time - right.time);
}

function formatSeconds(seconds: number) {
  return Number(seconds.toFixed(2)).toString();
}

function formatSecondLabel(seconds: number) {
  return `${formatSeconds(Math.max(0, seconds))}s`;
}

function TimelineMarkIcon({ size = 15 }: { size?: number }) {
  return (
    <svg aria-hidden="true" className="timeline-mark-icon" viewBox="0 0 20 20" width={size} height={size}>
      <path d="M3 4.5h14M3 10h14M3 15.5h14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
      <path d="M7 2.6v14.8M13 2.6v14.8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" opacity="0.55" />
    </svg>
  );
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function clampFrameValue(value: number, maxFrame: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(maxFrame, Math.max(0, Math.round(value)));
}

function normalizeExportFrameRange(
  startFrame: number,
  endFrame: number,
  maxFrame: number,
) {
  if (maxFrame <= 0) {
    return {
      startFrame: 0,
      endFrame: 1,
    };
  }

  const nextStartFrame = clampFrameValue(startFrame, maxFrame);
  const nextEndFrame = clampFrameValue(endFrame, maxFrame);

  if (nextEndFrame > nextStartFrame) {
    return {
      startFrame: nextStartFrame,
      endFrame: nextEndFrame,
    };
  }

  if (nextStartFrame >= maxFrame) {
    return {
      startFrame: Math.max(0, maxFrame - 1),
      endFrame: maxFrame,
    };
  }

  return {
    startFrame: nextStartFrame,
    endFrame: Math.min(maxFrame, nextStartFrame + 1),
  };
}

export function TimelinePanel({
  expanded,
  height,
  onHeightChange,
}: {
  expanded: boolean;
  height: number;
  onHeightChange: (height: number) => void;
}) {
  const projectName = useProjectStore((state) => state.projectName);
  const animation = useProjectStore((state) => state.animation);
  const activeObjectId = useProjectStore((state) => state.activeObjectId);
  const selectedCameraId = useProjectStore((state) => state.selectedCameraId);
  const objects = useProjectStore((state) => state.objects);
  const cameras = useProjectStore((state) => state.cameras);
  const selectedAssetIds = useProjectStore((state) => state.selectedAssetIds);
  const setAnimationTime = useProjectStore((state) => state.setAnimationTime);
  const setAnimationDuration = useProjectStore((state) => state.setAnimationDuration);
  const setAnimationInPoint = useProjectStore((state) => state.setAnimationInPoint);
  const setAnimationOutPoint = useProjectStore((state) => state.setAnimationOutPoint);
  const clearAnimationInPoint = useProjectStore((state) => state.clearAnimationInPoint);
  const clearAnimationOutPoint = useProjectStore((state) => state.clearAnimationOutPoint);
  const setAnimationInPointToCurrentTime = useProjectStore(
    (state) => state.setAnimationInPointToCurrentTime,
  );
  const setAnimationOutPointToCurrentTime = useProjectStore(
    (state) => state.setAnimationOutPointToCurrentTime,
  );
  const toggleAnimationPlayback = useProjectStore(
    (state) => state.toggleAnimationPlayback,
  );
  const toggleAnimationLoop = useProjectStore((state) => state.toggleAnimationLoop);
  const setAnimationAutoKeyEnabled = useProjectStore(
    (state) => state.setAnimationAutoKeyEnabled,
  );
  const captureCurrentKeyframe = useProjectStore(
    (state) => state.captureCurrentKeyframe,
  );
  const captureSelectedAssetsKeyframes = useProjectStore(
    (state) => state.captureSelectedAssetsKeyframes,
  );
  const removeSelectedTimelineKeyframe = useProjectStore(
    (state) => state.removeSelectedTimelineKeyframe,
  );
  const moveSelectedTimelineKeyframe = useProjectStore(
    (state) => state.moveSelectedTimelineKeyframe,
  );
  const resizeCameraCutClip = useProjectStore((state) => state.resizeCameraCutClip);
  const addCameraCutAtTime = useProjectStore((state) => state.addCameraCutAtTime);
  const setActiveCamera = useProjectStore((state) => state.setActiveCamera);
  const setCameraPreviewActive = useProjectStore((state) => state.setCameraPreviewActive);
  const clearSelection = useProjectStore((state) => state.clearSelection);
  const clearTimelineSelection = useProjectStore((state) => state.clearTimelineSelection);
  const setSelectedTimelineKeyframe = useProjectStore(
    (state) => state.setSelectedTimelineKeyframe,
  );
  const [feedback, setFeedback] = useState<string>("");
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [selectedTrajectoryId, setSelectedTrajectoryId] = useState<string | null>(null);
  const [selectedKeyframe, setSelectedKeyframe] = useState<{
    id: string;
    refs: TimelineKeyframeRef[];
    time: number;
  } | null>(null);
  const [draggingKeyframe, setDraggingKeyframe] = useState<{
    id: string;
    refs: TimelineKeyframeRef[];
    time: number;
    laneLeft: number;
    laneWidth: number;
  } | null>(null);
  const [resizingCameraClip, setResizingCameraClip] = useState<{
    cutId: string;
    edge: "start" | "end";
    laneLeft: number;
    laneWidth: number;
  } | null>(null);
  const [seekingTimeline, setSeekingTimeline] = useState(false);
  const [draggingRangePoint, setDraggingRangePoint] = useState<{
    type: "in" | "out";
    laneLeft: number;
    laneWidth: number;
  } | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [recordingDialogOpen, setRecordingDialogOpen] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [exportStart, setExportStart] = useState("0");
  const [exportEnd, setExportEnd] = useState("");
  const [exportRangeCustomized, setExportRangeCustomized] = useState(false);
  const [exportError, setExportError] = useState("");
  const [durationDraft, setDurationDraft] = useState("30");
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [cameraSequenceMenuOpen, setCameraSequenceMenuOpen] = useState(false);
  const [cameraSequenceMenuPosition, setCameraSequenceMenuPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [draggingDuration, setDraggingDuration] = useState<{
    startX: number;
    startDuration: number;
  } | null>(null);
  const [lastEditedKeyframeIds, setLastEditedKeyframeIds] = useState<string[]>([]);
  const previousBindingsRef = useRef(animation.bindings);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const timelineLeftListRef = useRef<HTMLDivElement>(null);
  const timelineRightListRef = useRef<HTMLDivElement>(null);
  const resizeStateRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const syncingTrackScrollRef = useRef<"left" | "right" | null>(null);
  const timelinePanStateRef = useRef<{
    startClientX: number;
    startClientY: number;
    startScrollLeft: number;
    laneLeft: number;
    laneWidth: number;
    isPanning: boolean;
  } | null>(null);
  const timelineZoomRef = useRef(1);

  const activeObject = activeObjectId
    ? objects.find((object) => object.id === activeObjectId)
    : undefined;
  const activeCamera = selectedCameraId
    ? cameras.find((camera) => camera.id === selectedCameraId)
    : undefined;
  const objectMap = useMemo(
    () => new Map(objects.map((object) => [object.id, object])),
    [objects],
  );
  const cameraMap = useMemo(
    () => new Map(cameras.map((camera) => [camera.id, camera])),
    [cameras],
  );
  const cameraSequenceClips = useMemo<TimelineCameraClip[]>(
    () =>
      animation.cameraCuts
        .slice()
        .sort((left, right) => left.startTime - right.startTime)
        .map((cut) => {
          const camera = cameraMap.get(cut.cameraId);
          const startTime = cut.startTime ?? cut.time ?? 0;
          return {
            id: `camera-cut:${cut.id}`,
            cameraId: cut.cameraId,
            label: camera?.name ?? "未知机位",
            startTime,
            endTime: startTime,
            refs: [
              {
                kind: "cameraCut" as const,
                cutId: cut.id,
              },
            ],
          };
        }),
    [animation.cameraCuts, animation.duration, cameraMap],
  );

  const bindingRows = useMemo(
    () =>
      animation.bindings.map((binding) => {
        const transformChannels = binding.channels.filter((channel) =>
          ["position", "rotation", "scale"].includes(channel.path),
        );
        const otherChannels = binding.channels.filter(
          (channel) => !["position", "rotation", "scale"].includes(channel.path),
        );
        const channelRows = [...transformChannels, ...otherChannels].map((channel) => {
          const bindingObject =
            binding.targetType === "object" ? objectMap.get(binding.targetId) : undefined;
          const suffix =
            channel.boneId && bindingObject?.rig
              ? bindingObject.rig.bones.find((bone) => bone.id === channel.boneId)?.name
              : undefined;
          const resolvedLabel =
            channel.path === "boneRotation" && suffix
              ? `骨骼旋转 · ${formatBoneDisplayName(suffix)}`
              : channel.path === "ikTargetPosition"
                ? `${channel.label}`
                : suffix
                  ? `${channel.label} · ${formatBoneDisplayName(suffix)}`
                  : channel.label;
          const resolvedSubtitle =
            channel.path === "boneRotation"
              ? "骨骼通道"
              : channel.path === "ikTargetPosition"
                ? "IK 通道"
                : channel.valueType === "vec3"
                  ? "三轴通道"
                  : "数值通道";
          return {
            bindingId: binding.id,
            bindingLabel: binding.label,
            channel,
            label: resolvedLabel,
            subtitle: resolvedSubtitle,
            keyframes: channel.keyframes.map((keyframe) => ({
              id: `${binding.id}:${channel.id}:${keyframe.id}`,
              time: keyframe.time,
              refs: [
                {
                  kind: "channel" as const,
                  bindingId: binding.id,
                  channelId: channel.id,
                  keyframeId: keyframe.id,
                },
              ],
            })),
          };
        });
        return {
          id: binding.id,
          label: binding.label,
          targetId: binding.targetId,
          targetType: binding.targetType,
          keyframes: buildDisplayKeyframes(
            channelRows.flatMap((row) => row.keyframes),
          ),
          channelRows,
        };
      }),
    [animation.bindings, objectMap],
  );
  const timelineTree = useMemo<TimelineTreeNode[]>(() => {
    const objectBindings = bindingRows.filter((binding) => binding.targetType === "object");
    const cameraBindings = bindingRows.filter((binding) => binding.targetType === "camera");

    const cameraRows: TimelineTreeNode[] = cameraBindings.map((binding) => {
      const camera = cameraMap.get(binding.targetId);
      return {
        id: `camera-row:${binding.targetId}`,
        label: binding.label,
        kind: "camera",
        targetId: binding.targetId,
        keyframes: binding.keyframes,
        muted: camera ? !camera.visible : true,
      };
    });

    const objectRows: TimelineTreeNode[] = objectBindings.map((binding) => {
      const object = objectMap.get(binding.targetId);
      return {
        id: `object-row:${binding.targetId}`,
        label: binding.label,
        kind: "object",
        targetId: binding.targetId,
        keyframes: binding.keyframes,
        muted: object ? !object.visible : true,
      };
    });

    const nodes: TimelineTreeNode[] = [
      {
        id: "camera-sequence",
        label: "机位序列",
        kind: "cameraSequence",
        keyframes: [],
      },
    ];
    if (cameraRows.length) {
      nodes.push({
        id: "section:camera",
        label: "机位",
        kind: "section",
        keyframes: [],
      });
      nodes.push(...cameraRows);
    }
    if (objectRows.length) {
      nodes.push({
        id: "section:object",
        label: "对象",
        kind: "section",
        keyframes: [],
      });
      nodes.push(...objectRows);
    }
    return nodes;
  }, [bindingRows, cameraMap, objectMap]);
  const timelineHasTracks = timelineTree.some(
    (node) => node.kind === "camera" || node.kind === "object",
  );
  const timelineHasContent = timelineHasTracks || cameraSequenceClips.length > 0;
  const timelineToolsEnabled = timelineHasContent;
  const canInsertSelectedAsset = Boolean(activeObject || activeCamera || selectedAssetIds.length);

  const ioRange = useMemo(() => {
    const startTime = animation.inPointTime ?? 0;
    const endTime = animation.outPointTime ?? animation.duration;
    return {
      startTime,
      endTime,
      hasInPoint: animation.inPointTime !== undefined,
      hasOutPoint: animation.outPointTime !== undefined,
      hasVisibleRange:
        animation.inPointTime !== undefined || animation.outPointTime !== undefined,
    };
  }, [animation.duration, animation.inPointTime, animation.outPointTime]);

  const collectKeyframeIdsAtTime = (
    targetType: "object" | "camera",
    targetId: string,
    time: number,
  ) => {
    const timeKey = time.toFixed(4);
    return bindingRows
      .filter((binding) => binding.targetType === targetType && binding.targetId === targetId)
      .flatMap((binding) =>
        binding.channelRows.flatMap((row) =>
          row.keyframes
            .filter((keyframe) => keyframe.time.toFixed(4) === timeKey)
            .map((keyframe) => keyframe.id),
        ),
      );
  };

  const handleCapture = () => {
    if (!canInsertSelectedAsset) {
      setFeedback("请从资产列表选择资产，并点击插针添加到时间轴");
      return;
    }
    const result = activeObject || activeCamera
      ? captureCurrentKeyframe()
      : captureSelectedAssetsKeyframes();
    if (result.ok) {
      if (activeObject) {
        setLastEditedKeyframeIds(
          collectKeyframeIdsAtTime("object", activeObject.id, animation.currentTime),
        );
      } else if (activeCamera) {
        setLastEditedKeyframeIds(
          collectKeyframeIdsAtTime("camera", activeCamera.id, animation.currentTime),
        );
      }
    }
    if (result.ok) {
      if (activeObject || activeCamera) {
        setSelectedTrackId(activeObject ? `object-row:${activeObject.id}` : `camera-row:${activeCamera?.id}`);
      }
    }
    setFeedback(result.ok ? `已添加${"count" in result ? result.count : 1}个资产到时间轴并生成关键帧` : result.message);
  };

  const handleSetInPoint = () => {
    if (!timelineToolsEnabled) {
      setFeedback("请先将资产添加到时间轴");
      return;
    }
    const shouldClear =
      animation.inPointTime !== undefined &&
      Math.abs(animation.inPointTime - animation.currentTime) < 0.0001;
    setAnimationInPointToCurrentTime();
    setFeedback(shouldClear ? "已清除入点" : "已设置入点");
  };

  const handleSetOutPoint = () => {
    if (!timelineToolsEnabled) {
      setFeedback("请先将资产添加到时间轴");
      return;
    }
    const shouldClear =
      animation.outPointTime !== undefined &&
      Math.abs(animation.outPointTime - animation.currentTime) < 0.0001;
    setAnimationOutPointToCurrentTime();
    setFeedback(shouldClear ? "已清除出点" : "已设置出点");
  };

  const handleClearInPoint = useCallback(() => {
    clearAnimationInPoint();
    setFeedback("已清除入点");
  }, [clearAnimationInPoint]);

  const handleClearOutPoint = useCallback(() => {
    clearAnimationOutPoint();
    setFeedback("已清除出点");
  }, [clearAnimationOutPoint]);

  const updateRangePointAtClientX = useCallback((
    type: "in" | "out",
    clientX: number,
    laneLeft: number,
    laneWidth: number,
  ) => {
    const relativeX = Math.min(laneWidth, Math.max(0, clientX - laneLeft));
    const nextTime = (relativeX / Math.max(laneWidth, 1)) * animation.duration;
    if (type === "in") {
      setAnimationInPoint(nextTime);
      setFeedback(`入点：${formatSecondLabel(nextTime)}`);
      return;
    }
    setAnimationOutPoint(nextTime);
    setFeedback(`出点：${formatSecondLabel(nextTime)}`);
  }, [animation.duration, animation.fps, setAnimationInPoint, setAnimationOutPoint]);

  const handleRangePointPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    type: "in" | "out",
  ) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const laneRect = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!laneRect) {
      return;
    }
    setDraggingRangePoint({
      type,
      laneLeft: laneRect.left,
      laneWidth: laneRect.width,
    });
  };

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!resizeStateRef.current) {
        return;
      }
      const delta = resizeStateRef.current.startY - event.clientY;
      const maxHeight = Math.min(window.innerHeight * 0.78, 760);
      onHeightChange(
        Math.round(Math.min(maxHeight, Math.max(220, resizeStateRef.current.startHeight + delta))),
      );
    };

    const handlePointerUp = () => {
      resizeStateRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [onHeightChange]);

  const handleDeleteSelectedKeyframe = () => {
    if (!timelineToolsEnabled) {
      setFeedback("请先将资产添加到时间轴");
      return;
    }
    if (!selectedKeyframe) {
      setFeedback("请先选择要删除的关键帧或机位范围");
      return;
    }
    const hasChannelKeyframe = selectedKeyframe.refs.some((ref) => ref.kind === "channel");
    if (!hasChannelKeyframe) {
      setSelectedKeyframe(null);
      setFeedback("机位范围为默认播放范围，可拖动调整，不能直接删除");
      return;
    }
    removeSelectedTimelineKeyframe(selectedKeyframe.refs);
    setSelectedKeyframe(null);
    setSelectedTimelineKeyframe(undefined);
    setFeedback("已删除关键帧");
  };

  useEffect(() => {
    if (!selectedKeyframe) {
      return undefined;
    }
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key !== "Backspace" && event.key !== "Delete") {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) {
        return;
      }
      event.preventDefault();
      handleDeleteSelectedKeyframe();
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [selectedKeyframe]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isEditableTarget(event.target)) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key !== "i" && key !== "o") {
        return;
      }
      event.preventDefault();
      if (key === "i") {
        handleSetInPoint();
        return;
      }
      handleSetOutPoint();
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [handleSetInPoint, handleSetOutPoint]);

  useEffect(() => {
    if (previousBindingsRef.current === animation.bindings) {
      return;
    }
    previousBindingsRef.current = animation.bindings;
    if (activeObject) {
      setLastEditedKeyframeIds(
        collectKeyframeIdsAtTime("object", activeObject.id, animation.currentTime),
      );
      return;
    }
    if (activeCamera) {
      setLastEditedKeyframeIds(
        collectKeyframeIdsAtTime("camera", activeCamera.id, animation.currentTime),
      );
    }
  }, [activeCamera, activeObject, animation.bindings, animation.currentTime, bindingRows]);

  useEffect(() => {
    if (!draggingKeyframe) {
      return undefined;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const relativeX = Math.min(
        draggingKeyframe.laneWidth,
        Math.max(0, event.clientX - draggingKeyframe.laneLeft),
      );
      const nextTime =
        (relativeX / Math.max(draggingKeyframe.laneWidth, 1)) * animation.duration;
      if (Math.abs(nextTime - draggingKeyframe.time) < 0.0001) {
        return;
      }
      moveSelectedTimelineKeyframe(draggingKeyframe.refs, nextTime);
      setLastEditedKeyframeIds([draggingKeyframe.id]);
      setSelectedKeyframe((current) =>
        current && current.id === draggingKeyframe.id
          ? { ...current, time: nextTime }
          : current,
      );
      setDraggingKeyframe((current) =>
        current && current.id === draggingKeyframe.id
          ? { ...current, time: nextTime }
          : current,
      );
    };

    const handlePointerUp = () => {
      setDraggingKeyframe(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [animation.duration, draggingKeyframe, moveSelectedTimelineKeyframe]);

  useEffect(() => {
    if (!resizingCameraClip) {
      return undefined;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const relativeX = Math.min(
        resizingCameraClip.laneWidth,
        Math.max(0, event.clientX - resizingCameraClip.laneLeft),
      );
      const nextTime =
        (relativeX / Math.max(resizingCameraClip.laneWidth, 1)) * animation.duration;
      resizeCameraCutClip(
        resizingCameraClip.cutId,
        resizingCameraClip.edge,
        nextTime,
      );
    };

    const handlePointerUp = () => {
      setResizingCameraClip(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [animation.duration, resizingCameraClip, resizeCameraCutClip]);

  useEffect(() => {
    if (!draggingRangePoint) {
      return undefined;
    }

    const handlePointerMove = (event: PointerEvent) => {
      updateRangePointAtClientX(
        draggingRangePoint.type,
        event.clientX,
        draggingRangePoint.laneLeft,
        draggingRangePoint.laneWidth,
      );
    };

    const handlePointerUp = () => {
      setDraggingRangePoint(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [draggingRangePoint, updateRangePointAtClientX]);

  useEffect(() => {
    if (!draggingDuration) {
      return undefined;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const delta = Math.round((event.clientX - draggingDuration.startX) / 8);
      const nextDuration = Math.min(90, Math.max(1, draggingDuration.startDuration + delta));
      setDurationDraft(nextDuration.toString());
      setAnimationDuration(nextDuration);
    };

    const handlePointerUp = () => {
      setDraggingDuration(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [draggingDuration, setAnimationDuration]);

  const seekTimelineAtClientX = useCallback((
    clientX: number,
    laneLeft: number,
    laneWidth: number,
  ) => {
    const relativeX = Math.min(laneWidth, Math.max(0, clientX - laneLeft));
    setAnimationTime((relativeX / Math.max(laneWidth, 1)) * animation.duration);
  }, [animation.duration, setAnimationTime]);

  const scrollTimelinePaneForPointer = useCallback((clientX: number) => {
    const scrollPane = timelineScrollRef.current;
    if (!scrollPane) {
      return;
    }
    const rect = scrollPane.getBoundingClientRect();
    const threshold = 56;
    const maxScrollLeft = Math.max(0, scrollPane.scrollWidth - scrollPane.clientWidth);

    if (clientX >= rect.right - threshold && scrollPane.scrollLeft < maxScrollLeft) {
      const distance = rect.right - clientX;
      const strength = Math.max(0, threshold - Math.max(distance, 0)) / threshold;
      scrollPane.scrollLeft = Math.min(
        maxScrollLeft,
        scrollPane.scrollLeft + Math.max(8, strength * 24),
      );
      return;
    }

    if (clientX <= rect.left + threshold && scrollPane.scrollLeft > 0) {
      const distance = clientX - rect.left;
      const strength = Math.max(0, threshold - Math.max(distance, 0)) / threshold;
      scrollPane.scrollLeft = Math.max(
        0,
        scrollPane.scrollLeft - Math.max(8, strength * 24),
      );
    }
  }, []);

  const seekTimelineAtPointer = useCallback((clientX: number) => {
    scrollTimelinePaneForPointer(clientX);
    const laneElement = timelineScrollRef.current?.querySelector(".timeline-ruler");
    if (!(laneElement instanceof HTMLElement)) {
      return;
    }
    const laneRect = laneElement.getBoundingClientRect();
    seekTimelineAtClientX(clientX, laneRect.left, laneRect.width);
  }, [scrollTimelinePaneForPointer, seekTimelineAtClientX]);

  useEffect(() => {
    if (!seekingTimeline) {
      return undefined;
    }

    const handlePointerMove = (event: PointerEvent) => {
      seekTimelineAtPointer(event.clientX);
    };

    const handlePointerUp = () => {
      setSeekingTimeline(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [seekTimelineAtPointer, seekingTimeline]);

  const handleTimelineSeekPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    const laneRect = event.currentTarget.getBoundingClientRect();
    seekTimelineAtClientX(event.clientX, laneRect.left, laneRect.width);
    setSeekingTimeline(true);
  };

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const panState = timelinePanStateRef.current;
      if (!panState) {
        return;
      }

      const deltaX = event.clientX - panState.startClientX;
      const deltaY = event.clientY - panState.startClientY;

      if (!panState.isPanning) {
        if (Math.abs(deltaX) < 6 && Math.abs(deltaY) < 6) {
          return;
        }
        if (Math.abs(deltaX) >= Math.abs(deltaY)) {
          panState.isPanning = true;
        } else {
          timelinePanStateRef.current = null;
          return;
        }
      }

      event.preventDefault();
      if (timelineScrollRef.current) {
        timelineScrollRef.current.scrollLeft = panState.startScrollLeft - deltaX;
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      const panState = timelinePanStateRef.current;
      if (!panState) {
        return;
      }
      if (!panState.isPanning) {
        seekTimelineAtClientX(event.clientX, panState.laneLeft, panState.laneWidth);
      }
      timelinePanStateRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [seekTimelineAtClientX]);

  const handleTimelineLanePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    const laneRect = event.currentTarget.getBoundingClientRect();
    timelinePanStateRef.current = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      startScrollLeft: timelineScrollRef.current?.scrollLeft ?? 0,
      laneLeft: laneRect.left,
      laneWidth: laneRect.width,
      isPanning: false,
    };
  };

  useEffect(() => {
    timelineZoomRef.current = timelineZoom;
  }, [timelineZoom]);

  const applyTimelineZoom = useCallback((nextZoom: number, clientX?: number) => {
    const scrollPane = timelineScrollRef.current;
    const previousZoom = timelineZoomRef.current;
    const clampedZoom = Math.min(4, Math.max(0.35, nextZoom));
    if (Math.abs(clampedZoom - previousZoom) < 0.001) {
      return;
    }

    if (!scrollPane) {
      setTimelineZoom(clampedZoom);
      timelineZoomRef.current = clampedZoom;
      return;
    }

    const rect = scrollPane.getBoundingClientRect();
    const anchorX = clientX === undefined
      ? scrollPane.clientWidth / 2
      : Math.min(scrollPane.clientWidth, Math.max(0, clientX - rect.left));
    const currentContentWidth = Math.max(1, scrollPane.scrollWidth);
    const anchorRatio = (scrollPane.scrollLeft + anchorX) / currentContentWidth;

    setTimelineZoom(clampedZoom);
    timelineZoomRef.current = clampedZoom;

    requestAnimationFrame(() => {
      const nextContentWidth = Math.max(1, scrollPane.scrollWidth);
      scrollPane.scrollLeft = Math.max(0, anchorRatio * nextContentWidth - anchorX);
    });
  }, []);

  const handleTimelineWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    if (!event.metaKey && !event.ctrlKey) {
      return;
    }
    event.preventDefault();
    const delta = event.deltaY || event.deltaX;
    const factor = Math.exp(-delta * 0.002);
    applyTimelineZoom(timelineZoomRef.current * factor, event.clientX);
  }, [applyTimelineZoom]);

  useEffect(() => {
    const scrollPane = timelineScrollRef.current;
    if (!scrollPane) {
      return undefined;
    }

    const handleGestureStart = (event: Event) => {
      event.preventDefault();
    };
    const handleGestureChange = (event: Event) => {
      event.preventDefault();
      const gesture = event as Event & { scale?: number; clientX?: number };
      const scale = Number.isFinite(gesture.scale) ? gesture.scale ?? 1 : 1;
      applyTimelineZoom(timelineZoomRef.current * scale, gesture.clientX);
    };

    scrollPane.addEventListener("gesturestart", handleGestureStart, { passive: false });
    scrollPane.addEventListener("gesturechange", handleGestureChange, { passive: false });
    return () => {
      scrollPane.removeEventListener("gesturestart", handleGestureStart);
      scrollPane.removeEventListener("gesturechange", handleGestureChange);
    };
  }, [applyTimelineZoom, expanded, timelineHasTracks]);

  useEffect(() => {
    if (!selectedTrackId) {
      return;
    }
    if (!timelineTree.some((node) => node.id === selectedTrackId)) {
      setSelectedTrackId(null);
    }
  }, [selectedTrackId, timelineTree]);

  useEffect(() => {
    const handleAssetSelectionChange = () => {
      setSelectedTrackId(null);
      setSelectedKeyframe(null);
      clearTimelineSelection();
    };
    window.addEventListener("asset-library-selection-change", handleAssetSelectionChange);
    return () =>
      window.removeEventListener("asset-library-selection-change", handleAssetSelectionChange);
  }, [clearTimelineSelection]);

  useEffect(() => {
    if (!cameraSequenceMenuOpen) {
      return undefined;
    }
    const closeCameraSequenceMenu = () => {
      setCameraSequenceMenuOpen(false);
      setCameraSequenceMenuPosition(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeCameraSequenceMenu();
      }
    };
    window.addEventListener("pointerdown", closeCameraSequenceMenu);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", closeCameraSequenceMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [cameraSequenceMenuOpen]);

  const rulerTicks = useMemo(() => {
    const totalSeconds = Math.max(1, Math.ceil(animation.duration));
    const step = Math.max(1, Math.ceil(totalSeconds / 12));
    return Array.from({ length: Math.floor(totalSeconds / step) + 1 }).map((_, index) => {
      const second = Math.min(totalSeconds, index * step);
      return {
        key: `second-${second}`,
        label: `${second}s`,
        left: `${(second / totalSeconds) * 100}%`,
      };
    });
  }, [animation.duration]);

  const timelineContentWidth = useMemo(
    () => Math.min(36000, Math.max(480, Math.round(animation.duration * 280 * timelineZoom))),
    [animation.duration, timelineZoom],
  );

  const timelineStopTimes = useMemo(() => {
    const times = new Set<number>();
    bindingRows.forEach((binding) => {
      binding.keyframes.forEach((keyframe) => times.add(Number(keyframe.time.toFixed(4))));
      binding.channelRows.forEach((row) => {
        row.keyframes.forEach((keyframe) => times.add(Number(keyframe.time.toFixed(4))));
      });
    });
    return Array.from(times).sort((left, right) => left - right);
  }, [bindingRows]);

  const visibleTimelineNodes = useMemo<VisibleTimelineNode[]>(() => {
    return timelineTree.map((node) => ({
      node,
      depth: node.kind === "section" || node.kind === "cameraSequence" ? 0 : 1,
    }));
  }, [timelineTree]);

  const moveToAdjacentKeyframe = (direction: -1 | 1) => {
    if (!timelineToolsEnabled) {
      setFeedback("请先将资产添加到时间轴");
      return;
    }
    const epsilon = 0.0001;
    const candidates =
      direction < 0
        ? timelineStopTimes.filter((time) => time < animation.currentTime - epsilon)
        : timelineStopTimes.filter((time) => time > animation.currentTime + epsilon);
    const nextTime = direction < 0 ? candidates.at(-1) : candidates[0];
    if (nextTime !== undefined) {
      setAnimationTime(nextTime);
    }
  };

  const getDefaultExportSeconds = useCallback(() => {
    if (ioRange.hasInPoint || ioRange.hasOutPoint) {
      return {
        start: animation.inPointTime ?? 0,
        end: animation.outPointTime ?? animation.duration,
      };
    }
    return {
      start: 0,
      end: animation.duration,
    };
  }, [
    animation.duration,
    animation.inPointTime,
    animation.outPointTime,
    ioRange.hasInPoint,
    ioRange.hasOutPoint,
  ]);

  const getCurrentExportSeconds = useCallback(() => {
    const fallback = getDefaultExportSeconds();
    const startValue = Number(exportStart);
    const endValue = Number(exportEnd);
    if (!Number.isFinite(startValue) || !Number.isFinite(endValue)) {
      return fallback;
    }
    return {
      start: Math.min(animation.duration, Math.max(0, startValue)),
      end: Math.min(animation.duration, Math.max(0, endValue)),
    };
  }, [animation.duration, exportEnd, exportStart, getDefaultExportSeconds]);

  const applyExportSecondRange = useCallback((startSeconds: number, endSeconds: number) => {
    setExportStart(formatSeconds(startSeconds));
    setExportEnd(formatSeconds(endSeconds));
    setExportError("");
  }, []);

  const buildExportRangeFromSeconds = (
    startSeconds: number,
    endSeconds: number,
  ): AnimationExportRange | undefined => {
    const fps = animation.fps;
    const maxFrame = Math.round(animation.duration * fps);
    const { startFrame: clampedStartFrame, endFrame: clampedEndFrame } =
      normalizeExportFrameRange(
        Math.round(startSeconds * fps),
        Math.round(endSeconds * fps),
        maxFrame,
      );

    if (clampedEndFrame <= clampedStartFrame) {
      setExportError("结束时间必须晚于起始时间");
      return undefined;
    }

    return {
      unit: "seconds",
      start: clampedStartFrame / fps,
      end: clampedEndFrame / fps,
      startTime: clampedStartFrame / fps,
      endTime: clampedEndFrame / fps,
      startFrame: clampedStartFrame,
      endFrame: clampedEndFrame,
      frameCount: clampedEndFrame - clampedStartFrame + 1,
    };
  };

  const openExportDialog = () => {
    if (!timelineToolsEnabled) {
      setFeedback("请先将资产添加到时间轴");
      return;
    }
    const rangeSeconds = getDefaultExportSeconds();
    const range = buildExportRangeFromSeconds(rangeSeconds.start, rangeSeconds.end);
    if (!range) {
      return;
    }
    setRecordingProgress({ current: 0, total: range.frameCount });
    setRecordingDialogOpen(true);
    setFeedback("视频保存中");
    window.dispatchEvent(
      new CustomEvent("animation-export-request", {
        detail: {
          name: createAnimationExportName(projectName),
          range,
        } satisfies AnimationExportRequestDetail,
      }),
    );
  };

  const applyDurationLimit = (value: number) => {
    const nextDuration = Math.min(90, Math.max(1, Math.round(value)));
    setAnimationDuration(nextDuration);
    setDurationDraft(nextDuration.toString());
    setFeedback(`时间上限已设为 ${nextDuration}s`);
  };

  useEffect(() => {
    setDurationDraft(Math.round(animation.duration).toString());
  }, [animation.duration]);

  useEffect(() => {
    if (!exportDialogOpen || exportRangeCustomized) {
      return;
    }
    const nextRange = getDefaultExportSeconds();
    applyExportSecondRange(nextRange.start, nextRange.end);
  }, [
    animation.duration,
    animation.inPointTime,
    animation.outPointTime,
    applyExportSecondRange,
    exportDialogOpen,
    exportRangeCustomized,
    getDefaultExportSeconds,
  ]);

  const buildExportRange = (): AnimationExportRange | undefined => {
    const startValue = Number(exportStart);
    const endValue = Number(exportEnd);
    if (!Number.isFinite(startValue) || !Number.isFinite(endValue)) {
      setExportError("请输入有效的起始和结束秒数");
      return undefined;
    }
    if (startValue < 0 || endValue < 0) {
      setExportError("起始和结束秒数不能小于 0");
      return undefined;
    }

    const fps = animation.fps;
    const maxFrame = Math.round(animation.duration * fps);
    const { startFrame: clampedStartFrame, endFrame: clampedEndFrame } =
      normalizeExportFrameRange(
        Math.round(startValue * fps),
        Math.round(endValue * fps),
        maxFrame,
      );

    if (clampedEndFrame <= clampedStartFrame) {
      setExportError("结束时间必须晚于起始时间");
      return undefined;
    }

    return {
      unit: "seconds",
      start: clampedStartFrame / fps,
      end: clampedEndFrame / fps,
      startTime: clampedStartFrame / fps,
      endTime: clampedEndFrame / fps,
      startFrame: clampedStartFrame,
      endFrame: clampedEndFrame,
      frameCount: clampedEndFrame - clampedStartFrame + 1,
    };
  };

  useEffect(() => {
    const handleProgress = (event: Event) => {
      const detail = (event as CustomEvent<{ current: number; total: number }>).detail;
      setRecordingProgress(detail);
      setRecordingDialogOpen(true);
      setFeedback(`正在导出视频 ${detail.current}/${detail.total}`);
    };
    const handleComplete = (event: Event) => {
      const detail = (event as CustomEvent<{ filename: string; format: string }>).detail;
      setRecordingDialogOpen(false);
      setFeedback(`已导出视频：${detail.filename}（${detail.format}）`);
    };
    const handleError = (event: Event) => {
      const detail = (event as CustomEvent<{ message: string }>).detail;
      setRecordingDialogOpen(false);
      setFeedback(detail.message);
    };
    const handleCancelled = () => {
      setRecordingDialogOpen(false);
      setFeedback("视频录制已停止，当前视频未保存");
    };
    window.addEventListener("animation-export-progress", handleProgress);
    window.addEventListener("animation-export-complete", handleComplete);
    window.addEventListener("animation-export-error", handleError);
    window.addEventListener("animation-export-cancelled", handleCancelled);
    return () => {
      window.removeEventListener("animation-export-progress", handleProgress);
      window.removeEventListener("animation-export-complete", handleComplete);
      window.removeEventListener("animation-export-error", handleError);
      window.removeEventListener("animation-export-cancelled", handleCancelled);
    };
  }, []);

  const getKeyframeTitle = (keyframe: TimelineDisplayKeyframe) =>
    formatSecondLabel(keyframe.time);

  const getClipTitle = (clip: TimelineCameraClip) =>
    `${clip.label} · 从 ${formatSecondLabel(clip.startTime)} 开始切换`;

  const getIoMarkerTitle = (type: "in" | "out", time: number) =>
    `${type === "in" ? "入点" : "出点"} · ${formatSecondLabel(time)}`;

  const handleAddCameraToSequence = (cameraId: string) => {
    const result = addCameraCutAtTime(cameraId);
    setCameraSequenceMenuOpen(false);
    setCameraSequenceMenuPosition(null);
    if (result.ok) {
      setActiveCamera(cameraId);
      setCameraPreviewActive(true);
    }
    setFeedback(result.ok ? "已添加到机位序列" : result.message);
  };

  const exportDurationSeconds = useMemo(() => {
    const range = exportRangeCustomized
      ? getCurrentExportSeconds()
      : getDefaultExportSeconds();
    return formatSeconds(Math.max(0, range.end - range.start));
  }, [exportRangeCustomized, getCurrentExportSeconds, getDefaultExportSeconds]);

  const handleKeyframePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    keyframe: TimelineDisplayKeyframe,
    editable: boolean,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const laneRect = event.currentTarget.parentElement?.getBoundingClientRect();
    setSelectedKeyframe({
      id: keyframe.id,
      refs: keyframe.refs,
      time: keyframe.time,
    });
    setSelectedTimelineKeyframe({
      id: keyframe.id,
      refs: keyframe.refs,
      time: keyframe.time,
    });
    setSelectedTrackId(null);
    clearSelection();
    setAnimationTime(keyframe.time);
    if (!editable) {
      return;
    }
    if (!laneRect) {
      return;
    }
    setDraggingKeyframe({
      id: keyframe.id,
      refs: keyframe.refs,
      time: keyframe.time,
      laneLeft: laneRect.left,
      laneWidth: laneRect.width,
    });
  };

  const renderLane = (
    keyframes: TimelineDisplayKeyframe[],
    laneClassName = "timeline-track-lane",
    interactive = false,
    editable = false,
    muted = false,
    trajectoryId?: string,
  ) => (
    <div
      className={`${laneClassName} ${muted ? "is-muted" : ""}`}
      onPointerDown={handleTimelineLanePointerDown}
    >
      {trajectoryId && keyframes.length > 1 ? keyframes.slice(0, -1).map((keyframe, index) => {
        const next = keyframes[index + 1];
        const id = `${trajectoryId}:${keyframe.id}:${next.id}`;
        const left = (keyframe.time / Math.max(animation.duration, 0.001)) * 100;
        const width = ((next.time - keyframe.time) / Math.max(animation.duration, 0.001)) * 100;
        return (
          <button
            className={`timeline-trajectory-segment ${selectedTrajectoryId === id ? "is-selected" : ""}`}
            key={id}
            style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }}
            type="button"
            title="点击编辑轨迹；双击恢复直线"
            onDoubleClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              window.dispatchEvent(new CustomEvent("trajectory-edit-change", { detail: { id, reset: true } }));
            }}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setSelectedTrajectoryId(id);
              window.dispatchEvent(new CustomEvent("trajectory-edit-change", { detail: { id, targetId: trajectoryId, startTime: keyframe.time, endTime: next.time } }));
              setFeedback("已进入轨迹编辑，可拖动控制点");
            }}
          >
          </button>
        );
      }) : null}
      {keyframes.map((keyframe) => (
        <button
          className={`timeline-keyframe ${
            Math.abs(keyframe.time - animation.currentTime) < 0.0001 ? "is-active" : ""
          } ${
            lastEditedKeyframeIds.includes(keyframe.id) ? "is-last-edited" : ""
          } ${selectedKeyframe?.id === keyframe.id ? "is-selected" : ""} ${muted ? "is-muted" : ""}`}
          key={keyframe.id}
          style={{
            left: `${(keyframe.time / Math.max(animation.duration, 0.001)) * 100}%`,
          }}
          title={getKeyframeTitle(keyframe)}
          type="button"
          onPointerDown={(event) => handleKeyframePointerDown(event, keyframe, editable)}
        />
      ))}
      {interactive ? (
        <input
          className="timeline-scrubber"
          max={animation.duration}
          min={0}
          step={1 / animation.fps}
          type="range"
          value={animation.currentTime}
          onInput={(event) => {
            setAnimationTime(Number((event.target as HTMLInputElement).value));
          }}
        />
      ) : null}
    </div>
  );

  const renderCameraClipLane = (
    clip: TimelineCameraClip | undefined,
    keyframes: TimelineDisplayKeyframe[],
    muted = false,
  ) => (
    <div
      className={`timeline-track-lane timeline-camera-lane ${muted ? "is-muted" : ""}`}
      onPointerDown={handleTimelineLanePointerDown}
    >
      {!clip ? <span className="timeline-camera-empty">未设置机位范围</span> : null}
      {keyframes.map((keyframe) => (
        <button
          className={`timeline-keyframe ${
            Math.abs(keyframe.time - animation.currentTime) < 0.0001 ? "is-active" : ""
          } ${
            lastEditedKeyframeIds.includes(keyframe.id) ? "is-last-edited" : ""
          } ${selectedKeyframe?.id === keyframe.id ? "is-selected" : ""} ${muted ? "is-muted" : ""}`}
          key={keyframe.id}
          style={{
            left: `${(keyframe.time / Math.max(animation.duration, 0.001)) * 100}%`,
          }}
          title={getKeyframeTitle(keyframe)}
          type="button"
          onPointerDown={(event) => handleKeyframePointerDown(event, keyframe, true)}
        />
      ))}
      {clip
        ? (() => {
        const left = (clip.startTime / Math.max(animation.duration, 0.001)) * 100;
        const width =
          ((clip.endTime - clip.startTime) / Math.max(animation.duration, 0.001)) * 100;
        const cutRef = clip.refs.find((ref) => ref.kind === "cameraCut");
        return (
          <div
            className={`timeline-camera-clip ${
              selectedKeyframe?.id === clip.id ? "is-selected" : ""
            } ${muted ? "is-muted" : ""}`}
            key={clip.id}
            role="button"
            style={{
              left: `${left}%`,
              width: `${Math.max(width, 2)}%`,
            }}
            tabIndex={0}
            title={getClipTitle(clip)}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const laneRect = event.currentTarget.parentElement?.getBoundingClientRect();
              setSelectedKeyframe({
                id: clip.id,
                refs: clip.refs,
                time: clip.startTime,
              });
              setSelectedTimelineKeyframe(undefined);
              setSelectedTrackId(null);
              clearSelection();
              setAnimationTime(clip.startTime);
              setActiveCamera(clip.cameraId);
              setCameraPreviewActive(true);
              setFeedback(`已切换到${clip.label}`);
              if (!laneRect) {
                return;
              }
              setDraggingKeyframe({
                id: clip.id,
                refs: clip.refs,
                time: clip.startTime,
                laneLeft: laneRect.left,
                laneWidth: laneRect.width,
              });
            }}
          >
            {cutRef?.kind === "cameraCut" ? (
              <>
                <span
                  className="timeline-camera-clip-handle is-start"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const laneRect = event.currentTarget
                      .closest(".timeline-camera-lane")
                      ?.getBoundingClientRect();
                    if (!laneRect) {
                      return;
                    }
                    setSelectedKeyframe({
                      id: clip.id,
                      refs: clip.refs,
                      time: clip.startTime,
                    });
                    setResizingCameraClip({
                      cutId: cutRef.cutId,
                      edge: "start",
                      laneLeft: laneRect.left,
                      laneWidth: laneRect.width,
                    });
                  }}
                />
                <strong>{clip.label}</strong>
                <span
                  className="timeline-camera-clip-handle is-end"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const laneRect = event.currentTarget
                      .closest(".timeline-camera-lane")
                      ?.getBoundingClientRect();
                    if (!laneRect) {
                      return;
                    }
                    setSelectedKeyframe({
                      id: clip.id,
                      refs: clip.refs,
                      time: clip.endTime,
                    });
                    setResizingCameraClip({
                      cutId: cutRef.cutId,
                      edge: "end",
                      laneLeft: laneRect.left,
                      laneWidth: laneRect.width,
                    });
                  }}
                />
              </>
            ) : (
              <strong>{clip.label}</strong>
            )}
          </div>
        );
      })()
        : null}
    </div>
  );

  const renderCameraSequenceLane = () => (
    <div
      className="timeline-track-lane timeline-camera-lane timeline-sequence-lane"
      onPointerDown={handleTimelineLanePointerDown}
    >
      {!cameraSequenceClips.length ? (
        <span className="timeline-camera-empty">
          添加机位后，可在播放时切换机位视角
        </span>
      ) : null}
      {cameraSequenceClips.map((clip) => {
        const left = (clip.startTime / Math.max(animation.duration, 0.001)) * 100;
        return (
          <button
            className={`timeline-camera-frame ${
              selectedKeyframe?.id === clip.id ? "is-selected" : ""
            }`}
            key={clip.id}
            style={{
              left: `${left}%`,
            }}
            type="button"
            tabIndex={0}
            title={getClipTitle(clip)}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const laneRect = event.currentTarget.parentElement?.getBoundingClientRect();
              setSelectedKeyframe({
                id: clip.id,
                refs: clip.refs,
                time: clip.startTime,
              });
              setSelectedTimelineKeyframe(undefined);
              setSelectedTrackId(null);
              clearSelection();
              setAnimationTime(clip.startTime);
              setActiveCamera(clip.cameraId);
              setCameraPreviewActive(true);
              setFeedback(`已切换到${clip.label}`);
              if (!laneRect) {
                return;
              }
              setDraggingKeyframe({
                id: clip.id,
                refs: clip.refs,
                time: clip.startTime,
                laneLeft: laneRect.left,
                laneWidth: laneRect.width,
              });
            }}
          >
            <span className="timeline-camera-frame-diamond" />
            <strong>{clip.label}</strong>
          </button>
        );
      })}
    </div>
  );

  const renderSummaryDots = () => (
    <>
      {timelineStopTimes.map((time) => (
        <span
          className="timeline-summary-dot"
          key={`summary-dot-${time}`}
          style={{
            left: `${(time / Math.max(animation.duration, 0.001)) * 100}%`,
          }}
        />
      ))}
    </>
  );

  const renderGlobalPlayhead = () => (
    <div
      className="timeline-global-playhead"
      style={
        {
          "--playhead-left": `${
            (animation.currentTime / Math.max(animation.duration, 0.001)) * 100
          }%`,
        } as CSSProperties
      }
    >
      <span>{formatSecondLabel(animation.currentTime)}</span>
    </div>
  );

  const renderIoRange = () => {
    if (!ioRange.hasVisibleRange) {
      return null;
    }

    const left = (ioRange.startTime / Math.max(animation.duration, 0.001)) * 100;
    const width =
      ((ioRange.endTime - ioRange.startTime) / Math.max(animation.duration, 0.001)) * 100;

    return (
      <div
        className="timeline-io-range"
        style={{
          left: `${left}%`,
          width: `${Math.max(width, 0)}%`,
        }}
      />
    );
  };

  const renderIoMarkers = () => (
    <>
      {animation.inPointTime !== undefined ? (
        <button
          aria-label="拖拽或双击取消入点"
          className={`timeline-io-marker is-in ${
            draggingRangePoint?.type === "in" ? "is-dragging" : ""
          }`}
          style={{
            left: `${(animation.inPointTime / Math.max(animation.duration, 0.001)) * 100}%`,
          }}
          title={getIoMarkerTitle("in", animation.inPointTime)}
          type="button"
          onDoubleClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            handleClearInPoint();
          }}
          onPointerDown={(event) => handleRangePointPointerDown(event, "in")}
        >
          I
        </button>
      ) : null}
      {animation.outPointTime !== undefined ? (
        <button
          aria-label="拖拽或双击取消出点"
          className={`timeline-io-marker is-out ${
            draggingRangePoint?.type === "out" ? "is-dragging" : ""
          }`}
          style={{
            left: `${(animation.outPointTime / Math.max(animation.duration, 0.001)) * 100}%`,
          }}
          title={getIoMarkerTitle("out", animation.outPointTime)}
          type="button"
          onDoubleClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            handleClearOutPoint();
          }}
          onPointerDown={(event) => handleRangePointPointerDown(event, "out")}
        >
          O
        </button>
      ) : null}
    </>
  );

  const renderCameraSequenceMenu = () => {
    if (
      typeof document === "undefined" ||
      !cameraSequenceMenuOpen ||
      !cameraSequenceMenuPosition
    ) {
      return null;
    }

    return createPortal(
      <div
        className="timeline-camera-menu"
        style={{
          left: cameraSequenceMenuPosition.left,
          top: cameraSequenceMenuPosition.top,
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="timeline-camera-menu-title">选择机位</div>
        {cameras.length ? (
          cameras.map((camera) => (
            <button
              key={camera.id}
              className="timeline-camera-menu-item"
              type="button"
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handleAddCameraToSequence(camera.id);
              }}
            >
              <Camera size={13} />
              <span>{camera.name}</span>
            </button>
          ))
        ) : (
          <span className="timeline-camera-menu-empty">当前暂无机位</span>
        )}
      </div>,
      document.body,
    );
  };

  const getVisibleNodeKeyframes = (node: TimelineTreeNode) => {
    return {
      subtitleVisible: true,
      visibleKeyframes: node.keyframes,
    };
  };

  const renderTreeLabel = ({ node, depth }: VisibleTimelineNode) => {
    const isSection = node.kind === "section";
    const isCameraSequence = node.kind === "cameraSequence";
    const labelClassName = isSection
      ? "timeline-section-title"
      : "timeline-track-meta timeline-node-meta";
    const canSort = node.kind === "camera" || node.kind === "object";

    return (
      <div
        className={`timeline-label-row timeline-node-${node.kind} ${
          selectedTrackId === node.id ? "is-selected" : ""
        } ${node.muted ? "is-muted" : ""}`}
        key={`label:${node.id}`}
        onPointerDown={(event) => {
          if (!canSort) {
            return;
          }
          event.preventDefault();
          setSelectedTrackId(node.id);
          setSelectedKeyframe(null);
          setSelectedTimelineKeyframe(undefined);
          clearSelection();
        }}
      >
        <div
          className={labelClassName}
          style={{ "--timeline-indent": `${depth * 14}px` } as CSSProperties}
        >
          {canSort ? <GripVertical size={13} /> : null}
          {isSection ? <span>{node.label}</span> : <strong>{node.label}</strong>}
          {isCameraSequence ? (
            <span className="timeline-camera-sequence-actions">
              <button
                className={`timeline-camera-add-button ${
                  cameraSequenceMenuOpen ? "is-active" : ""
                }`}
                type="button"
                title="添加机位到序列"
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (!cameras.length) {
                    setCameraSequenceMenuOpen(false);
                    setCameraSequenceMenuPosition(null);
                    setFeedback("当前暂无机位");
                    return;
                  }
                  const rect = event.currentTarget.getBoundingClientRect();
                  const menuWidth = 188;
                  const menuHeight = Math.min(280, 56 + cameras.length * 36);
                  const belowTop = rect.bottom + 6;
                  const top =
                    belowTop + menuHeight <= window.innerHeight - 8
                      ? belowTop
                      : Math.max(8, rect.top - menuHeight - 6);
                  setCameraSequenceMenuPosition({
                    left: Math.min(
                      window.innerWidth - menuWidth - 8,
                      Math.max(8, rect.left),
                    ),
                    top,
                  });
                  setCameraSequenceMenuOpen((current) => !current);
                }}
              >
                <Plus size={14} />
              </button>
            </span>
          ) : null}
          {!isSection && node.subtitle ? <span>{node.subtitle}</span> : null}
        </div>
      </div>
    );
  };

  const renderTreeLane = ({ node, depth }: VisibleTimelineNode) => {
    const laneClassName = node.laneClassName ?? "timeline-track-lane";
    const { visibleKeyframes } = getVisibleNodeKeyframes(node);

    return (
      <div
        className={`timeline-lane-row timeline-node-group depth-${depth} ${
          selectedTrackId === node.id ? "is-selected" : ""
        } ${node.muted ? "is-muted" : ""}`}
        key={`lane:${node.id}`}
        onPointerDown={() => {
          if (node.kind === "camera" || node.kind === "object") {
            setSelectedTrackId(node.id);
            setSelectedKeyframe(null);
            setSelectedTimelineKeyframe(undefined);
            clearSelection();
          }
        }}
      >
        {node.kind === "section"
          ? <div className="timeline-section-lane" />
          : node.kind === "cameraSequence"
            ? renderCameraSequenceLane()
          : node.kind === "camera"
            ? renderLane(visibleKeyframes, laneClassName, false, Boolean(visibleKeyframes.length), node.muted, node.id)
            : renderLane(visibleKeyframes, laneClassName, false, Boolean(visibleKeyframes.length), node.muted, node.id)}
      </div>
    );
  };

  const syncTrackScroll = (source: "left" | "right") => {
    const sourceElement =
      source === "left" ? timelineLeftListRef.current : timelineRightListRef.current;
    const targetElement =
      source === "left" ? timelineRightListRef.current : timelineLeftListRef.current;
    const targetSide = source === "left" ? "right" : "left";

    if (!sourceElement || !targetElement) {
      return;
    }
    if (syncingTrackScrollRef.current === source) {
      syncingTrackScrollRef.current = null;
      return;
    }
    syncingTrackScrollRef.current = targetSide;
    targetElement.scrollTop = sourceElement.scrollTop;
    requestAnimationFrame(() => {
      if (syncingTrackScrollRef.current === targetSide) {
        syncingTrackScrollRef.current = null;
      }
    });
  };

  if (!expanded) {
    return null;
  }

  return (
    <section
      className="timeline-panel is-expanded"
      style={{ height: `${height}px` }}
    >
      <button
        className="timeline-resize-handle"
        type="button"
        aria-label="调整时间轴高度"
        onPointerDown={(event) => {
          event.preventDefault();
          resizeStateRef.current = {
            startY: event.clientY,
            startHeight: height,
          };
        }}
      >
        <span />
      </button>
        <div className="timeline-panel-body">
          <div className="timeline-editor-toolbar">
            <div className="timeline-toolbar-left">
              <div className="timeline-editor-title timeline-editor-title-static">
                <TimelineMarkIcon size={15} />
                <strong>时间轴</strong>
              </div>
              <div className="timeline-duration-control">
                <button
                  className={`timeline-duration-dragger ${draggingDuration ? "is-dragging" : ""}`}
                  type="button"
                  disabled={!timelineToolsEnabled}
                  title="拖动调节时间长度"
                  onPointerDown={(event) => {
                    if (!timelineToolsEnabled) {
                      return;
                    }
                    event.preventDefault();
                    setDraggingDuration({
                      startX: event.clientX,
                      startDuration: Math.round(animation.duration),
                    });
                  }}
                >
                  <Clock3 size={14} />
                </button>
                <label className="timeline-duration-inline-input">
                  <input
                    min={1}
                    max={90}
                    disabled={!timelineToolsEnabled}
                    type="number"
                    value={durationDraft}
                    onChange={(event) => setDurationDraft(event.target.value)}
                    onBlur={() => applyDurationLimit(Number(durationDraft))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.currentTarget.blur();
                      }
                    }}
                  />
                  <span>s</span>
                </label>
              </div>
            </div>
            <div className="timeline-toolbar-right">
              <div className="timeline-playback-group">
                <button
                  type="button"
                  disabled={!timelineToolsEnabled}
                  title="上一关键帧"
                  onClick={() => moveToAdjacentKeyframe(-1)}
                >
                  <SkipBack size={14} />
                </button>
                <button
                  type="button"
                  disabled={!timelineToolsEnabled}
                  title={animation.isPlaying ? "暂停" : "播放"}
                  onPointerDown={(event) => {
                    if (!timelineToolsEnabled) {
                      return;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    toggleAnimationPlayback();
                  }}
                >
                  {animation.isPlaying ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button
                  type="button"
                  disabled={!timelineToolsEnabled}
                  title="下一关键帧"
                  onClick={() => moveToAdjacentKeyframe(1)}
                >
                  <SkipForward size={14} />
                </button>
                <button
                  className={`timeline-loop-button ${animation.loop ? "is-active" : ""}`}
                  type="button"
                  disabled={!timelineToolsEnabled}
                  title={animation.loop ? "循环播放" : "单次播放"}
                  onClick={toggleAnimationLoop}
                >
                  <Repeat2 size={14} />
                </button>
              </div>
              <button
                className="timeline-range-button is-in"
                type="button"
                disabled={!timelineToolsEnabled}
                onClick={handleSetInPoint}
              >
                <span>入点</span>
                <strong>I</strong>
              </button>
              <button
                className="timeline-range-button is-out"
                type="button"
                disabled={!timelineToolsEnabled}
                onClick={handleSetOutPoint}
              >
                <span>出点</span>
                <strong>O</strong>
              </button>
              <button
                className={`timeline-auto-key-button ${
                  animation.autoKeyEnabled ? "is-active" : ""
                }`}
                type="button"
                disabled={!timelineToolsEnabled}
                title="被修改过的属性自动插帧"
                onClick={() => setAnimationAutoKeyEnabled(!animation.autoKeyEnabled)}
              >
                <TimerReset size={14} />
                <span>自动插帧</span>
              </button>
              <button
                className={`timeline-primary-button ${canInsertSelectedAsset ? "is-ready" : ""}`}
                type="button"
                disabled={!canInsertSelectedAsset}
                title={
                  canInsertSelectedAsset
                    ? "将当前选中资产添加到时间轴并插入关键帧"
                    : "请先从资产列表选择资产"
                }
                onClick={handleCapture}
              >
                <KeyRound size={14} />
                <span>插帧</span>
              </button>
              <button
                className="timeline-ghost-button"
                type="button"
                disabled={!timelineToolsEnabled || !selectedKeyframe}
                title={selectedKeyframe ? "删除所选内容" : "请先选择关键帧或机位范围"}
                onClick={handleDeleteSelectedKeyframe}
              >
                <Trash2 size={14} />
                <span>删除</span>
              </button>
              <button
                className="timeline-export-button"
                type="button"
                disabled={!timelineToolsEnabled}
                onClick={openExportDialog}
              >
                <Download size={14} />
                <span>导出视频</span>
              </button>
            </div>
          </div>

          {recordingDialogOpen ? (
            <div className="timeline-recording-overlay" role="dialog" aria-label="视频保存中">
              <div className="timeline-recording-dialog">
                <div className="timeline-export-header">
                  <strong>视频保存中</strong>
                </div>
                <div className="timeline-recording-status">
                  <span className="timeline-recording-spinner" />
                  <span>
                    {recordingProgress
                      ? `${recordingProgress.current}/${recordingProgress.total}`
                      : "准备录制"}
                  </span>
                </div>
                <div className="timeline-export-summary">
                  <span>录制范围由入点 / 出点控制</span>
                </div>
                <div className="timeline-export-actions">
                  <button
                    className="timeline-ghost-button"
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(new Event("animation-export-cancel"));
                    }}
                  >
                    取消录制
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div
            className="timeline-editor-grid"
          >
            <div className="timeline-left-head timeline-timecode-head">
              <span className="timeline-timecode-value">
                {formatSecondLabel(animation.currentTime)}
              </span>
              <span className="timeline-duration-total">
                / {formatSeconds(animation.duration)}s
              </span>
            </div>
            <div
              className="timeline-track-list timeline-label-list"
              ref={timelineLeftListRef}
              onScroll={() => syncTrackScroll("left")}
            >
              {visibleTimelineNodes.map((item) => renderTreeLabel(item))}
            </div>
            <div
              className="timeline-scroll-pane"
              ref={timelineScrollRef}
              onWheel={handleTimelineWheel}
            >
              <div
                className="timeline-scroll-content"
                style={
                  {
                    "--timeline-content-width": `${timelineContentWidth}px`,
                  } as CSSProperties
                }
              >
                <div className="timeline-ruler" onPointerDown={handleTimelineSeekPointerDown}>
                  {renderIoRange()}
                  {rulerTicks.map((tick) => (
                    <span className="timeline-ruler-tick" key={tick.key} style={{ left: tick.left }}>
                      {tick.label}
                    </span>
                  ))}
                  {renderSummaryDots()}
                  {renderIoMarkers()}
                </div>
                <div
                  className="timeline-track-list timeline-tree-list timeline-lane-list"
                  ref={timelineRightListRef}
                  onScroll={() => syncTrackScroll("right")}
                >
                  {visibleTimelineNodes.map((item) => renderTreeLane(item))}
                </div>
                {!timelineHasTracks ? (
                  <div className="timeline-empty-state timeline-empty-state-inline">
                    <span>
                      {canInsertSelectedAsset
                        ? "点击插针，将当前资产添加到时间轴"
                        : "请选择左侧资产，并点击插针添加到时间轴"}
                    </span>
                  </div>
                ) : null}
                {renderGlobalPlayhead()}
              </div>
            </div>
          </div>
          {renderCameraSequenceMenu()}
        </div>
    </section>
  );
}
