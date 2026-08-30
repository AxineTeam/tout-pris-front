import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import TextLink from './TextLink.svelte';

const children = createRawSnippet(() => ({ render: () => '<span>Se connecter</span>' }));

describe('TextLink', () => {
	it('mène à sa destination', () => {
		render(TextLink, { props: { href: '/account/login', children } });

		expect(screen.getByRole('link', { name: 'Se connecter' })).toHaveAttribute(
			'href',
			'/account/login'
		);
	});
});
