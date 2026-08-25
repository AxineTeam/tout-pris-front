import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DeployedVersion from './DeployedVersion.svelte';
import { backendBuild, build } from '$lib/build.js';

vi.mock('$lib/build.js', () => ({
	build: { version: 'main', commit: '1a2b3c4' },
	backendBuild: vi.fn()
}));

const answering = (health: Record<string, unknown>) =>
	vi.mocked(backendBuild).mockResolvedValue(health as never);

async function deployedVersion() {
	render(DeployedVersion);
	return (await screen.findByTestId('deployed-version')).textContent?.replace(/\s+/g, ' ').trim();
}

describe('DeployedVersion', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('nomme les deux déploiements', async () => {
		answering({ status: 'ok', version: 'v1.2.0', commit: null });

		expect(await deployedVersion()).toBe(`front ${build.version} · back v1.2.0`);
	});

	it('tait les commits quand le back tait le sien', async () => {
		answering({ status: 'ok', version: 'v1.2.0', commit: null });

		expect(await deployedVersion()).not.toContain(build.commit);
	});

	it('montre les deux commits quand le back donne le sien', async () => {
		answering({ status: 'ok', version: 'v1.2.0', commit: 'abc1234' });

		expect(await deployedVersion()).toBe(`front main (${build.commit}) · back v1.2.0 (abc1234)`);
	});

	it('ne nomme pas le back tant qu il n a pas répondu', async () => {
		vi.mocked(backendBuild).mockReturnValue(new Promise(() => {}));

		expect(await deployedVersion()).toBe(`front ${build.version}`);
	});

	it('reste lisible face à un back qui ignore ces champs', async () => {
		answering({ status: 'ok' });

		expect(await deployedVersion()).toBe(`front ${build.version}`);
	});

	it('reste lisible quand le back ne répond pas', async () => {
		vi.mocked(backendBuild).mockRejectedValue(new Error('injoignable'));

		expect(await deployedVersion()).toBe(`front ${build.version}`);
	});
});
