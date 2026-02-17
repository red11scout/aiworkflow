import { Switch, Route } from "wouter";
import { Toaster } from "sonner";
import Home from "./pages/Home";
import Upload from "./pages/Upload";
import StrategicThemes from "./pages/StrategicThemes";
import BusinessFunctions from "./pages/BusinessFunctions";
import FrictionMapping from "./pages/FrictionMapping";
import UseCases from "./pages/UseCases";
import Benefits from "./pages/Benefits";
import Workflows from "./pages/Workflows";
import Readiness from "./pages/Readiness";
import Matrix from "./pages/Matrix";
import Dashboard from "./pages/Dashboard";
import SharedReport from "./pages/SharedReport";

export default function App() {
  return (
    <>
      <Toaster position="top-right" richColors />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/project/:projectId/upload" component={Upload} />
        <Route path="/project/:projectId/themes" component={StrategicThemes} />
        <Route path="/project/:projectId/functions" component={BusinessFunctions} />
        <Route path="/project/:projectId/friction" component={FrictionMapping} />
        <Route path="/project/:projectId/usecases" component={UseCases} />
        <Route path="/project/:projectId/benefits" component={Benefits} />
        <Route path="/project/:projectId/workflows" component={Workflows} />
        <Route path="/project/:projectId/readiness" component={Readiness} />
        <Route path="/project/:projectId/matrix" component={Matrix} />
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
