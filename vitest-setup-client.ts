import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach } from 'vitest';

Object.defineProperty(navigator, 'languages', { value: ['fr-FR'] });

// bits-ui keeps the body locked for 24ms after a dialog unmounts, to absorb a
// close immediately followed by a reopen. That timer outlives the unmount
// Testing Library performs between tests, and does damage at both ends: the
// next test's first click is refused for pointer-events: none, and a timer
// still in flight when the file ends fires into a torn-down jsdom, where its
// callback finds no document and fails the run on an unhandled exception.
afterEach(() => {
	document.body.style.pointerEvents = '';
	document.body.style.overflow = '';
});

afterAll(async () => {
	await new Promise((resolve) => setTimeout(resolve, 50));
});
