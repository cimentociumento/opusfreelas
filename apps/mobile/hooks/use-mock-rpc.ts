import { useCallback } from "react";
import { ProviderResult, DemandResponse, CreateDemandInput, DemandStatus } from "@amauc/shared";

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

const mockDemands: DemandResponse[] = [
  {
    id: "1",
    contractorId: "current_user",
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
    id: "2",
    contractorId: "current_user",
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

      case "demands.listMyDemands":
        return mockDemands as T;

      case "demands.create": {
        const demandInput = input as CreateDemandInput;
        const duplicate = mockDemands.find(
          (d) =>
            d.serviceType === demandInput.serviceType &&
            d.description === demandInput.description &&
            Date.now() - new Date(d.createdAt).getTime() < 60_000
        );
        if (duplicate) {
          return duplicate as T;
        }

        const newDemand: DemandResponse = {
          id: String(mockDemands.length + 1),
          contractorId: "current_user",
          ...demandInput,
          status: "aberta",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        mockDemands.unshift(newDemand);
        return newDemand as T;
      }

      case "demands.update": {
        const updateInput = input as { id: string; status?: DemandStatus } & Partial<CreateDemandInput>;
        const index = mockDemands.findIndex((d) => d.id === updateInput.id);
        if (index < 0) {
          throw new Error("Demanda nao encontrada");
        }
        const { id: _id, ...fields } = updateInput;
        mockDemands[index] = {
          ...mockDemands[index],
          ...fields,
          updatedAt: new Date().toISOString(),
        };
        return mockDemands[index] as T;
      }

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
