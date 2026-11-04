# Apple Health → OnePlate with an iPhone Shortcut

A web app cannot read HealthKit. An iPhone Shortcut can, and Shortcuts can post to a URL, so the sync is a Shortcut that runs every night. No developer account, no App Store, nothing to pay.

## Get the address
Progress → Account → Apple Health → **Address for Tafseer** (or Uzma). Copy it. It looks like `https://<host>/ingest/<32 random characters>`. It is a secret: anyone with it can write that person's numbers. Revoke it from the same card if it leaks.

## Build the Shortcut (about five minutes)
1. Shortcuts → **+** → name it **OnePlate Health**.
2. **Find Health Samples**: Type *Weight*, Sort by Start Date, Latest First, Limit 1 → **Get Details of Health Sample** → *Value*. Rename the result **Weight**.
3. **Find Health Samples**: Type *Steps*, filter Start Date *is today* → **Calculate Statistics** → *Sum*. Rename **Steps**.
4. **Find Health Samples**: Type *Sleep Analysis*, filters Value *is Asleep* and End Date *is today* → **Get Details of Health Sample** → *Duration* → **Calculate Statistics** → *Sum*. Rename **SleepMin**.
5. **Find Workouts**: Type *Cycling*, Start Date *is today* → **Get Details of Workout** → *Duration* → **Calculate Statistics** → *Sum*. Rename **CycleMin**.
6. **Find Health Samples**: Type *Active Energy*, Start Date *is today* → **Calculate Statistics** → *Sum*. Rename **ActiveKcal**.
7. **Get Contents of URL**: the address; Method **POST**; Request Body **JSON**; fields `weight`, `steps`, `sleepMin`, `cycleMin`, `activeKcal`, each set to the matching variable. Values like "72.4 kg", "185 lb" or "9,120" are all read correctly; an optional `date` field (YYYY-MM-DD) files the numbers on another day.
8. Run it once; the response lists what was stored. Then Automation → **+** → **Time of Day**, 10:30 pm, Daily, **Run Immediately**, and switch off **Ask Before Running**. On some iOS versions a Health action asks once more on the first run; choose Always Allow.

## What OnePlate does with it
- `weight` → a weigh-in for that date marked `src: health`. A weigh-in typed by hand for the same date is never overwritten.
- `steps` → shown on Today; the 8,000-steps switch turns on at 8,000 or more.
- `sleepMin` → the sleep field, unless you typed sleep by hand that day.
- `cycleMin` → the training switch turns on at 20 minutes or more.
- `activeKcal` → shown on Today.
Switches are only ever turned on by Health, never off.

## Reverse direction (optional)
A second Shortcut, **OnePlate weight to Health**: **Get Contents of URL** on the address plus `/latest` → **Get Dictionary Value** `weight` → **Log Health Sample**, Type Weight, Value that number, kg. Run it after a weigh-in, or add it to the same nightly automation.

## Android
Health Connect offers no path for a web app or an automation tool without a helper app, so on Android weight, sleep and steps are typed in. The Family editor on an iPhone can run the Shortcut for an Android user's numbers if that person's Health data is on an Apple Watch or iPhone.
