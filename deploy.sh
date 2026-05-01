#!/bin/bash
set -e

echo "============== 🚀 TradeSim Auto-Deployer =============="

if ! command -v aws &> /dev/null; then
    echo "❌ Error: AWS CLI is not installed."
    exit 1
fi

RESUME=false
if [ -f "aws_state.txt" ]; then
    echo "♻️ Existing deployment state found in aws_state.txt! Checking connection..."
    source aws_state.txt
    PUBLIC_IP=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Reservations[0].Instances[0].PublicIpAddress' --output text 2>/dev/null || true)
    
    if [ "$PUBLIC_IP" != "None" ] && [ -n "$PUBLIC_IP" ]; then
        echo "✅ Resuming deployment explicitly using existing server: $PUBLIC_IP"
        RESUME=true
    else
        echo "⚠️ Previous server no longer exists. Proceeding with fresh provisioning."
        rm -f aws_state.txt
    fi
fi

if [ "$RESUME" == "false" ]; then
    echo "1. Configuring Networking Rules..."
    SG_ID=$(aws ec2 describe-security-groups --group-names "trade-sim-sg" --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || true)
    if [ -z "$SG_ID" ] || [ "$SG_ID" == "None" ]; then
        SG_ID=$(aws ec2 create-security-group --group-name "trade-sim-sg" --description "TradeSim Security Group" --query 'GroupId' --output text)
    fi

    aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 22 --cidr 0.0.0.0/0 2>/dev/null || true
    aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0 2>/dev/null || true

    echo "2. Generating Secure SSH Keys..."
    aws ec2 delete-key-pair --key-name "trade-sim-key" 2>/dev/null || true
    rm -f trade-sim-key.pem
    aws ec2 create-key-pair --key-name "trade-sim-key" --query 'KeyMaterial' --output text > trade-sim-key.pem
    chmod 400 trade-sim-key.pem

    echo "3. Provisioning Server (Ubuntu t3.medium)..."
    AMI_ID=$(aws ssm get-parameters --names /aws/service/canonical/ubuntu/server/22.04/stable/current/amd64/hvm/ebs-gp2/ami-id --query 'Parameters[0].Value' --output text)
    
    # Intelligently fetch the exact root partition name so we forcefully expand the right drive and avoid ENOSPC
    ROOT_DEV=$(aws ec2 describe-images --image-ids $AMI_ID --query 'Images[0].RootDeviceName' --output text)

    INSTANCE_ID=$(aws ec2 run-instances \
        --image-id $AMI_ID \
        --instance-type t3.medium \
        --key-name trade-sim-key \
        --security-group-ids $SG_ID \
        --block-device-mappings "[{\"DeviceName\":\"$ROOT_DEV\",\"Ebs\":{\"VolumeSize\":24,\"VolumeType\":\"gp3\",\"DeleteOnTermination\":true}}]" \
        --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=TradeSim}]' \
        --query 'Instances[0].InstanceId' --output text)

    # ---- STATE TRACKING FOR ROLLBACK ----
    echo "INSTANCE_ID=$INSTANCE_ID" > aws_state.txt
    echo "SG_ID=$SG_ID" >> aws_state.txt
    echo "   -> Tracking IDs saved to aws_state.txt for perfect idempotency/teardown later."
    # -------------------------------------

    echo "   ...Waiting for AWS hardware to power up (approx 30s)..."
    aws ec2 wait instance-running --instance-ids $INSTANCE_ID
    PUBLIC_IP=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

    echo "✅ Server Live! Public IP allocated: $PUBLIC_IP"
    echo "   ...Waiting 60s for Ubuntu OS to completely boot SSH services..."
    sleep 60
fi

echo "4. Zipping Payload..."
cd "$(dirname "$0")"
rm -f /tmp/deploy-archive.tar.gz

# We safely export the tar directly into /tmp/ so it avoids self-referential archiving loops on Mac!
tar -czf /tmp/deploy-archive.tar.gz --exclude="node_modules" --exclude=".git" --exclude=".next" .

echo "5. Transporting Payload to AWS Data Center..."
scp -o StrictHostKeyChecking=no -i trade-sim-key.pem /tmp/deploy-archive.tar.gz ubuntu@$PUBLIC_IP:~

echo "6. Triggering Remote Docker Architecture..."
ssh -o StrictHostKeyChecking=no -i trade-sim-key.pem ubuntu@$PUBLIC_IP << 'EOF'
    set -e
    echo "   -> Installing native Docker Engine..."
    curl -fsSL https://get.docker.com | sudo sh > /dev/null 2>&1
    sudo systemctl enable docker || true
    sudo systemctl start docker || true
    sudo usermod -aG docker ubuntu || true

    echo "   -> Extracting Codebase..."
    mkdir -p /home/ubuntu/app
    cd /home/ubuntu/app
    
    # Clean previous app files to allow seamless redeployments
    rm -rf /home/ubuntu/app/*
    tar -xzf /home/ubuntu/deploy-archive.tar.gz

    echo "   -> Executing Docker Build Matrix..."
    sudo docker compose config
    sudo docker compose down || true
    sudo docker compose up -d --build
EOF

echo "=========================================================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "🌐 Your app is fully public worldwide at: http://$PUBLIC_IP"
echo "=========================================================="
