# 🏢 ARCHITECTURE MULTI-TENANT - ARENA SaaS

## 🎯 OBJECTIF

Transformer Arena en **SaaS B2B** pour vendre des prestations à distance.

**Business model :**
- Clients = Entreprises/Agences événementielles
- Utilisateurs finaux = Équipes participantes
- Revenus = Abonnements mensuels + événements one-shot

---

## 📊 MODÈLE DE DONNÉES MULTI-TENANT

### 1. Nouvelle table `organizations`

```sql
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- pour URL custom (ex: entreprise-x.arena.app)

  -- Branding
  logo_url TEXT,
  primary_color TEXT DEFAULT '#D4AF37',
  secondary_color TEXT DEFAULT '#FF6B00',

  -- Abonnement
  subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('free', 'pro', 'enterprise')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'suspended')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  -- Limites par plan
  max_teams_per_session INTEGER DEFAULT 10, -- 10 pour free, 60 pour pro
  max_events_per_month INTEGER DEFAULT 1,   -- 1 pour free, illimité pour pro

  -- Billing
  billing_email TEXT,
  billing_name TEXT,
  vat_number TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index
CREATE INDEX idx_organizations_slug ON public.organizations(slug);
CREATE INDEX idx_organizations_stripe ON public.organizations(stripe_customer_id);
```

### 2. Nouvelle table `organization_users` (rôles)

```sql
CREATE TABLE public.organization_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'operator')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  UNIQUE(organization_id, user_id)
);

-- owner = Créateur, billing, tout
-- admin = Créer événements, gérer équipes
-- operator = Régie seulement (pas de config)
```

### 3. Mise à jour `game_sessions` (événements)

```sql
ALTER TABLE public.game_sessions
  ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN event_type TEXT DEFAULT 'live' CHECK (event_type IN ('live', 'test', 'demo')),
  ADD COLUMN max_teams INTEGER DEFAULT 60,
  ADD COLUMN starts_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN ends_at TIMESTAMP WITH TIME ZONE;

-- Index pour isolation
CREATE INDEX idx_game_sessions_org ON public.game_sessions(organization_id);

-- Migration pour existing data (associer à org par défaut)
UPDATE public.game_sessions
SET organization_id = (SELECT id FROM public.organizations WHERE slug = 'default' LIMIT 1)
WHERE organization_id IS NULL;
```

### 4. Isolation des teams

```sql
ALTER TABLE public.teams
  ADD COLUMN game_session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE;

-- Maintenant les équipes appartiennent à une SESSION, pas globales
-- Chaque événement a ses propres équipes isolées
```

---

## 🔐 ROW LEVEL SECURITY (RLS)

### Isolation stricte par organisation

```sql
-- 1. Organizations - Voir seulement les siennes
CREATE POLICY "Users see their organizations"
  ON public.organizations
  FOR SELECT
  USING (
    id IN (
      SELECT organization_id
      FROM public.organization_users
      WHERE user_id = auth.uid()
    )
  );

-- 2. Game Sessions - Isolation par org
CREATE POLICY "Users see their org sessions"
  ON public.game_sessions
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_users
      WHERE user_id = auth.uid()
    )
  );

-- 3. Teams - Via game_session
CREATE POLICY "Users see teams in their sessions"
  ON public.teams
  FOR SELECT
  USING (
    game_session_id IN (
      SELECT id FROM public.game_sessions
      WHERE organization_id IN (
        SELECT organization_id
        FROM public.organization_users
        WHERE user_id = auth.uid()
      )
    )
  );

-- 4. Public access pour équipes (via session publique)
CREATE POLICY "Public teams for active sessions"
  ON public.teams
  FOR SELECT
  USING (
    game_session_id IN (
      SELECT id FROM public.game_sessions
      WHERE status = 'active'
    )
  );
```

---

## 🎨 PARCOURS UTILISATEUR

### 1. Inscription organisateur

```typescript
// pages/Signup.tsx
const handleSignup = async () => {
  // 1. Créer compte Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authData.user) {
    // 2. Créer organisation
    const { data: org } = await supabase.from('organizations').insert({
      name: companyName,
      slug: slugify(companyName),
      subscription_plan: 'free', // Démarrer en free
      max_teams_per_session: 10,
      max_events_per_month: 1,
    }).select().single();

    // 3. Associer user à org comme owner
    await supabase.from('organization_users').insert({
      organization_id: org.id,
      user_id: authData.user.id,
      role: 'owner',
    });

    // 4. Créer session demo automatique
    await supabase.from('game_sessions').insert({
      organization_id: org.id,
      name: 'Session de test',
      status: 'draft',
      event_type: 'demo',
    });

    // 5. Rediriger vers dashboard
    navigate('/dashboard');
  }
};
```

### 2. Dashboard organisateur

```typescript
// pages/Dashboard.tsx
export const Dashboard = () => {
  const { data: currentOrg } = useQuery({
    queryKey: ['current-organization'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();

      const { data } = await supabase
        .from('organization_users')
        .select('organizations(*)')
        .eq('user_id', user.user.id)
        .single();

      return data.organizations;
    }
  });

  const { data: sessions } = useQuery({
    queryKey: ['sessions', currentOrg?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false });

      return data;
    },
    enabled: !!currentOrg
  });

  return (
    <div>
      <h1>Mes événements - {currentOrg?.name}</h1>

      {/* Plan actuel */}
      <Card>
        <Badge>{currentOrg?.subscription_plan}</Badge>
        <p>Max équipes: {currentOrg?.max_teams_per_session}</p>
        <p>Événements ce mois: {sessions?.filter(isThisMonth).length} / {currentOrg?.max_events_per_month}</p>

        {currentOrg?.subscription_plan === 'free' && (
          <Button onClick={() => navigate('/upgrade')}>
            ⬆️ Passer en Pro (99€/mois)
          </Button>
        )}
      </Card>

      {/* Liste sessions */}
      <div>
        {sessions?.map(session => (
          <SessionCard
            key={session.id}
            session={session}
            onStart={() => navigate(`/regie/${session.id}`)}
          />
        ))}
      </div>

      <Button onClick={createNewSession}>
        + Nouvel événement
      </Button>
    </div>
  );
};
```

### 3. Créer un événement

```typescript
// pages/CreateEvent.tsx
const handleCreateEvent = async () => {
  // Vérifier limites du plan
  if (eventsThisMonth >= currentOrg.max_events_per_month) {
    toast({
      title: "Limite atteinte",
      description: "Passez en Pro pour des événements illimités",
      variant: "destructive"
    });
    return;
  }

  // Créer session
  const { data: session } = await supabase.from('game_sessions').insert({
    organization_id: currentOrg.id,
    name: eventName,
    logo_url: logoUrl,
    status: 'draft',
    event_type: 'live',
    starts_at: startDate,
    max_teams: currentOrg.max_teams_per_session,
  }).select().single();

  // Générer QR Code et PIN pour équipes
  const accessCode = generateAccessCode(); // 6 chiffres

  await supabase.from('game_sessions').update({
    access_code: accessCode
  }).eq('id', session.id);

  // Rediriger vers configuration
  navigate(`/events/${session.id}/setup`);
};
```

### 4. Interface équipe (avec org branding)

```typescript
// pages/Client.tsx
const loadSession = async (accessCode: string) => {
  const { data: session } = await supabase
    .from('game_sessions')
    .select('*, organizations(*)')
    .eq('access_code', accessCode)
    .single();

  if (!session) {
    toast({ title: "Code invalide", variant: "destructive" });
    return;
  }

  // Appliquer branding org
  document.documentElement.style.setProperty('--primary', session.organizations.primary_color);
  document.documentElement.style.setProperty('--secondary', session.organizations.secondary_color);

  setActiveSession(session);
  setOrgBranding(session.organizations);
};

return (
  <div>
    {/* Logo de l'organisation cliente */}
    <img src={orgBranding?.logo_url || session?.logo_url} alt="Logo" />

    {/* Interface normale */}
    <TeamInterface session={session} />
  </div>
);
```

---

## 💰 INTÉGRATION STRIPE

### Setup

```bash
npm install @stripe/stripe-js stripe
```

### Configuration

```typescript
// lib/stripe.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

// Plans
export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    maxTeams: 10,
    maxEvents: 1,
    features: [
      '10 équipes max',
      '1 événement/mois',
      'Support email (48h)',
      'Branding Arena'
    ]
  },
  pro: {
    name: 'Pro',
    price: 99,
    stripePriceId: 'price_xxx', // Créer dans Stripe Dashboard
    maxTeams: 60,
    maxEvents: 999,
    features: [
      '60 équipes',
      'Événements illimités',
      'Support prioritaire (4h)',
      'White-label',
      'Export données'
    ]
  },
  enterprise: {
    name: 'Enterprise',
    price: null, // Sur devis
    maxTeams: 999,
    maxEvents: 999,
    features: [
      'Équipes illimitées',
      'Serveur dédié',
      'Support 24/7',
      'Développement custom',
      'SLA garanti'
    ]
  }
};
```

### Checkout Session

```typescript
// pages/Upgrade.tsx
const handleUpgrade = async () => {
  const { data: user } = await supabase.auth.getUser();

  // Créer checkout session Stripe
  const { data: checkoutSession } = await supabase.functions.invoke('create-checkout-session', {
    body: {
      organization_id: currentOrg.id,
      plan: 'pro',
      success_url: `${window.location.origin}/dashboard?upgrade=success`,
      cancel_url: `${window.location.origin}/upgrade?canceled=true`,
    }
  });

  // Rediriger vers Stripe
  window.location.href = checkoutSession.url;
};
```

### Edge Function - Checkout

```typescript
// supabase/functions/create-checkout-session/index.ts
import { stripe } from '../_shared/stripe.ts';

Deno.serve(async (req) => {
  const { organization_id, plan, success_url, cancel_url } = await req.json();

  // Récupérer org
  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('*')
    .eq('id', organization_id)
    .single();

  // Créer ou récupérer customer Stripe
  let customerId = org.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: org.billing_email,
      name: org.name,
      metadata: {
        organization_id: org.id,
      }
    });

    customerId = customer.id;

    await supabaseAdmin
      .from('organizations')
      .update({ stripe_customer_id: customerId })
      .eq('id', org.id);
  }

  // Créer checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: PLANS[plan].stripePriceId,
        quantity: 1,
      }
    ],
    success_url,
    cancel_url,
    metadata: {
      organization_id: org.id,
      plan,
    }
  });

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

### Webhook Stripe

```typescript
// supabase/functions/stripe-webhook/index.ts
Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')!;
  const body = await req.text();

  // Vérifier signature
  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    Deno.env.get('STRIPE_WEBHOOK_SECRET')!
  );

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const { organization_id, plan } = session.metadata;

      // Mettre à jour org
      await supabaseAdmin.from('organizations').update({
        subscription_plan: plan,
        subscription_status: 'active',
        stripe_subscription_id: session.subscription,
        max_teams_per_session: PLANS[plan].maxTeams,
        max_events_per_month: PLANS[plan].maxEvents,
      }).eq('id', organization_id);

      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;

      // Downgrade vers free
      await supabaseAdmin.from('organizations').update({
        subscription_plan: 'free',
        subscription_status: 'canceled',
        max_teams_per_session: 10,
        max_events_per_month: 1,
      }).eq('stripe_subscription_id', subscription.id);

      break;
    }
  }

  return new Response(JSON.stringify({ received: true }));
});
```

---

## 🌐 SOUS-DOMAINES PERSONNALISÉS

### Option 1: Sous-domaines Arena (simple)

```
entreprise-x.arena.app
agence-events.arena.app
```

**Configuration DNS (Vercel/Netlify):**
- Wildcard CNAME: `*.arena.app` → Vercel

**Routage:**
```typescript
// middleware.ts (si Next.js) ou vite config
const getOrgFromSubdomain = (hostname: string) => {
  const subdomain = hostname.split('.')[0];

  if (subdomain === 'www' || subdomain === 'arena') {
    return null; // Site principal
  }

  return subdomain; // = slug organization
};

// Charger org context
const org = await supabase
  .from('organizations')
  .select('*')
  .eq('slug', subdomain)
  .single();

// Appliquer branding
```

### Option 2: Domaines custom (avancé)

```
quiz.entreprise-x.com
events.agence.fr
```

**Table custom_domains:**
```sql
CREATE TABLE public.custom_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  domain TEXT UNIQUE NOT NULL,
  verified BOOLEAN DEFAULT false,
  ssl_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Vérification DNS:**
```typescript
// supabase/functions/verify-domain/index.ts
const verifyDomain = async (domain: string) => {
  // Vérifier CNAME pointe vers Arena
  const dns = await fetch(`https://dns.google/resolve?name=${domain}&type=CNAME`);
  const record = await dns.json();

  if (record.Answer?.[0]?.data === 'arena.app.') {
    // Provisionner SSL via Vercel API
    await vercel.domains.add(domain);

    // Marquer comme vérifié
    await supabase.from('custom_domains').update({
      verified: true,
      ssl_status: 'active'
    }).eq('domain', domain);
  }
};
```

---

## 📊 ANALYTICS & USAGE

### Tracking utilisation

```sql
CREATE TABLE public.usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  event_type TEXT NOT NULL, -- 'event_created', 'team_connected', 'question_answered'
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour requêtes rapides
CREATE INDEX idx_usage_logs_org_date ON public.usage_logs(organization_id, created_at);
```

### Dashboard analytics

```typescript
// pages/Analytics.tsx
const { data: stats } = useQuery({
  queryKey: ['usage-stats', currentOrg.id],
  queryFn: async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data } = await supabase
      .from('usage_logs')
      .select('event_type, created_at')
      .eq('organization_id', currentOrg.id)
      .gte('created_at', thirtyDaysAgo.toISOString());

    return {
      eventsCreated: data.filter(l => l.event_type === 'event_created').length,
      totalParticipants: data.filter(l => l.event_type === 'team_connected').length,
      questionsAnswered: data.filter(l => l.event_type === 'question_answered').length,
    };
  }
});
```

---

## 🎯 MIGRATION DEPUIS VERSION ACTUELLE

### Étapes

1. **Créer organisation par défaut**
```sql
INSERT INTO public.organizations (id, name, slug, subscription_plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Arena Default', 'default', 'enterprise');
```

2. **Migrer sessions existantes**
```sql
UPDATE public.game_sessions
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;
```

3. **Migrer équipes vers sessions**
```sql
-- Associer toutes les équipes à la session active
UPDATE public.teams
SET game_session_id = (
  SELECT id FROM public.game_sessions WHERE status = 'active' LIMIT 1
)
WHERE game_session_id IS NULL;
```

4. **Déploiement progressif**
- Déployer nouveau schéma sans casser l'existant
- Tester avec nouvelle org de test
- Migrer données progressivement
- Activer RLS progressivement

---

## ✅ CHECKLIST MULTI-TENANT

- [ ] Tables `organizations`, `organization_users` créées
- [ ] RLS configuré et testé
- [ ] Signup organisateur fonctionnel
- [ ] Dashboard organisateur créé
- [ ] Intégration Stripe complète
- [ ] Webhooks Stripe testés
- [ ] Limites par plan appliquées
- [ ] Sous-domaines configurés (optionnel)
- [ ] Analytics utilisation en place
- [ ] Migration données existantes OK
- [ ] Documentation pour clients
- [ ] CGV et mentions légales
