# Dual-engine playbook — ended

The dual-engine rollout ended with the full cutover to the custom builder engine.
Puck (`@measured/puck`) has been removed; the custom engine is now the sole
editor and renderer. The 30-day no-rollback soak was explicitly waived by
product decision for this dev/test environment.