import React, { useState, useEffect, useMemo } from "react";
import { View, TouchableOpacity, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { COLORS } from "../constants/config";

// Importe ici tes mêmes hooks de données pour calculer le total
import { useAuthContext } from "../context/AuthContext";
import { useMemberDetailByUser } from "../hooks/useMember";
import { useLoans, useRepayments } from "../hooks/useLoan";
import { useSolidarityPayments } from "../hooks/useSolidarity";
import { useRenflouements } from "../hooks/useRenflouement";
import { useSavings } from "../hooks/useSaving";
import { useAssistancesByMember } from "../hooks/useAssistance";
import { useInscriptionPayments } from "../hooks/useInscription";

export default function NotificationButton() {
  const navigation = useNavigation<any>();
  const { user } = useAuthContext();
  const [hasBadge, setHasBadge] = useState(false);

  // 1. Récupération des données pour compter les opérations
  const { data: member } = useMemberDetailByUser(user?.id);
  const { data: loansRaw } = useLoans({ membre: member?.id });
  const { data: repaymentsRaw } = useRepayments({ membre: member?.id });
  const { data: solidarityRaw } = useSolidarityPayments({ membre: member?.id });
  const { data: renflouementRaw } = useRenflouements({ membre: member?.id });
  const { data: savingsRaw } = useSavings({ membre: member?.id });
  const { data: assistancesRaw } = useAssistancesByMember(member?.id || "");
  const { data: inscriptionPaymentsRaw } = useInscriptionPayments();

  // 2. Calcul du nombre total d'éléments actuels en BD
  const currentTotalCount = useMemo(() => {
    if (!member) return 0;

    const loans = Array.isArray(loansRaw) ? loansRaw : (loansRaw as any)?.results ?? [];
    const repayments = Array.isArray(repaymentsRaw) ? repaymentsRaw : (repaymentsRaw as any)?.results ?? [];
    const solidarites = Array.isArray(solidarityRaw) ? solidarityRaw : (solidarityRaw as any)?.results ?? [];
    const renflouements = Array.isArray(renflouementRaw) ? renflouementRaw : (renflouementRaw as any)?.results ?? [];
    const savings = Array.isArray(savingsRaw) ? savingsRaw : (savingsRaw as any)?.results ?? [];
    const assistances = Array.isArray(assistancesRaw) ? assistancesRaw : (assistancesRaw as any)?.assistances ?? [];
    const inscriptionPayments = Array.isArray(inscriptionPaymentsRaw) ? inscriptionPaymentsRaw : (inscriptionPaymentsRaw as any)?.results ?? [];
    const memberInscriptionPayments = inscriptionPayments.filter((p: any) => p.membre === member?.id);

    // Somme de toutes les lignes
    let total = loans.length + repayments.length + solidarites.length + savings.length + assistances.length + memberInscriptionPayments.length;
    
    // Pour le renflouement, on compte les sous-paiements
    renflouements.forEach((r: any) => {
      total += (r.paiements_details || []).length;
    });

    return total;
  }, [loansRaw, repaymentsRaw, renflouementRaw, solidarityRaw, savingsRaw, assistancesRaw, inscriptionPaymentsRaw, member]);

  // 3. Comparer avec le stockage local à chaque changement du total en BD
  useEffect(() => {
    const checkUnreadNotifications = async () => {
      if (currentTotalCount === 0) return;

      const storageKey = `last_read_count_${member?.id}`;
      const lastReadCountStr = await AsyncStorage.getItem(storageKey);
      const lastReadCount = lastReadCountStr ? parseInt(lastReadCountStr, 10) : 0;

      // Si le nombre en BD est plus grand que ce qu'on a vu -> Marqueur rouge !
      if (currentTotalCount > lastReadCount) {
        setHasBadge(true);
      } else {
        setHasBadge(false);
      }
    };

    checkUnreadNotifications();
  }, [currentTotalCount, member?.id]);

  // 4. Clic sur le bouton : On efface le badge et on enregistre le nouveau total
  const handlePress = async () => {
    setHasBadge(false);
    if (member?.id) {
      const storageKey = `last_read_count_${member?.id}`;
      await AsyncStorage.setItem(storageKey, currentTotalCount.toString());
    }
    navigation.navigate("Notifications"); // Mets ici le nom exact de ta route de notif
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.button}>
      <Ionicons name="notifications-outline" size={26} color={COLORS.text} />
      {hasBadge && <View style={styles.badge} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "red", // Marqueur rouge
    borderWidth: 1.5,
    borderColor: "#FFFFFF", // Aligné proprement sur l'icône
  },
});