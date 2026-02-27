import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Image, Paperclip, Smile, Check, CheckCheck, MoreVertical, Phone, Video, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import sarahAvatar from "@/assets/sarah-avatar.jpg";

interface Message {
  id: number;
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
  const [sarahEnabled, setSarahEnabled] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkSarahStatus();
  }, []);

  const checkSarahStatus = async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "sarah_enabled")
      .single();
    const enabled = data?.value === "true";
    setSarahEnabled(enabled);
    setLoadingSettings(false);

    // Initial greeting
    const greeting: Message = {
      id: 1,
      text: enabled
        ? "Bonjour ! 👋 Je suis Sarah, votre assistante virtuelle ESKOM. Comment puis-je vous aider aujourd'hui ?\n\nSarah – Assistante virtuelle ESKOM"
        : "Bonjour ! Bienvenue sur le support ESKOM. Comment pouvons-nous vous aider aujourd'hui ?",
      sender: "support",
      time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      status: "read",
      isAI: enabled,
    };
    setMessages([greeting]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userText = input.trim();
    const newMsg: Message = {
      id: Date.now(),
      text: userText,
      sender: "user",
      time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      status: "sent",
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setIsTyping(true);

    if (sarahEnabled) {
      try {
        // Build history from last messages (keep last 10 for context)
        const history = messages.slice(-10).map((m) => ({
          sender: m.sender,
          text: m.text,
        }));

        const { data, error } = await supabase.functions.invoke("sarah-chat", {
          body: { message: userText, history },
        });

        setIsTyping(false);
        const replyText = data?.reply || "Je suis désolée, une erreur est survenue. Veuillez réessayer.";
        const reply: Message = {
          id: Date.now() + 1,
          text: replyText,
          sender: "support",
          time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
          status: "delivered",
          isAI: true,
        };
        setMessages((prev) =>
          prev.map((m): Message => (m.id === newMsg.id ? { ...m, status: "read" } : m)).concat(reply)
        );
      } catch (err) {
        setIsTyping(false);
        const reply: Message = {
          id: Date.now() + 1,
          text: "Une erreur est survenue. Un agent humain prendra le relais bientôt. 🙏\n\nSarah – Assistante virtuelle ESKOM",
          sender: "support",
          time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
          status: "delivered",
          isAI: true,
        };
        setMessages((prev) => prev.concat(reply));
      }
    } else {
      // Simulated human response
      setTimeout(() => {
        setIsTyping(false);
        const reply: Message = {
          id: Date.now() + 1,
          text: "Merci pour votre message ! Un agent va vous répondre sous peu. En attendant, n'hésitez pas à consulter notre FAQ dans la section Aide. 🙏",
          sender: "support",
          time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
          status: "delivered",
        };
        setMessages((prev) =>
          prev.map((m): Message => (m.id === newMsg.id ? { ...m, status: "read" } : m)).concat(reply)
        );
      }, 2000);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const newMsg: Message = {
        id: Date.now(),
        text: "",
        image: reader.result as string,
        sender: "user",
        time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        status: "sent",
      };
      setMessages((prev) => [...prev, newMsg]);

      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) =>
          prev
            .map((m): Message => (m.id === newMsg.id ? { ...m, status: "read" } : m))
            .concat({
              id: Date.now() + 1,
              text: sarahEnabled
                ? "J'ai bien reçu votre image. Je vais l'examiner. Si besoin, je transmettrai à un agent humain pour un suivi personnalisé. 📷\n\nSarah – Assistante virtuelle ESKOM"
                : "Nous avons bien reçu votre image. Un agent l'examine maintenant. 📷",
              sender: "support",
              time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
              status: "delivered",
              isAI: sarahEnabled,
            })
        );
      }, 2500);
    };
    reader.readAsDataURL(file);
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === "sent") return <Check size={14} className="text-muted-foreground" />;
    if (status === "delivered") return <CheckCheck size={14} className="text-muted-foreground" />;
    return <CheckCheck size={14} className="text-primary" />;
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-3 py-3 bg-card border-b border-secondary sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-1 rounded-full hover:bg-secondary transition-colors">
          <ArrowLeft size={22} className="text-foreground" />
        </button>
        <div className="relative">
          {sarahEnabled ? (
            <img src={sarahAvatar} alt="Sarah" className="w-10 h-10 rounded-full object-cover border-2 border-primary" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-sm">
              ES
            </div>
          )}
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card bg-[#25D366]" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-foreground truncate flex items-center gap-1.5">
            {sarahEnabled ? "Sarah" : "ESKOM Support"}
            {sarahEnabled && (
              <span className="inline-flex items-center gap-0.5 text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                <Bot size={10} /> IA
              </span>
            )}
          </h1>
          <p className="text-xs text-[#25D366] font-medium">
            {sarahEnabled ? "Assistante IA • En ligne" : "En ligne"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-full hover:bg-secondary transition-colors">
            <Phone size={18} className="text-muted-foreground" />
          </button>
          <button className="p-2 rounded-full hover:bg-secondary transition-colors">
            <Video size={18} className="text-muted-foreground" />
          </button>
          <button className="p-2 rounded-full hover:bg-secondary transition-colors">
            <MoreVertical size={18} className="text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Chat Background */}
      <div
        className="flex-1 overflow-y-auto px-3 py-4 space-y-2"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, hsl(var(--secondary) / 0.3) 0%, transparent 50%),
                            radial-gradient(circle at 80% 20%, hsl(var(--primary) / 0.05) 0%, transparent 50%)`,
        }}
      >
        {/* Date separator */}
        <div className="flex justify-center mb-4">
          <span className="bg-card/80 backdrop-blur-sm text-muted-foreground text-[10px] px-3 py-1 rounded-full border border-secondary">
            Aujourd'hui
          </span>
        </div>

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.sender === "support" && sarahEnabled && (
              <img src={sarahAvatar} alt="Sarah" className="w-7 h-7 rounded-full object-cover mr-1.5 mt-1 flex-shrink-0" />
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-3 py-2 relative ${
                msg.sender === "user"
                  ? "bg-primary/20 border border-primary/30 rounded-br-md"
                  : "bg-card border border-secondary rounded-bl-md"
              }`}
            >
              {msg.sender === "support" && msg.isAI && (
                <div className="flex items-center gap-1 mb-1">
                  <Bot size={10} className="text-primary" />
                  <span className="text-[9px] text-primary font-semibold">Sarah IA</span>
                </div>
              )}
              {msg.image && (
                <div className="mb-1.5 rounded-lg overflow-hidden">
                  <img src={msg.image} alt="Image envoyée" className="max-w-full max-h-60 object-contain rounded-lg" />
                </div>
              )}
              {msg.text && (
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{msg.text}</p>
              )}
              <div className={`flex items-center gap-1 mt-1 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                {msg.sender === "user" && <StatusIcon status={msg.status} />}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start items-end gap-1.5">
            {sarahEnabled && <img src={sarahAvatar} alt="Sarah" className="w-7 h-7 rounded-full object-cover" />}
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

      {/* Input Bar */}
      <div className="bg-card border-t border-secondary px-3 py-3 flex items-end gap-2 sticky bottom-0">
        <button className="p-2 rounded-full hover:bg-secondary transition-colors flex-shrink-0">
          <Smile size={22} className="text-muted-foreground" />
        </button>
        <div className="flex-1 bg-secondary rounded-2xl flex items-end px-3 py-2 min-h-[42px]">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Votre message..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none max-h-24 leading-5"
            rows={1}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1 rounded-full hover:bg-muted transition-colors ml-1 flex-shrink-0"
          >
            <Paperclip size={18} className="text-muted-foreground" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1 rounded-full hover:bg-muted transition-colors flex-shrink-0"
          >
            <Image size={18} className="text-muted-foreground" />
          </button>
        </div>
        <button
          onClick={sendMessage}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 active:scale-90"
          style={{ background: "var(--gradient-button)" }}
        >
          <Send size={18} className="text-primary-foreground ml-0.5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>
    </div>
  );
};

export default ServiceChat;
