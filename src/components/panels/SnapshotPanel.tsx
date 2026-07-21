import {
  ChevronLeft,
  Download,
  Film,
  ImagePlus,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  createAnimationExportName,
  type AnimationExportRange,
  type AnimationExportRequestDetail,
} from "../../export/animationExport";
import type { SnapshotRecord } from "../../domain/projectTypes";
import { useProjectStore } from "../../store/projectStore";

type RecordTab = "snapshot" | "video";

function formatSnapshotTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildFullAnimationRange(duration: number, fps: number): AnimationExportRange {
  const safeFps = Math.max(1, Math.round(fps));
  const endFrame = Math.max(1, Math.round(duration * safeFps));
  return {
    unit: "frames",
    start: 0,
    end: endFrame,
    startTime: 0,
    endTime: endFrame / safeFps,
    startFrame: 0,
    endFrame,
    frameCount: endFrame + 1,
  };
}

function SnapshotThumb({
  snapshot,
  onDelete,
  onOpen,
}: {
  snapshot: SnapshotRecord;
  onDelete: (snapshotId: string) => void;
  onOpen: (snapshot: SnapshotRecord) => void;
}) {
  return (
    <div
      className="record-thumb"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(snapshot)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(snapshot);
        }
      }}
    >
      <img src={snapshot.imageDataUrl} alt={snapshot.name} />
      <span>{snapshot.name}</span>
      <span className="record-thumb-menu">
        <MoreHorizontal size={13} />
      </span>
      <button
        className="record-thumb-delete"
        title="删除快照"
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onDelete(snapshot.id);
        }}
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

export function SnapshotPanel() {
  const snapshots = useProjectStore((state) => state.snapshots);
  const activeCameraId = useProjectStore((state) => state.activeCameraId);
  const cameras = useProjectStore((state) => state.cameras);
  const animation = useProjectStore((state) => state.animation);
  const projectName = useProjectStore((state) => state.projectName);
  const removeSnapshot = useProjectStore((state) => state.removeSnapshot);
  const [activeTab, setActiveTab] = useState<RecordTab>("snapshot");
  const [selectedSnapshot, setSelectedSnapshot] = useState<SnapshotRecord>();
  const [videoStatus, setVideoStatus] = useState("按当前时间线范围导出视频");
  const [pendingVideo, setPendingVideo] = useState<AnimationExportRequestDetail>();

  const currentCameraName = useMemo(
    () =>
      activeCameraId
        ? cameras.find((camera) => camera.id === activeCameraId)?.name
        : undefined,
    [activeCameraId, cameras],
  );

  useEffect(() => {
    const handleProgress = (event: Event) => {
      const detail = (event as CustomEvent<{ current: number; total: number }>).detail;
      setVideoStatus(`正在录制 ${detail.current}/${detail.total}`);
    };
    const handleComplete = (event: Event) => {
      const detail = (event as CustomEvent<{ filename: string; format: string }>).detail;
      setVideoStatus(`已保存 ${detail.format}：${detail.filename}`);
    };
    const handleError = (event: Event) => {
      const detail = (event as CustomEvent<{ message: string }>).detail;
      setVideoStatus(detail.message);
    };
    const handleSaveRequest = (event: Event) => {
      const detail = (event as CustomEvent<AnimationExportRequestDetail>).detail;
      setPendingVideo(detail);
      setActiveTab("video");
      setVideoStatus(
        `已保存 ${Math.max(0, detail.range.endTime - detail.range.startTime).toFixed(2)}s 视频范围，点击“选择并导出”导出文件`,
      );
    };
    window.addEventListener("animation-export-progress", handleProgress);
    window.addEventListener("animation-export-complete", handleComplete);
    window.addEventListener("animation-export-error", handleError);
    window.addEventListener("video-record-save-request", handleSaveRequest);
    return () => {
      window.removeEventListener("animation-export-progress", handleProgress);
      window.removeEventListener("animation-export-complete", handleComplete);
      window.removeEventListener("animation-export-error", handleError);
      window.removeEventListener("video-record-save-request", handleSaveRequest);
    };
  }, []);

  const handleSnapshotExport = () => {
    window.dispatchEvent(new CustomEvent("snapshot-export-request"));
  };

  const handleVideoExport = () => {
    setVideoStatus("准备录制视频...");
    const detail =
      pendingVideo ?? {
        name: createAnimationExportName(projectName),
        range: buildFullAnimationRange(animation.duration, animation.fps),
      };
    window.dispatchEvent(
      new CustomEvent("animation-export-request", {
        detail,
      }),
    );
  };

  if (selectedSnapshot) {
    const cameraName = selectedSnapshot.cameraId
      ? cameras.find((camera) => camera.id === selectedSnapshot.cameraId)?.name ?? "无机位"
      : "无机位";

    return (
      <section className="record-panel record-panel-detail">
        <div className="record-detail-header">
          <button type="button" onClick={() => setSelectedSnapshot(undefined)}>
            <ChevronLeft size={16} />
            <span>画面管理</span>
          </button>
          <button
            type="button"
            onClick={() => {
              snapshots.forEach((item) => removeSnapshot(item.id));
              setSelectedSnapshot(undefined);
            }}
          >
            全部删除
          </button>
        </div>
        <div className="record-detail-camera">{cameraName}</div>
        <div className="record-detail-grid">
          {snapshots.map((snapshot) => (
            <button
              className={`record-detail-tile ${
                snapshot.id === selectedSnapshot.id ? "is-active" : ""
              }`}
              key={snapshot.id}
              type="button"
              onClick={() => setSelectedSnapshot(snapshot)}
            >
              <img src={snapshot.imageDataUrl} alt={snapshot.name} />
            </button>
          ))}
        </div>
        <div className="record-detail-card">
          <img src={selectedSnapshot.imageDataUrl} alt={selectedSnapshot.name} />
          <strong>{selectedSnapshot.name}</strong>
          <span>创建于 {formatSnapshotTime(selectedSnapshot.createdAt)}</span>
          <div className="record-detail-actions">
            <a download={`${selectedSnapshot.name}.png`} href={selectedSnapshot.imageDataUrl}>
              添加到画布
            </a>
            <button
              type="button"
              onClick={() => {
                removeSnapshot(selectedSnapshot.id);
                setSelectedSnapshot(undefined);
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="record-panel">
      <div className="record-heading">
        <div>
          <h2>画面管理</h2>
          <p>快照与视频独立管理</p>
        </div>
        <button
          className="primary-small record-export-button"
          type="button"
          disabled={activeTab === "snapshot" && !activeCameraId}
          onClick={activeTab === "snapshot" ? handleSnapshotExport : handleVideoExport}
        >
          {activeTab === "snapshot" ? (
            <>
              <Download size={14} />
              选择并导出
            </>
          ) : (
            <>
              <Download size={14} />
              选择并导出
            </>
          )}
        </button>
      </div>

      <div className="record-tabs">
        <button
          className={activeTab === "snapshot" ? "is-active" : ""}
          type="button"
          onClick={() => setActiveTab("snapshot")}
        >
          快照
        </button>
        <button
          className={activeTab === "video" ? "is-active" : ""}
          type="button"
          onClick={() => setActiveTab("video")}
        >
          视频
        </button>
      </div>

      {activeTab === "snapshot" ? (
        snapshots.length ? (
          <div className="record-thumb-grid">
            {snapshots.slice(0, 6).map((snapshot) => (
              <SnapshotThumb
                key={snapshot.id}
                snapshot={snapshot}
                onDelete={removeSnapshot}
                onOpen={setSelectedSnapshot}
              />
            ))}
          </div>
        ) : (
          <div className="empty-snapshot record-empty">
            <ImagePlus size={18} />
            <span>{currentCameraName ? `${currentCameraName} 下还没有快照` : "当前空间下还没有机位"}</span>
            <span>点击“选择并导出”保存快照</span>
          </div>
        )
      ) : (
        <div className="video-record-card">
          <Film size={18} />
          <strong>视频</strong>
          <span>{videoStatus}</span>
        </div>
      )}
    </section>
  );
}
