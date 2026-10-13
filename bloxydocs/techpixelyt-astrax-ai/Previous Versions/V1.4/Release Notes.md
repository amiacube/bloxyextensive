# Release Notes (v1.4): Polish and Reliability Pass

## Overview
**Date:** July 28, 2026

Version 1.4 is a refinement release focused on polish. After the major rebuild in v1.3, this update tightens up the experience where it matters most: Deep Research is more dependable, the interface feels cleaner, and Astrax is more stable across the board. It is not a sweeping feature release, but a meaningful step toward making the platform feel faster, calmer, and more reliable.

---

### Deep Research & Knowledge Quality
* **More reliable long research runs:** Fewer mid-session failures and timeouts during extended investigations.
* **Improved API limit handling:** Research is less likely to cut off partway through when provider limits are reached.
* **Cleaner final reports:** More consistent formatting and a more polished report layout.
* **Better progress feedback:** It is easier to see what stage the investigation is currently in.
* **Stronger Bloxd knowledge integration:** Research context is more relevant and better grounded in available Bloxd knowledge.

### Voice Dictation & Input
* **More reliable dictation:** Fixed cases where transcription could fail or return unrelated text.
* **Improved audio capture reliability:** Spoken input is converted to text more consistently.
* **Clearer recovery paths:** When transcription fails, users are given a more obvious retry option.

### Stability & Provider Resilience
* **Automatic retry-with-backoff:** Many transient errors are handled behind the scenes before a failover is needed.
* **Smoother provider failover:** Backup switching between GitHub Models, Mistral, and Cerebras is more seamless.
* **Improved backup-status feedback:** Provider status is clearer during failover events.
* **General stability fixes:** Ongoing bug fixes improve reliability in the face of live API provider issues.

### Memory Core
* **More dependable memory saving and recall:** Fewer issues where memory fails to save or retrieve correctly.
* **More transparent memory display:** It is clearer what Astrax is actually remembering.

### Interface & Experience
* **Refined animations and transitions:** The overall experience feels smoother and more polished.
* **Layout consistency improvements:** Spacing and alignment across pages were cleaned up.
* **Better responsiveness on smaller screens:** The interface adapts more cleanly to compact viewports.
* **Accessibility and readability tweaks:** Minor improvements make content easier to read and navigate.

---

### Note on Future Direction
PixelGen is still planned for removal in a future update, with Astrax's own built-in image generator targeted for v1.5.

---

### Beta Notice & Feedback

> [!WARNING]
> Deep Research and several systems introduced in v1.3 remain in active development (Beta). Performance, reliability, and feature availability may continue to evolve.

If you encounter any bugs, formatting issues, or unexpected behavior, please report them on Reddit:
**[Contact Own_Body_9771 on Reddit](https://www.reddit.com/user/Own_Body_9771/)**
