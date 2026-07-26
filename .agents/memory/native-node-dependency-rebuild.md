---
name: Native Node dependency rebuilds
description: Runtime behavior when native Node packages are installed without lifecycle scripts in this workspace.
---

Native Node dependencies can retain incompatible prebuilt binaries when dependencies are installed with lifecycle scripts disabled; `argon2` may then segfault on require instead of throwing a normal error.

**Why:** The imported backend initially built successfully but crashed before bootstrap because its `argon2` binary was incompatible with the workspace Node runtime.

**How to apply:** If a native package crashes during startup, isolate the import first, then rebuild that package from the package's own directory with its normal install lifecycle before changing application code or dependency versions.