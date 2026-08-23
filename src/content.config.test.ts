import { expect, test } from 'vitest';
import { officerSchema, workshopSchema, eventSchema, showcaseSchema } from './content.config';

test('officerSchema accepts a valid officer object', () => {
  const result = officerSchema.safeParse({
    name: 'President Name',
    role: 'President',
  });
  expect(result.success).toBe(true);
});

test('officerSchema rejects an object missing the required name field', () => {
  const result = officerSchema.safeParse({
    role: 'President',
  });
  expect(result.success).toBe(false);
});

test('officerSchema throws via parse() when name is missing', () => {
  expect(() => officerSchema.parse({ role: 'President' })).toThrow();
});

test('workshopSchema accepts a valid workshop object', () => {
  const result = workshopSchema.safeParse({
    title: 'Intro to Python',
    day: 'Tuesday',
    time: '3:30 PM - 4:30 PM',
    level: 'beginner',
  });
  expect(result.success).toBe(true);
});

test('workshopSchema rejects an invalid level enum value', () => {
  const result = workshopSchema.safeParse({
    title: 'Intro to Python',
    day: 'Tuesday',
    time: '3:30 PM - 4:30 PM',
    level: 'expert',
  });
  expect(result.success).toBe(false);
});

test('eventSchema accepts a valid event object', () => {
  const result = eventSchema.safeParse({
    title: 'MontyHacks',
    date: '2026-11-14',
    type: 'hackathon',
  });
  expect(result.success).toBe(true);
});

test('eventSchema rejects an invalid type enum value', () => {
  const result = eventSchema.safeParse({
    title: 'Guest Talk',
    date: '2026-09-25',
    type: 'talks',
  });
  expect(result.success).toBe(false);
});

test('showcaseSchema accepts a valid showcase object', () => {
  const result = showcaseSchema.safeParse({
    title: 'CampusEats',
    event: 'MontyHacks',
  });
  expect(result.success).toBe(true);
});

test('showcaseSchema rejects an object missing the required event field', () => {
  const result = showcaseSchema.safeParse({
    title: 'CampusEats',
  });
  expect(result.success).toBe(false);
});
