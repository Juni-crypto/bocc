variable "region" {
  description = "AWS region to deploy into."
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type. Immich machine-learning wants RAM, so t3.large is the sane floor."
  type        = string
  default     = "t3.large"
}

variable "key_name" {
  description = "Optional name of an existing EC2 key pair for SSH. Leave empty to launch without an SSH key."
  type        = string
  default     = ""
}

variable "ssh_cidr" {
  description = "CIDR allowed to reach SSH (port 22). WARNING: the default 0.0.0.0/0 opens SSH to the whole internet. Restrict this to your IP for anything real."
  type        = string
  default     = "0.0.0.0/0"
}

variable "volume_size" {
  description = "Root gp3 volume size in GB. Immich media + the two Postgres volumes + ML model cache live here."
  type        = number
  default     = 60
}

variable "repo_url" {
  description = "Public git repository to clone and run on the instance."
  type        = string
  default     = "https://github.com/Juni-crypto/bocc.git"
}

variable "branch" {
  description = "Git branch to check out."
  type        = string
  default     = "main"
}

variable "jwt_secret" {
  description = "JWT signing secret for the API. A strong random value is generated if left empty."
  type        = string
  sensitive   = true
  default     = ""
}

variable "enable_immich" {
  description = "Start with Immich AI enabled. Keep false for a clean first boot (no API key exists yet); flip to true after minting a key. See the README."
  type        = bool
  default     = false
}

variable "project_name" {
  description = "Name tag applied to created resources."
  type        = string
  default     = "bocc"
}
