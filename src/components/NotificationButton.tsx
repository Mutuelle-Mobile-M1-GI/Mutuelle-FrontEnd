import React, { useState, useEffect, useMemo } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { COLORS } from "../constants/config";

import { useAuthContext } from "../context/AuthContext";
import { useMemberDetailByUser } from "../hooks/useMember";
import { useLoans, useRepayments } from "../hooks/useLoan";
import { useSolidarityPayments } from "../hooks/useSolidarity";
import { useRenflouements } from "../hooks/useRenflouement";
import { useSavings } from "../hooks/useSaving";
import { useAssistances, useAssistancesByMember } from "../hooks/useAssistance";
import { useInscriptionPayments } from "../hooks/useInscription";

export default function NotificationButton() {
  const navigation = useNavigation<any>();
  const { user } = useAuthContext();
  const [hasBadge, setHasBadge] = useState(false);

  const isMemberRole = user?.role === "MEMBRE" || user?.is_membre === true;
  const isGlobalRole = ["TRESORIER", "PRESIDENT", "SECRETAIRE_GENERALE"].includes(user?.role || "");

  const { data: member } = useMemberDetailByUser(isMemberRole ? user?.id : undefined);
  const memberParams = isMemberRole ? { membre: member?.id } : undefined;

  const { data: loansRaw } = useLoans(memberParams);
  const { data: repaymentsRaw } = useRepayments(memberParams);
  const { data: solidarityRaw } = useSolidarityPayments(memberParams);
  const { data: renflouementRaw } = useRenflouements(memberParams);
  const { data: savingsRaw } = useSavings(memberParams);
  const { data: assistancesByMemberRaw } = useAssistancesByMember(isMemberRole ? member?.id || "" : "");
  const { data: assistancesRaw } = useAssistances();
  const { data: inscriptionPaymentsRaw } = useInscriptionPayments();

  const currentTotalCount = useMemo(() => {
    const loans = Array.isArray(loansRaw) ? loansRaw : (loansRaw as any)?.results ?? [];
    const repayments = Array.isArray(repaymentsRaw) ? repaymentsRaw : (repaymentsRaw as any)?.results ?? [];
    const solidarites = Array.isArray(solidarityRaw) ? solidarityRaw : (solidarityRaw as any)?.results ?? [];
    const renflouements = Array.isArray(renflouementRaw) ? renflouementRaw : (renflouementRaw as any)?.results ?? [];
    const savings = Array.isArray(savingsRaw) ? savingsRaw : (savingsRaw as any)?.results ?? [];
    const assistances = Array.isArray(assistancesRaw) ? assistancesRaw : (assistancesRaw as any)?.assistances ?? [];
    const memberAssistances = Array.isArray(assistancesByMemberRaw) ? assistancesByMemberRaw : (assistancesByMemberRaw as any)?.assistances ?? [];
    const targetAssistances = isMemberRole ? memberAssistances : assistances;
    const inscriptionPayments = Array.isArray(inscriptionPaymentsRaw) ? inscriptionPaymentsRaw : (inscriptionPaymentsRaw as any)?.results ?? [];
    const targetInscriptionPayments = isMemberRole ? inscriptionPayments.filter((p: any) => p.membre === member?.id) : inscriptionPayments;

    let total = loans.length + repayments.length + solidarites.length + savings.length + targetAssistances.length + targetInscriptionPayments.length;

    renflouements.forEach((r: any) => {
      total += (r.paiements_details || []).length;
    });

    return total;
  }, [loansRaw, repaymentsRaw, renflouementRaw, solidarityRaw, savingsRaw, assistancesRaw, assistancesByMemberRaw, inscriptionPaymentsRaw, isMemberRole, member?.id]);

  useEffect(() => {
    const checkUnreadNotifications = async () => {
      if (currentTotalCount === 0) return;

      const storageKey = isMemberRole ? `last_read_count_${member?.id}` : `last_read_count_global_${user?.id}`;
      const lastReadCountStr = await AsyncStorage.getItem(storageKey);
      const lastReadCount = lastReadCountStr ? parseInt(lastReadCountStr, 10) : 0;

      setHasBadge(currentTotalCount > lastReadCount);
    };

    checkUnreadNotifications();
  }, [currentTotalCount, isMemberRole, member?.id, user?.id]);

  const handlePress = async () => {
    setHasBadge(false);
    const storageKey = isMemberRole ? `last_read_count_${member?.id}` : `last_read_count_global_${user?.id}`;
    await AsyncStorage.setItem(storageKey, currentTotalCount.toString());
    navigation.navigate("Notifications");
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
    backgroundColor: "red",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
});