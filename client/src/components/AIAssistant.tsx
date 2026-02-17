import { useState, useRef, useEffect } from "react";
import { getOwnerToken } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  MessageSquare,
  Copy,
  Check,
} from "lucide-react";

interface AIAssistantProps {
  section: string;
  context: any;
  suggestedPrompts?: string[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AIAssistant({
  section,
  context,
  suggestedPrompts = [],
}: AIAssistantProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(prompt?: string) {
    const text = prompt || input.trim();
    if (!text || streaming) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setStreaming(true);

    try {
      const response = await fetch("/api/ai/assist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Owner-Token": getOwnerToken(),
        },
        body: JSON.stringify({ section, context, userPrompt: text }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "AI assistant unavailable");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                assistantContent += data.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: assistantContent,
                  };
                  return updated;
                });
              }
            } catch {
              // Ignore parse errors for SSE
            }
          }
        }
      }
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${error.message}`,
        },
      ]);
    } finally {
      setStreaming(false);
    }
  }

  function handleCopy(index: number, text: string) {
    navigator.clipboard.writeText(text);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105",
          open
            ? "bg-slate-800 text-white"
            : "text-white"
        )}
        style={!open ? { background: "linear-gradient(135deg, #001278, #02a2fd)" } : undefined}
        title="AI Assistant"
      >
        {open ? <X className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-96 max-h-[70vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center gap-2 text-white"
            style={{ background: "linear-gradient(135deg, #001278, #02a2fd)" }}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="font-medium text-sm">AI Writing Assistant</span>
            <span className="text-xs opacity-70 ml-auto">{section}</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[400px]">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Sparkles className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">
                  Ask me to help write, improve, or validate content.
                </p>

                {suggestedPrompts.length > 0 && (
                  <div className="space-y-2">
                    {suggestedPrompts.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(prompt)}
                        className="block w-full text-left px-3 py-2 text-xs rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "text-sm rounded-lg px-3 py-2",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground ml-8"
                    : "bg-muted text-foreground mr-4"
                )}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.role === "assistant" && msg.content && (
                  <button
                    onClick={() => handleCopy(i, msg.content)}
                    className="mt-1 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    {copied === i ? (
                      <>
                        <Check className="w-3 h-3" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copy
                      </>
                    )}
                  </button>
                )}
              </div>
            ))}

            {streaming && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Thinking...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                className="flex-1 resize-none border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                rows={2}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || streaming}
                className="self-end p-2 rounded-lg text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #001278, #02a2fd)" }}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
