import { useEffect } from "react";
import { Navbar } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Send } from "lucide-react";
import { Link } from "wouter";

export default function ApplyClient() {
  useEffect(() => { document.title = "Request Free Help | handləkraft.ai"; }, []);
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [orgType, setOrgType] = useState("");
  const [urgency, setUrgency] = useState("normal");

  const mutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await apiRequest("POST", "/api/client-applications", data);
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
    data.organizationType = orgType;
    data.urgency = urgency;
    mutation.mutate(data);
  }

  if (submitted) {
    return (
      <div className="min-h-screen font-body bg-[#F5F3EF]">
        <Navbar />
        <div className="max-w-2xl mx-auto px-6 py-32 text-center">
          <CheckCircle2 className="w-16 h-16 text-[#0D7377] mx-auto mb-6" />
          <h1 className="text-4xl font-display text-[#1A1F2B] mb-4" data-testid="text-client-success">Request Received!</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Thank you for reaching out. We'll review your request and be in touch soon to learn more about your organization and how we can help.
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

        <h1 className="text-4xl font-display text-[#1A1F2B] mb-2" data-testid="text-client-heading">Request Free Help</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Tell us about your organization and what you need. Whether it's a website, an intake system, or something else entirely — we'd love to help you gain the power to act. Everything we build is free.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="organizationName">Organization Name *</Label>
            <Input id="organizationName" name="organizationName" required data-testid="input-org-name" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactName">Your Name *</Label>
              <Input id="contactName" name="contactName" required data-testid="input-contact-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Your Email *</Label>
              <Input id="contactEmail" name="contactEmail" type="email" required data-testid="input-contact-email" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Phone (optional)</Label>
              <Input id="contactPhone" name="contactPhone" type="tel" data-testid="input-contact-phone" />
            </div>
            <div className="space-y-2">
              <Label>Organization Type *</Label>
              <Select value={orgType} onValueChange={setOrgType} required>
                <SelectTrigger data-testid="select-org-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nonprofit">Nonprofit</SelectItem>
                  <SelectItem value="shelter">Shelter</SelectItem>
                  <SelectItem value="clinic">Community Clinic</SelectItem>
                  <SelectItem value="food-bank">Food Bank</SelectItem>
                  <SelectItem value="youth-program">Youth Program</SelectItem>
                  <SelectItem value="veteran-services">Veteran Services</SelectItem>
                  <SelectItem value="local-government">Local Government Agency</SelectItem>
                  <SelectItem value="community-org">Community Organization</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" placeholder="City, State" data-testid="input-location" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="needs">What do you need help with? *</Label>
            <Textarea
              id="needs"
              name="needs"
              required
              placeholder="A new website? A better way to track clients? A scheduling system? A donor management tool? Tell us what would make the biggest difference for your team."
              className="min-h-[120px]"
              data-testid="input-needs"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentTools">What tools are you currently using? (optional)</Label>
            <Textarea
              id="currentTools"
              name="currentTools"
              placeholder="Spreadsheets, paper forms, an old website, a specific software — anything you're working with now."
              className="min-h-[80px]"
              data-testid="input-current-tools"
            />
          </div>

          <div className="space-y-2">
            <Label>How urgent is this need?</Label>
            <Select value={urgency} onValueChange={setUrgency}>
              <SelectTrigger data-testid="select-urgency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Not urgent — whenever you can get to it</SelectItem>
                <SelectItem value="normal">Normal — within the next few months</SelectItem>
                <SelectItem value="high">Urgent — we really need this soon</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            className="w-full bg-[#0D7377] text-white font-bold rounded-full h-14 text-lg"
            disabled={mutation.isPending}
            data-testid="button-submit-client"
          >
            {mutation.isPending ? "Submitting..." : (
              <>
                <Send className="mr-2 w-5 h-5" /> Submit Request
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Everything we build is free. We'll reach out to learn more about your needs.
          </p>
        </form>
      </div>
      <Footer />
    </div>
  );
}
