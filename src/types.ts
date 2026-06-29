export interface EvaluacionSalud {
  indicador: "SANO" | "ALERTA" | "NO SANO";
  justificacion: string;
}

export interface ClinicalCategorization {
  terminosClinicos: string[];
  explicacion: string;
}

export interface RolesAnalysis {
  ejecutor: string;
  receptor: string;
}

export interface ClinicalSuggestions {
  limitesSaludables: string[];
  pasosASeguir: string[];
  explicacionProfunda: string;
}

export interface TherapyResponse {
  evaluacionSalud: EvaluacionSalud;
  categorizacion: ClinicalCategorization;
  analisisRoles: RolesAnalysis;
  recomendacionesClinicas: ClinicalSuggestions;
  conexionAnterior: string;
  advertenciaEspecial: string;
  preguntasSugeridas: string[];
}

export interface TherapyMessage {
  id: string;
  role: "user" | "model";
  text: string;
  response?: TherapyResponse;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: TherapyMessage[];
  timestamp: string;
  partnerA?: string;
  partnerB?: string;
  mainObjective?: string;
  conflictLevel?: number;
}
