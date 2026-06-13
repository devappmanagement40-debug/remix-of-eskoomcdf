import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Plus, Trash2, Shield, UserCheck, X, Loader2, CheckCircle2 } from "lucide-react";

const PERMISSIONS = [
  { key: "manage_deposits", label: "Gérer les dépôts", desc: "Valider/rejeter les recharges" },
  { key: "manage_withdrawals", label: "Gérer les retraits", desc: "Valider/rejeter les retraits" },
  { key: "manage_users", label: "Gérer les utilisateurs", desc: "Modifier profils et soldes" },
  { key: "manage_products", label: "Gérer les produits", desc: "Ajouter/modifier les produits" },
];

type SubAdmin = {
  user_id: string;
  phone: string | null;
  full_name: string | null;
  permissions: string[];
};

export const AdminTeamTab = ({
  showSuccess,
  showError,
  logAction,
  adminId,
}: {
  showSuccess: (t: string, m: string) => void;
  showError: (t: string, m: string) => void;
  logAction: (a: string, tt?: string, ti?: string, d?: string) => Promise<void>;
  adminId: string;
}) => {
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchPhone, setSearchPhone] = useState("");
  const [searchResult, setSearchResult] = useState<{ user_id: string; phone: string; full_name: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSubAdmins();
  }, []);

  const loadSubAdmins = async () => {
    setLoading(true);
    try {
      // Get all moderator roles
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "moderator");

      if (!roles || roles.length === 0) {
        setSubAdmins([]);
        setLoading(false);
        return;
      }

      const userIds = roles.map((r) => r.user_id);

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, phone, full_name")
        .in("user_id", userIds);

      // Get permissions
      const { data: perms } = await supabase
        .from("admin_permissions")
        .select("user_id, permission")
        .in("user_id", userIds);

      const result: SubAdmin[] = userIds.map((uid) => {
        const profile = profiles?.find((p) => p.user_id === uid);
        const userPerms = (perms || []).filter((p) => p.user_id === uid).map((p) => p.permission);
        return {
          user_id: uid,
          phone: profile?.phone || null,
          full_name: profile?.full_name || null,
          permissions: userPerms,
        };
      });

      setSubAdmins(result);
    } catch (err) {
      console.error("Load sub-admins error:", err);
    } finally {
      setLoading(false);
    }
  };

  const searchUser = async () => {
    if (!searchPhone.trim()) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, phone, full_name")
        .eq("phone", searchPhone.trim())
        .maybeSingle();

      if (!data) {
        showError("Not found", "No user found with this number");
        setSearching(false);
        return;
      }

      // Check if already admin or moderator
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user_id)
        .maybeSingle();

      if (existingRole?.role === "admin") {
        showError("Impossible", "Cet utilisateur est déjà Super Admin");
        setSearching(false);
        return;
      }

      if (existingRole?.role === "moderator") {
        showError("Existe déjà", "Cet utilisateur est déjà administrateur adjoint");
        setSearching(false);
        return;
      }

      setSearchResult({ user_id: data.user_id, phone: data.phone || "", full_name: data.full_name || "" });
    } catch (err) {
      showError("Error", "Search error");
    } finally {
      setSearching(false);
    }
  };

  const addSubAdmin = async () => {
    if (!searchResult || selectedPerms.length === 0) {
      showError("Permissions requises", "Sélectionnez au moins une permission");
      return;
    }
    setSaving(true);
    try {
      // Insert moderator role
      const { error: roleErr } = await supabase
        .from("user_roles")
        .insert({ user_id: searchResult.user_id, role: "moderator" as any });

      if (roleErr) throw roleErr;

      // Insert permissions
      const permRows = selectedPerms.map((p) => ({
        user_id: searchResult.user_id,
        permission: p,
        granted_by: adminId,
      }));

      const { error: permErr } = await supabase.from("admin_permissions").insert(permRows);
      if (permErr) throw permErr;

      await logAction("add_sub_admin", "user", searchResult.user_id, `Permissions: ${selectedPerms.join(", ")}`);
      showSuccess("Succès", `${searchResult.full_name || searchResult.phone} est maintenant administrateur adjoint`);
      setShowAddForm(false);
      setSearchPhone("");
      setSearchResult(null);
      setSelectedPerms([]);
      await loadSubAdmins();
    } catch (err: any) {
      showError("Error", err.message || "Unable to add administrator");
    } finally {
      setSaving(false);
    }
  };

  const removeSubAdmin = async (userId: string) => {
    try {
      // Remove permissions
      await supabase.from("admin_permissions").delete().eq("user_id", userId);
      // Remove moderator role
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "moderator" as any);

      await logAction("remove_sub_admin", "user", userId);
      showSuccess("Supprimé", "Administrateur adjoint retiré");
      await loadSubAdmins();
    } catch (err) {
      showError("Error", "Unable to delete");
    }
  };

  const togglePermission = async (userId: string, permission: string, hasIt: boolean) => {
    try {
      if (hasIt) {
        await supabase.from("admin_permissions").delete().eq("user_id", userId).eq("permission", permission);
      } else {
        await supabase.from("admin_permissions").insert({ user_id: userId, permission, granted_by: adminId });
      }
      await logAction("toggle_permission", "user", userId, `${permission}: ${hasIt ? "retiré" : "ajouté"}`);
      await loadSubAdmins();
    } catch (err) {
      showError("Error", "Unable to change permission");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Shield size={18} className="text-primary" /> Équipe Admin
        </h2>
        <button
          onClick={() => { setShowAddForm(!showAddForm); setSearchResult(null); setSearchPhone(""); setSelectedPerms([]); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold gradient-button text-primary-foreground"
        >
          {showAddForm ? <X size={14} /> : <Plus size={14} />}
          {showAddForm ? "Cancel" : "Add"}
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-card rounded-xl border border-primary/30 p-4 space-y-4">
          <h3 className="text-sm font-bold text-foreground">Add a deputy administrator</h3>

          {/* Search by phone */}
          <div className="flex gap-2">
            <input
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              placeholder="Numéro de téléphone"
              className="flex-1 bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border border-secondary outline-none"
              onKeyDown={(e) => e.key === "Enter" && searchUser()}
            />
            <button
              onClick={searchUser}
              disabled={searching}
              className="px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm"
            >
              {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            </button>
          </div>

          {/* Search result */}
          {searchResult && (
            <div className="bg-success/10 border border-success/30 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <UserCheck size={16} className="text-success" />
                <div>
                  <p className="text-sm font-bold text-foreground">{searchResult.full_name || "Sans nom"}</p>
                  <p className="text-xs text-muted-foreground">{searchResult.phone}</p>
                </div>
              </div>
            </div>
          )}

          {/* Permissions selection */}
          {searchResult && (
            <>
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase">Autorisations</p>
                {PERMISSIONS.map((p) => {
                  const checked = selectedPerms.includes(p.key);
                  return (
                    <button
                      key={p.key}
                      onClick={() =>
                        setSelectedPerms((prev) =>
                          checked ? prev.filter((x) => x !== p.key) : [...prev, p.key]
                        )
                      }
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                        checked ? "border-primary bg-primary/10" : "border-secondary bg-secondary/30"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center ${
                          checked ? "bg-primary" : "bg-secondary border border-muted-foreground/30"
                        }`}
                      >
                        {checked && <CheckCircle2 size={12} className="text-primary-foreground" />}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-foreground">{p.label}</p>
                        <p className="text-[10px] text-muted-foreground">{p.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={addSubAdmin}
                disabled={saving || selectedPerms.length === 0}
                className="w-full gradient-button text-primary-foreground font-bold py-3 rounded-xl text-sm disabled:opacity-50"
              >
                {saving ? "Ajout en cours..." : "Confirmer l'ajout"}
              </button>
            </>
          )}
        </div>
      )}

      {/* Sub-admins list */}
      {subAdmins.length === 0 && !showAddForm ? (
        <div className="text-center py-16">
          <Shield size={40} className="text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No deputy administrators</p>
          <p className="text-xs text-muted-foreground mt-1">Ajoutez des membres à votre équipe d'administration</p>
        </div>
      ) : (
        subAdmins.map((sa) => (
          <div key={sa.user_id} className="bg-card rounded-xl border border-secondary overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">{sa.full_name || "Sans nom"}</p>
                <p className="text-xs text-muted-foreground">{sa.phone || "—"}</p>
              </div>
              <button
                onClick={() => removeSubAdmin(sa.user_id)}
                className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center"
              >
                <Trash2 size={14} className="text-destructive" />
              </button>
            </div>
            <div className="px-4 pb-3 space-y-1.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Autorisations</p>
              {PERMISSIONS.map((p) => {
                const hasIt = sa.permissions.includes(p.key);
                return (
                  <button
                    key={p.key}
                    onClick={() => togglePermission(sa.user_id, p.key, hasIt)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                      hasIt ? "bg-primary/10 border border-primary/30" : "bg-secondary/30 border border-transparent"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center ${
                        hasIt ? "bg-primary" : "bg-secondary border border-muted-foreground/30"
                      }`}
                    >
                      {hasIt && <CheckCircle2 size={10} className="text-primary-foreground" />}
                    </div>
                    <span className={`text-xs font-medium ${hasIt ? "text-foreground" : "text-muted-foreground"}`}>
                      {p.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default AdminTeamTab;
