import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, StyleSheet, Animated, Easing, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient, useIsFetching } from '@tanstack/react-query';

const GlobalRefreshButton = () => {
  const queryClient = useQueryClient();
  const isFetching = useIsFetching(); // 0 si rien ne charge, > 0 si une requête est en cours
  const spinValue = useRef(new Animated.Value(0)).current;

  // Animation de rotation qui s'active quand isFetching > 0
  useEffect(() => {
    if (isFetching > 0) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      // On finit la rotation en douceur et on reset
      Animated.timing(spinValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).stop();
      spinValue.setValue(0);
    }
  }, [isFetching]);

  const handleRefresh = () => {
    // Invalide TOUTES les requêtes de l'app (Savings, Members, Stats, etc.)
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
      disabled={isFetching > 0}
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
    bottom: 90, // Ajuste selon ta TabBar
    left: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(181, 23, 158, 0.5)', // Couleur #B5179E avec 50% d'opacité
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    zIndex: 9999, // Pour passer au-dessus de tout
  },
});

export default GlobalRefreshButton;