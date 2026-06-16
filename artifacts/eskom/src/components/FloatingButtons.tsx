import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const DEFAULT_WHEEL_ICON = "/icons/wheel-floating.png";
const DEFAULT_SUPPORT_ICON = "/icons/support-floating.png";

const FloatingButtons = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ dragging: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0, moved: false });
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [wheelIconUrl, setWheelIconUrl] = useState(DEFAULT_WHEEL_ICON);
  const [supportIconUrl, setSupportIconUrl] = useState(DEFAULT_SUPPORT_ICON);
  const [supportLink, setSupportLink] = useState("");

  useEffect(() => {
    fetch("/api/site-settings").then(r => r.ok ? r.json() : []).then((data: any[]) => {
      const list = Array.isArray(data) ? data : [];
      list.forEach((s: any) => {
        if (s.key === "wheel_icon_url" && s.value) setWheelIconUrl(s.value);
        if (s.key === "support_icon_url" && s.value) setSupportIconUrl(s.value);
      });
      const telegram = list.find((s: any) => s.key === "official_telegram_link")?.value;
      const whatsapp = list.find((s: any) => s.key === "official_whatsapp_link")?.value;
      setSupportLink(telegram || whatsapp || "");
    }).catch(() => {});
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

  return (
    <div
      ref={containerRef}
      className="fixed bottom-24 right-4 z-50 flex flex-col gap-3 touch-none select-none"
      style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
      onMouseDown={onStart}
      onMouseMove={onMove}
      onMouseUp={onEnd}
      onMouseLeave={onEnd}
      onTouchStart={onStart}
      onTouchMove={onMove}
      onTouchEnd={onEnd}
    >
      {/* Bouton Roue */}
      <button
        onClick={() => handleClick(() => navigate("/loterie"))}
        className="group w-[56px] h-[56px] rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
        style={{
          background: "transparent",
          filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.35))",
        }}
        aria-label="Loterie"
      >
        <img
          src={wheelIconUrl}
          alt="Roue"
          className="w-full h-full object-contain rounded-full"
          style={{ filter: "drop-shadow(0 2px 8px rgba(218,165,32,0.5))" }}
        />
      </button>

      {/* Bouton Service Client */}
      <button
        onClick={() => handleClick(() => {
          if (supportLink) window.open(supportLink, "_blank", "noopener,noreferrer");
          else navigate("/service-chat");
        })}
        className="group w-[56px] h-[56px] rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
        style={{
          background: "transparent",
          filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.35))",
        }}
        aria-label="Support"
      >
        <img
          src={supportIconUrl}
          alt="Support"
          className="w-full h-full object-contain rounded-full"
          style={{ filter: "drop-shadow(0 2px 8px rgba(34,197,94,0.4))" }}
        />
      </button>
    </div>
  );
};

export default FloatingButtons;
