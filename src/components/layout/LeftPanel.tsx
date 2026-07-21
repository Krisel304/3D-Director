import {
  Box,
  Camera,
  CircleHelp,
  ClipboardPaste,
  Copy,
  FolderPlus,
  Folder,
  FolderMinus,
  FolderX,
  Plus,
  Eye,
  EyeOff,
  Focus,
  Lock,
  Search,
  Trash2,
  Unlock,
  UserRound,
} from "lucide-react";
import type { ChangeEvent, DragEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useProjectStore } from "../../store/projectStore";

export function LeftPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objects = useProjectStore((state) => state.objects);
  const cameras = useProjectStore((state) => state.cameras);
  const groups = useProjectStore((state) => state.groups);
  const activeGroupId = useProjectStore((state) => state.activeGroupId);
  const selectedAssetIds = useProjectStore((state) => state.selectedAssetIds);
  const activeObjectId = useProjectStore((state) => state.activeObjectId);
  const selectedCameraId = useProjectStore((state) => state.selectedCameraId);
  const cameraPreviewActive = useProjectStore((state) => state.cameraPreviewActive);
  const setActiveObject = useProjectStore((state) => state.setActiveObject);
  const setActiveCamera = useProjectStore((state) => state.setActiveCamera);
  const setCameraPreviewActive = useProjectStore(
    (state) => state.setCameraPreviewActive,
  );
  const toggleObjectVisible = useProjectStore((state) => state.toggleObjectVisible);
  const toggleObjectLocked = useProjectStore((state) => state.toggleObjectLocked);
  const removeObject = useProjectStore((state) => state.removeObject);
  const toggleCameraVisible = useProjectStore((state) => state.toggleCameraVisible);
  const toggleCameraLocked = useProjectStore((state) => state.toggleCameraLocked);
  const removeCamera = useProjectStore((state) => state.removeCamera);
  const toggleAssetSelection = useProjectStore((state) => state.toggleAssetSelection);
  const selectGroup = useProjectStore((state) => state.selectGroup);
  const createGroup = useProjectStore((state) => state.createGroup);
  const addAssetsToGroup = useProjectStore((state) => state.addAssetsToGroup);
  const removeAssetsFromGroup = useProjectStore((state) => state.removeAssetsFromGroup);
  const ungroup = useProjectStore((state) => state.ungroup);
  const removeGroup = useProjectStore((state) => state.removeGroup);
  const toggleGroupVisible = useProjectStore((state) => state.toggleGroupVisible);
  const toggleGroupLocked = useProjectStore((state) => state.toggleGroupLocked);
  const duplicateObject = useProjectStore((state) => state.duplicateObject);
  const duplicateCamera = useProjectStore((state) => state.duplicateCamera);
  const duplicateGroup = useProjectStore((state) => state.duplicateGroup);
  const importError = useProjectStore((state) => state.importError);
  const [groupMenuFor, setGroupMenuFor] = useState<string>();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: "group" | "object" | "camera"; id: string }>();
  const [clipboard, setClipboard] = useState<{ type: "group" | "object" | "camera"; id: string }>();
  const [contextGroupSubmenuOpen, setContextGroupSubmenuOpen] = useState(false);

  useEffect(() => {
    const closeMenus = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest(".asset-group-menu, [data-group-menu-trigger], .asset-context-menu")) {
        setGroupMenuFor(undefined);
        setContextMenu(undefined);
        setContextGroupSubmenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeMenus);
    return () => document.removeEventListener("pointerdown", closeMenus);
  }, []);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
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

  const handleCameraPreview = (cameraId: string) => {
    window.dispatchEvent(new CustomEvent("asset-library-selection-change"));
    setActiveCamera(cameraId);
    setCameraPreviewActive(true);
  };

  const handleSelectCamera = (cameraId: string, additive = false) => {
    window.dispatchEvent(new CustomEvent("asset-library-selection-change"));
    if (additive) {
      toggleAssetSelection(cameraId, "camera", true);
    } else {
      setActiveCamera(cameraId);
    }
  };

  const handleSelectObject = (objectId: string, additive = false) => {
    window.dispatchEvent(new CustomEvent("asset-library-selection-change"));
    if (additive) {
      toggleAssetSelection(objectId, "object", true);
    } else {
      setActiveObject(objectId);
    }
  };

  const moveSelectionToGroup = (groupId: string) => {
    const objectIds = selectedAssetIds.filter((item) => item.startsWith("object:")).map((item) => item.slice(7));
    const cameraIds = selectedAssetIds.filter((item) => item.startsWith("camera:")).map((item) => item.slice(7));
    if (!objectIds.length && !cameraIds.length && groupMenuFor) {
      if (groupMenuFor.startsWith("object:")) objectIds.push(groupMenuFor.slice(7));
      if (groupMenuFor.startsWith("camera:")) cameraIds.push(groupMenuFor.slice(7));
    }
    addAssetsToGroup(groupId, objectIds, cameraIds);
    setGroupMenuFor(undefined);
  };

  const moveContextAssetToGroup = (groupId: string) => {
    if (!contextMenu || contextMenu.type === "group") return;
    addAssetsToGroup(
      groupId,
      contextMenu.type === "object" ? [contextMenu.id] : [],
      contextMenu.type === "camera" ? [contextMenu.id] : [],
    );
    setContextMenu(undefined);
    setContextGroupSubmenuOpen(false);
  };

  const removeContextAssetFromGroup = (groupId: string) => {
    if (!contextMenu || contextMenu.type === "group") return;
    removeAssetsFromGroup(
      groupId,
      contextMenu.type === "object" ? [contextMenu.id] : [],
      contextMenu.type === "camera" ? [contextMenu.id] : [],
    );
    setContextMenu(undefined);
  };

  const copyContextTarget = () => {
    if (!contextMenu) return;
    setClipboard({ type: contextMenu.type, id: contextMenu.id });
    setContextMenu(undefined);
  };

  const pasteClipboardTarget = () => {
    if (!clipboard) return;
    if (clipboard.type === "object") duplicateObject(clipboard.id);
    if (clipboard.type === "camera") duplicateCamera(clipboard.id);
    if (clipboard.type === "group") duplicateGroup(clipboard.id);
    setContextMenu(undefined);
  };

  const contextAsset = contextMenu && contextMenu.type !== "group"
    ? contextMenu.type === "object"
      ? objects.find((item) => item.id === contextMenu.id)
      : cameras.find((item) => item.id === contextMenu.id)
    : undefined;
  const contextAssetGroupId = contextAsset?.groupId;
  const contextGroupMembers = contextMenu?.type === "group"
    ? [...objects.filter((item) => item.groupId === contextMenu.id), ...cameras.filter((item) => item.groupId === contextMenu.id)]
    : [];
  const contextGroupAllHidden = contextGroupMembers.length > 0 && contextGroupMembers.every((item) => !item.visible);
  const contextGroupAllLocked = contextGroupMembers.length > 0 && contextGroupMembers.every((item) => item.locked);

  const handleAssetDragStart = (event: DragEvent, assetType: "object" | "camera", id: string) => {
    event.dataTransfer.setData("application/x-director-asset", `${assetType}:${id}`);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="left-panel">
      <div className="panel-title-row">
        <h2>资产列表</h2>
      </div>
      <button
        className="import-button"
        type="button"
        onClick={() => fileInputRef.current?.click()}
      >
        导入模型
        <span className="import-help" title="支持 GLB、OBJ；3DGS 请先转换为 GLB"><CircleHelp size={13} /></span>
      </button>
      <input
        ref={fileInputRef}
        className="file-input"
        type="file"
        accept=".glb,.obj,.3dgs,model/gltf-binary,text/plain"
        data-glb-input
        onChange={handleFileChange}
      />
      {importError ? <div className="inline-error">{importError}</div> : null}
      <label className="search-box">
        <Search size={16} />
        <input placeholder="搜索" />
      </label>

      <div className="asset-section asset-group-section">
        <div className="section-label asset-section-heading">
          <span>组合</span>
          <button type="button" title="新建组合" onClick={createGroup}><Plus size={14} /></button>
        </div>
        {groups.length === 0 ? <div className="asset-empty">暂无组合</div> : null}
        <div className="asset-list">
          {groups.map((group) => (
            <div className={`asset-group ${activeGroupId === group.id ? "is-active" : ""}`} key={group.id}>
              <div className="asset-group-row" onContextMenu={(event) => { event.preventDefault(); setContextGroupSubmenuOpen(false); setContextMenu({ x: event.clientX, y: event.clientY, type: "group", id: group.id }); }} onClick={() => selectGroup(group.id)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
                event.preventDefault();
                const value = event.dataTransfer.getData("application/x-director-asset");
                if (value.startsWith("object:")) addAssetsToGroup(group.id, [value.slice(7)], []);
                if (value.startsWith("camera:")) addAssetsToGroup(group.id, [], [value.slice(7)]);
              }}>
                <Folder size={16} />
                <span className="asset-item-label">{group.name}</span>
                <div className="row-actions">
                  <button type="button" title="解组" onClick={(event) => { event.stopPropagation(); ungroup(group.id); }}><FolderX size={13} /></button>
                </div>
              </div>
              {[...cameras.filter((item) => item.groupId === group.id), ...objects.filter((item) => item.groupId === group.id)].map((item) => (
                <div className="asset-group-child" key={item.id} onContextMenu={(event) => { event.preventDefault(); setContextGroupSubmenuOpen(false); setContextMenu({ x: event.clientX, y: event.clientY, type: "fov" in item ? "camera" : "object", id: item.id }); }} onClick={(event) => { event.stopPropagation(); selectGroup(group.id); }} onDoubleClick={(event) => { event.stopPropagation(); if ("fov" in item) handleSelectCamera(item.id); else handleSelectObject(item.id); }}>
                  {"fov" in item ? <Camera size={14} /> : <UserRound size={14} />}
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="asset-section">
        <div className="section-label">机位</div>
        <div className="asset-list">
          {cameras.length === 0 ? (
            <div className="asset-empty">当前暂无机位</div>
          ) : null}
          {cameras.filter((camera) => !camera.groupId).map((camera) => (
            <div
              className={`asset-item asset-item-camera ${
                selectedCameraId === camera.id && !activeObjectId
                  ? "is-active"
                  : ""
              } ${camera.visible ? "" : "is-muted"}`}
              key={camera.id}
              draggable
              onDragStart={(event) => handleAssetDragStart(event, "camera", camera.id)}
              onContextMenu={(event) => { event.preventDefault(); setContextGroupSubmenuOpen(false); setContextMenu({ x: event.clientX, y: event.clientY, type: "camera", id: camera.id }); }}
              onClick={(event) => handleSelectCamera(camera.id, event.metaKey || event.ctrlKey)}
            >
              <Camera size={16} />
              <span className="asset-item-label">{camera.name}</span>
              <div className="row-actions">
                <button data-group-menu-trigger title="移至组合" type="button" onClick={(event) => { event.stopPropagation(); setGroupMenuFor(`camera:${camera.id}`); }}><FolderPlus size={13} /></button>
                <button
                  className={
                    cameraPreviewActive && selectedCameraId === camera.id
                      ? "is-active"
                      : ""
                  }
                  title="锁定机位视角"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleCameraPreview(camera.id);
                  }}
                >
                  <Focus size={13} />
                </button>
                <button
                  title={camera.visible ? "隐藏" : "显示"}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleCameraVisible(camera.id);
                  }}
                >
                  {camera.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>
                <button
                  title={camera.locked ? "解锁" : "锁定"}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleCameraLocked(camera.id);
                  }}
                >
                  {camera.locked ? <Lock size={13} /> : <Unlock size={13} />}
                </button>
                <button
                  title="删除"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeCamera(camera.id);
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
              {groupMenuFor === `camera:${camera.id}` ? (
                <div className="asset-group-menu" onClick={(event) => event.stopPropagation()}>
                  {groups.length ? groups.map((group) => <button key={group.id} type="button" onClick={() => moveSelectionToGroup(group.id)}>加入{group.name}</button>) : <span>暂无可选组合</span>}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="asset-section">
        <div className="section-label">对象</div>
        <div className="asset-list">
          {objects.length === 0 ? (
            <div className="asset-empty">当前暂无对象</div>
          ) : null}
          {objects.filter((object) => !object.groupId).map((object) => (
            <div
              className={`asset-item asset-item-object ${
                activeObjectId === object.id ? "is-active" : ""
              } ${object.visible ? "" : "is-muted"}`}
              key={object.id}
              draggable
              onDragStart={(event) => handleAssetDragStart(event, "object", object.id)}
              onContextMenu={(event) => { event.preventDefault(); setContextGroupSubmenuOpen(false); setContextMenu({ x: event.clientX, y: event.clientY, type: "object", id: object.id }); }}
              onClick={(event) => handleSelectObject(object.id, event.metaKey || event.ctrlKey)}
            >
              {object.type === "character" ? (
                <UserRound size={16} />
              ) : (
                <Box size={16} />
              )}
              <span className="asset-item-label">{object.name}</span>
              <div className="row-actions">
                <button data-group-menu-trigger title="移至组合" type="button" onClick={(event) => { event.stopPropagation(); setGroupMenuFor(`object:${object.id}`); }}><FolderPlus size={13} /></button>
                <button
                  title={object.visible ? "隐藏" : "显示"}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleObjectVisible(object.id);
                  }}
                >
                  {object.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>
                <button
                  title={object.locked ? "解锁" : "锁定"}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleObjectLocked(object.id);
                  }}
                >
                  {object.locked ? <Lock size={13} /> : <Unlock size={13} />}
                </button>
                <button
                  title="删除"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeObject(object.id);
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
              {groupMenuFor === `object:${object.id}` ? (
                <div className="asset-group-menu" onClick={(event) => event.stopPropagation()}>
                  {groups.length ? groups.map((group) => <button key={group.id} type="button" onClick={() => moveSelectionToGroup(group.id)}>加入{group.name}</button>) : <span>暂无可选组合</span>}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
      {contextMenu ? (
        <div
          className={`asset-context-menu ${contextMenu.x > window.innerWidth - 300 ? "opens-left" : ""}`}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
          onPointerLeave={() => setContextGroupSubmenuOpen(false)}
        >
          {contextMenu.type === "group" ? (
            <>
              <button type="button" onClick={() => { toggleGroupVisible(contextMenu.id); setContextMenu(undefined); }}>
                {contextGroupAllHidden ? <Eye size={15} /> : <EyeOff size={15} />}
                {contextGroupAllHidden ? "解除隐藏" : "全部隐藏"}
              </button>
              <button type="button" onClick={() => { toggleGroupLocked(contextMenu.id); setContextMenu(undefined); }}>
                {contextGroupAllLocked ? <Unlock size={15} /> : <Lock size={15} />}
                {contextGroupAllLocked ? "解除锁定" : "全部锁定"}
              </button>
              <button type="button" onClick={copyContextTarget}><Copy size={15} />复制</button>
              <button type="button" disabled={!clipboard} onClick={pasteClipboardTarget}><ClipboardPaste size={15} />粘贴</button>
              <button type="button" onClick={() => { ungroup(contextMenu.id); setContextMenu(undefined); }}><FolderX size={15} />解组</button>
              <button className="is-danger" type="button" onClick={() => { removeGroup(contextMenu.id); setContextMenu(undefined); }}><Trash2 size={15} />删除整组</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => { contextMenu.type === "object" ? toggleObjectVisible(contextMenu.id) : toggleCameraVisible(contextMenu.id); setContextMenu(undefined); }}>
                {contextAsset?.visible ? <EyeOff size={15} /> : <Eye size={15} />}
                {contextAsset?.visible ? "隐藏" : "显示"}
              </button>
              <button type="button" onClick={() => { contextMenu.type === "object" ? toggleObjectLocked(contextMenu.id) : toggleCameraLocked(contextMenu.id); setContextMenu(undefined); }}>
                {contextAsset?.locked ? <Unlock size={15} /> : <Lock size={15} />}
                {contextAsset?.locked ? "解除锁定" : "锁定"}
              </button>
              <button type="button" onClick={copyContextTarget}><Copy size={15} />复制</button>
              <button type="button" disabled={!clipboard} onClick={pasteClipboardTarget}><ClipboardPaste size={15} />粘贴</button>
              {contextAssetGroupId ? (
                <button type="button" onClick={() => removeContextAssetFromGroup(contextAssetGroupId)}><FolderMinus size={15} />移出当前组合</button>
              ) : (
                <div className="asset-context-submenu-trigger" onPointerEnter={() => groups.length && setContextGroupSubmenuOpen(true)}>
                  <button type="button" disabled={groups.length === 0} onClick={() => groups.length && setContextGroupSubmenuOpen((open) => !open)}><FolderPlus size={15} />移至组合</button>
                  {contextGroupSubmenuOpen ? (
                    <div className="asset-context-submenu">
                      {groups.map((group) => <button type="button" key={group.id} onClick={() => moveContextAssetToGroup(group.id)}>{group.name}</button>)}
                    </div>
                  ) : null}
                </div>
              )}
              <button className="is-danger" type="button" onClick={() => { contextMenu.type === "object" ? removeObject(contextMenu.id) : removeCamera(contextMenu.id); setContextMenu(undefined); }}><Trash2 size={15} />删除</button>
            </>
          )}
        </div>
      ) : null}
    </aside>
  );
}
