// Auto-register built-in calculators.
// This file must be imported AFTER registry.ts has fully initialized.
// Keeping these imports separate from registry.ts avoids the ESM TDZ
// circular dependency (registry declares state → calculators import
// register from registry → call register before state is initialized).

import "../calculators/changeRequestRatio.js";
import "../calculators/commentDensity.js";
import "../calculators/cycleTime.js";
import "../calculators/idleTimeHours.js";
import "../calculators/reviewerCount.js";
import "../calculators/revertRate.js";
import "../calculators/ciPassRate.js";
import "../calculators/ciMetrics.js";
import "../calculators/reviewMetrics.js";
import "../calculators/sizeBucket.js";
import "../calculators/outsizedFlag.js";
