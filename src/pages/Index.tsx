import { Monitor, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-8 px-6">
        <div className="space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
            <Monitor className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            Digital Signage
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Manage your display content in real-time. Upload images, set durations, and sync instantly.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="gap-2">
            <Link to="/admin">
              <Settings className="w-4 h-4" />
              Admin Panel
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="gap-2">
            <Link to="/display">
              <Monitor className="w-4 h-4" />
              Display View
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
