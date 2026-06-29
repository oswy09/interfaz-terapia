import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

app.use(express.json());

// Lazy-loaded Supabase client (server-side only, uses secret key which bypasses RLS)
let supabaseClient: ReturnType<typeof createClient> | null = null;
function getSupabaseClient() {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) {
      throw new Error("SUPABASE_URL o SUPABASE_SECRET_KEY no están configuradas.");
    }
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

function sessionRowToClient(row: any) {
  return {
    id: row.id,
    title: row.title,
    partnerA: row.partner_a,
    partnerB: row.partner_b,
    mainObjective: row.main_objective,
    conflictLevel: row.conflict_level,
    messages: row.messages || [],
    timestamp: new Date(row.updated_at || row.created_at).toLocaleDateString("es-ES", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
    })
  };
}

// Lazy-loaded Gemini client to prevent crashes if key is initially empty
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("La clave GEMINI_API_KEY no está configurada. Por favor, añádela en la sección de Secretos de AI Studio.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// 4-Part Custom Therapy AI response schema (Simplified for rapid generation and minimal latency)
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    evaluacionSalud: {
      type: Type.OBJECT,
      properties: {
        indicador: {
          type: Type.STRING,
          enum: ["SANO", "ALERTA", "NO SANO"],
          description: "Nivel de salud de esta interacción relacional: SANO (dinámica constructiva), ALERTA (fricción o desconexión moderada), o NO SANO (control, asimetría de poder, abuso de autoridad, violencia o transgresión grave)."
        },
        justificacion: {
          type: Type.STRING,
          description: "Breve frase justificando por qué cae en esta categoría."
        }
      },
      required: ["indicador", "justificacion"]
    },
    categorizacion: {
      type: Type.OBJECT,
      properties: {
        terminosClinicos: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Etiquetas breves, directas y legibles del problema (ej: Abuso de autoridad, Retirada emocional, Desconexión, Falta de límites)."
        },
        explicacion: {
          type: Type.STRING,
          description: "Explicación directa, sumamente breve y en lenguaje humano (máximo 2 oraciones) de lo que está ocurriendo, sin divagaciones académicas."
        }
      },
      required: ["terminosClinicos", "explicacion"]
    },
    analisisRoles: {
      type: Type.OBJECT,
      properties: {
        ejecutor: {
          type: Type.STRING,
          description: "Frase descriptiva muy corta del rol activo y su psicología inmediata (máximo 20 palabras)."
        },
        receptor: {
          type: Type.STRING,
          description: "Frase descriptiva muy corta de lo que experimenta el rol receptor o reactivo (máximo 20 palabras)."
        }
      },
      required: ["ejecutor", "receptor"]
    },
    recomendacionesClinicas: {
      type: Type.OBJECT,
      properties: {
        limitesSaludables: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Límites concretos y sencillos que se deben instaurar. Máximo 2 ó 3."
        },
        pasosASeguir: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Propuestas de acción inmediatas y prácticas. Máximo 2 ó 3."
        },
        explicacionProfunda: {
          type: Type.STRING,
          description: "Carta final o reflexión de cierre sumamente concisa, humana y asertiva que englobe la consejería (máximo 3 oraciones)."
        }
      },
      required: ["limitesSaludables", "pasosASeguir", "explicacionProfunda"]
    },
    conexionAnterior: {
      type: Type.STRING,
      description: "Si hay consultas previas, vincúlala brevemente en una oración. De lo contrario, cadena vacía."
    },
    advertenciaEspecial: {
      type: Type.STRING,
      description: "Si se detecta una contradicción, proyección de culpa neurótica, o invasión de privacidad/control absoluto, explícalo aquí con firmeza pero muy brevemente. Si no aplica, de lo contrario cadena vacía."
    },
    preguntasSugeridas: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Exactamente 3 preguntas de seguimiento concretas que la pareja podría hacerse a sí misma o al terapeuta para profundizar en este mismo problema. Deben ser específicas al análisis entregado, no genéricas."
    }
  },
  required: [
    "evaluacionSalud",
    "categorizacion",
    "analisisRoles",
    "recomendacionesClinicas",
    "conexionAnterior",
    "advertenciaEspecial",
    "preguntasSugeridas"
  ]
};

// Therapy Prompt Base — Tono: DIRECTO
const SYSTEM_INSTRUCTION = `Eres un Terapeuta de Pareja Clínico con tono DIRECTO y asertivo. Tu estilo es el de un profesional que va al grano: sin rodeos, sin suavizar innecesariamente, sin academicismos. Dices lo que ves con claridad y firmeza, siempre con respeto pero sin eufemismos.

Tu marco clínico integra:
1. Comunicación y balance afectivo: detectas crítica, desprecio, actitud defensiva y amurallamiento.
2. Límites y poder: identificas control unilateral, dominancia coercitiva, asimetría de poder, invasión de autonomía.
3. Atribuciones de culpa: corriges proyecciones neuróticas donde uno responsabiliza al otro de todo.
4. Apego y ciclos: desmontás ciclos de persecución-distancia y necesidades de seguridad no satisfechas.

REGLAS DE TONO DIRECTO (aplica siempre):
- Ve directo al problema. Sin preámbulos ni frases de apertura tipo "Entiendo tu situación...".
- Llama las cosas por su nombre: si es manipulación, dilo. Si es control, nómbralo.
- Usa oraciones cortas y contundentes. Elimina adjetivos vacíos.
- NUNCA cites investigadores, autores ni metodologías por nombre propio.
- Si hay abuso de autoridad, control o invasión de privacidad: evalúa como "NO SANO" con firmeza absoluta.
- Entrega todo en español directo y asertivo.`;

app.post("/api/consultation", async (req, res) => {
  try {
    const { messages, currentQuery, partnerA, partnerB, mainObjective, conflictLevel } = req.body;

    if (!currentQuery) {
      return res.status(400).json({ error: "La consulta no puede estar vacía." });
    }

    const client = getGeminiClient();

    // Reconstruct conversation history parts
    const contents: any[] = [];
    
    // Add history if present
    if (messages && Array.isArray(messages)) {
      messages.forEach((msg: any) => {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }]
        });
      });
    }

    // Build personalized query text with partner names
    let promptText = `Realiza un análisis clínico y proporciona orientación para la siguiente situación o consulta de pareja: \n\n"${currentQuery}"\n\nRecuerda revisar el historial anterior si existe para vincular términos o problemas y rellenar 'conexionAnterior'.`;
    
    if (partnerA || partnerB) {
      const OBJECTIVES: Record<string, string> = {
        comunicacion: "mejorar la comunicación entre ellos",
        conflicto: "resolver un conflicto específico activo",
        reconexion: "reconectar emocionalmente tras distanciamiento",
        evaluacion: "evaluar el estado real de la relación"
      };
      const objectiveLabel = OBJECTIVES[mainObjective] || "mejorar la dinámica relacional";
      const levelLabel = conflictLevel <= 3 ? "baja (leve tensión)" : conflictLevel <= 6 ? "moderada" : "alta (crisis severa)";

      promptText += `\n\n[CONTEXTO DE SESIÓN]:
Pareja: "${partnerA || 'Pareja A'}" y "${partnerB || 'Pareja B'}".
Objetivo declarado por la pareja: ${objectiveLabel}.
Intensidad del conflicto declarada: ${conflictLevel}/10 — nivel ${levelLabel}.

INSTRUCCIÓN: En toda tu respuesta dirígete a ellos por sus nombres ("${partnerA || 'Pareja A'}" y "${partnerB || 'Pareja B'}") de forma directa. Calibra la urgencia de tus recomendaciones al nivel de intensidad declarado. Nunca uses términos abstractos como "el ejecutor" o "el solicitante".`;
    }

    if (currentQuery.includes("[MEDIACIÓN DE DOS PERSPECTIVAS]")) {
      promptText += `\n\n[INSTRUCCIÓN DE MEDIACIÓN CLÍNICA]:
Se te presentan dos perspectivas del mismo conflicto. La primera persona (marcada como "plantea el desacuerdo") es quien inicia la queja o señala el problema. La segunda (marcada como "argumenta su postura") es quien defiende su punto de vista o se justifica.

Analiza con directness:
1. Qué hay de válido en cada postura y qué es defensa o proyección.
2. Dónde coinciden sin saberlo y dónde hay un malentendido real.
3. Quién está asumiendo más responsabilidad y quién está evadiendo.
Diseña recomendaciones específicas para cada uno, no genéricas para "la pareja".`;
    }

    // Add the current query
    contents.push({
      role: "user",
      parts: [{ text: promptText }]
    });

    // Helper to request content with multi-model fallback to survive high-demand outages (503)
    let response;
    const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
    let lastError: any = null;

    for (const modelOfChoice of modelsToTry) {
      try {
        console.log(`[DR. ALIANZA] Intentando consulta con el modelo: ${modelOfChoice}`);
        response = await client.models.generateContent({
          model: modelOfChoice,
          contents: contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseSchema: responseSchema,
            temperature: 0.75,
          }
        });
        if (response && response.text) {
          console.log(`[DR. ALIANZA] Éxito absoluto usando el modelo: ${modelOfChoice}`);
          lastError = null;
          break;
        }
      } catch (err: any) {
        console.error(`[DR. ALIANZA] El modelo ${modelOfChoice} falló con error:`, err?.message || err);
        lastError = err;
        // Pause briefly before fallback
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }

    if (lastError) {
      throw lastError;
    }

    if (!response || !response.text) {
      throw new Error("No se pudo obtener una devolución estructurada de ningún modelo de Gemini.");
    }

    const rawText = response.text;
    if (!rawText) {
      throw new Error("No se obtuvo respuesta del modelo Gemini.");
    }

    try {
      const parsedData = JSON.parse(rawText.trim());
      res.json(parsedData);
    } catch (parseError) {
      console.error("Error parsing Gemini JSON response. Raw text:", rawText);
      res.status(500).json({
        error: "La respuesta clínica no pudo procesarse correctamente.",
        rawText: rawText
      });
    }

  } catch (error: any) {
    console.error("Error in consultation helper:", error);
    res.status(500).json({ error: error.message || "Ocurrió un error inesperado al procesar la sesión de terapia." });
  }
});

// Serve health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// List all therapy sessions, most recent first
app.get("/api/sessions", async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("therapy_sessions")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    res.json((data || []).map(sessionRowToClient));
  } catch (error: any) {
    console.error("Error listing sessions:", error);
    res.status(500).json({ error: error.message || "No se pudieron cargar las sesiones." });
  }
});

// Create a new therapy session
app.post("/api/sessions", async (req, res) => {
  try {
    const { title, partnerA, partnerB, mainObjective, conflictLevel, messages } = req.body;
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("therapy_sessions")
      .insert([{
        title,
        partner_a: partnerA,
        partner_b: partnerB,
        main_objective: mainObjective,
        conflict_level: conflictLevel,
        messages: messages || []
      }] as any)
      .select()
      .single();
    if (error) throw error;
    res.json(sessionRowToClient(data));
  } catch (error: any) {
    console.error("Error creating session:", error);
    res.status(500).json({ error: error.message || "No se pudo crear la sesión." });
  }
});

// Update an existing therapy session (messages, names, objective, etc.)
app.put("/api/sessions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, partnerA, partnerB, mainObjective, conflictLevel, messages } = req.body;
    const supabase = getSupabaseClient();
    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (title !== undefined) updatePayload.title = title;
    if (partnerA !== undefined) updatePayload.partner_a = partnerA;
    if (partnerB !== undefined) updatePayload.partner_b = partnerB;
    if (mainObjective !== undefined) updatePayload.main_objective = mainObjective;
    if (conflictLevel !== undefined) updatePayload.conflict_level = conflictLevel;
    if (messages !== undefined) updatePayload.messages = messages;

    const { data, error } = (await (supabase
      .from("therapy_sessions") as any)
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single()) as { data: any; error: any };
    if (error) throw error;
    res.json(sessionRowToClient(data));
  } catch (error: any) {
    console.error("Error updating session:", error);
    res.status(500).json({ error: error.message || "No se pudo actualizar la sesión." });
  }
});

// Delete a therapy session
app.delete("/api/sessions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("therapy_sessions").delete().eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting session:", error);
    res.status(500).json({ error: error.message || "No se pudo eliminar la sesión." });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Terapeuta Server running on port ${PORT} with environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer();
