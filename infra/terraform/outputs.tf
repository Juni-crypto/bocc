output "public_ip" {
  description = "Public IPv4 of the BOCC instance."
  value       = aws_instance.bocc.public_ip
}

output "web_url" {
  description = "BOCC web app."
  value       = "http://${aws_instance.bocc.public_ip}:3000"
}

output "api_url" {
  description = "BOCC API base."
  value       = "http://${aws_instance.bocc.public_ip}:4000/api"
}

output "ssh_command" {
  description = "SSH into the instance (requires key_name to be set)."
  value       = "ssh ubuntu@${aws_instance.bocc.public_ip}"
}

output "first_boot_note" {
  description = "Reminder that the first boot builds images."
  value       = "First boot installs Docker, clones the repo, and builds the api + web images. Allow about 3 to 5 minutes after apply before the URLs respond."
}
