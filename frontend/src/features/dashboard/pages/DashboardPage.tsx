import { useEffect, useRef, useState } from "react";
import GridLayout from "react-grid-layout";
import { TodoWidget } from "../../todos/components/TodoWidget";
import { TestWidget } from "../../testfeature/components/TestWidget";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

export function DashboardPage() {
  const layout = [
    { i: "todos", x: 0, y: 0, w: 6, h: 3 },
    { i: "test1", x: 0, y: 3, w: 3, h: 3 },
    { i: "test2", x: 3, y: 3, w: 3, h: 3 },
  ];

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!wrapRef.current) return;

    const el = wrapRef.current;

    const updateWidth = () => {
      setWidth(el.getBoundingClientRect().width);
    };

    updateWidth(); // important initial value after bootstrap

    const ro = new ResizeObserver(() => {
      updateWidth();
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="py-8">
      <div ref={wrapRef} className="w-full">
        {width > 0 && (
          <GridLayout
            className="layout"
            layout={layout}
            cols={6}
            width={width}
            rowHeight={110}
            margin={[20, 20]}
            containerPadding={[0, 0]}
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
