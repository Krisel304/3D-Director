import {
  Box,
  ChevronDown,
  Download,
  Expand,
  FileUp,
  History,
  Mic,
  Plus,
  SendHorizontal,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import type { ChangeEvent, PointerEvent } from "react";
import { useRef, useState } from "react";
import type { SpaceSceneTheme } from "../../domain/projectTypes";
import { useProjectStore } from "../../store/projectStore";

const themes: SpaceSceneTheme[] = ["mist", "verdant", "amber"];

function scenePreviewClass(theme: SpaceSceneTheme) {
  return `space-preview theme-${theme}`;
}

export function SpaceEntry({ onEnter }: { onEnter: () => void }) {
  const scenes = useProjectStore((state) => state.spaceScenes);
  const activeSceneId = useProjectStore((state) => state.activeSpaceSceneId);
  const createSpaceScene = useProjectStore((state) => state.createSpaceScene);
  const completeSpaceScene = useProjectStore((state) => state.completeSpaceScene);
  const activateSpaceScene = useProjectStore((state) => state.activateSpaceScene);
  const removeSpaceScene = useProjectStore((state) => state.removeSpaceScene);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState("");
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewOffset, setPreviewOffset] = useState({ x: 0, y: 0 });
  const [dragOrigin, setDragOrigin] = useState<{ x: number; y: number }>();

  const activeScene = scenes.find((scene) => scene.id === activeSceneId) ?? scenes.at(-1);
  const beginGeneration = (content = prompt) => {
    const sceneId = createSpaceScene(content || "生成一个具有电影感的 3D 空间", themes[scenes.length % themes.length]);
    setPrompt("");
    window.setTimeout(() => completeSpaceScene(sceneId), 900);
  };
  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) beginGeneration(file.name);
    event.target.value = "";
  };
  const handlePreviewPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragOrigin) return;
    setPreviewOffset({
      x: Math.max(-28, Math.min(28, previewOffset.x + (event.clientX - dragOrigin.x) * 0.12)),
      y: Math.max(-18, Math.min(18, previewOffset.y + (event.clientY - dragOrigin.y) * 0.12)),
    });
    setDragOrigin({ x: event.clientX, y: event.clientY });
  };

  return (
    <main className={`space-entry-shell ${isFullscreen ? "is-fullscreen" : ""}`}>
      <header className="space-entry-topbar">
        <div className="space-entry-brand"><Box size={18} />3D 空间</div>
        <span>在画布中生成、预览并进入 3D 空间</span>
      </header>

      <section className="space-node-canvas">
        <div className="space-node-toolbar">
          <button className="space-enter-button" type="button" onClick={onEnter}>
            <Box size={15} />进入 3D 空间
          </button>
          <button
            className="space-toolbar-icon"
            disabled={!activeScene}
            title={activeScene ? "下载当前 3D 资产" : "当前暂无 3D 资产"}
            type="button"
          >
            <Download size={16} />
          </button>
          <button className="space-toolbar-icon" title="上传参考资产" type="button" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} />
          </button>
          <button className="space-toolbar-icon" title="全屏查看" type="button" onClick={() => setIsFullscreen((value) => !value)}>
            <Expand size={16} />
          </button>
        </div>

        <article className="space-node-card">
          <div className="space-history-wrap">
            <button className="space-history-button" type="button" onClick={() => setHistoryOpen((value) => !value)}>
              <History size={16} />历史
            </button>
            {historyOpen ? (
              <div className="space-history-popover">
                <div className="space-history-title">历史生成</div>
                {scenes.length ? scenes.map((scene) => (
                  <div className={`space-history-row ${scene.id === activeScene?.id ? "is-active" : ""}`} key={scene.id}>
                    <button type="button" onClick={() => { activateSpaceScene(scene.id); setHistoryOpen(false); }}>
                      <span>{scene.name}</span>
                      <small>{scene.status === "generating" ? "生成中" : "已生成"}</small>
                    </button>
                    <button title={`删除${scene.name}`} type="button" onClick={() => removeSpaceScene(scene.id)}><Trash2 size={14} /></button>
                  </div>
                )) : <div className="space-history-empty">暂无生成记录</div>}
              </div>
            ) : null}
          </div>

          {activeScene ? (
            <div
              className={`${scenePreviewClass(activeScene.theme)} ${activeScene.status === "generating" ? "is-generating" : ""}`}
              style={{ backgroundPosition: `calc(50% + ${previewOffset.x}px) calc(50% + ${previewOffset.y}px)` }}
              onPointerDown={(event) => setDragOrigin({ x: event.clientX, y: event.clientY })}
              onPointerLeave={() => setDragOrigin(undefined)}
              onPointerMove={handlePreviewPointerMove}
              onPointerUp={() => setDragOrigin(undefined)}
            >
              <div className="space-preview-grid" />
              <div className="space-preview-orb" />
              <div className="space-preview-meta">
                <strong>{activeScene.name}</strong>
                <span>{activeScene.status === "generating" ? "3D 世界正在生成中" : "拖动预览空间视角"}</span>
              </div>
            </div>
          ) : (
            <div className="space-preview-empty">
              <Box size={34} />
              <strong>尚未创建 3D 空间</strong>
              <span>生成空间后，可在此预览并进入编辑</span>
              <button type="button" onClick={onEnter}>直接进入 3D 空间</button>
            </div>
          )}
        </article>

        <section className="space-prompt-panel">
          <textarea
            placeholder="描述任何你想要生成的 3D 空间或资产"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
          <div className="space-prompt-actions">
            <button className="space-plus-button" title="添加参考图片或资产" type="button" onClick={() => fileInputRef.current?.click()}><Plus size={17} /></button>
            <div className="space-model-picker">
              <button type="button" onClick={() => setModelMenuOpen((value) => !value)}><Sparkles size={15} />Tripo 3D 模型<ChevronDown size={14} /></button>
              {modelMenuOpen ? (
                <div className="space-model-menu">
                  <button type="button" onClick={() => setModelMenuOpen(false)}>Tripo 3D 模型</button>
                  <button className="space-model-option-disabled" disabled type="button">
                    3D 世界模型
                    <span className="space-model-hover-hint">功能即将开放，敬请期待</span>
                  </button>
                </div>
              ) : null}
            </div>
            <div className="space-output-type">3D 资产</div>
            <button className="space-mic-button" title="语音输入" type="button"><Mic size={16} /></button>
            <button className="space-generate-button" type="button" onClick={() => beginGeneration()}><SendHorizontal size={16} />生成</button>
          </div>
        </section>
        <input ref={fileInputRef} className="file-input" type="file" accept="image/*,.glb,.obj" onChange={handleUpload} />
      </section>
    </main>
  );
}
