import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const adminUserId = "258a9744-0f68-4351-87e3-ccc3396ca3c1";
    const { page = 1 } = await req.json().catch(() => ({ page: 1 }));
    const perPage = 50;

    // List auth users
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    let deleted = 0;
    for (const user of users || []) {
      if (user.id === adminUserId) continue;
      const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
      if (!delErr) deleted++;
      else console.error(`Failed ${user.id}: ${delErr.message}`);
    }

    const hasMore = (users || []).length === perPage;

    return new Response(JSON.stringify({ success: true, deleted, hasMore, page }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
