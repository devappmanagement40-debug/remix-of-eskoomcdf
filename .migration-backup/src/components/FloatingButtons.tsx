import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";


const FloatingButtons = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ dragging: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0, moved: false });
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [wheelIconUrl, setWheelIconUrl] = useState("");
  const [supportIconUrl, setSupportIconUrl] = useState("");

  useEffect(() => {
    supabase.from("site_settings").select("key, value").in("key", ["wheel_icon_url", "support_icon_url"]).then(({ data }) => {
      (data || []).forEach((s: any) => {
        if (s.key === "wheel_icon_url" && s.value) setWheelIconUrl(s.value);
        if (s.key === "support_icon_url" && s.value) setSupportIconUrl(s.value);
      });
    });
  }, []);

  const getClientPos = (e: React.TouchEvent | React.MouseEvent) => {
    if ("touches" in e) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  };

  const onStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const { x, y } = getClientPos(e);
    dragState.current = { dragging: true, startX: x - pos.x, startY: y - pos.y, offsetX: pos.x, offsetY: pos.y, moved: false };
  }, [pos]);

  const onMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!dragState.current.dragging) return;
    const { x, y } = getClientPos(e);
    const dx = x - dragState.current.startX;
    const dy = y - dragState.current.startY;
    if (Math.abs(dx - dragState.current.offsetX) > 3 || Math.abs(dy - dragState.current.offsetY) > 3) {
      dragState.current.moved = true;
    }
    setPos({ x: dx, y: dy });
  }, []);

  const onEnd = useCallback(() => {
    dragState.current.dragging = false;
  }, []);

  const handleClick = (action: () => void) => {
    if (!dragState.current.moved) action();
    dragState.current.moved = false;
  };

  const defaultWheelIcon = (
    <svg viewBox="0 0 40 40" className="w-6 h-6 drop-shadow-md" fill="none">
      <circle cx="20" cy="20" r="16" stroke="white" strokeWidth="2.5" opacity="0.9" />
      <circle cx="20" cy="20" r="4" fill="white" opacity="0.9" />
      {[0, 45, 90, 135].map((a) => (
        <line key={a} x1="20" y1="20" x2={20 + 16 * Math.cos((a * Math.PI) / 180)} y2={20 + 16 * Math.sin((a * Math.PI) / 180)} stroke="white" strokeWidth="1.5" opacity="0.7" />
      ))}
      <polygon points="20,2 22,7 18,7" fill="hsl(45, 100%, 70%)" />
    </svg>
  );

  const defaultSupportIcon = (
    <svg viewBox="0 0 24 24" className="w-5 h-5 drop-shadow-md" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  );

  return (
    <div
      ref={containerRef}
      className="fixed bottom-24 right-4 z-50 flex flex-col gap-5 touch-none select-none"
      style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
      onMouseDown={onStart}
      onMouseMove={onMove}
      onMouseUp={onEnd}
      onMouseLeave={onEnd}
      onTouchStart={onStart}
      onTouchMove={onMove}
      onTouchEnd={onEnd}
    >
      {/* Fortune Wheel */}
      <button
        onClick={() => handleClick(() => navigate("/loterie"))}
        className="group w-[50px] h-[50px] rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 overflow-hidden"
        style={{
          background: wheelIconUrl ? "transparent" : "linear-gradient(135deg, hsl(35 90% 55%), hsl(25 95% 45%))",
          boxShadow: "0 4px 20px hsla(35, 90%, 50%, 0.4)",
        }}
        aria-label="Loterie"
      >
        {wheelIconUrl ? <img src={wheelIconUrl} alt="Roue" className="w-full h-full object-contain rounded-full p-1" /> : defaultWheelIcon}
      </button>

      {/* Customer Support */}
      <button
        onClick={() => handleClick(() => navigate("/service-chat"))}
        className="group w-[50px] h-[50px] rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 overflow-hidden"
        style={{
          background: supportIconUrl ? "transparent" : "linear-gradient(135deg, hsl(210 80% 55%), hsl(230 70% 50%))",
          boxShadow: "0 4px 20px hsla(220, 80%, 50%, 0.4)",
        }}
        aria-label="Support"
      >
        {supportIconUrl ? <img src={supportIconUrl} alt="Support" className="w-full h-full object-contain rounded-full p-1" /> : defaultSupportIcon}
      </button>
    </div>
  );
};

export default FloatingButtons;
