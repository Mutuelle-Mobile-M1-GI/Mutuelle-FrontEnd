# Backend Requirements - Renflouement Screen

## Probleme Actuellement
Les montants de renflouement ne s'affichent pas efficacement car:
1. L'endpoint `/core/exercices/` ne retourne pas les stats de renflouement (montant_total_du, montant_total_paye)
2. On doit fetcher `/transactions/paiements-renflouement/` pour chaque exercice pour avoir les stats
3. Cela cause une surcharge d'appels API et une mauvaise performance

---

## Solution Recommandée

### 1. Enrichir l'endpoint `/core/exercices/` avec les stats de renflouement

**Endpoint:** `GET /core/exercices/`

**Ajouter dans la réponse pour chaque exercice:**
```json
{
  "id": "...",
  "nom": "ARNO",
  "statut": "TERMINE",
  "date_debut": "2026-01-01",
  "date_fin": "2026-12-31",
  "montant_total_du": 500000,        // NOUVEAU
  "montant_total_paye": 200000,      // NOUVEAU
  "montant_total_restant": 300000,   // NOUVEAU (optionnel)
  "taux_recouvrement": 40            // NOUVEAU (optionnel)
}
```

**Logic (backend):**
```python
def get_exercices(request):
    exercices = Exercice.objects.all()
    data = []
    
    for exe in exercices:
        # Calculer les stats depuis RenflouementPayment
        stats = RenflouementPayment.objects.filter(
            renflouement__exercice=exe
        ).aggregate(
            montant_total_du=Sum('renflouement__montant_du'),
            montant_total_paye=Sum('renflouement__montant_paye'),
        )
        
        exe_data = ExerciceSerializer(exe).data
        exe_data.update({
            "montant_total_du": stats.get('montant_total_du') or 0,
            "montant_total_paye": stats.get('montant_total_paye') or 0,
            "montant_total_restant": (stats.get('montant_total_du') or 0) - (stats.get('montant_total_paye') or 0),
            "taux_recouvrement": (stats.get('montant_total_paye') or 0) / (stats.get('montant_total_du') or 1) * 100
        })
        data.append(exe_data)
    
    return Response(data)
```

---

### 2. Optionnel: Nouveau endpoint pour stats par exercice

**Endpoint:** `GET /transactions/renflouements/par-exercice/`

**Retourne:**
```json
{
  "exercice_id": "...",
  "exercice_nom": "ARNO",
  "montant_total_du": 500000,
  "montant_total_paye": 200000,
  "nombre_membres": 5,
  "nombre_membres_soldes": 2,
  "nombre_membres_non_payes": 1,
  "par_membre": [
    {
      "membre_id": "...",
      "membre_nom": "Jean Dupont",
      "montant_du": 100000,
      "montant_paye": 100000,
      "montant_restant": 0,
      "pourcentage_paye": 100
    }
  ]
}
```

---

### 3. Optimiser l'endpoint `/transactions/paiements-renflouement/`

**Endpoint:** `GET /transactions/paiements-renflouement/?exercice_id={id}`

**Actuel:** Retourne tous les paiements individuels (trop de données)

**Optimisation proposée:**
- Ajouter un paramètre `?summary=true` pour retourner juste les stats par membre
- Ou créer un endpoint dédié `/transactions/renflouements/detail-exercice/?exercice_id={id}`

**Réponse optimisée:**
```json
{
  "exercice": {
    "id": "...",
    "nom": "ARNO"
  },
  "statistiques_globales": {
    "montant_total_du": 500000,
    "montant_total_paye": 200000,
    "montant_total_restant": 300000,
    "taux_recouvrement": 40
  },
  "par_membre": [
    {
      "membre": {
        "id": "...",
        "nom_complet": "Jean Dupont",
        "numero_membre": "ENS-001",
        "statut": "EN_REGLE"
      },
      "montants": {
        "montant_du": 100000,
        "montant_paye": 100000,
        "montant_restant": 0,
        "pourcentage_paye": 100
      },
      "nombre_paiements": 1,
      "dernier_paiement": "2026-07-06T10:00:00Z"
    }
  ]
}
```

---

### 4. Endpoint pour renflouements d'un membre (PAR EXERCICE)

**Endpoint:** `GET /transactions/renflouements/par-membre/?membre_id={id}`

**Current:** Retourne juste les renflouements

**Optimization:** Ajouter les stats par exercice

**Réponse suggérée:**
```json
{
  "membre": {
    "id": "...",
    "nom_complet": "Jean Dupont",
    "numero_membre": "ENS-001",
    "statut": "EN_REGLE"
  },
  "statistiques_globales": {
    "total_du": 180000,
    "total_paye": 180000,
    "total_restant": 0,
    "pourcentage_paye": 100
  },
  "renflouements_par_exercice": [
    {
      "exercice_id": "...",
      "exercice_nom": "ARNO",
      "cause": "Renflouement exercice",
      "montant_du": 100000,
      "montant_paye": 100000,
      "montant_restant": 0,
      "pourcentage_paye": 100,
      "date_creation": "2026-01-15"
    }
  ]
}
```

---

## Priority Order

1. **HIGH (URGENT)** - Enrichir `/core/exercices/` avec montants → Utilisé par la liste principale
2. **HIGH** - Optimiser `/transactions/paiements-renflouement/?exercice_id={id}` → Utilisé dans le detail modal
3. **MEDIUM** - Créer endpoint `/transactions/renflouements/par-exercice/` → Alternative pour #2
4. **MEDIUM** - Vérifier que `/transactions/renflouements/par-membre/?membre_id={id}` retourne tout

---

## Expected Impact

### Before
- Écran principal: 1 appel API
- Clic exercice: +1 appel pour fetcher tous les renflouements
- Clic membre: +1 appel pour fetcher ses renflouements
- **Total: 3+ appels + calculs frontend**

### After (with fix #1)
- Écran principal: 1 appel API (avec stats incluses)
- Clic exercice: +1 appel pour détails membres (optimisé)
- Clic membre: +1 appel pour ses renflouements (déjà optimisé)
- **Total: 3 appels + 0 calculs frontend = plus rapide**

---

## Code Locations

### Frontend (Already using)
- `src/hooks/useRenflouement.ts` - useRenflouementPayments()
- `src/hooks/useListData.ts` - useExercises()
- `src/services/renflouement.service.ts` - fetchRenflouementPayments()

### Backend (To update)
- Serializer: `RenflouementSerializer` / `ExerciceSerializer`
- ViewSet: `RenflouementViewSet` / `ExerciceViewSet`
- Service: Calculation logic for montant_total_du/paye

---

## Testing Checklist

- [ ] GET /core/exercices/ returns montant_total_du/paye
- [ ] GET /transactions/paiements-renflouement/?exercice_id=X returns by member
- [ ] GET /transactions/renflouements/par-membre/?membre_id=X returns all exercices
- [ ] Frontend receives data and displays without calculation delays
- [ ] Stats in Renflouement screen update correctly

---

## Notes

Toutes les valeurs montant_*_du doivent être calculées en fonction du statut du membre (EN_REGLE ou pas).
S'assurer que les montants sont toujours en FCFA (entiers).
