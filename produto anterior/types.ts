
export enum DocumentStatus {
  PENDING = 'Pendente',
  PENDING_VERIFICATION = 'Pendente de verificação',
  APPROVED = 'Aprovado',
  REJECTED = 'Necessário reenvio',
  MISSING = 'Faltante'
}

export interface ChecklistSection {
  id: string;
  name: string;
  items: DocumentItem[];
  // Nova flag: Se true, esta seção será duplicada para cada talhão selecionado pelo produtor
  iterateOverFields?: boolean;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  folder: string;
  status: 'Ativo' | 'Inativo' | 'Finalizado';
  producersLinked: number;
  createdAt: string;
  createdBy: string;
  sections: ChecklistSection[];
  
  // Nova configuração: Se true, exige login/cpf no início
  requiresProducerIdentification?: boolean;
}

// Estrutura para salvar dados do mapa
export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface PropertyField {
  id: string;
  name: string;
  area?: string; // Área calculada ou inserida
  points: GeoPoint[]; // Polígono
}

export interface PropertyMapData {
  propertyLocation?: GeoPoint; // Ponto da sede/entrada
  fields: PropertyField[]; // Lista de talhões
}

// Interface para o "Banco de Dados" de Produtores
export interface ProducerChecklistRef {
    id: string;
    name: string;
    lastInteraction: string;
}

export interface ProducerData {
  identifier: string; // CPF ou Email
  name?: string;
  savedMaps: PropertyMapData[]; // Histórico de mapas desenhados
  checklists: ProducerChecklistRef[]; // Histórico de checklists respondidos
}

export interface DocumentItem {
  id: string;
  name: string;
  itemsSent: number;
  validity: string | null;
  lastUpdate: string;
  status: DocumentStatus;
  fileUrl?: string;
  rejectionReason?: string;
  
  // Adicionado 'field_selector' e 'dropdown_select'
  type: 'file' | 'text' | 'long_text' | 'single_choice' | 'multiple_choice' | 'date' | 'property_map' | 'field_selector' | 'dropdown_select';
  options?: string[];
  
  // Configuração de Dropdown
  databaseSource?: 'fertilizers' | 'desiccation'; // Se null, usa options manuais
  askForQuantity?: boolean; // Se true, pede input numérico
  
  // Para property_map, a resposta será um JSON stringify do PropertyMapData
  // Para field_selector, a resposta será um array de IDs ou nomes dos talhões selecionados
  answer?: string | string[];
  
  // Resposta da quantidade (se askForQuantity for true)
  quantity?: string;

  // Novos campos de controle
  required: boolean;
  validityControl: boolean;
  observationEnabled?: boolean;
  observationValue?: string;
  
  // Controle de artefatos em perguntas
  requestArtifact?: boolean;
  artifactRequired?: boolean;

  aiAnalysis?: {
    flag: 'APROVADO' | 'REPROVADO';
    message: string;
    confidence: number;
  };
}

export interface HistoryLog {
  id: string;
  user: string;
  role: string;
  action: string;
  timestamp: string;
}