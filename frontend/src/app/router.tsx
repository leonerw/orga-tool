import { createBrowserRouter } from "react-router-dom";
import { MainLayout } from "./layout/MainLayout";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { TodoPage } from "@/features/todos/pages/TodoPage";
import { LoginPage } from "@/auth/pages/LoginPage";
import { RegisterPage } from "@/auth/pages/RegisterPage";
import { RequireAuth } from "@/auth/components/RequireAuth";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />, // hier ist <Outlet />
    children: [
      {
        index: true,
        element: (
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        ),
      },
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
      { 
        path: "todos", 
        element: (
          <RequireAuth>
            <TodoPage />
          </RequireAuth>
        )
      },
    ],
  },
]);
