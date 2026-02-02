import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient, useIsFetching } from '@tanstack/react-query';
import { useAuthContext } from '../context/AuthContext'; // Importation de ton contexte d'authentification

const GlobalRefreshButton = () => {
  const { user } = useAuthContext(); // On récupère l'utilisateur connecté
  const queryClient = useQueryClient();
  const isFetching = useIsFetching(); 
  const spinValue = useRef(new Animated.Value(0)).current;

  // 1. Logique d'affichage : Si pas d'utilisateur (Login Screen), on ne rend rien
 
  // 2. Logique d'animation de rotation
  useEffect(() => {
    if (isFetching > 0) {
      // Tourne en boucle tant que l'app récupère des données
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      // S'arrête proprement quand le chargement est fini
      spinValue.stopAnimation();
      Animated.timing(spinValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isFetching]);

  if (!user) {
    return null;
  }


  // 3. Action de rafraîchissement global
  const handleRefresh = () => {
    // Force la mise à jour de tous les hooks useQuery actifs
    queryClient.invalidateQueries();
  };

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={handleRefresh}
      activeOpacity={0.7}
      disabled={isFetching > 0} // Désactivé pendant le chargement pour éviter le spam
    >
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <Ionicons name="refresh" size={26} color="white" />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90, 
    left: 20, // Positionné à gauche comme demandé
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(181, 23, 158, 0.6)', // Semi-transparent (60%)
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    zIndex: 9999, // Priorité d'affichage maximum
  },
});

export default GlobalRefreshButton;
