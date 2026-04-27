import { Link } from "wouter";
import { Gamepad2, Sparkles, Users, BarChart3, FileText, ImageIcon, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
  { icon: Sparkles, title: "AI Co-Designer", desc: "Multi-provider AI helps you brainstorm mechanics, ontologies, and rule conflicts." },
  { icon: Users, title: "Players & Personas", desc: "Define player types, motivations, and target audiences for your game." },
  { icon: BarChart3, title: "Simulator", desc: "Run Monte Carlo balance tests and live playthroughs to find broken loops fast." },
  { icon: ImageIcon, title: "Asset Generation", desc: "Generate cards, tokens, and board art with built-in image generation." },
  { icon: FileText, title: "Playtesting Hub", desc: "Capture sessions, share public feedback links, and triage issues." },
  { icon: Gamepad2, title: "Export to PnP", desc: "Generate print-and-play sheets, rulebooks, and storyboards in one click." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
              <Gamepad2 className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg">GameForge</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/sign-in">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary mb-6">
          <Sparkles className="h-3 w-3" /> Now with multi-provider AI routing
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
          The IDE for board game design.
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Brainstorm, prototype, simulate, and ship your tabletop game in one workspace. Built with AI co-designers, balance simulators, and asset generators.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/sign-up">
            <Button size="lg" className="gap-2">
              Start designing free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button size="lg" variant="outline">Sign in</Button>
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title} className="bg-card border-card-border">
                <CardContent className="p-6">
                  <div className="bg-primary/10 text-primary inline-flex p-2.5 rounded-lg mb-4">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-6 text-sm text-muted-foreground flex justify-between">
          <span>GameForge — Board game design studio</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
