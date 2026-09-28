<template>
  <div
    class="column no-wrap TopPickContainer bg-white shadow-3 q-ma-sm q-pa-sm"
    style="height: 97dvh; border-radius: 16px; overflow: hidden"
  >
    <div
      class="col hide-native-scrollbar"
      style="overflow-y: auto; overflow-x: hidden; min-height: 0"
    >
      <div class="q-pb-xl full-width flex flex-center text-center" style="min-height: 100%">
        <div class="q-pa-md" style="max-width: 400px; width: 100%">
          <div class="text-primary text-weight-bolder" style="font-size: 22vh; line-height: 1">
            404
          </div>

          <div class="text-h4 text-primary q-mb-xl" style="opacity: 0.6">
            {{ $t('label.404') }}
          </div>

          <q-btn
            rounded
            unelevated
            color="primary"
            text-color="white"
            to="/"
            :label="$t('label.GO_HOME')"
            class="full-width q-py-sm text-weight-bold"
            no-caps
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup></script>
