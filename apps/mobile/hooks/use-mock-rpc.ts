import { useCallback } from "react";
import { ProviderResult, DemandResponse, CreateDemandInput } from "@amauc/shared";

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

      case "demands.create":
        const demandInput = input as CreateDemandInput;
        const newDemand: DemandResponse = {
          id: String(mockDemands.length + 1),
          contractorId: "current_user",
          ...demandInput,
          status: "aberta",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        mockDemands.push(newDemand);
        return newDemand as T;

      default:
        throw new Error(`Procedure ${procedure} not implemented in mock`);
    }
  }, []);

  return { callRpc };
}
