import { Link, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/themes/mode-toggle";
import { useAuth } from "@/auth/context/useAuth";

export function Navbar() {
  const navigate = useNavigate();
  const { isAuthenticated, isBootstrapping, user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const fallback = user?.displayName?.[0]?.toUpperCase() || "U";

  return (
    <nav className="w-full border-b bg-background sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
        </Link>

        <div className="flex items-center gap-3">
          <ModeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{fallback}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {isBootstrapping ? (
                <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
              ) : !isAuthenticated ? (
                <>
                  <DropdownMenuItem asChild>
                    <Link to="/login">Login</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/register">Register</Link>
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem disabled>
                    {user?.displayName} ({user?.email})
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/account">Account settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      void handleLogout();
                    }}
                  >
                    Logout
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
