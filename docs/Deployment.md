# Deployment Guide — `dr-jam.schmidlin.casa`

This guide walks through deploying **Dr. JAM** to the same homelab stack used by [Valhalla Landing Page](https://github.com/mschmidlin1/ValhallaLandingPage): a **self-hosted GitHub Actions runner** on the home Linux PC (Mint), **Docker** images on **GHCR**, **k3s** on Mint, and public HTTPS via the existing **Cloudflare Tunnel** (`cloudflared`) on `schmidlin.casa`.

**Target URL:** `https://dr-jam.schmidlin.casa`

**Prerequisites (already in place from Valhalla):**

- k3s cluster running on Mint with `kubectl` working
- `cloudflared` pod healthy in the `cloudflared` namespace
- `schmidlin.casa` **Active** in Cloudflare with SSL/TLS mode **Full**
- You can SSH to Mint and run `kubectl`

For background on how those pieces fit together, see the Valhalla docs at `~/repos/valhallalandingpage/docs/` — especially [Self-Hosting.md](https://github.com/mschmidlin1/ValhallaLandingPage/blob/main/docs/Self-Hosting.md) and [CustomDomainSetup.md](https://github.com/mschmidlin1/ValhallaLandingPage/blob/main/docs/CustomDomainSetup.md).

---

## Summary

| Item | Value |
|------|-------|
| **Public URL** | `https://dr-jam.schmidlin.casa` |
| **GitHub repo** | `github.com/mschmidlin1/dr-jam` |
| **Deploy trigger** | Push to `main` (or manual workflow run) |
| **GHCR image** | `ghcr.io/mschmidlin1/dr-jam` |
| **K8s namespace** | `drjam` |
| **In-cluster Service URL** | `http://drjam.drjam.svc.cluster.local:80` |
| **Container** | nginx:alpine serving `src/` + `resources/` |

**What is shared with Valhalla:** one k3s cluster, one `cloudflared` tunnel, one Mint box. You add a **new namespace**, a **new GHCR package**, a **new self-hosted runner** for this repo, and one **new tunnel public hostname**.

**What is different from Valhalla:** Dr. JAM ships large `.wav` studio recordings under `resources/music/`. The Docker image will be **much larger** than Valhalla's static-only image. First builds and image pulls take longer; that is expected.

---

## Architecture

```mermaid
flowchart TB
    subgraph git [GitHub]
        main[main branch]
    end

    subgraph actions [GitHub Actions on Mint]
        wf[deploy.yml]
    end

    subgraph ghcr [GHCR]
        img["ghcr.io/mschmidlin1/dr-jam :latest / :sha"]
    end

    subgraph k3s [k3s cluster]
        ns[namespace drjam]
        cfd[cloudflared pod]
    end

    subgraph cf [Cloudflare]
        host[dr-jam.schmidlin.casa]
    end

    main --> wf --> img --> ns
    host --> cfd --> ns
```

When a visitor opens `https://dr-jam.schmidlin.casa`:

1. Cloudflare DNS resolves the hostname and terminates HTTPS at the edge.
2. Traffic flows through the existing outbound tunnel to the `cloudflared` pod.
3. `cloudflared` forwards to `http://drjam.drjam.svc.cluster.local:80`.
4. The cluster **Service** routes to the **Pod** running nginx.
5. nginx serves `index.html`, CSS, JS, images, and `.wav` files from the container filesystem.

---

## Migration overview

| Phase | What |
|-------|------|
| 1 | Add `Dockerfile` and `.dockerignore` |
| 2 | Add Kubernetes manifests under `k8s/` |
| 3 | Register a self-hosted runner for **this** repo |
| 4 | Add `.github/workflows/deploy.yml` |
| 5 | Configure GitHub Actions permissions and GHCR package visibility |
| 6 | Push to `main` — first automated deploy |
| 7 | Add Cloudflare Tunnel public hostname for `dr-jam.schmidlin.casa` |
| 8 | Verify end-to-end |

Phases 1–4 can land on a feature branch and merge to `main` via PR. The workflow only runs after it exists on `main` (or you push directly to `main`).

---

## Phase 1 — Docker image

Dr. JAM is a static site (HTML, CSS, JS) with assets in `resources/`. The HTML references images and audio with paths like `../resources/images/...` and `../resources/music/...`, so the image must include **both** `src/` and `resources/` at the correct relative paths.

### 1.1 Create `Dockerfile` at the repo root

```dockerfile
FROM nginx:alpine

COPY src/ /usr/share/nginx/html/
COPY resources/ /usr/share/nginx/resources/

EXPOSE 80
```

With this layout, a request for `/index.html` resolves under `/usr/share/nginx/html/`, and `../resources/` resolves to `/usr/share/nginx/resources/` — matching local development with Live Server.

### 1.2 Create `.dockerignore` at the repo root

Keeps the build context small and excludes files that should not ship in the image:

```gitignore
.git
.github
.vscode
k8s
docs
README.md
.gitignore
.dockerignore
Dockerfile
.DS_Store
**/.DS_Store
```

Do **not** exclude `resources/` — the audio and images are required in production.

### 1.3 Local smoke test (optional but recommended)

From the repo root on a machine with Docker:

```bash
docker build -t dr-jam-local .
docker run --rm -p 8080:80 dr-jam-local
```

Open `http://localhost:8080/` in a browser. Confirm:

- Bio tab loads images
- Studio Recordings tab lists albums and audio plays

Stop the container with Ctrl+C.

> **Note:** The first `docker build` may take several minutes because of the `.wav` files. Subsequent builds are faster when only small files change (Docker layer cache).

---

## Phase 2 — Kubernetes manifests

Create a `k8s/` directory with Kustomize manifests. Do **not** add `cloudflared` here — the tunnel is cluster-wide infrastructure already deployed from Valhalla.

### 2.1 Directory layout

```text
k8s/
  namespace.yaml
  deployment.yaml
  service.yaml
  kustomization.yaml
```

### 2.2 `k8s/namespace.yaml`

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: drjam
```

### 2.3 `k8s/deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: drjam
  namespace: drjam
spec:
  replicas: 1
  selector:
    matchLabels:
      app: drjam
  template:
    metadata:
      labels:
        app: drjam
    spec:
      containers:
        - name: app
          image: ghcr.io/mschmidlin1/dr-jam:latest
          ports:
            - containerPort: 80
          livenessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 5
            periodSeconds: 5
          resources:
            requests:
              cpu: 50m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
```

Liveness/readiness `initialDelaySeconds` are slightly higher than Valhalla's because the container image is larger and may take longer to pull on first deploy.

### 2.4 `k8s/service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: drjam
  namespace: drjam
spec:
  type: ClusterIP
  selector:
    app: drjam
  ports:
    - port: 80
      targetPort: 80
```

### 2.5 `k8s/kustomization.yaml`

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - namespace.yaml
  - deployment.yaml
  - service.yaml
```

### 2.6 Apply once manually (optional)

On Mint, after the manifests exist locally or in a checkout:

```bash
kubectl apply -k k8s/
kubectl get all -n drjam
```

The pod will not reach **Running** until an image exists on GHCR (Phase 6). `ImagePullBackOff` before the first CI build is expected.

---

## Phase 3 — Self-hosted GitHub Actions runner

Runners are registered **per repository**. Even if Mint already has a runner for Valhalla Landing Page, you need a **separate** runner for `dr-jam`.

### 3.1 Register the runner on Mint

1. Open [github.com/mschmidlin1/dr-jam/settings/actions/runners](https://github.com/mschmidlin1/dr-jam/settings/actions/runners).
2. Click **New self-hosted runner** → **Linux** → **x64**.
3. On Mint, create a dedicated directory (do not reuse Valhalla's `~/actions-runner`):

   ```bash
   mkdir -p ~/actions-runner-dr-jam && cd ~/actions-runner-dr-jam
   ```

4. Copy and run the **Configure** commands from GitHub exactly (download tarball, extract, `./config.sh --url https://github.com/mschmidlin1/dr-jam --token ...`).
5. At the prompts, press **Enter** to accept defaults (runner group, hostname as name, `self-hosted` label, `_work` folder).
6. Install and start the service:

   ```bash
   sudo ./svc.sh install
   sudo ./svc.sh start
   sudo ./svc.sh status
   ```

Ensure the runner user is in the `docker` group and has `~/.kube/config` (same as Valhalla — see Valhalla's [KubernetesSetup.md §1.3](https://github.com/mschmidlin1/ValhallaLandingPage/blob/main/docs/KubernetesSetup.md)).

### 3.2 Confirm on GitHub

Return to **Settings → Actions → Runners**. The new runner should show **Idle** or **Active**.

---

## Phase 4 — GitHub Actions deploy workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  packages: write

jobs:
  deploy:
    runs-on: self-hosted

    env:
      KUBECONFIG: /home/mike/.kube/config

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Log in to GHCR
        run: echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u "${{ github.actor }}" --password-stdin

      - name: Build and push image
        run: |
          IMAGE=ghcr.io/mschmidlin1/dr-jam
          docker build -t "${IMAGE}:${{ github.sha }}" -t "${IMAGE}:latest" .
          docker push "${IMAGE}:${{ github.sha }}"
          docker push "${IMAGE}:latest"

      - name: Apply Kubernetes manifests
        run: kubectl apply -k k8s/

      - name: Roll out new image
        run: |
          kubectl set image deployment/drjam \
            app=ghcr.io/mschmidlin1/dr-jam:${{ github.sha }} \
            -n drjam
          kubectl rollout status deployment/drjam \
            -n drjam \
            --timeout=10m
```

**Important:** Replace `/home/mike` in `KUBECONFIG` if the runner runs as a different user. The self-hosted runner systemd service does **not** load `~/.bashrc`, so this env var is required — see Valhalla's [Self-Hosting.md — KUBECONFIG gotcha](https://github.com/mschmidlin1/ValhallaLandingPage/blob/main/docs/Self-Hosting.md#common-gotcha-kubeconfig-in-ci).

The rollout timeout is **10 minutes** (vs Valhalla's 5) to allow for a slower first image push/pull due to audio assets.

---

## Phase 5 — GitHub repository settings

### 5.1 Enable Actions and workflow permissions

1. [github.com/mschmidlin1/dr-jam/settings/actions](https://github.com/mschmidlin1/dr-jam/settings/actions) → ensure Actions are enabled.
2. Under **Workflow permissions**, select **Read and write permissions** (required to push to GHCR).
3. Save.

### 5.2 GHCR package visibility (after first successful deploy)

After the first workflow run pushes an image:

1. Open [github.com/mschmidlin1/dr-jam/pkgs/container/dr-jam](https://github.com/mschmidlin1/dr-jam/pkgs/container/dr-jam) (or **Packages** in the repo sidebar).
2. **Package settings** → set visibility to **Public** so k3s can pull without `imagePullSecrets`.

No additional GitHub Actions secrets are required for this static site.

---

## Phase 6 — First automated deploy

1. Commit Phases 1–4 files and push to **`main`** (or merge a PR).
2. Open [github.com/mschmidlin1/dr-jam/actions](https://github.com/mschmidlin1/dr-jam/actions).
3. Select the latest **Deploy** run and confirm each step passes:
   - **Build and push image** — may take several minutes on first run
   - **Apply Kubernetes manifests** — creates/updates the `drjam` namespace
   - **Roll out new image** — pod reaches Ready

On Mint:

```bash
kubectl get pods -n drjam
```

Expected: **STATUS** `Running`, **READY** `1/1`.

```bash
kubectl get pods -n drjam -o jsonpath='{.items[0].spec.containers[0].image}{"\n"}'
```

Expected: `ghcr.io/mschmidlin1/dr-jam:<commit-sha>`.

**In-cluster HTTP check (no public URL yet):**

```bash
kubectl run curl-test --rm -it --restart=Never --image=curlimages/curl -- \
  curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  http://drjam.drjam.svc.cluster.local/
```

Expected: `HTTP 200`.

If the workflow fails, see [Troubleshooting](#troubleshooting) before continuing.

---

## Phase 7 — Cloudflare Tunnel route for `dr-jam.schmidlin.casa`

The app runs in the cluster but is not public until you add a **Public Hostname** on the **existing** homelab tunnel. Do **not** create a second tunnel.

### 7.1 Add the public hostname

1. Open [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) → **Networks** → **Tunnels**.
2. Click your existing tunnel (e.g. `homelab-k3s`). Confirm status **Healthy**.
3. **Public Hostname** tab → **Add a public hostname**.
4. Fill in:

| Field | Value |
|-------|-------|
| **Subdomain** | `dr-jam` |
| **Domain** | `schmidlin.casa` |
| **Path** | *(leave empty)* |
| **Type** | `HTTP` |
| **URL** | `http://drjam.drjam.svc.cluster.local:80` |

5. Save.

Cloudflare creates a proxied DNS record for `dr-jam.schmidlin.casa` automatically.

### 7.2 Confirm DNS

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **`schmidlin.casa`** → **DNS** → **Records**.
2. You should see **`dr-jam`** (proxied, orange cloud) pointing at the tunnel.

You should already have **`www`** (Valhalla) and possibly **`dev`** on the same tunnel. All hostnames coexist on one tunnel.

---

## Phase 8 — Verify the public URL

From any machine:

```bash
curl -I https://dr-jam.schmidlin.casa
```

Expected: `HTTP/2 200` (or `HTTP/1.1 200`) with a valid certificate for `dr-jam.schmidlin.casa`.

Open **`https://dr-jam.schmidlin.casa`** in a browser. Confirm:

- Banner images rotate on the Bio tab
- Studio Recordings albums load and audio plays
- Videos tab behaves as expected

### 8.1 Optional — link from Valhalla

If you want the Valhalla landing page to link to Dr. JAM, update [`src/js/links.js`](https://github.com/mschmidlin1/ValhallaLandingPage/blob/main/src/js/links.js) in the Valhalla repo with `url: "https://dr-jam.schmidlin.casa"` and deploy Valhalla separately.

---

## Day-to-day operations

| Task | How |
|------|-----|
| Deploy a change | Push (or merge) to **`main`** |
| Watch deploy | [Actions → Deploy](https://github.com/mschmidlin1/dr-jam/actions) |
| Pod health | `kubectl get pods -n drjam` |
| App logs | `kubectl logs -n drjam deploy/drjam -f` |
| Roll back | `kubectl rollout undo deployment/drjam -n drjam` |
| Redeploy without code changes | Actions → **Deploy** → **Run workflow** |
| Pull image locally | `docker pull ghcr.io/mschmidlin1/dr-jam:latest` |

**Typical edit flow:**

```bash
# edit src/ or resources/...
git add -A && git commit -m "Update bio text"
git push origin main
# → dr-jam.schmidlin.casa updates after the workflow finishes
```

---

## Local development vs production

| | Local dev | Production |
|---|-----------|------------|
| **How you run it** | VS Code Live Server on `src/index.html` | nginx inside a Kubernetes pod |
| **URL** | `http://localhost:5500` (typical Live Server port) | `https://dr-jam.schmidlin.casa` |
| **Updates** | Save file → browser refresh | Push to `main` → automatic deploy |
| **Audio/images** | Served from `resources/` on disk | Baked into the container image |

There is no JavaScript build step — the same files in `src/` and `resources/` are what you edit locally and what nginx serves in production.

---

## Troubleshooting

### Deploy workflow does not appear after push

- The workflow file must exist **in the commit you pushed** on `main`.
- Confirm **Deploy** appears under the [Actions tab](https://github.com/mschmidlin1/dr-jam/actions).

### Runner does not pick up the job

- Check [Settings → Actions → Runners](https://github.com/mschmidlin1/dr-jam/settings/actions/runners) — runner must be **Idle** or **Active**.
- On Mint: `sudo ~/actions-runner-dr-jam/svc.sh status`

### Build succeeds but pod stays `ImagePullBackOff`

- Set the GHCR package to **public** (Phase 5.2).
- Verify the tag exists: [GHCR package](https://github.com/mschmidlin1/dr-jam/pkgs/container/dr-jam) → look for `latest` / commit SHA.

### `Apply Kubernetes manifests` fails with KUBECONFIG error

The workflow must set:

```yaml
env:
  KUBECONFIG: /home/mike/.kube/config
```

See Valhalla [Self-Hosting.md](https://github.com/mschmidlin1/ValhallaLandingPage/blob/main/docs/Self-Hosting.md#common-gotcha-kubeconfig-in-ci).

### In-cluster curl returns 200 but `dr-jam.schmidlin.casa` fails

| Symptom | Fix |
|---------|-----|
| DNS NXDOMAIN | Public hostname not saved; check Cloudflare DNS for `dr-jam` record |
| 502 / tunnel error | `kubectl get pods -n cloudflared` — tunnel pod must be Running |
| Wrong site / 404 | Tunnel **URL** must be `http://drjam.drjam.svc.cluster.local:80` |
| SSL error | Domain **Active** in Cloudflare; SSL/TLS mode **Full** on `schmidlin.casa` |

```bash
kubectl logs -n cloudflared -l app=cloudflared --tail=50
```

### Images or audio missing in production but work locally

- Confirm `Dockerfile` copies **both** `src/` and `resources/`.
- Confirm `.dockerignore` does not exclude `resources/`.
- Rebuild and redeploy after fixing the Dockerfile.

### Build or deploy is very slow

Expected on first run due to `.wav` files in `resources/music/`. Later deploys are faster when only HTML/CSS/JS change (Docker caches the `resources/` layer).

---

## What does not change

| Component | Notes |
|-----------|-------|
| Valhalla `k8s/` and deploy workflow | Untouched |
| `cloudflared` pod and tunnel token | One tunnel serves all `*.schmidlin.casa` app routes |
| Valhalla namespace `valhallalandingpage` | Separate app, separate namespace |

---

## Completion checklist

- [ ] `Dockerfile` and `.dockerignore` committed
- [ ] `k8s/` manifests committed (namespace, deployment, service, kustomization)
- [ ] Self-hosted runner registered for `dr-jam` and showing Idle/Active
- [ ] `.github/workflows/deploy.yml` committed on `main`
- [ ] GitHub Actions workflow permissions set to read/write
- [ ] **Deploy** workflow run succeeded on push to `main`
- [ ] `kubectl get pods -n drjam` → Running `1/1`
- [ ] In-cluster curl → HTTP 200
- [ ] GHCR package visibility set to public
- [ ] Cloudflare public hostname `dr-jam.schmidlin.casa` → `http://drjam.drjam.svc.cluster.local:80`
- [ ] `curl -I https://dr-jam.schmidlin.casa` → 200
- [ ] Browser: bio images and studio recordings work

---

## See also

- [Valhalla Self-Hosting.md](https://github.com/mschmidlin1/ValhallaLandingPage/blob/main/docs/Self-Hosting.md) — pipeline overview
- [Valhalla CustomDomainSetup.md](https://github.com/mschmidlin1/ValhallaLandingPage/blob/main/docs/CustomDomainSetup.md) — Cloudflare Tunnel architecture
- [Valhalla DevDeployment.md](https://github.com/mschmidlin1/ValhallaLandingPage/blob/main/docs/DevDeployment.md) — pattern for adding another hostname on the same tunnel
- [Valhalla DockerSetup.md](https://github.com/mschmidlin1/ValhallaLandingPage/blob/main/docs/DockerSetup.md) — Dockerfile playbook for static nginx sites
- [Valhalla KubernetesSetup.md](https://github.com/mschmidlin1/ValhallaLandingPage/blob/main/docs/KubernetesSetup.md) — one-time cluster and runner setup
