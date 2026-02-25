import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import vikingLost from "@/assets/images/viking-lost.png";

export default function NotFound() {
  useEffect(() => { document.title = "Page Not Found | handləkraft.ai"; }, []);
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md mx-4 shadow-xl border-border/50">
        <CardContent className="pt-6 text-center">
          <img src={vikingLost} alt="" className="w-36 h-36 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground font-display mb-2">Page Not Found</h1>

          <p className="text-sm text-muted-foreground font-body">
            Our Viking explorer couldn't find this page. It might have been moved or deleted.
          </p>

          <div className="mt-8">
             <Link href="/">
              <Button className="bg-[#1A1F2B] text-white hover:bg-[#1A1F2B]/90">Return to Home</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
