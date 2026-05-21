import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { dark } from "@clerk/themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Workspace from "@/pages/workspace";
import WorkspaceHome from "@/pages/workspace-home";
import WorkspaceBySlug from "@/pages/workspace-by-slug";
import Account from "@/pages/account";
import Admin from "@/pages/admin";
import LearnPage from "@/pages/learn";
import Landing from "@/pages/landing";
import PublicFeedback from "@/pages/public-feedback";
import JoinWorkspace from "@/pages/join-workspace";
import WorkspaceAdmin from "@/pages/workspace-admin";

const queryClient = new QueryClient();

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in environment");
}

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  theme: dark,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${typeof window !== "undefined" ? window.location.origin : ""}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(263 70% 60%)",
    colorForeground: "hsl(210 40% 98%)",
    colorMutedForeground: "hsl(215 20% 65%)",
    colorDanger: "hsl(0 84% 60%)",
    colorBackground: "hsl(222 47% 11%)",
    colorInput: "hsl(217 33% 17%)",
    colorInputForeground: "hsl(210 40% 98%)",
    colorNeutral: "hsl(217 33% 25%)",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox:
      "bg-[hsl(222_47%_11%)] rounded-2xl w-[440px] max-w-full overflow-hidden border border-[hsl(217_33%_25%)] shadow-2xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-white text-2xl font-bold",
    headerSubtitle: "text-slate-400",
    socialButtonsBlockButtonText: "text-white",
    formFieldLabel: "text-slate-200",
    footerActionLink: "text-violet-400 hover:text-violet-300",
    footerActionText: "text-slate-400",
    dividerText: "text-slate-400",
    identityPreviewEditButton: "text-violet-400",
    formFieldSuccessText: "text-emerald-400",
    alertText: "text-red-400",
    logoBox: "flex justify-center mb-2",
    logoImage: "h-10 w-10",
    socialButtonsBlockButton:
      "bg-[hsl(217_33%_17%)] hover:bg-[hsl(217_33%_22%)] border border-[hsl(217_33%_25%)]",
    formButtonPrimary:
      "bg-violet-600 hover:bg-violet-500 text-white font-medium",
    formFieldInput:
      "bg-[hsl(217_33%_17%)] border border-[hsl(217_33%_25%)] text-white",
    footerAction: "text-slate-400",
    dividerLine: "bg-[hsl(217_33%_25%)]",
    alert: "bg-red-950/40 border border-red-900",
    otpCodeFieldInput: "bg-[hsl(217_33%_17%)] text-white",
    formFieldRow: "",
    main: "",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <WorkspaceHome />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

const RESERVED_TOP_PATHS = new Set([
  "sign-in", "sign-up", "feedback", "account", "admin", "p", "api", "_assets", "favicon.ico", "join",
]);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function Routes() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/feedback/:token" component={PublicFeedback} />
      <Route path="/join/:code" component={JoinWorkspace} />
      <Route path="/account">
        <ProtectedRoute>
          <Account />
        </ProtectedRoute>
      </Route>
      <Route path="/learn">
        <ProtectedRoute>
          <LearnPage />
        </ProtectedRoute>
      </Route>
      <Route path="/admin">
        <ProtectedRoute>
          <Admin />
        </ProtectedRoute>
      </Route>
      <Route path="/w/:workspaceSlug/admin">
        {(params) => (
          <ProtectedRoute>
            <WorkspaceAdmin key={`${params.workspaceSlug}/admin`} />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/p/:projectId">
        {(params) => (
          <ProtectedRoute>
            <Workspace key={params.projectId} />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/:workspaceSlug/:projectSlug">
        {(params) =>
          RESERVED_TOP_PATHS.has(params.workspaceSlug) ? (
            <NotFound />
          ) : (
            <ProtectedRoute>
              <WorkspaceBySlug key={`${params.workspaceSlug}/${params.projectSlug}`} />
            </ProtectedRoute>
          )
        }
      </Route>
      <Route path="/:workspaceSlug">
        {(params) =>
          RESERVED_TOP_PATHS.has(params.workspaceSlug) ? (
            <NotFound />
          ) : (
            <ProtectedRoute>
              <WorkspaceHome key={params.workspaceSlug} />
            </ProtectedRoute>
          )
        }
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: { title: "Welcome back to GameForge", subtitle: "Sign in to continue designing your game" },
        },
        signUp: {
          start: { title: "Join GameForge", subtitle: "Build, simulate, and ship your board game" },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Routes />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
