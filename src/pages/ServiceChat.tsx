import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Image, Paperclip, Smile, Check, CheckCheck, MoreVertical, Phone, Video } from "lucide-react";

interface Message {
  id: number;
  text: string;
  image?: string;
  sender: "user" | "support";
  time: string;
  status: "sent" | "delivered" | "read";
}

const initialMessages: Message[] = [
  {
    id: 1,
    text: "Bonjour ! Bienvenue sur le support ESKOM. Comment pouvons-nous vous aider aujourd'hui ?",
    sender: "support",
    time: "09:00",
    status: "read",
  },
  {
    id: 2,
    text: "Bonjour, j'ai une question concernant mon investissement TC 1000.",
    sender: "user",
    time: "09:02",
    status: "read",
  },
  {
    id: 3,
    text: "Bien sûr ! Je suis là pour vous aider. Quelle est votre question concernant le TC 1000 ?",
    sender: "support",
    time: "09:03",
    status: "read",
  },
  {
    id: 4,
    text: "Je voudrais savoir quand je recevrai mon prochain rendement.",
    sender: "user",
    time: "09:05",
    status: "read",
  },
  {
    id: 5,
    text: "Votre prochain rendement sera crédité demain à 00h00 UTC. Vous recevrez 500,00 FCFA sur votre portefeuille. 💰",
    sender: "support",
    time: "09:06",
    status: "read",
  },
];

const ServiceChat = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMsg: Message = {
      id: Date.now(),
      text: input,
      sender: "user",
      time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      status: "sent",
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");

    // Simulate support typing
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const reply: Message = {
        id: Date.now() + 1,
        text: "Merci pour votre message ! Un agent va vous répondre sous peu. En attendant, n'hésitez pas à consulter notre FAQ dans la section Aide. 🙏",
        sender: "support",
        time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        status: "delivered" as const,
      };
      setMessages((prev) =>
        prev.map((m): Message => (m.id === newMsg.id ? { ...m, status: "read" as const } : m)).concat(reply)
      );
    }, 2000);
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
            .map((m): Message => (m.id === newMsg.id ? { ...m, status: "read" as const } : m))
            .concat({
              id: Date.now() + 1,
              text: "Nous avons bien reçu votre image. Un agent l'examine maintenant. 📷",
              sender: "support" as const,
              time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
              status: "delivered" as const,
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
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-sm">
            ES
          </div>
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card" style={{ background: "hsl(var(--success))" }} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-foreground truncate">ESKOM Support</h1>
          <p className="text-xs" style={{ color: "hsl(var(--success))" }}>En ligne</p>
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

      {/* Chat Background Pattern */}
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
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 relative ${
                msg.sender === "user"
                  ? "bg-primary/20 border border-primary/30 rounded-br-md"
                  : "bg-card border border-secondary rounded-bl-md"
              }`}
            >
              {msg.image && (
                <div className="mb-1.5 rounded-lg overflow-hidden">
                  <img src={msg.image} alt="Image envoyée" className="max-w-full max-h-60 object-contain rounded-lg" />
                </div>
              )}
              {msg.text && (
                <p className="text-sm text-foreground leading-relaxed">{msg.text}</p>
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
          <div className="flex justify-start">
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
