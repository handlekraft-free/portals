import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md mx-4 shadow-xl border-border/50">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold text-foreground font-display">Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground font-body">
            We couldn't find the page you were looking for. It might have been moved or deleted.
          </p>

          <div className="mt-8 flex justify-end">
             <Link href="/">
              <Button className="bg-[#1A1F2B] text-white hover:bg-[#1A1F2B]/90">Return to Home</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
