import React, { JSX } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ParsedText from 'react-native-parsed-text';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/config';

interface MarkdownMessageProps {
  content: string;
  isUser: boolean;
}

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content, isUser }) => {
  
  // Fonction pour parser et rendre le contenu pseudo-markdown
  const renderMarkdownContent = (text: string) => {
    // Diviser le texte en lignes pour traitement
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    
    let listItems: string[] = [];
    let inCodeBlock = false;
    let codeBlockContent = '';
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Gestion des blocs de code
      if (trimmedLine.startsWith('```')) {
        if (inCodeBlock) {
          // Fin du bloc de code
          elements.push(
            <View key={`code-${index}`} style={[styles.codeBlock, isUser && styles.codeBlockUser]}>
              <Text style={[styles.codeText, isUser && styles.codeTextUser]}>
                {codeBlockContent}
              </Text>
            </View>
          );
          codeBlockContent = '';
          inCodeBlock = false;
        } else {
          // Début du bloc de code
          inCodeBlock = true;
        }
        return;
      }
      
      if (inCodeBlock) {
        codeBlockContent += line + '\n';
        return;
      }
      
      // Gérer les listes en cours
      if (listItems.length > 0 && !trimmedLine.startsWith('-') && !trimmedLine.startsWith('•') && trimmedLine !== '') {
        // Fin de la liste
        elements.push(
          <View key={`list-${index}`} style={styles.listContainer}>
            {listItems.map((item, listIndex) => (
              <View key={listIndex} style={styles.listItem}>
                <Text style={[styles.bullet, isUser && styles.bulletUser]}>•</Text>
                <Text style={[styles.listText, isUser && styles.listTextUser]}>
                  {item.replace(/^[-•]\s*/, '')}
                </Text>
              </View>
            ))}
          </View>
        );
        listItems = [];
      }
      
      // Traitement des différents types de lignes
      if (trimmedLine.startsWith('###')) {
        // Titre niveau 3
        elements.push(
          <Text key={index} style={[styles.heading3, isUser && styles.heading3User]}>
            {trimmedLine.replace(/^###\s*/, '')}
          </Text>
        );
      } else if (trimmedLine.startsWith('##')) {
        // Titre niveau 2
        elements.push(
          <Text key={index} style={[styles.heading2, isUser && styles.heading2User]}>
            {trimmedLine.replace(/^##\s*/, '')}
          </Text>
        );
      } else if (trimmedLine.startsWith('#')) {
        // Titre niveau 1
        elements.push(
          <Text key={index} style={[styles.heading1, isUser && styles.heading1User]}>
            {trimmedLine.replace(/^#\s*/, '')}
          </Text>
        );
      } else if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•')) {
        // Item de liste
        listItems.push(trimmedLine);
      } else if (trimmedLine.startsWith('>')) {
        // Citation
        elements.push(
          <View key={index} style={[styles.blockquote, isUser && styles.blockquoteUser]}>
            <Text style={[styles.blockquoteText, isUser && styles.blockquoteTextUser]}>
              {trimmedLine.replace(/^>\s*/, '')}
            </Text>
          </View>
        );
      } else if (trimmedLine === '') {
        // Ligne vide - ajouter un espacement
        elements.push(<View key={index} style={styles.spacing} />);
      } else {
        // Paragraphe normal avec gestion du formatage inline
        elements.push(
          <ParsedText
            key={index}
            style={[styles.paragraph, isUser && styles.paragraphUser]}
            parse={[
              // Gras **texte**
              {
                pattern: /\*\*(.*?)\*\*/g,
                style: [styles.bold, isUser && styles.boldUser],
                renderText: (matchingString, matches) => matches[1],
              },
              // Italique *texte*
              {
                pattern: /\*(.*?)\*/g,
                style: [styles.italic, isUser && styles.italicUser],
                renderText: (matchingString, matches) => matches[1],
              },
              // Code inline `code`
              {
                pattern: /`(.*?)`/g,
                style: [styles.inlineCode, isUser && styles.inlineCodeUser],
                renderText: (matchingString, matches) => matches[1],
              },
            ]}
          >
            {trimmedLine}
          </ParsedText>
        );
      }
    });
    
    // Ajouter les items de liste restants
    if (listItems.length > 0) {
      elements.push(
        <View key="final-list" style={styles.listContainer}>
          {listItems.map((item, listIndex) => (
            <View key={listIndex} style={styles.listItem}>
              <Text style={[styles.bullet, isUser && styles.bulletUser]}>•</Text>
              <Text style={[styles.listText, isUser && styles.listTextUser]}>
                {item.replace(/^[-•]\s*/, '')}
              </Text>
            </View>
          ))}
        </View>
      );
    }
    
    return elements;
  };

  // Pour les messages utilisateur, on affiche juste le texte
  if (isUser) {
    return (
      <Text style={styles.userText}>
        {content}
      </Text>
    );
  }

  // Pour les messages bot, on rend le pseudo-markdown
  return (
    <View style={styles.container}>
      {renderMarkdownContent(content)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  userText: {
    fontSize: FONT_SIZES.md,
    lineHeight: 20,
    color: 'white',
  },
  
  // Titres
  heading1: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  heading1User: {
    color: 'white',
  },
  heading2: {
    fontSize: FONT_SIZES.md + 2,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  heading2User: {
    color: 'white',
  },
  heading3: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.xs,
  },
  heading3User: {
    color: 'rgba(255,255,255,0.9)',
  },
  
  // Paragraphes
  paragraph: {
    fontSize: FONT_SIZES.md,
    lineHeight: 20,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  paragraphUser: {
    color: 'white',
  },
  
  // Formatage inline
  bold: {
    fontWeight: '700',
    color: COLORS.text,
  },
  boldUser: {
    color: 'white',
  },
  italic: {
    fontStyle: 'italic',
    color: COLORS.textSecondary,
  },
  italicUser: {
    color: 'rgba(255,255,255,0.9)',
  },
  inlineCode: {
    backgroundColor: COLORS.surface,
    color: COLORS.primary,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: FONT_SIZES.sm,
  },
  inlineCodeUser: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
  },
  
  // Blocs de code
  codeBlock: {
    backgroundColor: COLORS.surface,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginVertical: SPACING.xs,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  codeBlockUser: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderLeftColor: 'white',
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 18,
  },
  codeTextUser: {
    color: 'white',
  },
  
  // Listes
  listContainer: {
    marginVertical: SPACING.xs,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs / 2,
  },
  bullet: {
    color: COLORS.primary,
    marginRight: SPACING.xs,
    fontWeight: '600',
  },
  bulletUser: {
    color: 'white',
  },
  listText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    lineHeight: 20,
    color: COLORS.text,
  },
  listTextUser: {
    color: 'white',
  },
  
  // Citations
  blockquote: {
    backgroundColor: COLORS.surface,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    paddingLeft: SPACING.sm,
    paddingVertical: SPACING.xs,
    marginVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  blockquoteUser: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderLeftColor: 'white',
  },
  blockquoteText: {
    fontStyle: 'italic',
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
  },
  blockquoteTextUser: {
    color: 'white',
  },
  
  // Espacement
  spacing: {
    height: SPACING.xs,
  },
});