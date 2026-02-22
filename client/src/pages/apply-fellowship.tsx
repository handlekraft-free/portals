import { Navbar } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Send } from "lucide-react";
import { Link } from "wouter";

export default function ApplyFellowship() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await apiRequest("POST", "/api/fellowship-applications", data);
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err: Error) => {
      toast({ title: "Something went wrong", description: err.message, variant: "destructive" });
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    formData.forEach((value, key) => { data[key] = value as string; });
    mutation.mutate(data);
  }

  if (submitted) {
    return (
      <div className="min-h-screen font-body bg-[#F5F3EF]">
        <Navbar />
        <div className="max-w-2xl mx-auto px-6 py-32 text-center">
          <CheckCircle2 className="w-16 h-16 text-[#0D7377] mx-auto mb-6" />
          <h1 className="text-4xl font-display text-[#1A1F2B] mb-4" data-testid="text-fellowship-success">Application Received!</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Thank you for applying to the Handlekraft Fellowship. We'll review your application and be in touch soon. We're excited to learn more about you.
          </p>
          <Link href="/">
            <Button data-testid="button-back-home">
              <ArrowLeft className="mr-2 w-4 h-4" /> Back to Home
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen font-body bg-[#F5F3EF]">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-32">
        <Link href="/">
          <Button variant="ghost" className="mb-6" data-testid="button-back">
            <ArrowLeft className="mr-2 w-4 h-4" /> Back
          </Button>
        </Link>

        <h1 className="text-4xl font-display text-[#1A1F2B] mb-2" data-testid="text-fellowship-heading">Apply for the Fellowship</h1>
        <p className="text-lg text-muted-foreground mb-8">
          No college degree required. No tuition. Just a willingness to show up, learn, and build something meaningful. We're looking for problem solvers, not programmers — people ready to claim their <span className="italic">handlekraft</span>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input id="firstName" name="firstName" required data-testid="input-first-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input id="lastName" name="lastName" required data-testid="input-last-name" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" required data-testid="input-email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" data-testid="input-phone" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Where are you located?</Label>
            <Input id="location" name="location" placeholder="City, State" data-testid="input-location" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="background">Tell us about yourself *</Label>
            <Textarea
              id="background"
              name="background"
              required
              placeholder="Your background, what you've been doing, what drives you. We love hearing from career changers, veterans, self-taught learners, and anyone looking for a fresh start."
              className="min-h-[120px]"
              data-testid="input-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivation">Why do you want to join the Handlekraft Fellowship? *</Label>
            <Textarea
              id="motivation"
              name="motivation"
              required
              placeholder="What excites you about this opportunity? What kind of problems do you want to solve?"
              className="min-h-[100px]"
              data-testid="input-motivation"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="experience">Any relevant experience? (optional)</Label>
            <Textarea
              id="experience"
              name="experience"
              placeholder="Self-teaching, projects you've tinkered with, volunteer work, anything you think is relevant. No experience is totally fine too."
              className="min-h-[80px]"
              data-testid="input-experience"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-[#0D7377] text-white font-bold rounded-full h-14 text-lg"
            disabled={mutation.isPending}
            data-testid="button-submit-fellowship"
          >
            {mutation.isPending ? "Submitting..." : (
              <>
                <Send className="mr-2 w-5 h-5" /> Submit Application
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Only a high school diploma or GED required. All backgrounds welcome.
          </p>
        </form>
      </div>
      <Footer />
    </div>
  );
}
