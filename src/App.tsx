import React, { useState, useEffect } from "react";
import {
  Heart,
  AlertTriangle,
  Users,
  Layers,
  Sparkles,
  Send,
  Trash2,
  CheckCircle,
  BookOpen,
  Plus,
  Link2,
  User,
  ArrowRight,
  X,
  MessageSquare,
  Sparkle,
  ThumbsUp,
  ThumbsDown,
  Target,
  Flame
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ChatSession, TherapyMessage, TherapyResponse } from "./types";

const PRESET_QUERIES = [
  {
    label: "Evitación y Distancia",
    text: "Siento que cada vez que intento hablar con mi pareja sobre algo serio, decide ignorarme, se mete en su teléfono o se va del cuarto. Me siento muy oprimida y sola."
  },
  {
    label: "Críticas e Insatisfacción",
    text: "Siempre que mi pareja llega a casa me critica por todo: el orden, lo que cociné o cómo hablo. Dice que si yo hiciera las cosas bien ella no estaría de mal humor."
  },
  {
    label: "Interferencia de Terceros",
    text: "La madre de mi pareja opina en todas nuestras decisiones financieras e íntimas, y mi pareja siempre la defiende a ella en lugar de respaldar nuestro acuerdo."
  },
  {
    label: "Incomunicación y Rutina",
    text: "Nos hemos convertido en compañeros de piso. No discutimos, pero tampoco hay afecto ni intereses en común. Siento que nos estamos desconectando lentamente."
  }
];

const THEORIES = [
  {
    id: "communication",
    title: "Comunicación y Afecto",
    authors: "Enfoque Vincular",
    core: "Identificación de patrones destructivos en la comunicación diaria de la pareja (Crítica, Desprecio, Actitud Defensiva y Amurallamiento) y balance del saldo afectivo positivo de la cuenta bancaria emocional.",
    color: "bg-[#FAF3F3] border-[#EAD1D1] text-[#8C2D2D]"
  },
  {
    id: "authority",
    title: "Autoridad y Distribución del Poder",
    authors: "Estructuras de Poder",
    core: "Identificación de asimetrías de poder insanas, control unilateral, dominancia coercitiva, abuso de autoridad, sometimiento o transgresión directa a la autonomía personal de la pareja.",
    color: "bg-[#FAF3F3] border-[#EAD1D1] text-[#8C2D2D]"
  },
  {
    id: "boundaries",
    title: "Límites y Fronteras",
    authors: "Enfoque Sistémico",
    core: "Inspección de las fronteras interpersonales, establecimiento de límites claros, evitación de alianzas patológicas y triangulación de dinámicas conyugales.",
    color: "bg-[#FAF3F3] border-[#EAD1D1] text-[#8C2D2D]"
  },
  {
    id: "attachment",
    title: "Vínculo y Apego Seguro",
    authors: "Sintonía Emocional",
    core: "Desarmado de ciclos automáticos y reactivos de persecución-distancia y decodificación de necesidades primarias de seguridad, protección y calidez.",
    color: "bg-[#FAF3F3] border-[#EAD1D1] text-[#8C2D2D]"
  }
];

const LOADING_REFLECTIONS = [
  "Iniciando sesión de terapia relacional...",
  "Detección de patrones de control o autoridad unilateral...",
  "Evaluando asimetrías de poder y dinámicas de sometimiento...",
  "Analizando posibles sesgos en la queja del solicitante...",
  "Calculando límites sanos y prescripciones clínicas inmediatas...",
  "Estableciendo analogías con historiales previos en la sesión..."
];

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTheories, setShowTheories] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  // Mediation Mode states
  const [inputMode, setInputMode] = useState<"individual" | "mediation">("individual");
  const [queryPartnerA, setQueryPartnerA] = useState("");
  const [queryPartnerB, setQueryPartnerB] = useState("");
  const [mediationInitiator, setMediationInitiator] = useState<"A" | "B">("A");

  // Name + onboarding configurations
  const [partnerA, setPartnerA] = useState("");
  const [partnerB, setPartnerB] = useState("");
  const [mainObjective, setMainObjective] = useState("comunicacion");
  const [conflictLevel, setConflictLevel] = useState(5);
  const [namesConfigured, setNamesConfigured] = useState(false);

  const [sessionsLoading, setSessionsLoading] = useState(true);

  // Load chat sessions from Supabase (via backend) on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/sessions");
        if (!res.ok) throw new Error("No se pudieron cargar las sesiones guardadas.");
        const parsed: ChatSession[] = await res.json();
        setSessions(parsed);
        if (parsed.length > 0) {
          const firstSession = parsed[0];
          setActiveSessionId(firstSession.id);
          setPartnerA(firstSession.partnerA || "");
          setPartnerB(firstSession.partnerB || "");
          setMainObjective(firstSession.mainObjective || "comunicacion");
          setConflictLevel(firstSession.conflictLevel ?? 5);
          setNamesConfigured(!!(firstSession.partnerA && firstSession.partnerB));
        }
      } catch (e: any) {
        console.error("Error loading clinical chats", e);
        setError(e.message || "No se pudo conectar con el almacenamiento en la nube.");
      } finally {
        setSessionsLoading(false);
      }
    })();
  }, []);

  // Persist a new session in Supabase
  const createSessionRemote = async (session: Omit<ChatSession, "id" | "timestamp">): Promise<ChatSession> => {
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(session)
    });
    if (!res.ok) throw new Error("No se pudo guardar la sesión en la nube.");
    return res.json();
  };

  // Persist updates to an existing session in Supabase
  const updateSessionRemote = async (id: string, patch: Partial<ChatSession>): Promise<ChatSession> => {
    const res = await fetch(`/api/sessions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    if (!res.ok) throw new Error("No se pudo actualizar la sesión en la nube.");
    return res.json();
  };

  // Update local state immediately (optimistic) — caller is responsible for the remote write
  const saveSessions = (updated: ChatSession[]) => {
    setSessions(updated);
  };

  // Loading indicator words rotation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % LOADING_REFLECTIONS.length);
      }, 2500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  const handleStartNewChat = () => {
    setActiveSessionId(null);
    setPartnerA("");
    setPartnerB("");
    setMainObjective("comunicacion");
    setConflictLevel(5);
    setNamesConfigured(false);
    setQuery("");
    setError(null);
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    const session = sessions.find((s) => s.id === id);
    if (session) {
      setPartnerA(session.partnerA || "");
      setPartnerB(session.partnerB || "");
      setMainObjective(session.mainObjective || "comunicacion");
      setConflictLevel(session.conflictLevel ?? 5);
      setNamesConfigured(!!(session.partnerA && session.partnerB));
    } else {
      setPartnerA("");
      setPartnerB("");
      setMainObjective("comunicacion");
      setConflictLevel(5);
      setNamesConfigured(false);
    }
    setQuery("");
    setError(null);
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("¿Está seguro de que desea eliminar esta consulta del historial?")) {
      const updated = sessions.filter((s) => s.id !== id);
      saveSessions(updated);
      if (activeSessionId === id) {
        setActiveSessionId(updated.length > 0 ? updated[0].id : null);
      }
      try {
        const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("No se pudo eliminar la sesión en la nube.");
      } catch (e: any) {
        setError(e.message || "No se pudo eliminar la sesión.");
      }
    }
  };

  const handleResetWorkspace = async () => {
    if (window.confirm("¿Desea limpiar toda la sala de terapia relacional? Esto se quedará en blanco (cero).")) {
      const toDelete = [...sessions];
      saveSessions([]);
      setActiveSessionId(null);
      setQuery("");
      setError(null);
      try {
        await Promise.all(toDelete.map((s) => fetch(`/api/sessions/${s.id}`, { method: "DELETE" })));
      } catch (e: any) {
        setError("Algunas sesiones no pudieron eliminarse de la nube.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const backupQuery = query;
    const backupQueryA = queryPartnerA;
    const backupQueryB = queryPartnerB;

    let userMsgText = "";
    if (inputMode === "individual") {
      if (!query.trim()) return;
      userMsgText = query;
      setQuery("");
    } else {
      if (!queryPartnerA.trim() || !queryPartnerB.trim()) return;
      const initiatorName = mediationInitiator === "A" ? (partnerA || "Pareja A") : (partnerB || "Pareja B");
      const responderName = mediationInitiator === "A" ? (partnerB || "Pareja B") : (partnerA || "Pareja A");
      const initiatorText = mediationInitiator === "A" ? queryPartnerA.trim() : queryPartnerB.trim();
      const responderText = mediationInitiator === "A" ? queryPartnerB.trim() : queryPartnerA.trim();
      userMsgText = `[MEDIACIÓN DE DOS PERSPECTIVAS]\n- ${initiatorName} (plantea el desacuerdo): "${initiatorText}"\n- ${responderName} (argumenta su postura): "${responderText}"`;
      setQueryPartnerA("");
      setQueryPartnerB("");
    }

    setLoading(true);
    setError(null);

    // Prepare history to send to server. Collect all previous interactions in the active session
    // to map patterns and maintain coherence with correct role alternating structure.
    const messageHistoryForApi: { role: "user" | "model"; content: string }[] = [];
    if (activeSession) {
      activeSession.messages.forEach((msg) => {
        if (msg.role === "user") {
          messageHistoryForApi.push({
            role: "user",
            content: msg.text
          });
        } else if (msg.role === "model" && msg.response) {
          messageHistoryForApi.push({
            role: "model",
            content: `Categorización: ${msg.response.categorizacion.terminosClinicos.join(", ")}. Análisis profundo: ${msg.response.recomendacionesClinicas.explicacionProfunda}`
          });
        }
      });
    }

    try {
      const res = await fetch("/api/consultation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: messageHistoryForApi,
          currentQuery: userMsgText,
          partnerA,
          partnerB,
          mainObjective,
          conflictLevel
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Error al procesar la recomendación médica.");
      }

      const clinResponse: TherapyResponse = await res.json();
      const timestampString = new Date().toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      });

      const userMsg: TherapyMessage = {
        id: crypto.randomUUID(),
        role: "user",
        text: userMsgText,
        timestamp: timestampString
      };

      const modelMsg: TherapyMessage = {
        id: crypto.randomUUID(),
        role: "model",
        text: "Informe Clínico Estructurado",
        response: clinResponse,
        timestamp: timestampString
      };

      if (activeSessionId && activeSession) {
        // Append messages to active session (optimistic local update, then persist)
        const updatedMessages = [...activeSession.messages, userMsg, modelMsg];
        const updatedSession = { ...activeSession, messages: updatedMessages };
        saveSessions(sessions.map((s) => s.id === activeSessionId ? updatedSession : s));
        await updateSessionRemote(activeSessionId, { messages: updatedMessages });
      } else {
        // Create new session
        const shortTitle = partnerA && partnerB ? `Sesión: ${partnerA} & ${partnerB}` : (userMsgText.length > 28 ? userMsgText.substring(0, 28) + "..." : userMsgText);
        const newSessionDraft = {
          title: shortTitle,
          messages: [userMsg, modelMsg],
          partnerA,
          partnerB,
          mainObjective,
          conflictLevel
        };
        const createdSession = await createSessionRemote(newSessionDraft);
        saveSessions([createdSession, ...sessions]);
        setActiveSessionId(createdSession.id);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ocurrió una complicación al consultar al terapeuta de pareja.");
      // Restore query so the user does not lose their typed words
      if (inputMode === "individual") {
        setQuery(backupQuery);
      } else {
        setQueryPartnerA(backupQueryA);
        setQueryPartnerB(backupQueryB);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = (text: string) => {
    setQuery(text);
  };

  const handleQuickQuestion = async (text: string) => {
    if (loading || !text.trim()) return;
    setLoading(true);
    setError(null);
    setInputMode("individual");

    const messageHistoryForApi: { role: "user" | "model"; content: string }[] = [];
    if (activeSession) {
      activeSession.messages.forEach((msg) => {
        if (msg.role === "user") {
          messageHistoryForApi.push({ role: "user", content: msg.text });
        } else if (msg.role === "model" && msg.response) {
          messageHistoryForApi.push({
            role: "model",
            content: `Categorización: ${msg.response.categorizacion.terminosClinicos.join(", ")}. Análisis profundo: ${msg.response.recomendacionesClinicas.explicacionProfunda}`
          });
        }
      });
    }

    const timestampString = new Date().toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    const userMsg: TherapyMessage = { id: crypto.randomUUID(), role: "user", text, timestamp: timestampString };

    try {
      const res = await fetch("/api/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messageHistoryForApi, currentQuery: text, partnerA, partnerB, mainObjective, conflictLevel })
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Error al consultar."); }
      const clinResponse: TherapyResponse = await res.json();
      const modelMsg: TherapyMessage = { id: crypto.randomUUID(), role: "model", text: "Informe Clínico Estructurado", response: clinResponse, timestamp: timestampString };

      if (activeSessionId && activeSession) {
        const updatedMessages = [...activeSession.messages, userMsg, modelMsg];
        saveSessions(sessions.map(s => s.id === activeSessionId ? { ...activeSession, messages: updatedMessages } : s));
        await updateSessionRemote(activeSessionId, { messages: updatedMessages });
      } else {
        const newSessionDraft = { title: text.substring(0, 28) + "...", messages: [userMsg, modelMsg], partnerA, partnerB, mainObjective, conflictLevel };
        const createdSession = await createSessionRemote(newSessionDraft);
        saveSessions([createdSession, ...sessions]);
        setActiveSessionId(createdSession.id);
      }
    } catch (err: any) {
      setError(err.message || "Error al consultar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF3F3] text-[#2D2D2D] font-sans flex flex-col" id="applet-viewport">
      
      {/* Editorial Top Accent Bar */}
      <div className="h-1 bg-gradient-to-r from-[#8C2D2D] via-[#B04040] to-[#8C2D2D]" />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* SIDEBAR: Gemini/GPT like minimalist interface */}
        <aside className="w-full md:w-[280px] border-b md:border-b-0 md:border-r border-[#EAD1D1] bg-[#F9ECEC] p-5 flex flex-col justify-between shrink-0">
          <div className="space-y-6 overflow-y-auto max-h-[400px] md:max-h-full">
            
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#8C2D2D] flex items-center justify-center text-white font-serif italic text-base">
                <Heart className="w-4 h-4 text-white fill-white/20" />
              </div>
              <div>
                <span className="font-serif italic text-lg tracking-tight text-[#8C2D2D] block">Alianza AI</span>
                <span className="text-[9px] uppercase tracking-[0.1em] text-[#A88585] block font-bold">Terapeuta de Pareja</span>
              </div>
            </div>

            {/* Start New Chat Action */}
            <button
              onClick={handleStartNewChat}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-[#EAD1D1] bg-white text-xs font-bold uppercase tracking-widest text-[#8C2D2D] hover:bg-[#8C2D2D] hover:border-[#8C2D2D] hover:text-white transition-all cursor-pointer"
              id="btn-new-chat"
            >
              <span>Nueva Consulta</span>
              <Plus className="w-4 h-4" />
            </button>

            {/* List of active consultations (Conversations) */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#A88585] mb-3">Consultas Activas</p>
              
              {sessions.length === 0 ? (
                <p className="text-[11px] italic text-[#A88585] py-2">Sin historiales activos</p>
              ) : (
                <div className="space-y-1.5">
                  {sessions.map((session) => {
                    const isActive = session.id === activeSessionId;
                    return (
                      <div
                        key={session.id}
                        onClick={() => handleSelectSession(session.id)}
                        className={`group flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                          isActive
                            ? "bg-white border-[#8C2D2D] text-[#2D2D2D] font-bold shadow-xs"
                            : "bg-transparent border-transparent text-[#6B685E] hover:bg-white/40 hover:text-[#2D2D2D]"
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden mr-1">
                          <MessageSquare className="w-3.5 h-3.5 text-[#A88585] shrink-0" />
                          <span className="truncate max-w-[170px] text-left">{session.title}</span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-[#A88585] hover:text-rose-600 transition-all rounded-md hover:bg-white/70 cursor-pointer"
                          title="Eliminar consulta"
                          id={`delete-session-${session.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Action Footer list inside Sidebar */}
          <div className="pt-4 border-t border-[#EAD1D1] mt-6 md:mt-0 space-y-3">
            <button
              onClick={() => setShowTheories(!showTheories)}
              className="w-full flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-[#6B685E] hover:text-[#8C2D2D] transition-colors focus:outline-none cursor-pointer"
              id="btn-reveal-theories"
            >
              <BookOpen className="w-4 h-4 text-[#A88585]" />
              {showTheories ? "Ocultar Bases Teóricas" : "Bases Teóricas Aplicadas"}
            </button>

            {sessions.length > 0 && (
              <button
                onClick={handleResetWorkspace}
                className="w-full flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-rose-700 hover:text-rose-900 transition-colors focus:outline-none cursor-pointer"
                id="btn-wipe-all"
              >
                <Trash2 className="w-4 h-4" />
                Limpiar Diario Completo
              </button>
            )}

            <div className="text-[10px] text-[#A88585] font-mono border-t border-[#EAD1D1]/55 pt-3">
              <span>Diario relacional blindado clínicamente</span>
            </div>
          </div>
        </aside>

        {/* MAIN DISPLAY WINDOW */}
        <main className="flex-1 p-6 sm:p-10 bg-white overflow-y-auto flex flex-col justify-between">
          
          <div className="max-w-3xl mx-auto w-full">
            
            {/* Header section of active chat / or generic intro */}
            {activeSession ? (
              <header className="mb-8 pb-4 border-b border-[#EAD1D1]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-sans">
                <div>
                  <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-[#A88585]">Informe Clínico Activo</span>
                  <h1 className="font-serif italic text-2xl text-[#1A1A1A]">{activeSession.title}</h1>
                </div>
                <div className="flex gap-2">
                  <span className="px-2.5 py-1 bg-[#FAF3F3] rounded border border-[#EAD1D1] text-[9px] uppercase font-bold tracking-wider text-[#8C2D2D]">
                    {activeSession.messages.filter(m => m.role === 'user').length} {activeSession.messages.filter(m => m.role === 'user').length === 1 ? 'Consulta' : 'Colección'}
                  </span>
                </div>
              </header>
            ) : null}

            {/* Framework Description Modal Popover / Collapsible if toggled */}
            <AnimatePresence>
              {showTheories && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-[#F9ECEC] p-6 rounded-xl border border-[#EAD1D1] shadow-xs mb-8 overflow-hidden"
                  id="theories-panel"
                >
                  <div className="flex items-center justify-between border-b border-[#EAD1D1]/40 pb-2 mb-4">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#8C2D2D]" />
                      <h4 className="font-serif italic text-base text-[#8C2D2D]">Marco Clínico de Alianza AI (4 Pilares)</h4>
                    </div>
                    <button
                      onClick={() => setShowTheories(false)}
                      className="text-[#A88585] hover:text-[#2D2D2D]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {THEORIES.map((theory) => (
                      <div key={theory.id} className="p-3.5 bg-white/60 rounded border border-[#EAD1D1]">
                        <div className="flex justify-between items-baseline mb-1">
                          <h5 className="font-serif italic text-xs font-bold text-[#8C2D2D]">{theory.title}</h5>
                        </div>
                        <p className="text-[11px] leading-relaxed text-[#6B685E]">{theory.core}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ONBOARDING WIZARD */}
            {!namesConfigured ? (
              <section className="py-6 sm:py-10 max-w-lg mx-auto animate-fade-in" id="couple-names-setup">
                {/* Hero */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8C2D2D] to-[#B04040] shadow-lg mb-4">
                    <Heart className="w-7 h-7 text-white fill-white/20" />
                  </div>
                  <h2 className="font-serif text-3xl text-[#1A1A1A] mb-2">Nueva Sesión Clínica</h2>
                  <p className="text-sm text-[#6B685E] leading-relaxed max-w-sm mx-auto">
                    Configuremos tu sesión para que el análisis sea completamente personalizado y directo.
                  </p>
                </div>

                {/* Steps indicator */}
                <div className="flex items-center gap-2 justify-center mb-8">
                  {["Nombres", "Objetivo", "Intensidad"].map((step, i) => (
                    <React.Fragment key={step}>
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-[#8C2D2D] text-white text-[9px] font-bold flex items-center justify-center">{i + 1}</div>
                        <span className="text-[10px] font-bold text-[#8C2D2D] uppercase tracking-wide hidden sm:block">{step}</span>
                      </div>
                      {i < 2 && <div className="flex-1 max-w-[40px] h-px bg-[#EAD1D1]" />}
                    </React.Fragment>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (partnerA.trim() && partnerB.trim()) {
                      setNamesConfigured(true);
                      if (activeSessionId && activeSession) {
                        const title = `Sesión: ${partnerA} & ${partnerB}`;
                        saveSessions(sessions.map(s => s.id === activeSessionId ? { ...s, partnerA, partnerB, mainObjective, conflictLevel, title } : s));
                        updateSessionRemote(activeSessionId, { partnerA, partnerB, mainObjective, conflictLevel, title }).catch((err) => setError(err.message));
                      }
                    }
                  }}
                  className="space-y-5"
                >
                  {/* Names section — profile cards */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Card A */}
                    <div className={`relative p-5 bg-white rounded-2xl border-2 transition-all shadow-sm flex flex-col items-center gap-3 ${
                      partnerA.trim() ? "border-[#8C2D2D] shadow-[#8C2D2D]/10" : "border-[#EAD1D1]"
                    }`}>
                      {/* Avatar */}
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold font-serif transition-all ${
                        partnerA.trim()
                          ? "bg-gradient-to-br from-[#8C2D2D] to-[#B04040] text-white shadow-md"
                          : "bg-[#F5EDED] text-[#C4B8B8] border-2 border-dashed border-[#EAD1D1]"
                      }`}>
                        {partnerA.trim() ? partnerA.trim()[0].toUpperCase() : <User className="w-6 h-6" />}
                      </div>
                      <div className="w-full space-y-1 text-center">
                        <label className="text-[9px] uppercase tracking-widest font-extrabold text-[#A88585] block">
                          Primer miembro
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Carlos"
                          value={partnerA}
                          onChange={(e) => setPartnerA(e.target.value)}
                          className="w-full rounded-xl border border-[#EAD1D1] px-3 py-2 text-sm text-center font-semibold text-[#2D2D2D] placeholder-[#C4B8B8] focus:outline-none focus:ring-2 focus:ring-[#8C2D2D]/30 bg-[#FDFAFA] transition-all"
                          id="input-partner-a"
                        />
                      </div>
                      {partnerA.trim() && (
                        <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </span>
                      )}
                    </div>

                    {/* Card B */}
                    <div className={`relative p-5 bg-white rounded-2xl border-2 transition-all shadow-sm flex flex-col items-center gap-3 ${
                      partnerB.trim() ? "border-[#8C2D2D] shadow-[#8C2D2D]/10" : "border-[#EAD1D1]"
                    }`}>
                      {/* Avatar */}
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold font-serif transition-all ${
                        partnerB.trim()
                          ? "bg-gradient-to-br from-[#B04040] to-[#8C2D2D] text-white shadow-md"
                          : "bg-[#F5EDED] text-[#C4B8B8] border-2 border-dashed border-[#EAD1D1]"
                      }`}>
                        {partnerB.trim() ? partnerB.trim()[0].toUpperCase() : <User className="w-6 h-6" />}
                      </div>
                      <div className="w-full space-y-1 text-center">
                        <label className="text-[9px] uppercase tracking-widest font-extrabold text-[#A88585] block">
                          Segundo miembro
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Sofía"
                          value={partnerB}
                          onChange={(e) => setPartnerB(e.target.value)}
                          className="w-full rounded-xl border border-[#EAD1D1] px-3 py-2 text-sm text-center font-semibold text-[#2D2D2D] placeholder-[#C4B8B8] focus:outline-none focus:ring-2 focus:ring-[#8C2D2D]/30 bg-[#FDFAFA] transition-all"
                          id="input-partner-b"
                        />
                      </div>
                      {partnerB.trim() && (
                        <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* "vs" connector visual */}
                  {(partnerA.trim() || partnerB.trim()) && (
                    <div className="flex items-center gap-3 -mt-1">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#EAD1D1]" />
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-[#FAF3F3] rounded-full border border-[#EAD1D1]">
                        <Heart className="w-3 h-3 text-[#8C2D2D] fill-[#8C2D2D]/20" />
                        <span className="text-[9px] font-extrabold tracking-widest text-[#8C2D2D] uppercase">
                          {partnerA.trim() && partnerB.trim() ? `${partnerA} & ${partnerB}` : "Pareja"}
                        </span>
                      </div>
                      <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#EAD1D1]" />
                    </div>
                  )}

                  {/* Objective section */}
                  <div className="p-5 bg-white rounded-2xl border border-[#EAD1D1] shadow-sm space-y-3">
                    <div className="flex items-center gap-2 pb-3 border-b border-[#EAD1D1]/50">
                      <Target className="w-4 h-4 text-[#8C2D2D]" />
                      <span className="text-[10px] uppercase tracking-widest font-extrabold text-[#8C2D2D]">Objetivo Principal</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "comunicacion", label: "Mejorar comunicación", emoji: "💬" },
                        { value: "conflicto", label: "Resolver conflicto", emoji: "⚡" },
                        { value: "reconexion", label: "Reconectar emocionalmente", emoji: "🤝" },
                        { value: "evaluacion", label: "Evaluar la relación", emoji: "🔍" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setMainObjective(opt.value)}
                          className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                            mainObjective === opt.value
                              ? "bg-[#8C2D2D] border-[#8C2D2D] text-white shadow-sm"
                              : "bg-[#FDFAFA] border-[#EAD1D1] text-[#4A4A4A] hover:border-[#8C2D2D]/40 hover:bg-[#FAF3F3]"
                          }`}
                        >
                          <span className="text-base block mb-0.5">{opt.emoji}</span>
                          <span className="font-semibold leading-tight block">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Conflict intensity section */}
                  <div className="p-5 bg-white rounded-2xl border border-[#EAD1D1] shadow-sm space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-[#EAD1D1]/50">
                      <Flame className="w-4 h-4 text-[#8C2D2D]" />
                      <span className="text-[10px] uppercase tracking-widest font-extrabold text-[#8C2D2D]">Intensidad del Conflicto</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#A88585]">Leve tensión</span>
                        <span className={`font-extrabold text-lg ${
                          conflictLevel <= 3 ? "text-emerald-600" :
                          conflictLevel <= 6 ? "text-amber-600" : "text-rose-600"
                        }`}>{conflictLevel}<span className="text-sm font-normal text-[#A88585]">/10</span></span>
                        <span className="text-[#A88585]">Crisis severa</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={10}
                        value={conflictLevel}
                        onChange={(e) => setConflictLevel(Number(e.target.value))}
                        className="w-full accent-[#8C2D2D] cursor-pointer"
                      />
                      <div className="flex justify-between">
                        {[1,2,3,4,5,6,7,8,9,10].map(n => (
                          <div key={n} className={`w-1.5 h-1.5 rounded-full transition-all ${
                            n <= conflictLevel
                              ? n <= 3 ? "bg-emerald-400" : n <= 6 ? "bg-amber-400" : "bg-rose-400"
                              : "bg-[#EAD1D1]"
                          }`} />
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!partnerA.trim() || !partnerB.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-[#8C2D2D] to-[#A03535] hover:from-[#722020] hover:to-[#8C2D2D] disabled:from-[#EAD1D1] disabled:to-[#EAD1D1] text-white text-xs font-bold uppercase tracking-widest transition-all cursor-pointer shadow-md"
                    id="btn-confirm-names"
                  >
                    <span>Iniciar Sesión Clínica</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                <p className="text-center text-[10px] text-[#A88585] font-mono mt-4">
                  Todo se almacena localmente · Sin servidores externos
                </p>
              </section>
            ) : (
              /* If names configured: Display regular content and map messages */
              <>
                {partnerA && partnerB && (
                  <div className="mb-6 p-3.5 bg-gradient-to-r from-[#FAF3F3] to-[#FDF8F8] border border-[#EAD1D1] rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-[#2D2D2D] shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#8C2D2D] flex items-center justify-center shrink-0">
                        <Heart className="w-3.5 h-3.5 text-white fill-white/20" />
                      </div>
                      <div>
                        <span className="font-bold text-[#8C2D2D]">{partnerA}</span>
                        <span className="text-[#A88585] mx-1.5">&</span>
                        <span className="font-bold text-[#8C2D2D]">{partnerB}</span>
                        <span className="text-[#A88585 ml-2 text-[10px]"> · </span>
                        <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          conflictLevel <= 3 ? "bg-emerald-50 text-emerald-700" :
                          conflictLevel <= 6 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                        }`}>
                          Intensidad {conflictLevel}/10
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setNamesConfigured(false)}
                      className="text-[10px] uppercase font-bold tracking-wider text-[#8C2D2D] hover:underline cursor-pointer shrink-0"
                      title="Editar configuración de sesión"
                    >
                      Editar Sesión
                    </button>
                  </div>
                )}

                {!activeSession && !loading ? (
                  <section className="py-8 sm:py-16 text-center max-w-2xl mx-auto" id="zero-state-display">
                    <div className="w-12 h-12 bg-[#F9ECEC] rounded-full flex items-center justify-center text-[#8C2D2D] mx-auto border border-[#EAD1D1] mb-6">
                      <Sparkles className="w-5 h-5 fill-[#8C2D2D]/10 text-[#8C2D2D]" />
                    </div>
                    <h2 className="font-serif text-3xl sm:text-4xl text-[#1A1A1A] leading-tight mb-2 font-normal">
                      Consulte a su Terapeuta de Pareja
                    </h2>
                    <p className="text-xs sm:text-sm text-[#6B685E] mb-8 leading-relaxed">
                      Hola {partnerA} y {partnerB}. Realicen preguntas o expongan dinámicas de relación que les preocupan. El motor clínico procesará su dilema utilizando <span className="font-medium text-[#2D2D2D]">los 4 pilares diagnósticos</span> para devolverles un análisis neutral, estructurado y constructivo de alta profesionalidad.
                    </p>

                    {/* Preset examples grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left mb-8">
                      {PRESET_QUERIES.map((preset, index) => (
                        <button
                          key={index}
                          onClick={() => handleApplyPreset(preset.text)}
                          className="p-4 bg-white hover:bg-[#F9ECEC]/40 rounded-xl border border-[#EAD1D1] transition-all text-xs text-[#4A4A4A] hover:text-[#2D2D2D] hover:border-[#8C2D2D] flex flex-col gap-1.5 focus:outline-none cursor-pointer"
                        >
                          <span className="font-semibold text-[#8C2D2D] flex items-center gap-1.5">
                            <Sparkle className="w-3 h-3 text-[#8C2D2D]" /> {preset.label}
                          </span>
                          <p className="leading-relaxed text-[#6B685E] line-clamp-2">{preset.text}</p>
                        </button>
                      ))}
                    </div>

                    <div className="text-[11px] uppercase tracking-widest text-[#A88585] flex items-center justify-center gap-2 font-bold select-none">
                      <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse" />
                      Listo para iniciar sesión relacional de {partnerA} y {partnerB}
                    </div>
                  </section>
                ) : (
                  /* Chat Stream section */
                  <div className="space-y-10 pb-20">
                    {activeSession && activeSession.messages.map((msg, msgIndex) => {
                      const isUser = msg.role === "user";
                      const isLastModelMsg = !isUser && msgIndex === activeSession.messages.length - 1;
                      const rawEvaluacion = msg.response ? msg.response.evaluacionSalud : null;
                      const evaluacion = msg.response ? (rawEvaluacion || {
                        indicador: msg.response.advertenciaEspecial && msg.response.advertenciaEspecial.trim() ? "NO SANO" : "ALERTA",
                        justificacion: msg.response.advertenciaEspecial && msg.response.advertenciaEspecial.trim()
                          ? msg.response.advertenciaEspecial
                          : "Se ha detectado una dinámica relacional compleja que requiere atención asertiva."
                      }) : null;
                      const indicadorNorm = (evaluacion?.indicador || "").toUpperCase().trim().replace(/_/g, " ");
                      return (
                        <div key={msg.id} className="space-y-2">
                          
                          {/* Message Bubble: USER */}
                          {isUser && (
                            <div className="flex items-start gap-3.5">
                              <div className="w-7 h-7 bg-[#EAD1D1] text-[#8C2D2D] uppercase font-mono text-[10px] font-bold rounded-full flex items-center justify-center select-none shrink-0 mt-1">
                                {partnerA ? partnerA[0].toUpperCase() : "Yo"}
                              </div>
                              <div className="p-4 bg-[#F9ECEC]/60 rounded-xl border border-[#EAD1D1] max-w-2xl text-[13px] leading-relaxed text-[#2D2D2D] font-sans">
                                {msg.text}
                              </div>
                            </div>
                          )}

                          {/* Message Bubble: MODEL (Structured Diagnosis) */}
                          {!isUser && msg.response && (
                            <div className="space-y-6 pt-3" id={`clinical-report-${msg.id}`}>
                              
                              {/* Indicator line */}
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-[#8C2D2D] text-white uppercase font-mono text-[9px] font-bold rounded-full flex items-center justify-center select-none shrink-0">
                                  AI
                                </div>
                                <span className="text-[10px] uppercase tracking-wider font-bold text-[#A88585]">
                                  DEVOLUCIÓN CLÍNICA • DR. ALIANZA
                                </span>
                              </div>

                              {/* 1. SECCIÓN: ¿ES SANA ESTA SITUACIÓN? (SÍ / NO / EN ALERTA) */}
                              {evaluacion && (
                            <div 
                              className="p-5 rounded-2xl border border-[#EAD1D1] bg-white text-stone-900 space-y-4 shadow-sm"
                              id="health-traffic-light"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EAD1D1]/30">
                                <div className="space-y-0.5 animate-fade-in">
                                  <h4 className="font-extrabold text-[13px] tracking-tight text-stone-800 font-sans flex items-center gap-1.5">
                                    <Heart className="w-4 h-4 text-[#8C2D2D] fill-[#8C2D2D]/10 shrink-0" />
                                    ¿Es sana esta situación / conducta descrita?
                                  </h4>
                                  <p className="text-[9px] text-[#A88585] uppercase tracking-widest font-semibold">Evaluación Médica Relacional</p>
                                </div>
                                
                                <div className="flex items-center gap-1.5 text-xs">
                                  {indicadorNorm === "SANO" && (
                                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold flex items-center gap-1.5 select-none text-[10px] tracking-wider uppercase">
                                      <ThumbsUp className="w-3 h-3 text-emerald-600 fill-emerald-600/10" />
                                      SÍ (Sana)
                                    </span>
                                  )}
                                  {indicadorNorm === "ALERTA" && (
                                    <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-extrabold flex items-center gap-1.5 select-none text-[10px] tracking-wider uppercase">
                                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                                      EN ALERTA
                                    </span>
                                  )}
                                  {indicadorNorm === "NO SANO" && (
                                    <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-extrabold flex items-center gap-1.5 select-none text-[10px] tracking-wider uppercase animate-pulse">
                                      <ThumbsDown className="w-3 h-3 text-rose-600 fill-rose-600/10" />
                                      NO (No sana)
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Visual Toggle-Style Status Board */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                {/* Option SÍ */}
                                <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                  indicadorNorm === "SANO"
                                    ? "bg-emerald-50/70 border-emerald-400 text-emerald-950 shadow-sm"
                                    : "bg-stone-50/40 border-stone-100 text-[#A88585] opacity-55"
                                }`}>
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                    indicadorNorm === "SANO"
                                      ? "bg-emerald-100/80 border border-emerald-200 text-emerald-800"
                                      : "bg-stone-100/50 text-stone-300"
                                  }`}>
                                    <ThumbsUp className="w-4 h-4" />
                                  </div>
                                  <div className="leading-none">
                                    <span className="text-[11px] font-black uppercase tracking-wider block font-sans">SÍ • SANA</span>
                                    <span className="text-[8.5px] text-stone-400 font-mono">Dinámica segura</span>
                                  </div>
                                </div>

                                {/* Option EN ALERTA */}
                                <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                  indicadorNorm === "ALERTA"
                                    ? "bg-amber-50/70 border-amber-400 text-amber-950 shadow-sm"
                                    : "bg-stone-50/40 border-stone-100 text-[#A88585] opacity-55"
                                }`}>
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                    indicadorNorm === "ALERTA"
                                      ? "bg-amber-100/80 border border-amber-200 text-amber-850"
                                      : "bg-stone-100/50 text-stone-300"
                                  }`}>
                                    <AlertTriangle className="w-4 h-4" />
                                  </div>
                                  <div className="leading-none">
                                    <span className="text-[11px] font-black uppercase tracking-wider block font-sans">ALERTA</span>
                                    <span className="text-[8.5px] text-stone-400 font-mono">Fricciones críticas</span>
                                  </div>
                                </div>

                                {/* Option NO */}
                                <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                  indicadorNorm === "NO SANO"
                                    ? "bg-rose-50/70 border-rose-400 text-rose-950 shadow-sm"
                                    : "bg-stone-50/40 border-stone-100 text-[#A88585] opacity-55"
                                }`}>
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                    indicadorNorm === "NO SANO"
                                      ? "bg-rose-100/80 border border-rose-200 text-rose-800"
                                      : "bg-stone-100/50 text-stone-300"
                                  }`}>
                                    <ThumbsDown className="w-4 h-4" />
                                  </div>
                                  <div className="leading-none">
                                    <span className="text-[11px] font-black uppercase tracking-wider block font-sans">NO • SANA</span>
                                    <span className="text-[8.5px] text-stone-400 font-mono">Asimetría o control</span>
                                  </div>
                                </div>
                              </div>

                              <div className="p-3 bg-stone-50/80 rounded-xl border border-stone-200/40 text-xs text-stone-750 leading-relaxed font-sans">
                                <strong>Diagnóstico de Salud:</strong> {evaluacion.justificacion}
                              </div>
                            </div>
                          )}

                          {/* 2. ADVERTENCIA TERAPÉUTICA (Projections or contradictions) */}
                          {msg.response.advertenciaEspecial && msg.response.advertenciaEspecial.trim() !== "" && (
                            <div className="p-4 bg-red-50/40 rounded-xl border border-rose-200/60 text-stone-800">
                              <div className="flex items-center gap-2 mb-2 pb-1 border-b border-rose-200/30">
                                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                                <h4 className="font-extrabold text-[9px] tracking-wider uppercase text-rose-900 font-sans">
                                  Evaluación de Alarma Relacional o Privacidad
                                </h4>
                              </div>
                              <p className="text-xs leading-relaxed font-sans text-stone-800">
                                {msg.response.advertenciaEspecial}
                              </p>
                            </div>
                          )}

                          {/* 3. CONEXIÓN CON TEMAS PREVIOS DE LA SESIÓN */}
                          {msg.response.conexionAnterior && msg.response.conexionAnterior.trim() !== "" && (
                            <div className="p-3.5 bg-[#F9F7F2]/80 rounded-xl border border-[#E0DCD0]/70 text-[#3D4035]">
                              <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-[#E0DCD0]/60">
                                <Link2 className="w-3.5 h-3.5 text-[#3D4035] shrink-0" />
                                <h4 className="font-bold text-[9px] tracking-wider uppercase text-[#3D4035] font-sans">
                                  Patrón Previo Conectado
                                </h4>
                              </div>
                              <p className="text-xs leading-relaxed font-sans text-stone-600">
                                {msg.response.conexionAnterior}
                              </p>
                            </div>
                          )}

                          {/* Responsive layout with three clean core pillars of high legibility */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
                            
                            {/* PILLAR 1: CATEGORIZACIÓN (Sans serif, ultra clean, with icon) */}
                            <div className="p-4 bg-white rounded-xl border border-[#EAD1D1] space-y-3 shadow-none">
                              <div className="flex items-center justify-between border-b border-[#EAD1D1]/40 pb-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[9px] bg-[#8C2D2D] text-white px-1.5 py-0.5 rounded font-bold">1</span>
                                  <h4 className="text-[10.5px] uppercase tracking-wider font-extrabold text-[#8C2D2D] font-sans">Categorización</h4>
                                </div>
                                <Layers className="w-4 h-4 text-[#8C2D2D]/80" />
                              </div>
                              
                              <p className="text-[11px] leading-relaxed text-[#4A4A4A] font-sans">
                                {msg.response.categorizacion.explicacion}
                              </p>
                            </div>

                            {/* PILLAR 2: ANÁLISIS DE ROLES (Simplificado, sans-serif, with icon) */}
                            <div className="p-4 bg-white rounded-xl border border-[#EAD1D1] space-y-3 shadow-none">
                              <div className="flex items-center justify-between border-b border-[#EAD1D1]/40 pb-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[9px] bg-[#8C2D2D] text-white px-1.5 py-0.5 rounded font-bold">2</span>
                                  <h4 className="text-[10.5px] uppercase tracking-wider font-extrabold text-[#8C2D2D] font-sans">Análisis de Roles</h4>
                                </div>
                                <Users className="w-4 h-4 text-[#8C2D2D]/80" />
                              </div>
                              
                              <div className="space-y-2.5">
                                <div className="text-[11px] leading-relaxed text-[#4A4A4A] font-sans">
                                  <span className="text-[9px] uppercase tracking-wider font-bold text-[#A88585] block mb-0.5">Rol Activo:</span>
                                    {typeof msg.response.analisisRoles.ejecutor === "object" && msg.response.analisisRoles.ejecutor !== null
                                      ? `${(msg.response.analisisRoles.ejecutor as any).titulo || ""} — ${(msg.response.analisisRoles.ejecutor as any).psicologia || ""}`
                                      : String(msg.response.analisisRoles.ejecutor || "")}
                                </div>
                                <div className="text-[11px] leading-relaxed text-[#4A4A4A] font-sans border-t border-stone-100 pt-2">
                                  <span className="text-[9px] uppercase tracking-wider font-bold text-[#A88585] block mb-0.5">Rol Reactivo:</span>
                                    {typeof msg.response.analisisRoles.receptor === "object" && msg.response.analisisRoles.receptor !== null
                                      ? `${(msg.response.analisisRoles.receptor as any).titulo || ""} — ${(msg.response.analisisRoles.receptor as any).psicologia || ""}`
                                      : String(msg.response.analisisRoles.receptor || "")}
                                </div>
                              </div>
                            </div>

                            {/* PILLAR 3: RECOMENDACIONES CLÍNICAS (Optimizado, sans-serif, with icon) */}
                            <div className="p-4 bg-white rounded-xl border border-[#EAD1D1] space-y-3 shadow-none">
                              <div className="flex items-center justify-between border-b border-[#EAD1D1]/40 pb-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[9px] bg-[#8C2D2D] text-white px-1.5 py-0.5 rounded font-bold">3</span>
                                  <h4 className="text-[10.5px] uppercase tracking-wider font-extrabold text-[#8C2D2D] font-sans">Recomendación</h4>
                                </div>
                                <Sparkles className="w-4 h-4 text-[#8C2D2D]/80" />
                              </div>
                              
                              <div className="space-y-3 text-[11px] font-sans">
                                <div>
                                  <span className="text-[#8C2D2D] font-extrabold block text-[9px] tracking-wider uppercase mb-1">Límites Clave:</span>
                                  <div className="space-y-1">
                                    {msg.response.recomendacionesClinicas.limitesSaludables.map((lim, lIdx) => (
                                      <div key={lIdx} className="flex items-start gap-1 text-[#4A4A4A] leading-relaxed">
                                        <CheckCircle className="w-3 h-3 text-[#8C2D2D] shrink-0 mt-0.5" />
                                        <span>{lim}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="border-t border-stone-100 pt-2">
                                  <span className="text-[#8C2D2D] font-extrabold block text-[9px] tracking-wider uppercase mb-1">Pasos Clínicos Prácticos:</span>
                                  <div className="space-y-1">
                                    {msg.response.recomendacionesClinicas.pasosASeguir.map((paso, pIdx) => (
                                      <div key={pIdx} className="leading-relaxed text-[#4A4A4A] flex gap-1 items-start">
                                        <span className="font-bold text-[#8C2D2D] text-[9px]">{pIdx + 1}.</span>
                                        <span>{paso}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>

                          </div>

                          {/* Beautiful clinical closure card with perfect readability */}
                          <div className="p-4 sm:p-5 bg-[#FAF3F3]/50 rounded-xl border border-[#EAD1D1]">
                            <span className="block text-[9px] uppercase tracking-widest text-[#A88585] font-bold mb-1.5 font-sans">Reflexión Final del Consejero</span>
                            <p className="text-xs leading-relaxed text-[#2D2D2D] font-sans antialiased">
                              {msg.response.recomendacionesClinicas.explicacionProfunda}
                            </p>
                          </div>

                          {/* Preguntas sugeridas + Nueva inconformidad — solo en el último diagnóstico */}
                          {isLastModelMsg && (
                            <div className="pt-2 space-y-4">
                              {/* Seguimiento */}
                              {msg.response.preguntasSugeridas && msg.response.preguntasSugeridas.length > 0 && (
                                <div className="p-4 bg-white rounded-2xl border border-[#EAD1D1] shadow-sm space-y-3">
                                  <div className="flex items-center gap-2">
                                    <Sparkle className="w-3.5 h-3.5 text-[#8C2D2D]" />
                                    <span className="text-[10px] uppercase tracking-widest font-extrabold text-[#8C2D2D]">Profundiza en este punto</span>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    {msg.response.preguntasSugeridas.map((q, qi) => (
                                      <button
                                        key={qi}
                                        type="button"
                                        onClick={() => handleQuickQuestion(q)}
                                        disabled={loading}
                                        className="w-full text-left px-4 py-3 text-[12px] bg-[#FAF3F3] border border-[#EAD1D1] rounded-xl text-[#2D2D2D] hover:border-[#8C2D2D] hover:bg-[#F5E8E8] transition-all cursor-pointer leading-snug disabled:opacity-50 disabled:cursor-not-allowed flex items-start gap-2"
                                      >
                                        <span className="text-[#8C2D2D] font-extrabold text-[10px] mt-0.5 shrink-0">{qi + 1}.</span>
                                        <span>{q}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Separador — Nueva inconformidad */}
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-[#EAD1D1]" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuery("");
                                    setInputMode("individual");
                                    setTimeout(() => document.getElementById("query-textarea")?.focus(), 50);
                                  }}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#8C2D2D]/30 bg-white text-[11px] font-bold uppercase tracking-wider text-[#8C2D2D] hover:bg-[#8C2D2D] hover:text-white transition-all cursor-pointer shadow-sm"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  Nueva inconformidad
                                </button>
                                <div className="flex-1 h-px bg-[#EAD1D1]" />
                              </div>
                            </div>
                          )}

                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

          </div>

          {/* Minimalist GPT/Gemini style input box positioned at bottom */}
          <div className="border-t border-[#F0EFEA] pt-5 mt-8 bg-white sticky bottom-0 z-10 max-w-3xl mx-auto w-full">
            
            {/* Error Message Box */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-rose-50 p-4 rounded-lg border border-rose-200 text-rose-800 text-xs flex items-start gap-3 mb-3"
                  id="error-message-bar"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold block uppercase tracking-wider text-[10px] text-rose-950 mb-1">Error de Conectividad o API</span>
                    <p className="leading-relaxed">{error}</p>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="text-rose-500 hover:text-rose-800 p-0.5"
                    title="Cerrar"
                    type="button"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Realtime analysis helper when submitting */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-[#FAF3F3] p-3 rounded-lg border border-[#EAD1D1] flex items-center justify-between text-xs text-[#8C2D2D] mb-3"
                  id="realtime-progress-bar"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#8C2D2D] animate-ping" />
                    <span className="font-mono text-[10px] uppercase tracking-wider">
                      {LOADING_REFLECTIONS[loadingStep]}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {LOADING_REFLECTIONS.map((_, idx) => (
                      <span
                        key={idx}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${
                          idx === loadingStep ? "bg-[#8C2D2D] scale-125" : "bg-[#EAD1D1]"
                        }`}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Selector de Modo de Entrada */}
            <div className="flex gap-2 mb-3 text-[10px] sm:text-xs">
              <button
                type="button"
                onClick={() => setInputMode("individual")}
                className={`px-3 py-1.5 rounded-lg border font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  inputMode === "individual"
                    ? "bg-[#8C2D2D] text-white border-[#8C2D2D] shadow-xs"
                    : "bg-white text-[#6B685E] border-[#EAD1D1] hover:bg-[#FAF3F3]"
                }`}
                id="tab-mode-individual"
              >
                Consulta Individual
              </button>
              <button
                type="button"
                onClick={() => setInputMode("mediation")}
                className={`px-3 py-1.5 rounded-lg border font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  inputMode === "mediation"
                    ? "bg-[#8C2D2D] text-white border-[#8C2D2D] shadow-xs"
                    : "bg-white text-[#6B685E] border-[#EAD1D1] hover:bg-[#FAF3F3]"
                }`}
                id="tab-mode-mediation"
              >
                Modo Dos Voces (Mediación)
              </button>
            </div>

            <form onSubmit={handleSubmit} className="relative flex flex-col gap-2">
              {inputMode === "individual" ? (
                <div className="relative w-full">
                  <textarea
                    id="query-textarea"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ejemplo: Últimamente nos cuesta ponernos de acuerdo sobre cómo distribuir las tareas del hogar, lo que termina siempre en alejamiento mutuo..."
                    rows={2}
                    disabled={loading}
                    className="w-full rounded-xl border border-[#EAD1D1] p-4 pr-14 text-sm text-[#2D2D2D] placeholder-[#A6A296] focus:outline-none focus:ring-1 focus:ring-[#8C2D2D] bg-[#FDFBFB]/50 font-sans resize-none"
                    onKeyDown={(e) => {
                      // Enter without Shift submits form
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={loading || !query.trim()}
                    className={`absolute right-3.5 bottom-3.5 p-2 rounded-lg transition-all ${
                      query.trim() && !loading
                        ? "bg-[#8C2D2D] text-white hover:bg-[#722020] cursor-pointer"
                        : "bg-[#EAD1D1] text-[#A88585] cursor-not-allowed"
                    }`}
                    title="Enviar consulta"
                    id="btn-sub"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative w-full flex flex-col gap-3">
                  {/* Selector de roles de mediación */}
                  <div className="p-3 bg-[#FAF3F3] rounded-xl border border-[#EAD1D1] space-y-2">
                    <span className="text-[9px] uppercase tracking-widest font-extrabold text-[#A88585] block">¿Quién plantea el desacuerdo?</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setMediationInitiator("A")}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                          mediationInitiator === "A"
                            ? "bg-[#8C2D2D] border-[#8C2D2D] text-white"
                            : "bg-white border-[#EAD1D1] text-[#6B685E] hover:border-[#8C2D2D]/50"
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[9px] font-extrabold">
                          {partnerA ? partnerA[0].toUpperCase() : "A"}
                        </span>
                        {partnerA || "Miembro A"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setMediationInitiator("B")}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                          mediationInitiator === "B"
                            ? "bg-[#8C2D2D] border-[#8C2D2D] text-white"
                            : "bg-white border-[#EAD1D1] text-[#6B685E] hover:border-[#8C2D2D]/50"
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[9px] font-extrabold">
                          {partnerB ? partnerB[0].toUpperCase() : "B"}
                        </span>
                        {partnerB || "Miembro B"}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Textarea A */}
                    <div className="flex flex-col gap-1.5 w-full">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-4 h-4 rounded-full text-[8px] font-extrabold flex items-center justify-center ${
                          mediationInitiator === "A" ? "bg-[#8C2D2D] text-white" : "bg-[#EAD1D1] text-[#8C2D2D]"
                        }`}>{partnerA ? partnerA[0].toUpperCase() : "A"}</div>
                        <span className="text-[10px] font-bold text-[#8C2D2D] uppercase tracking-wider">
                          {partnerA || "Miembro A"}
                        </span>
                        {mediationInitiator === "A" && (
                          <span className="text-[8px] bg-[#8C2D2D]/10 text-[#8C2D2D] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Plantea</span>
                        )}
                        {mediationInitiator === "B" && (
                          <span className="text-[8px] bg-stone-100 text-stone-500 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Argumenta</span>
                        )}
                      </div>
                      <textarea
                        id="query-partner-a-textarea"
                        value={queryPartnerA}
                        onChange={(e) => setQueryPartnerA(e.target.value)}
                        placeholder={
                          mediationInitiator === "A"
                            ? `${partnerA || "Miembro A"}, describe el desacuerdo que quieres plantear...`
                            : `${partnerA || "Miembro A"}, explica por qué lo ves así o cuál es tu postura...`
                        }
                        rows={4}
                        disabled={loading}
                        className="w-full rounded-xl border border-[#EAD1D1] p-3.5 text-[13px] text-[#2D2D2D] placeholder-[#C4B8B8] focus:outline-none focus:ring-1 focus:ring-[#8C2D2D] bg-[#FDFBFB]/50 font-sans resize-none"
                      />
                    </div>
                    {/* Textarea B */}
                    <div className="flex flex-col gap-1.5 w-full">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-4 h-4 rounded-full text-[8px] font-extrabold flex items-center justify-center ${
                          mediationInitiator === "B" ? "bg-[#8C2D2D] text-white" : "bg-[#EAD1D1] text-[#8C2D2D]"
                        }`}>{partnerB ? partnerB[0].toUpperCase() : "B"}</div>
                        <span className="text-[10px] font-bold text-[#8C2D2D] uppercase tracking-wider">
                          {partnerB || "Miembro B"}
                        </span>
                        {mediationInitiator === "B" && (
                          <span className="text-[8px] bg-[#8C2D2D]/10 text-[#8C2D2D] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Plantea</span>
                        )}
                        {mediationInitiator === "A" && (
                          <span className="text-[8px] bg-stone-100 text-stone-500 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Argumenta</span>
                        )}
                      </div>
                      <textarea
                        id="query-partner-b-textarea"
                        value={queryPartnerB}
                        onChange={(e) => setQueryPartnerB(e.target.value)}
                        placeholder={
                          mediationInitiator === "B"
                            ? `${partnerB || "Miembro B"}, describe el desacuerdo que quieres plantear...`
                            : `${partnerB || "Miembro B"}, explica por qué lo ves así o cuál es tu postura...`
                        }
                        rows={4}
                        disabled={loading}
                        className="w-full rounded-xl border border-[#EAD1D1] p-3.5 text-[13px] text-[#2D2D2D] placeholder-[#C4B8B8] focus:outline-none focus:ring-1 focus:ring-[#8C2D2D] bg-[#FDFBFB]/50 font-sans resize-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end mt-1">
                    <button
                      type="submit"
                      disabled={loading || !queryPartnerA.trim() || !queryPartnerB.trim()}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                        queryPartnerA.trim() && queryPartnerB.trim() && !loading
                          ? "bg-[#8C2D2D] text-white hover:bg-[#722020] cursor-pointer shadow-xs"
                          : "bg-[#EAD1D1] text-[#A88585] cursor-not-allowed"
                      }`}
                      title="Enviar mediación"
                      id="btn-sub-mediation"
                    >
                      <span>Solicitar Mediación</span>
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </form>

            <div className="text-[10px] text-center text-[#A88585] mt-2 font-mono flex items-center justify-center gap-1.5">
              <span>Dr. Alianza AI analiza los aportes. Respuestas clínicas estructuradas en 4 pilares.</span>
            </div>
          </div>

        </main>
      </div>

      {/* Editorial aesthetic footer rail */}
      <footer className="bg-[#FAF3F3] border-t border-[#EAD1D1] px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-[#A88585] text-[10px] tracking-widest uppercase gap-3">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[#8C2D2D] rounded-full inline-block animate-pulse" />
          <span>Sincronizando Método Gottman & Terapia Sistémica & TCC & EFT</span>
        </div>
        <div>
          <span>© 2026 Alianza AI • Almacenamiento Clínico Encriptado Localmente</span>
        </div>
      </footer>
    </div>
  );
}
