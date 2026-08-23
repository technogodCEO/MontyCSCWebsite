<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';

const props = defineProps<{
  lines: string[];
  open: boolean;
  /** Accessible name for the dialog, e.g. "Workshops details". */
  label?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const panelRef = ref<HTMLElement | null>(null);
const closeButtonRef = ref<HTMLButtonElement | null>(null);
let previouslyFocused: HTMLElement | null = null;

function close() {
  emit('close');
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    close();
  }
}

function onDocumentClick(event: MouseEvent) {
  if (panelRef.value && !panelRef.value.contains(event.target as Node)) {
    close();
  }
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      previouslyFocused = document.activeElement as HTMLElement | null;
      document.addEventListener('keydown', onKeydown);
      // mousedown (not click) so the same click that opened the panel — already
      // fully dispatched by the time this listener is registered — can't
      // immediately re-trigger it.
      document.addEventListener('mousedown', onDocumentClick);
      await nextTick();
      closeButtonRef.value?.focus();
    } else {
      document.removeEventListener('keydown', onKeydown);
      document.removeEventListener('mousedown', onDocumentClick);
      previouslyFocused?.focus();
      previouslyFocused = null;
    }
  },
);

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown);
  document.removeEventListener('mousedown', onDocumentClick);
});
</script>

<template>
  <div
    v-if="open"
    ref="panelRef"
    data-testid="terminal-panel"
    role="dialog"
    aria-modal="true"
    :aria-label="label || 'Terminal panel'"
    class="bg-near-black border-accent-green/40 font-mono text-warm-white fixed inset-0 z-50 flex flex-col overflow-hidden rounded-none border shadow-xl md:absolute md:inset-auto md:h-auto md:max-h-80 md:w-80 md:rounded-lg"
  >
    <div class="flex items-center gap-2 border-b border-white/10 px-4 py-2">
      <span class="h-3 w-3 rounded-full bg-red-500" />
      <span class="h-3 w-3 rounded-full bg-yellow-400" />
      <span class="h-3 w-3 rounded-full bg-green-500" />
      <button
        ref="closeButtonRef"
        type="button"
        aria-label="Close terminal panel"
        class="text-warm-white/60 hover:text-gold focus-visible:ring-gold ml-auto text-sm outline-none focus-visible:ring-2"
        @click="close"
      >
        ✕
      </button>
    </div>
    <div class="flex-1 overflow-y-auto px-4 py-3 text-sm leading-relaxed">
      <p
        v-for="(line, index) in lines"
        :key="index"
        class="whitespace-pre-wrap"
      >
        <span
          v-if="line.startsWith('$')"
          class="text-accent-green"
        >{{ line }}</span>
        <span
          v-else
          class="text-gold"
        >{{ line }}</span>
      </p>
    </div>
  </div>
</template>
