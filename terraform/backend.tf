terraform {
  backend "s3" {
    bucket         = "dpvm-terraform-state"
    key            = "dpvm/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "dpvm-terraform-locks"
    encrypt        = true
  }
}
