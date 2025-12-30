# 📚 Documentation Technique Complète des Outils Métier, Types, Services, Hooks, Contextes, Utils de l'App "Mutuelle ENSPY"

> **But** : Ce document sert d'inventaire exhaustif et de référence pour tous les outils métiers (types, hooks, services, contextes, utils, constantes) implémentés dans le projet.  

> **Stack concernée** : React Native (Expo) – TypeScript – React Query – AsyncStorage/SecureStore – Axios.

---

## 📁 Table des Matières

1. [🌳 Structure de Dossier](#structure-de-dossier)
2. [🔗 Constants (api, config, strings)](#constants)
3. [✍️ Types TypeScript](#types)
4. [🔌 Services API](#services)
5. [🪝 Hooks Métier](#hooks)
6. [🌐 Context Providers](#contexts)
7. [🧰 Utils & Helpers](#utils)
8. [📝 Notes de Style et Patterns](#notes-de-style)

---

## 🌳 Structure de Dossier

```
src/
├── assets/          # Images, icônes, polices
├── components/      # Composants UI réutilisables
├── constants/       # api.ts, config.ts, strings.ts
├── context/         # AppContext, AuthContext, ThemeContext
├── hooks/           # Tous les hooks métiers (voir section dédiée)
├── navigation/      # Navigators React Navigation
├── screens/         # Pages principales (admin, membre, auth, partagé)
├── services/        # Accès API centralisé (axios)
├── styles/          # Styles globaux
├── types/           # Tous les modèles TypeScript ultra complets
└── utils/           # Helpers, formatters, validators...
```

---

## 🔗 1. Constants

### `constants/api.ts`
- **API_BASE_URL** : URL de base de l'API backend.
- **API_ENDPOINTS** : Objet listant tous les endpoints de l'API, par domaine.
    - `login`, `refresh`, `users`, `members`, `loans`, `assistances`, `renflouements`, etc.
    - Les endpoints dynamiques sont des fonctions (`memberDetails: (id) => ...`).

### `constants/config.ts`
- **COLORS** : Palette de couleurs globale (bleu/blanc).
- **PIN_LENGTH**, **DEFAULT_SESSION_AGAPE** : Paramètres métier.
- **DATE_FORMATS** : Formats de date pour affichage/API.
- **PAGINATION** : Taille de page par défaut.
- **ASYNC_STORAGE_KEYS** : Clés pour AsyncStorage/SecureStore.

### `constants/strings.ts`
- **STRINGS** : Textes statiques réutilisables (ui, erreurs, titres...).

---

## ✍️ 2. Types TypeScript

Tous les types sont **fidèles à la structure de l'API** et aux besoins du front.  
Chaque type est documenté dans le fichier correspondant de `types/`.

- **user.types.ts** : Utilisateur, rôle, profil complet backend.
- **member.types.ts** : Membre (enseignant), statut, données financières détaillées (inscription, solidarité, épargne, emprunt, renflouement, résumé financier).
- **loan.types.ts** : Emprunt, statut (EN_COURS, REMBOURSE, EN_RETARD), détails remboursement.
- **saving.types.ts** : Transaction d'épargne, type (DEPOT, RETRAIT_PRET, INTERET).
- **solidarity.types.ts** : Paiement solidarité (fonds social), mouvements fonds social.
- **renflouement.types.ts** : Renflouement, paiements associés, causes.
- **assistance.types.ts** : Assistance accordée, type, statut.
- **exercise.types.ts** : Exercice annuel, statut, info fonds social.
- **session.types.ts** : Session mensuelle, statut, nombre membres, etc.
- **config.types.ts** : Configuration globale de la mutuelle.
- **dashboard.types.ts** : Dashboard admin : totaux, alertes, paiements, etc.

Tous les types sont exhaustivement définis et **aucun ne doit être modifié sans impact sur la cohérence**.

---

## 🔌 3. Services API

### Pattern général

- **Basés sur axios** : Chaque service correspond à une entité métier (auth, member, loan, etc.)
- **Importent les types définis dans /types**
- **Entièrement typés** (entrée, sortie).

### Exemples de signatures (toutes les méthodes sont async) :

#### Auth
```typescript
login(email: string, password: string): Promise<{ tokens: { access: string, refresh: string }, user: User }>
refreshToken(refresh: string): Promise<{ access: string, refresh: string }>
logout(): Promise<void>
getStoredAccessToken(): Promise<string|null>
getStoredUser(): Promise<User|null>
updateProfile(updates: Partial<User>, accessToken: string): Promise<User>
changePassword(old: string, new: string, confirm: string, token: string): Promise<void>
```

#### User
```typescript
fetchUsers(accessToken: string): Promise<User[]>
fetchUserById(id: string, accessToken: string): Promise<User>
createUser(user: Partial<User>, accessToken: string): Promise<User>
```

#### Member
```typescript
fetchMembers(accessToken: string, params?): Promise<Member[]>
fetchMemberById(id: string, accessToken: string): Promise<Member>
fetchMemberFullData(id: string, accessToken: string): Promise<any> // Données financières détaillées
```

#### Dashboard
```typescript
fetchAdminDashboard(accessToken: string): Promise<DashboardData>
```

#### Loan
```typescript
fetchLoans(accessToken: string, params?): Promise<Loan[]>
fetchLoanById(id: string, accessToken: string): Promise<Loan>
createLoan(payload, accessToken: string): Promise<Loan>
fetchRepayments(accessToken: string, params?): Promise<Repayment[]>
createRepayment(payload, accessToken: string): Promise<Repayment>
```

#### ... (même logique pour savings, solidarity, renflouement, assistance, config)

**Tout changement sur les types/services doit se faire en cohérence avec la doc API fournie.**

---

## 🪝 4. Hooks Métier

### Pattern général

- **Basés sur React Query** (`useQuery`, `useMutation`)
- **Typés strictement** (types importés)
- **Utilisent les services correspondants**
- **Centralisent la logique métier côté front** (ex: refresh automatique, invalidation des queries, accès token, etc.)

### Hooks principaux

- `useAuth` : login/logout, utilisateur courant, erreurs.
- `usePin` : gestion du code PIN local.
- `useConfig` : configuration globale de la mutuelle.
- `useDashboard` : dashboard admin.
- `useMembers`, `useMemberDetail`, `useMemberFinance`
- `useLoans`, `useLoanDetail`, `useCreateLoan`, `useRepayments`, `useCreateRepayment`
- `useSavings`, `useCreateSaving`
- `useSolidarityPayments`, `useCreateSolidarityPayment`, `useSocialFundCurrent`
- `useRenflouements`, `useCreateRenflouementPayment`, `useRenflouementStats`
- `useAssistances`, `useCreateAssistance`, `useUpdateAssistance`, `useAssistanceTypes`
- `useUsers`, `useUserDetail`, `useCreateUser`

**Chacun de ces hooks encapsule la logique d'appel service, la gestion du token, et le typage.**

---

## 🌐 5. Context Providers

### **AuthContext**
- Donne accès rapide à l’utilisateur courant, login/logout dans tout l’arbre React.

### **ThemeContext**
- Fournit la palette de couleurs et la configuration thème (même si pas de dark mode).

### **AppContext**
- Centralise l’état “app loading”, les toasts/notifications globales.

**Tous les contextes sont strictement typés et exposent des hooks custom (`useAuthContext`, `useTheme`, `useAppContext`).**

---

## 🧰 6. Utils & Helpers

### Fichiers principaux

- **dateUtils.ts** : manipulation dates (isToday, isSameMonth, etc.)
- **formatters.ts** : formatage montants, dates, pourcentages.
- **helpers.ts** : helpers transversaux sur les statuts, labels, etc.
- **numberUtils.ts** : arrondis, calculs sur les nombres.
- **stringUtils.ts** : normalisation, recherche, manipulation de chaînes.
- **validators.ts** : validation email, phone, required, positif, etc.

### Exemples d’utilitaires (signature)

```typescript
formatMoney(amount: number, currency?: string): string
formatDate(date: string|Date, withHour?: boolean): string
isEmail(email: string): boolean
isPhone(phone: string): boolean
isRequired(val: any): boolean
normalizeSearch(text: string): string
getMemberStatusLabel(status: MemberStatus): string
getLoanStatusLabel(status: LoanStatus): string
```

Toutes les fonctions sont **pures**, stateless, et ne touchent jamais au réseau/local storage.

---

## 📝 7. Notes de Style et Patterns

- **Aucune donnée “mockée”** n’est générée dans les hooks/services.
- **Aucune fonction non documentée** ou non typée n’est autorisée.
- **Tout ajout de fonctionnalité** (hook, service, type, utilitaire) doit être documenté ici, avec la signature d’entrée/sortie, le type, et le comportement métier attendu.
- **Le code du projet est strictement aligné sur la doc API** (pas d’invention ni de duplication d’appels).
- **Les composants UI** ne doivent pas implémenter de logique métier : ils sont branchés sur les hooks/services/utils/context décrits ici.

---

## 📌 Synthèse

- **Ce document fait foi** pour toute IA ou dev :  
  - Pour connaître l’existant,  
  - Pour éviter la redondance,  
  - Pour garantir la cohérence métier,  
  - Pour accélérer le design système et la réalisation des écrans.
- **Toute modification doit être répercutée ici** (outil de référence unique du projet).

---

**Fin de la documentation technique des outils de la Mutuelle ENSPY.**


# DOCUMENTATION VERSION DETAILLEE :

# 📚 Documentation Technique Ultra-Complète – Mutuelle ENSPY (Front-End)



---

## 🌳 1. Structure de Dossier

```
src/
├── assets/
├── components/
├── constants/
│    ├── api.ts
│    ├── config.ts
│    └── strings.ts
├── context/
│    ├── AppContext.tsx
│    ├── AuthContext.tsx
│    └── ThemeContext.tsx
├── hooks/
│    ├── useAssistance.ts
│    ├── useAuth.ts
│    ├── useConfig.ts
│    ├── useDashboard.ts
│    ├── useLoan.ts
│    ├── useMember.ts
│    ├── useRenflouement.ts
│    ├── useSaving.ts
│    ├── useSolidarity.ts
│    └── useUser.ts
├── navigation/
├── screens/
├── services/
│    ├── assistance.service.ts
│    ├── auth.service.ts
│    ├── config.service.ts
│    ├── dashboard.service.ts
│    ├── loan.service.ts
│    ├── member.service.ts
│    ├── renflouement.service.ts
│    ├── saving.service.ts
│    ├── solidarity.service.ts
│    └── user.service.ts
├── styles/
├── types/
│    ├── assistance.types.ts
│    ├── config.types.ts
│    ├── dashboard.types.ts
│    ├── exercise.types.ts
│    ├── loan.types.ts
│    ├── member.types.ts
│    ├── renflouement.types.ts
│    ├── saving.types.ts
│    ├── session.types.ts
│    ├── solidarity.types.ts
│    └── user.types.ts
└── utils/
     ├── dateUtils.ts
     ├── formatters.ts
     ├── helpers.ts
     ├── numberUtils.ts
     ├── stringUtils.ts
     └── validators.ts
```

---

## 2. 🔗 Constants

### api.ts
- **API_BASE_URL** : string (ex: "http://localhost:8000/api")
- **API_ENDPOINTS** : objet listant tous les endpoints de l’API, dont :
    - login, refresh, verify, me, updateProfile, changePassword
    - users, members, memberDetails(id), memberFullData(id)
    - configCurrent
    - exercises, exerciseCurrent
    - sessions, sessionCurrent
    - solidarityPayments, socialFundCurrent, socialFundHistory
    - savings
    - loans, loanStats, repayments
    - renflouements, renflouementStats, renflouementPayments
    - assistances, assistanceTypes
    - adminDashboard, adminMemberManagement, adminReports, adminCreateMember

### config.ts
- **COLORS** : Palette globale (primary, background, accent, grey, text, error, success, info)
- **PIN_LENGTH** : number
- **DEFAULT_SESSION_AGAPE** : number
- **SESSION_LIMIT_PER_MONTH** : number
- **DATE_FORMATS** : {api: string, display: string}
- **PAGINATION.pageSize** : number
- **ASYNC_STORAGE_KEYS** : {accessToken, refreshToken, currentUser, pin, config}

### strings.ts
- **STRINGS** : Tous les messages statiques, titres, labels, erreurs, prompts, etc.

---

## 3. ✍️ Types TypeScript

### user.types.ts

- **UserRole** : "MEMBRE" | "ADMINISTRATEUR"
- **User** (interface)
    - id: string
    - username: string
    - email: string
    - first_name: string
    - last_name: string
    - telephone: string
    - role: UserRole
    - photo_profil: string | null
    - photo_profil_url: string | null
    - nom_complet: string
    - is_membre: boolean
    - is_administrateur: boolean
    - date_creation: string
    - date_modification: string
    - is_active: boolean

---

### member.types.ts

- **MemberStatus** : "EN_REGLE" | "NON_EN_REGLE" | "SUSPENDU"
- **Member** (interface)
    - id: string
    - utilisateur: User
    - numero_membre: string
    - date_inscription: string
    - statut: MemberStatus
    - exercice_inscription: string
    - exercice_inscription_nom: string
    - session_inscription: string
    - session_inscription_nom: string
    - is_en_regle: boolean
    - donnees_financieres: MemberFinancialData
    - date_creation: string
    - date_modification: string

- **MemberFinancialData** (interface)
    - inscription: { montant_total_inscription, montant_paye_inscription, montant_restant_inscription, inscription_complete, pourcentage_inscription }
    - solidarite: { montant_solidarite_session_courante, montant_paye_session_courante, montant_restant_session_courante, solidarite_session_courante_complete, total_solidarite_due, total_solidarite_payee, dette_solidarite_cumul, solidarite_a_jour }
    - epargne: { epargne_base, retraits_pour_prets, interets_recus, retours_remboursements, epargne_totale, epargne_plus_interets, montant_interets_separe }
    - emprunt: { a_emprunt_en_cours, montant_emprunt_en_cours, montant_total_a_rembourser, montant_deja_rembourse, montant_restant_a_rembourser, pourcentage_rembourse, montant_max_empruntable, nombre_emprunts_total }
    - renflouement: { total_renflouement_du, total_renflouement_paye, solde_renflouement_du, renflouement_a_jour, nombre_renflouements }
    - resume_financier: { patrimoine_total, obligations_totales, situation_nette }

---

### loan.types.ts

- **LoanStatus** : "EN_COURS" | "REMBOURSE" | "EN_RETARD"
- **Loan** (interface)
    - id: string
    - membre: string
    - membre_info: { id: string, numero_membre: string, nom_complet: string, email: string, statut: string }
    - montant_emprunte: number
    - taux_interet: number
    - montant_total_a_rembourser: number
    - montant_rembourse: number
    - montant_restant_a_rembourser: number
    - montant_interets: number
    - pourcentage_rembourse: number
    - session_emprunt: string
    - session_nom: string
    - date_emprunt: string
    - statut: LoanStatus
    - statut_display: string
    - notes: string
    - remboursements_details: Repayment[]

- **Repayment** (interface)
    - id: string
    - emprunt: string
    - emprunt_info: { id: string, membre_numero: string, membre_nom: string, montant_emprunte: number, montant_total_a_rembourser: number }
    - montant: number
    - montant_capital: number
    - montant_interet: number
    - session: string
    - session_nom: string
    - date_remboursement: string
    - notes: string

---

### saving.types.ts

- **SavingTransactionType** : "DEPOT" | "RETRAIT_PRET" | "INTERET"
- **SavingTransaction** (interface)
    - id: string
    - membre: string
    - membre_info: { id: string, numero_membre: string, nom_complet: string, email: string, statut: string }
    - type_transaction: SavingTransactionType
    - type_transaction_display: string
    - montant: number
    - session: string
    - session_nom: string
    - date_transaction: string
    - notes: string

---

### solidarity.types.ts

- **SolidarityPayment** (interface)
    - id: string
    - membre: string
    - membre_info: { id: string, numero_membre: string, nom_complet: string, email: string, statut: string }
    - session: string
    - session_nom: string
    - montant: number
    - date_paiement: string
    - notes: string

- **SocialFund** (interface)
    - id: string
    - exercice: string
    - exercice_nom: string
    - montant_total: number
    - mouvements_recents: SocialFundMovement[]
    - date_creation: string
    - date_modification: string

- **SocialFundMovement** (interface)
    - type_mouvement: "ENTREE" | "SORTIE"
    - montant: number
    - description: string
    - date_mouvement: string

---

### renflouement.types.ts

- **RenflouementCauseType** : "ASSISTANCE" | "COLLATION" | "AUTRE"
- **Renflouement** (interface)
    - id: string
    - membre: string
    - membre_info: { id: string, numero_membre: string, nom_complet: string, email: string, statut: string }
    - session: string
    - session_nom: string
    - montant_du: number
    - montant_paye: number
    - montant_restant: number
    - is_solde: boolean
    - pourcentage_paye: number
    - cause: string
    - type_cause: RenflouementCauseType
    - type_cause_display: string
    - date_creation: string
    - date_derniere_modification: string
    - paiements_details: RenflouementPayment[]

- **RenflouementPayment** (interface)
    - id: string
    - renflouement: string
    - renflouement_info: { id: string, membre_numero: string, membre_nom: string, montant_total_du: number, cause: string }
    - montant: number
    - session: string
    - session_nom: string
    - date_paiement: string
    - notes: string

---

### assistance.types.ts

- **AssistanceStatus** : "DEMANDEE" | "APPROUVEE" | "PAYEE" | "REJETEE"
- **Assistance** (interface)
    - id: string
    - membre: string
    - membre_info: { id: string, numero_membre: string, nom_complet: string, email: string, statut: string }
    - type_assistance: string
    - type_assistance_info: { id: string, nom: string, montant: number, description: string, actif: boolean, date_creation: string, date_modification: string }
    - montant: number
    - session: string
    - session_nom: string
    - date_demande: string
    - date_paiement: string | null
    - statut: AssistanceStatus
    - statut_display: string
    - justification: string
    - notes: string

---

### exercise.types.ts

- **ExerciseStatus** : "EN_COURS" | "TERMINEE"
- **Exercise** (interface)
    - id: string
    - nom: string
    - date_debut: string
    - date_fin: string
    - statut: ExerciseStatus
    - description: string
    - is_en_cours: boolean
    - nombre_sessions: number
    - fonds_social_info: { montant_total: number, derniere_modification: string }
    - date_creation: string
    - date_modification: string

---

### session.types.ts

- **SessionStatus** : "EN_COURS" | "TERMINEE"
- **Session** (interface)
    - id: string
    - exercice: string
    - exercice_nom: string
    - nom: string
    - date_session: string
    - montant_collation: number
    - statut: SessionStatus
    - description: string
    - is_en_cours: boolean
    - nombre_membres_inscrits: number
    - total_solidarite_collectee: number
    - renflouements_generes: number
    - date_creation: string
    - date_modification: string

---

### config.types.ts

- **MutuelleConfig** (interface)
    - id: string
    - montant_inscription: number
    - montant_solidarite: number
    - taux_interet: number
    - coefficient_emprunt_max: number
    - duree_exercice_mois: number
    - date_creation: string
    - date_modification: string

---

### dashboard.types.ts

- **DashboardData** (interface)
    - fonds_social: { montant_total: number, exercice: string, derniere_modification: string }
    - tresor: { cumul_total_epargnes: number, nombre_membres: number }
    - emprunts_en_cours: { nombre: number, montant_total_attendu: number }
    - situation_globale: { liquidites_totales: number, engagements_totaux: number }
    - derniers_paiements: { inscriptions: any[], solidarites: any[], remboursements: any[] }
    - alertes: { type: string, message: string, priorite: string, membre_id?: string, emprunt_id?: string }[]
    - activite_recente: { nouveaux_membres: number, nouveaux_emprunts: number, assistances_demandees: number, total_paiements: number }
    - membres_problematiques: any[]

---

## 4. 🔌 Services API (Signatures et Description)

Tous les services sont **asynchrones, typés, et alignés sur l’API**.

### auth.service.ts
- **login(email, password): Promise<{tokens, user}>**
- **refreshToken(refresh): Promise<{access, refresh}>**
- **logout(): Promise<void>**
- **getStoredAccessToken(): Promise<string|null>**
- **getStoredRefreshToken(): Promise<string|null>**
- **getStoredUser(): Promise<User|null>**
- **updateProfile(updates: Partial<User>, accessToken: string): Promise<User>**
- **changePassword(old_password, new_password, new_password_confirm, accessToken): Promise<void>**

### user.service.ts
- **fetchUsers(accessToken): Promise<User[]>**
- **fetchUserById(id, accessToken): Promise<User>**
- **createUser(user: Partial<User>, accessToken): Promise<User>**

### member.service.ts
- **fetchMembers(accessToken, params?): Promise<Member[]>**
- **fetchMemberById(id, accessToken): Promise<Member>**
- **fetchMemberFullData(id, accessToken): Promise<any>**

### dashboard.service.ts
- **fetchAdminDashboard(accessToken): Promise<DashboardData>**

### loan.service.ts
- **fetchLoans(accessToken, params?): Promise<Loan[]>**
- **fetchLoanById(id, accessToken): Promise<Loan>**
- **createLoan(payload, accessToken): Promise<Loan>**
- **fetchRepayments(accessToken, params?): Promise<Repayment[]>**
- **createRepayment(payload, accessToken): Promise<Repayment>**

### saving.service.ts
- **fetchSavings(accessToken, params?): Promise<SavingTransaction[]>**
- **createSaving(payload, accessToken): Promise<SavingTransaction>**

### solidarity.service.ts
- **fetchSolidarityPayments(accessToken, params?): Promise<SolidarityPayment[]>**
- **createSolidarityPayment(payload, accessToken): Promise<SolidarityPayment>**
- **fetchSocialFundCurrent(accessToken): Promise<SocialFund>**

### renflouement.service.ts
- **fetchRenflouements(accessToken, params?): Promise<Renflouement[]>**
- **fetchRenflouementStats(accessToken): Promise<any>**
- **createRenflouementPayment(payload, accessToken): Promise<RenflouementPayment>**

### assistance.service.ts
- **fetchAssistances(accessToken, params?): Promise<Assistance[]>**
- **createAssistance(payload, accessToken): Promise<Assistance>**
- **updateAssistance(id, payload: Partial<Assistance>, accessToken): Promise<Assistance>**
- **fetchAssistanceTypes(accessToken): Promise<any[]>**

### config.service.ts
- **fetchConfigCurrent(accessToken): Promise<MutuelleConfig>**

---

## 5. 🪝 Hooks Métier (Signatures, Clés de Query, Retours)

### useAuth.ts
- **useAuth()**  
    - .login({email, password}): Promise<{tokens, user}>
    - .logout(): Promise<void>
    - .isLoading: boolean
    - .error: any
    - .currentUserQuery

- **useCurrentUser(): Query<User|null>**

- **usePin()**
    - .pin: string|null
    - .isPinSet: boolean
    - .savePin(pin: string): Promise<void>
    - .verifyPin(pin: string): Promise<boolean>
    - .removePin(): Promise<void>

- **useUpdateProfile()**  
    - .mutateAsync({updates, accessToken})

- **useChangePassword()**  
    - .mutateAsync({old_password, new_password, new_password_confirm, accessToken})

---

### useConfig.ts
- **useMutuelleConfig(): Query<MutuelleConfig>**

---

### useDashboard.ts
- **useAdminDashboard(): Query<DashboardData>**

---

### useMember.ts
- **useMembers(params?): Query<Member[]>**
- **useMemberDetail(id): Query<Member>**
- **useMemberFinance(id): Query<any>**

---

### useUser.ts
- **useUsers(params?): Query<User[]>**
- **useUserDetail(id): Query<User>**
- **useCreateUser(): Mutation**

---

### useLoan.ts
- **useLoans(params?): Query<Loan[]>**
- **useLoanDetail(id): Query<Loan>**
- **useRepayments(params?): Query<Repayment[]>**
- **useCreateLoan(): Mutation**
- **useCreateRepayment(): Mutation**

---

### useSaving.ts
- **useSavings(params?): Query<SavingTransaction[]>**
- **useCreateSaving(): Mutation**

---

### useSolidarity.ts
- **useSolidarityPayments(params?): Query<SolidarityPayment[]>**
- **useCreateSolidarityPayment(): Mutation**
- **useSocialFundCurrent(): Query<SocialFund>**

---

### useRenflouement.ts
- **useRenflouements(params?): Query<Renflouement[]>**
- **useRenflouementStats(): Query<any>**
- **useCreateRenflouementPayment(): Mutation**

---

### useAssistance.ts
- **useAssistances(params?): Query<Assistance[]>**
- **useCreateAssistance(): Mutation**
- **useUpdateAssistance(): Mutation**
- **useAssistanceTypes(): Query<any[]>**

---

## 6. 🌐 Context Providers

### AuthContext.tsx
- Fournit :  
    - user: User|null
    - isLoading: boolean
    - login(email, password): Promise<void>
    - logout(): Promise<void>
- Hook associé : **useAuthContext()**

### ThemeContext.tsx
- Fournit :  
    - colors: typeof COLORS
- Hook associé : **useTheme()**

### AppContext.tsx
- Fournit :  
    - isAppLoading: boolean
    - setAppLoading(loading: boolean): void
    - showToast(msg: string, type?: "success"|"error"|"info"): void
- Hook associé : **useAppContext()**

---

## 7. 🧰 Utils & Helpers (Signatures et Fonctionnalités)

### formatters.ts
- **formatMoney(amount: number, currency = "FCFA"): string**
- **formatDate(date: string|Date, withHour = false): string**
- **formatPercent(value: number, digits?: number): string**

### dateUtils.ts
- **isSameMonth(dateA, dateB): boolean**
- **isToday(date): boolean**

### validators.ts
- **isEmail(email: string): boolean**
- **isPhone(phone: string): boolean**
- **isRequired(val: any): boolean**
- **isPositiveNumber(val: any): boolean**

### numberUtils.ts
- **round(value: number, decimals = 2): number**

### stringUtils.ts
- **normalizeSearch(text: string): string**

### helpers.ts
- **getMemberStatusLabel(status: MemberStatus): string**
- **getLoanStatusLabel(status: LoanStatus): string**

---

## 8. 📝 Règles & Patterns

- **AUCUN champ n’est omis dans les types.**
- **TOUTES les fonctions utilitaires, hooks, services, contextes sont listées avec leur signature.**
- **TOUT ajout/modification doit être répercuté dans cette doc.**
- **AUCUNE donnée mockée, AUCUNE fonction inventée n’est autorisée.**
- **AUCUN "etc." n’est utilisé dans les descriptions de types/fonctions.**

---

## 9. 📌 Synthèse

- **Cette doc est la référence unique** : tout dev ou IA l’utilise pour garantir l’exhaustivité et la cohérence.
- **Chaque structure, type, service, hook, context, utilitaire, constante est explicitement listé ici.**
- **Tout ajout, suppression ou modification doit être signalé et intégré dans cette doc.**

---

**Fin de la documentation technique exhaustive de la stack front Mutuelle ENSPY.**
