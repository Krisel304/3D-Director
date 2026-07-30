import {
  Box,
  Camera,
  CircleHelp,
  ChevronDown,
  ChevronRight,
  ImagePlus,
  Move3D,
  MousePointer2,
  PersonStanding,
  Rotate3D,
  ScanSearch,
  Scale3D,
  Square,
  Upload,
  UserRound,
  Users,
  Video,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { OUTPUT_FRAME_PRESETS } from "../../domain/outputFrames";
import type { ToolMode, TransformMode } from "../../domain/projectTypes";
import { useProjectStore } from "../../store/projectStore";

type OpenMenu = "move" | "object" | "space" | "aspect" | undefined;
type SpaceAssetPicker = "scene" | "panorama" | undefined;

const moveOptions: Array<{
  id: TransformMode;
  label: string;
  shortcut: string;
  icon: typeof Move3D;
}> = [
  { id: "translate", label: "移动", shortcut: "V", icon: Move3D },
  { id: "rotate", label: "旋转", shortcut: "R", icon: Rotate3D },
  { id: "scale", label: "缩放", shortcut: "X", icon: Scale3D },
];

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

export function BottomToolbar({
  lifted = false,
  liftedHeight = 420,
  timelineExpanded,
  onTimelineToggle,
}: {
  lifted?: boolean;
  liftedHeight?: number;
  timelineExpanded: boolean;
  onTimelineToggle: () => void;
}) {
  const toolbarRef = useRef<HTMLElement>(null);
  const glbInputRef = useRef<HTMLInputElement>(null);
  const panoramaInputRef = useRef<HTMLInputElement>(null);
  const [openMenu, setOpenMenu] = useState<OpenMenu>();
  const [spaceAssetPicker, setSpaceAssetPicker] = useState<SpaceAssetPicker>();
  const [crowdExpanded, setCrowdExpanded] = useState(false);
  const [crowdRows, setCrowdRows] = useState(3);
  const [crowdColumns, setCrowdColumns] = useState(3);
  const [crowdSpacing, setCrowdSpacing] = useState(1.8);

  const activeTool = useProjectStore((state) => state.activeTool);
  const activeCameraId = useProjectStore((state) => state.activeCameraId);
  const outputFrame = useProjectStore((state) => state.outputFrame);
  const transformMode = useProjectStore((state) => state.transformMode);
  const setActiveTool = useProjectStore((state) => state.setActiveTool);
  const setTransformMode = useProjectStore((state) => state.setTransformMode);
  const setOutputFrame = useProjectStore((state) => state.setOutputFrame);

  const currentMoveLabel = useMemo(
    () => moveOptions.find((item) => item.id === transformMode) ?? moveOptions[0],
    [transformMode],
  );
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!toolbarRef.current?.contains(event.target as Node)) {
        setOpenMenu(undefined);
      }
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isEditableTarget(event.target)) {
        return;
      }
      const key = event.key.toLowerCase();
      const nextMode =
        key === "v" ? "translate" : key === "r" ? "rotate" : key === "x" ? "scale" : undefined;
      if (!nextMode) {
        return;
      }
      event.preventDefault();
      setTransformMode(nextMode);
      setActiveTool("move");
      setOpenMenu(undefined);
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [setActiveTool, setTransformMode]);

  const triggerGlbImport = () => {
    setActiveTool("object");
    glbInputRef.current?.click();
    setOpenMenu(undefined);
  };

  const triggerPanoramaImport = () => {
    setActiveTool("panorama");
    panoramaInputRef.current?.click();
    setOpenMenu(undefined);
  };

  const notifyUnavailableImport = (source: "canvas" | "space", assetType: "scene" | "panorama") => {
    const assetLabel = assetType === "scene" ? "空间资产" : "全景图";
    const sourceLabel = source === "canvas" ? "当前画布" : "空间";
    useProjectStore
      .getState()
      .setImportError(`${sourceLabel}导入${assetLabel}将在接入资产库后提供；当前可使用本地上传。`);
  };

  const handleGlbFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    window.dispatchEvent(
      new CustomEvent("glb-import-request", {
        detail: file,
      }),
    );
    event.target.value = "";
  };

  const handlePanoramaFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    window.dispatchEvent(
      new CustomEvent("panorama-import-request", {
        detail: file,
      }),
    );
    event.target.value = "";
  };

  const handleInsertObject = (
    detail:
      | { kind: "standin"; variant: "male" | "female" }
      | {
          kind: "crowd";
          variant: "male" | "female";
          rows: number;
          columns: number;
          spacing: number;
        }
      | {
          kind: "primitive";
          variant: "cube" | "sphere" | "cylinder" | "torus" | "cone" | "pyramid";
        },
  ) => {
    setActiveTool("object");
    window.dispatchEvent(
      new CustomEvent("scene-object-create-request", {
        detail,
      }),
    );
    setOpenMenu(undefined);
  };

  const handleSnapshot = () => {
    if (!activeCameraId) {
      return;
    }
    setActiveTool("snapshot");
    window.dispatchEvent(new CustomEvent("snapshot-export-request"));
  };

  const handleCreateCamera = () => {
    setActiveTool("camera");
    setOpenMenu(undefined);
    window.dispatchEvent(new Event("camera-create-from-view-request"));
  };

  const KeyframeWorkbenchIcon = ({ size = 18 }: { size?: number }) => (
    <svg
      aria-hidden="true"
      className="toolbar-keyframe-icon"
      fill="none"
      height={size}
      viewBox="0 0 20 20"
      width={size}
    >
      <path
        d="M10 1.75 18.25 10 10 18.25 1.75 10 10 1.75Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
      <path
        d="M10 6.2v7.6M6.2 10h7.6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.6"
      />
    </svg>
  );

  return (
    <nav
      className={`bottom-toolbar ${lifted ? "is-lifted" : "is-docked"}`}
      aria-label="工作台工具"
      ref={toolbarRef}
      style={lifted ? { bottom: `${Math.max(52, liftedHeight + 12)}px` } : undefined}
    >
      <input
        ref={glbInputRef}
        className="file-input"
        type="file"
        accept=".glb,.obj,.3dgs,.spz,model/gltf-binary,text/plain"
        onChange={handleGlbFileChange}
      />
      <input
        ref={panoramaInputRef}
        className="file-input"
        type="file"
        accept="image/*"
        onChange={handlePanoramaFileChange}
      />

      <div className="toolbar-menu-group">
        <button
          className={`toolbar-pill ${activeTool === "move" ? "is-active" : ""}`}
          type="button"
          onClick={() => {
            setActiveTool("move");
            setOpenMenu(openMenu === "move" ? undefined : "move");
          }}
        >
          <MousePointer2 size={16} />
          <span>{currentMoveLabel.label}</span>
          <ChevronDown size={14} />
        </button>
        {openMenu === "move" ? (
          <div className="toolbar-menu">
            {moveOptions.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  className={`toolbar-menu-item ${transformMode === item.id ? "is-active" : ""}`}
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTransformMode(item.id);
                    setActiveTool("move");
                    setOpenMenu(undefined);
                  }}
                >
                  <span className="toolbar-menu-main">
                    <Icon size={14} />
                    <span>{item.label}</span>
                  </span>
                  <span className="toolbar-shortcut">{item.shortcut}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="toolbar-menu-group">
        <button
          className={`toolbar-pill ${activeTool === "object" ? "is-active" : ""}`}
          type="button"
          onClick={() => {
            setActiveTool("object");
            setOpenMenu(openMenu === "object" ? undefined : "object");
          }}
        >
          <PersonStanding size={16} />
          <span>对象</span>
          <ChevronDown size={14} />
        </button>
        {openMenu === "object" ? (
          <div className="toolbar-menu wide-menu">
            <button className="toolbar-menu-item" type="button" onClick={triggerGlbImport}>
              <span className="toolbar-menu-main">
                <Upload size={14} />
                <span>本地上传</span>
                <span title="支持 GLB / OBJ / 3DGS / SPZ 格式上传">
                  <CircleHelp size={13} />
                </span>
              </span>
            </button>
            <button
              className="toolbar-menu-item"
              type="button"
              onClick={() => handleInsertObject({ kind: "standin", variant: "male" })}
            >
              <span className="toolbar-menu-main">
                <UserRound size={14} />
                <span>男性素体</span>
              </span>
            </button>
            <button
              className="toolbar-menu-item"
              type="button"
              onClick={() => handleInsertObject({ kind: "standin", variant: "female" })}
            >
              <span className="toolbar-menu-main">
                <UserRound size={14} />
                <span>女性素体</span>
              </span>
            </button>
            <div className="toolbar-menu-section">
              <button
                className="toolbar-menu-disclosure"
                type="button"
                onClick={() => setCrowdExpanded((value) => !value)}
              >
                <span className="toolbar-menu-title">
                  <Users size={14} />
                  <span>群众</span>
                </span>
                {crowdExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {crowdExpanded ? (
                <>
                  <div className="toolbar-inline-fields">
                    <label>
                      <span>行数</span>
                      <input
                        className="toolbar-mini-input"
                        max={24}
                        min={1}
                        type="number"
                        value={crowdRows}
                        onChange={(event) =>
                          setCrowdRows(Math.max(1, Number(event.currentTarget.value || 1)))
                        }
                      />
                    </label>
                    <label>
                      <span>列数</span>
                      <input
                        className="toolbar-mini-input"
                        max={24}
                        min={1}
                        type="number"
                        value={crowdColumns}
                        onChange={(event) =>
                          setCrowdColumns(Math.max(1, Number(event.currentTarget.value || 1)))
                        }
                      />
                    </label>
                    <label>
                      <span>间距</span>
                      <input
                        className="toolbar-mini-input"
                        max={20}
                        min={0.5}
                        step={0.1}
                        type="number"
                        value={crowdSpacing}
                        onChange={(event) =>
                          setCrowdSpacing(Math.max(0.5, Number(event.currentTarget.value || 0.5)))
                        }
                      />
                    </label>
                  </div>
                  <button
                    className="toolbar-inline-action"
                    type="button"
                    onClick={() =>
                      handleInsertObject({
                        kind: "crowd",
                        variant: "male",
                        rows: crowdRows,
                        columns: crowdColumns,
                        spacing: crowdSpacing,
                      })
                    }
                  >
                    插入群众
                  </button>
                </>
              ) : null}
            </div>
            <div className="toolbar-menu-section">
              <div className="toolbar-menu-title">
                <Square size={14} />
                <span>几何模型</span>
              </div>
              <div className="toolbar-chip-row">
                <button
                  className="toolbar-chip"
                  type="button"
                  onClick={() => handleInsertObject({ kind: "primitive", variant: "cube" })}
                >
                  立方体
                </button>
                <button
                  className="toolbar-chip"
                  type="button"
                  onClick={() => handleInsertObject({ kind: "primitive", variant: "sphere" })}
                >
                  球体
                </button>
                <button
                  className="toolbar-chip"
                  type="button"
                  onClick={() => handleInsertObject({ kind: "primitive", variant: "cylinder" })}
                >
                  圆柱
                </button>
                <button
                  className="toolbar-chip"
                  type="button"
                  onClick={() => handleInsertObject({ kind: "primitive", variant: "torus" })}
                >
                  环状体
                </button>
                <button
                  className="toolbar-chip"
                  type="button"
                  onClick={() => handleInsertObject({ kind: "primitive", variant: "cone" })}
                >
                  圆锥
                </button>
                <button
                  className="toolbar-chip"
                  type="button"
                  onClick={() => handleInsertObject({ kind: "primitive", variant: "pyramid" })}
                >
                  棱锥
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="toolbar-menu-group">
        <button
          className={`toolbar-pill ${activeTool === "panorama" ? "is-active" : ""}`}
          type="button"
          onClick={() => {
            setActiveTool("panorama");
            const nextMenu = openMenu === "space" ? undefined : "space";
            setOpenMenu(nextMenu);
            if (!nextMenu) {
              setSpaceAssetPicker(undefined);
            }
          }}
        >
          <Box size={16} />
          <span>添加空间资产</span>
          <ChevronDown size={14} />
        </button>
        {openMenu === "space" ? (
          <div className="toolbar-menu wide-menu space-asset-menu">
            <div className="toolbar-menu-label">空间资产</div>
            <button
              className={`toolbar-space-category ${spaceAssetPicker === "scene" ? "is-active" : ""}`}
              type="button"
              onClick={() => setSpaceAssetPicker((value) => value === "scene" ? undefined : "scene")}
            >
              <span className="toolbar-menu-main">
                <Box size={14} />
                <span>3D 世界 / 3D 素材</span>
                <span title="支持 GLB / OBJ / 3DGS / SPZ 格式上传">
                  <CircleHelp size={13} />
                </span>
              </span>
              <ChevronRight size={14} />
            </button>
            <button
              className={`toolbar-space-category ${spaceAssetPicker === "panorama" ? "is-active" : ""}`}
              type="button"
              onClick={() => setSpaceAssetPicker((value) => value === "panorama" ? undefined : "panorama")}
            >
              <span className="toolbar-menu-main"><ImagePlus size={14} /><span>全景图</span></span>
              <ChevronRight size={14} />
            </button>
            {spaceAssetPicker ? (
              <div className="space-import-popover">
                <div className="toolbar-menu-label">
                  {spaceAssetPicker === "scene" ? "3D 世界 / 3D 素材" : "全景图"}
                </div>
                <button
                  className="toolbar-menu-item"
                  type="button"
                  onClick={spaceAssetPicker === "scene" ? triggerGlbImport : triggerPanoramaImport}
                >
                  <span className="toolbar-menu-main"><Upload size={14} /><span>本地上传</span></span>
                </button>
                <button
                  className="toolbar-menu-item"
                  type="button"
                  onClick={() => notifyUnavailableImport("canvas", spaceAssetPicker)}
                >
                  <span className="toolbar-menu-main"><span>从当前画布中导入</span></span>
                </button>
                <button
                  className="toolbar-menu-item"
                  type="button"
                  onClick={() => notifyUnavailableImport("space", spaceAssetPicker)}
                >
                  <span className="toolbar-menu-main"><span>从空间中导入</span></span>
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <button
        className={`toolbar-pill ${activeTool === "camera" ? "is-active" : ""}`}
        type="button"
        onClick={handleCreateCamera}
      >
        <Video size={16} />
        <span>添加机位</span>
      </button>

      <div className="toolbar-menu-group">
        <button
          className={`toolbar-pill ${activeTool === "aspect" ? "is-active" : ""}`}
          type="button"
          onClick={() => {
            setActiveTool("aspect");
            setOpenMenu(openMenu === "aspect" ? undefined : "aspect");
          }}
        >
          <ScanSearch size={16} />
          <span>{outputFrame.label}</span>
          <ChevronDown size={14} />
        </button>
        {openMenu === "aspect" ? (
          <div className="toolbar-menu aspect-menu-grid">
            {OUTPUT_FRAME_PRESETS.map((item) => (
              <button
                className={`toolbar-menu-item ${
                  outputFrame.presetId === item.presetId ? "is-active" : ""
                }`}
                key={item.presetId}
                type="button"
                onClick={() => {
                  setOutputFrame(item);
                  setOpenMenu(undefined);
                }}
              >
                <span className="aspect-tile">
                  <Camera size={14} />
                  <span>{item.label}</span>
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <button
        className={`toolbar-pill ${activeTool === "snapshot" ? "is-active" : ""}`}
        disabled={!activeCameraId}
        title={activeCameraId ? "拍摄快照" : "请先创建机位"}
        type="button"
        onClick={handleSnapshot}
      >
        <Camera size={16} />
        <span>截图</span>
      </button>

      <div className="toolbar-animation-control">
        <button
          className={`toolbar-mode-button ${!timelineExpanded ? "is-active" : ""}`}
          title="设计模式"
          type="button"
          onClick={() => {
            if (timelineExpanded) {
              onTimelineToggle();
            }
          }}
        >
          <span>设计</span>
        </button>
        <button
          className={`toolbar-mode-button ${timelineExpanded ? "is-active" : ""}`}
          title="动画模式"
          type="button"
          onClick={() => {
            if (!timelineExpanded) {
              onTimelineToggle();
            }
          }}
        >
          <KeyframeWorkbenchIcon size={15} />
          <span>动画</span>
        </button>
      </div>
    </nav>
  );
}
