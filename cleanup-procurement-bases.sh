#!/bin/bash

# Cleanup script for procurement admin knowledgebases
# This will delete all test knowledgebases and their associated data

echo "🧹 Cleaning up procurement admin knowledgebases..."
echo ""

# Array of base IDs to delete
BASES=(
  "e37b5a4c-c1fa-4050-85a1-f1fb089a11d4"  # Console checker 2025
  "527d4f10-46d8-45b3-9dfe-9224eb47dfed"  # This time surely
  "a5c490ec-8d17-4ded-b179-94bff001f8f4"  # Bring it home
  "19274855-b47b-4d7f-b0de-f2e1eca74773"  # Procure this bad boy
  "593faf9f-3f6c-4b12-9cf9-1e53934a8ed8"  # Procurement Test with Sonnet
  "3c93d765-1f24-4731-b0e8-0e4909f4c1ab"  # MBIE 2025
  "7d314f45-add2-4dc9-8150-bc02341ebb37"  # MBIE Procurement Guidelines
  "84a878e1-c988-45ef-a6d9-76bf40a469ff"  # One more time again
  "a3589aac-e117-4eab-8ec6-ba38eb411948"  # Best work this time
  "b1b340e8-ebd8-46eb-a545-7746f9c5695f"  # Yes please this time
)

API_URL="https://main.d2l8hlr3sei3te.amplifyapp.com"

for BASE_ID in "${BASES[@]}"; do
  echo "🗑️  Deleting base: $BASE_ID"

  RESPONSE=$(curl -s -X DELETE "$API_URL/api/procurement-base/$BASE_ID")

  if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✅ Deleted successfully"
  else
    echo "❌ Failed: $RESPONSE"
  fi

  echo ""
done

echo "✅ Cleanup complete!"
echo ""
echo "Verify by checking:"
echo "curl -s '$API_URL/api/procurement-base' | jq '.bases | length'"
