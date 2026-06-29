const { createClient } = require("@supabase/supabase-js");

let supabaseClient = null;
function getSupabaseClient() {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) {
      throw new Error("SUPABASE_URL o SUPABASE_SECRET_KEY no están configuradas en las variables de entorno de Netlify.");
    }
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

function sessionRowToClient(row) {
  return {
    id: row.id,
    title: row.title,
    partnerA: row.partner_a,
    partnerB: row.partner_b,
    mainObjective: row.main_objective,
    conflictLevel: row.conflict_level,
    messages: row.messages || [],
    timestamp: new Date(row.updated_at || row.created_at).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    })
  };
}

exports.handler = async (event) => {
  try {
    const supabase = getSupabaseClient();
    const id = event.queryStringParameters && event.queryStringParameters.id;

    if (event.httpMethod === "GET") {
      const { data, error } = await supabase
        .from("therapy_sessions")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify((data || []).map(sessionRowToClient)) };
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const { data, error } = await supabase
        .from("therapy_sessions")
        .insert([{
          title: body.title,
          partner_a: body.partnerA,
          partner_b: body.partnerB,
          main_objective: body.mainObjective,
          conflict_level: body.conflictLevel,
          messages: body.messages || []
        }])
        .select()
        .single();
      if (error) throw error;
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(sessionRowToClient(data)) };
    }

    if (event.httpMethod === "PUT") {
      if (!id) {
        return { statusCode: 400, body: JSON.stringify({ error: "Falta el id de la sesión." }) };
      }
      const body = JSON.parse(event.body || "{}");
      const updatePayload = { updated_at: new Date().toISOString() };
      if (body.title !== undefined) updatePayload.title = body.title;
      if (body.partnerA !== undefined) updatePayload.partner_a = body.partnerA;
      if (body.partnerB !== undefined) updatePayload.partner_b = body.partnerB;
      if (body.mainObjective !== undefined) updatePayload.main_objective = body.mainObjective;
      if (body.conflictLevel !== undefined) updatePayload.conflict_level = body.conflictLevel;
      if (body.messages !== undefined) updatePayload.messages = body.messages;

      const { data, error } = await supabase
        .from("therapy_sessions")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(sessionRowToClient(data)) };
    }

    if (event.httpMethod === "DELETE") {
      if (!id) {
        return { statusCode: 400, body: JSON.stringify({ error: "Falta el id de la sesión." }) };
      }
      const { error } = await supabase.from("therapy_sessions").delete().eq("id", id);
      if (error) throw error;
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 405, body: JSON.stringify({ error: "Método no permitido." }) };
  } catch (error) {
    console.error("Error in sessions function:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message || "Ocurrió un error inesperado." })
    };
  }
};
