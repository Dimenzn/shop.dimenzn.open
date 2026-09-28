<template>
  <router-view style="min-width: 320px" />
</template>

<script setup>
  // Root Application Component
  // Reserved for global app initialization (e.g., Auth state, Meta tags)
</script>

<style lang="scss">
  /* ==========================================================================
   1. GLOBAL RESETS & BASE STYLES
   ========================================================================== */
  body {
    /* Falling back to system fonts for faster load times and native feel */
    font-family:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell,
      sans-serif;
    font-size: 16px;

    /* Prevent horizontal scroll on mobile transitions */
    overflow-x: hidden;
  }

  /* Globally hide q-scroll-area scrollbars for a cleaner UI */
  // .q-scrollarea__thumb,
  // .q-scrollarea__bar {
  //   opacity: 0 !important;
  // }

  /* ==========================================================================
   2. TYPOGRAPHY HELPERS
   ========================================================================== */
  .label-overline {
    font-size: 12px;
    line-height: 1.5rem;
    letter-spacing: 0.16667em;
    text-transform: uppercase;
  }

  .title-overline {
    font-size: 14px;
    line-height: 1.5rem;
    letter-spacing: 0.16667em;
    text-transform: uppercase;
  }

  /* ==========================================================================
   3. UTILITY CLASSES
   ========================================================================== */
  .TopPickContainer {
    border: 1px solid $primary;
  }

  .q-menu {
    min-width: fit-content;
  }

  .border-dev {
    border: 1px solid red;
  }

  .border-ultra {
    border-radius: 21px;
  }

  .border-1px-primary {
    border: 1px solid $primary;
  }

  .my-card {
    width: 350px;
    max-width: 90vw; /* Safe fallback for smaller screens */
  }

  .btn-fixed-width {
    width: 120px;
  }

  /* ==========================================================================
   4. QUASAR OVERRIDES & LAYOUT SHIFTS
   ========================================================================== */
  /* Target Quasar's notification containers globally */
  body.drawer-open-notify {
    .q-notifications__list--top,
    .q-notifications__list--bottom {
      /* Push the flex-center to the right to clear the sidebar */
      padding-left: 300px !important;
      transition: padding-left 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
    }
  }

  body:not(.drawer-open-notify) {
    .q-notifications__list--top,
    .q-notifications__list--bottom {
      /* Ensure it snaps back smoothly when the sidebar closes */
      padding-left: 0 !important;
      transition: padding-left 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
    }
  }

  /* ==========================================================================
   5. NOTIFICATION BOX THEMES (21px)
   ========================================================================== */
  .box-theme-notify {
    border-radius: 21px !important;
  }
</style>
