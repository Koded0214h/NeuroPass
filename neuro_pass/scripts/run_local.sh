#!/usr/bin/env bash
# run_local.sh — spin up a local Solana validator, deploy NeuroPass, and print setup instructions

set -euo pipefail

PROGRAM_ID="F11FFZasp1pEGDaHoguWokQbenh7TLc5SWTz7pbDpVQD"
LEDGER_DIR="/tmp/neuro_pass_ledger"
VALIDATOR_LOG="/tmp/neuro_pass_validator.log"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ─── colours ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }

# ─── 1. Kill any existing validator ───────────────────────────────────────────
info "Stopping any running solana-test-validator..."
pkill -f solana-test-validator 2>/dev/null || true
sleep 1

# ─── 2. Start fresh validator ─────────────────────────────────────────────────
info "Starting solana-test-validator (ledger: $LEDGER_DIR)..."
rm -rf "$LEDGER_DIR"
solana-test-validator \
  --ledger "$LEDGER_DIR" \
  --reset \
  --quiet \
  > "$VALIDATOR_LOG" 2>&1 &

VALIDATOR_PID=$!
info "Validator PID: $VALIDATOR_PID"

# ─── 3. Wait until the validator is ready ────────────────────────────────────
info "Waiting for validator to be ready..."
until solana cluster-version --url http://127.0.0.1:8899 &>/dev/null; do
  sleep 1
done
success "Validator is up."

# ─── 4. Ensure local wallet exists and is funded ──────────────────────────────
if [ ! -f ~/.config/solana/id.json ]; then
  warn "No local wallet found. Generating one..."
  solana-keygen new --no-bip39-passphrase --outfile ~/.config/solana/id.json
fi

WALLET_ADDR=$(solana address --url http://127.0.0.1:8899)
info "Wallet: $WALLET_ADDR"

BALANCE=$(solana balance --url http://127.0.0.1:8899 | awk '{print $1}')
if (( $(echo "$BALANCE < 5" | bc -l) )); then
  info "Airdropping SOL to local wallet..."
  solana airdrop 100 --url http://127.0.0.1:8899
fi
success "Wallet balance: $(solana balance --url http://127.0.0.1:8899)"

# ─── 5. Build the program ─────────────────────────────────────────────────────
info "Building Anchor program..."
cd "$PROJECT_DIR"
anchor build

# ─── 6. Deploy ────────────────────────────────────────────────────────────────
info "Deploying to localnet..."
anchor deploy --provider.cluster localnet

success "Program deployed: $PROGRAM_ID"

# ─── 7. Run the test suite ────────────────────────────────────────────────────
echo ""
info "Running tests against localnet..."
anchor test --skip-local-validator --provider.cluster localnet

# ─── 8. Print backend .env patch ──────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Localnet is live. Patch your backend/.env like this:${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "  SOLANA_RPC=http://127.0.0.1:8899"
echo "  WALLET_SECRET_KEY=$(cat ~/.config/solana/id.json | tr -d ' \n')"
echo ""
echo -e "${CYAN}  Program ID : $PROGRAM_ID${NC}"
echo -e "${CYAN}  Validator  : http://127.0.0.1:8899${NC}"
echo -e "${CYAN}  Log file   : $VALIDATOR_LOG${NC}"
echo ""
echo "  To stop the validator:"
echo "    kill $VALIDATOR_PID"
echo ""
