import { useEffect, useRef, useState } from "react";
import GridLayout from "react-grid-layout";
import { TodoWidget } from "../../todos/components/TodoWidget";
import { TestWidget } from "../../testfeature/components/TestWidget";
import { useAuth } from "@/auth/context/useAuth";
import { resendVerificationEmail } from "@/auth/api/auth";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

// --- Sub-components ---

function EmailVerificationBanner() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleResend() {
    setSending(true);
    try {
      await resendVerificationEmail();
      setSent(true);
    } catch {
      // fail silently — user can try again
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950 px-4 py-3 text-sm">
      <span className="text-yellow-800 dark:text-yellow-200">
        Please verify your email address to secure your account.
      </span>
      {sent ? (
        <span className="text-yellow-700 dark:text-yellow-300 font-medium shrink-0">Sent!</span>
      ) : (
        <button
          onClick={handleResend}
          disabled={sending}
          className="shrink-0 font-medium underline text-yellow-800 dark:text-yellow-200 disabled:opacity-50"
        >
          {sending ? "Sending..." : "Resend email"}
        </button>
      )}
    </div>
  );
}

// --- Layout config ---

const layout = [
  { i: "todos", x: 0, y: 0, w: 6, h: 3 },
  { i: "test1", x: 0, y: 3, w: 3, h: 3 },
  { i: "test2", x: 3, y: 3, w: 3, h: 3 },
];

export function DashboardPage() {
  const { user } = useAuth();

  // --- Grid width tracking ---
  // GridLayout requires an explicit pixel width. ResizeObserver keeps it
  // in sync whenever the container is resized.
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
      {user && !user.emailVerified && <EmailVerificationBanner />}

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
