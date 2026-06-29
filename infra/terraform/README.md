# BOCC on one VM (Terraform, containerized DB + storage)

This brings the entire BOCC stack up on a single AWS EC2 instance. Everything
runs in containers from `docker-compose.prod.yml`: the app Postgres (pgvector),
the API, the web app, and the full Immich engine with its own Postgres and
media storage. There is no managed database and no object storage. The app DB
lives in the `bocc-db-data` volume and Immich media lives in the
`bocc-immich-upload` volume, both on the instance's root disk.

## What gets created

- One `aws_instance` (Ubuntu 22.04 LTS, default `t3.large`) with a 60 GB gp3 root volume.
- One `aws_security_group` allowing SSH (22, from `ssh_cidr`) and public 80, 3000, 4000.
- A generated `JWT_SECRET` if you do not supply one.

cloud-init on the instance installs Docker and the compose plugin, clones the
repo, writes `.env.prod` (deriving the instance's public IP from the metadata
service so `PUBLIC_API_URL` is correct), and runs
`docker compose -f docker-compose.prod.yml up -d --build`.

## Deploy

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars   # optional; edit as needed

terraform init
terraform plan
terraform apply
```

You need AWS credentials in your environment (for example `AWS_ACCESS_KEY_ID` /
`AWS_SECRET_ACCESS_KEY`, or a configured profile). After `apply`, Terraform
prints `web_url`, `api_url`, and `ssh_command`.

The first boot installs Docker, clones the repo, and builds the api and web
images. Allow about 3 to 5 minutes after `apply` finishes before the URLs
respond. To watch progress:

```bash
ssh ubuntu@<public-ip>
sudo cat /var/log/cloud-init-output.log
cd /opt/bocc && sudo docker compose -f docker-compose.prod.yml ps
```

## Enabling Immich AI afterward

The stack ships with Immich disabled so the first boot is clean (no API key
exists yet). To turn the AI on:

```bash
ssh ubuntu@<public-ip>
cd /opt/bocc

# 1. Mint an Immich API key. Either run the bundled provisioner against the
#    internal Immich, or create a key in the Immich admin UI.
sudo docker compose -f docker-compose.prod.yml exec api \
  node /app/scripts/setup-immich.mjs   # if running this way, point IMMICH_URL at http://immich-server:2283

# 2. Put the key into .env.prod and enable Immich.
sudo sed -i 's|^IMMICH_API_KEY=.*|IMMICH_API_KEY=<your-key>|' .env.prod
sudo sed -i 's|^IMMICH_ENABLED=.*|IMMICH_ENABLED=true|'       .env.prod

# 3. Recreate the api so it picks up the new env.
sudo docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

`GET /api/health` then reports `"immich":"enabled"`.

Alternatively set `enable_immich = true` in `terraform.tfvars` from the start,
but you still must supply an API key once Immich has booted.

## Cost and teardown

A `t3.large` plus a 60 GB gp3 volume is a low-double-digit USD per month order
of magnitude in `us-east-1` (check current AWS pricing for your region). When
you are done:

```bash
terraform destroy
```

That deletes the instance, its security group, and the root volume, including
all container data (the app DB and Immich media). Snapshot or copy anything you
want to keep before destroying.

## Security notes

- The default `ssh_cidr` is `0.0.0.0/0`, which opens SSH to the entire internet.
  Set it to your own IP in `terraform.tfvars`.
- The databases and Immich are only on the internal Docker network; only web
  (3000) and api (4000) are published. This is plain HTTP for a demo. Put a TLS
  proxy in front for anything beyond a quick deployment.
