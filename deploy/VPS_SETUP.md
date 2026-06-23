# PSTM VPS Setup — Phase A0 (bring-up)

Step-by-step guide to stand up the Astro Node SSR backend on the existing
Hostinger VPS **without disturbing the already-live, SEO-promoted root domain**.

Everything here is **additive**: two new subdomains proxy to one Astro Node
process. The root domain's nginx block, DNS, and content are left untouched.

> Placeholders to replace throughout: `<domain>` (your root domain),
> `<VPS_IP>` (the server's public IP). Subdomains used:
> - `app.<domain>` → public Astro site (SSR)
> - `api.<domain>` → VPS backend (`/api/public/*` + JWT-gated `/api/internal/*`)

Artifacts referenced live alongside this file in [`deploy/`](.):
- [`nginx/pstm.conf`](./nginx/pstm.conf)
- [`systemd/pstm-astro.service`](./systemd/pstm-astro.service)
- [`systemd/pstm-worker.service`](./systemd/pstm-worker.service) — installed now, **enabled in step 10b (A3)**
- [`pstm-astro.env.example`](./pstm-astro.env.example)
- [`sudoers/pstm-deploy`](./sudoers/pstm-deploy) — scoped CI sudo rules (step 12, A4)

---

## 0. Prerequisites & safety

- SSH access to the VPS as a sudo-capable user.
- **Snapshot the VPS first** (Hostinger panel → Snapshots) so the live site can be restored if anything goes wrong.
- Note the existing web server. This guide assumes **nginx**. If the root site is served by Apache/LiteSpeed instead, stop and tell the team — the proxy block must match the live stack.

```bash
# Confirm what's serving the live site before changing anything
sudo systemctl status nginx
nginx -v
ls /etc/nginx/sites-enabled/
```

---

## 1. Create a non-root service user

```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin pstm
sudo mkdir -p /var/www/pstm
sudo chown -R pstm:pstm /var/www/pstm
```

---

## 2. Install Node ≥ 22.12

```bash
# NodeSource (Node 22 LTS)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # must be >= 22.12.0
```

---

## 3. Install Redis (for BullMQ — used in A3, provision now)

```bash
sudo apt-get install -y redis-server
```

Harden `/etc/redis/redis.conf`:

```conf
bind 127.0.0.1 ::1            # localhost only — never expose Redis
requirepass <STRONG_REDIS_PASSWORD>
appendonly yes                # AOF persistence so queued jobs survive restarts
maxmemory 256mb
maxmemory-policy noeviction   # don't silently drop queued jobs
```

```bash
sudo systemctl enable --now redis-server
sudo systemctl restart redis-server
redis-cli -a '<STRONG_REDIS_PASSWORD>' ping   # -> PONG
```

> Put the same password into `REDIS_URL` in the env file (step 7).

---

## 4. Install LibreOffice headless (for DOCX→PDF — used in A3, provision now)

```bash
sudo apt-get install -y libreoffice-core libreoffice-writer fonts-liberation
# Smoke test (creates a /tmp/<name>.pdf)
echo "hello" > /tmp/t.txt
soffice --headless --convert-to pdf --outdir /tmp /tmp/t.txt && ls /tmp/t.pdf
```

> If the quotation DOCX uses specific fonts, install them now (`/usr/share/fonts/`)
> and re-run a conversion to confirm the layout matches Word (gap 7.7).

---

## 5. Firewall (ufw)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Redis (6379) is intentionally **not** opened — it stays on localhost.

---

## 6. DNS in Cloudflare

In the Cloudflare dashboard for `<domain>` → DNS, add **proxied** (orange-cloud) records:

| Type | Name  | Content    | Proxy |
|------|-------|------------|-------|
| A    | app   | `<VPS_IP>` | Proxied |
| A    | api   | `<VPS_IP>` | Proxied |

- SSL/TLS mode: **Full (strict)** (works once certbot issues real certs in step 9).
- **Cloudflare Access:** gate `tools.<domain>` (the internal tool) only. **Do NOT**
  put `api.<domain>` behind Access — it's JWT-protected and must accept
  server-to-server calls (gap 7.11).

> Leave the existing root-domain DNS records exactly as they are.

---

## 7. Deploy the env file

```bash
# From your machine: copy the template up, then fill it ON the server
scp deploy/pstm-astro.env.example <you>@<VPS_IP>:/tmp/pstm-astro.env
sudo mv /tmp/pstm-astro.env /etc/pstm-astro.env
sudo nano /etc/pstm-astro.env     # fill in real values

sudo chown root:pstm /etc/pstm-astro.env
sudo chmod 640 /etc/pstm-astro.env
```

Key values for A0:
- `DATABASE_URL` → Supabase **Direct connection** (port 5432, `?sslmode=require`). Not the pooler.
- `INTERNAL_JWT_SECRET` → `openssl rand -hex 32` (same value goes into Repo B later).
- `REDIS_URL` → password from step 3.
- SMTP/R2 can stay as placeholders until A3.

> Never commit the filled file. `.env` and `.env.production` are already gitignored.

---

## 8. Get the app onto the VPS and build

The CI/CD pipeline (Phase A4) will automate this; for the first bring-up do it manually:

```bash
sudo -u pstm git clone <REPO_A_GIT_URL> /var/www/pstm/astro-web
cd /var/www/pstm/astro-web
sudo -u pstm npm ci
sudo -u pstm npm run build       # produces dist/server/entry.mjs
```

Quick manual check that the server boots (Ctrl-C after):

```bash
sudo -u pstm env HOST=127.0.0.1 PORT=4321 node ./dist/server/entry.mjs
```

> The DB/Drizzle wiring and the public/internal API split land in phases A1–A2.
> At A0 the goal is just: app builds, process boots, nginx proxies it, TLS works.

---

## 9. Install nginx config + TLS

```bash
# Edit the file first: replace every <domain>
sudo cp deploy/nginx/pstm.conf /etc/nginx/sites-available/pstm.conf
sudo ln -s /etc/nginx/sites-available/pstm.conf /etc/nginx/sites-enabled/pstm.conf
sudo nginx -t          # must pass — does NOT touch the root site block
sudo systemctl reload nginx

# Issue certs for the two new subdomains (certbot edits the 443 blocks in place)
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d app.<domain> -d api.<domain>
sudo nginx -t && sudo systemctl reload nginx
```

Now flip Cloudflare SSL/TLS to **Full (strict)** (step 6) if not already.

---

## 10. Install + start the systemd service

```bash
sudo cp deploy/systemd/pstm-astro.service /etc/systemd/system/
# pstm-worker is installed but NOT enabled until A3:
sudo cp deploy/systemd/pstm-worker.service /etc/systemd/system/
sudo systemctl daemon-reload

sudo systemctl enable --now pstm-astro
sudo systemctl status pstm-astro
journalctl -u pstm-astro -f       # tail logs
```

---

## 10b. Enable the background worker (A3)

The worker code now ships in the build (`npm run build` emits
`dist/worker/index.mjs`). Enable it once Redis (step 3) is up:

```bash
sudo systemctl enable --now pstm-worker
sudo systemctl status pstm-worker
journalctl -u pstm-worker -f      # expect: "[pstm-worker] started — queues: email, pdf, automation"
```

Before the worker can actually run jobs, fill the real values in
`/etc/pstm-astro.env`:
- `SMTP_*` → Google Workspace credentials (the `email` job).
- `R2_*` → Cloudflare R2 bucket/keys (`pdf` + `automation` upload outputs there).
- `PDF_TEMPLATE_PATH` (optional) → defaults to `templates/quotation.docx` in the
  checkout, which is committed, so no action needed unless you relocate it.

After editing the env file, `sudo systemctl restart pstm-astro pstm-worker`.

---

## 11. Verify end-to-end

```bash
# Local (on the VPS) — Astro responds
curl -I http://127.0.0.1:4321/

# Through nginx + Cloudflare — public site
curl -I https://app.<domain>/

# Backend reachable (a real route arrives in A2; for now any 200/404 from Astro is fine)
curl -I https://api.<domain>/
```

Checklist:
- [ ] Root domain still serves the live site (open it in a browser — unchanged).
- [ ] `https://app.<domain>/` loads over valid TLS.
- [ ] `https://api.<domain>/` reachable, **not** redirected to a Cloudflare Access login.
- [ ] `pstm-astro` **and** `pstm-worker` are `active (running)` and survive `sudo reboot`.
- [ ] Redis `PONG`; LibreOffice converts a test file.
- [ ] Worker log shows the three queues started.

---

## 12. CI/CD — automated deploys (Phase A4)

[`.github/workflows/deploy-vps.yml`](../.github/workflows/deploy-vps.yml) deploys
on every push to `main`. The pipeline: `npm ci` → **`db:migrate`** (Supabase
direct, from the runner) → `npm run build` (CI gate) → SSH to the VPS to
`git reset --hard origin/main`, `npm ci`, rebuild, and restart both services.

> Migrations run from the runner **before** the VPS restarts, so the schema is
> never behind the running code. Keep them additive (gap 7.5 baseline first).

> **Private repo?** The deploy step runs `git fetch`/`git reset` **as `pstm`**, so
> `pstm` needs non-interactive read access to Repo A — clone it (step 8) over SSH
> with a **read-only GitHub deploy key** in `pstm`'s `~/.ssh` (or use an HTTPS
> token via a git credential helper). Verify with `sudo -u pstm git -C
> /var/www/pstm/astro-web fetch` before the first CI run. (Public repo → skip.)

### 12.1 Create a CI deploy user + key

```bash
# A dedicated, sudo-limited user GitHub Actions logs in as (keeps the service
# user `pstm` nologin). Replace `deploy` consistently with the sudoers file.
sudo useradd --create-home --shell /bin/bash deploy

# Generate a dedicated keypair for CI (run locally, NO passphrase):
ssh-keygen -t ed25519 -C 'github-actions-pstm' -f ./pstm_deploy_key
# Install the PUBLIC key on the VPS:
sudo -u deploy mkdir -p /home/deploy/.ssh
sudo -u deploy bash -c 'cat >> /home/deploy/.ssh/authorized_keys' < ./pstm_deploy_key.pub
sudo chmod 700 /home/deploy/.ssh && sudo chmod 600 /home/deploy/.ssh/authorized_keys
```

### 12.2 Scoped passwordless sudo

The deploy user may only (a) build as `pstm` and (b) restart the two services:

```bash
sudo cp deploy/sudoers/pstm-deploy /etc/sudoers.d/pstm-deploy
# If your SSH user is NOT named "deploy", replace it (set CI_USER first):
#   CI_USER=youruser; sudo sed -i "s/^deploy /${CI_USER} /" /etc/sudoers.d/pstm-deploy
# Confirm systemctl's real path matches the file (edit the file if it differs):
command -v systemctl
sudo chmod 440 /etc/sudoers.d/pstm-deploy
sudo visudo -cf /etc/sudoers.d/pstm-deploy                     # must say "parsed OK"
```

The checkout at `/var/www/pstm/astro-web` stays owned by `pstm:pstm` (from
step 8); the deploy user touches it only via `sudo -u pstm`.

### 12.3 GitHub repository secrets

In the Repo A GitHub repo → Settings → Secrets and variables → Actions:

| Secret | Value |
|--------|-------|
| `DATABASE_URL` | Supabase **direct** connection (5432, `sslmode=require`) — same as the env file |
| `VPS_HOST` | `<VPS_IP>` or `api.<domain>` |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | contents of the **private** key `pstm_deploy_key` |
| `VPS_SSH_PORT` | only if SSH isn't on 22 (optional) |

> The CI runner connects to the VPS by its **public IP / a DNS name that resolves
> to it**. If you point `VPS_HOST` at `api.<domain>` (proxied by Cloudflare),
> Cloudflare does not proxy raw SSH — use a `ssh.<domain>` grey-cloud (DNS-only)
> record or the bare `<VPS_IP>`.

### 12.4 First run

Push to `main` (or run the workflow manually via **Actions → Deploy to VPS →
Run workflow**). Watch the run; on success:

```bash
# On the VPS:
journalctl -u pstm-astro -n 20
journalctl -u pstm-worker -n 20
```

Delete the local `pstm_deploy_key*` files once the private key is stored in the
GitHub secret.

---
