import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Users, Shield, Briefcase, TrendingUp, CheckCircle } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";
import Navbar from "@/components/Navbar";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navbar showAuthButtons={false} />
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
        <div className="container mx-auto px-4 py-20 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-block">
                <span className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold">
                  Intra-College Internship Portal
                </span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Find Your Perfect{" "}
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  Internship
                </span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Connect students, faculty, and opportunities all in one place. 
                INSTA APPLY makes internship discovery and application seamless.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" onClick={() => navigate("/auth")} className="shadow-lg">
                  Get Started
                  <Briefcase className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
                  Sign In
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-3xl rounded-full" />
              <img
                src={heroImage}
                alt="Students collaborating"
                className="relative rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Three Powerful Portals</h2>
            <p className="text-xl text-muted-foreground">
              Purpose-built dashboards for every user role
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="hover:shadow-xl transition-all hover:-translate-y-1">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Student Portal</CardTitle>
                <CardDescription>
                  Browse, filter, and apply to internships with ease
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                  <span className="text-sm">Smart filters by domain & department</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                  <span className="text-sm">Insta Apply with auto-fill resume</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                  <span className="text-sm">Track application status</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                  <span className="text-sm">Upload certificates for verification</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-xl transition-all hover:-translate-y-1">
              <CardHeader>
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-secondary" />
                </div>
                <CardTitle>Faculty Portal</CardTitle>
                <CardDescription>
                  Manage internships and track student progress
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                  <span className="text-sm">Create & manage internship postings</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                  <span className="text-sm">Review student applications</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                  <span className="text-sm">Verify completion certificates</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                  <span className="text-sm">Track student engagement</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-xl transition-all hover:-translate-y-1">
              <CardHeader>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-accent" />
                </div>
                <CardTitle>Admin Portal</CardTitle>
                <CardDescription>
                  Complete control over the entire system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                  <span className="text-sm">Manage faculty & departments</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                  <span className="text-sm">View system-wide analytics</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                  <span className="text-sm">Reset user credentials</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                  <span className="text-sm">Monitor faculty progress</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-card">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                Fast
              </div>
              <p className="text-muted-foreground">Lightning-quick applications</p>
            </div>
            <div>
              <div className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                Smart
              </div>
              <p className="text-muted-foreground">Intelligent filtering & matching</p>
            </div>
            <div>
              <div className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                Secure
              </div>
              <p className="text-muted-foreground">Role-based access control</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="bg-gradient-primary text-primary-foreground border-0 shadow-2xl">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-4xl mb-4">
                Ready to Get Started?
              </CardTitle>
              <CardDescription className="text-primary-foreground/80 text-lg">
                Join thousands of students and faculty already using INSTA APPLY
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-8">
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate("/auth")}
                className="shadow-lg"
              >
                Create Your Account
                <TrendingUp className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t bg-background/50">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 INSTA APPLY.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
