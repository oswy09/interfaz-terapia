const { GoogleGenAI, Type } = require("@google/genai");

let aiClient = null;
function getGeminiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("La clave GEMINI_API_KEY no está configurada en las variables de entorno de Netlify.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: { headers: { "User-Agent": "netlify-function" } }
    });
  }
  return aiClient;
}

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

const OBJECTIVES = {
  comunicacion: "mejorar la comunicación entre ellos",
  conflicto: "resolver un conflicto específico activo",
  reconexion: "reconectar emocionalmente tras distanciamiento",
  evaluacion: "evaluar el estado real de la relación"
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Método no permitido." }) };
  }

  try {
    const { messages, currentQuery, partnerA, partnerB, mainObjective, conflictLevel } = JSON.parse(event.body || "{}");

    if (!currentQuery) {
      return { statusCode: 400, body: JSON.stringify({ error: "La consulta no puede estar vacía." }) };
    }

    const client = getGeminiClient();
    const contents = [];

    if (messages && Array.isArray(messages)) {
      messages.forEach((msg) => {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }]
        });
      });
    }

    let promptText = `Realiza un análisis clínico y proporciona orientación para la siguiente situación o consulta de pareja: \n\n"${currentQuery}"\n\nRecuerda revisar el historial anterior si existe para vincular términos o problemas y rellenar 'conexionAnterior'.`;

    if (partnerA || partnerB) {
      const objectiveLabel = OBJECTIVES[mainObjective] || "mejorar la dinámica relacional";
      const levelLabel = conflictLevel <= 3 ? "baja (leve tensión)" : conflictLevel <= 6 ? "moderada" : "alta (crisis severa)";

      promptText += `\n\n[CONTEXTO DE SESIÓN]:
Pareja: "${partnerA || "Pareja A"}" y "${partnerB || "Pareja B"}".
Objetivo declarado por la pareja: ${objectiveLabel}.
Intensidad del conflicto declarada: ${conflictLevel}/10 — nivel ${levelLabel}.

INSTRUCCIÓN: En toda tu respuesta dirígete a ellos por sus nombres ("${partnerA || "Pareja A"}" y "${partnerB || "Pareja B"}") de forma directa. Calibra la urgencia de tus recomendaciones al nivel de intensidad declarado. Nunca uses términos abstractos como "el ejecutor" o "el solicitante".`;
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

    contents.push({ role: "user", parts: [{ text: promptText }] });

    let response;
    const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
    let lastError = null;

    for (const modelOfChoice of modelsToTry) {
      try {
        response = await client.models.generateContent({
          model: modelOfChoice,
          contents: contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseSchema: responseSchema,
            temperature: 0.75
          }
        });
        if (response && response.text) {
          lastError = null;
          break;
        }
      } catch (err) {
        lastError = err;
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }

    if (lastError) throw lastError;
    if (!response || !response.text) {
      throw new Error("No se pudo obtener una devolución estructurada de ningún modelo de Gemini.");
    }

    const parsedData = JSON.parse(response.text.trim());
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsedData)
    };
  } catch (error) {
    console.error("Error in consultation function:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message || "Ocurrió un error inesperado al procesar la sesión de terapia." })
    };
  }
};
