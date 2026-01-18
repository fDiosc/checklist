
export enum DocumentStatus {
    PENDING = 'Pendente',
    PENDING_VERIFICATION = 'Pendente de verificação',
    APPROVED = 'Aprovado',
    REJECTED = 'Necessário reenvio',
    MISSING = 'Faltante'
}

export interface GeoPoint {
    lat: number;
    lng: number;
}

export interface PropertyField {
    id: string;
    name: string;
    area?: string; // e.g., "15.5 ha"
    points: GeoPoint[];
}

export interface PropertyMapData {
    propertyLocation?: GeoPoint;
    fields: PropertyField[];
    city?: string;
    state?: string;
    carCode?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    carData?: any;
    carEsgStatus?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    carEsgData?: any;
    emeCode?: string;
    ruralRegionCode?: number;
}

export interface ProducerChecklistRef {
    id: string;
    name: string;
    lastInteraction: string;
}

export interface ProducerData {
    identifier: string; // CPF ou Email
    name?: string;
    savedMaps: PropertyMapData[];
    checklists: ProducerChecklistRef[];
}

export interface DocumentItem {
    id: string;
    name: string;
    status: DocumentStatus;
    type: 'file' | 'text' | 'long_text' | 'single_choice' | 'multiple_choice' | 'date' | 'property_map' | 'field_selector' | 'dropdown_select';
    options?: string[];
    databaseSource?: string;
    askForQuantity?: boolean;
    answer?: string | string[];
    quantity?: string;
    required: boolean;
    validityControl: boolean;
    validity?: string | Date;
    observationEnabled?: boolean;
    observationValue?: string;
    requestArtifact?: boolean;
    artifactRequired?: boolean;
    fileUrl?: string;
    metadata?: {
        composition?: string;
        unit?: string;
    };
    aiAnalysis?: {
        flag: 'APROVADO' | 'REPROVADO';
        message: string;
        confidence: number;
    };
}

export interface ChecklistSection {
    id: string;
    name: string;
    items: DocumentItem[];
    iterateOverFields?: boolean;
}

export interface ChecklistTemplate {
    id: string;
    name: string;
    folder: string;
    status: 'Ativo' | 'Inativo' | 'Finalizado';
    requiresProducerIdentification?: boolean;
    sections: ChecklistSection[];
}
