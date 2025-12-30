import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "../types/user.types";
import { 
  getStoredUser, 
  logout as apiLogout, 
  login as apiLogin 
} from "../services/auth.service";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isFirstLogin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setFirstLogin: (value: boolean) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isFirstLogin: false,
  login: async () => {},
  logout: async () => {},
  setFirstLogin: () => {},
});

export const useAuthContext = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  // Charger l'utilisateur au démarrage
  useEffect(() => {
    const loadUser = async () => {
      try {
        setIsLoading(true);
        const storedUser = await getStoredUser();
        console.log("Utilisateur chargé depuis le storage:", storedUser);
        setUser(storedUser);
        setIsFirstLogin(false); // Si on charge depuis le storage, ce n'est pas un premier login
      } catch (error) {
        console.log("Erreur chargement utilisateur:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log("Tentative de connexion pour:", email);
      
      // Appel API de login
      const { tokens, user: userData } = await apiLogin(email, password);
      console.log("Login réussi, utilisateur:", userData);
      
      // Mettre à jour l'état
      setUser(userData);
      setIsFirstLogin(true); // MARQUER comme premier login
      
      console.log("État mis à jour, isFirstLogin:", true);
    } catch (error) {
      console.log("Erreur login dans AuthContext:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      console.log("Déconnexion en cours...");
      
      await apiLogout();
      
      setUser(null);
      setIsFirstLogin(false);
      
      console.log("Déconnexion terminée");
    } catch (error) {
      console.log("Erreur logout:", error);
      // Même en cas d'erreur, on déconnecte localement
      setUser(null);
      setIsFirstLogin(false);
    } finally {
      setIsLoading(false);
    }
  };

  const setFirstLoginValue = (value: boolean) => {
    console.log("setFirstLogin appelé avec:", value);
    setIsFirstLogin(value);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isFirstLogin,
        login,
        logout,
        setFirstLogin: setFirstLoginValue,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};