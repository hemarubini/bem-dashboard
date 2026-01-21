# Aivar Security Scan Pipeline Template

## Overview

Our **Aivar organization** implements a comprehensive **security scanning CI/CD pipeline** using GitHub Actions. The pipeline automatically scans **`.tf`**, **`.tfvars`**, and **`.py`** files on every Pull Request, ensuring code quality and security compliance before merging.

### Technologies Used
- **Security Scanning**: 
  - **Bandit** - Python code security analysis
  - **Checkov** - Terraform/Infrastructure security scanning
- **CI/CD**: GitHub Actions with automated security validation
- **Cloud Platform**: AWS 

## Project Structure

**⚠️ MANDATORY**: All files must be organized in the correct folders:

- **Application files** (Python, JavaScript, etc.) → **`app/`** folder
- **Terraform files** (`.tf`, `.tfvars`) → **`Terraform/`** folder

This organization is required for the security scanning pipeline to function correctly.

```
repo-root/
├── .github/
│   └── workflows/
│       └── security-scan.yml          # Main security scanning CI/CD pipeline
├── .githooks/
│   └── pre-commit                     # Pre-Commit Setup
├── .pre-commit-config.yaml            # Precommit configuration
├── app/                               # Application source code
│   ├── src/                           # Source code files
│   ├── requirements.txt               # Python dependencies
│   └── main.py                        # Main application file
├── Terraform/                         # Infrastructure-as-Code (IaC) files
│   ├── environments/                  # Environment-specific configurations
│   │   ├── dev.tfvars                 # Development environment variables
│   │   └── prod.tfvars                # Production environment variables
│   ├── modules/                       # Reusable Terraform modules
│   │   └── ec2/                       # EC2 instance module
│   ├── main.tf                        # Root Terraform configuration
│   ├── variables.tf                   # Terraform variables
│   ├── output.tf                      # Terraform outputs
│   └── vulnerable.py                  # Example file for security testing
├── README.md                          # This documentation
└── .gitignore                         # Git ignore rules
```

### Folder Structure Explanation

#### `.github/workflows/`
- **`security-scan.yml`**: Contains the GitHub Actions workflow that runs security scans
- **Trigger**: Automatically runs on Pull Requests (opened, synchronized, reopened)
- **Purpose**: Ensures code security before merging

#### `app/` Directory
- **Purpose**: Contains all application source code
- **Contents**: Python files, JavaScript files, configuration files, etc.
- **Security Scanning**: All `.py` files in this directory are scanned by Bandit for security vulnerabilities
- **Structure**: Organize your application code with subdirectories like `src/`, `config/`, etc.

#### `Terraform/` Directory
- **Purpose**: Contains all Infrastructure-as-Code (IaC) files
- **Contents**: 
  - **`main.tf`**: Root Terraform configuration
  - **`variables.tf`**: Input variables
  - **`output.tf`**: Output values
  - **`environments/`**: Environment-specific variable files (`dev.tfvars`, `prod.tfvars`)
  - **`modules/`**: Reusable Terraform modules (e.g., `ec2/`)
- **Security Scanning**: All `.tf` and `.tfvars` files are scanned by Checkov for infrastructure security issues

> **⚠️ Important**: This is the **standard Aivar repository folder structure** that all contributors must follow. Deviating from this structure will break the CI/CD pipeline and security scanning.

## Implementation Steps

#### 1. Repository Setup
1. **Create Repository from Aivar Template**:
   - Go to GitHub and create a new repository using **'Aivar Template'**
   - Name your repository and create it

2. **Clone the Repository Locally**:
```bash
# Clone the repository
git clone <repository-url>
cd <repository-name>
```

#### 2. Branch Creation Order (MANDATORY)
**⚠️ CRITICAL**: The following branch creation order must be followed exactly:

1. **Main Branch** (created automatically when repository is created from template)
2. **Develop Branch** (create from main)
3. **Feature Branches** (create from develop)

#### Branch Flow Strategy

#### Why This Logic?
- **Feature Branch Management**: Multiple feature branches can be developed simultaneously
- **Quality Gates**: All features are merged into `develop` for integration testing
- **Production Safety**: Only thoroughly tested code from `develop` reaches `main`
- **Efficiency**: Reduces merge conflicts and ensures systematic deployment

1. **Feature Branches → Develop**: Uses `dev.tfvars` (Development environment)
   - Example: `feature/user-authentication` → `develop`
   - Purpose: Test new features in development environment

2. **Develop → Main**: Uses `prod.tfvars` (Production environment)
   - Example: `develop` → `main`
   - Purpose: Deploy tested features to production

```bash
# Step 1: Ensure you're on main branch
git checkout main

# Step 2: Create develop branch from main
git checkout -b develop
git push origin develop

# Step 3: Create feature branch from develop
git checkout develop
git checkout -b feature/your-feature-name
```

#### 3. Follow Folder Structure
- Place application code in the `app/` directory
- Place Terraform code in the `Terraform/` directory
- Use environment-specific `.tfvars` files
- Follow module structure for reusable components

#### 4. Development Workflow
```bash
# Make your changes
# Follow the folder structure guidelines

# Commit and push
git add .
git commit -m "feat: add new feature"
git push origin feature/your-feature-name
```

#### 5. Create Pull Request
- **⚠️ Prerequisite**: Ensure your repository is added to the AWS OIDC trust relationship (see [AWS OIDC Configuration](#aws-oidc-configuration) section)
- Create PR from `feature/*` to `develop`
- Wait for security scan completion
- Review findings and remediate issues
- Address any PR comments

## AWS OIDC Configuration

### Trust Relationship Setup

**⚠️ IMPORTANT**: When creating a new repository, the pipeline will fail to connect with AWS because the repository needs to be added to the OIDC trust relationship.

The security scanning pipeline uses AWS OIDC (OpenID Connect) to authenticate with AWS. Each repository must be explicitly added to the trust relationship policy.

### How to Add Your Repository

To connect your new repository with AWS, you need to add your repository details to the trust relationship policy in the AWS IAM role `Githubactions`.

#### Step 1: Access AWS IAM Console
1. Go to AWS IAM Console
2. Navigate to **Roles** → **Githubactions**
3. Click on **Trust relationships** tab
4. Click **Edit trust policy**

#### Step 2: Add Your Repository
Add your repository entries to the `"token.actions.githubusercontent.com:sub"` array in the JSON policy:

```json
"token.actions.githubusercontent.com:sub": [
    "repo:YOUR-ORG/YOUR-REPO:ref:refs/heads/main",
    "repo:YOUR-ORG/YOUR-REPO:ref:refs/heads/develop", 
    "repo:YOUR-ORG/YOUR-REPO:ref:refs/heads/feature*",
    "repo:YOUR-ORG/YOUR-REPO:pull_request"
]
```

#### Step 3: Repository Entry Format
Replace `YOUR-ORG/YOUR-REPO` with your actual repository details:

- **`repo:YOUR-ORG/YOUR-REPO:ref:refs/heads/main`** - For main branch
- **`repo:YOUR-ORG/YOUR-REPO:ref:refs/heads/develop`** - For develop branch  
- **`repo:YOUR-ORG/YOUR-REPO:ref:refs/heads/feature*`** - For all feature branches
- **`repo:YOUR-ORG/YOUR-REPO:pull_request`** - For pull requests

#### Step 4: Save Changes
1. Click **Update policy** to save the changes
2. Your repository will now be able to authenticate with AWS

### Example
If your repository is `aivar-tech/my-new-app`, add these entries:
```json
"repo:aivar-tech/my-new-app:ref:refs/heads/main",
"repo:aivar-tech/my-new-app:ref:refs/heads/develop",
"repo:aivar-tech/my-new-app:ref:refs/heads/feature*",
"repo:aivar-tech/my-new-app:pull_request"
```

## Security Scan CI/CD Pipeline

### Workflow Overview
The `security-scan.yml` workflow is a comprehensive security scanning pipeline that automatically validates code quality and security on every Pull Request.

### Workflow Trigger
The security scanning pipeline is automatically triggered on **Pull Requests**:
- **Opened**: When a new PR is created
- **Synchronized**: When new commits are pushed to the PR
- **Reopened**: When a closed PR is reopened

### Environment Detection Logic

The pipeline intelligently detects the target environment based on branch patterns:

```yaml
if: |
  (startsWith(github.head_ref, 'feature/') && github.base_ref == 'develop') ||
  (github.head_ref == 'develop' && github.base_ref == 'main')
```



### Pipeline Execution Flow

1. **Code Checkout**: Repository code is checked out
2. **AWS Authentication**: Configured using IAM role-based authentication
3. **Tool Installation**: Bandit and Checkov are installed
4. **Environment Detection**: Determines which `.tfvars` file to use
5. **Terraform Operations**:
   - `terraform init`: Initialize Terraform
   - `terraform plan`: Generate execution plan
   - Convert plan to JSON for Checkov analysis
6. **Security Scans**:
   - Bandit scans Python files
   - Checkov scans Terraform plan
7. **Report Generation**: Creates comprehensive security report
8. **S3 Upload**: Stores reports in AWS S3 for audit trail
9. **PR Comments**: Posts findings directly to PR with line-by-line links

## Working with Pull Requests

### After Creating a Pull Request

#### 1. Automated Workflow Execution
- The security scan workflow runs automatically
- Progress is visible in the **GitHub Actions** tab
- Real-time status updates are provided

#### 2. Security Report Access
- **S3 Storage**: All reports are stored in `s3://github-pullrequest-reports/{repo-name}/{branch-name}/`
- **Direct Links**: Reports are accessible via AWS Console and direct download links
- **Report Types**:
  - `bandit-report.json`: Python security findings
  - `checkov-report.json`: Infrastructure security findings
  - `report.md`: Human-readable summary

#### 3. PR Comment Integration
- **Line-by-line Comments**: Failed security findings are posted as PR comments
- **Direct Links**: Each comment includes a link to the exact line of code
- **Contextual Information**: Severity, confidence, and remediation guidance

## Troubleshooting

### Common Issues

#### 1. Pipeline Failures
- **Check folder structure**: Ensure files are in correct locations
- **Verify permissions**: Check AWS IAM role permissions
- **Review logs**: Check GitHub Actions logs for specific errors
- **Summary report not generated**: If there are too many errors, the summary report may not be generated in the PR. In this case, view the detailed reports in the S3 bucket - the location is provided in the GitHub Actions tab

### Getting Help

If any help is needed, contact the **DevOps team**.

---

*This repository follows the Aivar standard for secure, compliant, and maintainable infrastructure code.*
