import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Image, Paperclip, Smile, Check, CheckCheck, MoreVertical, Phone, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import emmaAvatar from "@/assets/emma-avatar.jpg";

/** Renders text with auto-linked URLs */
const LinkedText = ({ text }: { text: string }) => {
  const parts = useMemo(() => {
    const urlRegex = /(https?:\/\/[^\s,)]+)/g;
    const result: { type: "text" | "link"; value: string }[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = urlRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        result.push({ type: "text", value: text.slice(lastIndex, match.index) });
      }
      result.push({ type: "link", value: match[1] });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      result.push({ type: "text", value: text.slice(lastIndex) });
    }
    return result;
  }, [text]);

  return (
    <>
      {parts.map((p, i) =>
        p.type === "link" ? (
          <a key={i} href={p.value} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">
            {p.value}
          </a>
        ) : (
          <span key={i}>{p.value}</span>
        )
      )}
    </>
  );
};

interface Message {
  id: string;
  text: string;
  image?: string;
  sender: "user" | "support";
  time: string;
  status: "sent" | "delivered" | "read";
  isAI?: boolean;
}

const ServiceChat = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [emmaEnabled, setEmmaEnabled] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const manuallyAddedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/connexion"); return; }
    setUserId(user.id);

    // Check Emma status
    const { data: setting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "sarah_enabled")
      .single();
    const enabled = setting?.value === "true";
    setEmmaEnabled(enabled);

    // Load existing messages
    const { data: existingMsgs } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (existingMsgs && existingMsgs.length > 0) {
      const loaded: Message[] = existingMsgs.map((m: any) => ({
        id: m.id,
        text: m.message,
        sender: m.sender === "user" ? "user" : "support",
        time: new Date(m.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        status: "read",
        isAI: m.is_ai,
      }));
      setMessages(loaded);
    } else {
      // First visit greeting
      const greetingText = enabled
        ? "Hello! 👋 I'm Emma, your GE Energy virtual assistant. How can I help you today?\n\nEmma – GE Energy Virtual Assistant"
        : "Hello! Welcome to GE Energy support. How can we help you today?";

      await supabase.from("chat_messages").insert({
        user_id: user.id,
        sender: "support",
        message: greetingText,
        is_ai: enabled,
      });

      const { data: inserted } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (inserted) {
        setMessages(inserted.map((m: any) => ({
          id: m.id,
          text: m.message,
          sender: m.sender === "user" ? "user" : "support",
          time: new Date(m.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          status: "read",
          isAI: m.is_ai,
        })));
      }
    }

    setLoadingSettings(false);

    // Subscribe to realtime for new support replies
    const channel = supabase
      .channel(`chat-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const m = payload.new as any;
          if (m.sender === "support") {
            if (manuallyAddedIds.current.has(m.id)) {
              manuallyAddedIds.current.delete(m.id);
              return;
            }
            setMessages((prev) => {
              if (prev.find((p) => p.id === m.id)) return prev;
              return [...prev, {
                id: m.id,
                text: m.message,
                sender: "support",
                time: new Date(m.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
                status: "delivered",
                isAI: m.is_ai,
              }];
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !userId) return;
    const userText = input.trim();
    setInput("");
    setIsTyping(true);

    // Save user message to DB
    const { data: inserted } = await supabase
      .from("chat_messages")
      .insert({ user_id: userId, sender: "user", message: userText, is_ai: false })
      .select()
      .single();

    if (inserted) {
      const newMsg: Message = {
        id: inserted.id,
        text: userText,
        sender: "user",
        time: new Date(inserted.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        status: "sent",
      };
      setMessages((prev) => [...prev, newMsg]);
    }

    if (emmaEnabled) {
      try {
        const history = messages.slice(-10).map((m) => ({ sender: m.sender, text: m.text }));
        const { data } = await supabase.functions.invoke("sarah-chat", {
          body: { message: userText, history, userId },
        });

        setIsTyping(false);
        const replyText = data?.reply || "I'm sorry, an error occurred. Please try again.";

        const replyId = data?.savedReplyId || crypto.randomUUID();
        if (data?.savedReplyId) manuallyAddedIds.current.add(data.savedReplyId);
        setMessages((prev) => [
          ...prev.map((m): Message => m.id === inserted?.id ? { ...m, status: "read" } : m),
          {
            id: replyId,
            text: replyText,
            sender: "support",
            time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
            status: "delivered",
            isAI: true,
          },
        ]);
      } catch {
        setIsTyping(false);
        const errText = "An error occurred. A human agent will take over shortly. 🙏\n\nEmma – GE Energy Virtual Assistant";
        await supabase.from("chat_messages").insert({ user_id: userId, sender: "support", message: errText, is_ai: true });
      }
    } else {
      setIsTyping(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setIsTyping(true);

    let imageUrl: string;
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Impossible de lire le fichier"));
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, mimeType: file.type, fileName: file.name, bucket: "chat-images" }),
      });
      const data = await res.json();
      if (!res.ok) { setIsTyping(false); return; }
      imageUrl = data.url;
    } catch {
      setIsTyping(false);
      return;
    }

    const imgMsg = `📷 [Image sent]`;
    const { data: inserted } = await supabase
      .from("chat_messages")
      .insert({ user_id: userId, sender: "user", message: imgMsg, is_ai: false })
      .select()
      .single();

    if (inserted) {
      setMessages((prev) => [...prev, {
        id: inserted.id,
        text: "",
        image: imageUrl,
        sender: "user",
        time: new Date(inserted.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        status: "sent",
      }]);
    }

    if (emmaEnabled) {
      try {
        const history = messages.slice(-10).map((m) => ({ sender: m.sender, text: m.text }));
        const { data } = await supabase.functions.invoke("sarah-chat", {
          body: { message: "The user sent an image.", history, userId, imageUrl },
        });

        setIsTyping(false);
        const replyText = data?.reply || "I'm sorry, an error occurred. Please try again.";
        const replyId = data?.savedReplyId || crypto.randomUUID();
        if (data?.savedReplyId) manuallyAddedIds.current.add(data.savedReplyId);
        setMessages((prev) => [
          ...prev.map((m): Message => m.id === inserted?.id ? { ...m, status: "read" } : m),
          {
            id: replyId,
            text: replyText,
            sender: "support",
            time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
            status: "delivered",
            isAI: true,
          },
        ]);
      } catch {
        setIsTyping(false);
      }
    } else {
      setIsTyping(false);
    }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === "sent") return <Check size={14} className="text-muted-foreground" />;
    if (status === "delivered") return <CheckCheck size={14} className="text-muted-foreground" />;
    return <CheckCheck size={14} className="text-primary" />;
  };

  if (loadingSettings) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground text-sm">Loading...</p></div>;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-3 py-3 bg-card border-b border-secondary sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-1 rounded-full hover:bg-secondary transition-colors">
          <ArrowLeft size={22} className="text-foreground" />
        </button>
        <div className="relative">
          {emmaEnabled ? (
            <img src={emmaAvatar} alt="Emma" className="w-10 h-10 rounded-full object-cover border-2 border-primary" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-sm">
              ES
            </div>
          )}
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card bg-[#25D366]" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-foreground truncate flex items-center gap-1.5">
            {emmaEnabled ? "Emma" : "GE Energy Support"}
            {emmaEnabled && (
              <span className="inline-flex items-center gap-0.5 text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                <Bot size={10} /> AI
              </span>
            )}
          </h1>
          <p className="text-xs text-[#25D366] font-medium">
            {emmaEnabled ? "AI Assistant • Online" : "Online"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-full hover:bg-secondary transition-colors">
            <Phone size={18} className="text-muted-foreground" />
          </button>
          <button className="p-2 rounded-full hover:bg-secondary transition-colors">
            <MoreVertical size={18} className="text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Chat */}
      <div
        className="flex-1 overflow-y-auto px-3 py-4 space-y-2"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, hsl(var(--secondary) / 0.3) 0%, transparent 50%),
                            radial-gradient(circle at 80% 20%, hsl(var(--primary) / 0.05) 0%, transparent 50%)`,
        }}
      >
        <div className="flex justify-center mb-4">
          <span className="bg-card/80 backdrop-blur-sm text-muted-foreground text-[10px] px-3 py-1 rounded-full border border-secondary">
            Today
          </span>
        </div>

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
            {msg.sender === "support" && emmaEnabled && (
              <img src={emmaAvatar} alt="Emma" className="w-7 h-7 rounded-full object-cover mr-1.5 mt-1 flex-shrink-0" />
            )}
            <div className={`max-w-[75%] rounded-2xl px-3 py-2 relative ${
              msg.sender === "user"
                ? "bg-primary/20 border border-primary/30 rounded-br-md"
                : "bg-card border border-secondary rounded-bl-md"
            }`}>
              {msg.sender === "support" && msg.isAI && (
                <div className="flex items-center gap-1 mb-1">
                  <Bot size={10} className="text-primary" />
                  <span className="text-[9px] text-primary font-semibold">Emma AI</span>
                </div>
              )}
              {msg.image && (
                <div className="mb-1.5 rounded-lg overflow-hidden">
                  <img src={msg.image} alt="Image sent" className="max-w-full max-h-60 object-contain rounded-lg" />
                </div>
              )}
              {msg.text && <p className="text-sm text-foreground leading-relaxed whitespace-pre-line"><LinkedText text={msg.text} /></p>}
              <div className={`flex items-center gap-1 mt-1 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                {msg.sender === "user" && <StatusIcon status={msg.status} />}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start items-end gap-1.5">
            {emmaEnabled && <img src={emmaAvatar} alt="Emma" className="w-7 h-7 rounded-full object-cover" />}
            <div className="bg-card border border-secondary rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-card border-t border-secondary px-3 py-3 flex items-end gap-2 sticky bottom-0">
        <button className="p-2 rounded-full hover:bg-secondary transition-colors flex-shrink-0">
          <Smile size={22} className="text-muted-foreground" />
        </button>
        <div className="flex-1 bg-secondary rounded-2xl flex items-end px-3 py-2 min-h-[42px]">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Your message..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none max-h-24 leading-5"
            rows={1}
          />
          <button onClick={() => fileInputRef.current?.click()} className="p-1 rounded-full hover:bg-muted transition-colors ml-1 flex-shrink-0">
            <Paperclip size={18} className="text-muted-foreground" />
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="p-1 rounded-full hover:bg-muted transition-colors flex-shrink-0">
            <Image size={18} className="text-muted-foreground" />
          </button>
        </div>
        <button onClick={sendMessage} className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 active:scale-90" style={{ background: "var(--gradient-button)" }}>
          <Send size={18} className="text-primary-foreground ml-0.5" />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      </div>
    </div>
  );
};

export default ServiceChat;
