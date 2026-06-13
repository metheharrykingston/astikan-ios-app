#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$PWD}"

CONFIRM_FILE="$(find "$ROOT" "$HOME" /srv/astikan -path '*/src/pages/LabTest/confirm.tsx' 2>/dev/null | head -n 1 || true)"
INDEX_FILE="$(find "$ROOT" "$HOME" /srv/astikan -path '*/src/pages/LabTest/index.tsx' 2>/dev/null | head -n 1 || true)"

if [ -z "$CONFIRM_FILE" ] || [ -z "$INDEX_FILE" ]; then
  echo "❌ LabTest source files not found."
  echo "Run this on the machine/folder where employee-app source exists, probably:"
  echo "cd ~/astikan"
  echo "or cd ~/astikan/apps/employee-app"
  exit 1
fi

echo "Fixing confirm: $CONFIRM_FILE"
echo "Fixing index:   $INDEX_FILE"

python3 - <<PY
from pathlib import Path
import re

confirm = Path("$CONFIRM_FILE")
index = Path("$INDEX_FILE")

s = confirm.read_text()

# Add price field in confirm selectedTest type.
s = s.replace(
'''type LabTestItem = {
  id?: string
  code?: string
  name: string
}''',
'''type LabTestItem = {
  id?: string
  code?: string
  name: string
  price?: number | null
}'''
)

# Rename hardcoded constant to fallback only.
s = s.replace(
"const LAB_BOOKING_AMOUNT_INR = 999",
"const DEFAULT_LAB_BOOKING_AMOUNT_INR = 999"
)

# Add dynamic amount after selectedTest name.
needle = '  const selectedTest = state?.selectedTest?.name ?? "Complete Blood Count (CBC)"\\n'
if needle in s and "const labBookingAmountInr" not in s:
    s = s.replace(
        needle,
        needle + '''  const selectedTestPrice = Number(state?.selectedTest?.price ?? DEFAULT_LAB_BOOKING_AMOUNT_INR)
  const labBookingAmountInr = Number.isFinite(selectedTestPrice)
    ? Math.max(1, Math.round(selectedTestPrice))
    : DEFAULT_LAB_BOOKING_AMOUNT_INR
'''
    )

# Replace usage.
s = s.replace("LAB_BOOKING_AMOUNT_INR", "labBookingAmountInr")

# But restore fallback constant name if replacement touched it.
s = s.replace("const DEFAULT_labBookingAmountInr = 999", "const DEFAULT_LAB_BOOKING_AMOUNT_INR = 999")
s = s.replace("DEFAULT_labBookingAmountInr", "DEFAULT_LAB_BOOKING_AMOUNT_INR")

# Fix useEffect dependency for quote.
s = re.sub(
    r'''useEffect\\(\\(\\) => \\{([\\s\\S]*?fetchPaymentQuote\\("lab", labBookingAmountInr\\)[\\s\\S]*?)\\n  \\}, \\[\\]\\)''',
    lambda m: "useEffect(() => {" + m.group(1) + "\\n  }, [labBookingAmountInr])",
    s,
    count=1
)

confirm.write_text(s)

i = index.read_text()

# Add price to LabTestItem type in index.
if "price?: number | null" not in i:
    i = i.replace(
'''  quick?: string
}''',
'''  quick?: string
  price?: number | null
}''',
        1
    )

# Ensure API mapped catalog price goes into selectedTest.
if "price: item.price" not in i and "price: Number(item.price" not in i:
    i = i.replace(
'''    quick: item.reportingTime.toLowerCase().includes("same day") ? "Same day" : undefined,
  }''',
'''    quick: item.reportingTime.toLowerCase().includes("same day") ? "Same day" : undefined,
    price: Number.isFinite(Number(item.price)) ? Number(item.price) : null,
  }''',
        1
    )

index.write_text(i)

print("✅ Lab ₹999 hardcode fixed. Booking amount will now use selected test price.")
PY
