import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Moon, Sun, Home } from "lucide-react";
import { useTheme } from "next-themes";

interface NavbarProps {
  showHomeButton?: boolean;
  showAuthButtons?: boolean;
}

const Navbar = ({ showHomeButton = false, showAuthButtons = true }: NavbarProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name, role")
          .eq("id", session.user.id)
          .maybeSingle();
        if (profileData) {
          setProfile(profileData);
        }
      }
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    navigate("/");
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between h-full px-4">
        <div 
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate("/")}
        >
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">IA</span>
          </div>
          <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Insta-Apply
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {showHomeButton && (
            <Button 
              onClick={() => navigate("/")} 
              variant="ghost" 
              size="sm"
            >
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
          )}

          {showAuthButtons && user && profile && (
            <div className="flex items-center gap-2">
              <div className="text-sm text-muted-foreground hidden sm:block">
                {profile.full_name} • {profile.role}
              </div>
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          )}

          <Button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            variant="ghost"
            size="sm"
            className="ml-2"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
