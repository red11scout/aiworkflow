import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface LinkInfo {
  customerName: string;
  companyName: string;
  requiresPassword: boolean;
}

export default function CustomerEntry() {
  const { code } = useParams<{ code: string }>();
  const [, navigate] = useLocation();
  const [info, setInfo] = useState<LinkInfo | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check for existing token in localStorage
    const existingToken = localStorage.getItem(`customer_token_${code}`);
    if (existingToken) {
      navigate(`/customer/${code}/review`, { replace: true });
      return;
    }

    fetch(`/api/customer/${code}/info`)
      .then((res) => {
        if (!res.ok) throw new Error("Link not found");
        return res.json();
      })
      .then((data: LinkInfo) => {
        setInfo(data);
        setLoading(false);

        // If no password required, auto-verify and redirect
        if (!data.requiresPassword) {
          handleVerify(data.requiresPassword);
        }
      })
      .catch(() => {
        setError("This link is invalid or has expired.");
        setLoading(false);
      });
  }, [code]);

  async function handleVerify(requiresPassword?: boolean) {
    setVerifying(true);
    setError("");

    try {
      const res = await fetch(`/api/customer/${code}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: requiresPassword === false ? undefined : password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Invalid password");
        setVerifying(false);
        return;
      }

      const { token } = await res.json();
      localStorage.setItem(`customer_token_${code}`, token);
      navigate(`/customer/${code}/review`, { replace: true });
    } catch {
      setError("Something went wrong. Please try again.");
      setVerifying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#02a2fd]" />
      </div>
    );
  }

  if (!info) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">{error || "Link not found"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md mx-4">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="/blueally-logo.png"
            alt="BlueAlly"
            className="h-10 w-auto dark:hidden"
          />
          <img
            src="/blueally-logo-white.png"
            alt="BlueAlly"
            className="h-10 w-auto hidden dark:block"
          />
        </div>

        <Card>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">
              {info.companyName}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              AI Workflow Workshop
            </p>
          </CardHeader>

          <CardContent>
            {info.requiresPassword ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleVerify();
                }}
                className="space-y-4"
              >
                <p className="text-sm text-muted-foreground text-center">
                  Enter your password to access and edit your workshop data.
                </p>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-500 text-center">{error}</p>
                )}

                <Button
                  type="submit"
                  className="w-full bg-[#02a2fd] hover:bg-[#0291e3]"
                  disabled={verifying || !password}
                >
                  {verifying ? "Verifying..." : "Access Project"}
                  {!verifying && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </form>
            ) : (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#02a2fd] mx-auto" />
                <p className="text-sm text-muted-foreground mt-3">Loading your project...</p>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Powered by BlueAlly AI Workshop
        </p>
      </div>
    </div>
  );
}
