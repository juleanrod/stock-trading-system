#!/bin/bash
set -e

echo "============== 🌱 TradeSim Database Seeder =============="

if [ ! -f "aws_state.txt" ]; then
    echo "❌ Error: Could not find aws_state.txt. Make sure you ran deploy.sh."
    exit 1
fi

source aws_state.txt

echo "1. Locating AWS Server via EC2 APIs..."
PUBLIC_IP=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Reservations[0].Instances[0].PublicIpAddress' --output text 2>/dev/null || true)

if [ -z "$PUBLIC_IP" ] || [ "$PUBLIC_IP" == "None" ]; then
    echo "❌ Server not found. Try running deploy.sh first!"
    exit 1
fi

echo "✅ Server found at: $PUBLIC_IP"
echo "2. Injecting Admin Credentials securely payload over SSH..."

ssh -o StrictHostKeyChecking=no -i trade-sim-key.pem ubuntu@$PUBLIC_IP << 'EOF'
    set -e
    cd /home/ubuntu/app
    echo "   -> Penetrating Backend Production Container..."
    
    # Execute the internal script specifically inside the Docker isolated network!
    sudo docker compose exec -T backend node create_admin.js || {
        echo "❌ Seed Execution Failed! Fetching Backend Logs..."
        sudo docker compose logs --tail 30 backend
        exit 1
    }

    echo "   -> Seeding Successful!"
EOF

echo "=========================================================="
echo "🎉 DEPLOYMENT SEEDED! The Admin account (admin:admin123) is now active."
echo "=========================================================="
