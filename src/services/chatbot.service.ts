import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_CONFIG } from '../constants/config';

// 🔧 IMPORTANT: Remplace par ta vraie clé API
const GEMINI_API_KEY = GEMINI_CONFIG.API_KEY; // ⚠️ EXEMPLE - utilise ta vraie clé
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export interface ChatbotContext {
  userInfo: any;
  memberData: any;
  dashboardData: any;
  sessionData: any;
  exerciseData: any;
  configData: any;
}

// 🔧 Génération du prompt système avec gestion d'erreurs
const generateSystemPrompt = (context: ChatbotContext): string => {
  try {
    const currentDate = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `# Assistant IA - Mutuelle ENSPY

Tu es l'assistant intelligent de la mutuelle ENSPY, un chatbot expert qui aide les membres et administrateurs avec toutes leurs questions relatives à la mutuelle.

## 📅 Contexte Actuel
- Date: ${currentDate}
- Utilisateur connecté: ${context.userInfo?.nom_complet || "Utilisateur inconnu"}
- Rôle: ${context.userInfo?.role || "Non défini"}

## 🏛️ À Propos de la Mutuelle ENSPY
La mutuelle ENSPY est une organisation financière collaborative qui permet aux membres d'épargner ensemble et de bénéficier d'emprunts et d'assistances selon leurs besoins. Elle fonctionne par sessions et exercices, avec des règles strictes pour garantir l'équité et la stabilité financière.

## 💰 Configuration Actuelle de la Mutuelle
${context.configData ? `
- Montant d'inscription: ${context.configData.montant_inscription?.toLocaleString('fr-FR')} FCFA
- Montant solidarité par session: ${context.configData.montant_solidarite?.toLocaleString('fr-FR')} FCFA
- Taux d'intérêt sur emprunts: ${context.configData.taux_interet}%
- Coefficient max d'emprunt: ${context.configData.coefficient_emprunt_max}
- Durée d'un exercice: ${context.configData.duree_exercice_mois} mois
` : "⚠️ Configuration de la mutuelle: Données non disponibles"}

## 🎯 Session et Exercice en Cours
${context.sessionData ? `
- Session actuelle: ${context.sessionData.nom}
- Date début: ${context.sessionData.date_debut ? new Date(context.sessionData.date_debut).toLocaleDateString('fr-FR') : 'Non définie'}
- Date fin: ${context.sessionData.date_fin ? new Date(context.sessionData.date_fin).toLocaleDateString('fr-FR') : 'Non définie'}
- Statut: ${context.sessionData.statut}
` : "⚠️ Session courante: Données non disponibles"}

${context.exerciseData ? `
- Exercice en cours: ${context.exerciseData.nom}
- Année: ${context.exerciseData.annee}
` : "⚠️ Exercice courant: Données non disponibles"}

## 👤 Informations sur l'Utilisateur Connecté
${context.userInfo ? `
### Informations Générales
- Nom complet: ${context.userInfo.nom_complet}
- Email: ${context.userInfo.email}
- Téléphone: ${context.userInfo.telephone || "Non renseigné"}
- Rôle: ${context.userInfo.role}
- Statut du compte: ${context.userInfo.is_active ? "Actif" : "Inactif"}
` : "⚠️ Informations utilisateur: Non disponibles"}

${context.memberData && context.userInfo?.role === 'MEMBRE' ? `
### Informations de Membre
- Numéro de membre: ${context.memberData.numero_membre || "Non défini"}
- Date d'inscription: ${context.memberData.date_inscription ? new Date(context.memberData.date_inscription).toLocaleDateString('fr-FR') : "Non définie"}
- Statut: ${context.memberData.statut || "Non défini"}
- En règle: ${context.memberData.is_en_regle ? "Oui" : "Non"}

### Situation Financière
${context.memberData.donnees_financieres?.inscription ? `
**Inscription:**
- Montant total requis: ${context.memberData.donnees_financieres.inscription.montant_total_inscription?.toLocaleString('fr-FR') || 0} FCFA
- Montant payé: ${context.memberData.donnees_financieres.inscription.montant_paye_inscription?.toLocaleString('fr-FR') || 0} FCFA
- Restant à payer: ${context.memberData.donnees_financieres.inscription.montant_restant_inscription?.toLocaleString('fr-FR') || 0} FCFA
- Pourcentage payé: ${context.memberData.donnees_financieres.inscription.pourcentage_inscription?.toFixed(1) || 0}%
` : "⚠️ Données d'inscription: Non disponibles"}

${context.memberData.donnees_financieres?.epargne ? `
**Épargne:**
- Épargne totale: ${context.memberData.donnees_financieres.epargne.epargne_totale?.toLocaleString('fr-FR') || 0} FCFA
- Épargne de base: ${context.memberData.donnees_financieres.epargne.epargne_base?.toLocaleString('fr-FR') || 0} FCFA
- Intérêts reçus: ${context.memberData.donnees_financieres.epargne.interets_recus?.toLocaleString('fr-FR') || 0} FCFA
` : "⚠️ Données d'épargne: Non disponibles"}

${context.memberData.donnees_financieres?.emprunt ? `
**Emprunts:**
- A un emprunt en cours: ${context.memberData.donnees_financieres.emprunt.a_emprunt_en_cours ? "Oui" : "Non"}
- Montant max empruntable: ${context.memberData.donnees_financieres.emprunt.montant_max_empruntable?.toLocaleString('fr-FR') || 0} FCFA
- Nombre d'emprunts total: ${context.memberData.donnees_financieres.emprunt.nombre_emprunts_total || 0}
${context.memberData.donnees_financieres.emprunt.a_emprunt_en_cours ? `
- Montant emprunt en cours: ${context.memberData.donnees_financieres.emprunt.montant_emprunt_en_cours?.toLocaleString('fr-FR') || 0} FCFA
- Montant à rembourser: ${context.memberData.donnees_financieres.emprunt.montant_total_a_rembourser?.toLocaleString('fr-FR') || 0} FCFA
- Montant déjà remboursé: ${context.memberData.donnees_financieres.emprunt.montant_deja_rembourse?.toLocaleString('fr-FR') || 0} FCFA
- Restant à rembourser: ${context.memberData.donnees_financieres.emprunt.montant_restant_a_rembourser?.toLocaleString('fr-FR') || 0} FCFA
- Progression: ${context.memberData.donnees_financieres.emprunt.pourcentage_rembourse?.toFixed(1) || 0}%
` : ""}
` : "⚠️ Données d'emprunts: Non disponibles"}
` : context.userInfo?.role === 'ADMINISTRATEUR' ? `
### Vous êtes un Administrateur
Vous avez accès à toutes les fonctionnalités d'administration de la mutuelle.
` : "⚠️ Données de membre: Non disponibles (utilisateur non membre)"}

## 📊 Vue d'Ensemble de la Mutuelle
${context.dashboardData ? `
### Fonds Social
- Montant total: ${context.dashboardData.fonds_social?.montant_total?.toLocaleString('fr-FR') || 0} FCFA

### Trésor
- Cumul total épargnes: ${context.dashboardData.tresor?.cumul_total_epargnes?.toLocaleString('fr-FR') || 0} FCFA
- Nombre de membres: ${context.dashboardData.tresor?.nombre_membres || 0}

### Emprunts en Cours
- Nombre: ${context.dashboardData.emprunts_en_cours?.nombre || 0}
- Montant total attendu: ${context.dashboardData.emprunts_en_cours?.montant_total_attendu?.toLocaleString('fr-FR') || 0} FCFA
` : "⚠️ Données du tableau de bord: Non disponibles"}

## 🎯 Directives de Comportement

1. **Sois professionnel et bienveillant** - Tu représentes la mutuelle ENSPY
2. **Utilise les données disponibles** - Référence-toi aux informations ci-dessus pour donner des réponses précises
3. **Adapte ton langage** selon le rôle de l'utilisateur (membre vs administrateur)
4. **Sois précis avec les montants** - Utilise toujours le format avec séparateurs de milliers et "FCFA"
5. **Explique clairement** les procédures et règlements de la mutuelle
6. **Redirige si nécessaire** - Si tu ne peux pas répondre, explique comment obtenir l'information
7. **Sois proactif** - Propose des actions ou suggestions pertinentes
8. **Respecte la confidentialité** - Ne partage que les informations appropriées au rôle de l'utilisateur

## 📝 Format de Réponse

Utilise le format Markdown pour structurer tes réponses :

- **Titres** : Utilise # ## ### pour hiérarchiser
- **Listes** : Utilise - ou • pour les listes à puces
- **Gras** : Utilise **texte** pour mettre en valeur
- **Italique** : Utilise *texte* pour l'emphase
- **Tableaux** : Utilise la syntaxe Markdown pour les données tabulaires
- **Citations** : Utilise > pour les citations importantes
Assure-toi que tes réponses soient bien structurées et lisibles.

Réponds toujours en français, sois précis et utilise les données disponibles pour personnaliser tes réponses.`;

  } catch (error) {
    console.error("❌ Erreur génération prompt:", error);
    return `Tu es l'assistant de la mutuelle ENSPY. L'utilisateur connecté est ${context.userInfo?.nom_complet || "un utilisateur"}. Aide-le avec ses questions sur la mutuelle.`;
  }
};

export class ChatbotService {
  private model: any;
  private chatSession: any;

  constructor() {
    try {
      this.model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash-exp",
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 2048,
        },
      });
      console.log("✅ Modèle Gemini initialisé");
    } catch (error) {
      console.error("❌ Erreur initialisation modèle Gemini:", error);
      throw error;
    }
  }

  async initializeChat(context: ChatbotContext): Promise<void> {
    try {
      console.log("🔍 Initialisation session de chat...");
      const systemPrompt = generateSystemPrompt(context);
      
      this.chatSession = this.model.startChat({
        history: [
          {
            role: "user",
            parts: [{ text: systemPrompt }],
          },
          {
            role: "model",
            parts: [{ 
              text: `Parfait ! Je suis maintenant configuré avec toutes les informations sur ${context.userInfo?.nom_complet || "l'utilisateur"} et la mutuelle ENSPY. Je suis prêt à l'assister.` 
            }],
          },
        ],
      });

      console.log("✅ Session de chat initialisée");
    } catch (error) {
      console.error("❌ Erreur initialisation session:", error);
      throw error;
    }
  }

  async sendMessage(message: string): Promise<string> {
    try {
      if (!this.chatSession) {
        throw new Error("Session de chat non initialisée");
      }
  
      console.log("📤 Envoi message au modèle Gemini...");
      
      const result = await this.chatSession.sendMessage(message);
      const response = result.response.text();
      
      // 🔧 AJOUTE le formatage ici
      const formattedResponse = this.formatResponse(response);
      
      console.log("📥 Réponse formatée reçue du modèle");
      return formattedResponse;
    } catch (error) {
      console.error("❌ Erreur envoi message Gemini:", error);
      throw error;
    }
  }

  async generateContextualSuggestions(context: ChatbotContext): Promise<string[]> {
    const suggestions: string[] = [];

    try {
      // Suggestions basées sur le rôle
      if (context.userInfo?.role === 'MEMBRE') {
        suggestions.push("Quelle est ma situation financière ?");
        
        if (context.memberData?.donnees_financieres?.emprunt?.montant_max_empruntable > 0) {
          suggestions.push("Combien puis-je emprunter ?");
        }
        
        if (!context.memberData?.donnees_financieres?.inscription?.inscription_complete) {
          suggestions.push("Comment compléter mon inscription ?");
        }
        
        suggestions.push("Comment épargner efficacement ?");
      } else if (context.userInfo?.role === 'ADMINISTRATEUR') {
        suggestions.push("Situation générale de la mutuelle");
        suggestions.push("Membres en règle");
        suggestions.push("Alertes actuelles");
      }

      // Suggestions générales
      suggestions.push("Comment fonctionnent les emprunts ?");
      suggestions.push("Types d'assistance disponibles");
      suggestions.push("Calcul des intérêts");

      return suggestions.slice(0, 4);
    } catch (error) {
      console.error("❌ Erreur génération suggestions:", error);
      return [
        "Comment fonctionne la mutuelle ?",
        "Quels sont mes droits ?",
        "Comment contacter l'administration ?",
        "Procédures d'épargne"
      ];
    }
  }

  private formatResponse(response: string): string {
    try {
      // Nettoyer la réponse pour un meilleur rendu Markdown
      let formatted = response
        // Assurer les sauts de ligne avant les titres
        .replace(/([^\n])(#{1,3}\s)/g, '$1\n\n$2')
        // Assurer les sauts de ligne après les titres
        .replace(/(#{1,3}\s[^\n]+)([^\n])/g, '$1\n\n$2')
        // Assurer les espaces autour des listes
        .replace(/([^\n])(\n[-•]\s)/g, '$1\n$2')
        .replace(/([-•]\s[^\n]+)([^\n])/g, '$1\n$2')
        // Assurer les espaces autour des blocs de code
        .replace(/([^\n])(```)/g, '$1\n\n$2')
        .replace(/(```[^`]+```)([^\n])/g, '$1\n\n$2')
        // Nettoyer les multiples sauts de ligne
        .replace(/\n{3,}/g, '\n\n');
  
      return formatted.trim();
    } catch (error) {
      console.warn("⚠️ Erreur formatage réponse:", error);
      return response;
    }
  }
}

export const chatbotService = new ChatbotService();