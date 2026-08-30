// @vitest-environment happy-dom
import { describe, expect, test } from 'vitest';
import { mount } from '@vue/test-utils';
import SignUpForm from './SignUpForm.vue';

describe('SignUpForm dark styling', () => {
  test('inputs do not use the light warm-white background', () => {
    const wrapper = mount(SignUpForm);
    for (const input of wrapper.findAll('input:not([tabindex="-1"])')) {
      expect(input.classes()).not.toContain('bg-warm-white');
    }
  });

  test('labels are light-on-dark, not near-black', () => {
    const wrapper = mount(SignUpForm);
    for (const label of wrapper.findAll('label')) {
      expect(label.classes()).not.toContain('text-near-black');
    }
  });

  test('submit button retains its accessible label', () => {
    const wrapper = mount(SignUpForm);
    expect(wrapper.get('button[type="submit"]').text()).toBe('Sign Up');
  });
});
