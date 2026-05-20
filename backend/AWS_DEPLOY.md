# AWS Elastic Beanstalk Deploy Guide

## One-time setup

### 1. Install EB CLI
```
pip install awsebcli
```

### 2. Create AWS account + IAM user
- Go to aws.amazon.com → create account
- IAM → create user → attach policy: `AdministratorAccess-AWSElasticBeanstalk`
- Also attach: `AmazonRDSFullAccess`
- Generate access key → save key ID + secret

### 3. Configure AWS credentials
```
aws configure
# Enter: access key ID, secret, region: ap-southeast-2, output: json
```

### 4. Create RDS PostgreSQL database
- Go to AWS Console → RDS → Create database
- Engine: PostgreSQL 16
- Template: Free tier (first 12 months) or Production
- Instance: db.t3.micro
- Storage: 20GB
- Region: ap-southeast-2 (Sydney)
- DB name: duality
- Username: duality
- Set a strong password
- Public access: No (EB will access it via VPC)
- Save the endpoint URL

### 5. Initialise Elastic Beanstalk (from /backend directory)
```
cd backend
eb init
# Select: ap-southeast-2
# Application name: duality-pole
# Platform: Python 3.11
# No CodeCommit
# No SSH (unless you want it)
```

### 6. Create the environment
```
eb create duality-prod \
  --instance-type t3.small \
  --database.engine postgres \
  --database.username duality \
  --database.password YOUR_DB_PASSWORD \
  --envvars SECRET_KEY=YOUR_SECRET_KEY,DEBUG=False,ALLOWED_HOSTS=.elasticbeanstalk.com
```

Or create without DB flag if you already created RDS manually, then set env vars below.

### 7. Set environment variables
```
eb setenv \
  SECRET_KEY=your-secret-key \
  DEBUG=False \
  DATABASE_URL=postgres://duality:PASSWORD@YOUR_RDS_ENDPOINT:5432/duality \
  ALLOWED_HOSTS=.elasticbeanstalk.com,yourdomain.com \
  CORS_ALLOWED_ORIGINS=https://yourdomain.com \
  STRIPE_PUBLISHABLE_KEY=pk_live_... \
  STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  AWS_ACCESS_KEY_ID=... \
  AWS_SECRET_ACCESS_KEY=... \
  AWS_STORAGE_BUCKET_NAME=... \
  AWS_S3_REGION_NAME=ap-southeast-2 \
  EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend \
  EMAIL_HOST=smtp.gmail.com \
  EMAIL_PORT=587 \
  EMAIL_USE_TLS=True \
  EMAIL_HOST_USER=intrigued@dualitypole.com \
  EMAIL_HOST_PASSWORD=your-gmail-app-password \
  DEFAULT_FROM_EMAIL=intrigued@dualitypole.com
```

### 8. Deploy
```
eb deploy
```

### 9. Migrate data from Railway
```
# On Railway, dump the database:
pg_dump $DATABASE_URL > duality_backup.sql

# Restore into RDS:
psql YOUR_RDS_DATABASE_URL < duality_backup.sql
```

### 10. Point your domain
- EB Console → Environment → copy the URL (something.ap-southeast-2.elasticbeanstalk.com)
- Your domain DNS → add CNAME pointing to EB URL
- Add your domain to ALLOWED_HOSTS env var

## Ongoing deploys
```
git push origin main  # then:
eb deploy
```

Or set up CodePipeline for auto-deploy from GitHub (optional).

## Useful commands
```
eb status          # check environment health
eb logs            # tail logs
eb ssh             # SSH into the instance
eb open            # open the app in browser
```
