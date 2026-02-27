import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { Pencil, Save, X, Plus, Trash2 } from "lucide-react";

type Tab = { label: string; content: string };

type PopupMsg = {
  id: string;
  trigger_key: string;
  title: string;
  message: string;
  button_confirm: string;
  button_cancel: string | null;
  tabs: Tab[] | null;
  is_active: boolean;
};

const AdminPopups = () => {
  const [messages, setMessages] = useState<PopupMsg[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<PopupMsg>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("popup_messages").select("*").order("sort_order");
    if (data) setMessages(data as unknown as PopupMsg[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startEdit = (msg: PopupMsg) => {
    setEditing(msg.id);
    setForm({ ...msg });
  };

  const cancelEdit = () => { setEditing(null); setForm({}); };

  const saveEdit = async () => {
    if (!editing) return;
    const { error } = await supabase.from("popup_messages").update({
      title: form.title,
      message: form.message,
      button_confirm: form.button_confirm,
      button_cancel: form.button_cancel || null,
      tabs: form.tabs as any,
      is_active: form.is_active,
    }).eq("id", editing);

    if (error) toast.error("Erreur lors de la sauvegarde");
    else { toast.success("Message mis à jour ✅"); cancelEdit(); load(); }
  };

  const toggleActive = async (msg: PopupMsg) => {
    await supabase.from("popup_messages").update({ is_active: !msg.is_active }).eq("id", msg.id);
    load();
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Chargement...</p></div>;

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title="Admin — Messages Popup" showBack />
      <div className="px-4 pt-6 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className="bg-card rounded-xl border border-secondary p-4 space-y-3">
            {editing === msg.id ? (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Clé</label>
                    <p className="text-xs font-mono text-primary">{msg.trigger_key}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Titre</label>
                    <input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="w-full bg-secondary text-foreground rounded-lg px-3 py-2 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Message</label>
                    <textarea value={form.message || ""} onChange={(e) => setForm({ ...form, message: e.target.value })}
                      rows={3} className="w-full bg-secondary text-foreground rounded-lg px-3 py-2 text-sm outline-none resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Bouton Confirmer</label>
                      <input value={form.button_confirm || ""} onChange={(e) => setForm({ ...form, button_confirm: e.target.value })}
                        className="w-full bg-secondary text-foreground rounded-lg px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Bouton Annuler (vide = aucun)</label>
                      <input value={form.button_cancel || ""} onChange={(e) => setForm({ ...form, button_cancel: e.target.value })}
                        className="w-full bg-secondary text-foreground rounded-lg px-3 py-2 text-sm outline-none" />
                    </div>
                  </div>

                  {/* Tabs editor */}
                  {form.tabs && Array.isArray(form.tabs) && (
                    <div>
                      <label className="text-xs text-muted-foreground block mb-2">Onglets</label>
                      {form.tabs.map((tab, i) => (
                        <div key={i} className="bg-secondary/50 rounded-lg p-3 mb-2 space-y-2">
                          <input value={tab.label} onChange={(e) => {
                            const newTabs = [...form.tabs!];
                            newTabs[i] = { ...newTabs[i], label: e.target.value };
                            setForm({ ...form, tabs: newTabs });
                          }} placeholder="Nom de l'onglet"
                            className="w-full bg-secondary text-foreground rounded-lg px-3 py-2 text-sm outline-none" />
                          <textarea value={tab.content} onChange={(e) => {
                            const newTabs = [...form.tabs!];
                            newTabs[i] = { ...newTabs[i], content: e.target.value };
                            setForm({ ...form, tabs: newTabs });
                          }} rows={2} placeholder="Contenu"
                            className="w-full bg-secondary text-foreground rounded-lg px-3 py-2 text-sm outline-none resize-none" />
                          <button onClick={() => {
                            const newTabs = form.tabs!.filter((_, idx) => idx !== i);
                            setForm({ ...form, tabs: newTabs });
                          }} className="text-destructive text-xs flex items-center gap-1">
                            <Trash2 size={12} /> Supprimer
                          </button>
                        </div>
                      ))}
                      <button onClick={() => setForm({ ...form, tabs: [...(form.tabs || []), { label: "Nouveau", content: "" }] })}
                        className="text-primary text-xs flex items-center gap-1 mt-1">
                        <Plus size={12} /> Ajouter un onglet
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={form.is_active ?? true} onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      className="accent-primary" />
                    <span className="text-xs text-foreground">Actif</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={saveEdit} className="flex-1 gradient-button text-primary-foreground text-sm font-bold py-2.5 rounded-xl flex items-center justify-center gap-2">
                    <Save size={14} /> Sauvegarder
                  </button>
                  <button onClick={cancelEdit} className="flex-1 bg-secondary text-foreground text-sm font-bold py-2.5 rounded-xl flex items-center justify-center gap-2">
                    <X size={14} /> Annuler
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-mono text-primary mb-1">{msg.trigger_key}</p>
                    <p className="text-sm font-bold text-foreground">{msg.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{msg.message}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleActive(msg)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${msg.is_active ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
                      {msg.is_active ? "ON" : "OFF"}
                    </button>
                    <button onClick={() => startEdit(msg)} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                      <Pencil size={14} className="text-muted-foreground" />
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span className="bg-secondary px-2 py-1 rounded">{msg.button_confirm}</span>
                  {msg.button_cancel && <span className="bg-secondary px-2 py-1 rounded">{msg.button_cancel}</span>}
                  {msg.tabs && Array.isArray(msg.tabs) && msg.tabs.length > 0 && (
                    <span className="bg-secondary px-2 py-1 rounded">{msg.tabs.length} onglets</span>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPopups;
