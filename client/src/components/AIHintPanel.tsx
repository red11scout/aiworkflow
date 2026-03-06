import { useState, useEffect, useRef, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  X,
  Pencil,
  Check,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AIHintPanelProps {
  section: string; // e.g., "strategic_themes", "workflows", "use_cases"
  sectionLabel: string; // e.g., "Strategic Themes", "Workflows"
  context?: string; // Optional context data to pass to the AI
  scenarioId?: string;
  projectId?: string;
}

interface Tip {
  id: number;
  text: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AIHintPanel({
  section,
  sectionLabel,
  context,
  scenarioId,
  projectId,
}: AIHintPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const hasFetched = useRef(false);

  // -------------------------------------------------------------------------
  // Fetch tips from the AI assist endpoint (SSE stream)
  // -------------------------------------------------------------------------

  const fetchTips = useCallback(async () => {
    if (!scenarioId) return;

    setLoading(true);
    setTips([]);

    try {
      const userPrompt = context
        ? `Give me 3-5 short, actionable tips for the "${sectionLabel}" section. Context: ${context}. Number each tip (1. 2. 3. etc). Be concise — one sentence per tip.`
        : `Give me 3-5 short, actionable tips for the "${sectionLabel}" section. Number each tip (1. 2. 3. etc). Be concise — one sentence per tip.`;

      const res = await apiRequest("POST", "/api/ai/assist", {
        section,
        context: { scenarioId, projectId, section },
        userPrompt,
      });

      // The endpoint streams SSE — read the body as text
      const reader = res.body?.getReader();
      if (!reader) {
        setLoading(false);
        return;
      }

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") continue;
            try {
              const parsed = JSON.parse(payload);
              if (parsed.text) {
                fullText += parsed.text;
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      }

      // Parse numbered tips from the response
      const parsed = parseTips(fullText);
      setTips(parsed);
    } catch (err: any) {
      console.error("AIHintPanel fetch error:", err.message);
      // Show a fallback tip on error
      setTips([
        {
          id: 1,
          text: "AI tips unavailable right now. Try regenerating later.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [scenarioId, projectId, section, sectionLabel, context]);

  // Auto-generate on first render when scenarioId is present
  useEffect(() => {
    if (scenarioId && !hasFetched.current) {
      hasFetched.current = true;
      fetchTips();
    }
  }, [scenarioId, fetchTips]);

  // -------------------------------------------------------------------------
  // Parse numbered tips from AI text
  // -------------------------------------------------------------------------

  function parseTips(text: string): Tip[] {
    // Match lines starting with a number followed by . or )
    const lines = text.split("\n").filter((l) => l.trim());
    const result: Tip[] = [];
    let id = 1;

    for (const line of lines) {
      const match = line.match(/^\s*(\d+)[.)]\s*(.+)/);
      if (match) {
        const tipText = match[2].replace(/\*\*/g, "").trim();
        if (tipText.length > 5) {
          result.push({ id: id++, text: tipText });
        }
      }
    }

    // If no numbered tips were found, treat each non-empty line as a tip
    if (result.length === 0) {
      for (const line of lines) {
        const cleaned = line.replace(/^[-*]\s*/, "").replace(/\*\*/g, "").trim();
        if (cleaned.length > 5) {
          result.push({ id: id++, text: cleaned });
        }
      }
    }

    return result.slice(0, 5);
  }

  // -------------------------------------------------------------------------
  // Editing
  // -------------------------------------------------------------------------

  function startEdit(tip: Tip) {
    setEditingId(tip.id);
    setEditValue(tip.text);
  }

  function saveEdit() {
    if (editingId === null) return;
    setTips((prev) =>
      prev.map((t) =>
        t.id === editingId ? { ...t, text: editValue.trim() || t.text } : t,
      ),
    );
    setEditingId(null);
    setEditValue("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (dismissed) return null;

  return (
    <div className="rounded-xl border border-[#02a2fd]/20 bg-[#02a2fd]/5 dark:bg-[#02a2fd]/10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-sm font-medium text-foreground hover:opacity-80 transition-opacity"
        >
          <Sparkles className="w-4 h-4 text-[#02a2fd]" />
          <span>AI Assistant</span>
          <Badge
            variant="outline"
            className="text-xs font-normal border-[#02a2fd]/30 text-[#02a2fd]"
          >
            {sectionLabel}
          </Badge>
          {collapsed ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              hasFetched.current = false;
              fetchTips();
            }}
            disabled={loading}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Regenerate
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="px-4 pb-4">
          {loading ? (
            <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-[#02a2fd]" />
              Generating tips...
            </div>
          ) : tips.length > 0 ? (
            <ol className="space-y-2">
              {tips.map((tip) => (
                <li key={tip.id} className="flex items-start gap-2 group">
                  <span className="text-xs font-semibold text-[#02a2fd] mt-1 shrink-0 w-4 text-right">
                    {tip.id}.
                  </span>
                  {editingId === tip.id ? (
                    <div className="flex-1 space-y-1.5">
                      <Textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        rows={2}
                        className="text-sm bg-background/60"
                        autoFocus
                      />
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={saveEdit}
                          className="h-6 px-2 text-xs gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={cancelEdit}
                          className="h-6 px-2 text-xs gap-1 text-muted-foreground"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <span
                      className="text-sm text-foreground/80 cursor-pointer hover:text-foreground transition-colors flex-1 group"
                      onClick={() => startEdit(tip)}
                      title="Click to edit"
                    >
                      {tip.text}
                      <Pencil className="w-3 h-3 inline-block ml-1.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                    </span>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              No tips generated yet. Click "Regenerate" to get AI suggestions.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
