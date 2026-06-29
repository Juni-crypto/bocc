provider "aws" {
  region = var.region
}

# A strong JWT secret if the caller did not supply one.
resource "random_password" "jwt" {
  length  = 48
  special = false
}

locals {
  jwt_secret = var.jwt_secret != "" ? var.jwt_secret : random_password.jwt.result
}

# Latest Ubuntu 22.04 LTS amd64 AMI from Canonical.
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "root-device-type"
    values = ["ebs"]
  }
}

resource "aws_security_group" "bocc" {
  name        = "${var.project_name}-sg"
  description = "BOCC single-VM: SSH plus public web/api ports."

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_cidr]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Web (Next.js)"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "API (NestJS)"
    from_port   = 4000
    to_port     = 4000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "${var.project_name}-sg"
    Project = var.project_name
  }
}

resource "aws_instance" "bocc" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = var.key_name != "" ? var.key_name : null
  vpc_security_group_ids = [aws_security_group.bocc.id]

  root_block_device {
    volume_type = "gp3"
    volume_size = var.volume_size
  }

  # Public IP is resolved ON the instance at boot (via the metadata service in
  # the template), avoiding a Terraform dependency cycle on the instance's own IP.
  user_data = templatefile("${path.module}/user_data.sh.tftpl", {
    repo_url      = var.repo_url
    branch        = var.branch
    jwt_secret    = local.jwt_secret
    enable_immich = var.enable_immich ? "true" : "false"
  })

  # Re-run user_data if the bootstrap inputs change.
  user_data_replace_on_change = true

  tags = {
    Name    = var.project_name
    Project = var.project_name
  }
}
