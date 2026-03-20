import { Suspense, lazy } from "react";
import { Switch, Route } from "wouter";
import { Toaster } from "sonner";

const Home = lazy(() => import("./pages/Home"));
const Upload = lazy(() => import("./pages/Upload"));
const Assessment = lazy(() => import("./pages/Assessment"));
const Workflows = lazy(() => import("./pages/Workflows"));
const ReviewRefine = lazy(() => import("./pages/ReviewRefine"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const SharedReport = lazy(() => import("./pages/SharedReport"));
const CustomerEntry = lazy(() => import("./pages/CustomerEntry"));
const CustomerView = lazy(() => import("./pages/CustomerView"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#02a2fd]" />
    </div>
  );
}

export default function App() {
  return (
    <>
      <Toaster position="top-right" richColors />
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/project/:projectId" component={Upload} />
          <Route path="/project/:projectId/assessment" component={Assessment} />
          <Route path="/project/:projectId/workshop" component={Workflows} />
          <Route path="/project/:projectId/review" component={ReviewRefine} />
          <Route path="/project/:projectId/dashboard" component={Dashboard} />
          <Route path="/shared/:code" component={SharedReport} />
          <Route path="/customer/:code" component={CustomerEntry} />
          <Route path="/customer/:code/:tab" component={CustomerView} />
          <Route>
            <div className="min-h-screen flex items-center justify-center">
              <p className="text-muted-foreground">Page not found</p>
            </div>
          </Route>
        </Switch>
      </Suspense>
    </>
  );
}
