/**
 * Opus Freelas - Strings Centralizadas (pt-BR)
 * 
 * Este arquivo serve como preparação estrutural para i18n futuro.
 * Na próxima fase de internacionalização, estas chaves poderão ser
 * movidas para arquivos JSON e processadas pelo i18next.
 */

export const strings = {
  common: {
    loading: "Carregando...",
    error: "Ocorreu um erro",
    save: "Salvar",
    cancel: "Cancelar",
    confirm: "Confirmar",
    back: "Voltar",
    requiredField: "Campo obrigatório",
  },
  home: {
    title: "Opus Freelas",
    contractorSection: "Sou Contratante",
    providerSection: "Sou Prestador",
    findProsTitle: "Encontrar Profissionais",
    findProsSubtitle: "Busque na sua região",
    createDemandTitle: "Publicar Demanda",
    createDemandSubtitle: "Descreva o que precisa",
    myDemandsTitle: "Minhas Demandas",
    myDemandsSubtitle: "Acompanhe seus pedidos",
    setupProfileTitle: "Configurar Perfil",
    setupProfileSubtitle: "Ajuste serviços e raio",
    availableDemandsTitle: "Vagas na Região",
    availableDemandsSubtitle: "Veja quem precisa de você",
  },
  auth: {
    signInTitle: "Acesso Seguro",
    signInSubtitle: "Enviamos um código por e-mail",
    emailPlaceholder: "seu@email.com",
    codePlaceholder: "Código de 6 dígitos",
    sendCode: "Enviar código",
    verifyCode: "Verificar código",
  },
  providerSetup: {
    title: "Meu Perfil",
    saving: "Salvando...",
    success: "Perfil atualizado!",
    selectCategories: "Selecione os serviços que você presta:",
    noCategoriesSelected: "Selecione pelo menos uma categoria.",
    waitingLocation: "Aguardando localização...",
  },
  demands: {
    createTitle: "Nova Demanda",
    serviceTypeLabel: "Tipo de Serviço",
    descriptionLabel: "Descrição",
    urgencyLabel: "Urgência",
    radiusLabel: "Raio Visível (km)",
    publishButton: "Publicar Demanda",
    emptyList: "Você não tem demandas publicadas.",
    availableEmpty: "Nenhuma vaga encontrada na sua região no momento.",
    status: {
      aberta: "Aberta",
      em_contato: "Em Contato",
      concluida: "Concluída",
      cancelada: "Cancelada",
      encerrada: "Encerrada",
    }
  },
  discovery: {
    title: "Profissionais",
    allCategories: "Todas as categorias",
    empty: "Nenhum prestador encontrado neste raio.",
  }
};

export default strings;
