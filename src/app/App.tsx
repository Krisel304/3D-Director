import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from "react";
import { BottomToolbar } from "../components/layout/BottomToolbar";
import { LeftPanel } from "../components/layout/LeftPanel";
import { RightPanel } from "../components/layout/RightPanel";
import { TimelinePanel } from "../components/panels/TimelinePanel";
import { TopBar } from "../components/layout/TopBar";
import { Viewport3D } from "../components/viewport/Viewport3D";
import { useProjectStore } from "../store/projectStore";

type AppErrorBoundaryState = {
  errorMessage: string;
};

class AppErrorBoundary extends Component<
  { children: ReactNode },
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    errorMessage: "",
  };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return {
      errorMessage: error instanceof Error ? error.message : "页面运行出错",
    };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("Workbench render error", error, info);
  }

  render() {
    if (this.state.errorMessage) {
      return (
        <main className="workbench-shell workbench-error-shell">
          <div className="workbench-error-card" role="alert">
            <strong>页面运行异常</strong>
            <span>{this.state.errorMessage}</span>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

function WorkbenchApp() {
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [timelineHeight, setTimelineHeight] = useState(420);
  const [runtimeError, setRuntimeError] = useState("");
  const isPlaying = useProjectStore((state) => state.animation.isPlaying);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setRuntimeError(event.message || "页面运行出错");
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      setRuntimeError(
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "页面运行出错",
      );
    };
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      return undefined;
    }

    let intervalId = 0;
    let lastTime = performance.now();

    intervalId = window.setInterval(() => {
      const now = performance.now();
      const deltaSeconds = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      useProjectStore.getState().stepAnimation(deltaSeconds);
    }, 1000 / 30);

    return () => window.clearInterval(intervalId);
  }, [isPlaying]);

  return (
    <main className="workbench-shell">
      <TopBar />
      <section className="workbench-main">
        <LeftPanel />
        <div className={`viewport-wrap ${timelineExpanded ? "timeline-expanded" : ""}`}>
          <Viewport3D />
          <TimelinePanel
            expanded={timelineExpanded}
            height={timelineHeight}
            onHeightChange={setTimelineHeight}
          />
          <BottomToolbar
            lifted={timelineExpanded}
            liftedHeight={timelineHeight}
            timelineExpanded={timelineExpanded}
            onTimelineToggle={() => setTimelineExpanded((current) => !current)}
          />
        </div>
        <RightPanel animationMode={timelineExpanded} />
      </section>
      {runtimeError ? (
        <div className="runtime-error-overlay" role="alert">
          <strong>页面运行异常</strong>
          <span>{runtimeError}</span>
        </div>
      ) : null}
    </main>
  );
}

export function App() {
  return (
    <AppErrorBoundary>
      <WorkbenchApp />
    </AppErrorBoundary>
  );
}
