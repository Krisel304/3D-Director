import { CameraInspector } from "../panels/CameraInspector";
import { ObjectInspector } from "../panels/ObjectInspector";
import { SnapshotPanel } from "../panels/SnapshotPanel";
import { WorldInspector } from "../panels/WorldInspector";
import { useProjectStore } from "../../store/projectStore";
import type { TimelineKeyframeSelection } from "../../domain/projectTypes";
import { useEffect, useState } from "react";
import {
  AlignCenterHorizontal,
  ArrowDownToLine,
  ArrowUpToLine,
  Eye,
  EyeOff,
  FolderX,
  Lock,
  Trash2,
  Unlock,
} from "lucide-react";

function formatSeconds(value: number) {
  return `${Number(value.toFixed(2))}s`;
}

function TimelineKeyframeInspector({
  selection,
}: {
  selection: TimelineKeyframeSelection;
}) {
  const animation = useProjectStore((state) => state.animation);
  const targetRows = selection.refs
    .filter((ref) => ref.kind === "channel")
    .map((ref) => {
      const binding = animation.bindings.find((item) => item.id === ref.bindingId);
      const channel = binding?.channels.find((item) => item.id === ref.channelId);
      return {
        key: `${ref.bindingId}:${ref.channelId}:${ref.keyframeId}`,
        target: binding?.label ?? "未知资产",
        channel: channel?.label ?? "未知通道",
      };
    });

  return (
    <section className="panel-block timeline-keyframe-panel">
      <div className="panel-heading">
        <div>
          <h2>关键帧参数</h2>
          <p>当前时间轴关键帧</p>
        </div>
      </div>
      <div className="field-group">
        <label>时间</label>
        <div className="timeline-keyframe-readout">{formatSeconds(selection.time)}</div>
      </div>
      <div className="field-group">
        <label>记录通道</label>
        <div className="timeline-keyframe-channel-list">
          {targetRows.length ? (
            targetRows.map((row) => (
              <div key={row.key}>
                <strong>{row.target}</strong>
                <span>{row.channel}</span>
              </div>
            ))
          ) : (
            <div>
              <strong>机位片段</strong>
              <span>时间范围</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function GroupInspector({ groupId }: { groupId: string }) {
  const group = useProjectStore((state) => state.groups.find((item) => item.id === groupId));
  const objects = useProjectStore((state) => state.objects);
  const cameras = useProjectStore((state) => state.cameras);
  const members = [
    ...objects.filter((item) => item.groupId === groupId),
    ...cameras.filter((item) => item.groupId === groupId),
  ];
  const allHidden = members.length > 0 && members.every((item) => !item.visible);
  const allLocked = members.length > 0 && members.every((item) => item.locked);
  const renameGroup = useProjectStore((state) => state.renameGroup);
  const ungroup = useProjectStore((state) => state.ungroup);
  const removeGroup = useProjectStore((state) => state.removeGroup);
  const alignGroup = useProjectStore((state) => state.alignGroup);
  const toggleGroupVisible = useProjectStore((state) => state.toggleGroupVisible);
  const toggleGroupLocked = useProjectStore((state) => state.toggleGroupLocked);
  const [draft, setDraft] = useState(group?.name ?? "");
  useEffect(() => {
    setDraft(group?.name ?? "");
  }, [group?.name, groupId]);
  if (!group) return null;
  return (
    <section className="panel-block group-inspector">
      <div className="panel-heading"><div><h2>组合属性</h2></div></div>
      <h3 className="group-inspector-title">组合名称</h3>
      <div className="field-group">
        <input className="text-field" value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={() => renameGroup(group.id, draft)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} />
      </div>
      <h3 className="group-inspector-title">组合操作</h3>
      <div className="group-inspector-actions">
        <button type="button" onClick={() => toggleGroupVisible(group.id)}>
          {allHidden ? <Eye size={18} /> : <EyeOff size={18} />}
          {allHidden ? "解除隐藏" : "全部隐藏"}
        </button>
        <button type="button" onClick={() => toggleGroupLocked(group.id)}>
          {allLocked ? <Unlock size={18} /> : <Lock size={18} />}
          {allLocked ? "解除锁定" : "全部锁定"}
        </button>
      </div>
      <h3 className="group-inspector-title">组合对齐</h3>
      <div className="group-inspector-actions">
        <button type="button" onClick={() => alignGroup(group.id, "center")}><AlignCenterHorizontal size={18} />中心点</button>
        <button type="button" onClick={() => alignGroup(group.id, "top")}><ArrowUpToLine size={18} />顶对齐</button>
        <button type="button" onClick={() => alignGroup(group.id, "bottom")}><ArrowDownToLine size={18} />底对齐</button>
        <button type="button" onClick={() => alignGroup(group.id, "ground")}><ArrowDownToLine size={18} />吸附到地面</button>
      </div>
      <div className="group-inspector-actions group-inspector-danger-actions">
        <button type="button" onClick={() => ungroup(group.id)}><FolderX size={18} />解组</button>
        <button type="button" onClick={() => removeGroup(group.id)}><Trash2 size={18} />删除整组</button>
      </div>
    </section>
  );
}

export function RightPanel({ animationMode = false }: { animationMode?: boolean }) {
  const activeObjectId = useProjectStore((state) => state.activeObjectId);
  const selectedCameraId = useProjectStore((state) => state.selectedCameraId);
  const selectedTimelineKeyframe = useProjectStore(
    (state) => state.selectedTimelineKeyframe,
  );
  const activeGroupId = useProjectStore((state) => state.activeGroupId);
  const objects = useProjectStore((state) => state.objects);
  const cameras = useProjectStore((state) => state.cameras);
  const activeObject = activeObjectId
    ? objects.find((object) => object.id === activeObjectId)
    : undefined;
  const activeCamera = selectedCameraId
    ? cameras.find((camera) => camera.id === selectedCameraId)
    : undefined;

  return (
    <aside className="right-panel">
      <SnapshotPanel />
      <div className="right-panel-content">
        {selectedTimelineKeyframe ? (
          <TimelineKeyframeInspector selection={selectedTimelineKeyframe} />
        ) : activeGroupId ? (
          <GroupInspector groupId={activeGroupId} />
        ) : activeObject ? (
          <ObjectInspector object={activeObject} />
        ) : activeCamera ? (
          <CameraInspector animationMode={animationMode} />
        ) : (
          <WorldInspector />
        )}
      </div>
    </aside>
  );
}
