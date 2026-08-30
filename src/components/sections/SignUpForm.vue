<script setup lang="ts">
import { nextTick, reactive, ref } from 'vue';

const form = reactive({
  name: '',
  email: '',
  grade: '',
  _honeypot: '',
});

type SubmitState = 'idle' | 'submitting' | 'success';

const state = ref<SubmitState>('idle');
const errorMessage = ref<string | null>(null);
const errorBanner = ref<HTMLElement | null>(null);

// Moves focus to the error banner whenever it appears so keyboard/screen-reader users land on
// it directly instead of having to discover it by re-reading the page.
async function showError(message: string) {
  errorMessage.value = message;
  await nextTick();
  errorBanner.value?.focus();
}

async function handleSubmit() {
  errorMessage.value = null;
  state.value = 'submitting';

  try {
    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (response.status === 429) {
      await showError("You're submitting too quickly — please wait a minute and try again.");
      state.value = 'idle';
      return;
    }

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      await showError(data?.error ?? 'Something went wrong. Please try again.');
      state.value = 'idle';
      return;
    }

    state.value = 'success';
  } catch {
    await showError('Network error — please check your connection and try again.');
    state.value = 'idle';
  }
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-md flex-col gap-6">
    <div
      v-if="state === 'success'"
      class="flex flex-col gap-2 rounded-lg bg-deep-green/40 border border-accent-green/25 p-6 text-center"
      aria-live="polite"
    >
      <h2 class="font-heading text-2xl font-bold text-warm-white">
        You're signed up!
      </h2>
      <p class="font-body text-warm-white/75">
        Thanks for joining — keep an eye on your inbox for next steps.
      </p>
    </div>

    <form
      v-else
      class="flex flex-col gap-4"
      @submit.prevent="handleSubmit"
    >
      <div
        v-if="errorMessage"
        ref="errorBanner"
        class="rounded-md bg-red-950/60 border border-red-500/40 px-4 py-3 font-body text-sm text-red-200 focus:outline-none"
        role="alert"
        tabindex="-1"
      >
        {{ errorMessage }}
      </div>

      <div class="flex flex-col gap-1">
        <label
          for="signup-name"
          class="font-body text-sm font-medium text-warm-white"
        >Name</label>
        <input
          id="signup-name"
          v-model="form.name"
          type="text"
          name="name"
          required
          autocomplete="name"
          class="rounded-md border border-accent-green/30 bg-near-black px-3 py-2 font-body text-warm-white placeholder:text-warm-white/40 focus:border-accent-green focus:outline-none"
        >
      </div>

      <div class="flex flex-col gap-1">
        <label
          for="signup-email"
          class="font-body text-sm font-medium text-warm-white"
        >Email</label>
        <input
          id="signup-email"
          v-model="form.email"
          type="email"
          name="email"
          required
          autocomplete="email"
          class="rounded-md border border-accent-green/30 bg-near-black px-3 py-2 font-body text-warm-white placeholder:text-warm-white/40 focus:border-accent-green focus:outline-none"
        >
      </div>

      <div class="flex flex-col gap-1">
        <label
          for="signup-grade"
          class="font-body text-sm font-medium text-warm-white"
        >Grade level</label>
        <input
          id="signup-grade"
          v-model="form.grade"
          type="text"
          name="grade"
          placeholder="e.g. 10th grade"
          required
          class="rounded-md border border-accent-green/30 bg-near-black px-3 py-2 font-body text-warm-white placeholder:text-warm-white/40 focus:border-accent-green focus:outline-none"
        >
      </div>

      <!--
        Honeypot: kept off-screen via absolute positioning far outside the viewport rather than
        display:none/visibility:hidden, since some bots specifically skip fields hidden with those
        two properties. tabindex="-1" and aria-hidden keep it out of keyboard/screen-reader flow for
        real users.
      -->
      <div
        class="absolute -left-[9999px] top-auto h-0 w-0 overflow-hidden"
        aria-hidden="true"
      >
        <label for="signup-_honeypot">Leave this field blank</label>
        <input
          id="signup-_honeypot"
          v-model="form._honeypot"
          type="text"
          name="_honeypot"
          tabindex="-1"
          autocomplete="off"
        >
      </div>

      <button
        type="submit"
        :disabled="state === 'submitting'"
        class="mt-2 rounded-md bg-deep-green px-4 py-2 font-heading font-semibold text-warm-white transition hover:bg-accent-green disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ state === 'submitting' ? 'Signing up…' : 'Sign Up' }}
      </button>
    </form>
  </div>
</template>
