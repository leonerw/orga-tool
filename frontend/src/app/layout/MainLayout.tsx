import { Outlet } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { ThemeProvider } from "@/components/themes/theme-provider";

export function MainLayout() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="min-h-screen bg-background flex flex-col">
        <div className="w-full mx-auto max-w-[1200px] px-6 sm:px-8 md:px-12 lg:px-16 flex flex-col flex-1">
          <Navbar />
          <main className="flex-1 py-8 px-4">
            <Outlet />
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
