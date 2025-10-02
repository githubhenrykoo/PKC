#!/bin/bash

# Script to delete all cards from MCard database
MCARD_URL="https://devmcard.pkc.pub/v1"

echo "🗑️  Starting to delete all cards from MCard database..."

# Get total count
TOTAL_COUNT=$(curl -s "$MCARD_URL/cards/count" | jq -r '.count')
echo "📊 Total cards to delete: $TOTAL_COUNT"

if [ "$TOTAL_COUNT" -eq 0 ]; then
    echo "✅ No cards to delete. Database is already empty."
    exit 0
fi

# Calculate total pages needed (100 cards per page)
PAGE_SIZE=100
TOTAL_PAGES=$(( (TOTAL_COUNT + PAGE_SIZE - 1) / PAGE_SIZE ))

echo "📄 Processing $TOTAL_PAGES pages..."

DELETED_COUNT=0
FAILED_COUNT=0

# Loop through all pages
for page in $(seq 1 $TOTAL_PAGES); do
    echo "🔄 Processing page $page of $TOTAL_PAGES..."
    
    # Get hashes for this page
    HASHES=$(curl -s "$MCARD_URL/cards?page=$page&page_size=$PAGE_SIZE" | jq -r '.items[].hash')
    
    # Delete each card
    for hash in $HASHES; do
        if [ -n "$hash" ]; then
            echo "🗑️  Deleting card: $hash"
            RESPONSE=$(curl -s -w "%{http_code}" -X DELETE "$MCARD_URL/card/$hash")
            HTTP_CODE="${RESPONSE: -3}"
            
            if [ "$HTTP_CODE" = "200" ]; then
                ((DELETED_COUNT++))
                echo "✅ Deleted: $hash"
            else
                ((FAILED_COUNT++))
                echo "❌ Failed to delete: $hash (HTTP: $HTTP_CODE)"
            fi
        fi
    done
done

echo ""
echo "🎉 Deletion complete!"
echo "✅ Successfully deleted: $DELETED_COUNT cards"
echo "❌ Failed to delete: $FAILED_COUNT cards"

# Verify final count
FINAL_COUNT=$(curl -s "$MCARD_URL/cards/count" | jq -r '.count')
echo "📊 Remaining cards: $FINAL_COUNT"

if [ "$FINAL_COUNT" -eq 0 ]; then
    echo "🎯 SUCCESS: All cards have been deleted from the MCard database!"
else
    echo "⚠️  WARNING: $FINAL_COUNT cards remain in the database."
fi

# Command: chmod +x delete-all-cards.sh && ./delete-all-cards.sh