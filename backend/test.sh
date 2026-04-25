#!/bin/bash

# Configuration
API_URL="http://localhost:8000/api"
DUMMY_FILE="proof_sample.txt"
echo "This is a sample proof of skill for NeuroPass verification." > $DUMMY_FILE

# Utility to print headers
print_header() {
    echo -e "\n\033[1;34m>>> $1\033[0m"
}

# Check for jq
if ! command -v jq &> /dev/null; then
    echo "Error: 'jq' is not installed. Please install it to run this test script."
    exit 1
fi

# Generate unique names
TS=$(date +%s)
USER_NAME="talent_$TS"
VERIFIER_NAME="boss_$TS"

print_header "1. Registering Submitter (Talent: $USER_NAME)"
curl -s -X POST "$API_URL/users/register/" \
     -H "Content-Type: application/json" \
     -d "{\"username\": \"$USER_NAME\", \"password\": \"Password123\", \"email\": \"$USER_NAME@example.com\"}" | jq .

print_header "2. Logging in Submitter"
TALENT_TOKEN=$(curl -s -X POST "$API_URL/users/login/" \
     -H "Content-Type: application/json" \
     -d "{\"username\": \"$USER_NAME\", \"password\": \"Password123\"}" | jq -r '.access')
echo "Token obtained: ${TALENT_TOKEN:0:15}..."

print_header "2.5 Linking Wallet"
curl -s -X PATCH "$API_URL/users/wallet/" \
     -H "Authorization: Bearer $TALENT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"wallet_address": "Hi6bqCvHxc6kcAGZLPiTbSGHDC1dLjmnUvaz1PuAVR89"}' | jq .

print_header "3. Submitting Skill (Triggers Gemini AI Analysis)"
SUBMIT_RESP=$(curl -s -X POST "$API_URL/core/skill/submit/" \
     -H "Authorization: Bearer $TALENT_TOKEN" \
     -F "name=Plumbing and Pipe Fitting" \
     -F "description=I have 5 years experience fixing industrial pipes and home leakages in Lagos." \
     -F "file=@$DUMMY_FILE")
echo "$SUBMIT_RESP" | jq .

SKILL_ID=$(echo "$SUBMIT_RESP" | jq -r '.id')
echo "Extracted Skill ID: $SKILL_ID"

print_header "4. Registering & Promoting Verifier ($VERIFIER_NAME)"
curl -s -X POST "$API_URL/users/register/" \
     -H "Content-Type: application/json" \
     -d "{\"username\": \"$VERIFIER_NAME\", \"password\": \"Password123\", \"email\": \"$VERIFIER_NAME@example.com\"}" | jq .

echo "Promoting $VERIFIER_NAME to Verifier role via Django Management..."
# Try to use the local venv
if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
fi

cd backend && python3 manage.py shell -c "from django.contrib.auth.models import User; u=User.objects.get(username='$VERIFIER_NAME'); u.profile.is_verifier=True; u.profile.save()" && cd ..

BOSS_TOKEN=$(curl -s -X POST "$API_URL/users/login/" \
     -H "Content-Type: application/json" \
     -d "{\"username\": \"$VERIFIER_NAME\", \"password\": \"Password123\"}" | jq -r '.access')

print_header "5. Verifying Skill (Approving - Triggers Solana Minting)"
echo "Note: This might fail if WALLET_SECRET_KEY/PINATA_JWT is not set in .env"
VERIFY_RESP=$(curl -s -X PATCH "$API_URL/core/skill/$SKILL_ID/verify/" \
     -H "Authorization: Bearer $BOSS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"decision": "approve", "comment": "Verified skill via site inspection."}')
echo "$VERIFY_RESP" | jq .

print_header "6. Fetching User Passport (Consolidated Identity)"
curl -s -X GET "$API_URL/core/passport/" \
     -H "Authorization: Bearer $TALENT_TOKEN" | jq .

print_header "7. Testing YarnGPT TTS (Nigerian Accent)"
curl -s -X GET "$API_URL/core/skill/$SKILL_ID/audio/" \
     -H "Authorization: Bearer $TALENT_TOKEN" --output skill_description.mp3
if [ -f "skill_description.mp3" ]; then
    echo "Success: Audio saved to skill_description.mp3"
else
    echo "Failure: Audio file not generated (Check YarnGPT API Key)"
fi

print_header "8. Public Verification Check"
# Fetch skills again to get the mint address from the credential object
MINT_ADDR=$(curl -s -X GET "$API_URL/core/skills/" \
     -H "Authorization: Bearer $TALENT_TOKEN" | jq -r '.results[0].credential.mint_address')

if [ "$MINT_ADDR" != "null" ] && [ "$MINT_ADDR" != "" ]; then
    echo "Mint Address Found: $MINT_ADDR"
    curl -s -X GET "$API_URL/core/credential/$MINT_ADDR/" | jq .
else
    echo "No Credential found. Check backend logs for Solana/Pinata/Gemini errors."
fi

# Cleanup
rm $DUMMY_FILE
print_header "Test Completed"
