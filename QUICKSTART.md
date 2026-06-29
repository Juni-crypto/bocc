# BOCC Quick Start

Three ways to run it. Pick one. Everything (database + photo storage) runs in
containers, so there is nothing else to install or sign up for.

---

## A. Easiest: run the whole system from prebuilt images

The only thing you need installed is **Docker** (Docker Desktop on Mac/Windows,
Docker Engine on Linux).

```bash
# 1. make a folder and grab two files
mkdir bocc && cd bocc
curl -O https://raw.githubusercontent.com/Juni-crypto/bocc/main/docker-compose.ghcr.yml
curl -O https://raw.githubusercontent.com/Juni-crypto/bocc/main/.env.prod.example
cp .env.prod.example .env.prod

# 2. set a login secret (any long random string)
#    macOS/Linux: this fills it in for you
sed -i '' "s/^JWT_SECRET=.*/JWT_SECRET=$(openssl rand -hex 32)/" .env.prod 2>/dev/null \
  || sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$(openssl rand -hex 32)/" .env.prod

# 3. start it
docker compose -f docker-compose.ghcr.yml --env-file .env.prod up -d
```

Open **http://localhost:3000**. That is the whole app.

Stop it later with:
```bash
docker compose -f docker-compose.ghcr.yml --env-file .env.prod down
```

---

## B. Run from source (for developers)

Same as A, but build the images yourself from the repo:

```bash
git clone https://github.com/Juni-crypto/bocc.git && cd bocc
cp .env.prod.example .env.prod        # set JWT_SECRET as above
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

For the live-reload dev setup (Next dev + Nest watch + Expo) instead of containers,
see the "Local setup" section in the main [README](./README.md).

---

## C. Deploy to a cloud VM (Terraform, one command)

Brings up a single server running the full stack, database and storage in
containers (no AWS RDS, no S3). You need an AWS account + the AWS CLI configured.

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars   # defaults are fine
terraform init
terraform apply                                 # prints the web + api URLs
```

Tear it down with `terraform destroy`. Details in
[infra/terraform/README.md](./infra/terraform/README.md).

---

## How to actually use it

1. **Open the web app** (http://localhost:3000) and click **Start an event**.
2. **Sign up** (this makes you a host) and create an event. You get a QR code and a
   share link, and you choose whether the gallery is private or public.
3. **Guests** open the link on their phones, tap to join (no account, just a name and
   a consent tap), and start adding photos. Everyone sees the pooled gallery.
4. **Find my photos**: a guest takes one selfie and gets every shot they appear in
   (this needs the AI engine turned on, below).

## Optional: turn on the AI (face match + search)

The stack ships with Immich (the AI engine) running but **disabled** so it starts
cleanly with no setup. To enable face matching and semantic search:

```bash
# with the stack already up:
# 1. open the Immich admin once to create an API key:  http://localhost:2283
#    (or run the helper if you cloned the repo)
node scripts/setup-immich.mjs

# 2. put the key in .env.prod and flip the switch
#    IMMICH_ENABLED=true
#    IMMICH_API_KEY=<the key>

# 3. re-apply
docker compose -f docker-compose.ghcr.yml --env-file .env.prod up -d
```

## The mobile app

Grab `bocc-<version>.apk` from the
[latest release](https://github.com/Juni-crypto/bocc/releases), install it on an
Android phone (allow unknown sources), and it works alongside the same backend.

---

That's it. One command to run, sign up, share a QR, and the night pools itself.
