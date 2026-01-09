
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Users, 
  Copy, 
  ChevronLeft,
  ChevronRight,
  ClipboardList
} from 'lucide-react';
import { ChecklistTemplate, DocumentStatus } from '../types';

const ChecklistList: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);

  useEffect(() => {
    // Load from local storage
    const stored = localStorage.getItem('merx_templates');
    let loadedTemplates: ChecklistTemplate[] = [];
    if (stored) {
      try {
        loadedTemplates = JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse templates");
        loadedTemplates = [];
      }
    }

    // Check if PAGR exists, if not create it
    const hasPAGR = loadedTemplates.find(t => t.name === 'Checklist PAGR');
    if (!hasPAGR) {
        const pagrTemplate: ChecklistTemplate = {
            id: 'pagr-template-001',
            name: 'Checklist PAGR',
            folder: 'Agrária',
            status: 'Ativo',
            producersLinked: 0,
            createdAt: new Date().toLocaleDateString('pt-BR'),
            createdBy: 'Sistema',
            sections: [
                {
                    id: 'sec-ii-registros',
                    name: 'Nível II - Registros',
                    items: [
                        // Perguntas sobre posse de documentos agora são Single Choice + Artefato Opcional
                        { id: '1', name: 'Você possui os direitos de uso da terra? (Escritura, matrícula, contrato...)', type: 'single_choice', options: ['Sim', 'Não'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false, requestArtifact: true, artifactRequired: false },
                        { id: '2', name: 'Existe contrato de trabalho com os funcionários?', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false, requestArtifact: true, artifactRequired: false },
                        { id: '3', name: 'Você possui código de conduta na propriedade?', type: 'single_choice', options: ['Sim', 'Não'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false, requestArtifact: true, artifactRequired: false },
                        { id: '4', name: 'Os colaboradores conhecem e cumprem o código de conduta?', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false, observationEnabled: true },
                        { id: '5', name: 'Você possui PGR-TR e PCMSO atualizados?', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: true, requestArtifact: true, artifactRequired: false },
                        { id: '6', name: 'Registro de entrega de EPI?', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false, requestArtifact: true, artifactRequired: false },
                        { id: '7', name: 'Registro de lavagem de EPI de aplicação?', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false, requestArtifact: true, artifactRequired: false },
                        { id: '8', name: 'Treinamento em NR 31.7?', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: true, requestArtifact: true, artifactRequired: false },
                        { id: '9', name: 'Registro da destinação de resíduos?', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false, requestArtifact: true, artifactRequired: false },
                        { id: '10', name: 'Registro da destinação de resíduos contaminados?', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false, requestArtifact: true, artifactRequired: false },
                        { id: '11', name: 'Comprovante da devolução de embalagens vazias?', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false, requestArtifact: true, artifactRequired: false },
                        { id: '12', name: 'Registros de limpeza da caixa d\'água?', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false, requestArtifact: true, artifactRequired: false },
                        { id: '13', name: 'Análise de potabilidade da água?', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: true, requestArtifact: true, artifactRequired: false },
                        { id: '14', name: 'Registro de plantio, aplicação de defensivos e fertilizantes (Caderno de campo)?', type: 'single_choice', options: ['Sim', 'Não'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false, requestArtifact: true, artifactRequired: false },
                        { id: '15', name: 'Registro de condições meteorológicas na aplicação?', type: 'single_choice', options: ['Sim', 'Não'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false, requestArtifact: true, artifactRequired: false },
                        { id: '16', name: 'Produção de transgênicos de acordo com legislação?', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false, observationEnabled: true, requestArtifact: true, artifactRequired: false }
                    ]
                },
                {
                    id: 'sec-ii-in-loco',
                    name: 'Nível II - In loco',
                    items: [
                        { id: '17', name: 'Participa dos eventos técnicos da Cooperativa?', type: 'single_choice', options: ['Sim', 'Não'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: false, validityControl: false },
                        // Itens explicitamente pedindo FOTO continuam como tipo Arquivo
                        { id: '18', name: 'Foto dos Extintores', type: 'file', status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: true },
                        { id: '19', name: 'Procedimento de emergência visível?', type: 'single_choice', options: ['Sim', 'Não'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false, requestArtifact: true, artifactRequired: false },
                        { id: '20', name: 'Foto da Placa de telefones úteis', type: 'file', status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false },
                        { id: '21', name: 'Foto da Caixa de primeiros socorros', type: 'file', status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false },
                        { id: '22', name: 'Foto do Local guarda de EPIs', type: 'file', status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false },
                        { id: '23', name: 'Foto do Armazenamento de fertilizantes', type: 'file', status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false },
                        { id: '24', name: 'Foto da Coleta seletiva/Local armazenamento', type: 'file', status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false },
                        { id: '25', name: 'Foto do Recipiente lixo contaminado', type: 'file', status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false },
                        { id: '26', name: 'Foto das Instalações de moradia (se houver)', type: 'file', status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: false, validityControl: false },
                        { id: '27', name: 'Foto da Fossa séptica', type: 'file', status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false }
                    ]
                },
                {
                    id: 'sec-iii-registros',
                    name: 'Nível III - Registros',
                    items: [
                        { id: '28', name: 'Controle de estoque de defensivos', type: 'single_choice', options: ['Sim', 'Não'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false, requestArtifact: true, artifactRequired: false },
                        { id: '29', name: 'Defensivos licenciados e aplicação agronômica?', type: 'single_choice', options: ['Sim', 'Não'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false, requestArtifact: true, artifactRequired: false },
                        { id: '30', name: 'Registro manutenção maquinário', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false, requestArtifact: true, artifactRequired: false },
                        { id: '31', name: 'Registro manutenção/calibragem equipamentos', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false, requestArtifact: true, artifactRequired: false },
                        { id: '32', name: 'ASO atualizado', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: true, requestArtifact: true, artifactRequired: false },
                        { id: '33', name: 'Registro treinamento uso extintores', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false, requestArtifact: true, artifactRequired: false },
                        { id: '34', name: 'CAR (Cadastro Ambiental Rural)', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false, requestArtifact: true, artifactRequired: false },
                        { id: '35', name: 'Reserva legal e APP de acordo?', type: 'single_choice', options: ['Sim', 'Não'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false }
                    ]
                },
                {
                    id: 'sec-iii-in-loco',
                    name: 'Nível III - In loco',
                    items: [
                        { id: '36', name: 'Foto do Lava-olhos/ducha', type: 'file', status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false },
                        { id: '37', name: 'Foto da Placa de reentrada', type: 'file', status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false },
                        { id: '38', name: 'Foto do Armazém de defensivos', type: 'file', status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false },
                        { id: '39', name: 'Foto do Vestiário/banheiro próximo defensivos', type: 'file', status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false },
                        { id: '40', name: 'Foto do Kit contenção vazamentos defensivos', type: 'file', status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false },
                        { id: '41', name: 'Foto das FISPQs no local', type: 'file', status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false },
                        { id: '42', name: 'Foto do Armazenamento embalagens vazias', type: 'file', status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false },
                        { id: '43', name: 'Tríplice lavagem realizada?', type: 'single_choice', options: ['Sim', 'Não'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false, requestArtifact: true, artifactRequired: false },
                        { id: '44', name: 'Foto Armazenamento óleos e lubrificantes', type: 'file', status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false },
                        { id: '45', name: 'Foto Kit contenção óleos', type: 'file', status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false },
                        { id: '46', name: 'Foto do Ferro velho organizado', type: 'file', status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: false, validityControl: false },
                        { id: '47', name: 'Placas prevenção caça/pesca', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: false, validityControl: false, requestArtifact: true, artifactRequired: false },
                        { id: '48', name: 'Não realiza queimadas?', type: 'single_choice', options: ['Sim', 'Não'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false }
                    ]
                },
                {
                    id: 'sec-iv-registro',
                    name: 'Nível IV - Registros',
                    items: [
                        { id: '49', name: 'Controle abastecimento combustível', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: false, validityControl: false, requestArtifact: true, artifactRequired: false },
                        { id: '50', name: 'Treinamento NR 20', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: false, validityControl: true, requestArtifact: true, artifactRequired: false },
                        { id: '51', name: 'Cartão ponto', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false, requestArtifact: true, artifactRequired: false },
                        { id: '52', name: 'Acesso portal do cooperado', type: 'single_choice', options: ['Sim', 'Não'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: false, validityControl: false },
                        { id: '53', name: 'Programação de culturas', type: 'single_choice', options: ['Sim', 'Não'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: false, validityControl: false, requestArtifact: true, artifactRequired: false },
                        { id: '54', name: 'Autorização desmatamento (se houver)', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: false, validityControl: false, requestArtifact: true, artifactRequired: false }
                    ]
                },
                {
                    id: 'sec-iv-in-loco',
                    name: 'Nível IV - In loco',
                    items: [
                        { id: '55', name: 'Foto Armazenamento combustível', type: 'file', status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: false, validityControl: false },
                        { id: '56', name: 'Foto Local lavagem EPI', type: 'file', status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false },
                        { id: '57', name: 'Foto Local lavagem maquinários', type: 'file', status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false }
                    ]
                },
                {
                    id: 'sec-v-registros',
                    name: 'Nível V - Registros',
                    items: [
                        { id: '58', name: 'Plano de biodiversidade', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: false, validityControl: false, requestArtifact: true, artifactRequired: false },
                        { id: '59', name: 'Controle avistamento biodiversidade', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: false, validityControl: false, requestArtifact: true, artifactRequired: false },
                        { id: '60', name: 'Planejamento treinamentos', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: false, validityControl: false, requestArtifact: true, artifactRequired: false },
                        { id: '61', name: 'Ordens de serviço', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false, requestArtifact: true, artifactRequired: false },
                        { id: '62', name: 'Canal comunicação comunidade', type: 'single_choice', options: ['Sim', 'Não'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: false, validityControl: false },
                        { id: '63', name: 'Análise de solo', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: true, requestArtifact: true, artifactRequired: false },
                        { id: '64', name: 'Plano gestão nutrientes', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: false, validityControl: false, requestArtifact: true, artifactRequired: false },
                        { id: '65', name: 'Análise dejeto/adubo orgânico', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: false, validityControl: false, requestArtifact: true, artifactRequired: false },
                        { id: '66', name: 'Outorga de água', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: true, requestArtifact: true, artifactRequired: false },
                        { id: '67', name: 'Contratos comercialização', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false, requestArtifact: true, artifactRequired: false },
                        { id: '68', name: 'Monitoramento GEE', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: false, validityControl: false, requestArtifact: true, artifactRequired: false },
                        { id: '69', name: 'Mapeamento riscos negócio', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: false, validityControl: false, requestArtifact: true, artifactRequired: false }
                    ]
                },
                {
                    id: 'sec-v-in-loco',
                    name: 'Nível V - In loco',
                    items: [
                        { id: '70', name: 'Foto Caixa de sugestões', type: 'file', status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: false, validityControl: false },
                        { id: '71', name: 'Implementou 5S?', type: 'single_choice', options: ['Sim', 'Não'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: false, validityControl: false },
                        { id: '72', name: 'Foto Cisternas/Coleta água chuva', type: 'file', status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: false, validityControl: false },
                        { id: '73', name: 'Foto Fonte energia renovável', type: 'file', status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: false, validityControl: false },
                        { id: '74', name: 'Indicadores melhoria contínua', type: 'single_choice', options: ['Sim', 'Não'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: false, validityControl: false },
                        { id: '75', name: 'Plano de ação melhoria', type: 'single_choice', options: ['Sim', 'Não'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: false, validityControl: false },
                        { id: '76', name: 'Rastreabilidade produtos', type: 'single_choice', options: ['Sim', 'Não'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false, requestArtifact: true, artifactRequired: false }
                    ]
                },
                {
                    id: 'sec-manejo',
                    name: 'Manejo e Conservação do solo',
                    items: [
                        { id: '77', name: 'Sem pesticidas raio 30m corpos d\'água?', type: 'single_choice', options: ['Sim', 'Não'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false },
                        { id: '78', name: 'Plantio Direto > 5 anos?', type: 'single_choice', options: ['Sim', 'Não'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: false, validityControl: false, requestArtifact: true, artifactRequired: false },
                        { id: '79', name: 'Solo coberto min 10 meses?', type: 'single_choice', options: ['Sim', 'Não'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false },
                        { id: '80', name: 'Rotação culturas com milho?', type: 'single_choice', options: ['Sim', 'Não'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false },
                        { id: '81', name: 'Foto Práticas conservacionistas (curvas nível, bacias)', type: 'file', status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false },
                        { id: '82', name: 'Revolvimento solo < 10%?', type: 'single_choice', options: ['Sim', 'Não'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false },
                        { id: '83', name: 'Registro MIP', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false, requestArtifact: true, artifactRequired: false },
                        { id: '84', name: 'Foto Fontes de água protegidas', type: 'file', status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: false },
                        { id: '85', name: 'Inspeção máquinas', type: 'single_choice', options: ['Sim', 'Não', 'N/A'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: true, validityControl: true, requestArtifact: true, artifactRequired: false },
                        { id: '86', name: 'Agentes biológicos', type: 'single_choice', options: ['Sim', 'Não'], status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: false, validityControl: false },
                        { id: '87', name: 'Foto Áreas reflorestamento', type: 'file', status: DocumentStatus.MISSING, itemsSent: 0, validity: null, lastUpdate: '-', required: false, validityControl: false }
                    ]
                }
            ]
        };
        
        const newTemplates = [...loadedTemplates, pagrTemplate];
        localStorage.setItem('merx_templates', JSON.stringify(newTemplates));
        setTemplates(newTemplates);
    } else {
        setTemplates(loadedTemplates);
    }
  }, []);

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.folder.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Checklist</h1>
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
            <span>Início</span>
            <span>&gt;</span>
            <span className="text-gray-900">Gestão de Checklist</span>
          </div>
        </div>
        
        <button 
          onClick={() => navigate('/checklists/new')}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-all shadow-sm"
        >
          <Plus size={20} />
          Novo Template
        </button>
      </div>

      {filteredTemplates.length === 0 && !searchTerm ? (
        <div className="text-center py-24 bg-white rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center animate-fade-in">
          <div className="bg-emerald-50 w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-sm">
            <ClipboardList size={40} className="text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhum template criado</h3>
          <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
            Crie checklists personalizados para padronizar a coleta de documentos de seus parceiros e clientes de forma eficiente.
          </p>
          <button
            onClick={() => navigate('/checklists/new')}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2 font-medium transition-all shadow-lg shadow-emerald-200 hover:translate-y-[-2px]"
          >
            <Plus size={20} />
            Criar Primeiro Template
          </button>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por nome, pasta..." 
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-2 font-medium">
              <Filter size={18} />
              Filtros
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {filteredTemplates.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                Nenhum resultado encontrado para "{searchTerm}"
              </div>
            ) : (
              <>
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Template</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pasta</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vinculados</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Criado em</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Criado por</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTemplates.map((template) => (
                      <tr key={template.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4">
                          <span 
                            onClick={() => navigate(`/checklists/${template.id}`)}
                            className="font-medium text-gray-900 cursor-pointer hover:text-emerald-600"
                          >
                            {template.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{template.folder}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            template.status === 'Ativo' ? 'bg-emerald-100 text-emerald-800' : 
                            template.status === 'Finalizado' ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {template.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{template.producersLinked}</td>
                        <td className="px-6 py-4 text-gray-600">{template.createdAt}</td>
                        <td className="px-6 py-4 text-gray-600">{template.createdBy}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 text-gray-400">
                            <button className="p-1 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="Editar">
                              <Edit2 size={16} />
                            </button>
                            <button className="p-1 hover:text-blue-600 hover:bg-blue-50 rounded" title="Ver Vínculos">
                              <Users size={16} />
                            </button>
                            <button className="p-1 hover:text-gray-900 hover:bg-gray-100 rounded" title="Duplicar">
                              <Copy size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-sm text-gray-500">Mostrando <span className="font-medium">1</span> a <span className="font-medium">{filteredTemplates.length}</span> de <span className="font-medium">{filteredTemplates.length}</span> resultados</p>
                  <div className="flex items-center gap-2">
                    <button className="p-2 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50">
                      <ChevronLeft size={16} />
                    </button>
                    <button className="px-3 py-1 bg-emerald-500 text-white rounded font-medium">1</button>
                    <button className="p-2 border border-gray-200 rounded hover:bg-gray-50">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ChecklistList;
