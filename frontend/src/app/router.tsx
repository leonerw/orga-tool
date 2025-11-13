import { createBrowserRouter } from "react-router-dom";
import { MainLayout } from "./layout/MainLayout";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { TodoPage } from "@/features/todos/pages/TodoPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />, // hier ist <Outlet />
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "todos", element: <TodoPage /> },
    ],
  },
]);
