import {
  ChevronDown,
  ChevronRight,
  Box,
  Eye,
  EyeOff,
  Lock,
  RotateCcw,
  Trash2,
  Unlock,
} from "lucide-react";
import { useState } from "react";
import type { SceneObject, Vec3 } from "../../domain/projectTypes";
import { formatBoneDisplayName } from "../../domain/rigUtils";
import { useProjectStore } from "../../store/projectStore";
import { MaterialInspector } from "./MaterialInspector";
import { RigInspector } from "./RigInspector";
import { TransformFields } from "./TransformFields";

function toDegreesVector(value: Vec3): Vec3 {
  return value.map((item) => (item * 180) / Math.PI) as Vec3;
}

function toRadiansVector(value: Vec3): Vec3 {
  return value.map((item) => (item * Math.PI) / 180) as Vec3;
}

const posePresets = [
  "站立",
  "躺下",
  "跑",
  "走",
  "蹲下",
  "坐下",
  "格斗",
  "挥手",
  "T型",
  "跳跃",
  "单膝跪",
  "双膝跪",
  "叉腰",
  "抱臂",
  "思考",
  "倚靠",
  "指向",
  "举手",
  "伸手",
  "鞠躬",
  "投掷",
  "踢腿",
  "打电话",
  "看手机",
];

const poseAdjustGroups = ["身体", "手臂", "腿部", "头部"];

const poseBoneNames = [
  "hips",
  "spine",
  "chest",
  "neck",
  "head",
  "upperarm_l",
  "forearm_l",
  "hand_l",
  "upperarm_r",
  "forearm_r",
  "hand_r",
  "thigh_l",
  "calf_l",
  "foot_l",
  "thigh_r",
  "calf_r",
  "foot_r",
] as const;

const poseAdjustBoneGroups: Record<string, string[]> = {
  身体: ["hips", "spine", "chest", "neck"],
  手臂: ["upperarm_l", "forearm_l", "hand_l", "upperarm_r", "forearm_r", "hand_r"],
  腿部: ["thigh_l", "calf_l", "foot_l", "thigh_r", "calf_r", "foot_r"],
  头部: ["neck", "head"],
};

const posePresetRotations: Record<string, Partial<Record<string, Vec3>>> = {
  站立: {},
  躺下: {
    hips: [-Math.PI / 2, 0, 0],
    neck: [0.18, 0, 0],
    upperarm_l: [0.2, 0, -0.35],
    upperarm_r: [0.2, 0, 0.35],
  },
  跑: {
    chest: [0.18, 0, 0],
    upperarm_l: [-0.85, 0, -0.32],
    forearm_l: [-0.62, 0, 0],
    upperarm_r: [0.75, 0, 0.32],
    forearm_r: [-0.62, 0, 0],
    thigh_l: [0.92, 0, 0],
    calf_l: [-0.9, 0, 0],
    thigh_r: [-0.62, 0, 0],
    calf_r: [0.65, 0, 0],
  },
  走: {
    upperarm_l: [-0.42, 0, -0.24],
    upperarm_r: [0.38, 0, 0.24],
    thigh_l: [0.45, 0, 0],
    thigh_r: [-0.32, 0, 0],
    calf_r: [0.32, 0, 0],
  },
  蹲下: {
    hips: [0.18, 0, 0],
    chest: [0.28, 0, 0],
    thigh_l: [1.05, 0, 0.18],
    thigh_r: [1.05, 0, -0.18],
    calf_l: [-1.35, 0, 0],
    calf_r: [-1.35, 0, 0],
    upperarm_l: [0.38, 0, -0.22],
    upperarm_r: [0.38, 0, 0.22],
  },
  坐下: {
    hips: [0.08, 0, 0],
    thigh_l: [1.42, 0, 0.05],
    thigh_r: [1.42, 0, -0.05],
    calf_l: [-1.42, 0, 0],
    calf_r: [-1.42, 0, 0],
    chest: [0.08, 0, 0],
  },
  格斗: {
    chest: [0.08, -0.18, 0],
    upperarm_l: [-0.65, 0.35, -0.65],
    forearm_l: [-1.05, 0, 0],
    upperarm_r: [-0.55, -0.35, 0.7],
    forearm_r: [-1.1, 0, 0],
    thigh_l: [0.35, 0, 0.15],
    thigh_r: [-0.2, 0, -0.15],
  },
  挥手: {
    upperarm_r: [-1.25, 0.1, 1.05],
    forearm_r: [-0.95, 0, 0.25],
    hand_r: [0, 0, 0.45],
    head: [0, -0.12, 0],
  },
  T型: {
    upperarm_l: [0, 0, -1.55],
    forearm_l: [0, 0, 0],
    upperarm_r: [0, 0, 1.55],
    forearm_r: [0, 0, 0],
  },
  跳跃: {
    chest: [-0.18, 0, 0],
    upperarm_l: [-1.25, 0, -0.8],
    upperarm_r: [-1.25, 0, 0.8],
    thigh_l: [0.42, 0, 0.25],
    thigh_r: [0.42, 0, -0.25],
    calf_l: [-0.58, 0, 0],
    calf_r: [-0.58, 0, 0],
  },
  单膝跪: {
    thigh_l: [1.28, 0, 0.12],
    calf_l: [-1.46, 0, 0],
    thigh_r: [0.05, 0, -0.12],
    calf_r: [-1.18, 0, 0],
    chest: [0.16, 0, 0],
  },
  双膝跪: {
    thigh_l: [0.52, 0, 0.12],
    thigh_r: [0.52, 0, -0.12],
    calf_l: [-1.55, 0, 0],
    calf_r: [-1.55, 0, 0],
    chest: [0.1, 0, 0],
  },
  叉腰: {
    upperarm_l: [0.15, 0, -0.72],
    forearm_l: [-1.15, 0, -0.2],
    upperarm_r: [0.15, 0, 0.72],
    forearm_r: [-1.15, 0, 0.2],
  },
  抱臂: {
    upperarm_l: [-0.18, 0.35, -0.8],
    forearm_l: [-1.2, 0, 0.75],
    upperarm_r: [-0.18, -0.35, 0.8],
    forearm_r: [-1.2, 0, -0.75],
  },
  思考: {
    head: [0.18, 0.16, 0],
    upperarm_r: [-0.55, 0.15, 0.65],
    forearm_r: [-1.18, 0, -0.22],
  },
  倚靠: {
    hips: [0, 0, -0.18],
    chest: [0, 0, 0.22],
    upperarm_l: [0.2, 0, -0.9],
    thigh_l: [0.1, 0, 0.18],
  },
  指向: {
    chest: [0, -0.12, 0],
    upperarm_r: [-0.45, -0.18, 1.05],
    forearm_r: [-0.1, 0, 0.08],
    head: [0, -0.18, 0],
  },
  举手: {
    upperarm_l: [-1.55, 0, -0.32],
    forearm_l: [-0.1, 0, 0],
    upperarm_r: [-1.55, 0, 0.32],
    forearm_r: [-0.1, 0, 0],
  },
  伸手: {
    upperarm_r: [-0.72, -0.18, 0.82],
    forearm_r: [-0.12, 0, 0],
    hand_r: [0.08, 0, 0],
  },
  鞠躬: {
    hips: [0.35, 0, 0],
    spine: [0.35, 0, 0],
    chest: [0.32, 0, 0],
    head: [0.16, 0, 0],
    upperarm_l: [0.4, 0, -0.16],
    upperarm_r: [0.4, 0, 0.16],
  },
  投掷: {
    chest: [-0.12, -0.42, 0],
    upperarm_r: [-1.25, -0.1, 0.78],
    forearm_r: [-0.8, 0, 0.15],
    upperarm_l: [0.18, 0, -0.4],
    thigh_l: [0.42, 0, 0],
  },
  踢腿: {
    thigh_r: [1.25, 0, -0.08],
    calf_r: [-0.25, 0, 0],
    thigh_l: [-0.22, 0, 0.12],
    upperarm_l: [-0.35, 0, -0.35],
    upperarm_r: [0.25, 0, 0.35],
  },
  打电话: {
    head: [0.08, 0.12, 0],
    upperarm_r: [-0.42, 0.12, 0.74],
    forearm_r: [-1.25, 0, -0.26],
    hand_r: [0, 0.25, 0],
  },
  看手机: {
    head: [0.45, 0, 0],
    chest: [0.12, 0, 0],
    upperarm_l: [0.22, 0.2, -0.55],
    forearm_l: [-1.0, 0, 0.32],
    upperarm_r: [0.22, -0.2, 0.55],
    forearm_r: [-1.0, 0, -0.32],
  },
};

export function ObjectInspector({ object }: { object: SceneObject }) {
  const [dataTab, setDataTab] = useState<"properties" | "pose">("properties");
  const [activePose, setActivePose] = useState("站立");
  const [activeAdjustGroup, setActiveAdjustGroup] = useState("身体");
  const [transformExpanded, setTransformExpanded] = useState(true);
  const [dimensionsExpanded, setDimensionsExpanded] = useState(true);
  const [rigExpanded, setRigExpanded] = useState(true);
  const [materialExpanded, setMaterialExpanded] = useState(true);
  const setObjectRigMode = useProjectStore((state) => state.setObjectRigMode);
  const updateObject = useProjectStore((state) => state.updateObject);
  const updateObjectTransform = useProjectStore(
    (state) => state.updateObjectTransform,
  );
  const updateBoneRotation = useProjectStore((state) => state.updateBoneRotation);
  const toggleObjectVisible = useProjectStore((state) => state.toggleObjectVisible);
  const toggleObjectLocked = useProjectStore((state) => state.toggleObjectLocked);
  const toggleObjectBoundsVisible = useProjectStore(
    (state) => state.toggleObjectBoundsVisible,
  );
  const removeObject = useProjectStore((state) => state.removeObject);

  const disabled = object.locked;
  const actualDimensions = object.actualDimensions ?? [0, 0, 0];

  const formatDimension = (value: number) => `${value.toFixed(3)} m`;
  const transformSummary = `${object.position
    .map((value) => value.toFixed(2))
    .join(" / ")}`;
  const dimensionSummary = `X ${actualDimensions[0].toFixed(3)}  Y ${actualDimensions[1].toFixed(
    3,
  )}  Z ${actualDimensions[2].toFixed(3)}`;
  const rigSummary = object.rig?.hasSkeleton
    ? object.rig.mode === "fk"
      ? "FK 关节旋转"
      : "IK 骨链控制"
    : "当前对象没有骨架";
  const materialSummary = object.materialOverrides?.length
    ? `已覆盖 ${object.materialOverrides.length} 个材质`
    : "展开查看材质参数";
  const groupedPoseBones =
    object.rig?.bones.filter((bone) =>
      (poseAdjustBoneGroups[activeAdjustGroup] ?? []).includes(bone.name),
    ) ?? [];

  const applyPosePreset = (pose: string) => {
    if (!object.rig?.hasSkeleton || object.locked) {
      return;
    }
    setObjectRigMode(object.id, "fk");
    const rotations = posePresetRotations[pose] ?? {};
    poseBoneNames.forEach((boneName) => {
      const bone = object.rig?.bones.find((item) => item.name === boneName);
      if (!bone) {
        return;
      }
      updateBoneRotation(object.id, bone.id, rotations[boneName] ?? [0, 0, 0]);
    });
    setActivePose(pose);
  };

  return (
    <section className="panel-block object-panel">
      <div className="panel-heading object-heading">
        <div>
          <h2>{object.type === "character" ? "角色属性" : "模型数据"}</h2>
          <p>{object.type === "character" ? "占位角色" : "导入模型"}</p>
        </div>
        <div className="object-actions">
          <button
            title={object.visible ? "隐藏" : "显示"}
            type="button"
            onClick={() => toggleObjectVisible(object.id)}
          >
            {object.visible ? <Eye size={15} /> : <EyeOff size={15} />}
          </button>
          <button
            title={object.locked ? "解锁" : "锁定"}
            type="button"
            onClick={() => toggleObjectLocked(object.id)}
          >
            {object.locked ? <Lock size={15} /> : <Unlock size={15} />}
          </button>
          <button
            title="删除"
            type="button"
            onClick={() => removeObject(object.id)}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="model-data-tabs">
        <button
          className={dataTab === "properties" ? "is-active" : ""}
          type="button"
          onClick={() => setDataTab("properties")}
        >
          属性
        </button>
        <button
          className={dataTab === "pose" ? "is-active" : ""}
          type="button"
          onClick={() => setDataTab("pose")}
        >
          姿势
        </button>
      </div>

      {dataTab === "pose" ? (
        <div className="pose-panel">
          <div className="pose-header-row">
            <h3>姿势预设</h3>
            <button
              className="pose-reset-button"
              type="button"
              disabled={disabled || !object.rig?.hasSkeleton}
              onClick={() => applyPosePreset("站立")}
            >
              <RotateCcw size={15} />
              <span>重置</span>
            </button>
          </div>
          <div className="pose-preset-grid">
            {posePresets.map((pose) => (
              <button
                className={activePose === pose ? "is-active" : ""}
                disabled={disabled || !object.rig?.hasSkeleton}
                key={pose}
                type="button"
                onClick={() => applyPosePreset(pose)}
              >
                {pose}
              </button>
            ))}
          </div>
          <h3 className="pose-adjust-title">姿势调节</h3>
          <div className="pose-adjust-list">
            {poseAdjustGroups.map((group) => (
              <button
                className={activeAdjustGroup === group ? "is-active" : ""}
                disabled={disabled || !object.rig?.hasSkeleton}
                key={group}
                type="button"
                onClick={() => setActiveAdjustGroup(group)}
              >
                <span>{group}</span>
                <ChevronRight
                  className={activeAdjustGroup === group ? "is-expanded" : ""}
                  size={18}
                />
              </button>
            ))}
          </div>
          {object.rig?.hasSkeleton ? (
            <div className="pose-adjust-control-list">
              {groupedPoseBones.map((bone) => (
                <div className="rig-panel-card pose-bone-card" key={bone.id}>
                  <div className="rig-panel-title">{formatBoneDisplayName(bone.name)}</div>
                  <TransformFields
                    disabled={disabled}
                    label="旋转"
                    max={180}
                    min={-180}
                    step={1}
                    value={toDegreesVector(bone.rotation)}
                    onChange={(rotation) =>
                      updateBoneRotation(object.id, bone.id, toRadiansVector(rotation))
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="material-empty">当前角色没有可编辑骨架</div>
          )}
        </div>
      ) : (
        <>
      <div className="field-group">
        <label>名称</label>
        <input
          className="text-field"
          disabled={disabled}
          value={object.name}
          onChange={(event) => updateObject(object.id, { name: event.target.value })}
        />
      </div>

      <div className={`panel-subsection ${transformExpanded ? "is-open" : ""}`}>
        <button
          className={`panel-subsection-trigger ${transformExpanded ? "is-open" : ""}`}
          type="button"
          onClick={() => setTransformExpanded((current) => !current)}
        >
          <span>参数调节</span>
          <ChevronDown size={16} />
        </button>
        {!transformExpanded ? (
          <div className="panel-subsection-summary">当前位置：{transformSummary}</div>
        ) : null}

        {transformExpanded ? (
          <div className="panel-subsection-body">
            <TransformFields
              disabled={disabled}
              label="位置"
              value={object.position}
              onChange={(position) => updateObjectTransform(object.id, { position })}
            />
            <TransformFields
              disabled={disabled}
              label="旋转"
              step={1}
              value={toDegreesVector(object.rotation)}
              onChange={(rotation) =>
                updateObjectTransform(object.id, { rotation: toRadiansVector(rotation) })
              }
            />
            <TransformFields
              disabled={disabled}
              label="缩放"
              step={0.05}
              value={object.scale}
              onChange={(scale) =>
                updateObjectTransform(object.id, {
                  scale: scale.map((item) => Math.max(0.01, item)) as Vec3,
                })
              }
            />
          </div>
        ) : null}
      </div>

      <div className={`panel-subsection ${dimensionsExpanded ? "is-open" : ""}`}>
        <button
          className={`panel-subsection-trigger ${dimensionsExpanded ? "is-open" : ""}`}
          type="button"
          onClick={() => setDimensionsExpanded((current) => !current)}
        >
          <span>尺寸与显示</span>
          <ChevronDown size={16} />
        </button>
        {!dimensionsExpanded ? (
          <div className="panel-subsection-summary">{dimensionSummary}</div>
        ) : null}

        {dimensionsExpanded ? (
          <div className="panel-subsection-body">
            <div className="field-group">
              <label>实际尺寸</label>
              <div className="axis-fields dimension-fields">
                <div className="axis-field dimension-field">
                  <span>X</span>
                  <strong className="dimension-value">
                    {formatDimension(actualDimensions[0])}
                  </strong>
                </div>
                <div className="axis-field dimension-field">
                  <span>Y</span>
                  <strong className="dimension-value">
                    {formatDimension(actualDimensions[1])}
                  </strong>
                </div>
                <div className="axis-field dimension-field">
                  <span>Z</span>
                  <strong className="dimension-value">
                    {formatDimension(actualDimensions[2])}
                  </strong>
                </div>
              </div>
              <div className="small-meta">按包围盒计算，精度到毫米级</div>
            </div>

            <div className="field-group">
              <label>包围盒</label>
              <button
                className={`switch-row ${object.boundsVisible ? "is-active" : ""}`}
                disabled={!object.visible}
                type="button"
                onClick={() => toggleObjectBoundsVisible(object.id)}
              >
                <span className="switch-row-label">
                  <Box size={15} />
                  <span>显示包围盒</span>
                </span>
                <span className="switch-track">
                  <span className="switch-thumb" />
                </span>
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {object.rig?.hasSkeleton ? (
        <div className={`panel-subsection ${rigExpanded ? "is-open" : ""}`}>
          <button
            className={`panel-subsection-trigger ${rigExpanded ? "is-open" : ""}`}
            type="button"
            onClick={() => setRigExpanded((current) => !current)}
          >
            <span>骨骼控制</span>
            <ChevronDown size={16} />
          </button>
          {!rigExpanded ? (
            <div className="panel-subsection-summary">{rigSummary}</div>
          ) : null}
          {rigExpanded ? (
            <div className="panel-subsection-body">
              <RigInspector embedded object={object} />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={`panel-subsection ${materialExpanded ? "is-open" : ""}`}>
        <button
          className={`panel-subsection-trigger ${materialExpanded ? "is-open" : ""}`}
          type="button"
          onClick={() => setMaterialExpanded((current) => !current)}
        >
          <span>材质调节</span>
          <ChevronDown size={16} />
        </button>
        {!materialExpanded ? (
          <div className="panel-subsection-summary">{materialSummary}</div>
        ) : null}

        {materialExpanded ? (
          <div className="panel-subsection-body">
            <MaterialInspector object={object} />
          </div>
        ) : null}
      </div>
        </>
      )}
    </section>
  );
}
