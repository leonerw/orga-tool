// src/features/dashboard/pages/DashboardPage.tsx
import { useEffect, useRef, useState } from "react";
import GridLayout from "react-grid-layout";
import { TodoWidget } from "../../todos/components/TodoWidget";
import { TestWidget } from "../../testfeature/components/TestWidget";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

export function DashboardPage() {
  // Layout: 6 Spalten, Widgets je 3 Spalten ⇒ 2 Spalten nebeneinander
  const layout = [
    { i: "todos", x: 0, y: 0, w: 6, h: 3 },
    { i: "test1", x: 3, y: 0, w: 3, h: 3 },
    { i: "test2", x: 0, y: 3, w: 3, h: 3 },
  ];

  // Elternbreite messen, damit das Grid exakt in den Container passt
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      setWidth(w);
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="py-8">
      {/* Dieser Wrapper hat durch dein MainLayout bereits die, von dir gewünschte, Seiten-Margin */}
      <div ref={wrapRef} className="w-full">
        {width > 0 && (
          <GridLayout
            className="layout"
            layout={layout}
            cols={6}
            width={width}                  // ✅ exakt verfügbare Breite
            rowHeight={110}                // Höhe pro „Zeile“
            margin={[20, 20]}              // ✅ Abstand NUR zwischen Widgets (x,y)
            containerPadding={[0, 0]}      // ✅ bündig links/rechts
            isDraggable={false}
            isResizable={false}
          >
            <div key="todos" style={{ height: "100%" }}>
              <TodoWidget />
            </div>
            <div key="test1" style={{ height: "100%" }}>
              <TestWidget />
            </div>
            <div key="test2" style={{ height: "100%" }}>
              <TestWidget />
            </div>
          </GridLayout>
        )}
      </div>
    </div>
  );
}