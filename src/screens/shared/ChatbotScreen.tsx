import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Keyboard,
  Dimensions,
  StatusBar,
} from "react-native";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../../constants/config";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useChatbot } from "../../hooks/useChatbot";
import { ChatMessage } from "../../services/chatbot.service";
import { MarkdownMessage } from "../../components/MarkdownMessage";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ChatbotScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  // États
  const [inputText, setInputText] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [inputHeight, setInputHeight] = useState(44);
  
  // Refs
  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);

  const {
    messages,
    isLoading,
    isInitialized,
    suggestions,
    error,
    sendMessage,
    useSuggestion,
    resetChat,
    hasError,
  } = useChatbot();

  // 🔧 Gestion du clavier
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        console.log("⌨️ Clavier ouvert, hauteur:", e.endCoordinates.height);
        setKeyboardHeight(e.endCoordinates.height);
        setIsKeyboardVisible(true);
        // Auto-scroll vers le bas quand le clavier s'ouvre
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        console.log("⌨️ Clavier fermé");
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
  }, []);

  // 🔧 Auto-scroll amélioré
  const scrollToBottom = useCallback(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 🔧 Gestion envoi de message CORRIGÉE
  const handleSendMessage = useCallback(() => {
    const trimmedText = inputText.trim();
    
    if (trimmedText && !isLoading && isInitialized) {
      console.log("📤 Envoi message:", trimmedText);
      
      // Envoyer le message
      sendMessage(trimmedText);
      
      // 🔧 CORRECTION: Vider le champ APRÈS l'envoi
      setInputText("");
      
      // 🔧 CORRECTION: Garder le focus sur l'input
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
      
      // Scroll vers le bas
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [inputText, isLoading, isInitialized, sendMessage]);

  // 🔧 Gestion suggestions
  const handleSuggestionPress = useCallback((suggestion: string) => {
    console.log("💡 Suggestion sélectionnée:", suggestion);
    setInputText(suggestion);
    // Focus sur l'input après sélection
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 100);
  }, []);

  // 🔧 Gestion retry
  const handleRetry = useCallback(() => {
    if (hasError) {
      console.log("🔄 Retry chatbot");
      resetChat();
    }
  }, [hasError, resetChat]);

  // 🔧 Gestion hauteur input dynamique
  const handleContentSizeChange = useCallback((event: any) => {
    const newHeight = Math.min(Math.max(44, event.nativeEvent.contentSize.height + 16), 120);
    setInputHeight(newHeight);
  }, []);

  // 🔧 Rendu message optimisé
  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => (
    <View style={[
      styles.messageContainer,
      item.isUser ? styles.userMessage : styles.botMessage
    ]}>
      {!item.isUser && (
        <View style={styles.botAvatar}>
          <Ionicons name="chatbubbles" size={16} color="white" />
        </View>
      )}
      <View style={[
        styles.messageBubble,
        item.isUser ? styles.userBubble : styles.botBubble
      ]}>
        <MarkdownMessage 
          content={item.content} 
          isUser={item.isUser} 
        />
        <Text style={[
          styles.messageTime,
          item.isUser ? styles.userTime : styles.botTime
        ]}>
          {item.timestamp.toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </View>
    </View>
  ), []);

  // 🔧 Rendu suggestion optimisé
  const renderSuggestion = useCallback(({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.suggestionButton,
        isLoading && styles.suggestionButtonDisabled
      ]}
      onPress={() => handleSuggestionPress(item)}
      disabled={isLoading}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.suggestionText,
        isLoading && styles.suggestionTextDisabled
      ]}>
        {item}
      </Text>
    </TouchableOpacity>
  ), [isLoading, handleSuggestionPress]);

  // 🔧 Header avec états
  const renderHeader = useCallback(() => (
    <View style={styles.headerContainer}>
      {/* Message de bienvenue */}
      {!isInitialized && !hasError && (
        <View style={styles.welcomeContainer}>
          <View style={styles.botAvatar}>
            <Ionicons name="chatbubbles" size={20} color="white" />
          </View>
          <View style={styles.welcomeBubble}>
            <Text style={styles.welcomeText}>
              Initialisation de votre assistant IA personnalisé...
            </Text>
            <ActivityIndicator size="small" color={COLORS.primary} style={styles.welcomeLoader} />
          </View>
        </View>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && !hasError && isInitialized && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>💡 Suggestions :</Text>
          <FlatList
            data={suggestions}
            renderItem={renderSuggestion}
            keyExtractor={(item, index) => `suggestion-${index}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsList}
          />
        </View>
      )}

      {/* Erreur */}
      {hasError && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={24} color={COLORS.error} />
          <Text style={styles.errorText}>
            {error || "Une erreur s'est produite"}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={handleRetry}
            activeOpacity={0.8}
          >
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  ), [isInitialized, hasError, suggestions, error, handleRetry, renderSuggestion]);

  // 🔧 Footer avec typing indicator
  const renderFooter = useCallback(() => (
    <View style={styles.footerContainer}>
      {isLoading && (
        <View style={styles.typingIndicator}>
          <View style={styles.botAvatar}>
            <Ionicons name="chatbubbles" size={16} color="white" />
          </View>
          <View style={styles.typingBubble}>
            <Text style={styles.typingText}>L'assistant réfléchit</Text>
            <View style={styles.typingDots}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          </View>
        </View>
      )}
      {/* Espace pour le clavier */}
      <View style={{ height: SPACING.lg }} />
    </View>
  ), [isLoading]);

  // 🔧 Calcul de la hauteur disponible
  const availableHeight = SCREEN_HEIGHT - insets.top - insets.bottom - keyboardHeight;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      
      {/* Header fixe */}
      <View style={[styles.header, { paddingTop: insets.top > 0 ? 0 : SPACING.md }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Assistant IA</Text>
          <Text style={styles.headerSubtitle}>
            {isInitialized ? "En ligne" : "Initialisation..."}
          </Text>
        </View>
        
        <TouchableOpacity 
          onPress={resetChat}
          style={styles.headerButton}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Zone de chat adaptative */}
      <View style={[
        styles.chatWrapper,
        { 
          height: availableHeight - 80, // 80 = hauteur approximative du header
          marginBottom: keyboardHeight > 0 ? 0 : insets.bottom 
        }
      ]}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.chatContainer,
            { paddingBottom: SPACING.xl }
          ]}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
          style={styles.chatArea}
          keyboardShouldPersistTaps="handled"
          maintainVisibleContentPosition={{
            minIndexForVisible: Math.max(0, messages.length - 3),
          }}
        />
      </View>

      {/* Zone d'input fixe en bas */}
      <View style={[
        styles.inputArea,
        { 
          paddingBottom: Math.max(insets.bottom, SPACING.md),
          transform: [{ translateY: -keyboardHeight }]
        }
      ]}>
        <View style={[
          styles.inputContainer,
          { minHeight: Math.max(44, inputHeight) }
        ]}>
          <TextInput
            ref={textInputRef}
            style={[
              styles.textInput,
              { height: Math.max(44, inputHeight) }
            ]}
            value={inputText}
            onChangeText={setInputText}
            onContentSizeChange={handleContentSizeChange}
            placeholder="Tapez votre message..."
            placeholderTextColor={COLORS.textLight}
            multiline
            maxLength={800}
            editable={isInitialized && !isLoading}
            onSubmitEditing={handleSendMessage}
            blurOnSubmit={false}
            returnKeyType="send"
            textAlignVertical="top"
            autoCorrect={true}
            autoCapitalize="sentences"
            keyboardType="default"
          />
          
          <TouchableOpacity
            style={[
              styles.sendButton,
              { 
                backgroundColor: (inputText.trim() && isInitialized && !isLoading) 
                  ? COLORS.primary 
                  : COLORS.textLight,
                opacity: (inputText.trim() && isInitialized && !isLoading) ? 1 : 0.6
              }
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || !isInitialized || isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="send" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>

        {/* Indicateur de statut */}
        <View style={styles.statusIndicator}>
          <View style={[
            styles.statusDot,
            { backgroundColor: isInitialized ? COLORS.success : COLORS.warning }
          ]} />
          <Text style={styles.statusText}>
            {!isInitialized 
              ? "Initialisation..." 
              : isLoading 
              ? "En cours de traitement..."
              : `${messages.length} message${messages.length > 1 ? 's' : ''}`
            }
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
    elevation: 2,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerButton: {
    padding: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  headerInfo: {
    alignItems: "center",
    flex: 1,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Chat
  chatWrapper: {
    flex: 1,
  },
  chatArea: {
    flex: 1,
  },
  chatContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  headerContainer: {
    marginBottom: SPACING.md,
  },
  footerContainer: {
    paddingTop: SPACING.md,
  },

  // Messages
  messageContainer: {
    flexDirection: "row",
    marginBottom: SPACING.md,
    alignItems: "flex-end",
  },
  userMessage: {
    justifyContent: "flex-end",
  },
  botMessage: {
    justifyContent: "flex-start",
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.sm,
    elevation: 2,
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 6,
  },
  botBubble: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  messageTime: {
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
    fontWeight: "500",
  },
  userTime: {
    color: "rgba(255,255,255,0.8)",
    textAlign: "right",
  },
  botTime: {
    color: COLORS.textLight,
  },

  // Welcome & Loading
  welcomeContainer: {
    flexDirection: "row",
    marginBottom: SPACING.lg,
    alignItems: "flex-end",
  },
  welcomeBubble: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  welcomeText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    flex: 1,
  },
  welcomeLoader: {
    marginLeft: SPACING.sm,
  },

  // Typing
  typingIndicator: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: SPACING.md,
  },
  typingBubble: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
  },
  typingText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },
  typingDots: {
    marginLeft: SPACING.sm,
  },

  // Suggestions
  suggestionsContainer: {
    marginBottom: SPACING.lg,
  },
  suggestionsTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  suggestionsList: {
    paddingRight: SPACING.lg,
  },
  suggestionButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
    elevation: 1,
  },
  suggestionButtonDisabled: {
    opacity: 0.5,
    borderColor: COLORS.textLight,
  },
  suggestionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: "600",
  },
  suggestionTextDisabled: {
    color: COLORS.textLight,
  },

  // Error
  errorContainer: {
    backgroundColor: COLORS.errorLight || '#ffebee',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: "center",
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  errorText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.error,
    textAlign: "center",
    marginVertical: SPACING.sm,
    fontWeight: "500",
  },
  retryButton: {
    backgroundColor: COLORS.error,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    elevation: 2,
  },
  retryText: {
    color: "white",
    fontWeight: "700",
    fontSize: FONT_SIZES.md,
  },

  // Input Area
  inputArea: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    elevation: 8,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    elevation: 1,
  },
  textInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    lineHeight: 20,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: SPACING.sm,
    elevation: 2,
  },

  // Status
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: SPACING.xs,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    fontWeight: "500",
  },
});