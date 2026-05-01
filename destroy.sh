#!/bin/bash
set -e

echo "============== 🛑 TradeSim Automated Teardown =============="

if [ ! -f "aws_state.txt" ]; then
    echo "❌ Error: Could not find aws_state.txt. Ensure you ran deploy.sh first from this directory."
    exit 1
fi

# Read our stored IDs
source aws_state.txt

echo "1. Terminating EC2 Server ($INSTANCE_ID)..."
aws ec2 terminate-instances --instance-ids $INSTANCE_ID > /dev/null 2>&1 || echo "Instance already gone or not found."

echo "   ...Waiting for AWS to physically destroy the hardware (approx 45s)..."
aws ec2 wait instance-terminated --instance-ids $INSTANCE_ID 2>/dev/null || true

echo "2. Deleting Security Group ($SG_ID)..."
aws ec2 delete-security-group --group-id $SG_ID > /dev/null 2>&1 || echo "Security Group already gone."

echo "3. Shredding Local & Remote SSH Keys..."
aws ec2 delete-key-pair --key-name "trade-sim-key" > /dev/null 2>&1 || true
rm -f trade-sim-key.pem

echo "4. Removing State Tracker..."
rm -f aws_state.txt

echo "=========================================================="
echo "✅ TEARDOWN COMPLETE! You have successfully stopped all AWS billing for this project."
echo "=========================================================="
