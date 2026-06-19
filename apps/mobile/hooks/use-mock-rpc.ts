import { useCallback } from "react";
import { ProviderResult, DemandResponse, CreateDemandInput, DemandStatus } from "@amauc/shared";
import { DEV_MOCK_USER_ID } from "../lib/auth-constants";

// Mock data para demonstração
const mockProviders: ProviderResult[] = [
  {
    clerkUserId: "user1",
    isProvider: true,
    serviceCategories: ["Roçada / Capina", "Serviços Gerais / Pequenos Reparos"],
    distanceMeters: 2500,
  },
  {
    clerkUserId: "user2", 
    isProvider: true,
    serviceCategories: ["Diarista / Faxina", "Pintura"],
    distanceMeters: 5200,
  },
  {
    clerkUserId: "user3",
    isProvider: true,
    serviceCategories: ["Operador de Máquina Agrícola", "Pedreiro / Servente"],
    distanceMeters: 8700,
  },
  {
    clerkUserId: "user4",
    isProvider: true,
    serviceCategories: ["Eletricista / Encanador", "Cuidado com Animais"],
    distanceMeters: 12300,
  },
];

const MOCK_USER_ID = DEV_MOCK_USER_ID;

const DUPLICATE_WINDOW_MS = 5_000;
let createInFlight = false;

const mockDemands: DemandResponse[] = [
  {
    id: "a1111111-1111-4111-8111-111111111111",
    contractorId: MOCK_USER_ID,
    serviceType: "Capina de Terreno",
    description: "Preciso de capina em um terreno de 500m². Mato alto e precisa de limpeza completa antes do inverno.",
    municipality: "Concórdia",
    urgency: "media",
    status: "aberta",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    latitude: -27.23,
    longitude: -52.02,
    visibilityRadius: 10,
  },
  {
    id: "a2222222-2222-4222-8222-222222222222",
    contractorId: MOCK_USER_ID,
    serviceType: "Diarista",
    description: "Busco diarista para limpeza semanal de casa de 3 quartos. Trabalho leve e organizado.",
    municipality: "Concórdia",
    urgency: "baixa",
    status: "em_contato",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    latitude: -27.24,
    longitude: -52.01,
    visibilityRadius: 5,
  },
  {
    id: "a3333333-3333-4333-8333-333333333333",
    contractorId: MOCK_USER_ID,
    serviceType: "Pintura Externa",
    description: "Preciso pintar muro e portão de ferro. Serviço já encerrado após contratação do profissional.",
    municipality: "Concórdia",
    urgency: "baixa",
    status: "encerrada",
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
    updatedAt: new Date().toISOString(),
    latitude: -27.25,
    longitude: -52.03,
    visibilityRadius: 10,
  },
];

export function useMockRpc() {
  const callRpc = useCallback(async <T = unknown>(procedure: string, input?: unknown): Promise<T> => {
    // Simula delay de rede
    await new Promise(resolve => setTimeout(resolve, 800));

    switch (procedure) {
      case "discovery.searchProviders":
        const searchInput = input as any;
        let filteredProviders = mockProviders;
        
        if (searchInput.category) {
          filteredProviders = mockProviders.filter(p => 
            p.serviceCategories.includes(searchInput.category)
          );
        }
        
        return filteredProviders as T;

      case "demands.listVisible":
        return [
          {
            id: "mock_demand_1",
            contractorId: "other_user",
            serviceType: "Roçada / Capina",
            description: "Preciso roçar 2 lotes no bairro dos estados. Mato alto.",
            municipality: "Concórdia",
            latitude: -27.23,
            longitude: -52.02,
            urgency: "alta",
            visibilityRadius: 20,
            status: "aberta",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ] as T;

      case "demands.listMyDemands":
        return mockDemands as T;

      case "demands.create": {
        if (createInFlight) {
          throw new Error("Duplicate demand — publicação já em andamento");
        }

        const demandInput = input as CreateDemandInput;
        const duplicate = mockDemands.find(
          (d) =>
            d.contractorId === MOCK_USER_ID &&
            d.serviceType === demandInput.serviceType &&
            d.description === demandInput.description &&
            Date.now() - new Date(d.createdAt).getTime() < DUPLICATE_WINDOW_MS
        );
        if (duplicate) {
          const err = new Error("Duplicate demand — demanda idêntica criada recentemente");
          (err as Error & { status?: number }).status = 409;
          throw err;
        }

        createInFlight = true;
        try {
          const newDemand: DemandResponse = {
            id: `a0000000-0000-4000-8000-${String(mockDemands.length + 1).padStart(12, "0")}`,
            contractorId: MOCK_USER_ID,
            ...demandInput,
            status: "aberta",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          mockDemands.unshift(newDemand);
          return newDemand as T;
        } finally {
          createInFlight = false;
        }
      }

      case "demands.update": {
        const updateInput = input as { id: string; status?: DemandStatus } & Partial<CreateDemandInput>;
        const index = mockDemands.findIndex((d) => d.id === updateInput.id);
        if (index < 0) {
          throw new Error("Demanda nao encontrada");
        }
        if (mockDemands[index].contractorId !== MOCK_USER_ID) {
          throw new Error("Apenas quem criou a demanda pode edita-la");
        }
        // Permite editar mesmo se encerrada no mock para paridade com a API real
        const { id: _id, ...fields } = updateInput;
        mockDemands[index] = {
          ...mockDemands[index],
          ...fields,
          updatedAt: new Date().toISOString(),
        };
        return mockDemands[index] as T;
      }

      case "demands.delete": {
        const { id } = input as { id: string };
        const index = mockDemands.findIndex((d) => d.id === id);
        if (index < 0) {
          throw new Error("Demanda nao encontrada");
        }
        if (mockDemands[index].contractorId !== MOCK_USER_ID) {
          throw new Error("Apenas quem criou a demanda pode remove-la");
        }
        // Permite deletar qualquer demanda no mock para paridade com a API real
        mockDemands.splice(index, 1);
        return { deleted: true, id } as T;
      }

      case "identity.getProfile":
        return {
          clerkUserId: "current_user",
          isContractor: true,
          isProvider: false,
          serviceCategories: [],
        } as T;

      case "identity.updateRoles":
        return {
          clerkUserId: "current_user",
          isContractor: true,
          isProvider: (input as { isProvider?: boolean })?.isProvider ?? true,
        } as T;

      case "identity.updateProviderProfile":
        return {
          clerkUserId: "current_user",
          isProvider: true,
          serviceCategories: (input as { serviceCategories?: string[] })?.serviceCategories ?? [],
        } as T;

      default:
        throw new Error(`Procedure ${procedure} not implemented in mock`);
    }
  }, []);

  return { callRpc };
}
