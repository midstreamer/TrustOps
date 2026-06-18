# TrustOps Buyer Demo Script

**Duration:** 20 minutes  
**Client:** Apex Energy  
**Golden case:** CASE-GOLDEN  
**Password:** `TrustOps123!`

## Pre-Demo Checklist

- [ ] Backend running (`GET /health` → ok, `GET /ready` → ready)
- [ ] Frontend running on port 3000 or 3001
- [ ] Seed data loaded (`python seed.py`)
- [ ] Browser logged out; cache cleared

## Act 1: Analyst — Case-Centered SOC Work (7 min)

**Login:** `analyst1@trustops.demo`

1. Open **Case Queue** → filter **Apex Energy** → search `GOLDEN`
2. Open **CASE-GOLDEN** — *Suspicious OAuth consent grant*
3. **Left panel:** Walk through alert details, MITRE mapping, SLA timers, timeline
4. **Right panel:** Generate **AI Triage Recommendation**
   - Point out: AI recommends, analyst decides
5. **Center panel:** Submit analyst decision
   - Show AI confidence vs analyst confidence side by side
   - Demonstrate **Modified** with override reason
6. Add investigation note and evidence item
7. Show updated SLA state and human-AI agreement badge

**Talking point:** *"The SIEM detected. TrustOps manages the work and captures the human-AI decision."*

## Act 2: Manager — Governance and QA (5 min)

**Login:** `manager@trustops.demo`

1. **Manager Dashboard** — open cases, SLA at risk, AI acceptance rate
2. **Trust Metrics** — show Trust Calibration Score and v2 metrics
   - Explain calibration transparently (operational indicator, not AI certification)
3. Open a triaged case → complete **QA Review**
4. **Reports** → generate Apex monthly report → **Preview** → **Publish**

**Talking point:** *"Managers govern quality, SLA performance, and human-AI trust — without replacing the SIEM."*

## Act 3: Client — Value Proof (4 min)

**Login:** `client@apex.demo`

1. **Client Dashboard** — open cases, SLA performance, notable incidents
2. **Reports** — view published report only
3. Walk through v2 sections: Service Activity, AI-Assisted Triage Oversight, Trust Metrics Summary, Value Delivered
4. Use **Print / Save as PDF** on preview

**Talking point:** *"The portal proves service value — no internal QA notes, no raw AI prompts."*

## Act 4: Integration — Microsoft Sentinel (4 min)

1. Show `GET /integrations/sentinel/health`
2. Post sample from `samples/sentinel-alert-payload.json`:

```bash
curl -X POST http://localhost:8001/integrations/sentinel/alerts \
  -H "Content-Type: application/json" \
  -H "X-TrustOps-Webhook-Key: dev-webhook-key-change-in-production" \
  -d @samples/sentinel-alert-payload.json
```

3. Return to **Case Queue** — show new Sentinel-ingested case

**Talking point:** *"Sentinel enriches and detects. TrustOps creates the case and manages analyst workflow."*

## Close

- Recap: detect → enrich → manage → prove
- Offer pilot deployment modes (see `docs/deployment.md`)
- Reference Trust Calibration as ongoing operational metric
