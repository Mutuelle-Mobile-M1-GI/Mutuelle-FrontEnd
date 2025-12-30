import { useState, useEffect, useCallback } from 'react';
import { chatbotService, ChatMessage, ChatbotContext } from '../services/chatbot.service';
import { useCurrentUser } from './useAuth';
import { useAdminDashboard } from './useDashboard';
import { useMemberDetailByUser, useMemberFinance } from './useMember';
import { useCurrentSession } from './useSession';
import { useMutuelleConfig } from './useConfig'; // 🔧 AJOUT du hook config
import { useCurrentExercise } from './useExercise';

export function useChatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Hooks pour récupérer les données avec gestion d'erreurs
  const { data: user, isLoading: userLoading, error: userError } = useCurrentUser();
  const { data: member, isLoading: loadingMember, error: errorMember, refetch } = useMemberDetailByUser(user?.id || "");
  const { data: dashboardData, error: dashboardError } = useAdminDashboard();
  const { data: sessionData, error: sessionError } = useCurrentSession();
  const { data: exerciseData, error: exerciseError } = useCurrentExercise();
  const { data: configData, error: configError } = useMutuelleConfig(); // 🔧 VRAIE CONFIG
  
  // Hook conditionnel pour les données membre
  const { 
    data: memberData, 
    error: memberError 
  } = useMemberFinance(user?.is_membre ? (member? member.id :'') : '');

  // Génération du contexte avec gestion d'erreurs
  const generateContext = useCallback((): ChatbotContext => {
    console.log("🔍 Génération du contexte chatbot...");
    
    // Log des erreurs pour debug
    if (userError) console.warn("⚠️ Erreur user:", userError);
    if (memberError) console.warn("⚠️ Erreur member:", memberError);
    if (dashboardError) console.warn("⚠️ Erreur dashboard:", dashboardError);
    if (sessionError) console.warn("⚠️ Erreur session:", sessionError);
    if (exerciseError) console.warn("⚠️ Erreur exercise:", exerciseError);
    if (configError) console.warn("⚠️ Erreur config:", configError);
    
    console.log("📊 Données disponibles:", {
      user: !!user,
      userRole: user?.role,
      isMembre: user?.is_membre,
      memberData: !!member,
      dashboardData: !!dashboardData,
      sessionData: !!sessionData,
      exerciseData: !!exerciseData,
      configData: !!configData, // 🔧 VRAIE CONFIG
    });

    return {
      userInfo: user || null,
      memberData: (user?.is_membre && member) ? member : null,
      dashboardData: dashboardData || null,
      sessionData: sessionData || null,
      exerciseData: exerciseData || null,
      configData: configData || null, // 🔧 UTILISE LA VRAIE CONFIG
    };
  }, [
    user, member, dashboardData, sessionData, exerciseData, configData, // 🔧 AJOUT configData
    userError, memberError, dashboardError, sessionError, exerciseError, configError
  ]);

  // Initialisation du chatbot
  const initializeChatbot = useCallback(async () => {
    try {
      console.log("🔍 Initialisation du chatbot...");
      setIsLoading(true);
      setError(null);

      // Attendre que l'utilisateur soit chargé
      if (userLoading) {
        console.log("⏳ En attente du chargement de l'utilisateur...");
        return;
      }

      if (!user) {
        throw new Error("Utilisateur non connecté");
      }

      console.log("✅ Utilisateur trouvé:", {
        id: user.id,
        nom: user.nom_complet,
        role: user.role,
        is_membre: user.is_membre,
        is_admin: user.is_administrateur
      });

      // 🔧 Log de la configuration
      if (configData) {
        console.log("✅ Configuration chargée:", {
          inscription: configData.montant_inscription,
          solidarite: configData.montant_solidarite,
          taux: configData.taux_interet,
          coefficient: configData.coefficient_emprunt_max
        });
      } else {
        console.warn("⚠️ Configuration non disponible");
      }

      const context = generateContext();
      await chatbotService.initializeChat(context);

      // Message de bienvenue personnalisé
      const welcomeMessage: ChatMessage = {
        id: Date.now().toString(),
        content: `Bonjour ${user.nom_complet}! 👋\n\nJe suis votre assistant virtuel pour la mutuelle ENSPY. ${
          user.role === 'ADMINISTRATEUR' 
            ? 'En tant qu\'administrateur, je peux vous aider avec la gestion de la mutuelle et répondre à toutes vos questions techniques.' 
            : 'Je peux vous aider avec toutes vos questions concernant vos comptes, vos épargnes, emprunts et la mutuelle en général.'
        }\n\nJ'ai accès à toutes vos données personnelles et aux informations actuelles de la mutuelle pour vous donner des réponses précises.\n\nComment puis-je vous assister aujourd'hui ?`,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages([welcomeMessage]);

      // Générer des suggestions contextuelles
      try {
        const contextualSuggestions = await chatbotService.generateContextualSuggestions(context);
        setSuggestions(contextualSuggestions);
      } catch (suggError) {
        console.warn("⚠️ Erreur génération suggestions:", suggError);
        // Suggestions par défaut basées sur le rôle
        const defaultSuggestions = user.role === 'ADMINISTRATEUR' 
          ? [
              "Quelle est la situation financière globale ?",
              "Combien de membres sont en règle ?",
              "Quelles sont les alertes actuelles ?",
              "Comment créer une nouvelle session ?"
            ]
          : user.is_membre
          ? [
              "Quelle est ma situation financière ?",
              "Combien puis-je emprunter ?",
              "Comment épargner plus ?",
              "Quand puis-je retirer mes épargnes ?"
            ]
          : [
              "Comment fonctionne la mutuelle ?",
              "Comment devenir membre ?",
              "Quels sont les avantages ?",
              "Comment contacter l'administration ?"
            ];
        
        setSuggestions(defaultSuggestions);
      }

      setIsInitialized(true);
      console.log("✅ Chatbot initialisé avec succès");
    } catch (error) {
      console.error("❌ Erreur initialisation chatbot:", error);
      setError(error instanceof Error ? error.message : "Erreur d'initialisation");
    } finally {
      setIsLoading(false);
    }
  }, [user, userLoading, generateContext]);

  // Envoi d'un message
  const sendMessage = useCallback(async (content: string) => {
    if (!isInitialized || isLoading) {
      console.warn("⚠️ Tentative d'envoi message sans initialisation ou en cours de chargement");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log("📤 Envoi message:", content);

      // Ajouter le message de l'utilisateur
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        content,
        isUser: true,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMessage]);

      // Envoyer au chatbot et recevoir la réponse
      const response = await chatbotService.sendMessage(content);

      console.log("📥 Réponse reçue:", response.substring(0, 100) + "...");

      // Ajouter la réponse du bot
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("❌ Erreur envoi message:", error);
      setError(error instanceof Error ? error.message : "Erreur d'envoi");
      
      // Message d'erreur du bot
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "Désolé, je rencontre une difficulté technique momentanée. 😔\n\nPouvez-vous reformuler votre question ou réessayer dans quelques instants ?\n\nSi le problème persiste, n'hésitez pas à contacter l'administration de la mutuelle.",
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, isLoading]);

  // Utilisation d'une suggestion
  const useSuggestion = useCallback((suggestion: string) => {
    console.log("💡 Utilisation suggestion:", suggestion);
    sendMessage(suggestion);
  }, [sendMessage]);

  // Réinitialisation du chat
  const resetChat = useCallback(() => {
    console.log("🔄 Réinitialisation du chat");
    setMessages([]);
    setIsInitialized(false);
    setSuggestions([]);
    setError(null);
    initializeChatbot();
  }, [initializeChatbot]);

  // Initialisation automatique quand l'utilisateur est disponible
  useEffect(() => {
    if (user && !isInitialized && !isLoading && !userLoading) {
      console.log("🚀 Déclenchement auto-initialisation");
      initializeChatbot();
    }
  }, [user, isInitialized, isLoading, userLoading, initializeChatbot]);

  // Debug des états
  useEffect(() => {
    console.log("🔍 États chatbot:", {
      hasUser: !!user,
      userLoading,
      isInitialized,
      isLoading,
      hasError: !!error,
      messagesCount: messages.length,
      suggestionsCount: suggestions.length,
      hasConfig: !!configData,
    });
  }, [user, userLoading, isInitialized, isLoading, error, messages.length, suggestions.length, configData]);

  return {
    messages,
    isLoading,
    isInitialized,
    suggestions,
    error,
    sendMessage,
    useSuggestion,
    resetChat,
    hasError: !!error,
    // États de debug
    debug: {
      hasUser: !!user,
      userLoading,
      userRole: user?.role,
      isMembre: user?.is_membre,
      hasData: {
        member: !!member,
        dashboard: !!dashboardData,
        session: !!sessionData,
        exercise: !!exerciseData,
        config: !!configData, // 🔧 AJOUT config debug
      }
    }
  };
}