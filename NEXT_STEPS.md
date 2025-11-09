# 🚀 PROCHAINES ÉTAPES - ARENA PRODUCTION

## 📅 TIMELINE POUR LE 21 FÉVRIER 2026

Vous avez **~3 mois** pour préparer l'app. Voici le plan d'exécution.

---

## 🔴 SEMAINE 1-2 (DÉC 2025) - OPTIMISATIONS CRITIQUES

### Priority 1: Supprimer le polling
**Fichier:** `src/pages/Regie.tsx:108-156`

**Action:**
```bash
# Commenter/supprimer le polling actuel
# Garder uniquement le canal Realtime
```

**Vérification:**
- Ouvrir Regie + Client
- Tester buzzer → Doit arriver en <200ms
- Network tab: 0 requête en polling

**Temps estimé:** 2h

---

### Priority 2: Optimiser reconnexions
**Fichier:** `src/pages/Client.tsx:70-91`

**Action:**
```typescript
// Ajouter debounce
import { debounce } from 'lodash';

const reconnectDebounced = useMemo(
  () => debounce(() => {
    loadTeam();
    loadGameState();
    // ... reste avec délais progressifs
  }, 1000),
  []
);
```

**Installation:**
```bash
npm install lodash
npm install -D @types/lodash
```

**Temps estimé:** 3h

---

### Priority 3: Heartbeat via Presence
**Fichier:** `src/pages/Client.tsx:207-220`

**Action:**
- Supprimer setInterval avec update DB
- Utiliser uniquement presenceChannel.track()

**Vérification:**
- Monitoring Supabase: 0 update sur teams.last_seen_at
- Présence visible dans Regie

**Temps estimé:** 2h

---

### Priority 4: Installer Sentry
**Installation:**
```bash
npm install @sentry/react @sentry/tracing
```

**Configuration:**
```typescript
// src/main.tsx - AJOUTER EN PREMIER
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://xxx@xxx.ingest.sentry.io/xxx", // Créer compte Sentry
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0,
});

// Wrapper App
const app = Sentry.withProfiler(App);
```

**Vérification:**
- Déclencher erreur volontaire
- Vérifier dans Sentry dashboard

**Temps estimé:** 1h

**TOTAL SEMAINE 1-2: 8h de dev**

---

## 🟠 SEMAINE 3-4 (DÉC 2025) - TESTS & MONITORING

### Test de charge basique

**Créer:** `scripts/load-test-basic.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'YOUR_URL';
const SUPABASE_ANON_KEY = 'YOUR_KEY';

async function testLoad() {
  console.log('🧪 Test: 10 équipes simultanées');

  const clients = [];

  // Créer 10 connexions
  for (let i = 0; i < 10; i++) {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    clients.push(client);

    // S'abonner
    await client.channel(`team_${i}`).subscribe();
  }

  console.log('✅ 10 connexions établies');

  // Test buzzers simultanés
  console.log('🔔 Test: 10 buzzers simultanés');
  const start = Date.now();

  const promises = clients.map((client, i) =>
    client.from('buzzer_attempts').insert({
      team_id: `test-team-${i}`,
      question_id: 'test-question',
    })
  );

  await Promise.all(promises);

  const duration = Date.now() - start;
  console.log(`⏱️ Latence: ${duration}ms`);

  // Cleanup
  await Promise.all(
    clients.map(client => client.removeAllChannels())
  );
}

testLoad();
```

**Exécution:**
```bash
npx tsx scripts/load-test-basic.ts
```

**Objectif:** Latence < 500ms pour 10 équipes

**Temps estimé:** 4h

---

### Dashboard monitoring

**Créer:** `src/pages/MonitoringLive.tsx`

```typescript
export const MonitoringLive = () => {
  const [metrics, setMetrics] = useState({
    connectedTeams: 0,
    latency: 0,
  });

  useEffect(() => {
    // Compter équipes connectées
    const channel = supabase.channel('team_presence');

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      setMetrics(prev => ({
        ...prev,
        connectedTeams: Object.keys(state).length
      }));
    }).subscribe();

    // Mesurer latence DB
    const interval = setInterval(async () => {
      const start = Date.now();
      await supabase.from('game_state').select('id').limit(1);
      const latency = Date.now() - start;

      setMetrics(prev => ({ ...prev, latency }));
    }, 5000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      <Card>
        <h3>Équipes connectées</h3>
        <p className="text-4xl font-bold">{metrics.connectedTeams}</p>
      </Card>

      <Card>
        <h3>Latence DB</h3>
        <p className={`text-4xl font-bold ${
          metrics.latency < 200 ? 'text-green-500' : 'text-red-500'
        }`}>
          {metrics.latency}ms
        </p>
      </Card>
    </div>
  );
};
```

**Ajouter route:**
```typescript
// src/App.tsx
<Route path="/monitoring-live" element={<MonitoringLive />} />
```

**Temps estimé:** 3h

**TOTAL SEMAINE 3-4: 7h de dev**

---

## 🟡 SEMAINE 5-8 (JAN 2026) - MULTI-TENANT & MONÉTISATION

### Migrations DB

**Créer:** `supabase/migrations/20260101_multi_tenant.sql`

```sql
-- 1. Table organizations
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  subscription_plan TEXT DEFAULT 'free',
  max_teams_per_session INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Ajouter organization_id aux sessions
ALTER TABLE public.game_sessions
  ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- 3. Créer org par défaut
INSERT INTO public.organizations (id, name, slug, subscription_plan, max_teams_per_session)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Arena Default',
  'default',
  'enterprise',
  999
);

-- 4. Migrer sessions existantes
UPDATE public.game_sessions
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;
```

**Exécution:**
```bash
# Si Supabase CLI installé
supabase migration new multi_tenant
# Copier le SQL ci-dessus
supabase db push
```

**Temps estimé:** 2h

---

### Page signup organisateur

**Créer:** `src/pages/OrgSignup.tsx`

```typescript
export const OrgSignup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');

  const handleSignup = async () => {
    // 1. Créer compte
    const { data: authData } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authData.user) {
      // 2. Créer organisation
      const { data: org } = await supabase
        .from('organizations')
        .insert({
          name: companyName,
          slug: slugify(companyName),
        })
        .select()
        .single();

      // 3. Rediriger vers dashboard
      navigate('/dashboard');
    }
  };

  return (
    <Card className="max-w-md mx-auto p-8">
      <h1>Créer un compte Arena</h1>

      <Input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <Input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <Input
        placeholder="Nom de votre entreprise"
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
      />

      <Button onClick={handleSignup}>
        Créer mon compte
      </Button>
    </Card>
  );
};
```

**Temps estimé:** 4h

---

### Dashboard organisateur

**Créer:** `src/pages/OrgDashboard.tsx`

```typescript
export const OrgDashboard = () => {
  const { data: currentOrg } = useQuery({
    queryKey: ['current-org'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();

      // Pour l'instant, récupérer org par défaut
      const { data } = await supabase
        .from('organizations')
        .select('*')
        .single();

      return data;
    }
  });

  const { data: sessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('organization_id', currentOrg?.id)
        .order('created_at', { ascending: false });

      return data;
    },
    enabled: !!currentOrg
  });

  return (
    <div className="p-8">
      <h1>Mes événements - {currentOrg?.name}</h1>

      <Card className="mb-8">
        <Badge>{currentOrg?.subscription_plan}</Badge>
        <p>Max équipes: {currentOrg?.max_teams_per_session}</p>
      </Card>

      <div className="grid gap-4">
        {sessions?.map(session => (
          <Card key={session.id}>
            <h3>{session.name}</h3>
            <Badge>{session.status}</Badge>
            <Button onClick={() => navigate(`/regie/${session.id}`)}>
              Ouvrir
            </Button>
          </Card>
        ))}
      </div>

      <Button onClick={() => navigate('/events/new')}>
        + Nouvel événement
      </Button>
    </div>
  );
};
```

**Temps estimé:** 6h

**TOTAL SEMAINE 5-8: 12h de dev**

---

## 🟢 SEMAINE 9-12 (FÉV 2026) - TESTS FINAUX

### Test grandeur nature (60 personnes)

**Organisation:**
- Recruter 60 testeurs (collègues, amis, communauté)
- Créer événement de test
- Scénario complet: connexion → questions → buzzers → scores

**Checklist:**
- [ ] Toutes les équipes connectées sans problème
- [ ] Buzzers réactifs (<200ms)
- [ ] Aucun crash
- [ ] Monitoring actif
- [ ] Scores corrects

**Date:** 7-14 février 2026 (1 semaine avant événement)

**Temps estimé:** 4h préparation + 2h test

---

### Plan B - Mode offline

**Créer:** `src/lib/offline-mode.ts`

```typescript
// Mode dégradé si Supabase down
export const enableOfflineMode = () => {
  localStorage.setItem('offline_mode', 'true');

  // Stocker état en local
  const localGameState = {
    teams: [...],
    currentQuestion: {...},
    scores: {...}
  };

  localStorage.setItem('game_state_backup', JSON.stringify(localGameState));

  toast({
    title: "⚠️ Mode hors ligne activé",
    description: "Les données seront synchronisées quand la connexion reviendra",
    duration: Infinity
  });
};
```

**Temps estimé:** 4h

---

### Documentation opérateur

**Créer:** `GUIDE_OPERATEUR.md`

```markdown
# Guide Opérateur Régie - Jour J

## Préparation (J-1)

- [ ] Vérifier connexion Internet (min 10 Mbps)
- [ ] Tester avec 3 équipes pilotes
- [ ] Ouvrir /monitoring-live sur 2ème écran
- [ ] Numéros d'urgence accessibles

## Démarrage événement

1. Ouvrir /regie
2. Vérifier monitoring: latence < 200ms
3. Attendre connexion de toutes les équipes (60/60)
4. Lancer première question

## En cas de problème

### Équipe ne peut pas se connecter
- Vérifier code PIN correct
- Reset connexion depuis /admin/teams

### Buzzer ne fonctionne pas
- Vérifier timer actif
- Recharger page équipe

### Crash complet
- Activer mode offline
- Continuer avec scores manuels
```

**Temps estimé:** 2h

**TOTAL SEMAINE 9-12: 12h de dev + test**

---

## 💰 BUDGET ESTIMÉ

### Développement
- Optimisations: 8h × 100€/h = **800€**
- Tests & monitoring: 7h × 100€/h = **700€**
- Multi-tenant: 12h × 100€/h = **1200€**
- Tests finaux: 12h × 100€/h = **1200€**

**Total dev: 3900€**

### Infrastructure (3 mois)
- Supabase Pro: 25$ × 3 = **75$**
- Sentry: 26$ × 3 = **78$**
- Vercel Pro: 20$ × 3 = **60$**

**Total infra: 213$ (~200€)**

### **TOTAL: ~4100€**

### ROI (si monétisation)
- 1 client Pro = 99€/mois = 297€/trimestre
- **Breakeven: 14 clients**
- Objectif réaliste: 5-10 clients → **1500-3000€ MRR**

---

## 🎯 MÉTRIQUES DE SUCCÈS

### Technique (21 février)
- ✅ 60/60 équipes connectées
- ✅ 0 crash pendant événement
- ✅ Latence buzzer < 200ms (p95)
- ✅ Monitoring actif sans alerte

### Business (6 mois)
- ✅ 10 clients payants
- ✅ 2000€ MRR
- ✅ 90% rétention
- ✅ 4.5⭐ satisfaction

---

## 📞 SUPPORT

### Pendant développement
- Questions techniques: GitHub Issues
- Urgences: [votre email]

### Jour J (21 février)
- Hotline: [numéro dédié]
- Email urgence: [email prioritaire]
- Backup tech: [personne de confiance]

---

## ✅ VALIDATION FINALE

Avant le 21 février, vérifier:

- [ ] Optimisations critiques déployées
- [ ] Sentry actif avec alertes configurées
- [ ] Test 60 équipes réussi
- [ ] Dashboard monitoring opérationnel
- [ ] Plan B testé
- [ ] Guide opérateur imprimé
- [ ] Numéros urgence enregistrés
- [ ] Backup base de données J-1
- [ ] Code freeze 48h avant

---

## 🚀 APRÈS LE 21 FÉVRIER

Si événement réussi:
1. Rédiger case study
2. Testimonial client
3. Marketing sur LinkedIn/Twitter
4. Lancer offre commerciale
5. Automatiser onboarding clients

**Objectif Q2 2026: 5 clients payants = 500€ MRR**
