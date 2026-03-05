import { Switch, Route } from "wouter";
import { Toaster } from "sonner";
import Home from "./pages/Home";
import Upload from "./pages/Upload";
import Workflows from "./pages/Workflows";
import Dashboard from "./pages/Dashboard";
import SharedReport from "./pages/SharedReport";

export default function App() {
  return (
    <>
      <Toaster position="top-right" richColors />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/project/:projectId" component={Upload} />
        <Route path="/project/:projectId/workshop" component={Workflows} />
        <Route path="/project/:projectId/dashboard" component={Dashboard} />
        <Route path="/shared/:code" component={SharedReport} />
        <Route>
          <div className="min-h-screen flex items-center justify-center">
            <p className="text-muted-foreground">Page not found</p>
          </div>
        </Route>
      </Switch>
    </>
  );
}
