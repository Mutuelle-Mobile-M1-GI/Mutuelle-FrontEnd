import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { useAuthContext } from "./AuthContext";
import { AppState, AppStateStatus } from "react-native";

const PIN_KEY = "user_app_pin";

type PinContextType = {
  isPinDefined: boolean;
  isPinValidated: boolean;
  requirePinSetup: boolean;
  requirePinEntry: boolean;
  definePin: (pin: string) => Promise<void>;
  validatePin: (pin: string) => Promise<boolean>;
  resetPin: () => Promise<void>;
  setPinValidated: (v: boolean) => void;
};

const PinContext = createContext<PinContextType>({
  isPinDefined: false,
  isPinValidated: false,
  requirePinSetup: false,
  requirePinEntry: false,
  definePin: async () => {},
  validatePin: async () => false,
  resetPin: async () => {},
  setPinValidated: () => {},
});

export const usePinContext = () => useContext(PinContext);

export const PinProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, logout, isFirstLogin } = useAuthContext(); // Ajouter isFirstLogin dans AuthContext
  const [isPinDefined, setIsPinDefined] = useState(false);
  const [isPinValidated, setIsPinValidated] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);

  // Gérer les changements d'état de l'app (premier plan/arrière-plan)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // L'app revient au premier plan - redemander le PIN si défini ET utilisateur connecté
        if (user && isPinDefined) {
          setIsPinValidated(false);
        }
      }
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [appState, isPinDefined, user]);

  // Vérifier si un PIN est défini au démarrage ET gérer la logique après login
  useEffect(() => {
    const checkPin = async () => {
      if (user) {
        try {
          const pin = await SecureStore.getItemAsync(PIN_KEY);
          setIsPinDefined(!!pin);
          
          // LOGIQUE CRUCIALE :
          // - Si c'est un premier login (connexion par mot de passe), on efface le PIN et demande redéfinition
          // - Sinon, on demande juste la saisie du PIN existant
          if (isFirstLogin) {
            // Premier login = effacer ancien PIN et demander nouveau
            if (pin) {
              await SecureStore.deleteItemAsync(PIN_KEY);
              
            }
            setIsPinDefined(false);
            setIsPinValidated(false);
          } else {
            // Ouverture normale = demander PIN existant
            setIsPinValidated(false);
          }
        } catch (error) {
          console.log("Erreur lecture PIN:", error);
          try{
            await SecureStore.deleteItemAsync(PIN_KEY);
          }
          catch(eror2){
            console.log(eror2)
          }
          
          setIsPinDefined(false);
          setIsPinValidated(false);
        }
      } else {
        // Pas d'utilisateur = reset tout
        setIsPinDefined(false);
        setIsPinValidated(false);
      }
    };
    
    checkPin();
  }, [user, isFirstLogin]);

  const definePin = async (pin: string) => {
    try {
      await SecureStore.setItemAsync(PIN_KEY, pin);
      setIsPinDefined(true);
      setIsPinValidated(true);
    } catch (error) {
      console.log("Erreur sauvegarde PIN:", error);
      throw new Error("Impossible de sauvegarder le PIN");
    }
  };

  const validatePin = async (pin: string) => {
    try {
      const stored = await SecureStore.getItemAsync(PIN_KEY);
      if (stored && stored === pin) {
        setIsPinValidated(true);
        return true;
      }
      setIsPinValidated(false);
      return false;
    } catch (error) {
      console.log("Erreur validation PIN:", error);
      setIsPinValidated(false);
      return false;
    }
  };

  const resetPin = async () => {
    try {
      await SecureStore.deleteItemAsync(PIN_KEY);
      setIsPinDefined(false);
      setIsPinValidated(false);
      logout(); // Déconnexion totale
    } catch (error) {
      console.log("Erreur reset PIN:", error);
    }
  };

  // LOGIQUE DES ÉCRANS :
  // 1. requirePinSetup = utilisateur connecté MAIS pas de PIN défini (premier login ou PIN oublié)
  // 2. requirePinEntry = utilisateur connecté ET PIN défini MAIS pas validé (ouverture app)
  
  const requirePinSetup = !!user && !isPinDefined;
  const requirePinEntry = !!user && isPinDefined && !isPinValidated;

  return (
    <PinContext.Provider
      value={{
        isPinDefined,
        isPinValidated,
        requirePinSetup,
        requirePinEntry,
        definePin,
        validatePin,
        resetPin,
        setPinValidated: setIsPinValidated,
      }}
    >
      {children}
    </PinContext.Provider>
  );
};