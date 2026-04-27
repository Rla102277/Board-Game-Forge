import { useEffect, useState } from "react";
import { Link } from "wouter";
import { GraduationCap, BookOpen, ArrowLeft, Gamepad2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BibleContent } from "@/components/learn/bible";
import { Design101Content } from "@/components/learn/design-101";

const RETURN_KEY = "gameforge.learn.returnTo";

function deriveReturnTo(): string {
  if (typeof window === "undefined") return "/";
  try {
    const stashed = sessionStorage.getItem(RETURN_KEY);
    if (stashed && stashed !== window.location.pathname) return stashed;
  } catch {/* ignore */}
  if (typeof document !== "undefined" && document.referrer) {
    try {
      const url = new URL(document.referrer);
      if (url.origin === window.location.origin && !url.pathname.endsWith("/learn")) {
        return url.pathname + url.search;
      }
    } catch {/* ignore */}
  }
  return "/";
}

export default function LearnPage() {
  const [returnTo, setReturnTo] = useState<string>("/");

  useEffect(() => {
    setReturnTo(deriveReturnTo());
    try { sessionStorage.removeItem(RETURN_KEY); } catch {/* ignore */}
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/40 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <Link href={returnTo} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="learn-back-brand">
            <ArrowLeft className="h-4 w-4" />
            <Gamepad2 className="h-4 w-4" />
            <span className="font-bold text-foreground">GameForge</span>
          </Link>
          <div className="h-6 w-px bg-border" />
          <h1 className="text-base font-semibold flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            Learn
          </h1>
          <div className="ml-auto">
            <Link href={returnTo}>
              <Button variant="outline" size="sm" data-testid="learn-back-button">Back</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <Tabs defaultValue="bible" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="bible" data-testid="tab-bible" className="gap-2">
              <BookOpen className="h-4 w-4" /> GameForge Bible
            </TabsTrigger>
            <TabsTrigger value="design101" data-testid="tab-design101" className="gap-2">
              <GraduationCap className="h-4 w-4" /> Design 101
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bible" className="mt-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold">GameForge Bible</h2>
              <p className="text-muted-foreground text-sm mt-1">
                A guided tour of every panel and AI feature. Mark chapters complete as you go — your progress is saved on this device.
              </p>
            </div>
            <BibleContent />
          </TabsContent>

          <TabsContent value="design101" className="mt-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold">Board Game Design 101</h2>
              <p className="text-muted-foreground text-sm mt-1">
                An eight-lesson primer on designing tabletop games — from your first rule to your first crowdfund campaign.
              </p>
            </div>
            <Design101Content />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
