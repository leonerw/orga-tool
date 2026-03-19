import { createBrowserRouter } from "react-router-dom";
import { MainLayout } from "./layout/MainLayout";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { TodoPage } from "@/features/todos/pages/TodoPage";
import { AccountPage } from "@/features/account/pages/AccountPage";
import { LoginPage } from "@/auth/pages/LoginPage";
import { RegisterPage } from "@/auth/pages/RegisterPage";
import { VerifyEmailPage } from "@/auth/pages/VerifyEmailPage";
import { RequireAuth } from "@/auth/components/RequireAuth";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
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
      { path: "verify-email", element: <VerifyEmailPage /> },
      {
        path: "todos",
        element: (
          <RequireAuth>
            <TodoPage />
          </RequireAuth>
        ),
      },
      {
        path: "account",
        element: (
          <RequireAuth>
            <AccountPage />
          </RequireAuth>
        ),
      },
    ],
  },
]);
